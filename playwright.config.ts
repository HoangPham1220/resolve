import { defineConfig, devices } from "@playwright/test";
const production = process.env.PLAYWRIGHT_PRODUCTION === "1";
const baseURL = `http://127.0.0.1:${production ? 4174 : 4173}`;
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: production
      ? "npm run preview -- --port 4174 --strictPort"
      : "npm run dev -- --port 4173 --strictPort",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
