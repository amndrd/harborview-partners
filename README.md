# Harborview Partners — site statique

Miroir hors-ligne de unitedcarriers.com, capturé le **9 août 2026** (build Webflow
publié le 7 août 2026), puis **rebrandé en Harborview Partners** le 9 août 2026.
61 pages, 1311 fichiers, ~158 Mo.

## Le rebrand

Toutes les occurrences de la marque d'origine ont été remplacées :

| Avant | Après |
|-------|-------|
| United Carriers | Harborview Partners |
| unitedcarriers.com · contact@unitedcarriers.com | harborviewpartners.com · contact@harborviewpartners.com |
| UC (abréviation, pages juridiques) | HP |
| United Carriers APAC Pty Ltd · United Carriers NZ Ltd | Harborview Partners APAC Pty Ltd · Harborview Partners NZ Ltd |
| `/product/united-carriers-*` | `/product/harborview-partners-*` |
| `united-carriers.webflow.shared.*.css` | `harborview-partners.webflow.shared.*.css` |

## Typographie

| Rôle | Police | Fichiers |
|------|--------|----------|
| Titres et logo | **Outfit** (500 / 600 / 700) | `cdn/…/Outfit-{Medium,SemiBold,Bold}.woff2` |
| Texte courant | Helvetica Neue (inchangée) | `…HelveticaNeue{Roman,Medium}-subset.woff2` |
| Libellés en capitales, boutons | BT Steinhart Mono (inchangée) | `…BTSteinhart-RegularMono-subset.woff2` |

Outfit remplace BT Steinhart, la display « cubique » d'origine, jugée trop
technique pour le nouveau positionnement. Elle est libre (OFL) et auto-hébergée,
comme le reste. La variable CSS `--font--heading` pilote tous les titres ; le
sous-ensemble latin couvre exactement les mêmes caractères que l'ancienne police.

**Le logo est le mot « Harborview Partners » composé en Outfit SemiBold**, en
casse titre, converti en tracés SVG (aucune dépendance au chargement de la
police). La composition passe par HarfBuzz, donc le crénage est respecté ; toutes
les pièces partagent le même repère vertical, et la fente de chaque initiale
intègre son crénage, sinon les fragments se désaligneraient.

Déclinaisons régénérées : logo du header (H|arborview + P|artners, HP en mobile),
logo de l'écran de chargement, `Logo.svg` (source du canvas WebGL du footer),
`logo-dot.png` (+ variantes 500/800), `logo-mb.png`, favicons 32/48,
webclips 180/192/512, avatar `hp-avt`, et l'image de partage `OG.jpg`.

**À corriger avant toute mise en ligne :**

- Les liens LinkedIn pointent vers `linkedin.com/company/harborview-partners-apac/`
  et `linkedin.com/in/chrislebonharborviewpartnersapac/`, qui n'existent pas.
- Le contenu rédactionnel (dirigeants nommés, actualités, témoignages) reste celui
  de l'entreprise d'origine.
- **L'ancienne marque subsiste dans les pixels de certains médias** : le camion de
  la vidéo hero de `/about` porte « UNITEDCARRIERS » peint sur sa remorque. Un
  remplacement de texte ne peut rien y faire — ces plans sont à remplacer.

## En-tête et hero (accueil)

- **Bandeau de news** : les liens « Carbon Calculator » et « Live Tracking Portal »
  ont été retirés des 60 pages (bloc `.related-news-links`).
- **Navigation** : côté droit, en miroir de sa distance au bord gauche.
  `.header-menu-list` est enfant du conteneur d'en-tête (et non de `.header-menu`)
  pour se positionner par rapport à l'écran : `right:48rem`, soit les 52rem visés
  moins les 4rem de marge du conteneur en grille. Miroir exact de 1100 à 1920 px.
  Elle n'apparaît que sur l'accueil ; les autres pages utilisent le menu déroulant,
  comme dans le site d'origine.
- **Hero** : le bloc de contenu (label, titre, description, boutons) prend toute
  la largeur (`grid-column:1/-1`) et s'aligne à gauche, sur la même marge que le
  logo. Verticalement, il est centré **entre le bas du logo et le bas de l'écran** :
  `justify-content:center` avec une réserve haute égale au bas du logo
  (`padding-top:9.07rem`, `5.7rem` sous 767 px où l'en-tête est plus compact) et
  une réserve basse nulle. Centre mesuré conforme à la cible au pixel près de 390
  à 1920 px.

Le bloc avait d'abord été centré, mais la largeur du titre étant figée sur le mot
le plus long, le texte visible dérivait jusqu'à ~80 px selon le mot affiché.
Aligné à gauche, l'aplomb est franc — et la sphère reste dégagée à droite.

## Titre du hero (accueil)

Sur deux lignes : `Need help` / `with your <mot>?`. Le mot change en boucle toutes
les 3 s : business → shop → startup → store → company → brand → restaurant → agency.

- Markup : `<h1 class="need-help-title"><span class="nh-line">…</span><span class="nh-line">with your <span class="need-help-word">business?</span></span></h1>`
- Animation : `assets/hero-word-cycle.js`, CSS dans le `<style>` embarqué d'`index.html`.
- Graisse 600 (Outfit SemiBold), la même que le logo.

**Ce titre est volontairement hors du système d'animation du thème** (pas de classe
`heading`) : son SplitText faisait du mot un fragment distinct — il apparaissait
après sa phrase — et posait une largeur en ligne qui décalait le bloc de 472 px au
chargement. Apparition et cycle sont donc entièrement gérés par le script.

Le `?` fait partie du mot cyclé (`business?`, `shop?`, …) : il change avec lui au
lieu de se déplacer.

**Apparition** — mêmes réglages que la description juste en dessous : une ligne =
un balayage, `--bg-progress` 30 → 100 en 1200 ms, quad in-out, 100 ms entre les
deux lignes. Le dégradé d'une ligne peignant aussi le texte de ses enfants
(`background-clip:text`), le mot apparaît dans la même coulée que sa phrase.

Le déclencheur est le démarrage réel du balayage du bandeau « One operator », pas
l'attribut `data-init-hidden` : le thème le retire ~400 ms trop tôt.

**Sortie au scroll** — calquée sur celle du reste du hero. Le thème pose la classe
`on-hidden` sur `.home-hero-text-wrap` dès le scroll et fait remonter chaque ligne
de `-100%` dans un parent en `overflow:hidden` (`transition:transform .4s`,
réversible au scroll arrière). Comme le titre n'a plus de `.split-line`, il lui
faut ses propres masques : `.nh-line-mask` reproduit le mécanisme à l'identique.
Deux différences imposées par la fonte : le masque déborde de `0.13em` vers le bas
(sinon le jambage du « p » de *help* et *shop* est rogné), marge négative pour ne
pas toucher à l'interligne ; et la sortie va à `-115%` pour évacuer aussi cette
réserve.

**Changement de mot** — la vague bleue fait la transition. Deux couches superposées
aux dégradés complémentaires : à gauche de la vague le nouveau mot, à droite
l'ancien. Elles sont pilotées par deux variables distinctes (`--nh-out` pour le
sortant, `--bg-progress` pour l'entrant), décalées de 180 ms : le mot sortant part
le premier, l'entrant le suit — deux vagues successives plutôt qu'une seule.

**Rien ne bouge.** Le bloc titre a une largeur figée sur sa ligne la plus longue
(`--nh-width`) et le mot sur le mot le plus long (`--nh-word-width`), tous deux
calculés par le script. Texte aligné à gauche, bloc centré par `margin:auto`.

`window.gsap` n'étant pas exposé par le bundle, tout est en `requestAnimationFrame`.

**Mise en page :** le titre s'affranchit de sa colonne (563 px) pour se centrer
sur la page — `width:100vw` et une marge négative pilotée par `--nh-shift`, que le
script calcule depuis le décalage du bloc texte et recalcule au redimensionnement.
Corps en `7vw` avec `white-space:nowrap`. Vérifié de 390 à 1920 px : deux lignes,
sans débordement, et le bloc ne bouge pas d'un pixel entre le chargement et les
changements de mot.

## Arrière-plan du hero (accueil)

Le globe terrestre en Three.js et le ciel étoilé en image ont été remplacés par une
**sphère de points** dessinée au canvas 2D : des points à la surface *et* à
l'intérieur d'une sphère, reliés à leurs plus proches voisins. Les liaisons se
nouent, vivent, se défont et repartent ailleurs. Noir absolu, blanc seul — plus
aucune couleur de marque dans le hero.

- Source de référence : `background/sphere.html`, page autonome où se règlent les
  paramètres. `assets/hero-sphere.js` en est la reprise câblée dans la page ; le
  bloc `CFG` est identique de part et d'autre, on peut donc régler dans l'une et
  reporter dans l'autre.
- Markup : `<div class="hv-bg">` (canvas + voile + vignette + grain), premier
  enfant de `.home-hero-stick`. Ce parent étant collant, le calque reste fixe
  pendant les 150 vh du hero, exactement comme le globe qu'il remplace.
- CSS dans le `<style>` embarqué d'`index.html`.

Trois écarts avec la page de référence, imposés par le site :

- **Le site est une SPA.** Barba récupère les pages en XHR : le hero est un nœud
  neuf à chaque retour sur l'accueil. Un `MutationObserver` compare le canvas
  courant à celui de l'instance en cours — nouveau canvas, nouvelle instance ;
  plus de canvas, on démonte (boucle, `ResizeObserver` et écouteurs compris).
- **Le glisser est écouté sur `document`.** `.home-hero-text-wrap` couvre toute la
  largeur du hero par-dessus le canvas (z-index 2) et avalerait les événements. Le
  canvas reste donc en `pointer-events:none` et l'on teste soi-même si le pointeur
  est sur la sphère, en laissant passer liens et boutons. Rotation désactivée sous
  768 px, comme l'était celle du globe.
- **Le fondu au scroll est rejoué.** Le thème effaçait `.home-hero-globe` et
  `.home-hero-bg-star` pendant que la section suivante remontait ; ces deux
  éléments ayant disparu, `hero-sphere.js` reproduit le fondu sur les mêmes bornes
  (`top top-=20%` → `center top`, au-dessus de 991 px). Il porte sur le canvas et
  non sur le calque : le noir du fond, lui, doit tenir jusqu'au bout.

**Mobile.** L'accueil affichait une image fixe (`Hero-MB.png`) au lieu du globe.
L'animation tourne désormais aussi en portrait : la sphère monte en haut de
l'écran, le texte garde le milieu, et le voile bascule de l'horizontale à la
verticale (`@media (max-aspect-ratio: 9/10)`).

**Un squelette masqué subsiste.** La timeline d'intro du thème
(`app/chunks/Home-*.js`, minifié) cible encore `.home-hero-globe`,
`.home-hero-canvas`, `.home-hero-globe-shadow`, `.globe-label-text`,
`.home-hero-bg-star` et `.home-hero-bg-mb`. Un bloc `.hv-theme-hooks` vide et en
`display:none` lui rend ses cibles : sans lui, GSAP avertit trois fois à chaque
chargement. Rien n'en sort — c'est le prix à payer pour ne pas toucher au bundle.

Le chargement de Three.js n'est pas supprimé pour autant : `setupGlobe()` sort de
lui-même faute de `#globe`, mais le moteur reste tiré par la scène océan, plus bas
sur la page.

Sept visuels devenus orphelins ont été supprimés du `cdn/` (332 Ko) : les quatre
tailles du ciel étoilé, les deux du halo du globe, et l'image de repli mobile.

## Lancer le site

```bash
node serve.mjs          # http://localhost:8080
node serve.mjs 3000     # autre port
```

Un serveur est **nécessaire** (pas d'ouverture en `file://`) : le site utilise des
modules ES, des transitions de page Barba.js qui récupèrent les pages en XHR, et
des chemins absolus depuis la racine.

## Chatbot

Badge en bas à droite qui s'ouvre en carte de discussion, sur les 40 pages.
Répond en streaming via l'API Claude (modèle `claude-haiku-4-5`).

```bash
ANTHROPIC_API_KEY=sk-ant-... node serve.mjs
```

Sans la variable, le site fonctionne normalement et le chatbot répond
« The assistant is not configured yet. » — rien d'autre ne casse.

**La clé ne doit jamais toucher le navigateur.** Elle serait lisible dans les
sources par n'importe quel visiteur, et utilisable à volonté à vos frais. Le
widget appelle donc `/api/chat` sur votre propre domaine ; ce point de
terminaison seul détient la clé et relaie vers Anthropic.

| Fichier | Rôle |
|---------|------|
| `api/_lib/persona.mjs` | **Le seul fichier à éditer** : modèle, prompt système, faits sur l'entreprise, plafonds. |
| `api/_lib/chat-core.mjs` | Relais vers l'API Claude, validation des entrées, limite de débit, transformation du flux SSE. |
| `api/chat.mjs` | Point d'entrée serverless (Vercel/Netlify). |
| `netlify/functions/chat.mjs` | Renvoi vers le précédent, pour la convention de dossier de Netlify. |
| `assets/chat-widget.css` / `.js` | Le badge et la carte. Le message d'accueil est la constante `GREETING` en tête du `.js`. |
| `serve.mjs` | Sert `/api/chat` en développement, avec la même logique. |

Le préfixe `_` de `api/_lib` n'est pas décoratif : Vercel transforme en route
HTTP chaque fichier de `/api` sauf ceux dont le nom commence par un souligné.
`serve.mjs` et `netlify.toml` refusent en plus de servir `/api/**` en statique,
sans quoi le prompt système serait téléchargeable.

**Adapter les réponses** — tout est dans `api/_lib/persona.mjs` :

- `CHAT_CONFIG.model` : `claude-haiku-4-5` (1 $/5 $ par million de tokens),
  `claude-sonnet-5` (3 $/15 $) ou `claude-opus-5` (5 $/25 $).
- `COMPANY_FACTS` : la seule source de l'assistant sur l'entreprise —
  positionnement, clientèle, les trois pôles (présence en ligne, automatisation,
  gestion), la méthode en quatre étapes, les engagements, les technologies et ce
  que Harborview ne fait pas. Tout ce qui n'y figure pas, l'assistant dit
  l'ignorer et renvoie vers `/contact`. **Les chiffres (délais, garanties) sont
  des valeurs plausibles à valider**, pas des engagements vérifiés : relisez-les
  avant l'ouverture au public, l'assistant les présente comme des faits. Aucune
  adresse e-mail ni téléphone n'y figure volontairement — mieux vaut renvoyer
  vers `/contact`, toujours juste, qu'une coordonnée inexistante.
- `buildSystemPrompt()` : le ton, le périmètre et les interdits (jamais de prix
  ni de délai ferme, pas de conseil juridique ou douanier, hors-sujet refusé).

**Déployer** — un seul réglage dans les deux cas : la variable d'environnement
`ANTHROPIC_API_KEY`.

| Plateforme | Ce qui est déjà en place | Ce qu'il reste à faire |
|------------|--------------------------|------------------------|
| Vercel | `vercel.json`, `api/chat.mjs` exposé sur `/api/chat` | Ajouter `ANTHROPIC_API_KEY` dans Settings → Environment Variables |
| Netlify | `netlify.toml` (redirection `/api/chat`, blocage du reste) | Ajouter `ANTHROPIC_API_KEY` dans Site settings → Environment variables |

**Garde-fous** — le point de terminaison est public : 2 000 caractères par
message, 24 messages d'historique, 1 024 tokens par réponse, 20 requêtes par
minute et par IP. Ce dernier compteur vit en mémoire : il protège un serveur
unique, mais en serverless chaque instance a la sienne — pour un vrai plafond,
utilisez celui de la plateforme (Vercel Firewall, Netlify rate limiting).

## Bandeau cookies

Repris tel quel du site Meridian (`js/main.js`, lignes 2709-3059), présent sur
les 40 pages. Quatre écarts avec la source, chacun signalé en commentaire à
l'endroit concerné dans `assets/cookie-consent.js` : la clé de stockage, la
hauteur du bandeau simple pilotée par son contenu, l'amorçage en fin de fichier,
et l'apparition déclenchée au défilement.

**Il ne conditionne aucun script.** Tout le tracking ayant été retiré de la copie
(voir plus bas), il n'y a rien à autoriser ni à bloquer : le choix est enregistré
dans `localStorage` sous `harborview-cookie-consent` (`necessary`, `analytics`,
`marketing`, `updatedAt`) et personne ne le relit. C'est une pièce d'interface,
pas un gestionnaire de consentement — si vous rebranchez un jour un script tiers,
c'est cette valeur qu'il faudra lire avant de le charger.

**Séquence** — à la première visite, rien à l'arrivée : la bulle n'apparaît
qu'une fois le hero dépassé (~75 % sorti), puis s'ouvre en bandeau 5 s plus tard.
Le premier écran reste donc entièrement dégagé. Une fois un choix fait — ou dès
la visite suivante s'il en existe un —, le widget reste une bulle discrète que le
survol ou un clic rouvrent, pour revenir sur ses préférences à tout moment.

Le repère de défilement est la première `<section>` dont la classe contient
`hero`, ou l'élément désigné par `[data-cookie-reveal-after]` ; à défaut, 60 % de
fenêtre parcourue. Tout se mesure en `getBoundingClientRect()`, jamais en
`window.scrollY` : le conteneur qui défile change d'une page à l'autre (la fenêtre
ici, `.body-inner` là, selon le montage de Lenis) et `window.scrollY` reste alors
bloqué à 0. Même raison pour l'écoute en phase de capture — `scroll` ne remonte
pas. Les repères sont relus quand ils quittent le document, les transitions Barba
remplaçant le contenu sans recharger la page.

| Fichier | Rôle |
|---------|------|
| `assets/cookie-consent.js` | La séquence, les trois choix (Reject all / Accept cookies / Save preferences), le stockage. |
| `assets/cookie-consent.css` | La bulle, le bandeau, le panneau de préférences. |
| `assets/cookie.svg` | L'icône de la bulle. |

**Cohabitation avec le chatbot** — les deux visent le coin inférieur droit. Le
bandeau s'efface en fondu tant que la carte du chat est ouverte, via une classe
`.hv-chat-open` posée sur `<html>` par `chat-widget.js`. Le passage par une classe
racine n'est pas un détour : `#cookie-consent` précède `.chat-widget` dans le HTML
et les combinateurs de frères ne regardent qu'en avant — aucun sélecteur ne peut
remonter du chat vers le bandeau.

## Ce que contient la copie

| Dossier    | Contenu |
|------------|---------|
| `*/index.html` | Les 61 pages (accueil, about, services, industries, insights, careers, contact, merch, produits, politiques, articles, ai-news) |
| `cdn/`     | Tous les médias Webflow : images, `srcset` responsives, 650 frames AVIF des séquences animées, vidéos MP4/WebM, polices, CSS |
| `app/`     | L'application custom du site (Vite/Rolldown) : Three.js, GSAP, Barba.js, Lenis, Swiper, curseur custom — 34 chunks |
| `vendor/`  | jQuery et la librairie Finsweet Attributes (47 chunks) |
| `images/ocean/` | Textures de la scène Three.js de l'accueil |
| `assets/`  | `hero-word-cycle.js` (titre du hero) et `hero-sphere.js` (arrière-plan du hero) |
| `background/` | `sphere.html` — page de référence de l'arrière-plan, autonome et réglable |
| `serve.mjs` | Serveur statique (URLs propres, `Range` pour les vidéos) |

Tout est **auto-hébergé** : aucune requête ne sort vers le CDN d'origine.

## Ce qui a été retiré volontairement

Les scripts de tracking, pour que la copie n'envoie aucune donnée à l'entreprise
réelle : Google Analytics (beacon first-party proxifié + `gtag`), Mixpanel, et la
bannière de consentement CookieYes (qui aurait recouvert le site). Retirés des
61 pages.

La bannière CookieYes a depuis été remplacée par [notre propre bandeau](#bandeau-cookies),
qui n'a rien de commun avec elle : il ne fait sortir aucune requête et ne charge
aucun script. C'est justement parce que le tracking listé ci-dessus a disparu
qu'il n'a rien à conditionner.

Le gate de dev Vite (`localhost:3000`, actif uniquement sur le domaine de staging
Webflow) a aussi été retiré — il était inerte.

## Boutique retirée

Toute la partie commerce a été supprimée : `/merchandises`, les 14 fiches
produits, `/cart`, `/checkout`, `/paypal-checkout`, `/order-confirmation`, ainsi
que les trois politiques qui n'existaient que pour elle (paiement, remboursement,
livraison). Soit **21 pages sur 61** ; il en reste 40.

Retirés en cascade dans les pages restantes : le panier du header (bloc commerce
Webflow), le script Stripe et ses deux clés `pk_live_`, l'entrée « Merchandise »
du footer, les liens vers les politiques commerce, et `assets/mirror-fixups.js`
qui ne servait qu'aux variantes de produits — 392 références sur 40 pages. Le stub
`/.wf_graphql` de `serve.mjs` a suivi : plus aucun appel n'est émis. Enfin
34 visuels produits devenus orphelins ont été supprimés du `cdn/` (3,4 Mo).

**Effet de bord bienvenu** : les erreurs 401 qui apparaissaient en console sur
toutes les pages venaient du panier. Il n'y a désormais plus aucune requête en
échec, sur aucune page.

Le CSS et le JS de Webflow contiennent encore du code commerce inutilisé. Il est
inerte et n'a pas été retiré, pour ne pas toucher aux bundles.

## Autres détails

- Les attributs SRI (`integrity`) ont été retirés : la réécriture des URLs vers
  les chemins locaux invalide les hash, ce qui bloquait la feuille de style.
- Les vidéos LinkedIn intégrées (`/insights`, `/linkedin`) pointent encore vers
  `dms.licdn.com` : ce sont des URLs signées et expirantes, non copiables. Elles
  sont en `data-src` (chargement différé) et n'affectent pas la mise en page.
- Les liens sortants (LinkedIn, Google Maps, sources presse, associations)
  pointent volontairement vers le web réel.

## Vérification effectuée

Crawl Chromium des 40 pages restantes, avec contrôle des erreurs console et des
requêtes échouées :

- **40 pages en 200, aucune en échec**
- **2 805 références locales vérifiées, aucune cible manquante**
  (5 remontées sont des faux positifs de l'extracteur : `url(#b)` et des chemins
  encodés dans des attributs JSON échappés — fichiers vérifiés présents)
- plus aucune erreur console ni requête en échec depuis le retrait de la boutique

## Reproduire / rafraîchir la capture

Les scripts du pipeline (crawl récursif, réparation d'URLs, vérification
d'intégrité, comparaison visuelle) sont dans le dossier scratchpad de la session
qui a produit cette copie ; ils ne sont pas nécessaires pour utiliser le site.
