const mysql = require('mysql2/promise');

class DB {
    constructor(opts) {
        this.pool = mysql.createPool(opts);
    }

    init = async function() {
        // Get english words number and russian words number
        [ { count: this.enWordsNumber }, { count: this.ruWordsNumber } ] = (
            await this.pool.query(`
                SELECT COUNT(id) AS count
                FROM english_words
                UNION
                SELECT COUNT(id) AS count
                FROM russian_words;`)
        )[0];

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

    async getPageByPath(path) {
        const res = (await this.pool.query(`
            SELECT *
            FROM pages
            WHERE path = ?;`, path)
        )[0];

        return res[0];
    }

    getTranslationsByWord = async function({word = null, limit = 10, page = 1}) {
        const limitList = [10, 30, 50];
        limit = (limitList.includes(limit)) ? Number(limit) : 10;
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
}

module.exports = { DB };