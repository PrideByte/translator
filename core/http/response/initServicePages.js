const handlePage = require('../../runtime/controller.js');
const pages = require('../../../pages/index.js');
const { defaultOrigin } = require('../../../shared/const.js');

async function initServicePages(db) {
    const results = {};
    const config = [
        { code: 404, path: '/404' },
        { code: 500, path: '/500' },
    ];

    for (const item of config) {
        try {
            const page = await getPage(db, item.path, item.code);
            results[item.code] = {
                success: true,
                page
            };
        } catch (err) {
            results[item.code] = {
                success: false,
                error: err,
                page: {
                    html: `<h1>Error ${item.code}</h1>`,
                    statusCode: item.code,
                    type: 'html'
                }
            };
        }
    }

    return results;
}

async function getPage(db, path, statusCode) {
    try {
        const metaData = await db.getPageMetaByPath(path);

        const page = await handlePage({
            pageTemplate: pages[path],
            pageMeta: JSON.parse(metaData?.meta || "{}"),
            db, url: defaultOrigin, statusCode
        });

        return page;
    } catch (err) {
        throw new Error(`Error on generating service page ${statusCode}`, { cause: err });
    }
}

module.exports = initServicePages;