/* ============================================================================
   WIDGET DE CHAT — comportement

   Le bloc HTML est identique sur les 40 pages (voir la fin de chaque
   index.html) ; ce script l'anime et parle au relais /api/chat.

   Ce qu'il ne fait PAS : appeler l'API Claude. La clé ne peut pas vivre ici,
   elle serait lisible par n'importe quel visiteur. Le widget ne connaît que
   sa propre origine ; c'est le serveur qui détient la clé (voir
   api/_lib/chat-core.mjs).

   Le widget est un enfant direct de <body>, donc hors du conteneur remplacé
   par les transitions de page Barba : la conversation survit à la navigation
   d'une page à l'autre. sessionStorage la fait survivre en plus à un
   rechargement, le temps de l'onglet.
   ========================================================================= */

(function () {
  "use strict";

  const ENDPOINT = "/api/chat";
  const STORAGE_KEY = "harborview-chat-history";
  const MAX_TURNS = 24; // même plafond que côté serveur
  const MAX_CHARS = 2000;

  /* Bulles d'accueil, une par ligne. Elles vivent ici plutôt que dans le HTML
     des 40 pages (une seule ligne à changer) et plutôt que côté serveur : elles
     sont purement décoratives, ne sont jamais envoyées au modèle et ne coûtent
     donc rien. Ce que dit cet accueil est repris dans le prompt système
     (api/_lib/persona.mjs) pour que l'assistant ne se re-présente pas. */
  const GREETING = ["Hi, I'm the Harborview assistant", "Do you have any questions?"];

  // Décalage entre les deux bulles d'accueil : elles se posent l'une après
  // l'autre plutôt que d'apparaître d'un bloc.
  const GREETING_STAGGER = 140;

  function initChatWidget(root) {
    const shell = root.querySelector("#chat-widget-shell");
    const bubbleFace = root.querySelector("#chat-widget-bubble-face");
    const panel = root.querySelector("#chat-widget-panel");
    const log = root.querySelector("#chat-widget-log");
    const form = root.querySelector("#chat-widget-form");
    const input = root.querySelector("#chat-widget-input");
    const sendBtn = root.querySelector("#chat-widget-send");
    const closeBtn = root.querySelector("#chat-widget-close");

    if (!shell || !bubbleFace || !panel || !log || !form || !input || !sendBtn || !closeBtn)
      return;

    // history : ce qui est envoyé au modèle à chaque tour (l'API est sans
    // état, donc l'historique complet repart à chaque message). Le message
    // d'accueil n'en fait pas partie — il est purement décoratif et ne coûte
    // donc aucun token.
    let history = loadHistory();
    let streaming = false;
    // Une conversation restaurée tient lieu d'accueil : on ne repart pas sur
    // « Do you have any questions? » alors que le visiteur a déjà posé les
    // siennes.
    let greeted = history.length > 0;

    /* ---------- Ouverture / fermeture ---------- */

    function setState(state) {
      root.dataset.state = state;
      bubbleFace.setAttribute("aria-expanded", String(state === "open"));
      // Hors état bulle, bubbleFace est masqué mais toujours dans le DOM :
      // on le retire du parcours clavier pour ne pas laisser un arrêt de
      // tabulation derrière la carte.
      bubbleFace.tabIndex = state === "open" ? -1 : 0;
      bubbleFace.setAttribute("aria-hidden", String(state === "open"));
      panel.setAttribute("aria-hidden", String(state !== "open"));
    }

    function open() {
      setState("open");
      root.classList.remove("has-unread");
      showGreetingOnce();
      scrollToEnd();
      // Le focus n'est pris qu'une fois la carte ouverte : sur mobile, le
      // clavier virtuel s'ouvrirait sinon par-dessus l'animation.
      window.setTimeout(() => input.focus(), 320);
    }

    function close() {
      setState("bubble");
      bubbleFace.focus();
    }

    bubbleFace.addEventListener("click", () => {
      if (root.dataset.state === "open") close();
      else open();
    });

    closeBtn.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.dataset.state === "open") close();
    });

    /* ---------- Rendu des messages ---------- */

    function scrollToEnd() {
      log.scrollTop = log.scrollHeight;
    }

    // animate : une bulle qui ARRIVE joue son entrée ; une conversation
    // restaurée d'une page précédente s'affiche d'un coup, ses messages
    // n'étant pas en train de survenir.
    function addMessage(role, text, { animate = true, delay = 0 } = {}) {
      const el = document.createElement("div");
      el.className =
        "chat-widget-msg chat-widget-msg--" + role + (animate ? " chat-widget-msg--enter" : "");
      if (delay) el.style.animationDelay = delay + "ms";
      // textContent, jamais innerHTML : le texte vient d'un modèle et d'un
      // visiteur. Rien de ce qui transite ici ne doit pouvoir être interprété
      // comme du HTML.
      el.textContent = text;
      log.appendChild(el);
      scrollToEnd();
      return el;
    }

    function addTypingIndicator() {
      const el = document.createElement("div");
      el.className =
        "chat-widget-msg chat-widget-msg--bot chat-widget-typing chat-widget-msg--enter";
      el.innerHTML = "<span></span><span></span><span></span>";
      el.setAttribute("aria-label", "Assistant is typing");
      log.appendChild(el);
      scrollToEnd();
      return el;
    }

    function setBusy(busy) {
      streaming = busy;
      sendBtn.disabled = busy;
      input.disabled = busy;
    }

    /* ---------- Persistance ---------- */

    function loadHistory() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.slice(-MAX_TURNS) : [];
      } catch (e) {
        return [];
      }
    }

    function saveHistory() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_TURNS)));
      } catch (e) {
        /* navigation privée, quota plein : la conversation vivra le temps de
           la page, sans être mémorisée. Sans conséquence fonctionnelle. */
      }
    }

    // Rejoue la conversation d'une page précédente : la carte s'ouvre là où le
    // visiteur l'a laissée, plutôt que sur un accueil qui ferait croire que
    // tout a été oublié. Le message d'accueil n'apparaît donc que sur une
    // conversation vierge.
    history.forEach((m) =>
      addMessage(m.role === "user" ? "user" : "bot", m.content, { animate: false })
    );

    /* Les bulles d'accueil ne sont créées qu'à la PREMIÈRE ouverture, pas au
       chargement de la page. Une animation se joue au moment où l'élément
       entre dans le DOM : posées dès l'init, derrière une carte encore
       fermée, leur entrée se serait déroulée dans le vide et le visiteur
       aurait trouvé les bulles déjà en place en ouvrant. */
    function showGreetingOnce() {
      if (greeted) return;
      greeted = true;
      GREETING.forEach((line, i) =>
        addMessage("bot", line, { delay: i * GREETING_STAGGER })
      );
    }

    /* ---------- Envoi et lecture du flux ---------- */

    async function send(text) {
      addMessage("user", text);
      history.push({ role: "user", content: text });
      saveHistory();

      setBusy(true);
      const typing = addTypingIndicator();
      let bubble = null;
      let answer = "";

      const settle = () => {
        if (typing.isConnected) typing.remove();
      };

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-MAX_TURNS) }),
        });

        if (!response.ok || !response.body) {
          const detail = await response.json().catch(() => null);
          throw new Error((detail && detail.error) || "The assistant is unavailable.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Les événements SSE sont séparés par une ligne vide, et un paquet
          // réseau peut couper au milieu de l'un d'eux : on ne traite que les
          // événements complets et on garde le reste pour le tour suivant.
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const evt of events) {
            const line = evt.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;

            let payload;
            try {
              payload = JSON.parse(line.slice(5).trim());
            } catch (e) {
              continue;
            }

            if (payload.type === "delta") {
              settle();
              if (!bubble) bubble = addMessage("bot", "");
              answer += payload.text;
              bubble.textContent = answer;
              scrollToEnd();
            } else if (payload.type === "error") {
              settle();
              if (!bubble) addMessage("error", payload.message);
            }
          }
        }

        if (answer) {
          history.push({ role: "assistant", content: answer });
          saveHistory();
          if (root.dataset.state !== "open") root.classList.add("has-unread");
        } else if (!log.querySelector(".chat-widget-msg--error:last-child")) {
          addMessage("error", "No reply came back. Please try again.");
        }
      } catch (e) {
        settle();
        addMessage("error", e.message || "Connection lost. Please try again.");
        // Le tour a échoué : on retire la question de l'historique pour ne pas
        // renvoyer au modèle une conversation qui se termine sur un message
        // resté sans réponse.
        history.pop();
        saveHistory();
      } finally {
        settle();
        setBusy(false);
        if (root.dataset.state === "open") input.focus();
      }
    }

    /* ---------- Zone de saisie ---------- */

    function autoGrow() {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 96) + "px";
    }

    input.addEventListener("input", autoGrow);

    input.addEventListener("keydown", (e) => {
      // Entrée envoie, Maj+Entrée passe à la ligne — la convention de tous
      // les widgets de chat. Sur mobile, la touche envoie aussi.
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim().slice(0, MAX_CHARS);
      if (!text || streaming) return;
      input.value = "";
      autoGrow();
      send(text);
    });

    setState("bubble");
  }

  /* ---------- Initialisation ----------
     Ce script est chargé en `defer`, donc DOMContentLoaded n'est pas encore
     passé au moment où il s'exécute. */
  document.addEventListener("DOMContentLoaded", () => {
    const widget = document.getElementById("chat-widget");
    if (widget) initChatWidget(widget);
  });
})();
