const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { renderPage } = require('./renderer');
const { DB } = require('./db/queries');
const { escapeHtml } = require('./utils.js');

// === Константы ===
const PORT = 8080;
const DB_CONFIG = {
    host: 'localhost',
    user: 'translator_gpt',
    password: '*5)kNz?H5Np"aB&',
    database: 'translator_gpt',
    charset: 'utf8mb4'
};
const PER_PAGE = 10;
const dataBase = new DB(DB_CONFIG);

// === Централизованная генерация и кэширование страниц ===
async function generatePage({ pageObject, req, res, URLparams, db, statusCode = 200 }) {
    try {
        const html = await renderPage({pageObject, req, res, db, URLparams});

        return { html, status: statusCode };
    } catch (err) {
        console.error(`Ошибка генерации страницы ${req.url}:`, err);
        const html = await renderPage({
            pageObject: dataBase.getPageByPath('/500'),
            req, res, db, URLparams
        });

        return { html, status: 500 };
    }
}

// === Вспомогательная отправка HTML ===
function sendHtml(res, html, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
}

// === Безопасные заголовки ===
function setSecurityHeaders(res) {
    res.setHeader('Content-Security-Policy', [
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

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
}

// === Обработка статики ===
async function serveStatic(filePath, res) {
    try {
        const full = path.join(__dirname, filePath);
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
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(data);
    } catch (err) {
        console.error(err);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
    }
}

async function startServer() {
    await dataBase.init();

    // === Основной HTTP-сервер ===
    http.createServer(async (req, res) => {
        try {
            // Устанавливаем защитные заголовки для каждого ответа
            setSecurityHeaders(res);

            const url = new URL(req.url.replaceAll(/\/{2,}/g, '/'), `http://${req.headers.host}`);
            const pathname = decodeURIComponent(url.pathname).match(/(.+?)\/?$/)[1];

            if (pathname.startsWith('/static/')) {
                await serveStatic(pathname, res);
            } else {
                let currentPage;

                if (dataBase.pages.has(pathname)) {
                    currentPage = await dataBase.getPageByPath(pathname);
                } else {
                    currentPage = await dataBase.getPageByPath('/404');
                }

                const URLparams = url.searchParams.entries().reduce(((acc, [key, value]) => {
                    acc[escapeHtml(key)] = escapeHtml(value);
                    return acc;
                }), {});
                
                const result = await generatePage({
                    pageObject: currentPage,
                    req,
                    res,
                    db: dataBase,
                    URLparams,
                    statusCode: currentPage.slug == '404' ? 404 : 200
                });

                sendHtml(res, result.html, result.status);
            }
        } catch (err) {
            console.error('Ошибка на сервере:', err);
            const result = await generatePage({
                pageObject: await dataBase.getPageByPath('/500'),
                req,
                res,
                db: dataBase,
                statusCode: 500
            });

            sendHtml(res, result.html, result.status);
        }
    }).listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}

startServer();