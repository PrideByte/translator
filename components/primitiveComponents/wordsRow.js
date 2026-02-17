const { escapeHtml } = require('../../shared/utils.js');

function render(opts) {
  if (!opts) { return ''; }

  const lines = opts.data.translations.map(v => {
    return `
      <li>
        ${escapeHtml(v)}
      </li>
    `;
  }).join('\n');

  return `
    <tr data-id="${opts.data.id}" class="${opts.class}__row">
      <th scope="row" class="${opts.class}__cell">
      ${escapeHtml(opts.data.word)}
      </th>
      <td class="${opts.class}__cell">
        <ul>
        ${lines}
        </ul>
        <div class="${opts.class}__actions">
          <a href="/translation?wordID=${opts.data.id}" class="btn" title="Изменить" aria-label="Изменить слово ${escapeHtml(opts.data.word)}">✏️</a>
          <details name="delete__word" class="${opts.class}__rmsection">
            <summary class="btn ${opts.class}__rmsection-summary" title="Удалить" aria-label="Удалить слово ${escapeHtml(opts.data.word)}">❌</summary>
            <div class="${opts.class}__rmsection-confirm">
              <button class="btn" type="submit" name="wordID" value="${opts.data.id}" title="Подтвердить удаление" aria-label="Подтвердить удаление слова ${escapeHtml(opts.data.word)}">✔️</button>
            </div>
          </details>
        </div>
      </td>
    </tr>
  `;
}

module.exports = { render };