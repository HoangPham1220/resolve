import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
await fs.mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 1100 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173");
  await page
    .getByRole("button", { name: "Ghi nhận vấn đề đầu tiên" })
    .waitFor();
  await page.screenshot({
    path: `docs/screenshots/${name}.png`,
    fullPage: true,
  });
  await context.close();
}
await browser.close();
