const { escapeHtml } = require('./../utils.js');

function render(opts) {
  if (!opts) { return ''; }

  const lines = opts.value.map(v => {
    return `
      <li class="wordsTable__list-item">
        ${escapeHtml(v)}
      </li>
    `;
  }).join('\n');

  return `
    <tr class="wordsTable__row">
      <td class="wordsTable__cell">
        ${escapeHtml(opts.key)}
      </td>
      <td class="wordsTable__cell">
        <ul class="wordsTable__list">
          ${lines}
        </ul>
      </td>
    </tr>
  `;
}

module.exports = { render };