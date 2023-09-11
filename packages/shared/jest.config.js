const baseConfig =  require('../../jest.config.base.js');
const packageName = require('./package.json').name;

module.exports = {
  ...baseConfig,
  displayName: packageName,
}
