const actions = require('./actions/index.js');
const pages = require('../pages/index.js');

const result = {};

for (const [path, handler] of Object.entries(pages)) {
    result[path] = { 'GET': handler };
}

for (const [path, methods] of Object.entries(actions)) {
    for (const [method, handler] of Object.entries(methods)) {
        if (!result[path]) {
            result[path] = {}
        }

        result[path][method] = handler;
    }
}

module.exports = result;