const baseBlock = require('./base.js');

function render(opts) {
  return baseBlock.render({
    tag: 'header',
    ...opts
  });
}

module.exports = { render };