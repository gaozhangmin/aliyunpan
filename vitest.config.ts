// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'electron/main/download/__tests__/**/*.test.ts',
      'src/media-server/__tests__/**/*.test.ts',
      'src/utils/__tests__/**/*.test.ts',
      'src/aliapi/__tests__/**/*.test.ts',
      'src/pikpak/__tests__/**/*.test.ts',
    ],
  },
})
