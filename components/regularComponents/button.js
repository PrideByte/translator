const baseBlock = require('../primitiveComponents/base.js');

const requiredData = () => {
  return {
    data: false
  };
};

function render(opts) {
  const {attrs, props, content} = opts;
  return `
    <a class="${attrs?.class || ''}" href="${attrs?.href || '#'}">
      ${content}
    </a>
  `;
}

module.exports = { requiredData, render };