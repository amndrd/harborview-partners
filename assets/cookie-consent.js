/* ============================================================================
   BANDEAU DE CONSENTEMENT COOKIES — repris tel quel du site Meridian
   (js/main.js, lignes 2709-3059 : constantes + initCookieConsent).

   Quatre écarts avec la source, signalés en commentaire à l'endroit concerné :
   la clé de stockage (préfixe du site), la hauteur du bandeau simple pilotée
   par son contenu, l'amorçage en fin de fichier, qui reprend l'appel que
   Meridian faisait depuis son bloc d'initialisation global, et l'apparition
   déclenchée au scroll une fois le hero dépassé. Tout le reste est identique,
   commentaires compris.
   ========================================================================= */

(function () {
  "use strict";

  /* ---------- Bandeau de consentement cookies ----------
     Première visite (aucun choix enregistré) : rien à l'arrivée sur le site,
     puis dès que le visiteur a fait défiler au-delà du hero, la bulle
     apparaît seule quelques secondes et s'ouvre en bandeau. Une fois un
     choix fait (Reject all / Accept cookies / Save preferences), ou dès la
     visite suivante si un choix existe déjà, le widget reste une bulle
     discrète que le survol ou un clic rouvrent, pour permettre de revenir
     modifier ses préférences à tout moment. ---------- */

  // Écart n°1 avec la source : préfixe du site (valeur d'origine chez
  // Meridian : "meridian-cookie-consent"). Sans incidence sur le
  // comportement, localStorage étant déjà cloisonné par domaine.
  const COOKIE_CONSENT_STORAGE_KEY = "harborview-cookie-consent";
  const COOKIE_INTRO_DELAY = 900;
  const COOKIE_AUTO_EXPAND_DELAY = 4100; // + COOKIE_INTRO_DELAY = 5s après le passage du hero
  const COOKIE_FEEDBACK_BADGE_HOLD_DELAY = 1800;
  const COOKIE_HOVER_INTENT_DELAY = 150;

  /* ---------- Déclenchement au scroll (écart n°4 avec la source) ----------
     Meridian lançait la séquence d'apparition dès le chargement. Ici on
     attend que le visiteur ait dépassé le hero : le premier écran reste
     entièrement dégagé, et la bulle n'arrive qu'une fois la page parcourue.

     Le hero est la première <section> dont la classe contient "hero"
     (home-hero, about-hero, service-hero, career-hero, tp-insight-hero...) ;
     une page peut aussi le désigner explicitement via
     [data-cookie-reveal-after]. Sur les pages sans hero de section (listes
     d'articles p. ex.), on retombe sur la première section venue et une
     fraction de fenêtre parcourue.

     Tout se mesure en getBoundingClientRect(), jamais en window.scrollY : le
     conteneur qui défile change d'une page et d'une largeur à l'autre (la
     fenêtre ici, l'élément .body-inner là, selon la façon dont Lenis est
     monté — voir les classes "lenis"/"lenis-stopped" posées par le thème), et
     window.scrollY reste alors bloqué à 0. La position d'un élément à l'écran,
     elle, est juste quel que soit le conteneur. Même raison pour l'écoute des
     événements en phase de capture : "scroll" ne remonte pas, un listener
     ordinaire sur window ne verrait rien quand c'est .body-inner qui défile. */
  const COOKIE_HERO_PASSED_MARGIN_RATIO = 0.25; // le hero doit être sorti à ~75%
  const COOKIE_NO_HERO_SCROLL_RATIO = 0.6; // à défaut de hero : 60% de fenêtre

  function whenScrolledPastHero(callback) {
    /* Les repères sont relus dès qu'ils quittent le document. Les transitions
       de page Barba remplacent le contenu sans recharger la page : le hero
       mémorisé à l'arrivée est alors détaché, et un élément détaché renvoie un
       rectangle à zéro — ce qui satisfait le seuil et ferait apparaître le
       bandeau au premier pixel défilé de la page suivante. */
    let anchors = null;

    function getAnchors() {
      const stale =
        !anchors ||
        (anchors.hero && !anchors.hero.isConnected) ||
        (anchors.first && !anchors.first.isConnected) ||
        (anchors.last && !anchors.last.isConnected);
      if (!stale) return anchors;

      const sections = document.querySelectorAll("section");
      anchors = {
        hero: document.querySelector('[data-cookie-reveal-after], section[class*="hero"]'),
        first: sections[0] || null,
        last: sections[sections.length - 1] || null,
      };
      return anchors;
    }

    function reached() {
      const { hero, first: firstSection, last: lastSection } = getAnchors();
      if (hero) {
        if (hero.getBoundingClientRect().bottom <= window.innerHeight * COOKIE_HERO_PASSED_MARGIN_RATIO)
          return true;
      } else if (firstSection) {
        // Combien la page a défilé, vu du seul déplacement de son premier bloc.
        const scrolled = -firstSection.getBoundingClientRect().top;
        if (scrolled >= window.innerHeight * COOKIE_NO_HERO_SCROLL_RATIO) return true;
      } else {
        // Page sans <section> : rien à quoi accrocher le seuil.
        return true;
      }
      // Page tenant dans une fenêtre : rien à faire défiler, donc rien à
      // attendre — sans ce garde-fou le widget n'apparaîtrait jamais.
      return lastSection.getBoundingClientRect().bottom <= window.innerHeight + 4;
    }

    let pending = false;
    function check() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (!reached()) return;
        window.removeEventListener("scroll", check, true);
        window.removeEventListener("resize", check);
        callback();
      });
    }

    window.addEventListener("scroll", check, { passive: true, capture: true });
    window.addEventListener("resize", check);
    // Rechargement en cours de page, ancre, restauration de position : le
    // seuil peut déjà être franchi sans qu'aucun scroll ne survienne.
    check();
  }

  function initCookieConsent(root) {
    const shell = root.querySelector("#cookie-consent-shell");
    const bubbleFace = root.querySelector("#cookie-consent-bubble-face");
    const floatingIcon = root.querySelector("#cookie-consent-floating-icon");
    const content = root.querySelector("#cookie-consent-content");
    const simpleView = root.querySelector("#cookie-consent-view-simple");
    const settingsView = root.querySelector("#cookie-consent-view-settings");
    const gearBtn = root.querySelector("#cookie-consent-gear");
    const rejectBtn = root.querySelector("#cookie-consent-reject");
    const acceptBtn = root.querySelector("#cookie-consent-accept");
    const acceptSettingsBtn = root.querySelector("#cookie-consent-accept-settings");
    const saveBtn = root.querySelector("#cookie-consent-save");
    const collapseTriggers = root.querySelectorAll("[data-cookie-collapse]");
    const toggleAnalytics = root.querySelector("#cookie-consent-toggle-analytics");
    const toggleMarketing = root.querySelector("#cookie-consent-toggle-marketing");
    const simpleIconAnchor = simpleView && simpleView.querySelector(".cookie-consent-icon-btn");
    const settingsIconAnchor = settingsView && settingsView.querySelector(".cookie-consent-icon-btn");
    const feedbackBadge = root.querySelector("#cookie-consent-feedback-badge");

    if (
      !shell || !bubbleFace || !floatingIcon || !content || !simpleView || !settingsView || !gearBtn ||
      !rejectBtn || !acceptBtn || !acceptSettingsBtn || !saveBtn ||
      !toggleAnalytics || !toggleMarketing || !simpleIconAnchor || !settingsIconAnchor || !feedbackBadge
    )
      return;

    let hoverIntentTimer = null;
    let introTimer = null;
    let feedbackBadgeTimer = null;
    let resizePending = false;

    function getStoredConsent() {
      try {
        const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    function storeConsent(consent) {
      try {
        localStorage.setItem(
          COOKIE_CONSENT_STORAGE_KEY,
          JSON.stringify({
            necessary: true,
            analytics: !!consent.analytics,
            marketing: !!consent.marketing,
            updatedAt: Date.now(),
          })
        );
      } catch (e) {
        /* localStorage indisponible (navigation privée...) : le choix ne
           sera pas mémorisé, le bandeau réapparaîtra à la prochaine visite. */
      }
    }

    function setState(state) {
      root.dataset.state = state;
      gearBtn.setAttribute("aria-expanded", String(state === "settings"));
      bubbleFace.setAttribute("aria-expanded", String(state !== "bubble"));
      // Hors de l'état bulle, bubbleFace n'est qu'un doublon invisible de
      // clic (voir .cookie-consent-bubble-face dans components.css) : on le
      // retire du parcours clavier/lecteur d'écran pour ne pas laisser un
      // arrêt de tabulation fantôme derrière le contenu réellement affiché.
      bubbleFace.tabIndex = state === "bubble" ? 0 : -1;
      bubbleFace.setAttribute("aria-hidden", String(state !== "bubble"));
    }

    function showSimpleView() {
      settingsView.hidden = true;
      simpleView.hidden = false;
    }

    // ---- Icône flottante ----
    // Une seule image de cookie, toujours affichée, qui se DÉPLACE (voir
    // .cookie-consent-floating-icon dans components.css : transform:
    // translate transitionné comme la coquille) entre trois emplacements
    // possibles plutôt que d'être dupliquée/masquée à chaque état : centrée
    // dans la bulle (bubbleFace), dans la rangée du bandeau (icon-btn de
    // simpleView) ou dans le pied du panneau réglages (icon-btn de
    // settingsView). Comme .cookie-consent-content est déjà à sa taille et
    // sa position finales de façon instantanée (voir CSS), ces trois
    // "ancrages" sont toujours mesurables tout de suite, même avant que la
    // coquille qui les entoure ait fini de grandir/rétrécir — l'icône peut
    // donc se déplacer en même temps que la coquille change de forme, sans
    // attendre la fin de la transition.
    function getCurrentTranslate(el) {
      const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform || "");
      return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : { x: 0, y: 0 };
    }

    function moveFloatingIconTo(anchorEl) {
      if (!anchorEl) return;
      const iconRect = floatingIcon.getBoundingClientRect();
      const anchorRect = anchorEl.getBoundingClientRect();
      const cur = getCurrentTranslate(floatingIcon);
      const dx = anchorRect.left + anchorRect.width / 2 - (iconRect.left + iconRect.width / 2);
      const dy = anchorRect.top + anchorRect.height / 2 - (iconRect.top + iconRect.height / 2);
      floatingIcon.style.transform = `translate(${(cur.x + dx).toFixed(2)}px, ${(cur.y + dy).toFixed(2)}px)`;
    }

    function currentIconAnchor() {
      const state = root.dataset.state;
      if (state === "banner") return simpleIconAnchor;
      if (state === "settings") return settingsIconAnchor;
      return bubbleFace;
    }

    // Un redimensionnement de fenêtre peut changer --cc-w (voir le point de
    // rupture mobile dans components.css) et donc la position réelle des
    // ancrages : on garde l'icône flottante alignée dessus.
    window.addEventListener("resize", () => {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => {
        resizePending = false;
        moveFloatingIconTo(currentIconAnchor());
        updateShellHeight();
      });
    });

    // ---- Hauteur dynamique de la coquille ----
    // .cookie-consent-content est ancré par le BAS (voir components.css) :
    // il suffit donc de faire suivre la hauteur réelle du contenu par la
    // coquille (dont la transition height existe déjà) pour que le pied du
    // panneau (Accept/Save) reste visuellement fixe pendant qu'on déplie ou
    // replie une des 3 options — seul le haut du panneau bouge.
    //
    // Écart n°2 avec la source : Meridian ne l'appliquait qu'au panneau
    // réglages et laissait le bandeau simple sur la hauteur fixe du CSS
    // (8rem), taillée pour sa police, Manrope. Ce site rend le même texte en
    // Helvetica Neue, plus large : la description passe à 151px de contenu
    // dans 144px de coquille, et comme le contenu est ancré en bas, les 7px
    // de trop étaient rognés EN HAUT — le bandeau collait son bord supérieur.
    // Piloter aussi le bandeau depuis son contenu réel rend le padding
    // symétrique quelles que soient la police, la langue et la largeur, au
    // lieu de dépendre d'une hauteur devinée à l'avance. La fonction a été
    // renommée en conséquence (updateSettingsShellHeight à l'origine).
    function updateShellHeight() {
      const state = root.dataset.state;
      if (state !== "banner" && state !== "settings") return;
      shell.style.height = content.scrollHeight + "px";
    }

    // Badge rond (✓ vert / ✕ rouge) qui apparaît brièvement en haut à
    // droite de la bulle juste après un choix Accepter/Refuser, le temps de
    // confirmer visuellement le choix. Passé ce délai, le badge ET la bulle
    // s'effacent ensemble en fondu (voir .cookie-consent.is-dismissed dans
    // components.css) — le choix est déjà enregistré, plus besoin de garder
    // le widget affiché. Pendant toute cette fenêtre, "is-confirming" rend
    // bubbleFace inerte (voir components.css) : sans ça, un survol pendant
    // l'attente relançait expandToBanner et annulait la confirmation en
    // cours, rouvrant le bandeau juste après avoir cliqué Accepter/Refuser.
    function hideFeedbackBadge() {
      window.clearTimeout(feedbackBadgeTimer);
      feedbackBadge.classList.remove("is-visible");
      root.classList.remove("is-confirming");
    }

    function showFeedbackBadge(type) {
      window.clearTimeout(feedbackBadgeTimer);
      root.classList.remove("is-dismissed");
      root.classList.add("is-confirming");
      feedbackBadge.classList.remove(
        "cookie-consent-feedback-badge--accept",
        "cookie-consent-feedback-badge--reject"
      );
      feedbackBadge.classList.add(`cookie-consent-feedback-badge--${type}`);
      feedbackBadge.classList.add("is-visible");
      feedbackBadgeTimer = window.setTimeout(() => {
        feedbackBadge.classList.remove("is-visible");
        root.classList.remove("is-confirming");
        root.classList.add("is-dismissed");
      }, COOKIE_FEEDBACK_BADGE_HOLD_DELAY);
    }

    function collapseToBubble() {
      window.clearTimeout(hoverIntentTimer);
      window.clearTimeout(introTimer);
      // Rend la main aux règles CSS de l'état bulle (voir .cookie-consent-
      // shell dans components.css) : sans ça, la hauteur fixée en ligne par
      // updateShellHeight resterait collée même hors panneau réglages.
      shell.style.height = "";
      showSimpleView();
      setState("bubble");
      moveFloatingIconTo(bubbleFace);
    }

    function expandToBanner() {
      window.clearTimeout(introTimer);
      hideFeedbackBadge();
      showSimpleView();
      setState("banner");
      updateShellHeight();
      moveFloatingIconTo(simpleIconAnchor);
    }

    function expandToSettings() {
      hideFeedbackBadge();
      settingsView.hidden = false;
      simpleView.hidden = true;
      setState("settings");
      updateShellHeight();
      moveFloatingIconTo(settingsIconAnchor);
    }

    function applyStoredTogglesUI(consent) {
      toggleAnalytics.setAttribute("aria-checked", String(!!(consent && consent.analytics)));
      toggleMarketing.setAttribute("aria-checked", String(!!(consent && consent.marketing)));
    }

    function acceptAll() {
      const consent = { analytics: true, marketing: true };
      storeConsent(consent);
      applyStoredTogglesUI(consent);
      collapseToBubble();
      showFeedbackBadge("accept");
    }

    function rejectAll() {
      const consent = { analytics: false, marketing: false };
      storeConsent(consent);
      applyStoredTogglesUI(consent);
      collapseToBubble();
      showFeedbackBadge("reject");
    }

    function savePreferences() {
      storeConsent({
        analytics: toggleAnalytics.getAttribute("aria-checked") === "true",
        marketing: toggleMarketing.getAttribute("aria-checked") === "true",
      });
      collapseToBubble();
    }

    function toggleSwitch(btn) {
      btn.setAttribute("aria-checked", String(btn.getAttribute("aria-checked") !== "true"));
    }

    bubbleFace.addEventListener("click", () => {
      window.clearTimeout(hoverIntentTimer);
      if (root.dataset.state === "bubble") expandToBanner();
      else collapseToBubble();
    });

    // Délai avant qu'un simple survol ouvre le bandeau : sans lui, un clic
    // normal (mousedown puis mouseup à quelques dizaines de ms d'écart)
    // déclenche déjà le mouseenter, qui fait apparaître le bandeau et donc
    // le lien "Cookie Policy" sous le curseur — le mouseup atterrissait
    // alors sur ce lien au lieu du bouton cliqué, ouvrant la page cookies
    // au lieu de simplement déplier le bandeau.
    bubbleFace.addEventListener("mouseenter", () => {
      if (root.dataset.state !== "bubble") return;
      hoverIntentTimer = window.setTimeout(() => {
        if (root.dataset.state === "bubble") expandToBanner();
      }, COOKIE_HOVER_INTENT_DELAY);
    });

    bubbleFace.addEventListener("mouseleave", () => {
      window.clearTimeout(hoverIntentTimer);
    });

    gearBtn.addEventListener("click", expandToSettings);
    rejectBtn.addEventListener("click", rejectAll);
    acceptBtn.addEventListener("click", acceptAll);
    acceptSettingsBtn.addEventListener("click", acceptAll);
    saveBtn.addEventListener("click", savePreferences);
    toggleAnalytics.addEventListener("click", () => toggleSwitch(toggleAnalytics));
    toggleMarketing.addEventListener("click", () => toggleSwitch(toggleMarketing));
    collapseTriggers.forEach((btn) => btn.addEventListener("click", collapseToBubble));

    // Accordéon à un seul volet ouvert : déplier une option range
    // automatiquement les deux autres, comme les accordéons classiques.
    const accordionBtns = Array.from(root.querySelectorAll("[data-cookie-accordion]"));

    function setAccordionExpanded(btn, expanded) {
      const desc = document.getElementById(btn.getAttribute("aria-controls"));
      const icon = btn.querySelector(".cookie-consent-option-icon");
      btn.setAttribute("aria-expanded", String(expanded));
      if (desc) desc.hidden = !expanded;
      if (icon) icon.textContent = expanded ? "−" : "+";
    }

    accordionBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const wasExpanded = btn.getAttribute("aria-expanded") === "true";
        accordionBtns.forEach((other) => setAccordionExpanded(other, other === btn && !wasExpanded));
        // Le "hidden" ci-dessus vient de changer la hauteur naturelle du
        // contenu : on la refait suivre par la coquille tout de suite (voir
        // updateShellHeight ci-dessus).
        updateShellHeight();
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.dataset.state === "settings") collapseToBubble();
    });

    // Sur téléphone (même seuil que le CSS mobile, voir @media(max-width:
    // 480px) dans components.css), taper n'importe où hors du widget pendant
    // qu'il est déplié le referme — pas de survol pour "sortir" au doigt
    // comme à la souris, donc pas d'autre moyen de le refermer sans choisir
    // une option. Desktop non concerné : le clic externe n'y ferme rien.
    document.addEventListener("click", (e) => {
      if (!window.matchMedia("(max-width: 480px)").matches) return;
      if (root.dataset.state !== "banner" && root.dataset.state !== "settings") return;
      if (root.contains(e.target)) return;
      collapseToBubble();
    });

    // Bouton "Gérer les cookies" dans la barre de nav de politique-cookies.html
    // (voir nav-cookie-manage dans le HTML) : seul moyen de rouvrir le widget
    // une fois qu'un choix a été fait et que la bulle s'est effacée (voir
    // plus bas, stored !== null). Absent des autres pages — le if ci-dessous
    // le rend simplement sans effet ailleurs.
    const manageCookiesLink = document.getElementById("nav-cookie-manage");
    if (manageCookiesLink) {
      manageCookiesLink.addEventListener("click", () => {
        root.classList.remove("is-dismissed");
        expandToBanner();
      });
    }

    // Aide dev : "?reset-cookies" dans l'URL efface le consentement
    // enregistré avant l'init, pour retester le badge/l'auto-ouverture sans
    // passer par la console à chaque fois (ex. index.html?reset-cookies).
    if (new URLSearchParams(location.search).has("reset-cookies")) {
      try {
        localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
      } catch (e) {
        /* localStorage indisponible (navigation privée...) */
      }
    }

    const stored = getStoredConsent();
    if (stored) {
      // Un choix a déjà été fait lors d'une visite précédente : le widget ne
      // se réaffiche plus tout seul (voir manageCookiesLink ci-dessus pour
      // le rouvrir).
      applyStoredTogglesUI(stored);
      setState("bubble");
      root.classList.add("is-dismissed");
    } else {
      // Aucun choix enregistré : la séquence bulle -> bandeau n'est armée
      // qu'une fois le hero dépassé (voir whenScrolledPastHero plus haut).
      whenScrolledPastHero(() => {
        introTimer = window.setTimeout(() => {
          setState("bubble");
          introTimer = window.setTimeout(expandToBanner, COOKIE_AUTO_EXPAND_DELAY);
        }, COOKIE_INTRO_DELAY);
      });
    }
  }

  /* ---------- Initialisation ----------
     Reprend l'appel que Meridian faisait depuis son bloc d'initialisation
     global (js/main.js, « const cookieConsent = ... » dans le listener
     DOMContentLoaded). Ce script étant chargé en `defer`, DOMContentLoaded
     n'est pas encore passé au moment où il s'exécute. */

  document.addEventListener("DOMContentLoaded", () => {
    const cookieConsent = document.getElementById("cookie-consent");
    if (cookieConsent) initCookieConsent(cookieConsent);
  });
})();
