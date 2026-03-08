const { escapeHtml, getAllAttrsString } = require('../../shared/utils.js');

function render(opts) {
  const {attrs, props, content} = opts;
  return `
    <${escapeHtml(opts.tagName)} ${getAllAttrsString(attrs)}>
      ${content}
    </${escapeHtml(opts.tagName)}>
  `;
}

module.exports = { render };