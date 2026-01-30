const fs = require('fs');
const path = require('path');

function escapeHtml(str) {
	if (!str) return '';

	return String(str)
		.replace(/&(?![a-zA-Z0-9]+;)/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function serializeForScript(obj) {
	let json = JSON.stringify(obj);
	json = json
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029')
		.replace(/</g, '\\u003C')
		.replace(/>/g, '\\u003E');

	return json;
}

function getAllAttrsString(attrs) {
	let result = '';
	for (const [key, value] of Object.entries(attrs)) {
		result += `${key}="${value}" `;
	}

	return result;
}

function resolvePath({ baseDir, src, allowedExtensions = [] }) {
	const root = fs.realpathSync(baseDir);
	const resolved = path.resolve(root, src);

	if (!resolved.startsWith(root + path.sep)) {
		throw new Error(`Path traversal attempt: ${src}`);
	}

	let stat = '';
	try {
		stat = fs.statSync(resolved);
	} catch (e) {
		throw new Error(`File not found: ${src}`);
	}

	if (!stat.isFile()) {
		throw new Error(`Path is not a file: ${src}`);
	}

	const realPath = fs.realpathSync(resolved);
	if (!realPath.startsWith(root + path.sep)) {
		throw new Error(`Symlink escape detected: ${src}`);
	}

	const ext = path.extname(resolved);
	if (!allowedExtensions.includes(ext)) {
		throw new Error(`Forbidden extension: ${ext}`);
	}

	return realPath;
}

function sanitizeURLParams(searchParams) {
    const result = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
        if (key && value && !result.has(key)) {
            result.set(key, value);
        }
    }

    return result;
}

function testLang(word, ruTest) {
	return ruTest
		// Если ни одной английской буквы - ru
		? /^[^a-zA-Z]+$/ui.test(word)
		// Если ни одной русской буквы - en
		: /^[^а-яёА-ЯЁ]+$/ui.test(word);
}

function segmenterConstructor() {
	return new Intl.Segmenter(['ru', 'en'], {granularity: 'grapheme'});
}

module.exports = {
	escapeHtml,
	serializeForScript,
	getAllAttrsString,
	resolvePath,
	sanitizeURLParams,
	testLang,
	segmenter: segmenterConstructor()
};