/* ============================================================
   KIMI TECHNOLOGIES — app.js
   Shared behaviour: theme, drawer, tabs, reveal, page transitions
   ============================================================ */
(function () {
  'use strict';

  var doc = document.documentElement;
  var header = document.getElementById('siteHeader');
  var drawer = document.getElementById('drawer');
  var scrim = document.getElementById('drawerScrim');
  var menuBtn = document.getElementById('menuBtn');
  var themeToggle = document.getElementById('themeToggle');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------
     THEME
     ------------------------------------------------------------ */
  function applyTheme(t) {
    doc.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#08090c' : '#ffffff');
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('kt-theme', next); } catch (e) {}
    });
  }

  /* ------------------------------------------------------------
     HEADER STATE
     ------------------------------------------------------------ */
  function onScroll() {
    if (header) header.classList.toggle('is-stuck', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------
     DRAWER
     ------------------------------------------------------------ */
  var lastFocus = null;

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    drawer.removeAttribute('aria-hidden');
    scrim.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    header.classList.add('is-open');
    document.body.classList.add('no-scroll');
    var first = drawer.querySelector('a, button');
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 220);
  }

  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    header.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      if (drawer.classList.contains('is-open')) closeDrawer(); else openDrawer();
    });
  }
  if (scrim) scrim.addEventListener('click', closeDrawer);
  var drawerClose = document.getElementById('drawerClose');
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });

  /* ------------------------------------------------------------
     REVEAL ON SCROLL
     ------------------------------------------------------------ */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var pending = revealEls.slice();

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
          var at = pending.indexOf(entry.target);
          if (at > -1) pending.splice(at, 1);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    revealEls.forEach(function (el) { io.observe(el); });

    // Safety net: a fast flick can jump past a block before the observer
    // samples it. Anything now sitting above the fold gets revealed anyway.
    var queued = false;
    var sweep = function () {
      queued = false;
      for (var i = pending.length - 1; i >= 0; i--) {
        var el = pending[i];
        if (el.getBoundingClientRect().top < window.innerHeight + 120) {
          el.classList.add('in');
          io.unobserve(el);
          pending.splice(i, 1);
        }
      }
    };
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(sweep);
    }, { passive: true });
    window.addEventListener('resize', sweep, { passive: true });
    setTimeout(sweep, 400);
  }

  /* ------------------------------------------------------------
     PRICING TABS
     ------------------------------------------------------------ */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));

  function selectTab(name) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      var panel = document.getElementById('panel-' + t.getAttribute('data-tab'));
      if (panel) {
        panel.classList.toggle('is-active', on);
        if (on) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
      }
    });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab.getAttribute('data-tab')); });
    tab.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      selectTab(next.getAttribute('data-tab'));
    });
  });

  // open a specific tab if the URL asks for one
  (function () {
    var m = /[?&]tab=([a-z]+)/.exec(window.location.search);
    if (m && tabs.length) selectTab(m[1]);
  })();

  /* ------------------------------------------------------------
     PAGE TRANSITIONS
     Five different covers, rotated so consecutive clicks never
     repeat the same motion. Cover on the old page, then the new
     page reveals itself with the same motion already in place.
     ------------------------------------------------------------ */
  var POOL = ['columns', 'rise', 'disc', 'sweep', 'fade'];
  var COVER_MS = { columns: 545, rise: 545, disc: 520, sweep: 545, fade: 320 };
  var REVEAL_MS = 540;

  function nextAnim() {
    var i = 0;
    try { i = parseInt(sessionStorage.getItem('kt-anim-i') || '0', 10) || 0; } catch (e) {}
    var anim = POOL[i % POOL.length];
    var next = i + 1;
    if (next % POOL.length === 0) {
      // completed a cycle — reshuffle so the order never settles
      next = Math.floor(Math.random() * POOL.length);
    }
    try { sessionStorage.setItem('kt-anim-i', String(next)); } catch (e) {}
    return anim;
  }

  function clearPT() {
    doc.classList.remove('pt-enter', 'pt-reveal', 'pt-cover');
    doc.removeAttribute('data-anim');
    doc.style.removeProperty('--ox');
    doc.style.removeProperty('--oy');
  }

  function setOrigin(x, y) {
    doc.style.setProperty('--ox', x + 'px');
    doc.style.setProperty('--oy', y + 'px');
  }

  var navigating = false;

  function leaveTo(url, x, y) {
    if (navigating) return;
    navigating = true;

    var anim = nextAnim();
    setOrigin(x, y);
    doc.setAttribute('data-anim', anim);

    var stored = true;
    try {
      sessionStorage.setItem('kt-nav', JSON.stringify({ a: anim, x: Math.round(x), y: Math.round(y) }));
    } catch (e) { stored = false; }

    // no storage (file:// or a locked-down browser): skip the curtain so the
    // new page cannot arrive with nothing to lift it
    if (!stored) { window.location.href = url; return; }

    // force the starting state to be painted before the cover class lands
    void doc.offsetWidth;
    doc.classList.add('pt-cover');

    var wait = COVER_MS[anim] || 520;
    setTimeout(function () { window.location.href = url; }, wait);
  }

  /* --- arriving: reveal the new page --- */
  function revealPage() {
    if (!doc.classList.contains('pt-enter')) return;
    setTimeout(function () {
      doc.classList.add('pt-reveal');
      setTimeout(function () {
        clearPT();
        navigating = false;
      }, REVEAL_MS);
    }, 40);
  }

  if (doc.classList.contains('pt-enter')) {
    if (reduce) { clearPT(); }
    else {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        revealPage();
      } else {
        document.addEventListener('DOMContentLoaded', revealPage);
      }
      // failsafe: never let the curtain stay up
      setTimeout(clearPT, 2600);
    }
  }

  // back / forward from bfcache — drop any stale curtain
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { clearPT(); navigating = false; }
  });

  /* --- prefetch on hover so the reveal feels instant --- */
  var prefetched = {};
  function prefetch(href) {
    if (prefetched[href]) return;
    prefetched[href] = true;
    var l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = href;
    l.as = 'document';
    document.head.appendChild(l);
  }

  document.addEventListener('mouseover', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || a.target === '_blank') return;
    if (a.origin && a.origin !== window.location.origin) return;
    prefetch(a.href);
  });

  /* --- intercept internal navigation --- */
  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;

    var href = a.getAttribute('href');
    if (!href) return;

    // in-page anchor
    if (href.charAt(0) === '#') {
      if (href.length > 1) {
        var el = document.getElementById(href.slice(1));
        if (el) {
          e.preventDefault();
          closeDrawer();
          el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }
      }
      return;
    }

    if (a.target === '_blank' || a.hasAttribute('download')) return;
    if (a.origin !== window.location.origin) return;

    var dest = a.href;
    var here = window.location.href.split('#')[0];
    if (dest.split('#')[0] === here) return; // same page, nothing to animate

    e.preventDefault();
    closeDrawer();
    if (reduce) { window.location.href = dest; return; }
    leaveTo(dest, e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2);
  });

  /* ------------------------------------------------------------
     SMALL TOUCHES
     ------------------------------------------------------------ */
  // current year in the footer
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
