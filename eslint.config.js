import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import qa from './eslint-rules/index.js';

export default tseslint.config(
  { ignores: ['node_modules', 'playwright-report', 'test-results', 'blob-report'] },
  js.configs.recommended,
  {
    files: ['demo-app/**/*.{js,mjs}', 'eslint-rules/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { 'no-unused-vars': ['error', { args: 'none' }] },
  },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { qa },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-empty-pattern': 'off', // Playwright fixtures use `async ({}, use) => …`
      'qa/no-networkidle': 'error',
      'qa/prefer-get-by-test-id': 'error',
    },
  },
  {
    files: ['tests/**/*.spec.ts'],
    rules: {
      'qa/no-test-skip': 'error',
      'qa/no-plain-expect-in-tests': 'error',
      'qa/no-raw-actions-in-tests': 'error',
    },
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'qa/require-step-decorator': 'error',
      'qa/check-method-naming': 'error',
    },
  },
);
