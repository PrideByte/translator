const responseMap = {
    'html': function (res) {
        return {
            data: String(res.html || res.data),
            statusCode: res.statusCode || 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            }
        };
    },
    'redirect': function (res, resourceURL) {
        const searchParams = res.normalizedURL || "";
        const url = new URL(`${resourceURL.origin}${res.pathname || resourceURL.pathname}`);
        url.search = searchParams;

        return {
            statusCode: res.statusCode,
            headers: {
                'Location': url.toString()
            }
        };
    },
    'json': function (res) {
        return {
            data: JSON.stringify(res),
            statusCode: res.statusCodeJSON || res.statusCode,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

function doResponse({res, isJSON, servicePages, resourceURL}) {
    if (res.type === 'error') {
        const { data, statusCode } = res;
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

    return responseMap[isJSON ? 'json' : res.type](res, resourceURL);
};

module.exports = doResponse;