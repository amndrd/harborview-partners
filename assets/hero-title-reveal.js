/* Titre hero « Grow Your Business / to New Heights ».
 *
 * Ce titre est hors du système d'animation du thème (voir le CSS embarqué dans
 * index.html) : on gère ici son apparition, un balayage par ligne.
 *
 * Réglages repris à l'identique de l'animation du thème (celle qui anime la
 * description juste en dessous) : --bg-progress 30 -> 100, 1200 ms,
 * power1.inOut, 100 ms de décalage entre les lignes.
 *
 * GSAP n'étant pas exposé par le bundle, tout est en requestAnimationFrame.
 */
(function () {
  'use strict';

  var DUR = 1200;               // durée d'un balayage
  var LINE_STAGGER = 100;       // décalage d'une ligne à la suivante
  var FROM = 30;                // --bg-progress de départ
  var FALLBACK = 20000;         // filet : on révèle même si le signal manque
  var DONE_ATTR = 'data-nh-revealed';

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

  /* Apparition du titre, au même rythme que la description en dessous.
   * Le drapeau est posé sur le titre lui-même, pas dans le module : après une
   * navigation Barba le titre est un élément neuf, qui doit réapparaître. */
  function reveal(title) {
    if (title.hasAttribute(DONE_ATTR)) return;
    title.setAttribute(DONE_ATTR, '');
    var lines = title.querySelectorAll('.nh-line');
    if (!lines.length) return;
    for (var i = 0; i < lines.length; i++) {
      lines[i].style.setProperty('--color-final', inheritedColor(lines[i]));
    }
    run(lines, LINE_STAGGER, function () {
      for (var k = 0; k < lines.length; k++) lines[k].classList.add('is-done');
    });
  }

  /* Déclencheur : le titre doit apparaître avec le reste du hero. On se cale
   * sur le démarrage réel du balayage du bandeau « One operator » — l'attribut
   * data-init-hidden, lui, est retiré ~400 ms trop tôt.
   *
   * La recherche est bornée au conteneur reçu : pendant une transition Barba
   * les deux pages coexistent, et le bandeau de la page sortante donnerait un
   * signal déjà consommé. */
  function boot(root) {
    var title = root.querySelector('.need-help-title');
    if (!title) return;                // page sans hero d'accueil
    var t0 = performance.now();
    (function watch() {
      var ref = root.querySelector('.home-hero-label .txt .split-line') ||
                root.querySelector('.home-hero-desc .txt .split-line');
      if (ref && parseFloat(ref.style.getPropertyValue('--bg-progress')) > FROM) {
        reveal(title);
        return;
      }
      if (performance.now() - t0 > FALLBACK) { reveal(title); return; }
      requestAnimationFrame(watch);
    })();
  }

  /* Le site navigue avec Barba : chaque page remplace le conteneur, sans
   * recharger la page ni ce script. Le titre de la page d'accueil revient donc
   * neuf, à --bg-progress 30, c'est-à-dire invisible — c'est ce qu'on voyait en
   * revenant par le logo. On surveille le wrapper pour relancer l'apparition
   * sur chaque conteneur entrant. */
  function watchNavigation() {
    var wrapper = $('[data-barba="wrapper"]');
    if (!wrapper || !window.MutationObserver) return;
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType === 1) boot(added[j]);
        }
      }
    }).observe(wrapper, { childList: true });
  }

  function start() {
    watchNavigation();
    var first = boot.bind(null, document);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(first);
    } else {
      first();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
