const { testLang, segmenter, escapeHtml } = require('../../shared/utils.js');

function isWordPrimaryInRu(word) {
    const segments = segmenter.segment(word);
    const segmentsCount = [...segments].reduce((acc, segment) => {
        if (/[а-яёА-ЯЁ]/ui.test(segment.segment)) {
            acc.ru++;
        } else if (/[a-zA-Z]/ui.test(segment.segment)) {
            acc.en++;
        }

        return acc;
    }, { en: 0, ru: 0 });

    return segmentsCount.ru > segmentsCount.en;
}

function addError(errors, field, message) {
    if (!Array.isArray(errors[field])) {
        errors[field] = [];
    }

    errors[field].push(message);
}

function validateInput({ errors, body }) {
    const garbageTest = new RegExp(/^[^a-zA-Zа-яёА-ЯЁ]+$/ui);
    const word = escapeHtml(body['word'] || '').trim().replace(garbageTest, '');
    let translations;

    if (!body['translations']) {
        translations = [];
    } else if (!Array.isArray(body['translations'])) {
        translations = [body['translations'].trim().replace(garbageTest, '')];
    } else {
        translations = body['translations'];
    }

    translations = translations.map(el => {
        const replaced = escapeHtml(el.trim().replace(garbageTest, ''));

        if (!replaced.length) {
            const msg = 'В одной из строк перевод состоит только из спецсимволов или цифр';

            if (!errors['translations']?.includes(msg)) {
                addError(errors, 'translations', msg);
            }
        }

        return replaced.toLowerCase();
    }).filter(el => el.length);

    translations = [...new Set(translations)];

    if (!word.length) {
        addError(errors, 'word', 'Введите слово или предложение для перевода');
    }

    if (!translations.length) {
        addError(errors, 'translations', 'Введите хотя бы одну строку перевода');
    }

    const isWordRu = isWordPrimaryInRu(word);
    const isAnyOfTranslationsSameLang = isWordRu
        ? translations.some(el => testLang(el, true))
        : translations.some(el => testLang(el, false));

    if (isAnyOfTranslationsSameLang && word && translations.length) {
        addError(errors, 'translations', 'В одной из строк язык перевода совпадает с исходным');
    }

    return { word, translations, isWordRu };
}

function doContinue({errors, body, wordID}) {
    const normalizedBody = { ...body };
    if (wordID) {
        normalizedBody['wordID'] = wordID;
    }

    if (normalizedBody.translations && !Array.isArray(normalizedBody.translations)) {
        normalizedBody.translations = [normalizedBody.translations];
    }
    return {
        success: false,
        type: 'continue',
        statusCode: 400,
        pathname: '/translation',
        messages: {
            initial: { ...normalizedBody },
            errors
        }
    }
}

//ToDo Вынести валидацию в JSON Schema
async function post({ body, db, url }) {
    // Fallback - проверки для non-JS версии сайта
    const method = body.method?.toUpperCase();

    if (method === 'DELETE') {
        return deleteMethod({ body, db, url });
    }

    if (method === 'PUT') {
        return put({ body, db, url });
    }

    const errors = {};

    const { word, translations, isWordRu } = validateInput({ errors, body });

    if (Object.values(errors).length) {
        return doContinue({ errors, body });
    }

    let result = {};
    try {
        if (isWordRu) {
            result = await db.addRuToEnTranslations({ word, translations });
        } else {
            result = await db.addEnToRuTranslations({ word, translations });
        }
    } catch (e) {
        console.error(e);
        return doContinue({ errors, body });
    }

    return {
        success: true,
        type: 'redirect',
        statusCodeJSON: 201,
        statusCode: 303,
        pathname: '/',
        data: result
    };
}

async function put({ body, db, url }) {
    const errors = {};
    const wordID = url.params.wordID || body['wordID'];
    const { word, translations, isWordRu } = validateInput({ errors, body });

    if (isWordRu) {
        addError(errors, 'word', 'Изменяемое слово должно быть на исходном языке');
    }

    if (Object.values(errors).length) {
        return doContinue({ errors, body, wordID });
    }

    let result = {};
    // Изменения в базе
    try {
        result = await db.updateTranslationsById({wordID, word, translations});
    } catch (e) {
        addError(errors, 'word', e.message);
        console.error(e);
        return doContinue({ errors, body, wordID });
    }

    return {
        success: true,
        type: 'redirect',
        statusCodeJSON: 201,
        statusCode: 303,
        pathname: '/',
        data: result
    };
}

async function deleteMethod({ body, db, url }) {
    const errors = {};
    const rawID = body['wordID'] || url.params.wordID;
    const ID = parseInt(rawID, 10);

    if (!ID) {
        addError(errors, 'wordID', 'Некорректный идентификатор записи');
    } else {
        try {
            await db.removeWordAndTranslationsByID(ID);
        } catch (e) {
            console.error(e);
            addError(errors, 'wordID', e.message);
        }
    }

    if (Object.values(errors).length) {
        return doContinue({ errors, body });
    }

    return {
        success: true,
        type: 'redirect',
        statusCodeJSON: 200,
        statusCode: 303,
        pathname: '/',
        data: `Word with ID "${ID}" and its translations has been deleted successfully`
    };
}

module.exports = { post, put, delete: deleteMethod };