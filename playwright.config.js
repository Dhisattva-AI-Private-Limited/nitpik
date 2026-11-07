import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:3456' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Serve the project root so examples can load ../dist/nitpik.js
    command: 'npm run build && npx serve . -p 3456 --no-clipboard',
    url: 'http://localhost:3456/examples/basic.html',
    reuseExistingServer: !process.env.CI,
  },
})
