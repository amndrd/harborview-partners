/* ============================================================================
   CHATBOT — POINT D'ENTRÉE SERVERLESS (Vercel et Netlify)

   Handler au format standard du Web (Request → Response), accepté tel quel
   par les deux plateformes :

     Vercel   : ce fichier est exposé sur /api/chat par convention de dossier.
                `export const config = { runtime: "edge" }` ci-dessous choisit
                le runtime Edge, qui sait renvoyer un flux.
     Netlify  : netlify/functions/chat.mjs le réexporte, et netlify.toml
                redirige /api/chat vers la fonction.

   En développement local, ce fichier n'est pas utilisé : serve.mjs sert la
   même logique (voir api/_lib/chat-core.mjs, partagé par les trois).

   Le préfixe « _ » de api/_lib n'est pas décoratif : Vercel transforme en
   route HTTP chaque fichier de /api, sauf ceux dont le nom commence par un
   souligné. Sans lui, persona.mjs et chat-core.mjs deviendraient des points
   de terminaison /api/persona et /api/chat-core.

   Configuration requise sur la plateforme : une variable d'environnement
   ANTHROPIC_API_KEY. Rien d'autre.
   ========================================================================= */

import {
  ChatError,
  checkRateLimit,
  createChatStream,
  STREAM_HEADERS,
} from "./_lib/chat-core.mjs";

export const config = { runtime: "edge" };

export default async function handler(request) {
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  // Derrière un proxy, l'IP du visiteur est dans les en-têtes de la
  // plateforme ; request.headers ne porte pas l'adresse de la socket.
  const clientId =
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-real-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";

  try {
    checkRateLimit(clientId);
    const body = await request.json().catch(() => null);
    const stream = await createChatStream(body, { signal: request.signal });
    return new Response(stream, { status: 200, headers: STREAM_HEADERS });
  } catch (e) {
    if (e instanceof ChatError) return json(e.status, { error: e.message });
    console.error("[chat] erreur inattendue :", e);
    return json(500, { error: "Something went wrong." });
  }
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
