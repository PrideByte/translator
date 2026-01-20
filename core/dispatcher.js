const qs = require('querystring');
const actions = require('./actionsRegistry.js');
const handlePage = require('./controller.js');
const settings = require('../shared/const.js');

const responseMap = {
    'html': (res) => ({
        data: String(res.html),
        statusCode: res.statusCode,
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    }),
    'redirectPage': (res, requestURL) => ({
        statusCode: res.statusCode,
        headers: {
            'Location': res.normalizedURL
                ? new URL(`${requestURL.origin}${requestURL.pathname}?${res.normalizedURL}`)
                : new URL(`${requestURL.origin}${requestURL.pathname}`)
        }
    }),
    'redirectAction': (res, requestURL) => ({
        statusCode: res.statusCode,
        headers: {
            'Location': new URL(`${requestURL.origin}${res.pathname}`)
        }
    }),
    'json': (res) => ({
        data: JSON.stringify(res),
        statusCode: res.statusCodeJSON || res.statusCode,
        headers: {
            'Content-Type': 'application/json'
        }
    }),
    'not_found': () => ({ type: 'not_found' }),
    'error': (res) => ({
        statusCode: res.statusCode || 500,
        data: String(res.data) || '500 Internal Error',
        headers: {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    })
};

async function parseFormData(request) {
    return new Promise((resolve, reject) => {
        let body = '';

        request.on('data', function (data) {
            body += String(data);

            // 1MiB
            if (body.length > 1 * settings.sizesDictionary.MB) {
                reject({
                    statusCode: 413,
                    data: 'Content is too large'
                });
            }
        });

        request.on('end', function () {
            resolve(qs.parse(body));
        });
    });
}

async function dispatcher({ request, pathname, db, url }) {
    const resourceURL = new URL(request.url, `http://${request.headers.host}`);

    if (!actions[pathname]) {
        return responseMap['not_found']();
    }

    const method = request.method;

    if (!actions[pathname][method]) {
        return responseMap['error']({statusCode: 405, data: '405 Method not Allowed'});
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

    const isJSON = request.headers['accept'] === 'application/json';

    let body = '';
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
            body = await parseFormData(request);
        } catch (e) {
            return responseMap['error'](e);
        }
    }

    const resultAction = await actions[pathname][method]({ body, db, url: resourceURL.pathname });

    if (isJSON) {
        return responseMap['json'](resultAction);
    }

    if (resultAction.success) {
        return responseMap[resultAction.type](resultAction, resourceURL);
    } else {
        const renderPage = await handlePage({
            pageTemplate: actions[pathname]['GET'],
            pageMeta: JSON.parse((await db.getPageMetaByPath(pathname))?.meta || "{}"),
            db,
            url,
            statusCode: 200,
            messages: resultAction.messages
        });

        return responseMap[renderPage.type](renderPage, resourceURL);
    }
}

module.exports = dispatcher;