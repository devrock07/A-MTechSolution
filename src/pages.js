import { company, services, solutions, workflowPreviews, solutionServices, process, productCategories, legalPages, navItems } from "./content.js";
import { escapeHtml, sitePath as joinSitePath } from "./site.js";
import { getRoute, isPublished } from "./routes.js";

export function renderPage(path, config) {
  const route = getRoute(path);
  const contactReady = Boolean(config.contactEndpoint || config.contactEmail);
  const serviceBySlug = Object.fromEntries(services.map(service => [service.slug, service]));
  const featuredServices = ["website-development", "crm-development", "custom-software-automation"].map(slug => serviceBySlug[slug]);
  const navigation = navItems.filter(([, href]) => href !== "/products/" || config.publishProducts);
  if (config.publishWork) navigation.splice(2, 0, ["Work", "/work/"]);
  const sitePath = path => joinSitePath(path, config.basePath);

  function faqList(items) {
    return `<div class="faq-list">${items.map(([question, answer], index) => `<details class="faq-item" ${index === 0 ? "open" : ""}><summary class="faq-question">${question}<span class="disclosure-icon" aria-hidden="true"></span></summary><div class="faq-answer"><p>${answer}</p></div></details>`).join("")}</div>`;
  }

function link(href, label, className = "") {
  return `<a class="${className}" href="${sitePath(href)}">${label}</a>`;
}

function button(href, label, variant = "") {
  return link(href, label, `button ${variant}`.trim());
}

function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${items.map((item, index) => item.href ? `${link(item.href, item.label)}${index < items.length - 1 ? ' <span aria-hidden="true">›</span> ' : ""}` : `<span aria-current="page">${item.label}</span>`).join("")}</nav>`;
}

function header(path) {
  return `
    <header class="site-header">
      <div class="nav-wrap">
        ${link("/", `<span class="brand-mark" aria-hidden="true">A&M</span><span class="brand-text">A&M Tech Solutions</span>`, "brand")}
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation" aria-label="Open menu"><span></span></button>
        <nav id="primary-navigation" class="nav-links" aria-label="Primary navigation">
          ${navigation.map(([label, href]) => `<a class="nav-link" href="${sitePath(href)}" ${path.startsWith(href) ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
          ${button("/contact/", contactReady ? "Start a Project" : "Plan a Project", "nav-cta")}
        </nav>
      </div>
    </header>`;
}

function footer() {
  return `<footer class="site-footer"><div class="shell"><div class="footer-top">
    <div class="footer-brand">${link("/", '<span class="brand-mark" aria-hidden="true">A&M</span><span class="brand-text">A&M Tech Solutions</span>', "brand")}<p>${company.description}</p>
      ${config.contactEmail ? `<a class="text-link" href="mailto:${escapeHtml(config.contactEmail)}">${escapeHtml(config.contactEmail)}</a>` : '<p class="footer-note">Contact details coming soon. You can prepare a project brief in the meantime.</p>'}
    </div>
    <nav class="footer-nav" aria-label="Footer navigation"><div class="footer-col"><h2>What we do</h2>${link("/services/", "Services")}${link("/solutions/", "Solutions")}${config.publishWork ? link("/work/", "Work") : ""}${config.publishProducts ? link("/products/", "Products") : ""}</div>
    <div class="footer-col"><h2>Get to know us</h2>${link("/about/", "About")}${link("/contact/", contactReady ? "Contact" : "Project planner")}</div>
    ${config.publishLegal ? `<div class="footer-col"><h2>Policies</h2>${Object.entries(legalPages).map(([slug, page]) => link(`/legal/${slug}/`, page.title)).join("")}</div>` : ""}</nav>
    </div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ${escapeHtml(config.companyLegalName || company.name)}. All rights reserved.</span></div></div></footer>`;
}

function layout(content, path) {
  return `${header(path)}<main id="main-content" data-page="${route.kind}" tabindex="-1">${content}</main>${footer()}`;
}

function interfaceVisual() {
  const previews = [
    ["presence", "Websites", "A website that fits", "Explain what you do, show your work, and give people a clear way to get in touch.", "website-development"],
    ["customers", "Customer tools", "Keep the full picture", "Bring enquiries, customer history, and follow-ups into a workspace your team can use.", "crm-development"],
    ["automation", "Automation", "Give time back", "Connect repetitive tasks and handovers, with clear rules and human oversight.", "custom-software-automation"]
  ];
  return `<div class="studio-preview" data-workflow-preview>
    <div class="workflow-controls" role="group" aria-label="Explore what we build">${previews.map(([id, label], index) => `<button type="button" data-workflow-select="studio-${id}" aria-controls="studio-${id}" aria-pressed="${index === 0}">${label}</button>`).join("")}</div>
    <div class="studio-scene">${previews.map(([id, label, title, copy, slug]) => `<section class="studio-board" id="studio-${id}" data-workflow-panel aria-labelledby="studio-title-${id}">
      <div class="workflow-steps studio-content"><div class="studio-caption"><h2 class="studio-display" id="studio-title-${id}">${title}</h2><p>${copy}</p>${link(`/services/${slug}/`, `Explore ${label.toLowerCase()}`, "text-link")}</div>
      <div class="studio-sculpture" data-motion-accent data-tilt="3"><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i><span aria-hidden="true">A&M</span>${motionAccent()}</div></div>
    </section>`).join("")}</div><p class="sr-only" data-workflow-status role="status" aria-live="polite"></p>
  </div>`;
}

function depthMark() {
  return `<div class="depth-mark" data-motion-accent><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"><span>A&M</span><b>↗</b></i>${motionAccent()}</div>`;
}

function motionAccent() {
  return `<video class="motion-accent-video" data-motion-src="${sitePath("/media/studio-sculpture-v1.mp4")}" data-motion-rate="0.8" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>`;
}

function solutionCards() {
  return `<div class="solution-card-grid">${solutions.map((item, index) => `<div class="reveal"><article class="solution-card" data-tilt="3">

    <h3>${item.title}</h3><p>${item.problem}</p>
    <details class="solution-approach"><summary>Explore approach <span class="disclosure-icon" aria-hidden="true"></span></summary><div class="solution-approach-body"><p>${item.solution}</p><h4>A possible starting point</h4><div class="solution-service-links">${solutionServices[index].map(slug => link(`/services/${slug}/`, serviceBySlug[slug].title, "solution-service-link")).join("")}</div></div></details>
  </article></div>`).join("")}</div>`;
}

function homePage() {
  const principles = [
    ["Start with the work", "We begin with the people, decisions, and exceptions behind the request."],
    ["Make it maintainable", "Clear structure and documentation help the product stay useful after launch."],
    ["Design for mobile", "The experience works for people making decisions away from a large screen."],
    ["Agree the scope", "Priorities, boundaries, assumptions, and changes are made explicit."],
    ["Choose practical tools", "Technology is chosen for the problem and the people who will own it."],
    ["Plan what follows", "Support and further improvements are agreed clearly before handover."]
  ];
  return `<section class="hero home-hero"><div class="shell">
    <h1 class="home-title"><span class="reveal">Websites &</span><span class="reveal">software</span></h1>
    <div class="hero-bottom"><p class="hero-copy reveal">A&M builds websites, customer tools, and workflow automation for small businesses and growing teams.</p><div class="hero-actions reveal">${button("/contact/", "Plan a Project")}${link("/services/", "Explore our services", "text-link")}</div></div>
  </div></section>
  <section class="section home-studio"><div class="shell reveal">${interfaceVisual()}</div></section>
  <section class="section home-manifesto"><div class="shell manifesto-line"><h2 class="section-title reveal">Built around<br>your business</h2><p class="reveal">A public website, a customer workspace, an operational system. We connect the parts that help your business work.</p></div></section>
  <section class="section" id="services"><div class="shell">
    <div class="section-heading-row"><h2 class="section-title reveal">What we build</h2><div class="reveal"><p class="section-lede">Start with the part of the business that needs attention.</p>${link("/services/", "View all services", "text-link")}</div></div>
    <div class="service-list">${featuredServices.map(service => `<a class="service-row reveal" href="${sitePath(`/services/${service.slug}/`)}"><h3>${service.title}</h3><p>${service.short}</p><span class="service-arrow" aria-hidden="true">↗</span></a>`).join("")}</div>
  </div></section>
  <section class="section section-soft"><div class="shell"><div class="section-heading-row"><h2 class="section-title reveal">Find your fit</h2><p class="section-lede reveal">Explore a starting point for the work you do.</p></div>${solutionCards()}<div class="button-row">${link("/solutions/", "Explore all solutions", "text-link")}</div></div></section>
  <section class="section"><div class="shell"><div class="section-heading-row"><h2 class="section-title reveal">How we work</h2><p class="section-lede reveal">From understanding the problem to handing over a tested product.</p></div><div class="process-list">${process.map(([title, copy]) => `<div class="process-item reveal"><h3>${title}</h3><p>${copy}</p></div>`).join("")}</div></div></section>
  <section class="section section-soft"><div class="shell"><div class="section-heading-row"><h2 class="section-title reveal">Working with A&M</h2><p class="section-lede reveal">What you can expect from the way we approach a project.</p></div><div class="principles">${principles.map(([title, copy]) => `<article class="principle reveal"><div class="principle-surface" data-tilt="2"><h3>${title}</h3><p>${copy}</p></div></article>`).join("")}</div></div></section>${finalCta()}`;
}

function pageHero({ title, intro, code = "", crumbs = [] }) {
  return `<section class="page-hero"><div class="shell">${crumbs.length ? breadcrumbs(crumbs) : ""}<div class="page-hero-grid"><div class="reveal"><h1>${title}</h1></div><div class="hero-note-scene reveal"><div class="page-hero-side" data-tilt="3">${depthMark()}<p>${intro}</p>${code ? `<p class="page-code">${code}</p>` : ""}</div></div></div></div></section>`;
}

function servicesPage() {
  const groups = { "website-development": "presence", "ui-ux-product-design": "presence", "web-application-development": "operations", "crm-development": "operations", "erp-business-systems": "operations", "custom-software-automation": "operations", "saas-product-development": "product", "maintenance-support": "product" };
  return `${pageHero({ label: "Services", title: "Services for your business", intro: "From a public-facing website to the systems behind daily operations, each engagement begins with the business problem—not a preselected stack." })}
    <section class="section"><div class="shell" data-service-directory><div class="service-directory-heading"><div><h2 class="section-title small">Choose a focus</h2></div><p class="section-lede">Start with a priority.<br />Explore the connected possibilities.</p></div>
    <div class="service-filters" role="group" aria-label="Filter services" hidden>${[["all", "All services"], ["presence", "Digital presence"], ["operations", "Connected operations"], ["product", "Product & support"]].map(([id, label], index) => `<button type="button" data-service-filter="${id}" aria-pressed="${index === 0}">${label}</button>`).join("")}</div><p class="sr-only" data-service-count role="status" aria-live="polite"></p>
    <div class="service-list service-catalog">${services.map((service) => `<div class="service-item reveal" data-service-group="${groups[service.slug]}"><a class="service-row" data-tilt="3" href="${sitePath(`/services/${service.slug}/`)}"><h2>${service.title}</h2><p>${service.short}</p><span class="service-arrow" aria-hidden="true">↗</span></a></div>`).join("")}</div></div></section>
    <section class="section section-dark"><div class="shell two-col"><div><h2 class="section-title small">Build, connect, or improve?</h2></div><div class="prose"><p>A custom build is not automatically the answer. Existing platforms may solve a standard need well. Integration may create more value than replacement. A focused redesign may be enough.</p><p>Discovery is how we establish the sensible path, surface constraints, and avoid paying for complexity the business does not need.</p>${button("/contact/", "Discuss the problem", "button-light")}</div></div></section>${finalCta()}`;
}

function serviceDetailPage(service) {
  const related = service.related.map((slug) => serviceBySlug[slug]).filter(Boolean);
  return `${pageHero({ title: service.title, intro: service.intro, code: "Custom project scope", crumbs: [{ label: "Services", href: "/services/" }, { label: service.title }] })}
    <section class="section"><div class="shell two-col"><div class="sticky-label">
      <h2 class="section-title small">What gets in the way</h2></div><div class="problem-list">${service.problems.map((problem) => `<div class="problem reveal"><p>${problem}</p></div>`).join("")}</div></div></section>
    <section class="section section-soft"><div class="shell"><div class="section-heading-row"><div><h2 class="section-title small">What we can build</h2></div><p class="section-lede">Final scope is defined after the requirements, constraints, and ownership model are understood.</p></div><div class="capability-grid">${service.capabilities.map((capability, index) => `<article class="capability reveal"><div class="capability-surface" data-tilt="3"><h3>${capability}</h3></div></article>`).join("")}</div></div></section>
    <section class="section section-dark"><div class="shell"><div class="section-heading-row"><div><h2 class="section-title small">A good fit when…</h2></div><p class="section-lede">The exact solution may be a build, an integration, or a staged improvement plan.</p></div><div class="use-case-grid">${service.useCases.map((item) => `<div class="use-case reveal">${item}</div>`).join("")}</div></div></section>
    <section class="section"><div class="shell two-col"><div><h2 class="section-title small">Our approach</h2></div><div class="prose"><p>${service.approach}</p><h3>Technology, where it matters</h3><p>${service.technology}</p></div></div></section>
    <section class="section section-soft"><div class="shell"><h2 class="section-title small">Common questions</h2>${faqList(service.faqs)}</div></section>
    <section class="section"><div class="shell"><h2 class="section-title small">Related services</h2><div class="related-links">${related.map((item) => `<a class="related-link reveal" href="${sitePath(`/services/${item.slug}/`)}"><strong>${item.title} ↗</strong></a>`).join("")}</div></div></section>${finalCta()}`;
}

function solutionsPage() {
  return `<section class="hero solutions-hero"><div class="shell solutions-hero-grid">
    <div class="solutions-intro reveal">
      <h1>Software for<br>your business</h1>
      <p class="hero-copy">Bring your customers, team, and everyday work into a clearer rhythm. Useful software starts with understanding what gets in your way.</p>
      <div class="button-row">${link("#solution-types", "Find your starting point", "button")}${button("/contact/", "Plan a Project", "button-ghost")}</div>

    </div>
    <div class="workflow-preview reveal" data-workflow-preview>

      <div class="workflow-scene">

        ${workflowPreviews.map((workflow, index) => `<section class="workflow-board" id="workflow-${workflow.id}" data-workflow-panel data-tilt="5" aria-labelledby="workflow-title-${workflow.id}">

          <h2 id="workflow-title-${workflow.id}">${workflow.title}</h2><p class="workflow-caption">${workflow.caption}</p>
          <ol class="workflow-steps">${workflow.steps.map(([title, detail, label], step) => `<li style="--step:${step}"><div><h3>${title}</h3><p>${detail}</p></div></li>`).join("")}</ol>

        </section>`).join("")}
      </div>
      <div class="workflow-controls" role="group" aria-label="Explore a workflow">${workflowPreviews.map((workflow, index) => `<button type="button" data-workflow-select="workflow-${workflow.id}" aria-controls="workflow-${workflow.id}" aria-pressed="${index === 0}">${workflow.label}</button>`).join("")}</div>
      <p class="sr-only" data-workflow-status role="status" aria-live="polite"></p>
    </div>
  </div></section>
  <section class="section section-dark solution-directory" id="solution-types"><div class="shell">
    <div class="section-heading-row reveal"><div><h2 class="section-title small">Find your fit</h2></div><p class="section-lede">Different teams need different tools. Explore an approach that fits the work you actually do.</p></div>
    ${solutionCards()}
  </div></section>
  <section class="section solution-next"><div class="shell">
    <div class="section-heading-row reveal"><div><h2 class="section-title small">Where to begin</h2></div><p class="section-lede">You don't need a perfect specification. A clear conversation is enough to find a sensible place to start.</p></div>
    <ol class="starting-steps">${[
      ["Map the friction", "Identify the people, information, and decisions that keep getting stuck."],
      ["Choose the useful change", "A focused build, an integration, or a simpler way to use what you already have."],
      ["Make it work together", "Shape the scope, test the flow, and give the team a clear next step."]
    ].map(([title, copy], index) => `<li class="reveal"><h3>${title}</h3><p>${copy}</p></li>`).join("")}</ol>
    <div class="button-row">${button("/contact/", "Describe your workflow")}</div>
  </div></section>${finalCta()}`;
}

function workPage() {
  return `${pageHero({ label: "Work", title: "Our work", intro: "This directory is intentionally honest. Verified project stories will be published when the client, screenshots, technologies, and outcomes are approved for public use." })}
    <section class="section section-soft"><div class="shell"><div class="work-placeholder"><div class="work-visual"><div class="work-frame" data-tilt="5"><div class="work-frame-inner">REAL PROJECT MEDIA</div></div></div><div class="work-copy"><div><span class="status-chip">Project template</span><h2>Case study structure</h2><p>Every project page supports a business category, problem statement, solution, verified technologies, screenshots, and additional project details.</p></div><div><p class="verified-note">Replace this record in the centralized content model only after project publication is approved.</p>${link("/work/project-template/", "Inspect the case study template", "text-link")}</div></div></div></div></section>${finalCta()}`;
}

function workTemplatePage() {
  return `${pageHero({ label: "Project template", title: "Verified project name goes here.", intro: "This route demonstrates the project-detail structure. It is not presented as completed work for a real client.", crumbs: [{ label: "Work", href: "/work/" }, { label: "Template" }] })}
    <section class="section"><div class="shell two-col"><div><h2 class="section-title small">The problem, in business terms.</h2></div><div class="prose"><p>Describe the verified operating context, who was affected, why the existing approach was limiting the business, and the boundaries of the engagement.</p><p class="verified-note">Placeholder guidance. Replace with approved project facts.</p></div></div></section>
    <section class="section section-dark"><div class="shell two-col"><div><h2 class="section-title small">What changed and why.</h2></div><div class="prose"><p>Explain the delivered workflow, key design and engineering decisions, and any supported integrations. Name technologies only when they are verified for the project.</p><div class="product-categories"><span>Verified technology</span><span>Verified technology</span></div></div></div></section>
    <section class="section section-soft"><div class="shell"><div class="work-visual"><div class="work-frame" data-tilt="5"><div class="work-frame-inner">PROJECT SCREENSHOT 01</div></div></div></div></section>${finalCta()}`;
}

function productsPage() {
  return `${pageHero({ label: "Products", title: "Software, when it's ready to work.", intro: "A directory for ready-to-use products and future product categories. No product is marked available until the service, support, account, and commercial experience actually exist." })}
    <section class="section"><div class="shell"><div class="directory-grid">${productCategories.map((product, index) => `<div class="directory-item ${index === 0 ? "primary" : ""} reveal"><article class="directory-card ${index === 0 ? "primary" : ""}" data-tilt="2"><div><span class="status-chip">${product.status}</span><h${index === 0 ? "2" : "3"}>${product.name}</h${index === 0 ? "2" : "3"}><p>${product.description}</p></div>${product.slug ? link(`/products/${product.slug}/`, "View concept details", "text-link") : `<span class="page-code">Not currently available</span>`}</article></div>`).join("")}</div></div></section>
    <section class="section section-soft"><div class="shell two-col"><div><h2 class="section-title small">Architecture before promotion.</h2></div><div class="prose"><p>When an eligible product is ready, its trial and subscription model should define eligibility, server-enforced entitlements, verification, billing, cancellation, notifications, renewal, and data handling as one coherent experience.</p><p>Until then, the useful action is a product conversation or an honest early-access request—not a simulated checkout.</p>${link("/legal/saas-subscription-terms/", "Review the subscription draft", "text-link")}</div></div></section>${finalCta()}`;
}

function productDetailPage(product) {
  return `${pageHero({ label: product.status, title: product.name, intro: product.description, code: "No public release yet", crumbs: [{ label: "Products", href: "/products/" }, { label: product.name }] })}
    <section class="section"><div class="shell two-col"><div><h2 class="section-title small">Who it could help</h2></div><div class="prose"><p>${product.audience}</p><p class="verified-note">This is a product direction, not an available or contracted feature set.</p></div></div></section>
    <section class="section section-dark"><div class="shell"><div class="section-heading-row"><div><h2 class="section-title small">Product direction</h2></div><p class="section-lede">These areas indicate the problem space. Final capabilities depend on validation and release decisions.</p></div><div class="use-case-grid">${product.features.map((feature) => `<div class="use-case reveal">${feature}</div>`).join("")}</div></div></section>
    <section class="section"><div class="shell two-col"><div><h2 class="section-title small">No public trial yet.</h2></div><div class="prose"><p>Pricing, plans, screenshots, account creation, email verification, trial duration, billing, and support details have not been finalized. The site does not collect payment information or create product accounts.</p>${button("/contact/", "Request an early conversation")}</div></div></section>
    <section class="section section-soft"><div class="shell"><h2 class="section-title small">What is available today?</h2>${faqList([["Can I start a free trial?", "No. This product is not currently offered as a public trial."], ["Is pricing available?", "Pricing will be published when the product and offer are ready."], ["Can I describe a workflow?", "Yes. Use the project planner to prepare your requirements and check current contact availability."]])}</div></section>${finalCta()}`;
}

function aboutPage() {
  const values = [
    ["Understand before prescribing", "Good software begins with the decisions, people, constraints, and exceptions behind the request."],
    ["Keep the system legible", "Clear interfaces and maintainable code help the product remain useful after the first release."],
    ["Tell the truth about readiness", "A concept, prototype, integration, and production system are different things—and should be described that way."],
    ["Make progress observable", "Explicit scope, visible trade-offs, and testable increments create better working relationships."],
    ["Respect operational reality", "A technically elegant answer still fails if it ignores the people and conditions around the workflow."],
    ["Build toward ownership", "Documentation, structure, and sensible technology choices reduce unnecessary dependence."]
  ];
  return `${pageHero({ label: "About A&M", title: "About A&M", intro: "A&M Tech Solutions builds websites, applications, and operational systems for teams that need technology to do a real job." })}
    <section class="section"><div class="shell about-statement"><div></div><p>We turn complex business needs into digital products that are clear enough to use, strong enough to rely on, and sensible enough to maintain.</p></div></section>
    <section class="section section-dark"><div class="shell two-col"><div><h2 class="section-title small">Who we work with</h2></div><div class="prose"><p>We work toward solutions for startups, small businesses, growing companies, and established organisations. Some need a website that explains the business properly. Others need a customer portal, a CRM shaped around their sales process, or an operational system that replaces fragmented records.</p><p>The common thread is not company size. It is a meaningful business problem and a willingness to make the workflow clearer.</p></div></div></section>
    <section class="section"><div class="shell"><div class="section-heading-row"><div><h2 class="section-title small">How we work together</h2></div><p class="section-lede">A practical foundation for design, engineering, communication, and long-term product decisions.</p></div><div class="principles">${values.map(([title, copy]) => `<article class="principle reveal"><div class="principle-surface" data-tilt="3"><h3>${title}</h3><p>${copy}</p></div></article>`).join("")}</div></div></section>
    <section class="section section-accent"><div class="shell vision-line"><div><p>Founder and team profiles can be added here when verified details are ready for publication.</p></div><blockquote>Build a company known for useful software and straightforward partnerships.</blockquote></div></section>${finalCta()}`;
}

function contactPage() {
  const delivery = config.contactEndpoint
    ? 'Send your project brief using the secure form below.'
    : config.contactEmail ? `Online sending is not available yet. Email <a href="mailto:${escapeHtml(config.contactEmail)}">${escapeHtml(config.contactEmail)}</a>, or copy your brief below.`
    : 'Online enquiries are not available yet. You can draft and copy your project brief below; nothing is sent or saved by this page.';
  return `${pageHero({ label: contactReady ? "Start a project" : "Project planner", title: "Plan your project", intro: "Describe the problem, the people it affects, and the result you need. A short, specific brief is a useful place to begin." })}
  <section class="section"><div class="shell contact-layout"><aside class="contact-aside"><div><h2>Start with the problem</h2><p>Share what is happening now, which parts take the most effort, and what would make a difference. You do not need to choose a technology first.</p></div><p class="contact-status">${config.contactEmail ? `<a href="mailto:${escapeHtml(config.contactEmail)}">${escapeHtml(config.contactEmail)}</a>` : "Business contact details: coming soon"}</p></aside>
  <form id="project-form" aria-describedby="delivery-note"><div class="brief-progress" data-brief-progress hidden><div><label for="brief-progress-meter">Your brief, taking shape</label><span data-brief-count>0 of 4 essentials</span></div><progress id="brief-progress-meter" max="4" value="0">0 of 4 essentials</progress><p>Name, valid email, service, and a description of at least 30 characters.</p></div><p id="delivery-note" class="delivery-note">${delivery}</p>
    <div class="form-grid">
      ${formField("name", "Name", "text", true, "Your name")}
      ${formField("email", "Email", "email", true, "you@business.com")}
      ${formField("company", "Company name", "text", false, "Optional")}
      <div class="field"><label for="service">Service required <span aria-hidden="true">*</span></label><select id="service" name="service" required aria-describedby="service-error"><option value="">Select a service</option>${services.map(service => `<option value="${service.slug}">${service.title}</option>`).join("")}<option value="not-sure">Not sure yet</option></select><p class="field-error" id="service-error"></p></div>
      <div class="field"><label for="budget">Project budget range</label><select id="budget" name="budget"><option value="">Prefer not to say</option><option>Not decided yet</option><option>Under ₹1 lakh</option><option>₹1–3 lakh</option><option>₹3–8 lakh</option><option>₹8 lakh+</option></select></div>
      <div class="field"><label for="contactMethod">Preferred contact method</label><select id="contactMethod" name="contactMethod"><option>Email</option><option>Phone or video call (arranged by email)</option></select></div>
      <div class="field field-full"><label for="description">Project description <span aria-hidden="true">*</span></label><textarea id="description" name="description" required minlength="30" maxlength="4000" aria-describedby="description-help description-error" placeholder="What is happening now, who is affected, and what would a useful result look like?"></textarea><small id="description-help">30–4,000 characters. Please leave out passwords and sensitive personal information.</small><p class="field-error" id="description-error"></p></div>
      <div class="hp-field" aria-hidden="true"><label for="website">Leave this field empty</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
    </div>
    <input type="hidden" name="formStartedAt" value="" />
    <div class="form-actions"><button class="button" type="submit" disabled aria-describedby="delivery-note" data-send>${config.contactEndpoint ? "Send project inquiry" : "Sending unavailable"}</button><button class="button button-ghost" type="button" id="copy-inquiry" disabled>Copy project brief</button></div>
    <noscript><p class="form-note">JavaScript is needed to copy or send this form. You can still write your brief here and copy it manually. No information will be submitted.</p></noscript>
    <p class="form-note">Required fields are marked *. ${config.publishLegal ? link("/legal/privacy-policy/", "How we handle your information") : "Only use this form for information you are comfortable sharing about the project."}</p>
    <div id="form-status" class="form-status" role="status" aria-live="polite" aria-atomic="true"></div>
    <div id="copy-fallback" class="copy-fallback" hidden><label for="brief-text">Your project brief — select and copy this text</label><textarea id="brief-text" readonly rows="12"></textarea></div>
  </form></div></section>`;
}

function formField(name, label, type, required, placeholder) {
  return `<div class="field"><label for="${name}">${label}${required ? ' <span aria-hidden="true">*</span>' : ""}</label><input id="${name}" name="${name}" type="${type}" ${required ? "required" : ""} maxlength="180" aria-describedby="${name}-error" placeholder="${placeholder}" autocomplete="${name === "name" ? "name" : name === "email" ? "email" : "organization"}" /><p class="field-error" id="${name}-error"></p></div>`;
}

function legalPage(slug, page) {
  const effective = escapeHtml(config.effectiveDate || "Effective date to be confirmed");
  return `${pageHero({ label: config.publishLegal ? "Policies" : "Legal draft", title: page.title, intro: page.intro, code: effective, crumbs: [{ label: "Legal" }, { label: page.title }] })}
    <section class="section"><div class="shell legal-layout"><nav class="legal-toc" aria-label="On this page"><h2>On this page</h2>${page.sections.map(([title], index) => `<a href="#section-${index + 1}">${title.replace(/^\d+\.\s*/, "")}</a>`).join("")}</nav><article>${config.publishLegal ? `<p class="verified-note">${escapeHtml(config.companyLegalName)} · ${escapeHtml(config.jurisdiction)} · ${escapeHtml(config.contactEmail)}</p>` : `<div class="draft-banner">Draft requiring legal review. Company identity, jurisdiction, contact information, and commercial commitments have not been confirmed.</div>`}${page.sections.map(([title, copy], index) => `<section class="legal-section" id="section-${index + 1}" tabindex="-1"><h2>${title}</h2><p>${copy}</p></section>`).join("")}</article></div></section>`;
}

function finalCta() {
  return `<section class="section cta-section"><div class="shell"><div class="cta-panel reveal"><div><h2>Plan your project</h2><p>Start with the workflow, the people, and the outcome. Put your project into words with a short brief.</p></div><div class="button-row">${button("/contact/", contactReady ? "Let's Talk" : "Plan a Project")}${link("/services/", "Explore services", "text-link")}</div></div></div></section>`;
}

function notFoundPage() {
  return `<section class="not-found"><div class="shell not-found-grid"><div class="reveal"><p class="page-code">Page not found</p><h1>404</h1><p>The route may have moved, or it may not exist yet.</p>${button("/", "Return home")}</div><div class="lost-scene reveal"><div class="lost-card" data-tilt="5">${depthMark()}<span class="page-code">A new direction awaits</span></div></div></div></section>`;
}


  const renderers = { home: homePage, services: servicesPage, service: () => serviceDetailPage(route.data), solutions: solutionsPage, work: workPage, workTemplate: workTemplatePage, products: productsPage, product: () => productDetailPage(route.data), about: aboutPage, contact: contactPage, legal: () => legalPage(route.path, route.data), notFound: notFoundPage };
  const preview = !isPublished(route, config) && route.kind !== "notFound" ? '<div class="preview-banner" role="note">Content preview — details are being prepared. This page is excluded from search indexing.</div>' : '';
  return { route, html: layout(preview + renderers[route.kind](), route.path) };
}
