const fs = require('fs');
const path = require('path');
const { resolvePath } = require('../shared/utils.js');
const partials = require('./partials/index.js');

const allowedExtensions = ['.template', '.html'];
const cache = new Map();
const basePath = __dirname;

function preprocessTemplate(template, src, stack = [src]) {
    const includeRegex = /<@include\s+([^>]+)>/giu;
    return template.replace(includeRegex, (str, attrs) => {
        const getEntryByName = attrs.match(/(?:^|\s)(["'])([^"']+)\1/ui)?.[2] ?? '';
        const getEntryBySrc  = attrs.match(/src=(["'])([^"']+)\1/ui)?.[2] ?? '';
        let entry = '';

        if (partials[getEntryByName]) {
            entry = partials[getEntryByName];
        } else {
            if (getEntryBySrc) {
                entry = getEntryBySrc;
                console.warn(`Unknown or empty named partial ${getEntryByName} in ${src}`);
                console.warn(`Fallback to src-partial ${getEntryBySrc} in ${src}`);
            } else {
                throw new Error(`Unknown or empty partial ${getEntryByName} in ${src}`);
            }
        }

        const fullPath = resolvePath({
            baseDir: path.join(basePath, './partials/'),
            src: entry,
            allowedExtensions
        });

        if (stack.includes(fullPath)) {
            throw new Error(`Circular include detected: ${fullPath}`);
        }

        if (cache.has(fullPath)) {
            return cache.get(fullPath);
        }

        const contentRaw = fs.readFileSync(fullPath, 'utf-8');

        const contentReady = preprocessTemplate(
            contentRaw,
            fullPath,
            [...stack, fullPath]
        );

        cache.set(fullPath, contentReady);

        return contentReady;
    });
}

function loadTemplate(filename) {
    const fullPath = resolvePath({
        baseDir: basePath,
        src: filename,
        allowedExtensions
    });

    if (cache.has(fullPath)) {
        return cache.get(fullPath);
    }

    const raw = fs.readFileSync(fullPath, 'utf-8');
    const readyFile = preprocessTemplate(raw, fullPath);

    cache.set(fullPath, readyFile);

    return readyFile;
}

module.exports = {
    "/": loadTemplate('./main.template'),
    "/404": loadTemplate('./service/404.template'),
    "/500": loadTemplate('./service/500.template'),
    "/addtranslation": loadTemplate('./addTranslation.template')
}