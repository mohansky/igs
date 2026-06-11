import path from 'node:path'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import contentCollections from '@content-collections/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig(({ command }) => ({
  // Worker-only source maps so Cloudflare observability shows readable
  // stack traces (uploaded via wrangler's upload_source_maps, never served)
  environments: {
    ssr: {
      build: { sourcemap: true },
    },
  },
  plugins: [
    devtools(),
    // Only use Cloudflare plugin for production builds — dev uses Node.js runtime
    // so that @libsql/client can access local SQLite files via file: URLs
    ...(command === 'build'
      ? [cloudflare({ viteEnvironment: { name: 'ssr' } })]
      : []),
    contentCollections(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  resolve:
    command === 'build'
      ? {
          alias: [
            {
              find: /^@libsql\/client$/,
              replacement: path.resolve(
                'node_modules/@libsql/client/lib-esm/web.js',
              ),
            },
            {
              find: 'cross-fetch',
              replacement: path.resolve('src/lib/cross-fetch-polyfill.ts'),
            },
          ],
        }
      : {},
}))

export default config
