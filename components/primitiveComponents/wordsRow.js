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
      <td class="${opts.class}__cell">
      <button class="btn btn-secondary" type="submit" name="PUT" value="${opts.data.key}">Изменить</button>
      <button class="btn btn-secondary" type="submit" name="DELETE" value="${opts.data.key}">Удалить</button>
      </td>
    </tr>
  `;
}

module.exports = { render };