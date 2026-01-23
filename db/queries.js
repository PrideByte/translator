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
        [ { count: this.enWordsNumber }, { count: this.ruWordsNumber } ] = (
            await this.pool.query(`
                SELECT COUNT(id) AS count
                FROM english_words
                UNION
                SELECT COUNT(id) AS count
                FROM russian_words;`)
        )[0];
    }

    async getPageMetaByPath(path) {
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
        `, [word]);

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

    getWordId = async function({ connection, dbName, word }) {
        const [result] = await connection.execute(`
            SELECT id
            FROM ${dbName}
            WHERE word = ?;
        `, [word]);


        return result.length ? result[0].id : false;
    }

    insertWord = async function({ connection, dbName, word }) {
        const [result] = await connection.execute(`
            INSERT INTO ${dbName} (word)
            VALUES (?)
        `, [word]);

        return result.insertId;
    }

    addEnToRuTranslations = async function({ word, translations }) {
        const connection = await this.pool.getConnection();

        try {
            await connection.beginTransaction();
            let wordId = '';

            // Check if word is already exist in db
            const existId = await this.getWordId({ connection, dbName: 'english_words', word });

            if (existId !== false) {
                // If it is - get it's id
                wordId = existId;
            } else {
                // If not exist - add it and get it's id
                wordId = await this.insertWord({ connection, dbName: 'english_words', word });
            }

            const translationIds = [];

            for (const translation of translations) {
                if (!translation) {
                    continue;
                }

                const existTranslationId = await this.getWordId({ connection, dbName: 'russian_words', word: translation });

                if (existTranslationId !== false) {
                    translationIds.push(existTranslationId);
                } else {
                    translationIds.push(await this.insertWord({ connection, dbName: 'russian_words', word: translation }));
                }
            }

            await connection.query(`
                INSERT IGNORE INTO en_ru_links (en_id, ru_id)
                VALUES ?
            `, [translationIds.map(e => [wordId, e])]);

            await connection.commit();

            await this.getWordsNumber();
        } catch (e) {
            await connection.rollback();
            console.error(e);
            throw new Error(e);
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
            let wordId = '';

            // Check if word is already exist in db
            const existId = await this.getWordId({ connection, dbName: 'russian_words', word });
            if (existId !== false) {
                // If it is - get it's id
                wordId = existId;
            } else {
                // If not exist - add it and get it's id
                wordId = await this.insertWord({ connection, dbName: 'russian_words', word });
            }

            const translationIds = [];

            for (const translation of translations) {
                if (!translation) {
                    continue;
                }

                const existTranslationId = await this.getWordId({ connection, dbName: 'english_words', word: translation });

                if (existTranslationId !== false) {
                    translationIds.push(existTranslationId);
                } else {
                    translationIds.push(await this.insertWord({ connection, dbName: 'english_words', word: translation }));
                }
            }

            await connection.query(`
                INSERT IGNORE INTO en_ru_links (en_id, ru_id)
                VALUES ?
            `, [translationIds.map(e => [e, wordId])]);

            await connection.commit();

            await this.getWordsNumber();
        } catch (e) {
            await connection.rollback();
            console.error(e);
            throw new Error(e);
        } finally {
            connection.release();
        }

        const result = {};
        result[word] = translations;

        return result;
    }
}

module.exports = { DB };