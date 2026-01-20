const baseBlock = require('../primitiveComponents/base.js');

function render(opts) {
  return baseBlock.render({
    tagName: 'nav',
    ...opts
  });
}

module.exports = { render };