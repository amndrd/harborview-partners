/* Arrière-plan du hero : trame de points parcourue par une onde circulaire.
 *
 * Une grille carrée de points sur fond noir. Toutes les 7 secondes, une onde
 * naît au centre du hero et s'étend jusqu'aux bords, comme un cercle après une
 * goutte d'eau : les points qu'elle traverse grossissent et s'allument, les
 * autres restent à peine visibles. Au survol, la souris éclaire les points
 * autour d'elle, les teinte, et bombe la crête de l'onde sur son passage.
 *
 * Cette orbe n'est pas un disque accroché au curseur : c'est le relevé de son
 * tracé. Une tête court après le pointeur, et un tampon circulaire garde ses
 * positions de la dernière seconde. Souris lancée, les relevés s'espacent et
 * l'orbe s'étire le long du geste, tête large et queue effilée ; souris
 * arrêtée, ils se rejoignent et elle se referme.
 *
 * Les réglages ci-dessous sont mesurés sur la vidéo de référence, pas devinés :
 * détection des points sur sept images, ajustement de cercle sur les crêtes,
 * profils radiaux et analyse de teinte. Les distances sont exprimées en demi-
 * diagonale du hero (D), la seule unité qui garde la même animation quel que
 * soit le format de l'écran — l'onde couvre exactement le hero en 6 s, du
 * téléphone au 1920.
 *
 * Deux écarts avec la référence, imposés par la page :
 *
 *  - Le site est une SPA (Barba récupère les pages en XHR) : le hero est un
 *    nœud neuf à chaque retour sur l'accueil. On surveille donc le DOM et l'on
 *    réinstancie sur le nouveau canvas.
 *  - Le pointeur est écouté sur `document`, pas sur le canvas :
 *    `.home-hero-text-wrap` couvre toute la largeur du hero par-dessus lui
 *    (z-index 2) et avalerait les événements.
 *
 * GSAP n'étant pas exposé par le bundle, tout est en requestAnimationFrame.
 */
(function () {
  'use strict';

  /* ══ RÉGLAGES ══════════════════════════════════════════════════════════════
     D = demi-diagonale du hero. Mesures de référence entre parenthèses, prises
     sur une capture où le hero fait 630 × 345 px (donc D = 359 px). */
  var CFG = {
    // ── Grille ──────────────────────────────────────────────────────────────
    pitch:      29,             // pas visé en px (mesuré : 12,5 px pour 630 de large)
    pitchMin:   20,             // plancher : sous 1000 px de large, on n'écrase pas
    pitchMax:   32,
    baseAlpha:  .075,           // point au repos (mesuré : 12-20 sur 255)
    baseJitter: .12,            // ± sur le repos, figé par point : la trame respire
    rMin:       .040,           // rayon d'un point au repos, en pas de grille
    rMax:       .130,           // rayon d'un point sur la crête
    alphaPow:   2.2,            // raideur du passage repos → crête ; en dessous
    radiusPow:  1.3,            // de 2, la crête traîne une jupe trop large

    // ── Onde ────────────────────────────────────────────────────────────────
    period:     7.0,            // s entre deux ondes (mesuré : 7,15)
    travel:     6.0,            // s pour aller du centre au bord (mesuré : ~5,8)
    maxR:       1.0,            // portée, en D : l'onde meurt en sortant du hero
    crest:      .075,           // demi-largeur de la crête, en D (mesuré : 0,06 D à mi-hauteur)
    centerX:    .494,           // centre de l'onde, en largeur de hero
    centerY:    .565,           // ... et en hauteur (mesuré : 56,5 %, sous le milieu)
    riseP:      1.2,            // enveloppe : exposant de montée
    fallP:      .42,            // ... et de descente ; le pic tombe à 74 % du trajet

    // ── Pointeur ────────────────────────────────────────────────────────────
    lightR:     .125,           // rayon d'éclaircissement, en D (mesuré : 45 px)
    lightGain:  .85,            // ce que le pointeur ajoute à l'amplitude
    tintR:      .280,           // rayon de teinte, plus large (mesuré : 100 px)
    tintMax:    .85,            // part maximale d'accent dans la couleur du point
    bulgeR:     .230,           // rayon de déformation de la crête
    bulge:      .045,           // amplitude de la déformation, en D
    trail:      26,             // relevés du tracé composant la traînée
    trailWindow: 1.0,           // durée couverte, en s. À 0,6 s la traînée
                                // n'était plus longue que le diamètre de l'orbe
                                // aux vitesses ordinaires : elle restait ronde
    trailLag:   8,              // rattrapage de la tête, par seconde : l'orbe
                                // court après le curseur au lieu d'y coller
    trailFade:  .958,           // poids gardé d'un relevé au précédent
    trailTaper: .962,           // ... et rayon : tête large, queue effilée
    wobble:     .024,           // errance lente de la tête, en D — casse le
    wobbleHz:   .13,            // cercle parfait sans jamais tressauter
    hueCycle:   25,             // s pour un tour complet de teinte
    hueSat:     .78,            // saturation de l'accent
    hueLight:   .62,            // clarté de l'accent

    // ── Divers ──────────────────────────────────────────────────────────────
    glowFrom:   .50,            // amplitude à partir de laquelle un point rayonne
    glowSize:   3.2,            // taille du halo, en rayons de point
    glowAlpha:  .24,
    fadeMs:     420             // fondu de l'influence du pointeur qui s'en va
  };

  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* Enveloppe de l'onde : elle naît discrète, culmine aux trois quarts du
     trajet, puis s'éteint en sortant. Mesuré : 0,51 / 0,83 / 1,00 / 0,76 de
     l'amplitude maximale à 28 / 53 / 74 / 83 % du trajet. */
  var ENV_PEAK = (function () {
    var u = CFG.riseP / (CFG.riseP + CFG.fallP);
    return Math.pow(u, CFG.riseP) * Math.pow(1 - u, CFG.fallP);
  })();

  function envelope(u) {
    if (u <= 0 || u >= 1) return 0;
    return Math.pow(u, CFG.riseP) * Math.pow(1 - u, CFG.fallP) / ENV_PEAK;
  }

  /* HSL → RGB, réduit au strict nécessaire (teinte en tours, pas en degrés). */
  function accent(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h * 6) % 2 - 1));
    var m = l - c / 2, r, g, b;
    var k = Math.floor(h * 6) % 6;
    if (k === 0) { r = c; g = x; b = 0; }
    else if (k === 1) { r = x; g = c; b = 0; }
    else if (k === 2) { r = 0; g = c; b = x; }
    else if (k === 3) { r = 0; g = x; b = c; }
    else if (k === 4) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  /* ── Une instance ═════════════════════════════════════════════════════════
     Tout l'état vit ici : deux instances ne se marchent jamais dessus, et
     destroy() ne laisse ni boucle ni écouteur derrière lui. */
  function create(canvas) {
    var host = canvas.parentElement;
    var ctx = canvas.getContext('2d');
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = matchMedia('(pointer: fine)').matches;

    var W = 0, H = 0, D = 1, dpr = 1, pitch = CFG.pitch;
    var gx = [], gy = [], jitter = [];   // grille : colonnes, lignes, bruit par point
    var glow = null;                     // empreinte du halo des points vifs
    var t = 0;

    /* Pointeur : une cible (mx, my), une tête qui court après elle, et le
       relevé de son tracé. La traînée n'est pas une forme accrochée au curseur
       mais le chemin que la tête vient de parcourir : un tampon circulaire garde
       ses positions des 0,6 dernières secondes, le plus récent en premier. Souris
       lancée, les relevés s'espacent et l'orbe s'étire le long du geste ; souris
       arrêtée, ils se rejoignent et l'orbe se referme.

       `power` fait monter et descendre l'ensemble quand le pointeur entre dans le
       hero ou le quitte. */
    var mx = 0, my = 0, power = 0, wanted = 0, seeded = false;
    var hx = 0, hy = 0;                  // tête, qui rattrape la cible
    var tx = [], ty = [], tw = [], tsz = [];
    var head = 0, sample = 0;            // index du relevé courant, temps depuis

    (function () {
      for (var i = 0; i < CFG.trail; i++) {
        tx.push(0); ty.push(0);
        tw.push(Math.pow(CFG.trailFade, i));
        tsz.push(Math.pow(CFG.trailTaper, 2 * i));   // sur les rayons au carré
      }
    })();

    /* La tête suit la cible par une exponentielle : sans elle, le rattrapage
       dépendrait de la cadence d'affichage. Le relevé le plus récent la suit en
       continu, et l'on n'avance d'un cran qu'au bout d'un pas de temps — sinon
       la traînée avancerait par saccades à la cadence d'échantillonnage. */
    function follow(dt) {
      var wob = CFG.wobble * D;
      var k = 1 - Math.exp(-dt * CFG.trailLag);
      hx += (mx + wob * Math.sin(t * 6.283 * CFG.wobbleHz) - hx) * k;
      hy += (my + wob * Math.cos(t * 6.283 * CFG.wobbleHz * 1.31) - hy) * k;

      tx[head] = hx; ty[head] = hy;
      sample += dt;
      var step = CFG.trailWindow / CFG.trail;
      while (sample >= step) {
        sample -= step;
        head = (head + tx.length - 1) % tx.length;
        tx[head] = hx; ty[head] = hy;
      }
    }

    /* ── Grille ──────────────────────────────────────────────────────────────
       Le pas est fixe en pixels, pas proportionnel : à 390 px de large, une
       grille proportionnelle donnerait des points collés. On le borne, puis on
       répartit le reste également de part et d'autre pour que la trame reste
       centrée quelle que soit la largeur. */
    function build() {
      pitch = Math.max(CFG.pitchMin, Math.min(CFG.pitchMax, W / 50));
      gx = []; gy = []; jitter = [];
      var nx = Math.floor(W / pitch) + 2, ny = Math.floor(H / pitch) + 2;
      var ox = (W - (nx - 1) * pitch) / 2, oy = (H - (ny - 1) * pitch) / 2;
      for (var i = 0; i < nx; i++) gx.push(ox + i * pitch);
      for (var j = 0; j < ny; j++) gy.push(oy + j * pitch);
      // bruit figé (pas aléatoire d'une image à l'autre) : la trame au repos
      // n'est pas parfaitement uniforme, comme sur la référence
      for (var k = 0; k < nx * ny; k++) {
        var s = Math.sin(k * 12.9898) * 43758.5453;
        jitter.push((s - Math.floor(s)) * 2 - 1);
      }
      bakeGlow();
    }

    /* Empreinte du halo : un dégradé radial dessiné une fois pour toutes, que
       le rendu se contente d'étirer sous chaque point vif. */
    function bakeGlow() {
      var size = Math.max(8, Math.ceil(pitch * CFG.rMax * CFG.glowSize * 2 * dpr));
      glow = document.createElement('canvas');
      glow.width = glow.height = size;
      var g = glow.getContext('2d');
      var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(.35, 'rgba(255,255,255,.42)');
      grad.addColorStop(.7, 'rgba(255,255,255,.10)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
    }

    /* ── Dessin ──────────────────────────────────────────────────────────────
       Deux passes. La première rassemble en un seul tracé tous les points
       laissés au repos — l'immense majorité — et les remplit d'un coup. La
       seconde ne traite que les points touchés par l'onde ou par le pointeur,
       chacun avec sa couleur : quelques centaines au lieu de deux mille. */
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      var cx = W * CFG.centerX, cy = H * CFG.centerY;
      var age = t % CFG.period;
      var R = (age / CFG.travel) * CFG.maxR * D;         // rayon courant, en px
      var env = envelope(age / CFG.travel);
      var crest = CFG.crest * D;
      var lightR = CFG.lightR * D, tintR = CFG.tintR * D;
      var bulgeR = CFG.bulgeR * D, bulge = CFG.bulge * D;

      // boîte englobante de la chaîne : ailleurs, inutile de la parcourir
      var bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
      var reach = tintR * 2.45;
      for (var n0 = 0; n0 < tx.length; n0++) {
        if (tx[n0] - reach < bx0) bx0 = tx[n0] - reach;
        if (tx[n0] + reach > bx1) bx1 = tx[n0] + reach;
        if (ty[n0] - reach < by0) by0 = ty[n0] - reach;
        if (ty[n0] + reach > by1) by1 = ty[n0] + reach;
      }
      var lightR2 = lightR * lightR, tintR2 = tintR * tintR;
      var tintR2x6 = tintR2 * 6;

      var col = accent((t / CFG.hueCycle) % 1, CFG.hueSat, CFG.hueLight);
      var rBase = pitch * CFG.rMin, rSpan = pitch * (CFG.rMax - CFG.rMin);
      var live = [];

      ctx.beginPath();
      for (var j = 0, k = 0; j < gy.length; j++) {
        var y = gy[j];
        for (var i = 0; i < gx.length; i++, k++) {
          var x = gx[i];
          var a = 0, m = 0;

          /* Apport du pointeur : on retient le maximum sur la chaîne, pas la
             somme — additionner ferait un bourrelet plus clair partout où deux
             nœuds se chevauchent, c'est-à-dire dès que la souris ralentit. */
          var lp = 0;
          if (power > .002 && x > bx0 && x < bx1 && y > by0 && y < by1) {
            for (var n2 = 0; n2 < tx.length; n2++) {
              var s2 = (head + n2) % tx.length;      // du plus récent au plus ancien
              // deux comparaisons avant toute multiplication : sur une traînée
              // étalée, un point donné n'est voisin que de quelques relevés
              var pdx = x - tx[s2]; if (pdx > reach || pdx < -reach) continue;
              var pdy = y - ty[s2]; if (pdy > reach || pdy < -reach) continue;
              var pd2 = pdx * pdx + pdy * pdy;
              if (pd2 > tintR2x6) continue;
              var w2 = tw[n2] * power;
              var q = pd2 / (lightR2 * tsz[n2]);
              if (q < 12) { var v2 = Math.exp(-q) * w2; if (v2 > lp) lp = v2; }
              var qt = pd2 / (tintR2 * tsz[n2]);
              if (qt < 12) { var c2 = 1.1 * Math.exp(-qt) * w2; if (c2 > m) m = c2; }
            }
            if (m > CFG.tintMax) m = CFG.tintMax;
          }

          // apport de l'onde, la crête bombée par le pointeur
          if (env > .002) {
            var dx = x - cx, dy = y - cy;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (lp > 0 || m > 0) {
              // la crête ne se bombe que sous la tête : la traînée éclaire et
              // colore, elle ne pousse pas
              var b2 = ((x - hx) * (x - hx) + (y - hy) * (y - hy)) /
                       (bulgeR * bulgeR);
              if (b2 < 12) d -= bulge * Math.exp(-b2) * power;
            }
            var u = (d - R) / crest;
            if (u > -2.2 && u < 2.2) a = Math.exp(-2.3 * u * u) * env;
          }

          a = clamp01(a + CFG.lightGain * lp);

          // seuils du lot commun : à 5 % d'accent le point est encore blanc à
          // 95 %, inutile de lui payer un remplissage à lui seul
          if (a < .02 && m < .05) {
            // au repos : on empile dans le tracé commun
            var rj = rBase * (1 + CFG.baseJitter * jitter[k] * .6);
            ctx.moveTo(x + rj, y);
            ctx.arc(x, y, rj, 0, 6.283185);
          } else {
            live.push(x, y, a, m, jitter[k]);
          }
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,' + CFG.baseAlpha.toFixed(3) + ')';
      ctx.fill();

      for (var n = 0; n < live.length; n += 5) {
        var lx = live[n], ly = live[n + 1], la = live[n + 2], lm = live[n + 3];
        var alpha = CFG.baseAlpha + (1 - CFG.baseAlpha) * Math.pow(la, CFG.alphaPow);
        alpha *= 1 + CFG.baseJitter * live[n + 4] * .5;
        var r = rBase + rSpan * Math.pow(la, CFG.radiusPow);

        // la teinte se pose sur la luminosité que l'onde a déjà donnée : entre
        // deux crêtes, le pointeur laisse des points sombres mais colorés
        var cr = 255 + (col[0] - 255) * lm;
        var cg = 255 + (col[1] - 255) * lm;
        var cb = 255 + (col[2] - 255) * lm;
        var rgb = (cr | 0) + ',' + (cg | 0) + ',' + (cb | 0);

        if (la > CFG.glowFrom && glow) {
          // le halo est une empreinte pré-dessinée, pas un disque : un aplat
          // laisserait un bord net et chaque point vif porterait un anneau gris
          var g = r * CFG.glowSize;
          ctx.globalAlpha = CFG.glowAlpha * (la - CFG.glowFrom) / (1 - CFG.glowFrom);
          ctx.drawImage(glow, lx - g, ly - g, g * 2, g * 2);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = 'rgba(' + rgb + ',' + clamp01(alpha).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(lx, ly, r, 0, 6.283185);
        ctx.fill();
      }
    }

    /* ── Fondu au scroll ──────────────────────────────────────────────────────
       Le thème effaçait le globe et le ciel étoilé pendant que la section
       suivante remontait par-dessus le hero collant. On rejoue ce fondu sur les
       bornes d'origine (ScrollTrigger : start `top top-=20%`, end `center top`,
       au-dessus de 991 px seulement), sur le canvas plutôt que sur le calque :
       le noir du fond, lui, doit rester jusqu'au bout. */
    var section = host.closest('.home-hero');
    var fadeShown = -1;

    function fade() {
      if (!section || innerWidth <= 991) return 1;
      var r = section.getBoundingClientRect();
      var from = -.2 * innerHeight;
      var to = -r.height / 2;
      if (to >= from) return 1;
      return 1 - clamp01((r.top - from) / (to - from));
    }

    function applyFade() {
      var f = fade();
      if (Math.abs(f - fadeShown) < .004) return;
      fadeShown = f;
      canvas.style.opacity = f;
    }

    /* ── Boucle et cycle de vie ─────────────────────────────────────────────── */
    var last = performance.now(), running = true, raf = 0;

    function frame(now) {
      if (!running) return;
      // borné des deux côtés : l'horodatage de rAF peut précéder le premier
      // performance.now(), et un dt négatif ferait reculer le temps
      var dt = Math.max(0, Math.min(.05, (now - last) / 1000));
      last = now;
      t += dt;
      // l'influence du pointeur monte et descend en douceur : sans ça, la
      // couleur s'allumerait et s'éteindrait d'un coup au bord du hero
      var step = dt * 1000 / CFG.fadeMs;
      power += Math.max(-step, Math.min(step, wanted - power));
      follow(dt);
      applyFade();
      if (fadeShown > 0) draw();
      raf = requestAnimationFrame(frame);
    }

    var lastW = -1, lastH = -1;

    function resize() {
      var w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      dpr = Math.min(2, devicePixelRatio || 1);
      W = w; H = h;
      D = Math.sqrt(W * W + H * H) / 2;
      canvas.width = W * dpr; canvas.height = H * dpr;
      build(); draw();
    }

    var ro = new ResizeObserver(resize);
    ro.observe(host);

    /* ── Pointeur ────────────────────────────────────────────────────────────
       Écouté sur `document` : le bloc de texte couvre le canvas et
       intercepterait tout. On ne réagit qu'au pointeur fin — sur un écran
       tactile, il n'y a pas de survol à représenter. */
    function onMove(e) {
      if (!fine || reduced) return;
      var b = canvas.getBoundingClientRect();
      var x = e.clientX - b.left, y = e.clientY - b.top;
      mx = x; my = y;
      // premier contact : la chaîne naît sur place, sinon elle traverserait
      // l'écran depuis le coin en une grande balayure
      if (!seeded) {
        seeded = true;
        hx = x; hy = y;
        for (var i = 0; i < tx.length; i++) { tx[i] = x; ty[i] = y; }
      }
      wanted = (x >= 0 && y >= 0 && x <= b.width && y <= b.height) ? 1 : 0;
    }

    function onLeave() { wanted = 0; }

    function onVisibility() {
      running = !document.hidden;
      if (running) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    addEventListener('scroll', applyFade, { passive: true });

    resize();
    applyFade();
    if (reduced) {
      // mouvement coupé : on fige l'onde à son plein, une image et rien d'autre
      t = CFG.travel * (CFG.riseP / (CFG.riseP + CFG.fallP));
      draw();
      running = false;
    } else {
      raf = requestAnimationFrame(frame);
    }

    return {
      destroy: function () {
        running = false;
        cancelAnimationFrame(raf);
        ro.disconnect();
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerleave', onLeave);
        document.removeEventListener('visibilitychange', onVisibility);
        removeEventListener('scroll', applyFade);
      }
    };
  }

  /* ── Accrochage ═══════════════════════════════════════════════════════════
     Le routeur remplace le hero par un nœud neuf à chaque retour sur l'accueil.
     On compare donc l'élément courant à celui de l'instance en cours : nouveau
     canvas, nouvelle instance ; plus de canvas, on démonte. */
  var current = null;
  var pending = 0;

  function sync() {
    pending = 0;
    var canvas = document.querySelector('.hv-bg canvas');
    if (current && current.canvas !== canvas) {
      current.api.destroy();
      current = null;
    }
    if (canvas && !current) {
      current = { canvas: canvas, api: create(canvas) };
    }
  }

  function schedule() {
    if (pending) return;
    pending = requestAnimationFrame(sync);
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true, subtree: true
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync);
  } else {
    sync();
  }
})();
