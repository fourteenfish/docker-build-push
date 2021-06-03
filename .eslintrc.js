module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
  },
  extends: [
    'standard',
    'plugin:node/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['prettier'],
  globals: {
    fetch: true,
  },
  rules: {
    'generator-star-spacing': 'off',
    'space-before-function-paren': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'prettier/prettier': 'error',
    'node/no-unpublished-require': 0,
  },
};
