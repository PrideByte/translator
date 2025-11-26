function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&(?![a-zA-Z0-9]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serializeForScript(obj) {
  let json = JSON.stringify(obj);
  json = json.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return json;
}

module.exports = { escapeHtml, serializeForScript };