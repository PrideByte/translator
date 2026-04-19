const { createReadStream } = require('fs');
const { pipeline } = require('stream/promises');
const path = require('path');
const { resolvePath } = require('../../../shared/utils.js');
const MIME_TYPES = {
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

async function serveStatic(filePath, response) {
    try {
        const relativePath = filePath.replace(/^\/static\//, '');
        const safePath = resolvePath({
            baseDir: path.join(__dirname, '../../../static/'),
            src: relativePath,
            allowedExtensions: Object.keys(MIME_TYPES)
        });

        const ext = path.extname(safePath).toLowerCase();

        response.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000'
        });

        await pipeline(createReadStream(safePath), response);
    } catch (err) {
        throw new Error(`Error reading static file ${filePath}`, {cause: err});
    }
}

module.exports = serveStatic;