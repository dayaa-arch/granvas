import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      fileParallelism: false,
      include: [
        'tests/performance/**/*.test.ts',
        'src/modules/graph/infrastructure/dagre/release.performance.test.ts',
      ],
      maxWorkers: 1,
    },
  }),
)
