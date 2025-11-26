const { escapeHtml } = require('./../utils.js');

function render(opts) {
  return `
    <div class="logo__wrapper">
      <img src="${escapeHtml(opts?.src) || '/static/images/logo.svg'}" alt="${escapeHtml(opts?.alt) ?? 'Логотип словарика'}">
    </div>
  `;
}

module.exports = { render };