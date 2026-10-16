import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const svg = await readFile(resolve(root, "public/brand-card.svg"), "utf8");
  await page.setContent(`<style>html,body{margin:0;width:1200px;height:630px}svg{display:block;width:1200px;height:630px}</style>${svg}`);
  await page.screenshot({ path: resolve(root, "public/brand-card.png") });
  console.log("Rendered public/brand-card.png (1200 × 630).");
} finally { await browser.close(); }
