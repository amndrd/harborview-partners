/* ============================================================================
   CHATBOT — CŒUR DU RELAIS VERS L'API CLAUDE

   Ce module ne dépend d'aucun serveur en particulier : il prend un corps de
   requête JSON, appelle l'API Claude en streaming, et rend un flux SSE prêt à
   être renvoyé au navigateur. Les trois points d'entrée s'appuient dessus :

     serve.mjs                  → développement local (node:http)
     api/chat.mjs               → Vercel (fonction Edge)
     netlify/functions/chat.mjs → Netlify (Functions v2)

   Pourquoi un relais : la clé API ne peut pas vivre dans le JavaScript du
   navigateur — elle serait lisible dans les sources par n'importe quel
   visiteur, et utilisable à volonté à vos frais. Le navigateur parle donc à
   votre serveur, et votre serveur seul détient la clé.

   Pourquoi fetch() plutôt que le SDK @anthropic-ai/sdk : ce site n'a ni
   package.json ni node_modules, il se lance par un simple `node serve.mjs`.
   Ajouter une dépendance npm changerait cette propriété. L'appel HTTP direct
   est ici la forme la plus fidèle au projet ; passer au SDK plus tard ne
   toucherait que ce fichier.
   ========================================================================= */

import { CHAT_CONFIG, buildSystemPrompt } from "./persona.mjs";

const ANTHROPIC_VERSION = "2023-06-01";

// Surchargeable pour les tests : pointe le relais vers un faux serveur au
// lieu de l'API réelle (voir le serveur de test dans scratchpad).
const API_BASE = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";

/* Erreur porteuse d'un code HTTP : tout ce qui est levé avec ce type a un
   message destiné à être montré au visiteur. Le reste est rendu générique. */
export class ChatError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ---------- Limite de débit ----------
   Compteur en mémoire, par IP, sur une fenêtre d'une minute. Il protège le
   développement local et un serveur unique. En serverless, chaque instance a
   sa propre mémoire et les instances se multiplient sous charge : le plafond
   réel y est donc plus haut que la valeur annoncée. Pour un vrai plafond en
   production, faites-le porter par la plateforme (Vercel Firewall, Netlify
   rate limiting) ou par un store partagé. */
const hits = new Map();

export function checkRateLimit(clientId) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = (hits.get(clientId) || []).filter((t) => t > windowStart);
  if (recent.length >= CHAT_CONFIG.rateLimitPerMinute) {
    throw new ChatError(429, "Too many messages. Please wait a minute.");
  }
  recent.push(now);
  hits.set(clientId, recent);

  // Purge : sans elle la Map grandirait indéfiniment sur un serveur au long
  // cours.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => t > windowStart)) hits.delete(key);
    }
  }
}

/* ---------- Validation du corps de requête ----------
   Tout ce qui arrive ici vient d'internet : on ne fait confiance à rien. On
   reconstruit un tableau de messages propre plutôt que de transmettre celui
   du client, pour qu'aucun champ inattendu (system, tools, images...) ne
   puisse être glissé dans l'appel à l'API. */
export function sanitizeMessages(body) {
  if (!body || !Array.isArray(body.messages)) {
    throw new ChatError(400, "Malformed request.");
  }

  const clean = [];
  for (const raw of body.messages) {
    if (!raw || (raw.role !== "user" && raw.role !== "assistant")) continue;
    const text = typeof raw.content === "string" ? raw.content.trim() : "";
    if (!text) continue;
    clean.push({
      role: raw.role,
      content: text.slice(0, CHAT_CONFIG.maxUserChars),
    });
  }

  // L'API exige un premier message "user" et refuse un tableau vide.
  while (clean.length && clean[0].role !== "user") clean.shift();
  if (!clean.length) throw new ChatError(400, "Empty message.");
  if (clean[clean.length - 1].role !== "user") {
    throw new ChatError(400, "Malformed conversation.");
  }

  // On ne garde que la fin de la conversation : l'historique est renvoyé en
  // entier à chaque tour (l'API est sans état), donc sa longueur est aussi
  // le coût de chaque message.
  return clean.slice(-CHAT_CONFIG.maxTurns);
}

/* ---------- Appel de l'API et transformation du flux ----------
   L'API Claude répond en SSE avec une douzaine de types d'événements. On n'en
   réexpédie qu'une version minimale — {type:"delta"|"done"|"error"} — pour que
   le widget n'ait pas à connaître le format d'Anthropic, et pour qu'aucun
   détail interne (usage, identifiants, messages d'erreur amont) ne parte vers
   le navigateur. */
export async function createChatStream(body, { signal } = {}) {
  const messages = sanitizeMessages(body);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ChatError(503, "The assistant is not configured yet.");
  }

  let upstream;
  try {
    upstream = await fetch(`${API_BASE}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: CHAT_CONFIG.model,
        max_tokens: CHAT_CONFIG.maxTokens,
        system: buildSystemPrompt(),
        messages,
        stream: true,
      }),
      signal,
    });
  } catch (e) {
    throw new ChatError(502, "The assistant is unreachable right now.");
  }

  if (!upstream.ok || !upstream.body) {
    // Le détail (clé invalide, quota, modèle inconnu) va dans les logs du
    // serveur, jamais au visiteur.
    const detail = await upstream.text().catch(() => "");
    console.error(`[chat] API ${upstream.status}: ${detail.slice(0, 500)}`);
    if (upstream.status === 429) {
      throw new ChatError(429, "The assistant is busy. Try again shortly.");
    }
    throw new ChatError(502, "The assistant is unavailable right now.");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const send = (payload) =>
    encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Les événements SSE sont séparés par une ligne vide ; un paquet
          // réseau peut couper n'importe où, d'où le tampon.
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (!data) continue;

              let event;
              try {
                event = JSON.parse(data);
              } catch {
                continue;
              }

              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta"
              ) {
                controller.enqueue(send({ type: "delta", text: event.delta.text }));
              } else if (event.type === "error") {
                console.error("[chat] flux interrompu :", event.error);
                controller.enqueue(
                  send({ type: "error", message: "The reply was interrupted." })
                );
              }
            }
          }
        }
        controller.enqueue(send({ type: "done" }));
      } catch (e) {
        console.error("[chat] lecture du flux :", e);
        controller.enqueue(
          send({ type: "error", message: "The reply was interrupted." })
        );
      } finally {
        controller.close();
      }
    },
  });
}

/* En-têtes communs à toutes les réponses en flux. no-cache et
   X-Accel-Buffering: no empêchent les proxys intermédiaires de mettre le flux
   en tampon — sans quoi la réponse arriverait d'un bloc à la fin, et tout
   l'intérêt du streaming disparaîtrait. */
export const STREAM_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no",
};
