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
      <td class="${opts.class}__cell">
      ${escapeHtml(opts.data.word)}
      </td>
      <td class="${opts.class}__cell">
        <ul>
        ${lines}
        </ul>
        <div class="${opts.class}__actions">
          <a href="/translation?wordID=${opts.data.id}" class="btn" alt="Изменить" title="Изменить">✏️</a>
          <button class="btn" type="submit" name="wordID" value="${opts.data.id}" title="Удалить" alt="Удалить">❌</button>
        </div>
      </td>
    </tr>
  `;
}

module.exports = { render };