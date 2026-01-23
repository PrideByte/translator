const { testLang, segmenter } = require('../../shared/utils.js');

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

async function post({ body, db, url }) {
    const garbageTest = new RegExp(/^[^a-zA-Zа-яёА-ЯЁ]+$/ui);
    const errors = {};
    const word = (body['word'] || '').trim().replace(garbageTest, '');
    let translations;

    if (!body['translations']) {
        translations = [];
    } else if (!Array.isArray(body['translations'])) {
        translations = [ body['translations'].trim().replace(garbageTest, '') ];
    } else {
        translations = body['translations'];
    }

    translations = translations.map(el => {
        const replaced = el.trim().replace(garbageTest, '');

        if (!replaced.length) {
            const msg = 'В одной из строк перевод состоит только из спецсимволов или цифр';

            if (!errors['translations']?.includes(msg)) {
                addError(errors, 'translations', 'В одной из строк перевод состоит только из спецсимволов или цифр');
            }
        }

        return replaced;
    }).filter(el => el.length);

    if (!word.length) {
        addError(errors, 'word', 'Введите слово или предложение для перевода');
    }

    if (!translations.length) {
        addError(errors, 'translations', 'Введите хотя бы одну строку перевода');
    }

    const isWordRu = isWordPrimaryInRu(word);
    const isAnyOfTranslationsSameLang = isWordRu
        ? translations.reduce((acc, el) => testLang(el, true) || acc, false)
        : translations.reduce((acc, el) => testLang(el, false) || acc, false);

    const isWordGarbage = !word || garbageTest.test(word);
    const isTranslationGarbage = !translations.length || translations.reduce((acc, el) => garbageTest.test(el) || acc, false);
    if (isAnyOfTranslationsSameLang && !isWordGarbage && !isTranslationGarbage) {
        addError(errors, 'translations', 'В одной из строк язык перевода совпадает с исходным');
    }

    if (Object.values(errors).length) {
        const normalizedBody = { ...body };
        if (normalizedBody.translations && !Array.isArray(normalizedBody.translations)) {
            normalizedBody.translations = [ normalizedBody.translations ]
        }
        return {
            success: false,
            statusCode: 400,
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