// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const { readdirSync } = require('node:fs');

const FEATURES = readdirSync('src/app/features', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

/** Layer rules (see docs/architecture.md):
 *  shared -> nothing app-specific | core -> shared only | features -> core + shared, never other features
 *  layouts -> core + shared | nobody imports from features except app.routes (lazy) */
const forbid = (patterns, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }],
});

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: ['element', 'attribute'], prefix: 'app', style: 'kebab-case' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
      'no-restricted-globals': ['error', { name: 'localStorage', message: 'Browser storage is allowed only for the appearance preference (core/theme).' }],
    },
  },
  { files: ['**/*.spec.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off', 'no-restricted-globals': 'off' } },
  { files: ['src/app/core/logging/logger.ts'], rules: { 'no-console': 'off' } },
  { files: ['src/app/core/theme/**/*.ts'], rules: { 'no-restricted-globals': 'off' } },
  {
    files: ['src/app/shared/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: forbid(['../**/core/**', '../**/features/**', '../**/layouts/**'], 'shared must not depend on core, features or layouts. Keep shared generic.'),
  },
  {
    files: ['src/app/core/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: forbid(['../**/features/**', '../**/layouts/**'], 'core must not depend on features or layouts.'),
  },
  {
    files: ['src/app/layouts/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: forbid(['../**/features/**'], 'layouts must not depend on features.'),
  },
  ...FEATURES.map((name) => ({
    files: [`src/app/features/${name}/**/*.ts`],
    ignores: ['**/*.spec.ts'],
    rules: forbid(
      FEATURES.filter((n) => n !== name).flatMap((n) => [`../**/features/${n}/**`, `../${n}/**`]).concat(['../**/layouts/**']),
      'A feature must not import another feature or a layout. Move shared code to shared/ or core/.',
    ),
  })),
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
);
