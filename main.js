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
    var typeTimer = setInterval(function () {
      i += 1;
      eyebrowText.textContent = full.slice(0, i);
      if (i >= full.length) clearInterval(typeTimer);
    }, 18);
  }

  /* --- Count-up for % readouts (runs when their bars fill) --- */
  function countUp(valEl) {
    var m = valEl.textContent.match(/^(\d+)%$/);
    if (!m) return;
    var target = Number(m[1]);
    if (reduceMotion.matches) return;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min(1, (ts - start) / 850);
      var eased = 1 - Math.pow(1 - t, 3);
      valEl.textContent = Math.round(target * eased) + '%';
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
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
    // Data bars inside the revealed element fill, and their % values count up.
    Array.prototype.forEach.call(el.querySelectorAll('.funnel'), function (f) {
      if (f.classList.contains('inview')) return;
      f.classList.add('inview');
      Array.prototype.forEach.call(f.querySelectorAll('.funnel-val'), countUp);
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

  /* --- Scrollspy: light up the taskbar link for the section in view --- */
  var navLinks = {};
  Array.prototype.forEach.call(document.querySelectorAll('.tasknav a'), function (a) {
    navLinks[a.getAttribute('href').slice(1)] = a;
  });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        Object.keys(navLinks).forEach(function (k) {
          navLinks[k].classList.toggle('active', k === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    Array.prototype.forEach.call(document.querySelectorAll('main section'), function (sec) {
      spy.observe(sec);
    });
  }

  /* --- Cursor spotlight on cards (fine pointers only) --- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    Array.prototype.forEach.call(document.querySelectorAll('.card'), function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* --- Footer clock --- */
  var clock = document.getElementById('sysClock');
  if (clock) {
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tickClock = function () {
      var d = new Date();
      clock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* --- Command palette (Ctrl/⌘ + K) --- */
  var backdrop = document.getElementById('cmdk');
  var input = document.getElementById('cmdkInput');
  var list = document.getElementById('cmdkList');
  var empty = document.getElementById('cmdkEmpty');
  var openBtn = document.getElementById('cmdkBtn');
  var lastFocus = null;

  if (/Mac|iPhone|iPad/.test(navigator.platform || '')) {
    openBtn.textContent = '⌘K';
  }

  Array.prototype.forEach.call(list.children, function (li, i) { li.id = 'cmdk-item-' + i; });

  function visibleItems() {
    return Array.prototype.filter.call(list.children, function (li) { return !li.hidden; });
  }

  function setActive(li) {
    Array.prototype.forEach.call(list.children, function (n) {
      n.classList.remove('active');
      n.setAttribute('aria-selected', 'false');
    });
    if (li) {
      li.classList.add('active');
      li.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function filterItems(q) {
    q = q.trim().toLowerCase();
    var first = null;
    Array.prototype.forEach.call(list.children, function (li) {
      var match = li.textContent.toLowerCase().indexOf(q) !== -1;
      li.hidden = !match;
      if (match && !first) first = li;
    });
    empty.hidden = !!first;
    setActive(first);
  }

  function openPalette() {
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    input.value = '';
    filterItems('');
    input.focus();
  }

  function closePalette() {
    backdrop.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function runItem(li) {
    if (!li) return;
    var action = li.getAttribute('data-action');
    closePalette();
    if (action === 'copy') {
      var url = location.origin + location.pathname;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          var prev = openBtn.textContent;
          openBtn.textContent = 'copied ✓';
          setTimeout(function () { openBtn.textContent = prev; }, 1400);
        });
      }
    } else if (/^https?:/.test(action)) {
      window.open(action, '_blank', 'noopener');
    } else {
      var target = document.querySelector(action);
      if (target) target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
  }

  openBtn.addEventListener('click', openPalette);

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (backdrop.hidden) openPalette(); else closePalette();
    } else if (e.key === 'Escape' && !backdrop.hidden) {
      closePalette();
    }
  });

  backdrop.addEventListener('mousedown', function (e) {
    if (e.target === backdrop) closePalette();
  });

  input.addEventListener('input', function () { filterItems(input.value); });

  input.addEventListener('keydown', function (e) {
    var items = visibleItems();
    var current = list.querySelector('li.active');
    var idx = items.indexOf(current);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(items[Math.min(items.length - 1, idx + 1)] || items[0]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(items[Math.max(0, idx - 1)] || items[0]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(current);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // keep focus in the palette input
    }
  });

  list.addEventListener('click', function (e) {
    var li = e.target.closest('li[data-action]');
    if (li) runItem(li);
  });

  list.addEventListener('mousemove', function (e) {
    var li = e.target.closest('li[data-action]');
    if (li && !li.classList.contains('active')) setActive(li);
  });

  /* --- Premium pointer effects: hero tilt + magnetic CTAs (fine pointers) --- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion.matches) {
    var heroGrid = document.querySelector('.hero-grid');
    var heroVisual = document.querySelector('.hero-visual');
    if (heroGrid && heroVisual) {
      var tiltRaf = false;
      var tiltX = 0;
      var tiltY = 0;
      heroGrid.addEventListener('mousemove', function (e) {
        var r = heroVisual.getBoundingClientRect();
        tiltY = ((e.clientX - (r.left + r.width / 2)) / r.width) * 5;
        tiltX = -((e.clientY - (r.top + r.height / 2)) / r.height) * 4;
        if (!tiltRaf) {
          tiltRaf = true;
          requestAnimationFrame(function () {
            heroVisual.style.transform =
              'perspective(900px) rotateX(' + tiltX.toFixed(2) + 'deg) rotateY(' + tiltY.toFixed(2) + 'deg)';
            tiltRaf = false;
          });
        }
      });
      heroGrid.addEventListener('mouseleave', function () {
        heroVisual.style.transform = '';
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('.btn'), function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.setProperty('--tx', (((e.clientX - r.left) / r.width) - 0.5) * 8 + 'px');
        btn.style.setProperty('--ty', (((e.clientY - r.top) / r.height) - 0.5) * 6 + 'px');
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.setProperty('--tx', '0px');
        btn.style.setProperty('--ty', '0px');
      });
    });
  }
})();
