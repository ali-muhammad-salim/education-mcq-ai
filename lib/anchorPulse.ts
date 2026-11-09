const PULSE_CLASS = "anchor-pulse";
const POLL_MS = 160;
const SETTLE_ATTEMPTS = 2;
const MAX_WAIT_MS = 6000;

function stickyOffset() {
  const nav = document.querySelector("nav.site-nav");
  if (nav) {
    const rect = nav.getBoundingClientRect();
    if (getComputedStyle(nav).position === "sticky" && rect.height > 0) return rect.height + 12;
  }
  return 88;
}

function desiredViewportTop(el: HTMLElement, block: ScrollLogicalPosition) {
  if (block === "center") {
    return Math.max(stickyOffset(), (window.innerHeight - el.getBoundingClientRect().height) / 2);
  }
  return stickyOffset();
}

/** Scrolls the element with this id into view and pulses it three times. */
export function scrollAndPulse(id: string, block: ScrollLogicalPosition = "start") {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove(PULSE_CLASS);

  const start = performance.now();
  let nearCount = 0;
  let timer = 0;
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
  window.addEventListener("wheel", cancel, { once: true, passive: true });
  window.addEventListener("touchstart", cancel, { once: true, passive: true });

  const pulse = () => {
    el.classList.add(PULSE_CLASS);
    el.addEventListener("animationend", () => el.classList.remove(PULSE_CLASS), { once: true });
  };

  const step = () => {
    if (cancelled) return;
    const elapsed = performance.now() - start;
    const delta = el.getBoundingClientRect().top - desiredViewportTop(el, block);
    if (Math.abs(delta) < 4) {
      nearCount += 1;
      if (nearCount >= SETTLE_ATTEMPTS || elapsed > MAX_WAIT_MS) {
        pulse();
        return;
      }
    } else {
      nearCount = 0;
      // Glide on the first attempt; correct instantly once routing has settled.
      window.scrollTo({
        top: Math.max(0, window.scrollY + delta),
        behavior: elapsed < POLL_MS * 2 ? "smooth" : "instant",
      });
    }
    if (elapsed > MAX_WAIT_MS) {
      pulse();
      return;
    }
    timer = window.setTimeout(step, POLL_MS);
  };

  step();
}
