import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // Op welke base URL moet de test draaien? (dit moet overeenkomen met je lokale vite server, vaak 5173)
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Om tijd te besparen tijdens development testen we alleen in Chrome
    // In CI kun je Firefox en Safari aanzetten.
  ],
  // Zorgt ervoor dat Playwright zelf de development server opstart voordat hij begint met testen
  webServer: {
    command: process.env.CI ? 'npm run dev' : '.\\node_bin\\node.exe .\\node_modules\\vite\\bin\\vite.js',
    url: 'http://localhost:5173/',
    reuseExistingServer: !process.env.CI,
  },
});
