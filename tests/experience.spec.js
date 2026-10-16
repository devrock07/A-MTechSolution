import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage concepts switch by keyboard and retain an accessible selected state", async ({ page }, testInfo) => {
  await page.goto("./");
  const controls = page.getByRole("group", { name: "Explore what we build" });
  for (const [name, panel] of [["Customer tools", "customers"], ["Automation", "automation"], ["Websites", "presence"]]) {
    const button = controls.getByRole("button", { name, exact: true });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-workflow-panel]:visible")).toHaveCount(1);
    await expect(page.locator(`#studio-${panel}`)).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Preview shown");
  }
  await expect(page.locator(".studio-display:visible")).toHaveCSS("font-size", /(?:3[2-9]|4[0-8])(?:\.\d+)?px/);
  if (testInfo.project.name === "chromium") expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("service filters show the matching links and restore the full directory", async ({ page }, testInfo) => {
  await page.goto("./services/");
  for (const [name, count] of [["Digital presence", 2], ["Connected operations", 4], ["Product & support", 2], ["All services", 8]]) {
    const filter = page.getByRole("button", { name, exact: true });
    await filter.focus();
    await page.keyboard.press("Space");
    await expect(filter).toBeFocused();
    await expect(filter).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".service-item:visible")).toHaveCount(count);
    await expect(page.getByRole("status")).toContainText(`${count} services shown`);
  }
  if (testInfo.project.name === "chromium") expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.locator('.service-catalog a[href$="/crm-development/"]').click();
  await expect(page.locator("h1")).toHaveText("CRM Development");
  await page.goBack();
  const selected = await page.locator('[data-service-filter][aria-pressed="true"]').getAttribute("data-service-filter");
  await expect(page.locator(".service-item:visible")).toHaveCount(selected === "all" ? 8 : selected === "operations" ? 4 : 2);
});

test("brief completion reflects valid essentials without enabling unavailable delivery", async ({ page }) => {
  const posts = [];
  page.on("request", request => { if (request.method() === "POST") posts.push(request.url()); });
  await page.goto("./contact/");
  const progress = page.getByRole("progressbar", { name: "Your brief, taking shape" });
  await expect(progress).toHaveAttribute("value", "0");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Test User");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("wrong-email");
  await page.getByLabel("Service required").selectOption("crm-development");
  await page.getByLabel("Project description").fill("Too short");
  await expect(progress).toHaveAttribute("value", "2");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("test@example.test");
  await page.getByLabel("Project description").fill("We need one clear place to manage customer enquiries and follow-ups.");
  await expect(progress).toHaveAttribute("value", "4");
  await expect(page.locator("[data-send]")).toBeDisabled();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("   ");
  await expect(progress).toHaveAttribute("value", "3");
  await page.locator("form").evaluate(form => form.reset());
  await expect(progress).toHaveAttribute("value", "0");
  expect(posts).toEqual([]);
});

test("shared hero and card tilt reset on scroll, focus, and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./about/");
  const hero = page.locator(".page-hero-side");
  await hero.hover({ position: { x: 50, y: 50 } });
  await expect(hero).toHaveClass(/is-tilting/);
  await page.mouse.wheel(0, 250);
  await expect(hero).not.toHaveClass(/is-tilting/);
  const card = page.locator(".principle-surface").first();
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.allSettled(document.getAnimations().map(animation => animation.finished));
  });
  await card.hover({ position: { x: 40, y: 40 } });
  await expect(card).toHaveClass(/is-tilting/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).not.toHaveClass(/is-tilting/);
  await expect(card).toHaveCSS("transform", "none");
  await expect(hero).toHaveCSS("transform", "none");
  await page.goto("./services/");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const service = page.locator(".service-catalog a").first();
  await service.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.allSettled(document.getAnimations().map(animation => animation.finished));
  });
  await service.hover({ position: { x: 40, y: 40 } });
  await expect(service).toHaveClass(/is-tilting/);
  await service.focus();
  await expect(service).not.toHaveClass(/is-tilting/);
});

test("policy contents remain usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("./legal/privacy-policy/");
  const toc = page.getByRole("navigation", { name: "On this page", exact: true });
  await expect(toc).toBeVisible();
  const link = toc.getByRole("link").nth(1);
  const href = await link.getAttribute("href");
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator(href)).toBeFocused();
  await expect(page.locator(".draft-banner")).toContainText("Draft requiring legal review");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test.describe("touch and no-script fallbacks", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("homepage concepts and service filters work on touch without tilt", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Automation", exact: true }).tap();
    await expect(page.locator("#studio-automation")).toBeVisible();
    await page.locator("#studio-automation h2").tap();
    await expect(page.locator(".is-tilting")).toHaveCount(0);
    await page.goto("./services/");
    await page.getByRole("button", { name: "Connected operations", exact: true }).tap();
    await expect(page.locator(".service-item:visible")).toHaveCount(4);
  });
  test("failed enhancement keeps all concepts and services accessible", async ({ page }) => {
    await page.route("**/src/app.js*", route => route.abort());
    await page.goto("./");
    await expect(page.locator("[data-workflow-panel]:visible")).toHaveCount(3);
    await expect(page.locator(".workflow-controls")).toBeHidden();
    await page.goto("./services/");
    await expect(page.locator(".service-item:visible")).toHaveCount(8);
    await expect(page.locator(".service-filters")).toBeHidden();
    await page.goto("./contact/");
    await expect(page.locator(".brief-progress")).toBeHidden();
    await expect(page.locator("[data-send]")).toBeDisabled();
  });
});
