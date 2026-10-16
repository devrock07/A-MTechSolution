import { company, services, legalPages, productCategories } from "./content.js";

// Shared by the renderer, build, sitemap, preview server, and tests.
export const routes = [
  { path: "/", kind: "home", title: "A&M Tech Solutions — Websites & Business Software", description: company.description },
  { path: "/services/", kind: "services", title: "Services — A&M Tech Solutions", description: "Websites, customer portals, CRM, automation, and business software built around your workflow." },
  ...services.map(service => ({ path: `/services/${service.slug}/`, kind: "service", data: service, title: `${service.title} — A&M Tech Solutions`, description: service.short })),
  { path: "/solutions/", kind: "solutions", title: "Business Solutions — A&M Tech Solutions", description: "Practical software for small businesses, service teams, and growing operations." },
  { path: "/work/", kind: "work", publication: "publishWork", title: "Work — A&M Tech Solutions", description: "Projects and case studies from A&M Tech Solutions." },
  { path: "/work/project-template/", kind: "workTemplate", draft: true, title: "Case Study Preview — A&M Tech Solutions", description: "An unpublished case study template for future project details." },
  { path: "/products/", kind: "products", publication: "publishProducts", title: "Products — A&M Tech Solutions", description: "Software concepts and product directions from A&M Tech Solutions." },
  ...productCategories.filter(product => product.slug).map(product => ({ path: `/products/${product.slug}/`, kind: "product", data: product, draft: product.trial === false, publication: "publishProducts", title: `${product.name} — A&M Tech Solutions`, description: product.description })),
  { path: "/about/", kind: "about", title: "About — A&M Tech Solutions", description: "Our approach to useful websites, clear workflows, and maintainable business software." },
  { path: "/contact/", kind: "contact", title: "Contact — A&M Tech Solutions", description: "Prepare your project brief and check current contact availability." },
  ...Object.entries(legalPages).map(([slug, page]) => ({ path: `/legal/${slug}/`, kind: "legal", publication: "publishLegal", data: page, title: `${page.title} — A&M Tech Solutions`, description: page.intro }))
];

export const notFoundRoute = { path: "/404/", kind: "notFound", draft: true, title: "Page Not Found — A&M Tech Solutions", description: "The requested page could not be found." };

export function isPublished(route, config) {
  return !route.draft && (!route.publication || config[route.publication] === true);
}

export function getRoute(path) {
  const normalized = `/${String(path).replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");
  return routes.find(route => route.path === normalized) || notFoundRoute;
}
