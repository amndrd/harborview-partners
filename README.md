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
