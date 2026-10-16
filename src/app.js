import config from "../site-config.js";
import { setupProjectForm } from "./contact.js";
import { setupMotion } from "./motion.js";
import { setupWorkflowPreview } from "./solutions.js";
import { setupExperience } from "./experience.js";
import { setupMotionAccents } from "./motion-accents.js";

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#primary-navigation");
const desktop = window.matchMedia("(min-width: 961px)");
const background = [...document.querySelectorAll("main, .site-footer")];

function setMenu(open, restoreFocus = false) {
  if (!toggle || !nav) return;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  nav.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
  background.forEach(element => { element.inert = open; });
  // Safari does not necessarily focus buttons on pointer activation.
  if (open || restoreFocus) toggle.focus({ preventScroll: true });
}

toggle?.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
nav?.addEventListener("click", event => {
  if (event.target.closest("a")) setMenu(false);
});

document.addEventListener("keydown", event => {
  if (toggle?.getAttribute("aria-expanded") !== "true") return;
  if (event.key === "Escape") {
    event.preventDefault();
    setMenu(false, true);
  } else if (event.key === "Tab") {
    const controls = [toggle, ...nav.querySelectorAll("a[href]")];
    const current = controls.indexOf(document.activeElement);
    const next = current < 0 ? 0 : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    event.preventDefault();
    controls[next].focus();
  }
});

desktop.addEventListener("change", event => { if (event.matches) setMenu(false); });
// A page restored from the back/forward cache must not retain a scroll lock.
window.addEventListener("pageshow", () => setMenu(false));
window.addEventListener("pagehide", () => setMenu(false));

const form = document.querySelector("#project-form");
if (form) setupProjectForm(form, config);
document.documentElement.classList.add("js");
setupWorkflowPreview();
setupExperience();
setupMotion();
setupMotionAccents();
