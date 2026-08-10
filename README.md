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
Aligné à gauche, l'aplomb est franc — et le globe reste dégagé à droite.

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

## Lancer le site

```bash
node serve.mjs          # http://localhost:8080
node serve.mjs 3000     # autre port
```

Un serveur est **nécessaire** (pas d'ouverture en `file://`) : le site utilise des
modules ES, des transitions de page Barba.js qui récupèrent les pages en XHR, et
des chemins absolus depuis la racine.

## Ce que contient la copie

| Dossier    | Contenu |
|------------|---------|
| `*/index.html` | Les 61 pages (accueil, about, services, industries, insights, careers, contact, merch, produits, politiques, articles, ai-news) |
| `cdn/`     | Tous les médias Webflow : images, `srcset` responsives, 650 frames AVIF des séquences animées, vidéos MP4/WebM, polices, CSS |
| `app/`     | L'application custom du site (Vite/Rolldown) : Three.js, GSAP, Barba.js, Lenis, Swiper, curseur custom — 34 chunks |
| `vendor/`  | jQuery et la librairie Finsweet Attributes (47 chunks) |
| `images/ocean/` | Textures de la scène Three.js du hero |
| `assets/`  | `mirror-fixups.js` — voir plus bas |
| `serve.mjs` | Serveur statique (URLs propres, `Range` pour les vidéos, stub commerce) |

Tout est **auto-hébergé** : aucune requête ne sort vers le CDN d'origine.

## Ce qui a été retiré volontairement

Les scripts de tracking, pour que la copie n'envoie aucune donnée à l'entreprise
réelle : Google Analytics (beacon first-party proxifié + `gtag`), Mixpanel, et la
bannière de consentement CookieYes (qui aurait recouvert le site). Retirés des
61 pages.

Le gate de dev Vite (`localhost:3000`, actif uniquement sur le domaine de staging
Webflow) a aussi été retiré — il était inerte.

## Limite connue : l'e-commerce

Les 18 pages boutique (`/product/*`, `/cart`, `/checkout`, …) s'affichent à
l'identique, mais **le panier et le paiement ne fonctionnent pas**. Ils dépendent
du backend hébergé par Webflow (`/.wf_graphql/apollo`), qui ne fait pas partie des
fichiers du site et ne peut donc pas être copié. Ces pages laissent une erreur 401
en console — sans effet visuel.

Deux compensations côté copie :

- `serve.mjs` répond au endpoint CSRF comme le fait le site live (`{"ok":1}` +
  cookie `wf-csrf`), ce qui évite un crash JS au chargement.
- `assets/mirror-fixups.js` re-applique la classe `w--ecommerce-pill-selected`
  sur la première variante de chaque produit — c'est normalement le script
  commerce qui le fait. Purement cosmétique.

Le tag Stripe des pages boutique pointe toujours vers la clé publique du site
d'origine. Elle est publique par nature et inerte sans le backend, mais à
remplacer si la copie est mise en ligne.

## Autres détails

- Les attributs SRI (`integrity`) ont été retirés : la réécriture des URLs vers
  les chemins locaux invalide les hash, ce qui bloquait la feuille de style.
- Les vidéos LinkedIn intégrées (`/insights`, `/linkedin`) pointent encore vers
  `dms.licdn.com` : ce sont des URLs signées et expirantes, non copiables. Elles
  sont en `data-src` (chargement différé) et n'affectent pas la mise en page.
- Les liens sortants (LinkedIn, Google Maps, sources presse, associations)
  pointent volontairement vers le web réel.

## Vérification effectuée

Comparaison automatisée live / copie sous Chromium (1440×900) : captures d'écran
côte à côte, erreurs console et requêtes échouées, sur les 61 pages avec scroll
complet pour déclencher les animations et le lazy-loading.

- **1140 références d'assets locales, 0 manquante**
- 43/61 pages sans aucune erreur console ; les 18 autres ne portent que le 401
  commerce décrit plus haut
- Rendu pixel-identique au live sur les pages contrôlées. Les seules différences
  sont des états d'animation en cours — phase de rotation du globe, frame de la
  vidéo de fond, titre du bandeau news — ce qui confirme que les animations
  tournent.

## Reproduire / rafraîchir la capture

Les scripts du pipeline (crawl récursif, réparation d'URLs, vérification
d'intégrité, comparaison visuelle) sont dans le dossier scratchpad de la session
qui a produit cette copie ; ils ne sont pas nécessaires pour utiliser le site.
