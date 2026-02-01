const settings = require('../shared/const.js');
const mysql = require('mysql2/promise');

class DB {
    constructor(opts) {
        this.pool = mysql.createPool(opts);
    }

    init = async function() {
        await this.getWordsNumber();

        // Get pages list
        this.pages = new Map();
        const pagesList = (await this.pool.query(`
            SELECT id, name, slug, path
            FROM pages;`)
        )[0];
        pagesList.forEach(element => {
            this.pages.set(element.path, element);
        });
    }

    getWordsNumber = async function() {
        // Get english words number and russian words number
        const result = (
            await this.pool.query(`
                SELECT 'en' as lang, COUNT(id) AS count
                FROM english_words
                UNION
                SELECT 'ru' as lang, COUNT(id) AS count
                FROM russian_words;`)
        )[0];

        result.forEach(row => {
            (row.lang === 'en') && (this.enWordsNumber = row.count);
            (row.lang === 'ru') && (this.ruWordsNumber = row.count);
        });
    }

    getPageMetaByPath = async function(path) {
        const res = (await this.pool.query(`
            SELECT meta
            FROM pages
            WHERE path = ?;`, path)
        )[0];

        return res[0];
    }

    getWordsCountByWord = async function(word = '') {
        const [result] = await this.pool.query(`
            SELECT COUNT(id) as count
            FROM english_words
            WHERE english_words.word LIKE ?;
        `, [`%${word}%`]);

        return result[0];
    }

    getTranslationsByWord = async function({word = null, limit = 10, page = 1}) {
        const { limitList } = settings;
        limit = Number(limit);
        limit = (limitList.includes(limit)) ? limit : 10;
        if ((typeof word !== 'string') || word === '') {
            word = null;
        }

        if (word) {
            page = 1;
        }

        let offset = 0;
        if ((page > 0) && (((page - 1) * limit - this.enWordsNumber) < limit)) {
            offset = (page - 1) * limit;
        }

        const [result] = await this.pool.query(`
            SELECT en_words.word, russian_words.word as ru_word
            FROM russian_words
            INNER JOIN en_ru_links
            ON russian_words.id = en_ru_links.ru_id
            INNER JOIN (
                SELECT english_words.*
                FROM english_words
                WHERE (? IS NULL OR english_words.word = ?)
                LIMIT ? OFFSET ?
            ) AS en_words
            ON en_words.id = en_ru_links.en_id;
        `, [word, word, limit, offset]);
        
        const wordsHash = result.reduce((acc, row) => {
            if (!acc[row.word]) {
                acc[row.word] = [];
            }
            
            acc[row.word].push(row.ru_word);
            return acc;
        }, {});

        return wordsHash;
    }

    #getWordId = async function({ connection, dbName, word }) {
        const [result] = await connection.execute(`
            SELECT id
            FROM ${dbName}
            WHERE word = ?;
        `, [word]);


        return result.length ? result[0].id : false;
    }

    #insertWords = async function({ connection, dbName, words }) {
        const [result] = await connection.query(`
            INSERT INTO ${dbName} (word)
            VALUES ?
        `, [words]);

        return result.insertId;
    }

    #addTranslations = async function({ connection, wordDBName, translationsDBName, word, translations, linkMapper }) {
        let wordId = '';

        // Check if word is already exist in db
        const existId = await this.#getWordId({ connection, dbName: wordDBName, word });

        if (existId !== false) {
            // If it is - get it's id
            wordId = existId;
        } else {
            // If not exist - add it and get it's id
            wordId = await this.#insertWords({ connection, dbName: wordDBName, words: [[word]] });
        }

        
        const [existingRows] = await connection.query(
            `SELECT id, word FROM ${translationsDBName} WHERE word IN (?)`,
            [translations]
        );
        const existingMap = new Map(existingRows.map(row => [row.word, row.id]));

        const translationIds = [];
        const wordsToInsert = [];

        for (const translation of translations) {
            if (existingMap.has(translation)) {
                translationIds.push(existingMap.get(translation));
            } else {
                wordsToInsert.push([translation]);
            }
        }

        if (wordsToInsert.length > 0) {
            const insertResult = await this.#insertWords({ connection, dbName: translationsDBName, words: wordsToInsert });

            for (let i = 0; i < wordsToInsert.length; i++) {
                translationIds.push(insertResult + i);
            }
        }

        await connection.query(`
            INSERT IGNORE INTO en_ru_links (en_id, ru_id)
            VALUES ?
        `, [translationIds.map(e => linkMapper(wordId, e))]);
    }

    addEnToRuTranslations = async function({ word, translations }) {
        const connection = await this.pool.getConnection();

        try {
            await connection.beginTransaction();

            await this.#addTranslations({
                connection,
                wordDBName: 'english_words',
                translationsDBName: 'russian_words',
                word,
                translations,
                linkMapper: (w, t) => [w, t]
            });

            await connection.commit();

            await this.getWordsNumber();
        } catch (e) {
            await connection.rollback();
            console.error(e);
            throw new Error('Error adding EN-RU translations', { cause: e })
        } finally {
            connection.release();
        }

        const result = {};
        result[word] = translations;

        return result;
    }

    addRuToEnTranslations = async function({ word, translations }) {
        const connection = await this.pool.getConnection();

        try {
            await connection.beginTransaction();

            await this.#addTranslations({
                connection,
                wordDBName: 'russian_words',
                translationsDBName: 'english_words',
                word,
                translations,
                linkMapper: (w, t) => [t, w]
            });

            await connection.commit();

            await this.getWordsNumber();
        } catch (e) {
            await connection.rollback();
            console.error(e);
            throw new Error('Error adding RU-EN translations', { cause: e });
        } finally {
            connection.release();
        }

        const result = {};
        result[word] = translations;

        return result;
    }

    removeWordAndTranslationsByWord = async function name(word) {
        const connection = await this.pool.getConnection();

        try {
            await connection.beginTransaction();

            const [rows] = await connection.execute(`
                SELECT english_words.id as wordID, GROUP_CONCAT(en_ru_links.ru_id) as translationIDs
                FROM english_words
                LEFT JOIN en_ru_links
                    ON english_words.id = en_ru_links.en_id
                WHERE english_words.word = ?
                GROUP BY english_words.id;
            `, [word]);

            if (!rows.length) {
                throw new Error(`Word "${word}" not in base`);
            }

            const { wordID, translationIDs } = rows[0];

            // await connection.execute('DELETE FROM en_ru_links WHERE en_id = ?', [wordID]);
            await connection.execute('DELETE FROM english_words WHERE id = ?', [wordID]);

            if (translationIDs) {
                const ruIdArray = translationIDs.split(',');
                await connection.query(`
                    DELETE russian_words
                    FROM russian_words
                    LEFT JOIN en_ru_links
                        ON russian_words.id = en_ru_links.ru_id
                    WHERE russian_words.id
                        IN (?) 
                        AND en_ru_links.ru_id IS NULL;
                `, [ruIdArray]);
            }

            await connection.commit();

            await this.getWordsNumber();

        } catch (e) {
            await connection.rollback();
            console.error(e);
            throw new Error(`Error removing word "${word}" from the base`, { cause: e });
        } finally {
            connection.release();
        }

        return true;
    }
}

module.exports = { DB };