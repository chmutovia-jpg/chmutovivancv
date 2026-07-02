(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* --- Scroll position readout (thin teal line under the taskbar) --- */
  var progress = document.querySelector('.scroll-progress');
  var ticking = false;
  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.scrollY / max : 0;
    progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* --- Typewriter on the hero eyebrow --- */
  var eyebrowText = document.getElementById('eyebrowText');
  if (eyebrowText && !reduceMotion.matches) {
    var full = eyebrowText.textContent;
    var eyebrow = eyebrowText.closest('.eyebrow');
    // Reserve the fully-typed height up front so typing never shifts layout.
    eyebrow.style.minHeight = eyebrow.offsetHeight + 'px';
    var caret = document.createElement('span');
    caret.className = 'type-caret';
    caret.setAttribute('aria-hidden', 'true');
    eyebrowText.textContent = '';
    eyebrowText.parentElement.appendChild(caret);
    var i = 0;
    var timer = setInterval(function () {
      i += 1;
      eyebrowText.textContent = full.slice(0, i);
      if (i >= full.length) clearInterval(timer);
    }, 18);
  }

  /* --- Scroll reveals: single elements + grids staggered ~50ms --- */
  var targets = [];
  function queue(el, delay) {
    el.classList.add('reveal');
    el.dataset.rd = String(delay);
    targets.push(el);
  }

  var singles = document.querySelectorAll(
    '.section .kicker, .section .sec-title, .section .lead, .section .lead-sub, ' +
    '.map-panel, .map-mobile, .contact-cta'
  );
  Array.prototype.forEach.call(singles, function (el) { queue(el, 0); });

  var grids = document.querySelectorAll('.card-grid, .stack-groups');
  Array.prototype.forEach.call(grids, function (grid) {
    Array.prototype.forEach.call(grid.children, function (child, i) {
      queue(child, i * 50);
    });
  });

  function show(el) {
    el.classList.add('inview');
    if (!reduceMotion.matches && el.animate) {
      el.animate(
        [
          { opacity: 0, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'none' }
        ],
        { duration: 450, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }
      );
    }
    // Any data bars inside the revealed element fill along with it.
    Array.prototype.forEach.call(el.querySelectorAll('.funnel'), function (f) {
      f.classList.add('inview');
    });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        var delay = reduceMotion.matches ? 0 : Number(el.dataset.rd || 0);
        if (delay > 0) {
          setTimeout(function () { show(el); }, delay);
        } else {
          show(el);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(show);
  }
})();
