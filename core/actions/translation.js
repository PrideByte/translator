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

//ToDo Вынести валидацию в JSON Schema
async function post({ body, db, url }) {
    if (body['PUT']) {
        return put({ body, db, url });
    }

    if (body['DELETE']) {
        return deleteMethod({ body, db, url });
    }

    const garbageTest = new RegExp(/^[^a-zA-Zа-яёА-ЯЁ]+$/ui);
    const errors = {};
    const word = escapeHtml(body['word'] || '').trim().replace(garbageTest, '');
    let translations;

    if (!body['translations']) {
        translations = [];
    } else if (!Array.isArray(body['translations'])) {
        translations = [ body['translations'].trim().replace(garbageTest, '') ];
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

    const isWordGarbage = !word || garbageTest.test(word);
    if (isAnyOfTranslationsSameLang && !isWordGarbage && translations.length) {
        addError(errors, 'translations', 'В одной из строк язык перевода совпадает с исходным');
    }

    if (Object.values(errors).length) {
        const normalizedBody = { ...body };
        if (normalizedBody.translations && !Array.isArray(normalizedBody.translations)) {
            normalizedBody.translations = [ normalizedBody.translations ]
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

    let result = {};
    try {
        if (isWordRu) {
            result = await db.addRuToEnTranslations({ word, translations });
        } else {
            result = await db.addEnToRuTranslations({ word, translations });
        }
    } catch (e) {
        throw new Error('Error adding translation to database', { cause: e });
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
    return {
        success: true,
        type: 'redirect',
        statusCodeJSON: 201,
        statusCode: 303,
        pathname: '/',
        data: `Method PUT on ${url} executed and succeed`
    };
}

async function deleteMethod({ body, db, url }) {
    const garbageTest = new RegExp(/^[^a-zA-Zа-яёА-ЯЁ]+$/ui);
    const errors = {};
    const keyRaw = body['DELETE'] || body.word;
    const key = escapeHtml(keyRaw || '').trim().replace(garbageTest, '');

    if (!key.length) {
        addError(errors, 'word', 'Отсутствует слово для удаления!');
    } else {
        try {
            await db.removeWordAndTranslationsByWord(key);
        } catch (e) {
            addError(errors, 'word', e);
        }
    }

    if (Object.values(errors).length) {
        const normalizedBody = { ...body };
        if (normalizedBody.translations && !Array.isArray(normalizedBody.translations)) {
            normalizedBody.translations = [ normalizedBody.translations ]
        }
        return {
            success: false,
            type: 'redirect',
            statusCode: 400,
            pathname: '/',
            messages: {
                initial: { ...normalizedBody },
                errors
            }
        }
    }

    return {
        success: true,
        type: 'redirect',
        statusCodeJSON: 204,
        statusCode: 303,
        pathname: '/',
        data: `"${key}" word and its translations has been deleted successfully`
    };
}

module.exports = { post, put, delete: deleteMethod };