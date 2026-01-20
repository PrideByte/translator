const { escapeHtml } = require('../../shared/utils.js');

function render(opts) {
  if (!opts) { return ''; }

  const lines = opts.data.value.map(v => {
    return `
      <li>
        ${escapeHtml(v)}
      </li>
    `;
  }).join('\n');

  return `
    <tr class="${opts.class}__row">
      <td class="${opts.class}__cell">
      ${escapeHtml(opts.data.key)}
      </td>
      <td class="${opts.class}__cell">
        <ul>
        ${lines}
        </ul>
      </td>
    </tr>
  `;
}

module.exports = { render };