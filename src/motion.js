export function motionTime(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const milliseconds = parseFloat(value) * (value.endsWith("s") && !value.endsWith("ms") ? 1000 : 1);
  return Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : fallback;
}

// Motion is an enhancement: no CSS rule hides waiting reveal content.
export function setupMotion() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const root = document.documentElement;
  const active = new Map();
  const revealed = new WeakSet();
  const duration = motionTime("--reveal-duration", 550);
  const stagger = motionTime("--reveal-stagger", 70);
  const dismissEntrance = () => { delete root.dataset.entrance; };
  const finishMotion = () => {
    dismissEntrance();
    active.forEach(animation => animation.cancel());
    active.clear();
  };
  for (const event of ["pointerdown", "keydown", "wheel", "touchstart"]) {
    window.addEventListener(event, dismissEntrance, { passive: true });
  }
  document.querySelector(".brand-entrance")?.addEventListener("animationend", event => {
    if (event.target.classList.contains("brand-entrance")) dismissEntrance();
  });
  window.addEventListener("pagehide", finishMotion);
  window.addEventListener("pageshow", event => { if (event.persisted) finishMotion(); });
  document.addEventListener("focusin", event => {
    const element = event.target.closest(".reveal");
    active.get(element)?.cancel();
    if (element) revealed.add(element);
  });

  if ("IntersectionObserver" in window && Element.prototype.animate) {
    const observer = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting && !entry.target.closest("[hidden]")).forEach((entry, index) => {
        const element = entry.target;
        observer.unobserve(element);
        if (reduced.matches || revealed.has(element) || element.contains(document.activeElement)) return;
        revealed.add(element);
        const animation = element.animate([
          { opacity: 0, transform: "translateY(20px)" },
          { opacity: 1, transform: "translateY(0)" }
        ], { duration, delay: Math.min(index, 3) * stagger, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" });
        active.set(element, animation);
        animation.finished.catch(() => {}).finally(() => active.delete(element));
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px" });
    document.querySelectorAll(".reveal").forEach(element => observer.observe(element));
    reduced.addEventListener("change", () => { if (reduced.matches) finishMotion(); });
  }

  document.querySelectorAll("[data-tilt]").forEach(element => {
    let bounds;
    let frame = 0;
    let x = 0;
    let y = 0;
    const max = Number(element.dataset.tilt) || 4;
    const reset = () => {
      if (!bounds && !frame && !element.classList.contains("is-tilting")) return;
      cancelAnimationFrame(frame);
      frame = 0;
      bounds = undefined;
      element.style.removeProperty("--tilt-x");
      element.style.removeProperty("--tilt-y");
      element.classList.remove("is-tilting");
    };
    element.addEventListener("pointerenter", () => { bounds = element.getBoundingClientRect(); });
    element.addEventListener("pointermove", event => {
      if (reduced.matches || !finePointer.matches || event.pointerType !== "mouse") return;
      bounds ||= element.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      if (frame) return;
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--tilt-x", `${(-y * max).toFixed(2)}deg`);
        element.style.setProperty("--tilt-y", `${(x * max).toFixed(2)}deg`);
        element.classList.add("is-tilting");
        frame = 0;
      });
    }, { passive: true });
    for (const event of ["pointerleave", "pointercancel", "focusin"]) element.addEventListener(event, reset);
    for (const event of ["pagehide", "resize", "scroll"]) window.addEventListener(event, reset, { passive: true });
    reduced.addEventListener("change", reset);
    finePointer.addEventListener("change", reset);
  });
}
