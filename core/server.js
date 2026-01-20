const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { DB } = require('../db/queries');
const { port, defaultOrigin } = require('../shared/const.js');
const { sanitizeURLParams } = require('../shared/utils.js');
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
    try {
        const full = path.join(__dirname, '../', filePath);
        const data = await fs.readFile(full);
        const ext = path.extname(full).toLowerCase();
        const types = {
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.html': 'text/html; charset=utf-8',
            '.ico': 'image/x-icon'
        };
        sendResponse(response, {
            data,
            headers: {
                'Content-Type': types[ext] || 'application/octet-stream'
            },
            statusCode: 200
        });
    } catch (err) {
        console.error(err);
        sendResponse(response, {
            data: 'Not found',
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            },
            statusCode: 404
        });
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
        try {
            setSecurityHeaders(response);

            const rawUrl = new URL(request.url, `http://${request.headers.host}`);
            const replacedUrl = new URL(request.url.replaceAll(/\/{2,}/g, '/'), `http://${request.headers.host}`);
            const rawParams = replacedUrl.searchParams;
            const sanitizedParams = sanitizeURLParams(rawParams);
            let isURLCorrect = true;

            for (const [key, value] of rawParams.entries()) {
                if (!sanitizedParams.has(key) || sanitizedParams.get(key) !== rawParams.get(key)) {
                    isURLCorrect = false;
                }
            }

            if (rawUrl.href !== replacedUrl.href || !isURLCorrect) {
                sendResponse(response, {
                    data: undefined,
                    headers: {
                        'Location': sanitizedParams.toString()
                            ? new URL(`${replacedUrl.origin}${replacedUrl.pathname}?${sanitizedParams.toString()}`)
                            : new URL(`${replacedUrl.origin}${replacedUrl.pathname}`)
                    },
                    statusCode: 301
                });
                return;
            }

            const pathname = decodeURIComponent(replacedUrl.pathname).match(/(.+?)\/?$/)[1];

            if (pathname.startsWith('/static/')) {
                await serveStatic(pathname, response);
                return;
            }

            const result = await dispatcher({
                request,
                pathname,
                db: dataBase,
                url: {
                    pathname: replacedUrl.pathname,
                    params: Object.fromEntries(replacedUrl.searchParams)
                }
            });

            if (result.type && (result.type === 'not_found')) {
                result.data = servicePages[404].html;
                result.headers = {
                    'Content-Type': 'text/html; charset=utf-8'
                };
                result.statusCode = servicePages[404].statusCode;
            }

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
        }
    }).listen(port, () => {
        console.log(`✅ Server running on http://localhost:${port}`);
    });
}

module.exports = startServer;