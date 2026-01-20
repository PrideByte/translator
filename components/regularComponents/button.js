const baseBlock = require('../primitiveComponents/base.js');

const requiredData = () => {
  return {
    data: false
  };
};

function render(opts) {
  return `
    <a class="${opts?.attrs?.class || ''}" href="${opts?.attrs?.href || '#'}">
      ${opts?.innerHTML}
    </a>
  `;
}

module.exports = { requiredData, render };