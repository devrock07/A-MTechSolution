import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import defaultConfig from "../site-config.js";
import { normalizeConfig, escapeHtml, sitePath } from "../src/site.js";
import { routes, notFoundRoute, isPublished } from "../src/routes.js";
import { renderPage } from "../src/pages.js";

const root = resolve(import.meta.dirname, "..");

export async function buildSite({ output = resolve(root, "dist"), config: overrides = {}, siteUrl, assetVersion = "" } = {}) {
  output = resolve(output);
  const outputPath = relative(root, output);
  if (isAbsolute(outputPath) || !/^(dist|qa-artifacts[\\/][\w-]+)(?:[\\/]|$)/.test(outputPath) || outputPath.split(/[\\/]/).includes("..")) {
    throw new Error("Build output must be dist or a dedicated directory inside qa-artifacts.");
  }
  const config = normalizeConfig({ ...defaultConfig, ...overrides });
  const canonical = new URL(siteUrl || `http://127.0.0.1:4173${config.basePath}`);
  if (!["https:", "http:"].includes(canonical.protocol) || canonical.username || canonical.password || canonical.search || canonical.hash) throw new Error("SITE_URL must be an HTTP(S) site URL without credentials, query, or hash.");
  if (canonical.pathname.replace(/\/$/, "") !== config.basePath) throw new Error("SITE_URL pathname must match BASE_PATH.");
  const canonicalSite = canonical.href.replace(/\/$/, "");
  const template = await readFile(resolve(root, "index.html"), "utf8");
  const assets = ["src/app.js", "src/contact.js", "src/motion.js", "src/solutions.js", "src/styles.css"];
  const sources = await Promise.all(assets.map(file => readFile(resolve(root, file), "utf8")));
  const version = assetVersion || createHash("sha256").update(sources.join("\n") + JSON.stringify(config)).digest("hex").slice(0, 12);
  const suffix = `?v=${encodeURIComponent(String(version).slice(0, 40))}`;
  const assetUrl = file => `${sitePath(`/${file}`, config.basePath)}${suffix}`;

  // The output boundary above is checked before removing generated files.
  await rm(output, { recursive: true, force: true });
  await mkdir(resolve(output, "src"), { recursive: true });
  await cp(resolve(root, "public"), output, { recursive: true });
  for (let index = 0; index < assets.length; index += 1) {
    const text = assets[index].endsWith(".js")
      ? sources[index].replace(/from ("|')(\.{1,2}\/[^"']+\.js)\1/g, (_, quote, path) => `from ${quote}${path}${suffix}${quote}`)
      : sources[index];
    await writeFile(resolve(output, assets[index]), text);
  }
  // Browser configuration is public. Never include API keys or provider credentials.
  await writeFile(resolve(output, "site-config.js"), `export default Object.freeze(${JSON.stringify({ contactEmail: config.contactEmail, contactEndpoint: config.contactEndpoint })});\n`);

  function htmlForRoute(route) {
    const url = `${canonicalSite}${route.path}`;
    const image = `${canonicalSite}/brand-card.png`;
    const head = [
      `<title>${escapeHtml(route.title)}</title>`,
      `<meta name="description" content="${escapeHtml(route.description)}" />`,
      `<meta name="robots" content="${isPublished(route, config) ? "index, follow" : "noindex, follow"}" />`,
      `<link rel="canonical" href="${escapeHtml(url)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="A&amp;M Tech Solutions" />`,
      `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
      `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
      `<meta property="og:url" content="${escapeHtml(url)}" />`,
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="A&amp;M Tech Solutions — software that works as hard as your business." />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<link rel="icon" href="${assetUrl("favicon.svg")}" type="image/svg+xml" />`,
      `<link rel="stylesheet" href="${assetUrl("src/styles.css")}" />`
    ].join("\n    ");
    return template
      .replace("<!-- page:head -->", head)
      .replace("<!-- page:content -->", renderPage(route.path, config).html)
      .replace("<!-- page:scripts -->", `<script type="module" src="${assetUrl("src/app.js")}"></script>`);
  }

  for (const route of routes) {
    const directory = resolve(output, `.${route.path}`);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, "index.html"), htmlForRoute(route));
  }
  await writeFile(resolve(output, "404.html"), htmlForRoute(notFoundRoute));
  const published = routes.filter(route => isPublished(route, config));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${published.map(route => `  <url><loc>${escapeHtml(`${canonicalSite}${route.path}`)}</loc></url>`).join("\n")}\n</urlset>\n`;
  await writeFile(resolve(output, "sitemap.xml"), sitemap);
  await writeFile(resolve(output, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${canonicalSite}/sitemap.xml\n`);
  await writeFile(resolve(output, "build-info.json"), JSON.stringify({ basePath: config.basePath, siteUrl: canonicalSite, routes: routes.length, indexedRoutes: published.length, assetVersion: version }, null, 2));
  return { output, routes: routes.length, indexedRoutes: published.length, basePath: config.basePath, siteUrl: canonicalSite };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const config = {};
  if (process.env.BASE_PATH !== undefined) config.basePath = process.env.BASE_PATH;
  if (process.env.CONTACT_ENDPOINT) config.contactEndpoint = process.env.CONTACT_ENDPOINT;
  if (process.env.CONTACT_EMAIL) config.contactEmail = process.env.CONTACT_EMAIL;
  console.log(JSON.stringify(await buildSite({ config, siteUrl: process.env.SITE_URL, assetVersion: process.env.ASSET_VERSION }), null, 2));
}
