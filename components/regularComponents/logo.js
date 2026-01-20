const { escapeHtml } = require('../../shared/utils.js');

function render(opts) {
  return `
    <div class="${opts?.attrs?.class || ''}">
      <img src="${escapeHtml(opts?.attrs?.src) || '/static/images/logo.svg'}" alt="${escapeHtml(opts?.attrs?.alt) ?? 'Логотип словарика'}">
    </div>
  `;
}

module.exports = { render };