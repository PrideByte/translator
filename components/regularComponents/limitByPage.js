const manyPagesRegistry = require('../manyPagesComponents/checkersRegistry.js');
const settings = require('../../shared/const.js');

const requiredData = async ({ db, url, attrs }) => {
	if (!attrs.handledComponent) {
		throw new Error(`Handled component is not specified in "${attrs.key}" Limit By Page component`);
	}

	const checkURLParams = manyPagesRegistry[attrs.handledComponent];

	if (!checkURLParams) {
		throw new Error(`Unknown Handled component "${attrs.handledComponent}" specified in "${attrs.key}" Limit By Page component`);
	}

	const checkResult = await checkURLParams({ db, url, attrs });

	return checkResult;
}

function getOptions(opts) {
	return settings.limitList.reduce((acc, el) => acc += `<option value="${el}"${el === opts.data.urlParams.limit ? " selected" : ""}>${el}</option>\n`, '');
}

function generateURLSearchParamsInputFields(opts) {
	return Object.entries(opts.data?.urlParams)?.reduce((acc, [key, value]) => {
		if (key !== 'limit') {
			acc += value ? `<input type="hidden" name="${key}" value="${value}">\n` : '';
		}
		return acc;
	}, '') || '';
}

function render(opts) {
	const options = getOptions(opts);
	const URLFields = generateURLSearchParamsInputFields(opts);

	return `
		<form class="${opts?.attrs?.class || 'limitfilter'}" action="${opts?.data?.url || '#'}">
			${URLFields}
			<label>
				<span>${opts.innerHTML.match(/([^\|]+)\s*?\|/ui)[1]}</span>
				<select name="limit">
					${options}
				</select>
			</label>
			<button class="btn" type="submit">${opts.innerHTML.match(/\|\s*?([^\|]+)/ui)[1]}</button>
		</form>
	`;
}

module.exports = { render, requiredData }