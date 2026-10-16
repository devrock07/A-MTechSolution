// Small, local-only enhancements; all content is present in the static HTML.
export function setupExperience() {
  const directory = document.querySelector("[data-service-directory]");
  if (directory) {
    const filters = directory.querySelector(".service-filters");
    const buttons = [...filters.querySelectorAll("button")];
    const items = [...directory.querySelectorAll("[data-service-group]")];
    const status = directory.querySelector("[data-service-count]");
    buttons.forEach(button => button.addEventListener("click", () => {
      const selected = button.dataset.serviceFilter;
      buttons.forEach(control => control.setAttribute("aria-pressed", String(control === button)));
      items.forEach(item => { item.hidden = selected !== "all" && item.dataset.serviceGroup !== selected; });
      status.textContent = `${items.filter(item => !item.hidden).length} services shown. ${button.textContent}.`;
    }));
    filters.hidden = false;
  }

  const form = document.querySelector("#project-form");
  const progress = form?.querySelector("[data-brief-progress]");
  if (progress) {
    const meter = progress.querySelector("progress");
    const count = progress.querySelector("[data-brief-count]");
    const update = () => {
      const fields = ["name", "email", "service", "description"].map(name => form.elements[name]);
      const complete = fields.filter(field => {
        const value = field.value.trim();
        if (!value || (field.maxLength > 0 && value.length > field.maxLength)) return false;
        if (field.name === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        return field.name !== "description" || value.length >= 30;
      }).length;
      meter.value = complete;
      meter.textContent = `${complete} of 4 essentials`;
      count.textContent = `${complete} of 4 essentials`;
    };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    // Reset dispatches before the browser restores the fields' default values.
    form.addEventListener("reset", () => queueMicrotask(update));
    window.addEventListener("pageshow", update);
    update();
    progress.hidden = false;
  }
}
