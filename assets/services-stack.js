/* Pile de cartes de la section « Services ».
 *
 * Transposition de la section services de sohub.digital. Chez eux, GSAP et
 * ScrollTrigger : une timeline à trois temps, épinglée sur 250 % de hauteur
 * d'écran. Ici GSAP n'est pas exposé par le bundle (même constat que dans
 * hero-title-reveal.js), et l'épinglage est fait en CSS par `position: sticky`
 * — il ne reste donc à ce script que la lecture de l'avancement et l'écriture
 * des transformations, dans une boucle requestAnimationFrame.
 *
 * ── Ce qui est repris à l'identique ─────────────────────────────────────────
 * Les valeurs sont relevées dans leur bundle, pas approchées à l'œil :
 *
 *   - trois temps égaux, un par carte qui arrive ;
 *   - une carte entre depuis translateY(120 %) et se pose à 0 ;
 *   - à chaque nouvelle arrivée, toutes celles déjà posées remontent de 60 px
 *     et perdent 0,05 d'échelle — d'où la pile visible en haut : -60/-120/-180
 *     et 0,95/0,90/0,85 ;
 *   - la première carte entre en 1,05 -> 1 pendant son approche, avant
 *     l'épinglage ;
 *   - chaque segment est adouci par la détente par défaut de GSAP,
 *     `power1.out`, soit 1-(1-t)².
 *
 * ── Pourquoi tout passe par getBoundingClientRect ───────────────────────────
 * Jamais par scrollY. Le conteneur défilant de ce site n'est pas toujours la
 * fenêtre : sous 768 px c'est `.body-inner` (voir assets/viewport.css), et
 * Lenis lisse le tout par-dessus. Un rectangle est relatif à la fenêtre quoi
 * qu'il arrive : la même lecture vaut dans les deux cas, sans avoir à savoir
 * qui défile ni à s'accrocher au proxy que le thème installe.
 *
 * La boucle ne tourne que lorsque la section est en vue (IntersectionObserver).
 */
(function () {
  'use strict';

  var PHASES       = 3;      // trois temps, un par carte qui arrive après la première
  var SETTLE_REM   = 6;      // 60 px chez eux : ce qu'une carte posée remonte par étage
  var SETTLE_SCALE = 0.05;   // ... et ce qu'elle perd en échelle au même moment
  var ENTER_PCT    = 120;    // départ hors champ, en part de la hauteur d'une carte
  var LEAD_SCALE   = 1.05;   // la première carte entre légèrement agrandie
  var LEAD_START   = 1.1;    // « top 110% » : son approche commence sous le pli

  var STACK_MIN    = 992;    // au-dessus : la pile ; en dessous : la colonne
  var MOB_PCT      = 15;     // « y: 15% » — la montée d'une carte du mobile
  var MOB_SCALE    = 0.95;
  var MOB_SMOOTH   = 0.12;   // approche du `scrub: 1` de leur version mobile

  /* Hauteur sondée dans la rangée de la barre, en part de sa hauteur. La même
     valeur que le PROBE de header-contrast.js, et ce n'est pas un hasard : ce
     script pose `on-dark` quand cette hauteur-là tombe sur du sombre, et le
     repère ci-dessous dit que le sombre en question est une de nos cartes. Les
     deux doivent basculer sur la même image, sans quoi on verrait le bouton
     changer de couleur un cran avant ou après le texte. */
  var PROBE        = 0.55;
  var OVER_CLASS   = 'hv-svc-over';

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { var u = 1 - t; return 1 - u * u; }   // power1.out

  /* Taille du rem, relue à chaque redimensionnement : la racine du thème est en
     vw (voir l'en-tête de assets/services-stack.css), elle change donc avec la
     largeur, et les 60 px de la pile sont exprimés en rem pour suivre. */
  var remPx = 10;
  function readRem() {
    var v = parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (v > 0) remPx = v;
  }

  function boot(root) {
    var section = root.querySelector ? root.querySelector('.hv-svc') : null;
    if (!section || section.hasAttribute('data-hv-svc-on')) return;

    var scroll = section.querySelector('.hv-svc-scroll');
    var cards  = [].slice.call(section.querySelectorAll('.hv-svc-card'));
    if (!scroll || !cards.length) return;

    /* Mouvement réduit : la feuille rend déjà la colonne, où rien n'a à bouger.
       On ne touche pas aux transformations, sans quoi on remettrait les cartes
       hors champ. */
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (still && still.matches) return;

    section.setAttribute('data-hv-svc-on', '');

    var mobEased = cards.map(function () { return 0; });
    var running = false, frame = 0;

    /* La barre vit hors du conteneur Barba : elle survit aux navigations, on la
       relit donc à chaque montage plutôt que de la garder d'une page à l'autre. */
    var header = document.querySelector('.header');

    /* État de la pile à l'avancement p (0 -> 1 sur les 250 vh épinglés).
     *
     * Le temps courant vaut p × 3 ; sa partie entière donne le segment, sa
     * partie décimale l'avancement dans ce segment. Au segment k :
     *   - la carte k+1 entre, de 120 % à 0 ;
     *   - toute carte j déjà posée (j <= k) passe de l'étage k-j à l'étage
     *     suivant, soit -60 px et -0,05 d'échelle de plus ;
     *   - les suivantes attendent hors champ.
     */
    function stack(p) {
      var t = p * PHASES;
      var k = Math.min(Math.floor(t), PHASES - 1);
      var e = easeOut(clamp01(t - k));
      var step = SETTLE_REM * remPx;

      for (var j = 0; j < cards.length; j++) {
        var y, s;
        if (j <= k) {                          // posée : elle recule d'un étage
          var lvl = k - j;
          y = lerp(-step * lvl, -step * (lvl + 1), e);
          s = lerp(1 - SETTLE_SCALE * lvl, 1 - SETTLE_SCALE * (lvl + 1), e);
        } else if (j === k + 1) {              // celle qui arrive
          y = lerp(ENTER_PCT / 100 * cards[j].offsetHeight, 0, e);
          s = 1;
        } else {                               // pas encore son tour
          y = ENTER_PCT / 100 * cards[j].offsetHeight;
          s = 1;
        }
        put(cards[j], y, s);
      }
      return k;
    }

    /* Approche de la première carte, avant que l'épinglage ne prenne : de
       « son haut à 110 % de la fenêtre » à « son centre au centre ». */
    function lead(vh) {
      var r = cards[0].getBoundingClientRect();
      var from = LEAD_START * vh;
      var to = vh / 2 - r.height / 2;
      var q = from === to ? 1 : clamp01((from - r.top) / (from - to));
      put(cards[0], 0, lerp(LEAD_SCALE, 1, q));
    }

    /* Colonne du téléphone : chaque carte monte pour elle-même, de « son haut à
       -10 % sous le bas de la fenêtre » à « ses 60 % au centre ». Le `scrub: 1`
       de leur version est rendu par un lissage exponentiel. */
    function column(vh) {
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var r = c.getBoundingClientRect();
        var from = vh + 0.1 * r.height;
        var to = vh / 2 - 0.6 * r.height;
        var q = from === to ? 1 : clamp01((from - r.top) / (from - to));
        mobEased[i] += (q - mobEased[i]) * MOB_SMOOTH;
        var e = mobEased[i];
        put(c, lerp(MOB_PCT / 100 * r.height, 0, e), lerp(MOB_SCALE, 1, e));
      }
    }

    function put(el, y, s) {
      el.style.transform = 'translateY(' + y.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
    }

    /* Le repère que lit la feuille : « une carte passe derrière la rangée ».
     *
     * La barre bascule en texte blanc dès qu'un fond sombre passe dessous, et
     * c'est ce qu'on veut ici — sauf pour la marque et le bouton d'appel, qui
     * doivent garder leur habillage sombre au-dessus des cartes. Une règle CSS
     * ne peut pas le savoir seule : `on-dark` dit que le fond est sombre, pas
     * ce qui le peint. On le lui dit donc, en posant une seconde classe tant
     * qu'une carte est effectivement ce qui passe à la hauteur sondée.
     *
     * Les sections sombres du thème ne sont pas concernées : elles ne posent
     * pas ce repère, et la barre y garde son comportement d'origine. */
    function mark() {
      if (!header) return;
      var over = false;
      if (section.isConnected) {
        var row = header.querySelector('.header-inner') || header;
        var y = row.getBoundingClientRect().height * PROBE;
        for (var i = 0; i < cards.length; i++) {
          var r = cards[i].getBoundingClientRect();
          if (r.top <= y && r.bottom >= y) { over = true; break; }
        }
      }
      header.classList.toggle(OVER_CLASS, over);
    }

    function draw() {
      var vh = window.innerHeight;

      if (window.innerWidth < STACK_MIN) {
        column(vh);
        mark();
        return;
      }

      var r = scroll.getBoundingClientRect();
      var span = r.height - vh;               // les 250 vh de course
      var p = span > 0 ? clamp01(-r.top / span) : 0;

      stack(p);
      if (p <= 0) lead(vh);                   // la pile n'a pas commencé : approche
      mark();
    }

    function tick() {
      draw();
      if (running) frame = requestAnimationFrame(tick);
    }

    function run(on) {
      if (on === running) return;
      running = on;
      if (on) frame = requestAnimationFrame(tick);
      else { cancelAnimationFrame(frame); draw(); }   // une dernière passe : on fige juste
    }

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        run(entries[0].isIntersecting);
      }, { rootMargin: '20% 0px' }).observe(section);
    } else {
      run(true);
    }

    addEventListener('resize', function () { readRem(); draw(); });
    readRem();
    draw();
  }

  /* Navigation Barba : le conteneur est remplacé, pas la page. On monte sur
     chaque nouveau conteneur, comme le fait hero-title-reveal.js. */
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

  function start() {
    watchNavigation();
    readRem();
    boot(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
