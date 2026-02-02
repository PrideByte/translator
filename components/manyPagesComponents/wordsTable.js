const wordsRow = require('../primitiveComponents/wordsRow.js');
const settings = require('../../shared/const.js');

async function checkURLParams({ db, url }) {
	let limit = +url.params.limit || +settings.limitDefault;
	let page = +url.params.page || +settings.pageDefault;
	const word = url.params.word ?? '';
	const normalizedParams = new URLSearchParams();

	if (+url.params.limit && !settings.limitList.includes(limit)) {
		normalizedParams.set('limit', settings.limitDefault);
		limit = settings.limitDefault;
	}

	const maxPages = !word
		? Math.ceil(db.enWordsNumber / limit)
		: Math.max(Math.ceil(((await db.getWordsCountByWord(word)).count) / limit), 1);

	if (url.params.page && (Number.isNaN(+url.params.page) || !(page > 0 && page <= +maxPages))) {
		normalizedParams.set('page', settings.pageDefault);
		page = settings.pageDefault;
	}

	const normalizedURL = new URLSearchParams(new Map([
		...Object.entries(url.params),
		...Array.from(normalizedParams.entries())
	])).toString();

	return Array.from(normalizedParams.entries()).length
		? {
			constraints: {
				constraints: Object.fromEntries(normalizedParams),
				statusCode: 301,
				type: 'redirect'
			}
		}
		: {
			data: {
				urlParams: {
					page,
					limit,
					word
				},
				maxPages: maxPages,
				url: `${url.pathname}?${normalizedURL}`
			}
		};
}

async function requiredData({ db, url }) {
	const checkResult = await checkURLParams({ db, url });

	return (!checkResult.constraints)
		? {
			data: await db.getTranslationsByWord(url.params)
		}
		: checkResult;
}

function render(opts) {
	const data = opts?.data ?? {};
	const CSSclass = opts?.attrs?.class || 'translations';
	let rows = Object.entries(data).map(([key, value]) => {
		return wordsRow.render({
			data: {
				word: key,
				translations: value.translations,
				id: value.id
			},
			class: CSSclass
		});
	}).join('\n');

	if (!rows.trim()) {
		rows = `
			<tr class="${CSSclass}__row">
				<td class="${CSSclass}__cell ${CSSclass}__cell-colspan">
					Слов не найдено!
				</td>
			</tr>
		`;
	}

	return `
		<form method="POST" action="/translation" class="${CSSclass}__wrapper">
			<table class="${CSSclass}">
				<thead class="${CSSclass}__header">
					<tr class="${CSSclass}__row">
					<th class="${CSSclass}__cell" scope="col">
						English
					</th>
					<th class="${CSSclass}__cell" scope="col" collspan="2">
						Русский
					</th>
					</tr>
				</thead>
				<tbody class="${CSSclass}__body">
					${rows}
				</tbody>
			</table>
			<input type='hidden' name='method' value='DELETE'>
		</form>
	`;
}

module.exports = { render, requiredData, checkURLParams };