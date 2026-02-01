const translation = require('./translation.js');

module.exports = {
    '/translation': {
        'POST': translation.post,
        'PUT': translation.put,
        'DELETE': translation.delete
    }
}