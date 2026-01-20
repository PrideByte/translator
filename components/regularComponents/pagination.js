const manyPagesRegistry = require('../manyPagesComponents/checkersRegistry.js');

const requiredData = async ({ db, url, attrs }) => {
	if (!attrs.handledComponent) {
		throw new Error(`Handled component is not specified in "${attrs.key}" Pagination component`);
	}

	const checkURLParams = manyPagesRegistry[attrs.handledComponent];

	if (!checkURLParams) {
		throw new Error(`Unknown Handled component "${attrs.handledComponent}" specified in "${attrs.key}" Pagination component`);
	}

	const checkResult = await checkURLParams({db, url, attrs });

	return checkResult;
}

function render(opts) {
	let buttons = '';
	const left = Math.max(+opts.data.urlParams.page - 2, 1);
	const right = Math.min(+opts.data.urlParams.page + 2, opts.data.maxPages);
	let currentLink = opts.data.url;
	if (!currentLink.includes('page=')) {
		if (currentLink.includes('?')) {
			if (currentLink.endsWith('?') || currentLink.endsWith('&')) {
				currentLink += `page=${opts.data.urlParams.page}`;
			} else {
				currentLink += `&page=${opts.data.urlParams.page}`;
			}
		} else {
			currentLink += `?page=${opts.data.urlParams.page}`;
		}
	}

	for (let i = left; i <= right; i++) {
		if (i === +opts.data.urlParams.page) {
			buttons += `<div class="btn btn-secondary" aria-current="page">${i}</div>`;
			continue;
		}

		buttons += `
			<a href="${currentLink.replace(/(page=\d+)/ui, 'page=' + (i))}"
				class="btn">
				${i}
			</a>\n
		`;
	}

	const beforeButtonTag = +opts.data.urlParams.page === 1 ? 'div' : 'a';
	const afterButtonTag = +opts.data.urlParams.page === opts.data.maxPages ? 'div' : 'a';
	const prevLink = currentLink.replace(/(page=\d+)/ui, 'page=' + Math.max(+opts.data.urlParams.page - 1, 1));
	const nextLink = currentLink.replace(/(page=\d+)/ui, 'page=' + Math.min(+opts.data.urlParams.page + 1, opts.data.maxPages));
	const CSSClass = opts?.attrs?.class || 'pagination';
	return `
		<nav key="${opts.attrs.key}" class="${CSSClass}" aria-label="Постраничная навигация">
			<${beforeButtonTag}
				${+opts.data.urlParams.page === 1 ? '' : `href="${prevLink}"`}
				class="btn${+opts.data.urlParams.page === 1 ? ' btn-disabled' : ''}"
				aria-label="Предыдущая страница">
				←
			</${beforeButtonTag}>

			${buttons}

			<${afterButtonTag}
				${+opts.data.urlParams.page === opts.data.maxPages ? '' : `href="${nextLink}"`}
				class="btn${+opts.data.urlParams.page === opts.data.maxPages ? ' btn-disabled' : ''}"
				aria-label="Следующая страница">
				→
			</${afterButtonTag}>
		</nav>
	`;
}

module.exports = { render, requiredData }