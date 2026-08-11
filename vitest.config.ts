import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: [
        ...configDefaults.exclude,
        '**/*.performance.test.ts',
      ],
      setupFiles: ['./src/test/setup.ts'],
    },
  }),
)
