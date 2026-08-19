/* Couleur de la barre de navigation, selon ce qui passe dessous.
 *
 * La barre reste à l'écran au défilement (voir assets/header.css) : son texte
 * doit donc suivre le fond qu'elle survole. Le thème pose bien une classe
 * `on-dark`, mais ses repères étaient calés sur un en-tête qui s'escamotait, et
 * le résultat se désaccorde : mesuré sur l'accueil, texte blanc sur section
 * blanche vers 2 000 px, texte sombre sur fond noir vers 3 500 et 4 000 px.
 *
 * Le test de survol ne suffit pas à trancher : à 4 000 px, ce qui peint le noir
 * derrière la barre est une image en `pointer-events: none`, que
 * `elementsFromPoint` ne voit pas. On regarde donc ce qui est réellement peint —
 * fonds de couleur, images, vidéos et canvas — et l'on prend la dernière
 * surface dans l'ordre du document, celle qui recouvre les autres.
 *
 * Deux précautions font tenir le résultat : on ne compose que les surfaces
 * réellement peintes à cet endroit (voir peinte()), et la bascule a deux seuils
 * au lieu d'un, pour que la couleur ne tremble pas dans les zones de fondu.
 *
 * La classe posée est celle du thème : tout son habillage (texte, bouton,
 * mention de langue) suit alors sans une ligne de CSS de plus.
 */
(function () {
  'use strict';

  var PROBE = .55;              // hauteur sondée dans la rangée, en part de sa hauteur
  var MIN_SHARE = .55;          // largeur minimale d'une surface, en part de l'écran
  var VERS_CLAIR = 122;         // le texte passe en blanc sous ce fond
  var VERS_SOMBRE = 158;        // ... et ne repasse en noir qu'au-dessus de
                                // celui-ci : entre les deux, il ne bouge pas
  var COLS = 16;                // colonnes échantillonnées dans un média
  var COUVRE = .9;              // couverture minimale pour lire la couleur d'un média
  var PAGE = 255;               // fond de page, vers lequel un voile ramène

  var header = null, cands = [], sampled = new WeakMap(), pending = 0, watching = false;

  function lum(r, g, b) { return .2126 * r + .7152 * g + .0722 * b; }

  /* Ce qu'un média peint sur la bande qui passe derrière la barre : sa
     luminance et sa couverture (0 à 1). On ne moyenne pas l'image entière — les
     fonds du site sont des dégradés, verticaux comme horizontaux, et la moyenne
     ne correspondrait à rien de ce qu'on voit à cette hauteur. Tout est servi
     depuis le même domaine, le canvas n'est donc jamais souillé. */
  function mediaPaint(el, part) {
    var key = Math.max(0, Math.min(20, Math.round(part * 20)));  // 20 bandes suffisent
    var mem = sampled.get(el) || {};
    if (key in mem) return mem[key];
    var v = null, pret = el.complete !== false && el.readyState !== 0;
    try {
      var w = el.naturalWidth || el.videoWidth || el.width;
      var h = el.naturalHeight || el.videoHeight || el.height;
      if (w && h) {
        var sh = Math.max(1, Math.round(h / 20));
        var sy = Math.max(0, Math.min(h - sh, Math.round(part * h)));
        var c = document.createElement('canvas');
        c.width = COLS; c.height = 1;
        var x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(el, 0, sy, w, sh, 0, 0, COLS, 1);
        var d = x.getImageData(0, 0, COLS, 1).data, sc = 0, sa = 0;
        for (var i = 0; i < d.length; i += 4) {
          var al = d[i + 3] / 255;
          sc += lum(d[i], d[i + 1], d[i + 2]) * al; sa += al;
        }
        if (sa > 0) v = { l: sc / sa, a: sa / COLS };
      }
    } catch (e) { v = null; pret = true; }       // canvas souillé : inutile de réessayer
    if (v !== null || pret) { mem[key] = v; sampled.set(el, mem); }
    return v;
  }

  /* Ce qu'une surface peint à cette hauteur : luminance et couverture, ou null
     si elle ne peint rien. `part` situe la sonde dans l'élément, de 0 en haut à
     1 en bas. Une couche à demi transparente n'est ni opaque ni absente : elle
     est composée avec ce qu'il y a derrière, comme le fait le navigateur. */
  function surfacePaint(el, cs, part) {
    var op = +cs.opacity;
    if (op < .02) return null;
    var tag = el.tagName;
    if (tag === 'IMG' || tag === 'VIDEO' || tag === 'CANVAS') {
      var v = mediaPaint(el, part);
      /* Un média n'est retenu que s'il couvre franchement. En dessous, on ne
         sait pas ce qu'il peint vraiment : son canal alpha est lu dans la
         source, sans tenir compte du recadrage `object-fit` ni des opacités que
         le thème anime par-dessus. Les fondus de recouvrement de l'accueil, à
         demi transparents, faisaient ainsi passer la barre en blanc sur une
         section blanche ; les surfaces en dessous, elles, répondent juste. */
      if (v && v.a >= COUVRE) return { l: v.l, a: v.a * op };
      /* Média à demi transparent : sa couleur lue dans la source ne dit pas ce
         qu'il peint (recadrage `object-fit`, opacités animées par-dessus), mais
         sa couverture, elle, dit combien il masque. Ces voiles n'existent que
         pour découvrir la page en dessous — c'est le rôle du fondu de l'accueil,
         qui recouvre le hero noir pendant que la section blanche monte. On le
         compose donc vers le fond de page, à hauteur de ce qu'il couvre. */
      if (v) return { l: PAGE, a: v.a * op };
    }
    var m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor);
    if (m) {
      var q = m[1].split(',');
      var al = (q.length > 3 ? parseFloat(q[3]) : 1) * op;
      if (al > .02) return { l: lum(+q[0], +q[1], +q[2]), a: al };
    }
    return null;
  }

  /* Surfaces candidates : assez larges pour couvrir la barre, et peignant
     quelque chose. Recensées une fois par page — la liste ne dépend pas du
     défilement, seulement du document. */
  function collect() {
    cands = [];
    var min = innerWidth * MIN_SHARE;
    var all = document.querySelectorAll('.body-inner *');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.closest('.header')) continue;
      var r = el.getBoundingClientRect();
      if (r.width < min) continue;
      var cs = getComputedStyle(el);
      if (cs.position === 'fixed' && el.closest('#cookie-consent')) continue;
      var tag = el.tagName;
      var peint = tag === 'IMG' || tag === 'VIDEO' || tag === 'CANVAS' ||
                  !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
      if (peint) cands.push(el);
    }
  }

  /* Une surface ne compte que si elle est réellement peinte à cet endroit.
     La boîte ne suffit pas à le dire : une section dont la partie collante a
     fini sa course garde une boîte étirée sur toute sa piste, longtemps après
     avoir quitté l'écran. C'est ce qui faisait composer les images claires du
     fondu par-dessus un hero noir qui n'était plus là — 70 points de luminance
     en moins, et la barre passait en blanc sur un fond déjà clair.

     Le test de survol, lui, sait ce qui est devant. On garde donc : ce que la
     pile renvoie, les ancêtres de cette pile (ils peignent derrière), et les
     couches en `pointer-events: none` posées à l'intérieur — invisibles au test
     de survol, mais bien peintes, comme les images de fond du site. */
  function peinte(el, stack) {
    for (var i = 0; i < stack.length; i++) {
      if (stack[i] === el || el.contains(stack[i])) return true;
    }
    if (getComputedStyle(el).pointerEvents === 'none') {
      for (var j = 0; j < stack.length; j++) if (stack[j].contains(el)) return true;
    }
    return false;
  }

  function apply() {
    pending = 0;
    if (!header) return;
    var row = header.querySelector('.header-inner') || header;
    var y = row.getBoundingClientRect().height * PROBE;
    var stack = document.elementsFromPoint(innerWidth / 2, y)
      .filter(function (e) { return !e.closest('.header'); });

    /* Composition d'arrière en avant, comme le navigateur : chaque surface
       recouvre le résultat des précédentes à hauteur de sa couverture. Le fond
       de page est blanc, c'est le point de départ. */
    var L = PAGE;
    for (var i = 0; i < cands.length; i++) {
      var el = cands[i];
      var r = el.getBoundingClientRect();
      if (r.top > y || r.bottom < y || r.width < innerWidth * MIN_SHARE) continue;
      if (!peinte(el, stack)) continue;
      var s = surfacePaint(el, getComputedStyle(el), r.height ? (y - r.top) / r.height : .5);
      if (s) L = L * (1 - s.a) + s.l * s.a;
    }

    /* Deux seuils plutôt qu'un : sous 118 le texte passe en blanc, il ne
       redevient noir qu'au-dessus de 152, et entre les deux il garde la couleur
       qu'il avait. Sans cette réserve, la zone de fondu d'une section à l'autre
       fait osciller la barre à chaque image.

       On compare à la classe réellement posée, pas à un souvenir : le thème
       continue de la basculer sur ses propres repères, et il faut pouvoir
       reprendre la main derrière lui. */
    var etait = header.classList.contains('on-dark');
    var dark = L < (etait ? VERS_SOMBRE : VERS_CLAIR);
    if (etait !== dark) header.classList.toggle('on-dark', dark);
  }

  function schedule() {
    if (!pending) pending = requestAnimationFrame(apply);
  }

  function mount() {
    header = document.querySelector('.header');
    if (!header) return;
    collect();
    apply();
    // le thème rebascule la classe sur ses propres repères : on repasse derrière.
    // Une seule surveillance, quel que soit le nombre d'inventaires.
    if (window.MutationObserver && !watching) {
      watching = true;
      new MutationObserver(schedule).observe(header, {
        attributes: true, attributeFilter: ['class']
      });
    }
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', function () { collect(); schedule(); });

  /* Le site navigue avec Barba : le contenu est remplacé sans recharger la
     page. On refait l'inventaire à chaque conteneur entrant, et l'on continue
     de suivre le défilement pendant la transition. */
  if (window.MutationObserver) {
    var relever = 0;
    new MutationObserver(function () {
      clearTimeout(relever);
      relever = setTimeout(mount, 120);
      schedule();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
  addEventListener('load', mount);               // images décodées : on ré-échantillonne
})();
