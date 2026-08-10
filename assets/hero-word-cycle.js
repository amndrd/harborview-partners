/* Titre hero « Need help / with your <mot>? ».
 *
 * Ce titre est hors du système d'animation du thème (voir le CSS embarqué dans
 * index.html) : on gère ici son apparition puis le cycle des mots.
 *
 * Réglages repris à l'identique de l'animation du thème (celle qui anime la
 * description juste en dessous) : --bg-progress 30 -> 100, 1200 ms,
 * power1.inOut, 100 ms de décalage entre les lignes.
 *
 * GSAP n'étant pas exposé par le bundle, tout est en requestAnimationFrame.
 */
(function () {
  'use strict';

  var WORDS = ['business?', 'shop?', 'startup?', 'store?',
               'company?', 'brand?', 'restaurant?', 'agency?'];
  var HOLD = 3000;              // durée d'affichage d'un mot
  var DUR = 1200;               // durée d'un balayage
  var LINE_STAGGER = 100;       // décalage entre les deux lignes
  var FROM = 30;                // --bg-progress de départ
  var OUT_LEAD = 180;           // avance de la vague sortante sur l'entrante
  var FALLBACK = 20000;         // filet : on révèle même si le signal manque

  var idx = 0;
  var timer = null;
  var started = false;

  function $(sel) { return document.querySelector(sel); }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /* Couleur d'arrivée du dégradé : celle héritée du titre. On remonte, car les
   * lignes sont en color:transparent (le texte est peint par le dégradé). */
  function inheritedColor(node) {
    var n = node.parentElement;
    while (n) {
      var c = window.getComputedStyle(n).color;
      if (c && c !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c)) return c;
      n = n.parentElement;
    }
    return '#fff';
  }

  /* Anime --bg-progress de FROM à 100 sur une liste d'éléments, avec décalage. */
  function run(nodes, stagger, onDone) {
    var start = performance.now();
    (function frame(now) {
      var busy = false;
      for (var i = 0; i < nodes.length; i++) {
        var t = (now - start - i * stagger) / DUR;
        if (t < 0) { t = 0; busy = true; }
        else if (t < 1) { busy = true; }
        else { t = 1; }
        nodes[i].style.setProperty(
          '--bg-progress', (FROM + (100 - FROM) * easeInOutQuad(t)).toFixed(2));
      }
      if (busy) requestAnimationFrame(frame);
      else if (onDone) onDone();
    })(start);
  }

  /* Largeurs figées : le bloc titre sur sa ligne la plus longue, le mot sur le
   * mot le plus long. Rien ne bouge ensuite quand le mot change. */
  function setMetrics() {
    var title = $('.need-help-title');
    var wrap = $('.home-hero-text-wrap');
    var box = $('.home-hero-title');
    if (!title || !wrap || !box) return;

    var left = wrap.getBoundingClientRect().left +
               parseFloat(window.getComputedStyle(wrap).paddingLeft || 0);
    box.style.setProperty('--nh-shift', left.toFixed(2) + 'px');

    var m = document.createElement('span');
    m.setAttribute('aria-hidden', 'true');
    m.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;' +
                      'white-space:pre;left:-9999px;top:0';
    title.appendChild(m);
    m.textContent = 'Need help';
    var line = m.getBoundingClientRect().width;
    var word = 0;
    for (var i = 0; i < WORDS.length; i++) {
      m.textContent = WORDS[i];
      word = Math.max(word, m.getBoundingClientRect().width);
      m.textContent = 'with your ' + WORDS[i];
      line = Math.max(line, m.getBoundingClientRect().width);
    }
    m.parentNode.removeChild(m);
    title.style.setProperty('--nh-width', Math.ceil(line + 2) + 'px');
    var w = $('.need-help-word');
    if (w) w.style.setProperty('--nh-word-width', Math.ceil(word + 2) + 'px');
  }

  /* Passage d'un mot au suivant : la vague bleue fait la transition. À gauche
   * de la vague le nouveau mot, à droite l'ancien. */
  function next() {
    var el = $('.need-help-word');
    if (!el) return;
    var previous = WORDS[idx];
    idx = (idx + 1) % WORDS.length;
    var incoming = WORDS[idx];

    el.style.setProperty('--color-final', inheritedColor(el));
    el.textContent = '';
    var out = document.createElement('span');
    out.className = 'nh-out';
    out.textContent = previous;
    var into = document.createElement('span');
    into.className = 'nh-in';
    into.textContent = incoming;
    el.appendChild(out);
    el.appendChild(into);
    el.style.setProperty('--nh-out', FROM);
    el.style.setProperty('--bg-progress', FROM);
    el.classList.add('is-cycling');

    // deux vagues légèrement décalées : le mot sortant part le premier,
    // l'entrant le suit après OUT_LEAD
    var t0 = performance.now();
    (function frame(now) {
      var a = Math.min(1, Math.max(0, (now - t0) / DUR));
      var b = Math.min(1, Math.max(0, (now - t0 - OUT_LEAD) / DUR));
      el.style.setProperty('--nh-out',
        (FROM + (100 - FROM) * easeInOutQuad(a)).toFixed(2));
      el.style.setProperty('--bg-progress',
        (FROM + (100 - FROM) * easeInOutQuad(b)).toFixed(2));
      if (b < 1) {
        requestAnimationFrame(frame);
      } else {
        el.classList.remove('is-cycling');
        el.textContent = incoming;    // retour au texte simple, hérité en blanc
      }
    })(t0);
  }

  /* Apparition du titre, au même rythme que la description en dessous. */
  function reveal() {
    if (started) return;
    started = true;
    setMetrics();
    var lines = document.querySelectorAll('.need-help-title .nh-line');
    if (!lines.length) return;
    for (var i = 0; i < lines.length; i++) {
      lines[i].style.setProperty('--color-final', inheritedColor(lines[i]));
    }
    run(lines, LINE_STAGGER, function () {
      for (var k = 0; k < lines.length; k++) lines[k].classList.add('is-done');
      if (timer) clearInterval(timer);
      timer = setInterval(next, HOLD);
    });
  }

  /* Déclencheur : le titre doit apparaître avec le reste du hero. On se cale
   * sur le démarrage réel du balayage du bandeau « One operator » — l'attribut
   * data-init-hidden, lui, est retiré ~400 ms trop tôt. */
  function boot() {
    setMetrics();                      // positionne le bloc avant toute apparition
    var t0 = performance.now();
    (function watch() {
      var ref = $('.home-hero-label .txt .split-line') ||
                $('.home-hero-desc .txt .split-line');
      if (ref && parseFloat(ref.style.getPropertyValue('--bg-progress')) > FROM) {
        reveal();
        return;
      }
      if (performance.now() - t0 > FALLBACK) { reveal(); return; }
      requestAnimationFrame(watch);
    })();
  }

  window.addEventListener('resize', setMetrics);

  function start() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(boot);
    } else {
      boot();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
