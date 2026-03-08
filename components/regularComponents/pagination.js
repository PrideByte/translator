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
	const {attrs, props, content} = opts;
	const {data} = props;
	let buttons = '';
	const left = Math.max(+data.urlParams.page - 2, 1);
	const right = Math.min(+data.urlParams.page + 2, data.maxPages);
	let currentLink = data.url;
	if (!currentLink.includes('page=')) {
		if (currentLink.includes('?')) {
			if (currentLink.endsWith('?') || currentLink.endsWith('&')) {
				currentLink += `page=${data.urlParams.page}`;
			} else {
				currentLink += `&page=${data.urlParams.page}`;
			}
		} else {
			currentLink += `?page=${data.urlParams.page}`;
		}
	}

	for (let i = left; i <= right; i++) {
		if (i === +data.urlParams.page) {
			buttons += `<button disabled type="button" class="btn btn-secondary" aria-current="page">${i}</button>`;
			continue;
		}

		buttons += `
			<a href="${currentLink.replace(/(page=\d+)/ui, 'page=' + (i))}"
				aria-label="Страница ${i}"
				class="btn">
				${i}
			</a>\n
		`;
	}

	const beforeButtonTag = +data.urlParams.page === 1 ? 'button' : 'a';
	const afterButtonTag = +data.urlParams.page === data.maxPages ? 'button' : 'a';
	const prevLink = currentLink.replace(/(page=\d+)/ui, 'page=' + Math.max(+data.urlParams.page - 1, 1));
	const nextLink = currentLink.replace(/(page=\d+)/ui, 'page=' + Math.min(+data.urlParams.page + 1, data.maxPages));
	const CSSClass = opts?.attrs?.class || 'pagination';
	return `
		<nav key="${opts.attrs.key}" class="${CSSClass}" aria-label="Постраничная навигация">
			<${beforeButtonTag}
				${beforeButtonTag === 'button' ? 'disabled' : ''}
				${beforeButtonTag === 'button' ? 'type="button"' : ''}
				${+data.urlParams.page === 1 ? '' : `href="${prevLink}"`}
				class="btn${+data.urlParams.page === 1 ? ' btn-disabled' : ''}"
				aria-label="Предыдущая страница">
				←
			</${beforeButtonTag}>

			${buttons}

			<${afterButtonTag}
				${afterButtonTag === 'button' ? 'disabled' : ''}
				${afterButtonTag === 'button' ? 'type="button"' : ''}
				${+data.urlParams.page === data.maxPages ? '' : `href="${nextLink}"`}
				class="btn${+data.urlParams.page === data.maxPages ? ' btn-disabled' : ''}"
				aria-label="Следующая страница">
				→
			</${afterButtonTag}>
		</nav>
	`;
}

module.exports = { render, requiredData }