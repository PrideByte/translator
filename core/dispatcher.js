const qs = require('querystring');
const actions = require('./actionsRegistry.js');
const handlePage = require('./controller.js');
const settings = require('../shared/const.js');

const responseMap = {
    'html': (res) => ({
        data: String(res.html || res.data),
        statusCode: res.statusCode || 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    }),
    'redirect': (res, requestURL) => {
        const searchParams = res.normalizedURL || "";
        const url = new URL(`${requestURL.origin}${res.pathname || requestURL.pathname}`);
        url.search = searchParams;

        return {
            statusCode: res.statusCode,
            headers: {
                'Location': url.toString()
            }
        }
    },
    'json': (res) => ({
        data: JSON.stringify(res),
        statusCode: res.statusCodeJSON || res.statusCode,
        headers: {
            'Content-Type': 'application/json'
        }
    })
};

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

    const throwSystemError = ({ statusCode, data }) => {
        if (isJSON) {
            return responseMap['json']({
                type: 'error',
                data, statusCode
            });
        }

        const page = servicePages[statusCode] || servicePages['500'];
        return responseMap['html']({
            data: page.html,
            statusCode
        });
    }

    if (pathname.startsWith('/500')) {
        return throwSystemError({ statusCode: 500, data: '500 Internal Server Error' });
    }

    if (!actions[pathname] || pathname.startsWith('/404')) {
        return throwSystemError({ statusCode: 404, data: '404 Not Found' });
    }

    const method = request.method;

    if (!actions[pathname][method]) {
        return throwSystemError({ statusCode: 405, data: '405 Method not Allowed' });
    }

    if (method === 'GET') {
        const result = await handlePage({
            pageTemplate: actions[pathname][method],
            pageMeta: JSON.parse((await db.getPageMetaByPath(pathname))?.meta || "{}"),
            db,
            url,
            statusCode: 200
        });

        return responseMap[result.type](result, resourceURL);
    }

    let body = '';
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
            body = await parseFormData(request);
        } catch (e) {
            return throwSystemError({ statusCode: e.statusCode || 400, data: e.data || e.message });
        }
    }

    let resultAction;
    try {
        resultAction = await actions[pathname][method]({ body, db, url });
    } catch (e) {
        console.error('Action execution failed:', e);
        return throwSystemError({ statusCode: 500, data: `Action ${method}:${pathname} execution error` });
    }

    if (isJSON) {
        return responseMap['json'](resultAction);
    }

    // Action must return:
    // { success: true, type: responseMap[type], pathname, ...payload }
    // or
    // { success: false, type: responseMap[type], pathname, ...payload }
    if (resultAction.type && resultAction.type === 'continue') {

        if (!actions[resultAction.pathname]['GET']) {
            return throwSystemError({ statusCode: 400, data: `Action ${method}:${pathname} failed and no GET template available` });
        }

        const renderPage = await handlePage({
            pageTemplate: actions[resultAction.pathname]['GET'],
            pageMeta: JSON.parse((await db.getPageMetaByPath(resultAction.pathname))?.meta || "{}"),
            db,
            url,
            statusCode: resultAction.statusCode,
            messages: resultAction.messages
        });

        return responseMap[renderPage.type](renderPage, resourceURL);
    }

    return responseMap[resultAction.type](resultAction, resourceURL);
}

module.exports = dispatcher;