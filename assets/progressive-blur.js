/* Déclenchement du flou progressif, une fois le hero passé.
 *
 * L'effet lui-même est entièrement en CSS — voir assets/progressive-blur.css.
 * Ce script ne le pilote pas : il ne fait que dire « le hero a quitté l'écran »
 * en posant une classe. Aucune écoute du défilement, aucun rAF, aucune valeur
 * recalculée image par image ; c'est le `position: fixed` et la recomposition du
 * fond qui font tout le reste, y compris pendant le défilement.
 *
 * Un IntersectionObserver plutôt qu'une mesure de position : il ne se réveille
 * qu'aux deux franchissements du seuil, là où une lecture de rectangle aurait
 * demandé de sonder en continu. Et il se moque de savoir qui défile — sous
 * 768 px ce n'est pas la fenêtre mais `.body-inner`, avec Lenis par-dessus.
 *
 * Les conteneurs vivent hors du conteneur Barba, à côté de la barre de
 * navigation : ils survivent aux changements de page. Le hero, lui, est dans le
 * conteneur et disparaît avec lui — on remonte donc l'observateur à chaque
 * navigation, et l'on désarme si la page d'arrivée n'a pas de hero.
 */
(function () {
  'use strict';

  var ARME = 'is-armed';   // l'effet est en service sur cette page
  var ACTIF = 'is-on';     // ... et le hero est derrière nous

  function couches() {
    return [].slice.call(document.querySelectorAll('.progressive-blur'));
  }

  function poser(actif) {
    var l = couches();
    for (var i = 0; i < l.length; i++) {
      l[i].classList.add(ARME);
      l[i].classList.toggle(ACTIF, actif);
    }
  }

  /* Sans hero — les pages intérieures, si le balisage y est un jour repris — il
     n'y a rien à attendre : on désarme, et la feuille laisse les conteneurs
     inertes plutôt que de les afficher en permanence. */
  function desarmer() {
    var l = couches();
    for (var i = 0; i < l.length; i++) l[i].classList.remove(ARME, ACTIF);
  }

  var observateur = null;

  function monter(racine) {
    if (observateur) { observateur.disconnect(); observateur = null; }

    var hero = (racine || document).querySelector('.home-hero');
    if (!hero) { desarmer(); return; }

    if (!window.IntersectionObserver) {
      /* Sans observateur, mieux vaut l'effet en permanence que pas d'effet :
         il reste juste, seul son retrait au-dessus du hero est perdu. */
      poser(true);
      return;
    }

    poser(false);
    observateur = new IntersectionObserver(function (entries) {
      poser(!entries[0].isIntersecting);
    }, { threshold: 0 });
    observateur.observe(hero);
  }

  /* Navigation Barba : même motif que les autres scripts de la maison. */
  function watchNavigation() {
    var wrapper = document.querySelector('[data-barba="wrapper"]');
    if (!wrapper || !window.MutationObserver) return;
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType === 1) monter(added[j]);
        }
      }
    }).observe(wrapper, { childList: true });
  }

  function start() {
    watchNavigation();
    monter(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
