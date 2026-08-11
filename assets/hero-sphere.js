/* Arrière-plan du hero : sphère de points.
 *
 * Reprise de background/sphere.html, câblée dans la page. Un réseau en volume —
 * des points à la surface *et* à l'intérieur d'une sphère, reliés entre eux. Les
 * liaisons se nouent, vivent, se défont et repartent ailleurs. L'ensemble tourne,
 * et se manipule à la souris.
 *
 * Trois écarts avec le démo, imposés par la page :
 *
 *  - Le site est une SPA (Barba récupère les pages en XHR) : le hero est un nœud
 *    neuf à chaque retour sur l'accueil. Un IIFE qui s'accroche une fois au
 *    chargement ne survivrait pas à la première navigation ; on surveille donc le
 *    DOM et l'on réinstancie sur le nouveau canvas.
 *  - Le glisser est écouté sur `document`, pas sur le canvas. `.home-hero-text-wrap`
 *    couvre toute la largeur du hero par-dessus (z-index 2) et avalerait les
 *    événements ; le canvas reste donc en pointer-events:none et l'on teste
 *    soi-même si le pointeur est sur la sphère.
 *  - Le fondu au scroll du thème visait `.home-hero-globe` et `.home-hero-bg-star`,
 *    tous deux retirés. On le rejoue ici sur les mêmes bornes (voir fade()).
 *
 * GSAP n'étant pas exposé par le bundle, tout est en requestAnimationFrame.
 */
(function () {
  'use strict';

  /* ══ RÉGLAGES ══════════════════════════════════════════════════════════════ */
  var CFG = {
    points:     290,            // points au total
    shellShare: .58,            // part posée à la surface ; le reste est à l'intérieur
    innerMin:   .16,            // rayon minimal d'un point intérieur

    center:   { x: .80, y: .50 },   // position, en fraction de l'écran
    radius:     .46,            // rayon, en fraction de la plus petite dimension
    portrait: { x: .50, y: .23, r: .36 },

    glow:       .86,            // intensité générale du blanc (1 = éclat d'origine)

    spin:       34,             // durée d'un tour complet (s)
    tilt:      -.32,            // inclinaison de l'axe au repos (rad)
    camera:     3.0,            // distance de la caméra, en rayons
    breathe:    .045,           // respiration du rayon de la sphère

    /* Rotation à la souris, comme le globe qu'elle remplace : la rotation
       automatique se met en pause pendant le geste, puis reprend. Désactivée
       sous 768 px, là aussi comme le globe (enableControls: !isMobile). */
    drag:       true,
    dragSpeed:  1 / 260,        // radians par pixel
    inertia:    .93,            // amortissement de l'élan après le relâchement
    tiltRange:  .55,            // débattement vertical autorisé (rad)

    /* Nappes de lumière colorée du fond — retirées : le fond est noir.
       Une entrée { c:[r,g,b], x, y, r, a, sx, sy, px, py } en rallume une. */
    warm: [],

    /* ── Le réseau ──────────────────────────────────────────────────────────
       Une seule famille de liaisons : chaque point rejoint ses plus proches
       voisins, en trait fin. Rien ne rejoint le centre, rien ne traverse le
       volume de part en part. */
    meshDegree: 3,              // voisins immédiats retenus par point
    meshAlpha:  .15,            // opacité d'une liaison

    /* Poussière libre : des points au-delà de la surface, sans aucune liaison —
       ni entre eux, ni vers le centre. Ce sont les plus éloignés du dessin. */
    free:       80,             // nombre de points libres
    freeReach:[1.06, 1.75],     // à quelle distance ils flottent, en rayons

    /* Ciel étoilé du fond, plein écran et **fixe** : les étoiles ne dérivent
       pas, elles scintillent. Trois profondeurs — les lointaines sont
       minuscules et presque éteintes, les proches plus grosses et halées.
       L'ensemble est tenu très en dessous de la sphère en luminosité, et
       estompé autour d'elle par un voile noir : c'est ce qui permet à la sphère
       de se détacher au lieu de s'y noyer. */
    stars:      360,            // nombre total pour un écran de 1600 x 900
    starTiers: [                // part du total, taille, opacité, halo
      { share: .63, size: [.30,  .60], alpha: [.05, .17], halo: false },  // très loin
      { share: .28, size: [.60, 1.05], alpha: [.16, .38], halo: false },  // milieu
      { share: .09, size: [1.1, 1.85], alpha: [.34, .62], halo: true  }   // proches
    ],
    starDrift:  0,              // dérive en px/s (0 = ciel fixe)
    starVeil:   .88,            // noircissement du ciel derrière la sphère

    /* Étoiles filantes : rares et légères, jamais deux à la fois de trop. */
    shootEvery:[8, 24],         // délai entre deux (s)
    shootSpeed:[900, 1450],     // px par seconde
    shootLen: [80, 200],        // longueur de la traînée (px)
    shootAlpha: .5,

    core:       .12,            // éclat du cœur (plus rien n'y converge)

    weave:      11,             // liaisons nouées par seconde, en régime établi
    grow:       1.1,            // durée de nouage d'une liaison (s)
    life:     [12, 34],         // durée de vie d'une liaison (s)
    retract:    .8,             // durée de dénouage (s)
    intro:      2.8,            // durée du tissage au chargement (s)
    spark:      .5,             // éclat aux extrémités quand une liaison se ferme

    signalGap:[.5, 1.8],        // délai entre deux signaux (s)
    signalDur:  .9              // durée d'un signal (s)
  };

  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var ease = function (u) { return u * u * (3 - 2 * u); };

  /* ── Une instance ═════════════════════════════════════════════════════════
     Tout l'état vit ici : deux instances ne se marchent jamais dessus, et
     destroy() ne laisse ni boucle ni écouteur derrière lui. */
  function create(canvas) {
    var host = canvas.parentElement;
    var grain = host.querySelector('.hv-grain');
    var ctx = canvas.getContext('2d');
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    var W = 0, H = 0, dpr = 1;
    var cx = 0, cy = 0, R = 0;
    var nodes = [], links = [], sparks = [], signals = [], stars = [], shots = [];
    var order = [], proj = [];
    var t = 0, budget = 0, introStart = 0, nextSignal = 0, nextShot = 0;
    var portrait = false;
    var halo = null, bigHalo = null, starVeil = null;

    // rotation : la part automatique et la part donnée à la main
    var autoPhi = 0, userPhi = 0, userTilt = 0;
    var dragging = false, lastX = 0, lastY = 0, velPhi = 0, velTilt = 0;

    var clampTilt = function (v) {
      return Math.max(-CFG.tiltRange, Math.min(CFG.tiltRange, v));
    };

    /* ── Construction ────────────────────────────────────────────────────────
       La surface suit une répartition de Fibonacci — la seule qui donne des
       points vraiment équidistants sur une sphère. L'intérieur, lui, est tiré au
       hasard : réutiliser les mêmes directions alignerait les points intérieurs
       derrière ceux de la surface, et l'on verrait des files radiales. */
    function build() {
      portrait = W / H < .9;
      var pp = CFG.portrait;
      cx = (portrait ? pp.x : CFG.center.x) * W;
      cy = (portrait ? pp.y : CFG.center.y) * H;
      R  = Math.min(W, H) * (portrait ? pp.r : CFG.radius);

      var N = CFG.points;
      var shell = Math.round(N * CFG.shellShare);
      var golden = Math.PI * (3 - Math.sqrt(5));
      nodes = [];

      var total = N + CFG.free;
      for (var i = 0; i < total; i++) {
        var x, y, z, r, yy, rr, th;
        var kind = i < shell ? 'shell' : i < N ? 'inner' : 'free';

        if (kind === 'shell') {
          yy = 1 - (i / (shell - 1)) * 2;
          rr = Math.sqrt(Math.max(0, 1 - yy * yy));
          th = i * golden;
          x = Math.cos(th) * rr; y = yy; z = Math.sin(th) * rr;
          r = 1;
        } else {
          // direction uniforme ; pour l'intérieur, rayon en racine cubique afin de
          // remplir le volume sans entasser les points au centre
          yy = rnd(-1, 1);
          rr = Math.sqrt(Math.max(0, 1 - yy * yy));
          th = rnd(0, 6.283);
          x = Math.cos(th) * rr; y = yy; z = Math.sin(th) * rr;
          r = kind === 'inner'
            ? Math.cbrt(rnd(Math.pow(CFG.innerMin, 3), 1)) * .92
            : rnd(CFG.freeReach[0], CFG.freeReach[1]);
        }

        nodes.push({
          idx: i, x: x, y: y, z: z, r: r,
          shell: kind === 'shell',
          free:  kind === 'free',
          // les points libres varient aussi de taille, pas seulement de distance :
          // c'est ce qui donne la sensation d'un champ profond plutôt que plat
          size: kind === 'free' ? rnd(.7, 1.45) : 1,
          wob: rnd(0, 6.28), wsp: rnd(.5, 1.4),      // respiration propre
          delay: 0
        });
      }

      // apparition du centre vers l'extérieur
      for (var k = 0; k < nodes.length; k++) {
        nodes[k].delay = clamp01(nodes[k].r / 1.4) * CFG.intro * .5 + rnd(0, .3);
      }

      buildStars();

      if (!halo) { bakeHalo(); bakeCenterHalo(); }
      buildLinks();

      order = nodes.map(function (_, i) { return i; });
      proj = new Array(nodes.length);
      sparks = []; signals = [];
      budget = 0; introStart = t; nextSignal = t + 1.4;
    }

    /* Ciel étoilé, en coordonnées d'écran — il ne tourne pas avec la sphère.
       Trois plans de dérive : les étoiles les plus pâles avancent le plus
       lentement, ce qui suffit à donner de la profondeur sans rien surcharger. */
    function buildStars() {
      var count = Math.round(CFG.stars * (W * H) / (1600 * 900));
      stars = [];
      for (var ti = 0; ti < CFG.starTiers.length; ti++) {
        var tier = CFG.starTiers[ti];
        var n = Math.round(count * tier.share);
        for (var i = 0; i < n; i++) {
          stars.push({
            x: rnd(0, W), y: rnd(0, H),
            r: rnd(tier.size[0], tier.size[1]),
            a: rnd(tier.alpha[0], tier.alpha[1]),
            halo: tier.halo,
            // les proches scintillent un peu plus vite que les lointaines
            tw: rnd(.2, .8) * (tier.halo ? 1.5 : 1),
            ph: rnd(0, 6.283),
            vx: rnd(-1, 1) * CFG.starDrift,
            vy: rnd(-.5, .5) * CFG.starDrift
          });
        }
      }
      shots = []; nextShot = t + rnd(2, 6);
      bakeStarVeil();
    }

    /* Étoiles filantes. Elles partent du haut à droite et filent vers le bas à
       gauche : lancées au hasard sur tout l'écran, elles traverseraient le titre
       de face. Le voile de gauche finit de les éteindre. */
    function spawnShot() {
      var ang = rnd(Math.PI * .64, Math.PI * .86);
      shots.push({
        x: rnd(W * .30, W * 1.15), y: rnd(-H * .12, H * .5),
        dx: Math.cos(ang), dy: Math.sin(ang),
        speed: rnd(CFG.shootSpeed[0], CFG.shootSpeed[1]),
        len: rnd(CFG.shootLen[0], CFG.shootLen[1]),
        dur: rnd(.55, 1),
        age: 0
      });
    }

    function drawShots(dt) {
      if (t > nextShot) {
        spawnShot();
        nextShot = t + rnd(CFG.shootEvery[0], CFG.shootEvery[1]);
      }

      for (var i = shots.length - 1; i >= 0; i--) {
        var sh = shots[i];
        sh.age += dt;
        var u = sh.age / sh.dur;
        if (u >= 1) { shots.splice(i, 1); continue; }

        var d = sh.speed * sh.age;
        var hx = sh.x + sh.dx * d, hy = sh.y + sh.dy * d;
        var tx = hx - sh.dx * sh.len, ty = hy - sh.dy * sh.len;
        var a = Math.sin(Math.PI * u) * CFG.shootAlpha;   // naît et meurt en fondu

        var g = ctx.createLinearGradient(tx, ty, hx, hy);
        g.addColorStop(0,  'rgba(255,255,255,0)');
        g.addColorStop(.7, 'rgba(255,255,255,' + (a * .32) + ')');
        g.addColorStop(1,  'rgba(255,255,255,' + a + ')');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();

        blot(hx, hy, 7, a * .55);
      }
    }

    /* Voile noir derrière la sphère : sans lui, les étoiles passent au travers du
       réseau et la sphère se noie dans le ciel au lieu de s'en détacher. */
    function bakeStarVeil() {
      var S = 256;
      var c = document.createElement('canvas');
      c.width = c.height = S;
      var g = c.getContext('2d');
      var rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      rg.addColorStop(0,   'rgba(0,0,0,' + CFG.starVeil + ')');
      rg.addColorStop(.5,  'rgba(0,0,0,' + (CFG.starVeil * .93) + ')');
      rg.addColorStop(.78, 'rgba(0,0,0,' + (CFG.starVeil * .5) + ')');
      rg.addColorStop(1,   'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, S, S);
      starVeil = c;
    }

    function drawStars(dt) {
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        if (CFG.starDrift) {
          st.x += st.vx * dt; st.y += st.vy * dt;
          if (st.x < -2) st.x = W + 2; else if (st.x > W + 2) st.x = -2;
          if (st.y < -2) st.y = H + 2; else if (st.y > H + 2) st.y = -2;
        }

        var a = st.a * (.62 + .38 * Math.sin(t * st.tw + st.ph));
        if (a < .01) continue;
        if (st.halo) blot(st.x, st.y, st.r * 5, a * .45);
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.283); ctx.fill();
      }

      drawShots(dt);

      // on éteint le ciel autour de la sphère pour qu'elle reste au premier plan
      ctx.globalCompositeOperation = 'source-over';
      var Rv = R * 1.45;      // juste de quoi dégager la sphère, pas plus
      ctx.drawImage(starVeil, cx - Rv, cy - Rv, Rv * 2, Rv * 2);
      ctx.globalCompositeOperation = 'lighter';
    }

    /* Le graphe est calculé une fois pour toutes, en 3D : les distances entre
       points ne changent pas quand la sphère tourne. Recalculer des voisinages à
       l'écran donnerait des liaisons qui sautent d'un point à l'autre. */
    function buildLinks() {
      var N = nodes.length;
      var seen = {};
      links = [];

      var dist = function (a, b) {
        return Math.sqrt(Math.pow(a.x * a.r - b.x * b.r, 2) +
                         Math.pow(a.y * a.r - b.y * b.r, 2) +
                         Math.pow(a.z * a.r - b.z * b.r, 2));
      };

      var add = function (a, b) {
        var key = a.idx < b.idx ? a.idx * N + b.idx : b.idx * N + a.idx;
        if (seen[key]) return;
        seen[key] = true;
        links.push({ a: a, b: b, state: 'off', p: 0, timer: 0 });
      };

      /* La poussière libre flotte au-delà de la surface. Elle est tenue à l'écart
         du graphe : une liaison vers l'un de ces points — a fortiori entre deux
         d'entre eux — sortirait de la sphère et traverserait le vide. */
      for (var i = 0; i < N; i++) {
        var a = nodes[i];
        if (a.free) continue;
        var best = [];
        for (var j = 0; j < N; j++) {
          if (i === j || nodes[j].free) continue;
          var d = dist(a, nodes[j]);
          if (best.length < CFG.meshDegree) {
            best.push({ j: j, d: d }); best.sort(function (u, v) { return u.d - v.d; });
          } else if (d < best[best.length - 1].d) {
            best[best.length - 1] = { j: j, d: d }; best.sort(function (u, v) { return u.d - v.d; });
          }
        }
        for (var k = 0; k < best.length; k++) add(a, nodes[best[k].j]);
      }
    }

    /* ── Projection ─────────────────────────────────────────────────────────
       On renvoie aussi la position 3D après rotation (X, Y, Z). La rotation
       étant linéaire, un point intermédiaire d'une liaison s'obtient en
       interpolant ces coordonnées-là, puis en appliquant la perspective : c'est
       ce qui fait que les grains d'une corde se resserrent là où elle s'éloigne.
       Interpoler à l'écran les espacerait uniformément, à plat. */
    function project(n, spin, ct, st, breath) {
      var c = Math.cos(spin), s = Math.sin(spin);
      var x1 =  n.x * c + n.z * s;
      var z1 = -n.x * s + n.z * c;
      var y2 = n.y * ct - z1 * st;
      var z2 = n.y * st + z1 * ct;

      var k = n.r * breath * (1 + .03 * Math.sin(t * n.wsp + n.wob));
      var X = x1 * k, Y = y2 * k, Z = z2 * k;
      var sc = CFG.camera / (CFG.camera - Z);
      return {
        X: X, Y: Y, Z: Z, sc: sc,
        x: cx + X * R * sc,
        y: cy + Y * R * sc,
        depth: clamp01((z2 + 1) / 2)                 // 0 au fond, 1 devant
      };
    }

    // un point à l'abscisse u d'une liaison : interpolation en 3D, perspective ensuite
    function along(A, B, u) {
      var X = A.X + (B.X - A.X) * u;
      var Y = A.Y + (B.Y - A.Y) * u;
      var Z = A.Z + (B.Z - A.Z) * u;
      var sc = CFG.camera / (CFG.camera - Z);
      return { x: cx + X * R * sc, y: cy + Y * R * sc, sc: sc, Z: Z };
    }

    /* Halo pré-calculé. Créer un dégradé radial par point et par image coûtait
       plus cher que tout le reste du rendu réuni ; une image mise à l'échelle
       donne exactement le même résultat pour rien. */
    function bakeCenterHalo() {
      var S = 256;
      var c = document.createElement('canvas');
      c.width = c.height = S;
      var g = c.getContext('2d');
      var rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      rg.addColorStop(0,   'rgba(255,255,255,' + (.045 * CFG.glow) + ')');
      rg.addColorStop(.25, 'rgba(240,246,255,' + (.016 * CFG.glow) + ')');
      rg.addColorStop(1,   'rgba(220,235,255,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, S, S);
      bigHalo = c;
    }

    function bakeHalo() {
      var S = 64;
      var c = document.createElement('canvas');
      c.width = c.height = S;
      var g = c.getContext('2d');
      var rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      rg.addColorStop(0,  'rgba(255,255,255,1)');
      rg.addColorStop(.5, 'rgba(255,255,255,.22)');
      rg.addColorStop(1,  'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, S, S);
      halo = c;
    }

    function blot(x, y, radius, alpha) {
      if (alpha <= .004) return;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(halo, x - radius, y - radius, radius * 2, radius * 2);
      ctx.globalAlpha = 1;
    }

    /* ── Rendu ───────────────────────────────────────────────────────────────── */
    function draw(dt) {
      t += dt;
      var age = t - introStart;
      var L = CFG.glow;
      var i, l, A, B, g, a;

      /* Rotation. La part automatique n'avance que si l'on ne tient pas la sphère —
         c'est le comportement du globe qu'elle remplace. Après le relâchement,
         l'élan s'amortit et la rotation automatique reprend la main. */
      if (!dragging) {
        autoPhi += (dt / CFG.spin) * 6.283;
        userPhi += velPhi;  velPhi  *= CFG.inertia;
        userTilt = clampTilt(userTilt + velTilt); velTilt *= CFG.inertia;
        if (Math.abs(velPhi)  < 1e-5) velPhi  = 0;
        if (Math.abs(velTilt) < 1e-5) velTilt = 0;
      }
      var spin = autoPhi + userPhi;
      var tilt = CFG.tilt + userTilt;
      var ct = Math.cos(tilt), st = Math.sin(tilt);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';                        // opaque : pas besoin de clearRect
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      drawStars(dt);

      // nappes de lumière colorée du fond (tableau vide par défaut)
      for (i = 0; i < CFG.warm.length; i++) {
        g = CFG.warm[i];
        var gx = (g.x + Math.cos(t * g.sx * 6.283 + g.px) * .05) * W;
        var gy = (g.y + Math.sin(t * g.sy * 6.283 + g.py) * .06) * H;
        var gr = Math.min(W, H) * g.r * (.92 + .08 * Math.sin(t * .11 + g.px));
        var grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        grd.addColorStop(0,   'rgba(' + g.c[0] + ',' + g.c[1] + ',' + g.c[2] + ',' + g.a + ')');
        grd.addColorStop(.32, 'rgba(' + g.c[0] + ',' + g.c[1] + ',' + g.c[2] + ',' + (g.a * .34) + ')');
        grd.addColorStop(.66, 'rgba(' + g.c[0] + ',' + g.c[1] + ',' + g.c[2] + ',' + (g.a * .09) + ')');
        grd.addColorStop(1,   'rgba(' + g.c[0] + ',' + g.c[1] + ',' + g.c[2] + ',0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 6.283); ctx.fill();
      }

      // halo blanc du centre, discret — image pré-calculée, simplement mise à
      // l'échelle : le dégradé couvrait près d'un million de pixels par image
      var Rh = R * 1.25;
      ctx.drawImage(bigHalo, cx - Rh, cy - Rh, Rh * 2, Rh * 2);

      // 1. Projection de tous les points
      var breath = 1 + CFG.breathe * Math.sin(t * .45);
      for (i = 0; i < nodes.length; i++) proj[i] = project(nodes[i], spin, ct, st, breath);

      /* 2. Cycle de vie des liaisons. Le débit de nouage est limité, sinon toutes
         naîtraient dans la même image et l'on ne verrait jamais rien se faire ;
         la durée de vie, elle, empêche le réseau de se figer une fois saturé. */
      for (i = 0; i < links.length; i++) {
        l = links[i];
        if (l.state === 'growing') {
          l.p += dt / CFG.grow;
          if (l.p >= 1) {
            l.p = 1; l.state = 'on'; l.timer = rnd(CFG.life[0], CFG.life[1]);
            if (CFG.spark) {
              sparks.push({ n: l.a, age: 0 });
              if (l.b) sparks.push({ n: l.b, age: 0 });
            }
          }
        } else if (l.state === 'on') {
          l.timer -= dt;
          if (l.timer <= 0) l.state = 'retracting';
        } else if (l.state === 'retracting') {
          l.p -= dt / CFG.retract;
          if (l.p <= 0) { l.p = 0; l.state = 'off'; }
        }
      }

      /* Densité d'équilibre : au régime établi, autant de liaisons se nouent
         qu'il s'en défait. Le tissage initial vise ce même nombre — sinon il
         allumerait tout le catalogue en 2,8 s, et le réseau s'éclaircirait
         ensuite de moitié sous les yeux du visiteur. */
      var target = Math.min(links.length,
        Math.round(CFG.weave * (CFG.life[0] + CFG.life[1]) / 2));
      var rate = age < CFG.intro ? target / CFG.intro : CFG.weave;
      budget = Math.min(budget + rate * dt, 60);

      if (budget >= 1) {
        var active = 0;
        var off = [];
        for (i = 0; i < links.length; i++) {
          l = links[i];
          if (l.state !== 'off') active++;
          else if (age > l.a.delay + .3 && (!l.b || age > l.b.delay + .3)) off.push(l);
        }
        while (budget >= 1 && off.length && active < target) {
          off.splice((Math.random() * off.length) | 0, 1)[0].state = 'growing';
          budget--; active++;
        }
      }

      /* 3. Les liaisons, du fond vers l'avant. Sans ce tri, une liaison passant
         derrière la sphère se dessinerait par-dessus les points de face. */
      var live = links.filter(function (l) { return l.p > 0; });
      for (i = 0; i < live.length; i++) {
        l = live[i];
        A = proj[l.a.idx]; B = proj[l.b.idx];
        l._A = A; l._B = B;
        l._z = (A.Z + B.Z) / 2;
      }
      live.sort(function (u, v) { return u._z - v._z; });

      ctx.lineWidth = 1;
      for (i = 0; i < live.length; i++) {
        l = live[i];
        A = l._A; B = l._B;
        var dimm = .28 + .72 * clamp01((l._z + 1) / 2);
        var grow = l.state === 'retracting' ? l.p : ease(clamp01(l.p));

        // trait plein très fin
        a = CFG.meshAlpha * L * dimm * (l.state === 'retracting' ? l.p : .35 + .65 * grow);
        if (a < .006) continue;

        ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
        ctx.beginPath();
        if (grow > .995) { ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); }
        else {
          // le trait pousse depuis les deux bouts et se referme au milieu
          var h = grow * .5;
          var M1 = along(A, B, h), M2 = along(A, B, 1 - h);
          ctx.moveTo(A.x, A.y); ctx.lineTo(M1.x, M1.y);
          ctx.moveTo(B.x, B.y); ctx.lineTo(M2.x, M2.y);
        }
        ctx.stroke();
      }

      // 4. Les points, du fond vers l'avant
      order.sort(function (a, b) { return proj[a].Z - proj[b].Z; });
      for (var oi = 0; oi < order.length; oi++) {
        var n = nodes[order[oi]], p = proj[order[oi]];
        var app = clamp01((age - n.delay) / .6);
        if (app <= 0) continue;
        /* Les points intérieurs sont plus discrets — c'est ce qui donne le volume —
           et la poussière libre s'éteint à mesure qu'elle s'éloigne, sinon elle
           pèserait autant que la sphère alors qu'elle n'est qu'une périphérie. */
        var far = clamp01((n.r - 1) / (CFG.freeReach[1] - 1));
        var tone = n.shell ? 1
                 : n.free  ? .78 - .42 * far
                 : .45 + .45 * n.r;
        a = app * (.3 + .7 * p.depth) * tone * L;
        var r = (n.shell ? 2.1 : n.free ? (1.9 - .5 * far) * n.size : 1.5) * p.sc * (.72 + .28 * p.depth);

        if (p.depth > .62 && (n.shell || n.free)) blot(p.x, p.y, r * 6, .3 * a);

        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, a) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
      }

      // 5. Le point de convergence
      if (CFG.core > 0) {
        g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .26);
        g.addColorStop(0,   'rgba(255,255,255,' + (.5 * CFG.core * L) + ')');
        g.addColorStop(.12, 'rgba(255,255,255,' + (.1 * CFG.core * L) + ')');
        g.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, R * .26, 0, 6.283); ctx.fill();
      }

      // 6. Éclats à l'instant où une liaison se ferme
      for (i = sparks.length - 1; i >= 0; i--) {
        var s = sparks[i];
        s.age += dt;
        var su = s.age / .55;
        if (su >= 1) { sparks.splice(i, 1); continue; }
        var sp = proj[s.n.idx];
        a = Math.pow(1 - su, 2) * CFG.spark * L * (.3 + .7 * sp.depth);
        ctx.strokeStyle = 'rgba(255,255,255,' + (a * .55) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 2 + su * 13, 0, 6.283); ctx.stroke();
      }

      // 7. Signaux : un grain plus vif qui parcourt une liaison établie
      if (t > nextSignal) {
        var open = links.filter(function (l) { return l.state === 'on'; });
        if (open.length) {
          signals.push({ l: open[(Math.random() * open.length) | 0], u: 0, flip: Math.random() < .5 });
        }
        nextSignal = t + rnd(CFG.signalGap[0], CFG.signalGap[1]);
      }

      for (i = signals.length - 1; i >= 0; i--) {
        var sg = signals[i];
        sg.u += dt / CFG.signalDur;
        if (sg.u >= 1 || sg.l.state !== 'on') { signals.splice(i, 1); continue; }
        A = proj[sg.l.a.idx]; B = proj[sg.l.b.idx];
        var q = along(sg.flip ? B : A, sg.flip ? A : B, ease(sg.u));
        a = Math.sin(Math.PI * sg.u) * L * (.35 + .65 * clamp01((q.Z + 1) / 2));

        blot(q.x, q.y, 9, a);
        ctx.fillStyle = 'rgba(255,255,255,' + (.85 * a) + ')';
        ctx.beginPath(); ctx.arc(q.x, q.y, 1.5, 0, 6.283); ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
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
      var from = -.2 * innerHeight;        // position de r.top au démarrage
      var to = -r.height / 2;              // position de r.top à l'arrivée
      if (to >= from) return 1;
      return 1 - clamp01((r.top - from) / (to - from));
    }

    function applyFade() {
      var f = fade();
      if (Math.abs(f - fadeShown) < .004) return;
      fadeShown = f;
      canvas.style.opacity = f;
      if (grain) grain.style.opacity = (.03 * f).toFixed(4);
    }

    /* ── Boucle et cycle de vie ─────────────────────────────────────────────── */
    var last = performance.now(), running = true, raf = 0;

    function frame(now) {
      if (!running) return;
      // borné des deux côtés : l'horodatage de rAF peut précéder le premier
      // performance.now(), et un dt négatif ferait reculer le temps
      var dt = Math.max(0, Math.min(.05, (now - last) / 1000));
      last = now;
      applyFade();
      // hors champ, on garde le temps qui passe mais on ne dessine rien
      if (fadeShown > 0) draw(dt); else t += dt;
      raf = requestAnimationFrame(frame);
    }

    var lastW = -1, lastH = -1;

    function resize() {
      var w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      dpr = Math.min(2, devicePixelRatio || 1);
      W = w; H = h;
      canvas.width = W * dpr; canvas.height = H * dpr;
      build(); draw(0);
    }

    var ro = new ResizeObserver(resize);
    ro.observe(host);

    /* ── Rotation à la souris ────────────────────────────────────────────────
       Les écouteurs sont sur `document` et non sur le canvas : `.home-hero-text-wrap`
       s'étend sur toute la largeur du hero au-dessus de lui et intercepterait
       tout. On teste donc soi-même si le pointeur est sur la sphère, en laissant
       passer les liens et les boutons. */
    function controls() { return CFG.drag && W >= 768 && !reduced; }

    function overSphere(e) {
      if (e.target && e.target.closest &&
          e.target.closest('a, button, input, textarea, select, [data-is-btn]')) return false;
      var b = canvas.getBoundingClientRect();
      var dx = e.clientX - b.left - cx, dy = e.clientY - b.top - cy;
      return Math.sqrt(dx * dx + dy * dy) < R * 1.15;
    }

    function onDown(e) {
      if (!controls() || e.button !== 0 || !overSphere(e)) return;
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      velPhi = 0; velTilt = 0;
      e.preventDefault();                 // sinon le geste sélectionne le titre
    }

    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      velPhi = dx * CFG.dragSpeed;                  // sert d'élan au relâchement
      /* Signe inversé : un point de la surface se projette en sin(α − tilt), donc
         augmenter tilt fait *remonter* la matière. Sans ce moins, la sphère fuit
         le curseur au lieu de le suivre. */
      velTilt = -dy * CFG.dragSpeed * .6;
      userPhi += velPhi;
      userTilt = clampTilt(userTilt + velTilt);
    }

    function onUp() { dragging = false; }

    function onVisibility() {
      running = !document.hidden;
      if (running) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    document.addEventListener('visibilitychange', onVisibility);
    addEventListener('scroll', applyFade, { passive: true });

    resize();
    applyFade();
    if (reduced) {
      // mouvement coupé : on déroule le tissage à vide, puis on s'arrête dessus
      for (var f = 0; f < 300; f++) draw(1 / 60);
      running = false;
    } else {
      raf = requestAnimationFrame(frame);
    }

    return {
      destroy: function () {
        running = false;
        cancelAnimationFrame(raf);
        ro.disconnect();
        document.removeEventListener('pointerdown', onDown);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
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
