import { resolve } from "node:path";
import { buildSite } from "./build.mjs";
import { createPreviewServer } from "./dev-server.mjs";

const root = resolve(import.meta.dirname, "..");
const fixtures = [
  { name: "browser-site", port: 4300, basePath: "/A-MTechSolution", config: {} },
  { name: "contact-site", port: 4301, basePath: "/configured", config: { contactEmail: "hello@example.test", contactEndpoint: "https://forms.example.test/inquiries" } },
  { name: "root-site", port: 4302, basePath: "", config: { contactEmail: "hello@example.test" } }
];
for (const fixture of fixtures) {
  const output = resolve(root, "qa-artifacts", fixture.name);
  await buildSite({ output, config: { ...fixture.config, basePath: fixture.basePath }, siteUrl: `http://127.0.0.1:${fixture.port}${fixture.basePath}` });
  const { url } = await createPreviewServer({ directory: output, port: fixture.port });
  console.log(`Test fixture: ${url}`);
}
