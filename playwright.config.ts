import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 4310);
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 4 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: isCI
    ? [['blob'], ['github']] // shards only emit blobs; merge.config.ts builds the reports once
    : [['list'], ['html', { open: 'never' }], ['./reporters/flaky-reporter.ts']],

  use: {
    baseURL: `http://localhost:${PORT}`,
    // The app marks every interactive node with a stable `data-qa` attribute (camelCase values).
    testIdAttribute: 'data-qa',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    timezoneId: 'UTC',
    locale: 'en-US',
  },

  // Baselines are rendered on Linux in CI; missing ones are written instead of failing the first run.
  updateSnapshots: 'missing',
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{arg}{ext}',

  webServer: {
    command: 'node demo-app/server.mjs',
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !isCI,
    env: { PORT: String(PORT) },
  },

  projects: [
    { name: 'api', testDir: './tests/api' },
    { name: 'ws', testDir: './tests/ws' },
    {
      name: 'chromium',
      testDir: './tests/ui',
      testIgnore: '**/mobile/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      testDir: './tests/ui/mobile',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'component',
      testDir: './tests/component',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testDir: './tests/visual',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
});
