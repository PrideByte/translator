const fs = require('fs');
const { raw } = require('mysql2');
const path = require('path');

function escapeHtml(str) {
	if (str == null) return '';
	return String(str)
		.replace(/&(?![a-zA-Z0-9]+;)/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function serializeForScript(obj) {
	let json = JSON.stringify(obj);
	json = json.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

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
	const rawParams = [...searchParams.entries()];
	const result = new URLSearchParams();
	for (let i = 0; i < rawParams.length; i++) {
		if (rawParams[i][0] && rawParams[i][1] && !result.has(rawParams[0])) {
			result.set(rawParams[i][0], rawParams[i][1]);
		}
	}

	return result;
}

function isLooksLikeRussian(word) {
	return /[А-ЯЁа-яё]/ui.test(word);
}

module.exports = {
	escapeHtml,
	serializeForScript,
	getAllAttrsString,
	resolvePath,
	sanitizeURLParams,
	isLooksLikeRussian
};