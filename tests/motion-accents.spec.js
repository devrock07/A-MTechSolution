import { test, expect } from "@playwright/test";

const asset = /\/media\/studio-sculpture-v1\.mp4/;

test("desktop illustration plays, pauses by keyboard, ends and replays", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./about/");
  const scene = page.locator("[data-motion-accent]");
  const video = scene.locator("video");
  const control = scene.locator("button");
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveClass(/has-motion-media/);
  await expect.poll(() => video.evaluate(v => v.currentTime > 0), { timeout: 10000 }).toBe(true);
  // A slow browser startup can finish the short autoplay before this assertion.
  if (await video.evaluate(v => v.paused)) await control.click();
  await control.focus();
  await page.keyboard.press("Enter");
  await expect(control).toHaveAccessibleName("Play illustration");
  expect(await video.evaluate(v => v.paused)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(control).toHaveAccessibleName("Pause illustration");
  await expect(control).toHaveAccessibleName("Replay illustration", { timeout: 12000 });
  await page.keyboard.press("Enter");
  await expect(control).toHaveAccessibleName("Pause illustration");
  expect(await video.evaluate(v => v.currentTime < 2)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).not.toHaveAttribute("src");
  await expect(control).toBeHidden();
  await expect(scene).not.toHaveClass(/has-motion-media/);
  await expect(scene.locator("i").last()).toHaveCSS("opacity", "1");
});

test("phones and wide touch devices never request the desktop asset", async ({ browser, baseURL }) => {
  for (const width of [390, 1024]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, hasTouch: true });
    const page = await context.newPage();
    const requests = [];
    page.on("request", request => { if (asset.test(request.url())) requests.push(request.url()); });
    for (const path of ["./", "./about/", "./solutions/"]) {
      await page.goto(path);
      if (await page.locator("[data-motion-accent]").count()) await page.locator("[data-motion-accent]").first().scrollIntoViewIfNeeded();
      await page.evaluate(async () => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.allSettled(document.getAnimations().map(animation => animation.finished));
      });
      expect(await page.locator("[data-motion-accent] video[src]").count()).toBe(0);
      expect(await page.locator(".motion-accent-control:visible").count()).toBe(0);
    }
    expect(requests).toEqual([]);
    await context.close();
  }
});

test("desktop reduced motion, data saving and no-JS keep the static fallback", async ({ browser, baseURL }) => {
  for (const mode of ["reduce", "save-data", "no-js"]) {
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, reducedMotion: mode === "reduce" ? "reduce" : "no-preference", javaScriptEnabled: mode !== "no-js" });
    if (mode === "save-data") await context.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true, addEventListener() {} } }));
    const page = await context.newPage();
    const requests = [];
    page.on("request", request => { if (asset.test(request.url())) requests.push(request.url()); });
    await page.goto("./about/");
    await expect(page.locator(".depth-mark i").last()).toBeVisible();
    await expect(page.locator(".motion-accent-control")).toBeHidden();
    await page.waitForLoadState("networkidle");
    expect(requests).toEqual([]);
    await context.close();
  }
});

test("a failed video preserves the existing artwork and navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    window.failedIllustrations = 0;
    document.addEventListener("error", event => {
      if (event.target.matches?.(".motion-accent-video")) window.failedIllustrations += 1;
    }, true);
  });
  // A real missing asset exercises each browser's media loader and error event.
  await page.route("**/about/", async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replaceAll("studio-sculpture-v1.mp4", "missing-sculpture.mp4") });
  });
  await page.goto("./about/");
  await expect.poll(() => page.evaluate(() => window.failedIllustrations)).toBeGreaterThan(0);
  await expect(page.locator(".depth-mark")).not.toHaveClass(/has-motion-media/);
  await expect(page.locator(".depth-mark i").last()).toHaveCSS("opacity", "1");
  await expect(page.locator(".motion-accent-control")).toBeHidden();
  await page.locator("#primary-navigation").getByRole("link", { name: "Services", exact: true }).click();
  await expect(page).toHaveURL(/\/services\/$/);
});

test("hidden concepts pause and narrowing the window releases desktop media", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./");
  const first = page.locator("#studio-presence video");
  await expect.poll(() => first.evaluate(v => v.currentTime > 0), { timeout: 10000 }).toBe(true);
  expect(await page.locator("[data-workflow-panel][hidden] video[src]").count()).toBe(0);
  await page.getByRole("button", { name: "Customer tools", exact: true }).click();
  await expect.poll(() => first.evaluate(v => v.paused)).toBe(true);
  const next = page.locator("#studio-customers video");
  // Clicking controls can scroll the artwork out of view. Playback is visible-only.
  await page.locator("#studio-customers [data-motion-accent]").scrollIntoViewIfNeeded();
  await expect.poll(() => next.evaluate(v => v.currentTime > 0), { timeout: 10000 }).toBe(true);
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect.poll(() => next.evaluate(v => v.paused)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("[data-motion-accent] video[src]")).toHaveCount(0);
  await expect(page.locator(".motion-accent-control:visible")).toHaveCount(0);
});
