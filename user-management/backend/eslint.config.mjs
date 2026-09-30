// ESLint "flat config" (ESLint v9+). Each object in the array is a layer of rules.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Allow intentionally unused args if they start with "_" (e.g. Express `_next`).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Must be last: turns off ESLint rules that would fight with Prettier's formatting.
  prettier,
);
