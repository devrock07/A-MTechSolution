import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { pointInScene } from "./motion-helpers.js";

async function recordMotion(page) {
  await page.addInitScript(() => {
    window.motionRecords = [];
    window.entranceRecords = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const animation = animate.apply(this, args);
      window.motionRecords.push({ element: this, animation });
      return animation;
    };
    document.addEventListener("animationstart", event => window.entranceRecords.push(event.animationName));
  });
}

test("entrance stays a thin accent and never covers or re-hides the painted page", async ({ page }) => {
  await recordMotion(page);
  await page.goto("./");
  await expect.poll(() => page.evaluate(() => window.entranceRecords)).toContain("brand-intro");
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--entrance-duration", "30s");
    document.documentElement.dataset.entrance = "intro";
  });
  await expect(page.locator(".brand-entrance")).toHaveCSS("pointer-events", "none");
  await expect(page.locator(".brand-entrance")).toHaveCSS("height", "2px");
  expect(await page.locator(".brand-entrance").textContent()).toBe("");
  await expect(page.locator("body")).not.toHaveCSS("overflow-y", "hidden");
  await page.locator("#primary-navigation").getByRole("link", { name: "Solutions", exact: true }).click();
  await expect(page).toHaveURL(/\/solutions\/$/);
  await expect.poll(() => page.evaluate(() => window.entranceRecords)).toContain("brand-arrival");
  expect(await page.evaluate(() => window.motionRecords.some(({ element }) => element.matches(".solutions-intro, .solutions-hero-grid > .reveal")))).toBe(false);
  await expect(page.locator(".brand-entrance")).toBeHidden();
  await page.goBack();
  await expect(page.locator(".brand-entrance")).toBeHidden();
  await expect(page.locator("body")).not.toHaveCSS("overflow-y", "hidden");
});

test("a delayed app never fades out an already visible hero", async ({ page }) => {
  await recordMotion(page);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/src/app.js*", async route => { await gate; await route.continue(); });
  await page.goto("./services/", { waitUntil: "commit" });
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".page-hero-grid > .reveal").first()).toHaveCSS("opacity", "1");
  release();
  await expect(page.locator("html")).toHaveClass(/motion-ready/);
  expect(await page.evaluate(() => window.motionRecords.some(({ element }) => element.closest(".page-hero")))).toBe(false);
  await expect(page.locator(".page-hero-grid > .reveal").first()).toHaveCSS("opacity", "1");
});

test("ambient motion pauses offscreen and when the document is hidden", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./services/");
  const mark = page.locator(".depth-mark");
  await expect(mark).toHaveCSS("animation-play-state", "running");
  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await expect(mark).toHaveCSS("animation-play-state", "paused");
  await mark.scrollIntoViewIfNeeded();
  await expect(mark).toHaveCSS("animation-play-state", "running");
  // Deterministic visibility lifecycle on all three headless browser engines.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(mark).toHaveCSS("animation-play-state", "paused");
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(mark).toHaveCSS("animation-play-state", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(mark).toHaveCSS("animation-name", "none");
  await expect(mark).toHaveCSS("translate", "none");
  await expect(mark).toHaveCSS("rotate", "none");
  await expect(page.getByRole("button", { name: "Reduced motion enabled" })).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(mark).toHaveCSS("animation-play-state", "running");
});

test("motion pause freezes the current pose and persists across navigation", async ({ page }) => {
  await page.goto("./services/");
  const mark = page.locator(".depth-mark");
  await expect(mark).toHaveCSS("animation-play-state", "running");
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  await expect(mark).toHaveCSS("animation-play-state", "paused");
  const time = await mark.evaluate(element => element.getAnimations()[0].currentTime);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await mark.evaluate(element => element.getAnimations()[0].currentTime)).toBe(time);
  await page.goto("./about/");
  await expect(page.getByRole("button", { name: "Resume motion", exact: true })).toBeVisible();
  await expect(mark).toHaveCSS("animation-play-state", "paused");
  await page.getByRole("button", { name: "Resume motion", exact: true }).click();
  await expect(mark).toHaveCSS("animation-play-state", "running");
});

test.describe("autonomous mobile motion", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("3D scenes move without hover and loops stay small and continuous", async ({ page }) => {
    for (const [path, selector] of [["./", "#studio-presence"], ["./services/", ".depth-mark"], ["./solutions/", "#workflow-customer"], ["./work/", ".work-frame"]]) {
      await page.goto(path);
      const scene = page.locator(selector);
      await scene.locator("..").scrollIntoViewIfNeeded();
      await expect(scene).toHaveCSS("animation-play-state", "running");
      const pose = await scene.evaluate(element => getComputedStyle(element).translate);
      await expect.poll(() => scene.evaluate(element => getComputedStyle(element).translate)).not.toBe(pose);
      await expect(scene).not.toHaveClass(/is-tilting/);
      const loop = await scene.evaluate(element => {
        const animation = element.getAnimations().find(item => item.effect.getTiming().iterations === Infinity);
        animation.pause();
        const duration = animation.effect.getTiming().duration;
        const samples = [0, .25, .75, .99999, 1].map(fraction => {
          animation.currentTime = duration * fraction;
          const css = getComputedStyle(element);
          // WebKit serializes zero as either "0px" or "0px 0px".
          return { y: parseFloat(css.translate.split(" ")[1] || "0"), angle: parseFloat(css.rotate.split(" ").at(-1)) || 0, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        return { duration, samples };
      });
      expect(loop.duration).toBeGreaterThanOrEqual(10000);
      expect(loop.samples[1].y).not.toBe(loop.samples[0].y);
      expect(Math.abs(loop.samples[1].y)).toBeLessThanOrEqual(6.01);
      expect(loop.samples[4].y).toBeCloseTo(loop.samples[0].y, 3);
      expect(loop.samples[4].angle).toBeCloseTo(loop.samples[0].angle, 3);
      expect(loop.samples.some(sample => sample.overflow)).toBe(false);
      expect(Math.abs(loop.samples[3].y)).toBeLessThan(.01);
    }
  });
});

test("scroll reveals play once and finish with fully visible content", async ({ page }) => {
  await recordMotion(page);
  await page.goto("./");
  const card = page.locator(".principle").first();
  await card.scrollIntoViewIfNeeded();
  const count = () => page.evaluate(() => window.motionRecords.filter(record => record.element === document.querySelector(".principle")).length);
  await expect.poll(count).toBe(1);
  const frames = await page.evaluate(() => window.motionRecords.find(record => record.element === document.querySelector(".principle")).animation.effect.getKeyframes());
  expect(frames[0].opacity).toBe("0");
  expect(frames[0].transform).toBe("translateY(20px)");
  await expect(card).toHaveCSS("opacity", "1");
  await expect(card).toHaveCSS("transform", "none");
  await page.locator("h1").scrollIntoViewIfNeeded();
  await card.scrollIntoViewIfNeeded();
  expect(await count()).toBe(1);
});

test("changing reduced-motion preference stops active reveals and tilt", async ({ page }) => {
  await recordMotion(page);
  await page.goto("./solutions/");
  const card = page.locator(".solution-card-grid > .reveal").first();
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.motionRecords.some(record => record.element === document.querySelector(".solution-card-grid > .reveal")))).toBe(true);
  await page.evaluate(() => window.motionRecords.forEach(({ animation }) => { if (animation.playState === "running") animation.pause(); }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).toHaveCSS("opacity", "1");
  await expect(card).toHaveCSS("transform", "none");
  await expect(page.locator(".brand-entrance")).toBeHidden();
  await expect(page.locator(".solution-card").first()).toHaveCSS("transform", "none");
});

test("workflow controls, expandable cards, and service links work at both sizes", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./solutions/");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [label, title] of [["Daily operations", "Keep the work connected."], ["A first release", "Start small. Learn quickly."], ["Customer flow", "From hello to handoff."]]) {
      const button = page.getByRole("button", { name: label, exact: true });
      await button.focus();
      await page.keyboard.press("Enter");
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("[data-workflow-panel]:visible")).toHaveCount(1);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.getByRole("status")).toContainText(title);
    }
    for (const details of await page.locator(".solution-approach").all()) {
      if (!await details.getAttribute("open") && !await details.evaluate(element => element.open)) {
        await details.locator("summary").focus();
        await page.keyboard.press("Enter");
      }
      await expect(details.locator(".solution-service-link").first()).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (testInfo.project.name === "chromium") expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.locator(".solution-service-link").first().click();
  await expect(page).toHaveURL(/\/services\/website-development\/$/);
});

test("3D pointer tilt resets on leave and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./solutions/");
  const board = page.locator("#workflow-customer");
  await expect(board).toBeVisible();
  const point = await pointInScene(board);
  await page.mouse.move(point.x, point.y);
  await expect(board).toHaveClass(/is-tilting/);
  const tilt = await board.evaluate(element => ({ x: element.style.getPropertyValue("--tilt-x"), y: element.style.getPropertyValue("--tilt-y") }));
  expect(tilt.x).not.toBe("0.00deg");
  expect(tilt.y).not.toBe("0.00deg");
  await page.mouse.move(0, 0);
  await expect(board).not.toHaveClass(/is-tilting/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await board.hover({ position: { x: 60, y: 100 } });
  await expect(board).not.toHaveClass(/is-tilting/);
  await expect(board).toHaveCSS("transform", "none");
});

test.describe("touch interaction", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("workflow selection works by touch without pointer tilt", async ({ page }) => {
    await page.goto("./solutions/");
    await page.getByRole("button", { name: "Daily operations", exact: true }).tap();
    await expect(page.locator("#workflow-operations")).toBeVisible();
    const point = await pointInScene(page.locator("#workflow-operations"));
    await page.touchscreen.tap(point.x, point.y);
    await expect(page.locator("#workflow-operations")).not.toHaveClass(/is-tilting/);
    expect(await page.locator("#workflow-operations").evaluate(element => element.style.getPropertyValue("--tilt-x"))).toBe("");
    await page.locator(".solution-approach summary").first().tap();
    await expect(page.locator(".solution-service-link").first()).toBeVisible();
  });
});

test("missing motion APIs leave content visible and preview usable", async ({ page }) => {
  await page.addInitScript(() => { delete window.IntersectionObserver; Element.prototype.animate = undefined; });
  await page.goto("./solutions/");
  await page.getByRole("button", { name: "Daily operations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Keep the work connected." })).toBeVisible();
  expect(await page.locator(".reveal").evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === "1"))).toBe(true);
});

test("failed app script cannot strand the entrance or hide content", async ({ page }) => {
  await page.route("**/src/app.js*", route => route.abort());
  await page.goto("./solutions/");
  await expect(page.locator(".brand-entrance")).toBeHidden();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("#primary-navigation")).toBeVisible();
  await expect(page.locator("[data-workflow-panel]:visible")).toHaveCount(3);
  expect(await page.locator(".reveal").evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === "1"))).toBe(true);
});
