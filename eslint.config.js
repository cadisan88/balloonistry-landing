import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default defineConfig(
  globalIgnores(['dist/', '.astro/', '.wrangler/', 'node_modules/', 'worker-configuration.d.ts']),
  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
