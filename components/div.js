const baseBlock = require('./base.js');

function render(opts) {
  return baseBlock.render({
    tag: 'div',
    ...opts
  });
}

module.exports = { render };