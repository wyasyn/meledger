import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { ignores: ['dist/'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
]);
