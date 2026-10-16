import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const files = ["site-config.js", "playwright.config.js"];
for (const directory of ["src", "scripts", "tests"]) {
  for (const file of await readdir(resolve(root, directory))) {
    if (/\.(m?js)$/.test(file)) files.push(`${directory}/${file}`);
  }
}
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", resolve(root, file)], { stdio: "inherit", windowsHide: true });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} JavaScript files.`);
