module.exports = {
  extends: ['expo'],
  rules: {
    'no-unused-vars': 'warn',
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['node_modules/', 'android/', 'ios/', '.expo/'],
};
