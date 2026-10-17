// Flat ESLint config: recommended JS and type-aware TypeScript rules, the React hooks rules,
// and eslint-config-prettier last so formatting stays Prettier's job.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // .claude holds local editor state, including git worktrees with a full copy of the repo.
    ignores: [
      'dist',
      'server/dist',
      'coverage',
      'test-results',
      'playwright-report',
      'public/vision',
      '.claude'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    // Node-side code: the optional ranking server, build scripts and tool configs.
    files: ['server/**', 'scripts/**', '*.config.{js,ts}', 'e2e/**'],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked]
  },
  prettier
);
