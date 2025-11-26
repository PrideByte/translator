const { escapeHtml } = require('./../utils.js');

function render(opts) {
  return `
    <${escapeHtml(opts.tag)} ${opts.id ? `id="${escapeHtml(opts.id)}"` : ''} class="${escapeHtml(opts.classList.join(' ')) || ''}">
      ${opts.body}
    </${escapeHtml(opts.tag)}>
  `;
}

module.exports = { render };