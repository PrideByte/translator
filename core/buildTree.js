function parseAttributes(str) {
    const attrs = {};
    const attrRegex = /(?:^|\s)([\w-]+)(?:=("|')([^"']*)\2)?/giu;
    let match;

    while ((match = attrRegex.exec(str)) !== null) {
        attrs[match[1]] = match[3] ?? true;
    }

    return attrs;
}

function tokenize(html) {
    // 1. Закрывающий тег, 2. Открывающий тег, 3. Параметры
    const tagRegex = /(?:<\/([a-z]+?-[a-z]+?)>)|(?:<([a-z]+?-[a-z]+?)(?:\s([^<>]*?))?>)/guid;
    const tokens = [];
    let lastEndIndex = 0;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
        let startIndex = match.indices[0][0];
        let endIndex = match.indices[0][1];

        if (startIndex > lastEndIndex) {
            const text = html.slice(lastEndIndex, startIndex).trim();
            (text !== '') && tokens.push({
                type: 'text',
                content: text,
                start: lastEndIndex,
                end: startIndex
            });
        }

        if (match[1]) { // Закрывающий тег
            tokens.push({
                type: 'closeTag',
                name: match[1],
                start: startIndex,
                end: endIndex
            });
        } else if (match[2]) { // Открывающий тег
            tokens.push({ 
                type: 'openTag', 
                name: match[2], 
                propsRaw: match[3] ? match[3].trim() : '',
                start: startIndex,
                end: endIndex
            });
        }

        lastEndIndex = endIndex;
    }

    if (html.length > lastEndIndex) {
        const text = html.slice(lastEndIndex).trim();
        (text !== '') && tokens.push({
            type: 'text',
            content: text
        });
    }

    return tokens;
}

function buildTree({template, strictMode = true}) {
    const tokens = tokenize(template);
    const root = { children: [] };
    const stack = [root];

    for (const token of tokens) {
        if (token.type === 'openTag') {
            const node = {
                name: token.name,
                attrs: parseAttributes(token.propsRaw),
                children: [],
                start: token.start,
                end: token.end
            };

            stack[stack.length - 1].children.push(node);
            stack.push(node);
        } else if (token.type === 'closeTag') {
            if (token.name === stack[stack.length - 1].name) {
                stack.pop();
                continue;
            }

            if (!strictMode) {
                let idx = -1;

                for (let i = stack.length - 1; i > 0; i--) {
                    if (token.name === stack[i].name) {
                        idx = i;
                        break;
                    }
                }

                if (idx === -1) {
                    console.warn(`Unexpected closing tag </${token.name}>`);
                } else { // Открывающий тэг найден в стэке
                    console.warn(`Tag </${token.name}> closed not on top of stack. Auto-closing inner tags.`);
                    stack.length = idx;
                }
            } else {
                throw new Error(`Unexpected closing tag </${token.name}>`);
            }
        } else {
            stack[stack.length - 1].children.push(token.content);
        }
    }

    if (stack.length > 1) {
        if (!strictMode) {
            console.warn('Unclosed tags detected:', stack.slice(1).map(n => n.name));
        } else {
            throw new Error('Unclosed tags detected:', stack.slice(1).map(n => n.name));
        }
    }

    return root.children;
}

module.exports = { buildTree };