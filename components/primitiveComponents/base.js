const { escapeHtml, getAllAttrsString } = require('../../shared/utils.js');

function render(opts) {
  return `
    <${escapeHtml(opts.tagName)} ${getAllAttrsString(opts.attrs)}>
      ${opts.innerHTML}
    </${escapeHtml(opts.tagName)}>
  `;
}

module.exports = { render };