const { escapeHtml } = require('../../shared/utils.js');

function render(opts) {
  const {attrs, props, content} = opts;
  return `
    <div class="${attrs?.class || ''}">
      <img src="${escapeHtml(attrs?.src) || '/static/images/logo.svg'}" alt="${escapeHtml(attrs?.alt) ?? 'Логотип словарика'}">
    </div>
  `;
}

module.exports = { render };