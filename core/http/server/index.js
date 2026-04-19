const { finished } = require('stream/promises');
const http = require('http');
const { DB } = require('../../../db/queries.js');
const { port, db_config } = require('../../../shared/const.js');
const dispatcher = require('../../runtime/dispatcher.js');
const logger = require('../../logger/logger.js');
const initServicePages = require('../response/initServicePages.js');
const sendResponse = require('../response/sendResponse.js');
const serveStatic = require('./static.js');
const setSecurityHeaders = require('./security.js');
const getNormalizedUrl = require('./urlHelper.js');

const dataBase = new DB(db_config);

async function startServer() {
    await dataBase.init();

    // Generate 404 and 500 service pages
    const servicePages = Object.entries(await initServicePages(dataBase)).reduce((acc, [key, value]) => {
        if (!value.success) {
            logger.error(`Service page generating error`, value.error);
        }
        acc[key] = value.page;
        return acc;
    }, {});

    http.createServer(async (request, response) => {
        const start = Date.now();

        try {
            setSecurityHeaders(response);

            // URL normalization
            const {url, shouldRedirect, redirectURL} = getNormalizedUrl(request);

            if (shouldRedirect) {
                return sendResponse(response, {
                    data: undefined,
                    headers: {
                        'Location': redirectURL
                    },
                    statusCode: 301
                });
            }

            const pathname = decodeURIComponent(url.pathname);

            if (pathname.startsWith('/static/')) {
                try {
                    await serveStatic(pathname, response);
                    return;
                } catch (err) {
                    const isNotFound = err.cause?.code === 'ENOENT' || err.cause?.message.includes('File not found') || err.message.includes('File not found');

                    if (isNotFound) {
                        logger.warn(`Static file ${pathname} not found`);

                        return sendResponse(response, {
                            data: servicePages[404].html,
                            headers: { 'Content-Type': 'text/html; charset=utf-8' },
                            statusCode: servicePages[404].statusCode
                        });
                    }

                    throw err;
                }
            }

            const result = await dispatcher({
                request,
                pathname,
                db: dataBase,
                url: {
                    pathname,
                    params: Object.fromEntries(url.searchParams)
                },
                servicePages
            });

            sendResponse(response, result);
        } catch (err) {
            logger.error('Ошибка на сервере:', err);

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
                logger.info(`[${request.method}] ${request.url} | ${response.statusCode} | ${Date.now() - start}ms | OK`);
            } catch (error) {
                logger.warn(`[${request.method}] ${request.url} | ${response.statusCode} | ${Date.now() - start}ms | ABORTED/ERROR: ${error.message}`);
            }
        }
    }).listen(port, () => {
        logger.info(`✅ Server running on http://localhost:${port}`);
    });
}

module.exports = startServer;