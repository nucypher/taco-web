/** @type {import('eslint').Linter.Config} */
module.exports = {
  'root': true,
  'parser': '@typescript-eslint/parser',
  'env': {
    'es6': true,
  },
  'ignorePatterns': [
    'node_modules',
    'build',
    'coverage',
    'src/contracts/ethers-typechain',
  ],
  'plugins': [
    'import',
    'eslint-comments',
  ],
  'extends': [
    'eslint:recommended',
    'plugin:eslint-comments/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  'globals': {
    'BigInt': true,
    'console': true,
    'WebAssembly': true,
  },
  'rules': {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'eslint-comments/disable-enable-pair': [
      'error',
      {
        'allowWholeFile': true,
      },
    ],
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
        },
      },
    ],
    'sort-imports': [
      'error',
      {
        'ignoreDeclarationSort': true,
        'ignoreCase': true,
      },
    ],
  },
};
