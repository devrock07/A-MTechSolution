import { test, expect } from "@playwright/test";

const asset = /\/media\/studio-sculpture-v1\.mp4/;

test("desktop illustration loops without controls and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./about/");
  const scene = page.locator("[data-motion-accent]");
  const video = scene.locator("video");
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveClass(/has-motion-media/);
  await expect.poll(() => video.evaluate(v => v.currentTime > 0), { timeout: 10000 }).toBe(true);
  await expect(scene.locator("button")).toHaveCount(0);
  expect(await video.evaluate(v => v.controls)).toBe(false);
  // Observe two complete natural cycles. Persist the boundary events so a busy
  // browser cannot make the assertion miss a short currentTime < 1 window.
  await video.evaluate(v => {
    v.observedLoops = 0;
    let previousTime = v.currentTime;
    const observe = () => {
      if (previousTime - v.currentTime > 1) v.observedLoops++;
      previousTime = v.currentTime;
    };
    v.addEventListener("timeupdate", observe);
    v.addEventListener("seeked", observe);
  });
  await expect.poll(() => video.evaluate(v => v.observedLoops), { timeout: 25000 }).toBeGreaterThanOrEqual(2);
  await expect.poll(() => video.evaluate(v => v.currentTime > 1 && !v.paused && !v.ended)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).not.toHaveAttribute("src");
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
      expect(await page.locator("[data-motion-accent] button, [data-motion-accent] video[controls]").count()).toBe(0);
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
    await expect(page.locator("[data-motion-accent] button")).toHaveCount(0);
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
  await expect(page.locator("[data-motion-accent] button")).toHaveCount(0);
  await page.locator("#primary-navigation").getByRole("link", { name: "Services", exact: true }).click();
  await expect(page).toHaveURL(/\/services\/$/);
});

test("hidden concepts pause and narrowing the window releases desktop media", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./");
  const first = page.locator("#studio-presence video");
  await page.locator("#studio-presence [data-motion-accent]").scrollIntoViewIfNeeded();
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
  const pausedAt = await next.evaluate(v => v.currentTime);
  await page.locator("#studio-customers [data-motion-accent]").scrollIntoViewIfNeeded();
  await expect.poll(() => next.evaluate((v, time) => !v.paused && v.currentTime !== time, pausedAt)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("[data-motion-accent] video[src]")).toHaveCount(0);
  await expect(page.locator("[data-motion-accent] button")).toHaveCount(0);
});

test("blocked autoplay retains the static artwork without playback controls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("Autoplay blocked", "NotAllowedError"));
  });
  await page.goto("./about/");
  const scene = page.locator("[data-motion-accent]");
  await scene.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  await expect(scene).not.toHaveClass(/has-motion-media/);
  await expect(scene.locator("i").last()).toHaveCSS("opacity", "1");
  await expect(scene.locator("video")).not.toHaveAttribute("src");
  await expect(scene.locator("button")).toHaveCount(0);
});
