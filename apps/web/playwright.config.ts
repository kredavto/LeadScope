import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:3011", trace: "on-first-retry" },
  webServer: {
    command: "pnpm exec next start -H 127.0.0.1 -p 3011",
    url: "http://127.0.0.1:3011",
    reuseExistingServer: false,
    env: { E2E: "1" },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
