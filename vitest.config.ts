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
      'src/dropbox/__tests__/**/*.test.ts',
      'src/onedrive/__tests__/**/*.test.ts',
      'src/box/__tests__/**/*.test.ts',
      'clouddrive-cli/__tests__/**/*.test.ts',
    ],
  },
})
