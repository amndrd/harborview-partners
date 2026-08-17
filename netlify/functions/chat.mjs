/* Netlify Functions v2 attend un handler (Request → Response) exporté par
   défaut depuis netlify/functions/<nom>.mjs — exactement la signature de
   api/chat.mjs. Ce fichier n'est donc qu'un renvoi : la logique reste en un
   seul endroit. La redirection /api/chat → cette fonction est dans
   netlify.toml. */
export { default } from "../../api/chat.mjs";
