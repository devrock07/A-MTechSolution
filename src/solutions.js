import { motionTime } from "./motion.js";

export function setupWorkflowPreview() {
  document.querySelectorAll("[data-workflow-preview]").forEach(setupPreview);
}

function setupPreview(preview) {
  const buttons = [...preview.querySelectorAll("[data-workflow-select]")];
  const panels = [...preview.querySelectorAll("[data-workflow-panel]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const status = preview.querySelector("[data-workflow-status]");
  let transition;
  function select(id, announce = false) {
    transition?.cancel();
    buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.workflowSelect === id)));
    panels.forEach(panel => { panel.hidden = panel.id !== id; });
    const current = panels.find(panel => !panel.hidden);
    if (announce) status.textContent = `${current.querySelector("h2").textContent} Preview shown.`;
    if (announce && !reduced.matches && current.animate) {
      transition = current.querySelector(".workflow-steps").animate([
        { opacity: 0.2, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0)" }
      ], { duration: motionTime("--workflow-switch-duration", 280), easing: "ease-out" });
    }
  }
  buttons.forEach(button => button.addEventListener("click", () => select(button.dataset.workflowSelect, true)));
  reduced.addEventListener("change", () => { if (reduced.matches) transition?.cancel(); });
  select(buttons[0].dataset.workflowSelect);
  preview.classList.add("workflow-enhanced");
}
