const { isLooksLikeRussian } = require('../../shared/utils.js');

async function post({ body, db, url }) {
    const errors = {};
    const word = body['word'] && body['word'].trim() || '';
    let translations;

    if (!body['translations']) {
        translations = [];
    } else if (!Array.isArray(body['translations'])) {
        translations = [ body['translations'].trim() ];
    } else {
        translations = body['translations'].map(el => el.trim());
    }

    translations = translations.filter(el => el.length);

    if (!word.length) {
        errors['word'] = 'Введите слово или предложение для перевода';
    }

    if (!translations.length) {
        errors['translations'] = 'Введите хотя бы одну строку перевода';
    }

    const isWordRu = isLooksLikeRussian(word);

    if (Object.values(errors).length) {
        return {
            success: false,
            statusCode: 400,
            messages: errors
        }
    }

    let result = {};
    try {
        if (isWordRu) {
            result = await db.addRuToEnTranslations({ word, translations });
        } else {
            result = await db.addEnToRuTranslations({ word, translations });
        }
    } catch (e) {
        throw new Error('Error adding translation to database', e);
    }

    return {
        success: true,
        type: 'redirectAction',
        statusCodeJSON: 201,
        statusCode: 303,
        pathname: '/' || url,
        data: result
    };
}

module.exports = { post };