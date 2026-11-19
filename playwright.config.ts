import { defineConfig } from "@playwright/test";

// The browser tests (test/ui) run against the site, served by `npm start` on a port of its own: `npm run test:ui`. The first run needs a
// Chromium: `npx playwright install chromium`. The site loads its libraries from a CDN, so the tests need the network.
const port = process.env.UI_PORT ?? "8089";

export default defineConfig({
  testDir: "test/ui",
  testMatch: "**/*.spec.ts",
  use: { baseURL: `http://localhost:${port}/`, browserName: "chromium" },
  webServer: {
    command: "npm start",
    url: `http://localhost:${port}/`,
    env: { PORT: port },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
