import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { ignores: ['dist/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
]);
