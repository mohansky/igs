//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      // Its autofix removes assertions that TanStack Table's loose generics
      // (row.getValue() etc.) actually need, breaking the type check.
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  {
    // Shadcn vendor components keep their upstream style.
    files: ['src/components/ui/**'],
    rules: {
      'no-shadow': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      // Generated / vendor / local-only files
      '.content-collections/',
      'public/sw.js',
      'scripts/',
      'notes/',
    ],
  },
]
