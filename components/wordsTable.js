const { escapeHtml } = require('./../utils.js');
const wordsRow = require('./wordsRow.js');

const needData = ['getTranslationsByWord'];

function render(opts) {
  const [data] = opts.data;
  let rows = Object.entries(data).map(([key, value]) => {
    return wordsRow.render({key, value});
  }).join('\n');

  if (!rows.trim()) {
    rows = `
      <tr class="wordsTable__row">
        <td class="wordsTable__cell wordsTable__cell-colspan" colspan=2>
          Слов не найдено!
        </td>
        </td>
      </tr>
    `;
  }

  return `
    <table class="wordsTable ${escapeHtml(opts.classList.join(' ')) || ''}">
      <thead class="wordsTable__header">
        <tr class="wordsTable__row">
          <th class="wordsTable__cell">
            English
          </th>
          <th class="wordsTable__cell">
            Русский
          </th>
        </tr>
      </thead>
      <tbody class="wordsTable__body">
        ${rows}
      </tbody>
    </table>
  `;
}

module.exports = { render, needData }