const baseConfig =  require('../../jest.config.base.js');
const packageName = require('./package.json').name.split('@assignar/').pop()

module.exports = {
  ...baseConfig,
  displayName: packageName,
  "moduleNameMapper": {
    "@nucypher/shared/test(.*)$": "<rootDir>/../shared/test/$1",
  },
}
