export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function normalizeBasePath(value = "") {
  const path = String(value).replace(/^\/+|\/+$/g, "");
  if (!path) return "";
  if (!/^[\w-]+(?:\/[\w-]+)*$/.test(path)) throw new Error("BASE_PATH must contain only URL-safe path segments.");
  return `/${path}`;
}

export function sitePath(path, basePath = "") {
  return path.startsWith("/") ? `${normalizeBasePath(basePath)}${path}` : path;
}

export function normalizeConfig(input) {
  const config = { ...input, basePath: normalizeBasePath(input.basePath) };
  config.contactEmail = String(input.contactEmail || "").trim();
  config.contactEndpoint = String(input.contactEndpoint || "").trim();
  if (config.contactEmail && !/^[^\s@<>"'?#]+@[^\s@<>"'?#]+\.[^\s@<>"'?#]+$/.test(config.contactEmail)) {
    throw new Error("contactEmail must be a valid email address, or empty until verified.");
  }
  if (config.contactEndpoint) {
    const url = new URL(config.contactEndpoint);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("contactEndpoint must be an HTTPS URL without credentials.");
  }
  for (const field of ["publishWork", "publishProducts", "publishLegal"]) config[field] = input[field] === true;
  if (config.publishLegal && (!config.companyLegalName || !config.jurisdiction || !config.effectiveDate || !config.contactEmail)) {
    throw new Error("Publishing reviewed legal pages requires entity, jurisdiction, effective date, and contact email.");
  }
  return Object.freeze(config);
}
