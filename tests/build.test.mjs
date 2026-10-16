import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { buildSite } from "../scripts/build.mjs";
import { createPreviewServer } from "../scripts/dev-server.mjs";
import { routes } from "../src/routes.js";
import { normalizeConfig } from "../src/site.js";
import defaultConfig from "../site-config.js";

const root = resolve(import.meta.dirname, "..");

for (const basePath of ["", "/A-MTechSolution"]) {
  test(`static output, metadata, links, assets, and HTTP behavior at ${basePath || "/"}`, async t => {
    const output = resolve(root, "qa-artifacts", basePath ? "unit-project-site" : "unit-root-site");
    const siteUrl = `https://example.test${basePath}`;
    const build = await buildSite({ output, config: { basePath }, siteUrl });
    assert.equal(build.routes, 23);
    assert.equal(build.indexedRoutes, 13);
    const hrefs = new Set();
    for (const route of routes) {
      const html = await readFile(resolve(output, `.${route.path}`, "index.html"), "utf8");
      assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, route.path);
      assert.match(html, /<main id="main-content"/);
      assert.ok(!html.includes('id="app"'), "Pages contain real markup, not an empty app shell");
      assert.ok(html.includes(`rel="canonical" href="${siteUrl}${route.path}"`), route.path);
      assert.ok(html.includes(`property="og:url" content="${siteUrl}${route.path}"`), route.path);
      const unpublished = route.draft || route.publication;
      assert.ok(html.includes(`name="robots" content="${unpublished ? "noindex" : "index"}, follow"`), route.path);
      for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        if (!url.startsWith("/") || url.startsWith("//")) continue;
        assert.ok(url.startsWith(`${basePath}/`), `Wrong base path in ${route.path}: ${url}`);
        hrefs.add(url);
        const asset = decodeURIComponent(url.split(/[?#]/)[0]).slice(basePath.length);
        let file = resolve(output, `.${asset}`);
        if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
        assert.ok((await stat(file)).isFile(), `Missing link target: ${url}`);
      }
    }
    const sitemap = await readFile(resolve(output, "sitemap.xml"), "utf8");
    assert.equal((sitemap.match(/<loc>/g) || []).length, 13);
    assert.doesNotMatch(sitemap, /\/work\/|\/products\/|\/legal\//);
    const home = await readFile(resolve(output, "index.html"), "utf8");
    assert.doesNotMatch(home, /Verified project name|No pretend signup|Read the trial draft|href="[^\"]*\/products\//);
    assert.ok((await stat(resolve(output, "brand-card.png"))).size > 1000);
    const browserConfig = await readFile(resolve(output, "site-config.js"), "utf8");
    assert.doesNotMatch(browserConfig, /publishLegal|jurisdiction/);
    const app = await readFile(resolve(output, "src/app.js"), "utf8");
    assert.match(app, /site-config\.js\?v=/);
    assert.match(app, /contact\.js\?v=/);
    assert.match(app, /motion\.js\?v=/);
    assert.match(app, /solutions\.js\?v=/);
    for (const file of ["motion.js", "solutions.js"]) assert.ok((await stat(resolve(output, "src", file))).isFile());

    const { server, url } = await createPreviewServer({ directory: output, port: 0 });
    t.after(() => new Promise(accept => server.close(accept)));
    const origin = new URL(url).origin;
    for (const href of hrefs) assert.equal((await fetch(`${origin}${href}`)).status, 200, href);
    const notFound = await fetch(`${url}missing-page/`);
    assert.equal(notFound.status, 404);
    assert.match(await notFound.text(), /<h1>404<\/h1>/);
    assert.equal((await fetch(`${url}src/missing.js`)).status, 404);
    assert.equal((await fetch(`${url}site-config.js`)).headers.get("content-type"), "text/javascript; charset=utf-8");
    const redirect = await fetch(`${url}services?campaign=test`, { redirect: "manual" });
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get("location"), `${basePath}/services/?campaign=test`);
    assert.equal((await fetch(`${url}contact/`, { method: "POST", body: "must-not-submit" })).status, 405);
    const head = await fetch(url, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    if (basePath) assert.equal((await fetch(`${origin}/services/`)).status, 404);
  });
}

test("configuration rejects insecure delivery and invalid publication values", () => {
  for (const contactEndpoint of ["http://example.test", "javascript:alert(1)", "https://user:pass@example.test"]) {
    assert.throws(() => normalizeConfig({ ...defaultConfig, contactEndpoint }));
  }
  assert.throws(() => normalizeConfig({ ...defaultConfig, contactEmail: 'invalid"@example.test' }));
  assert.throws(() => normalizeConfig({ ...defaultConfig, basePath: "/../src" }));
  assert.throws(() => normalizeConfig({ ...defaultConfig, publishLegal: true }));
  assert.equal(normalizeConfig({ ...defaultConfig, publishLegal: "true" }).publishLegal, false);
});

test("build rejects an unsafe output before touching source", async () => {
  await assert.rejects(buildSite({ output: resolve(root, "src") }), /Build output/);
  await assert.rejects(buildSite({ output: root }), /Build output/);
  await assert.rejects(buildSite({ siteUrl: "https://example.test/wrong", config: { basePath: "/site" } }), /pathname must match/);
});
