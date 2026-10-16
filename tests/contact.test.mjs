import { test } from "node:test";
import assert from "node:assert/strict";
import { deliverInquiry } from "../src/contact.js";
import { renderPage } from "../src/pages.js";
import { normalizeConfig } from "../src/site.js";
import defaultConfig from "../site-config.js";

test("contact details are rendered when configured, and sending stays unavailable otherwise", () => {
  const empty = renderPage("/contact/", normalizeConfig(defaultConfig)).html;
  assert.match(empty, /Online enquiries are not available yet/);
  assert.match(empty, /Sending unavailable/);
  assert.doesNotMatch(empty, /mailto:/);
  const email = renderPage("/contact/", normalizeConfig({ ...defaultConfig, contactEmail: "hello@example.test" })).html;
  assert.match(email, /href="mailto:hello@example.test"/);
  assert.match(email, /Sending unavailable/);
  const configured = renderPage("/contact/", normalizeConfig({ ...defaultConfig, contactEndpoint: "https://forms.example.test/inquiries" })).html;
  assert.match(configured, /Send project inquiry/);
  assert.match(configured, /<button[^>]+type="submit" disabled/); // Enabled only after the handler is attached.
});

test("delivery sends only intended fields and waits for server acceptance", async () => {
  let request;
  await deliverInquiry("https://forms.example.test/inquiries", { name: "  Test User  ", email: "test@example.test", website: "trap", formStartedAt: "100", extra: "ignore" }, {
    fetchImpl: async (url, options) => { request = { url, ...options }; return { ok: true, status: 202 }; }
  });
  assert.equal(request.credentials, "omit");
  assert.equal(request.redirect, "error");
  assert.deepEqual(JSON.parse(request.body), { name: "Test User", email: "test@example.test", company: "", service: "", budget: "", contactMethod: "", description: "" });
});

test("delivery rejects server failures and insecure endpoints", async () => {
  await assert.rejects(deliverInquiry("https://forms.example.test", {}, { fetchImpl: async () => ({ ok: false, status: 503 }) }), /503/);
  await assert.rejects(deliverInquiry("http://forms.example.test", {}), /secure delivery/);
});

test("a stalled submission aborts and rejects instead of remaining pending", async () => {
  let aborted = false;
  await assert.rejects(deliverInquiry("https://forms.example.test", {}, {
    timeoutMs: 20,
    fetchImpl: (_url, { signal }) => new Promise((_accept, reject) => signal.addEventListener("abort", () => { aborted = true; reject(new DOMException("Timed out", "AbortError")); }, { once: true }))
  }), { name: "AbortError" });
  assert.equal(aborted, true);
});
