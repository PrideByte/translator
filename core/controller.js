const { escapeHtml, serializeForScript } = require('../shared/utils.js');
const { buildTree } = require('./buildTree.js');
const { collectData, renderTree } = require('./handleTree.js');

function generateLayout(meta, body, initialState = {}) {
	const serializedState = serializeForScript(initialState);
	const initialData = Object.entries(initialState).length
		? `<script type="application/json" id="__INITIAL_DATA__">${serializedState}</script>`
		: '';

	return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${escapeHtml(meta?.title) || 'Словарик'}</title>
      <meta name="description" content="${escapeHtml(meta?.description)}">
      <link rel="icon" type="image/x-icon" href="/static/images/favicon.ico">

      <link rel="stylesheet" href="/static/assets/fonts.css"/>
      <link rel="stylesheet" href="/static/assets/style.css">
      ${initialData}
      <script defer src="/static/assets/client.js"></script>
    </head>
    <body>
    	${body}
    </body>
    </html>
  `;
}

async function handlePage({ pageTemplate, pageMeta = {}, db, url, statusCode = 200 }) {
	const result = {
		html: '',
		statusCode,
		normalizedURL: null
	};

	const tree = buildTree({
		template: pageTemplate,
		strictMode: true
	});

	const initialData = await collectData({ tree, db, url });
	
	if (initialData.constraints && Object.entries(initialData.constraints).length) {
		const paramsList = [];
		for (const [componentKey, componentConstraints] of Object.entries(initialData.constraints)) {
			
			if (componentConstraints.statusCode > result.statusCode) {
				result.statusCode = componentConstraints.statusCode;
				result.type = componentConstraints.type;
			}
			paramsList.push(...Object.entries(componentConstraints.constraints));
		}

		const newParams = new URLSearchParams(new Map([
			...Object.entries(url.params),
			...paramsList
		])).toString();


		result.normalizedURL = newParams;
	} else {
		const body = renderTree(tree, initialData.data);
		result.html = generateLayout(pageMeta, body, initialData.data);
		result.type = 'html';
	}

	return result;
} // Return {statusCode, html, url, type}

module.exports = handlePage;