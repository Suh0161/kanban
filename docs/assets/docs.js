// Jokel docs — shared interactions

// ---------- Copy buttons on code blocks ----------
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  const block = btn.closest('.code');
  const code = block && block.querySelector('pre code');
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code.textContent);
    const original = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = original;
    }, 1600);
  } catch {
    btn.textContent = 'Press Ctrl+C';
  }
});

// ---------- Cursor-tracked spotlight on cards ----------
document.querySelectorAll('.card').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', e.clientX - rect.left + 'px');
    card.style.setProperty('--my', e.clientY - rect.top + 'px');
  });
});

// ---------- Scroll-spy for sidebar sublinks (guides) ----------
(function () {
  const sublinks = document.querySelectorAll('.sidebar-sublink[data-target]');
  if (!sublinks.length) return;

  const targets = Array.from(sublinks)
    .map((a) => ({ link: a, el: document.getElementById(a.dataset.target) }))
    .filter((x) => x.el);

  if (!targets.length) return;

  const setActive = (id) => {
    sublinks.forEach((l) => l.classList.toggle('active', l.dataset.target === id));
  };

  // Anchor line ~25% from the top of the viewport. The section whose
  // top has crossed the anchor — but whose successor hasn't — is active.
  const anchorOffset = () => Math.max(120, window.innerHeight * 0.25);

  const update = () => {
    const anchor = anchorOffset();

    // If we're at the very bottom of the page, the last section owns it.
    const scrollBottom = window.innerHeight + window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    if (docHeight - scrollBottom < 4) {
      setActive(targets[targets.length - 1].el.id);
      return;
    }

    // Walk through (heading, nextHeading) pairs and pick the section
    // whose [top, nextTop) range contains the anchor line.
    let active = targets[0].el.id;
    for (let i = 0; i < targets.length; i++) {
      const top = targets[i].el.getBoundingClientRect().top;
      const nextTop =
        i + 1 < targets.length
          ? targets[i + 1].el.getBoundingClientRect().top
          : Infinity;
      if (top <= anchor && anchor < nextTop) {
        active = targets[i].el.id;
        break;
      }
    }
    setActive(active);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
