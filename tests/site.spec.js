import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { routes } from "../src/routes.js";

const widths = [320, 390, 768, 1440];

for (const route of routes) {
  test(`${route.path} renders, keeps links in the project, and fits four widths`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(`.${route.path}`);
    expect(response.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveClass("js");
    const wrongLinks = await page.locator('a[href^="/"]').evaluateAll(links => links.filter(link => !link.pathname.startsWith("/A-MTechSolution/")).map(link => link.href));
    expect(wrongLinks).toEqual([]);
    const url = `http://127.0.0.1:4300/A-MTechSolution${route.path}`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", url);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", url);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("h1")).toBeVisible();
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      expect(dimensions.document, `${route.path} overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
      await expect(page.locator(".brand").first()).toHaveAccessibleName("A&M Tech Solutions");
      if (testInfo.project.name === "chromium" && (width === 390 || width === 1440)) {
        await page.evaluate(async () => {
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          await Promise.allSettled(document.getAnimations().map(animation => animation.finished));
        });
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })), `Accessibility at ${width}px`).toEqual([]);
      }
    }
    expect(errors).toEqual([]);
  });
}

test("mobile menu releases scrolling on navigation, back, escape, and resize", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();
  await expect(page.locator("body")).toHaveClass("menu-open");
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Services", exact: true }).click();
  await expect(page).toHaveURL(/\/A-MTechSolution\/services\/$/);
  await expect(page.locator("body")).not.toHaveClass(/menu-open/);
  await expect(page.locator("body")).not.toHaveCSS("overflow-y", "hidden");
  await page.goBack();
  await expect(page.locator("body")).not.toHaveClass(/menu-open/);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  await expect(page.locator("main")).not.toHaveAttribute("inert");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("body")).not.toHaveClass(/menu-open/);
  await expect(page.locator("main")).not.toHaveAttribute("inert");
});

test("mobile menu keeps keyboard focus within visible controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.keyboard.press("Tab");
  await expect(page.locator("#primary-navigation a").first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#primary-navigation a").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
});

test("service links open directly in a new tab with correct metadata", async ({ page, context }) => {
  await page.goto("./");
  const link = page.locator('.service-row[href$="/website-development/"]');
  await link.evaluate(element => { element.target = "_blank"; });
  const newTabPromise = context.waitForEvent("page");
  await link.click();
  const tab = await newTabPromise;
  await tab.waitForLoadState();
  await expect(tab.getByRole("heading", { level: 1 })).toHaveText("Website Development");
  await expect(tab.locator('link[rel="canonical"]')).toHaveAttribute("href", "http://127.0.0.1:4300/A-MTechSolution/services/website-development/");
  await tab.reload();
  await expect(tab.getByRole("heading", { level: 1 })).toHaveText("Website Development");
  await tab.close();
});

test("navigation and back keep metadata in sync", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");
  await page.locator("#primary-navigation").getByRole("link", { name: "Services", exact: true }).click();
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /\/services\/$/);
  await page.goBack();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "http://127.0.0.1:4300/A-MTechSolution/");
});

for (const route of routes.filter(route => ["service", "product"].includes(route.kind))) {
  test(`FAQ answers visibly open and close on ${route.path}`, async ({ page }) => {
    await page.goto(`.${route.path}`);
    const item = page.locator(".faq-item").nth(1);
    await expect(page.locator(".faq-answer").first()).toBeVisible();
    await expect(item.locator(".faq-answer")).toBeHidden();
    await item.locator("summary").click();
    await expect(item.locator(".faq-answer")).toBeVisible();
    expect(await item.locator(".faq-answer").evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(10);
    await item.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(item.locator(".faq-answer")).toBeHidden();
  });
}

test("skip link focuses the main content", async ({ page }) => {
  await page.goto("./");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("missing pages return a real 404 and remain navigable", async ({ page }) => {
  const response = await page.goto("./does-not-exist/");
  expect(response.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("404");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  await page.getByRole("link", { name: "Return home" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:4300/A-MTechSolution/");
});

test("reduced motion still exposes content immediately without loading overlays", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("#site-loader, #route-curtain")).toHaveCount(0);
  await expect(page.locator(".brand-entrance")).toBeHidden();
  expect(await page.locator(".reveal").evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === "1"))).toBe(true);
  await expect(page.locator("body")).not.toHaveCSS("overflow-y", "hidden");
});

test("root deployment uses root-relative links and email fallback", async ({ page }) => {
  await page.goto("http://127.0.0.1:4302/contact/");
  await expect(page.locator("#delivery-note")).toContainText("hello@example.test");
  await expect(page.locator("[data-send]")).toBeDisabled();
  await expect(page.locator(".brand").first()).toHaveAttribute("href", "/");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  for (const path of ["/", "/solutions/", "/services/", "/services/crm-development/", "/contact/", "/legal/privacy-policy/"]) {
    test(`${path} still has visible content and usable navigation`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`.${path}`);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("#primary-navigation")).toBeVisible();
      await expect(page.locator(".menu-toggle")).toBeHidden();
      await expect(page.locator(".brand-entrance")).toBeHidden();
      if (path === "/solutions/" || path === "/") {
        await expect(page.locator("[data-workflow-panel]:visible")).toHaveCount(3);
        await expect(page.locator(".workflow-controls")).toBeHidden();
        await page.locator(".solution-approach summary").first().click();
        await expect(page.locator(".solution-service-link").first()).toBeVisible();
      }
      if (path === "/services/") {
        await expect(page.locator(".service-item:visible")).toHaveCount(8);
        await expect(page.locator(".service-filters")).toBeHidden();
      }
      if (path.includes("crm-development")) {
        const faq = page.locator(".faq-item").nth(1);
        await faq.locator("summary").click();
        await expect(faq.locator(".faq-answer")).toBeVisible();
      }
      if (path === "/contact/") {
        await expect(page.locator("[data-send]")).toBeDisabled();
        await expect(page.locator("noscript .form-note")).toContainText("No information will be submitted");
      }
      await page.locator("#primary-navigation").getByRole("link", { name: "Services", exact: true }).click();
      await expect(page.locator("h1")).toContainText("Services for your business");
    });
  }
});

test("visual checkpoints", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("./");
    await page.screenshot({ path: `qa-artifacts/${testInfo.project.name}-home-${width}.png`, animations: "disabled" });
    await page.goto("./contact/");
    await page.locator("#project-form").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `qa-artifacts/${testInfo.project.name}-contact-${width}.png` });
    await page.goto("./solutions/");
    await page.screenshot({ path: `qa-artifacts/${testInfo.project.name}-solutions-${width}.png`, animations: "disabled" });
    for (const [label, path] of [["services", "services/"], ["service", "services/crm-development/"], ["about", "about/"], ["work", "work/"], ["work-template", "work/project-template/"], ["products", "products/"], ["product", "products/operations-hub/"], ["legal", "legal/privacy-policy/"], ["404", "missing/"]]) {
      await page.goto(`./${path}`);
      await page.screenshot({ path: `qa-artifacts/${testInfo.project.name}-${label}-${width}.png`, animations: "disabled" });
    }
  }
});
