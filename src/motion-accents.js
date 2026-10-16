// Decorative video is opt-in by device capability, never a mobile download.
// The original CSS illustration remains the no-JS, reduced-motion and error fallback.
export function setupMotionAccents() {
  if (!("IntersectionObserver" in window)) return;
  const desktop = matchMedia("(min-width: 961px) and (hover: hover) and (pointer: fine)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator.connection;
  const states = new Map();
  const eligible = () => desktop.matches && !reduced.matches && !connection?.saveData;

  function unload(state) {
    state.video.pause();
    if (state.video.hasAttribute("src")) {
      state.video.removeAttribute("src");
      state.video.load();
    }
    state.element.classList.remove("has-motion-media");
  }

  function update(state) {
    const visible = state.visible && !state.element.closest("[hidden]") && !document.hidden;
    if (!eligible() || state.failed) {
      unload(state);
      if (visible && !desktop.matches && !reduced.matches && !state.revealed && state.element.animate) {
        state.revealed = true;
        // Move the wrapper in 2D; leave existing child artwork and layout intact.
        state.reveal = state.element.animate([
          { translate: "0 6px", opacity: 0.65 }, { translate: "0 0", opacity: 1 }
        ], { duration: 1000, easing: "cubic-bezier(.22,1,.36,1)" });
      }
      return;
    }
    if (!visible) { state.video.pause(); return; }
    if (!state.video.hasAttribute("src")) {
      state.video.muted = true;
      state.video.src = state.video.dataset.motionSrc;
      state.video.playbackRate = Number(state.video.dataset.motionRate) || 1;
    }
    state.video.play().catch(error => {
      // If autoplay is blocked, leave the crisp CSS illustration in place.
      // Aborted play requests are expected when scrolling away or switching tabs.
      if (error.name === "NotAllowedError") { state.failed = true; unload(state); }
    });
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target);
      state.visible = entry.isIntersecting;
      update(state);
    }
  }, { threshold: 0.1 });

  document.querySelectorAll("[data-motion-accent]").forEach(element => {
    const video = element.querySelector("video");
    if (!video) return;
    const state = { element, video, visible: false, revealed: false, failed: false };
    states.set(element, state);
    video.addEventListener("loadeddata", () => {
      if (!eligible() || state.failed || !video.hasAttribute("src")) return;
      element.classList.add("has-motion-media");
    });
    video.addEventListener("error", () => { state.failed = true; unload(state); });
    // Some WebKit media backends pause after the native loop seeks to zero.
    // Resume through the same visibility/device checks, never in a hidden tab.
    video.addEventListener("seeked", () => {
      if (video.loop && video.paused && video.currentTime < 0.1) update(state);
    });
    observer.observe(element);
  });

  const refresh = () => states.forEach(state => {
    if (reduced.matches) state.reveal?.cancel();
    update(state);
  });
  desktop.addEventListener("change", refresh);
  reduced.addEventListener("change", refresh);
  connection?.addEventListener("change", refresh);
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("pagehide", () => states.forEach(state => state.video.pause()));
  window.addEventListener("pageshow", refresh);
}
