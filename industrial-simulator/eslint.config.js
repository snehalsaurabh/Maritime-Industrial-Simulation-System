import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error'
    }
  },
  {
    files: ['*.cjs'],
    languageOptions: {
      globals: {
        module: 'readonly'
      }
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**']
  }
);
