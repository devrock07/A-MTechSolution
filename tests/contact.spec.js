import { test, expect } from "@playwright/test";

const endpoint = "https://forms.example.test/inquiries";
const description = "Our small team needs a clearer way to follow up customer enquiries.";

async function fillBrief(page) {
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Test User");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("test@example.test");
  await page.getByLabel("Service required").selectOption("website-development");
  await page.getByLabel("Project description").fill(description);
  await page.locator('[name="formStartedAt"]').evaluate(field => { field.value = String(Date.now() - 5000); });
}

test("unconfigured delivery is disabled before a visitor fills anything", async ({ page }) => {
  const posts = [];
  page.on("request", request => { if (request.method() === "POST") posts.push(request.url()); });
  await page.goto("./contact/");
  await expect(page.locator("#delivery-note")).toContainText("Online enquiries are not available yet");
  await expect(page.getByRole("button", { name: "Sending unavailable" })).toBeDisabled();
  await fillBrief(page);
  await page.locator("form").evaluate(form => form.requestSubmit());
  await expect(page.getByRole("status")).toContainText("No message was sent");
  expect(posts).toEqual([]);
});

test("field errors are associated, focused, and cleared when corrected", async ({ page }) => {
  await page.goto("./contact/");
  await page.getByRole("button", { name: "Copy project brief" }).click();
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toBeFocused();
  for (const id of ["name", "email", "service", "description"]) {
    await expect(page.locator(`#${id}`)).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(`#${id}`)).toHaveAccessibleDescription(/This field is required/);
  }
  await fillBrief(page);
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("wrong-email");
  await page.getByRole("button", { name: "Copy project brief" }).click();
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveAccessibleDescription("Enter a valid email address.");
});

test("copy keeps the brief and never implies delivery", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async text => { window.copiedBrief = text; } } }));
  await page.goto("./contact/");
  await fillBrief(page);
  await page.getByRole("button", { name: "Copy project brief" }).click();
  await expect(page.getByRole("status")).toHaveText("Project brief copied. No message was sent.");
  expect(await page.evaluate(() => window.copiedBrief)).toContain("Service: Website Development");
  await expect(page.getByLabel("Project description")).toHaveValue(description);
});

test("denied clipboard access provides a selectable brief", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("Denied"); } } }));
  await page.goto("./contact/");
  await fillBrief(page);
  await page.getByRole("button", { name: "Copy project brief" }).click();
  await expect(page.locator("#brief-text")).toBeVisible();
  await expect(page.locator("#brief-text")).toBeFocused();
  expect(await page.locator("#brief-text").inputValue()).toContain(description);
  const selection = await page.locator("#brief-text").evaluate(field => field.selectionEnd - field.selectionStart);
  expect(selection).toBeGreaterThan(description.length);
});

test("configured delivery waits for acceptance and prevents duplicate submissions", async ({ page }) => {
  let complete;
  let requests = 0;
  const held = new Promise(accept => { complete = accept; });
  await page.route(endpoint, async route => { requests++; await held; await route.fulfill({ status: 202, contentType: "application/json", body: '{"accepted":true}' }); });
  await page.goto("http://127.0.0.1:4301/configured/contact/");
  await fillBrief(page);
  await page.getByRole("button", { name: "Send project inquiry" }).click();
  await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled();
  await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
  await page.locator("form").evaluate(form => form.requestSubmit());
  await expect.poll(() => requests).toBe(1);
  complete();
  await expect(page.getByRole("status")).toContainText("Your inquiry was received");
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Send project inquiry" })).toBeEnabled();
  const elapsed = await page.locator('[name="formStartedAt"]').evaluate(field => Date.now() - Number(field.value));
  expect(elapsed).toBeLessThan(2500);
});

for (const failure of ["server", "network"]) {
  test(`${failure} failure preserves the brief and restores sending`, async ({ page }) => {
    await page.route(endpoint, route => failure === "server" ? route.fulfill({ status: 503, body: "Unavailable" }) : route.abort("failed"));
    await page.goto("http://127.0.0.1:4301/configured/contact/");
    await fillBrief(page);
    await page.getByRole("button", { name: "Send project inquiry" }).click();
    await expect(page.getByRole("status")).toContainText("Delivery could not be confirmed");
    await expect(page.getByRole("status")).not.toContainText("received");
    await expect(page.getByLabel("Project description")).toHaveValue(description);
    await expect(page.getByRole("button", { name: "Send project inquiry" })).toBeEnabled();
  });
}

test("stalled delivery times out and leaves the brief recoverable", async ({ page }) => {
  await page.clock.install();
  await page.route(endpoint, () => new Promise(() => {}));
  await page.goto("http://127.0.0.1:4301/configured/contact/");
  await fillBrief(page);
  await page.getByRole("button", { name: "Send project inquiry" }).click();
  await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled();
  await page.clock.fastForward(13000);
  await expect(page.getByRole("status")).toContainText("Delivery could not be confirmed in time");
  await expect(page.getByLabel("Project description")).toHaveValue(description);
  await expect(page.getByRole("button", { name: "Send project inquiry" })).toBeEnabled();
});

test("bot and premature submissions never reach the endpoint", async ({ page }) => {
  let requests = 0;
  await page.route(endpoint, async route => { requests++; await route.fulfill({ status: 202, body: "accepted" }); });
  await page.goto("http://127.0.0.1:4301/configured/contact/");
  await fillBrief(page);
  await page.locator('[name="website"]').evaluate(field => { field.value = "spam.example"; });
  await page.getByRole("button", { name: "Send project inquiry" }).click();
  expect(requests).toBe(0);
  await page.locator('[name="website"]').evaluate(field => { field.value = ""; });
  await page.locator('[name="formStartedAt"]').evaluate(field => { field.value = String(Date.now()); });
  await page.getByRole("button", { name: "Send project inquiry" }).click();
  await expect(page.getByRole("status")).toContainText("review your brief for a moment");
  expect(requests).toBe(0);
});
