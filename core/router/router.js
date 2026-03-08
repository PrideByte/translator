const actions = require('./actionsRegistry.js');

function router({ pathname, method }) {
    if (pathname.startsWith('/500')) {
        return {
            statusCode: 500,
            data: '500 Internal Server Error'
        };
    }
    
    if (!actions[pathname] || pathname.startsWith('/404')) {
        return {
            statusCode: 404,
            data: '404 Not Found'
        };
    }
    
    if (!actions[pathname][method]) {
        return {
            statusCode: 405,
            data: '405 Method not Allowed'
        };
    }

    return {
        route: actions[pathname][method]
    };
}

module.exports = router;