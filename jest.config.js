// This file is re-exporting Jest configuration internally created by tsdx
// It can be used to run tests and debug from IDEs that are not able to run without jest.config.js

const { createJestConfig } = require('tsdx/dist/createJestConfig');
const { paths } = require('tsdx/dist/constants');

process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';

module.exports = createJestConfig(undefined, paths.appRoot);
