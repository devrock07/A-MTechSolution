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
  let paused = false;
  try { paused = sessionStorage.getItem("am-motion-paused") === "true"; } catch { /* Optional preference. */ }
  const motionAllowed = () => !reduced.matches && !paused;
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
  reduced.addEventListener("change", () => { if (reduced.matches) finishMotion(); });
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
        if (!motionAllowed() || revealed.has(element) || element.contains(document.activeElement)) return;
        revealed.add(element);
        const animation = element.animate([
          { opacity: 0, transform: "translateY(20px)" },
          { opacity: 1, transform: "translateY(0)" }
        ], { duration, delay: Math.min(index, 3) * stagger, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" });
        active.set(element, animation);
        animation.finished.catch(() => {}).finally(() => active.delete(element));
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px" });
    document.querySelectorAll(".reveal").forEach(element => {
      const bounds = element.getBoundingClientRect();
      // Never hide content already painted in the initial/restored viewport.
      if (bounds.top < innerHeight && bounds.bottom > 0 && !element.closest("[hidden]")) revealed.add(element);
      else observer.observe(element);
    });
  }

  // Only active surfaces participate in global resets, even on a long directory.
  const tilting = new Set();
  const resetTilts = () => tilting.forEach(reset => reset());
  for (const event of ["pagehide", "resize", "scroll"]) window.addEventListener(event, resetTilts, { passive: true });
  reduced.addEventListener("change", resetTilts);
  finePointer.addEventListener("change", resetTilts);
  document.querySelectorAll("[data-tilt]").forEach(element => {
    let bounds;
    let frame = 0;
    let x = 0;
    let y = 0;
    const strength = Number(element.dataset.tilt);
    const max = Number.isFinite(strength) ? Math.max(0, Math.min(10, strength)) : 4;
    const reset = () => {
      if (!bounds && !frame && !element.classList.contains("is-tilting")) return;
      cancelAnimationFrame(frame);
      frame = 0;
      bounds = undefined;
      element.style.removeProperty("--tilt-x");
      element.style.removeProperty("--tilt-y");
      element.classList.remove("is-tilting");
      tilting.delete(reset);
    };
    element.addEventListener("pointermove", event => {
      if (!motionAllowed() || !finePointer.matches || event.pointerType !== "mouse" || max === 0) return;
      // Measure the stable scene, not the rotating surface under the pointer.
      bounds ||= element.parentElement.getBoundingClientRect();
      tilting.add(reset);
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
  });

  // Compositor animations own translate/rotate; pointer tilt owns transform.
  // Separate properties avoid competing transforms or a perpetual JS render loop.
  if ("IntersectionObserver" in window && CSS.supports("translate", "0 1px")) {
    const scenes = ".studio-board, .workflow-board, .work-frame";
    const objects = ".depth-mark, .studio-sculpture";
    const layers = ".studio-floating, .workflow-board .workflow-steps li";
    for (const [selector, kind] of [[scenes, "scene"], [objects, "object"], [layers, "layer"]]) {
      document.querySelectorAll(selector).forEach(element => { element.dataset.drift = kind; });
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => target.toggleAttribute("data-motion-active", isIntersecting));
    }, { threshold: 0.05 });
    document.querySelectorAll("[data-drift]").forEach(element => observer.observe(element));
    root.classList.add("motion-ready");
    const toggle = document.querySelector(".motion-toggle");
    const syncPreference = () => {
      root.toggleAttribute("data-motion-paused", paused);
      if (!motionAllowed()) { finishMotion(); resetTilts(); }
      if (toggle) {
        toggle.hidden = false;
        toggle.disabled = reduced.matches;
        const label = reduced.matches ? "Reduced motion enabled" : paused ? "Resume motion" : "Pause motion";
        toggle.setAttribute("aria-label", label);
        toggle.title = label;
        toggle.firstElementChild.textContent = paused || reduced.matches ? "▷" : "Ⅱ";
      }
      document.dispatchEvent(new Event("motionpreferencechange"));
    };
    toggle?.addEventListener("click", () => {
      paused = !paused;
      try { sessionStorage.setItem("am-motion-paused", String(paused)); } catch { /* Optional preference. */ }
      syncPreference();
    });
    const syncVisibility = () => root.toggleAttribute("data-motion-suspended", document.hidden);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("pagehide", () => root.setAttribute("data-motion-suspended", ""));
    window.addEventListener("pageshow", syncVisibility);
    reduced.addEventListener("change", syncPreference);
    syncPreference();
    syncVisibility();
  }
}
