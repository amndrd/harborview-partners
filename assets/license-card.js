/* Éventail de cartes holographiques de la section « licence ».
 *
 * Transposition de la section « Get your license » de heroui.pro. Chez eux,
 * React et Framer Motion : huit valeurs animées par ressort, dont la carte tire
 * sa rotation, sa brillance et sa dérive de texte. Ici, ni l'un ni l'autre — un
 * intégrateur de ressort de quinze lignes et une boucle requestAnimationFrame,
 * dans la même veine que les autres scripts de la maison.
 *
 * ── Ce qui est repris à l'identique ─────────────────────────────────────────
 * Relevé dans leur bundle, pas approché :
 *
 *   - la position du pointeur est ramenée en pour-cent de la carte, bornée à
 *     [0, 100] et arrondie ;
 *   - la rotation vaut ∓(position − 50) / 3.5, soit ±14,3° dans les coins ;
 *   - le halo de brillance suit le pointeur, mais les fonds se déplacent plus
 *     vite que lui : 37 + x/100 × 26 et 33 + y/100 × 34 ;
 *   - la carte grossit de 5 % et son opacité de brillance passe de 0 à 1 ;
 *   - la dérive du texte vaut rotation / 18 × 10, en sens inverse sur y ;
 *   - deux ressorts : { raideur 180, amortissement 28 } à l'aller,
 *     { 120, 22 } au retour, plus mous, ce qui fait que la carte se repose
 *     plus lentement qu'elle ne réagit ;
 *   - le passage d'un rang au suivant dure 550 ms en cubic-bezier(.16,1,.3,1).
 *
 * La boucle ne tourne que lorsqu'une valeur n'est pas encore au repos, et que
 * la section est en vue.
 */
(function () {
  'use strict';

  /* Les cinq rangs de l'éventail. Le rang 0 est la carte de tête, seule à
     recevoir le pointeur ; les suivantes s'écartent par paires, de plus en plus
     loin et de plus en plus effacées. Les `translateZ` sont en rem pour suivre
     l'échelle du thème — voir l'en-tête de license-card.css. */
  var RANGS = [
    { x:   0, z:   0, r:  0,   o: 1,   couche: 10 },
    { x:  12, z: -17, r:  2.4, o: 1,   couche:  0 },
    { x:  26, z: -34, r:  4.8, o: 0.6, couche: -1 },
    { x: -26, z: -34, r: -4.8, o: 0.6, couche: -1 },
    { x: -12, z: -17, r: -2.4, o: 1,   couche:  0 }
  ];

  var VERS   = { k: 180, c: 28 };   // ressort à l'aller (le pointeur bouge)
  var RETOUR = { k: 120, c: 22 };   // ressort au retour (le pointeur est parti)
  var DIV    = 3.5;                 // diviseur de la rotation
  var PARA   = 18 / 10;             // dérive du texte : rotation / 1.8
  var REPOS  = 0.01;                // en deçà, une valeur est considérée posée
  var DT_MAX = 1 / 30;              // pas d'intégration plafonné (onglet caché)

  function borne(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* Un ressort amorti, masse 1 : l'équation de Framer Motion, intégrée à la
     main. `k` tire vers la cible, `c` freine. */
  function Ressort(v0) {
    this.v = v0; this.cible = v0; this.vit = 0; this.ress = RETOUR;
  }
  Ressort.prototype.pas = function (dt) {
    var d = this.v - this.cible;
    if (Math.abs(d) < REPOS && Math.abs(this.vit) < REPOS) {
      this.v = this.cible; this.vit = 0; return false;
    }
    this.vit += (-this.ress.k * d - this.ress.c * this.vit) * dt;
    this.v += this.vit * dt;
    return true;
  };

  function boot(root) {
    var section = root.querySelector ? root.querySelector('.hv-lic') : null;
    if (!section || section.hasAttribute('data-hv-lic-on')) return;

    var slots = [].slice.call(section.querySelectorAll('.hv-lic-slot'));
    var note  = section.querySelector('.hv-lic-note');
    if (slots.length !== RANGS.length) return;

    section.setAttribute('data-hv-lic-on', '');

    var mou = window.matchMedia &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Les huit valeurs animées, dans le même ordre que chez eux. */
    var rotY = new Ressort(0),  rotX = new Ressort(0),
        ptrX = new Ressort(50), ptrY = new Ressort(50),
        lueur = new Ressort(0),
        fondX = new Ressort(50), fondY = new Ressort(50),
        echelle = new Ressort(1);
    var toutes = [rotY, rotX, ptrX, ptrY, lueur, fondX, fondY, echelle];

    var tete = 0;                 // index de la carte au rang 0
    var running = false, frame = 0, dernier = 0, envue = true;

    function actif() { return slots[tete]; }

    function viser(ress, liste) {
      for (var i = 0; i < toutes.length; i++) toutes[i].ress = ress;
      for (var j = 0; j < liste.length; j++) liste[j][0].cible = liste[j][1];
      lancer();
    }

    function bouge(e) {
      var rot = actif().querySelector('.hv-lic-rotator');
      var r = rot.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var nx = borne(Math.round(100 / r.width  * (e.clientX - r.left)), 0, 100);
      var ny = borne(Math.round(100 / r.height * (e.clientY - r.top)),  0, 100);
      viser(VERS, [
        [rotY, -((nx - 50) / DIV)],
        [rotX,  ((ny - 50) / DIV)],
        [ptrX, nx], [ptrY, ny],
        [lueur, 1],
        [fondX, 37 + nx / 100 * 26],
        [fondY, 33 + ny / 100 * 34],
        [echelle, 1.05]
      ]);
    }

    function quitte() {
      viser(RETOUR, [
        [rotY, 0], [rotX, 0], [ptrX, 50], [ptrY, 50],
        [lueur, 0], [fondX, 50], [fondY, 50], [echelle, 1]
      ]);
    }

    /* Écriture : tout passe par la carte de tête. Les autres restent à plat —
       elles ne reçoivent pas le pointeur, les animer serait du calcul perdu. */
    function peindre() {
      var s = actif();
      var wrap = s.querySelector('.hv-lic-wrapper');
      var rot  = s.querySelector('.hv-lic-rotator');
      wrap.style.setProperty('--hv-lic-x', ptrX.v.toFixed(2) + '%');
      wrap.style.setProperty('--hv-lic-y', ptrY.v.toFixed(2) + '%');
      wrap.style.setProperty('--hv-lic-bg-x', fondX.v.toFixed(2) + '%');
      wrap.style.setProperty('--hv-lic-bg-y', fondY.v.toFixed(2) + '%');
      wrap.style.setProperty('--hv-lic-opacity', lueur.v.toFixed(3));
      wrap.style.transform = 'scale(' + echelle.v.toFixed(4) + ')';
      rot.style.transform =
        'rotateX(' + rotX.v.toFixed(3) + 'deg) rotateY(' + rotY.v.toFixed(3) + 'deg)';

      var dx = (rotY.v / PARA).toFixed(2), dy = (-rotX.v / PARA).toFixed(2);
      var id = s.querySelector('.hv-lic-id'), meta = s.querySelector('.hv-lic-meta');
      if (id) id.style.transform =
        'translate(-50%, -50%) translate(' + dx + 'px, ' + dy + 'px) translateZ(1rem)';
      if (meta) meta.style.transform =
        'translate(' + dx + 'px, ' + dy + 'px) translateZ(1rem)';
    }

    function tick(t) {
      var dt = dernier ? Math.min((t - dernier) / 1000, DT_MAX) : 1 / 60;
      dernier = t;
      var vivant = false;
      for (var i = 0; i < toutes.length; i++) {
        if (toutes[i].pas(dt)) vivant = true;
      }
      peindre();
      if (vivant && envue) { frame = requestAnimationFrame(tick); }
      else { running = false; dernier = 0; }
    }

    function lancer() {
      if (running || mou || !envue) { if (mou) peindre(); return; }
      running = true; dernier = 0;
      frame = requestAnimationFrame(tick);
    }

    /* ── Les rangs ─────────────────────────────────────────────────────────
       La carte i occupe le rang (i − tête) modulo 5. Changer de tête décale
       tout l'éventail d'un cran ; la transition est portée par la feuille. */
    function ranger() {
      for (var i = 0; i < slots.length; i++) {
        var rang = (i - tete + RANGS.length) % RANGS.length;
        var g = RANGS[rang];
        slots[i].dataset.hvLicRank = rang;
        slots[i].style.zIndex = g.couche;
        slots[i].style.opacity = g.o;
        slots[i].style.transform =
          'perspective(100rem) translateX(' + g.x + '%) translateZ(' + g.z + 'rem) rotateZ(' + g.r + 'deg)';
      }
    }

    /* La légende reprend le prénom de la carte de tête, lettre à lettre. Le
       décalage est posé en variable : la feuille tient l'animation. */
    function legende() {
      if (!note) return;
      var nom = actif().querySelector('.hv-lic-name');
      var prenom = (nom ? nom.textContent.trim() : '').split(' ')[0];
      var texte = prenom + ' claimed recently';
      note.setAttribute('aria-label', texte);
      note.textContent = '';
      note.removeAttribute('data-hv-lic-anim');
      for (var i = 0; i < texte.length; i++) {
        var s = document.createElement('span');
        s.setAttribute('aria-hidden', 'true');
        s.textContent = texte.charAt(i);
        s.style.setProperty('--d', (i * 0.018).toFixed(3) + 's');
        note.appendChild(s);
      }
      void note.offsetWidth;                 // on relance l'animation
      note.setAttribute('data-hv-lic-anim', '');
    }

    function tourner(sens) {
      tete = (tete + sens + slots.length) % slots.length;
      quitte();                              // la carte qui part se remet à plat
      ranger();
      legende();
    }

    section.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-hv-lic-nav]') : null;
      if (!b) return;
      tourner(b.getAttribute('data-hv-lic-nav') === 'next' ? 1 : -1);
    });

    /* Le pointeur est écouté sur la scène, pas sur chaque carte : la carte de
       tête change de place dans la pile à chaque rotation, et un écouteur posé
       sur elle aurait été à réinstaller à chaque fois. */
    var stage = section.querySelector('.hv-lic-stage');
    stage.addEventListener('mousemove', function (e) {
      if (mou) return;
      var w = actif().querySelector('.hv-lic-wrapper');
      if (w.contains(e.target)) bouge(e);
    });
    stage.addEventListener('mouseleave', quitte);

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        envue = entries[0].isIntersecting;
        if (envue) lancer(); else { cancelAnimationFrame(frame); running = false; }
      }, { rootMargin: '20% 0px' }).observe(section);
    }

    ranger();
    legende();
    peindre();
  }

  /* Navigation Barba : même motif que les autres scripts de la maison. */
  function watchNavigation() {
    var wrapper = document.querySelector('[data-barba="wrapper"]');
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

  function start() { watchNavigation(); boot(document); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
