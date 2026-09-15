(() => {
  const nav = document.querySelector(".report-nav");
  if (!nav) return;
  const entries = [...nav.querySelectorAll('a[href^="#"]')]
    .map(link => ({ link, target: document.getElementById(link.hash.slice(1)) }))
    .filter(entry => entry.target)
    .sort((a, b) => a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  let current;
  let queued = false;

  function update() {
    queued = false;
    const horizontal = getComputedStyle(nav).display === "flex";
    const threshold = horizontal ? nav.getBoundingClientRect().height + 32 : 40;
    let active = entries[0];
    for (const entry of entries) {
      if (entry.target.getBoundingClientRect().top <= threshold) active = entry;
      else break;
    }
    if (Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2) {
      active = entries[entries.length - 1];
    }
    if (!active) return;
    if (active !== current) {
      current?.link.removeAttribute("aria-current");
      active.link.setAttribute("aria-current", "location");
      current = active;
    }

    // Reveal the active mobile link without scrolling the document or changing history.
    if (horizontal) {
      const item = active.link.getBoundingClientRect();
      const rail = nav.getBoundingClientRect();
      if (item.left < rail.left || item.right > rail.right) {
        nav.scrollLeft += item.left - rail.left - (rail.width - item.width) / 2;
      }
    }
  }

  function schedule() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  addEventListener("hashchange", schedule);
  addEventListener("pageshow", schedule);
  document.addEventListener("load", schedule, true);
  update();
})();
