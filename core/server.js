const http = require('http');
const { createReadStream } = require('fs');
const { pipeline, finished } = require('stream/promises');
const path = require('path');
const { DB } = require('../db/queries');
const { port, defaultOrigin } = require('../shared/const.js');
const { sanitizeURLParams, resolvePath } = require('../shared/utils.js');
const dispatcher = require('./dispatcher.js');
const handlePage = require('./controller.js');
const pages = require('../pages/index.js');

const dataBase = new DB({
    host: 'localhost',
    user: 'small_translator',
    password: '*5)kNz?H5Np"aB&',
    database: 'small_translator',
    charset: 'utf8mb4'
});

function sendResponse(response, result) {
    response.writeHead(result.statusCode || 500, result.headers || {});
    response.end(result.data);
}

function setSecurityHeaders(response) {
    response.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
    ].join('; '));

    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
}

async function serveStatic(filePath, response) {
    const types = {
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

    try {
        const relativePath = filePath.replace(/^\/static\//, '');

        const safePath = resolvePath({
            baseDir: path.join(__dirname, '../static/'),
            src: relativePath,
            allowedExtensions: Object.keys(types)
        });

        const ext = path.extname(safePath).toLowerCase();

        response.writeHead(200, {
            'Content-Type': types[ext] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000'
        });

        await pipeline(createReadStream(safePath), response);

    } catch (err) {
        console.error('Static reading error:', err);

        if (!response.headersSent && !response.writableEnded) {
            sendResponse(response, {
                data: 'Not found',
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8'
                },
                statusCode: 404
            });
        }
    }
}

async function startServer() {
    await dataBase.init();
    const servicePages = {
        404: await handlePage({
            pageTemplate: pages["/404"],
            pageMeta: JSON.parse((await dataBase.getPageMetaByPath('/404'))?.meta || "{}"),
            db: dataBase, url: defaultOrigin, statusCode: 404
        }),
        500: await handlePage({
            pageTemplate: pages["/500"],
            pageMeta: JSON.parse((await dataBase.getPageMetaByPath('/500')).meta),
            db: dataBase, url: defaultOrigin, statusCode: 500
        })
    };

    http.createServer(async (request, response) => {
        const start = Date.now();

        try {
            setSecurityHeaders(response);

            const rawUrl = new URL(request.url, `http://${request.headers.host}`);
            const [beforeHash] = request.url.split('#');
            const [pathPart, queryPart] = beforeHash.split('?');
            const normalizedPath = pathPart.replace(/\/+/g, '/');
            const normalizedUrl = new URL(normalizedPath, `http://${request.headers.host}`);
            normalizedUrl.search = (queryPart ? queryPart : ''); 
            normalizedUrl.search = sanitizeURLParams(normalizedUrl.searchParams).toString();

            if (decodeURIComponent(rawUrl.href) !== decodeURIComponent(normalizedUrl.href)) {
                sendResponse(response, {
                    data: undefined,
                    headers: {
                        'Location': normalizedUrl.toString()
                    },
                    statusCode: 301
                });
                return;
            }

            const pathname = decodeURIComponent(normalizedUrl.pathname).match(/(.+?)\/?$/)[1];

            if (pathname.startsWith('/static/')) {
                await serveStatic(pathname, response);
                return;
            }

            const result = await dispatcher({
                request,
                pathname,
                db: dataBase,
                url: {
                    pathname: normalizedUrl.pathname,
                    params: Object.fromEntries(normalizedUrl.searchParams)
                },
                servicePages
            });

            sendResponse(response, result);
        } catch (err) {
            console.error('Ошибка на сервере:', err);
            const result = servicePages[500];

            sendResponse(response, {
                data: result.html,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                },
                statusCode: result.statusCode
            });
        } finally {
            try {
                await finished(response);
                console.log(`[${request.method}] ${request.url} | ${response.statusCode} | ${Date.now() - start}ms | OK`);
            } catch (error) {
                console.warn(`[${request.method}] ${request.url} | ${response.statusCode} | ${Date.now() - start}ms | ABORTED/ERROR: ${err.message}`);
            }
        }
    }).listen(port, () => {
        console.log(`✅ Server running on http://localhost:${port}`);
    });
}

module.exports = startServer;