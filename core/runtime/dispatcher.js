const qs = require('querystring');
const handlePage = require('./controller.js');
const settings = require('../../shared/const.js');
const doResponse = require('../http/response/responseMap.js');
const getRoute = require('../router/router.js');

async function parseFormData(request) {
    return new Promise((resolve, reject) => {
        const body = [];
        let bodyLength = 0;

        request.on('data', function (data) {
            bodyLength += data.length;

            // 1MiB
            if (bodyLength > 1 * settings.sizesDictionary.MB) {
                reject({
                    statusCode: 413,
                    data: 'Content is too large'
                });
            }
            body.push(data);
        });

        request.on('end', function () {
            const bodyString = Buffer.concat(body).toString();
            resolve(qs.parse(bodyString));
        });

        request.on('error', (err) => reject({ statusCode: 400, data: err.message }));
    });
}

async function dispatcher({ request, pathname, db, url, servicePages }) {
    const resourceURL = new URL(request.url, `http://${request.headers.host}`);
    const isJSON = request.headers['accept'] === 'application/json';
    const method = request.method;
    const route = getRoute({ pathname, method });

    let resultAction;
    try {
        if (!route.route) {
            throw route;
        }

        const body = (['POST', 'PUT', 'PATCH'].includes(method))
            ? await parseFormData(request)
            : null;

        if (method !== 'GET') {
            resultAction = await route.route({ body, db, url });
        } else {
            resultAction = await handlePage({
                pageTemplate: route.route,
                pageMeta: JSON.parse((await db.getPageMetaByPath(pathname))?.meta || "{}"),
                db,
                url,
                statusCode: 200
            });
        }

        // Action must return:
        // { success: true, type: responseMap[type], pathname, ...payload }
        // or
        // { success: false, type: responseMap[type], pathname, ...payload }
        if (!isJSON && resultAction.type && resultAction.type === 'continue') {
            const pageToRedirect = getRoute({ pathname: resultAction.pathname, method: 'GET' });

            if (!pageToRedirect.route) {
                throw route;
            }

            resultAction = await handlePage({
                pageTemplate: pageToRedirect.route,
                pageMeta: JSON.parse((await db.getPageMetaByPath(resultAction.pathname))?.meta || "{}"),
                db,
                url,
                statusCode: resultAction.statusCode,
                messages: resultAction.messages
            });
        }
    } catch (error) {
        if (!error.data) {
            error.data = error.message || `[Dispatcher error]: ${error}`;
        }
        console.error(error.data);

        if (!error.statusCode) {
            error.statusCode = 500;
        }

        resultAction = {
            type: 'error',
            ...error
        }
    }

    return doResponse({
        res: resultAction,
        isJSON,
        servicePages,
        resourceURL
    });
}

module.exports = dispatcher;