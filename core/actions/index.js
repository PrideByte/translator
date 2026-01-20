const addTranslation = require('./addTranslation.js');

module.exports = {
    '/addtranslation': {
        'POST': addTranslation.post
    }
}