import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests share one MongoDB — run files sequentially to avoid races.
    fileParallelism: false,
    globalSetup: './vitest.setup.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
    ],
  },
});
