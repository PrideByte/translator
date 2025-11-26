const baseBlock = require('./base.js');

function render(opts) {
  return baseBlock.render({
    tag: 'footer',
    ...opts
  });
}

module.exports = { render };