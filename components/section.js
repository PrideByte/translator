const baseBlock = require('./base.js');

function render(opts) {
  return baseBlock.render({
    tag: 'section',
    ...opts
  });
}

module.exports = { render };