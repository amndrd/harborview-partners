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
- **Navigation** : les six onglets forment une rangée horizontale posée sur l'axe
  du bouton « Book a call ». Le conteneur de l'en-tête ayant exactement la
  hauteur du bouton, `top:0` + `bottom:0` + `align-items:center` suffisent à les
  aligner : aucun décalage à régler, et le centre tombe au pixel près de 768 à
  1920 px. À droite, la rangée s'arrête une gouttière avant le bouton
  (`right:22rem`, en rem donc proportionnel). Elle n'est rendue visible qu'à
  partir de 992 px, où le thème pose `show-menu` sur l'en-tête ; en dessous c'est
  le menu déroulant qui sert, et sous 768 px le thème la passe en `display:none`.
- **La barre reste à l'écran** au défilement, avec le logo et le bouton « Work
  with us » à leur place. Le thème l'escamotait (`.on-hide`, translation de
  -101 % dès qu'on descendait) ; la classe reste posée, seuls ses effets sont
  annulés dans `assets/header.css`. Voir [la barre au défilement](#la-barre-au-défilement).
- **Hero** : le bloc de contenu (label, titre, description, boutons) prend toute
  la largeur (`grid-column:1/-1`) et se centre — mesuré à 1440 px, les quatre
  éléments ont leur centre à 720 px. La description tient sur deux lignes :
  `2.4rem` dans une colonne de `72rem` (le thème posait `1.6rem` dans `32.6rem`,
  ce qui la coupait en trois). Taille et largeur étant toutes deux en rem, la
  coupure tombe au même endroit de 992 à 1920 px, juste après « grow online, ».
  Sous 768 px l'unité rem change d'échelle : la colonne y redescend à `36rem` et
  le corps à `1.8rem`, pour trois lignes comme avant. Verticalement, il est centré **entre le bas
  du logo et le bas de l'écran** : `justify-content:center` avec une réserve
  haute égale au bas du logo (`padding-top:7.55rem`, `5.7rem` sous 767 px où
  l'en-tête est plus compact) et une réserve basse nulle.

Le bloc a longtemps été calé à gauche, pour deux raisons qui ont disparu : le
titre à mot cyclé, dont la largeur figée sur le mot le plus long faisait dériver
le texte visible jusqu'à ~80 px selon le mot affiché, et la sphère de points,
qu'il fallait laisser dégagée à droite.

## La barre au défilement

La rangée ne bouge plus : logo à gauche, bouton « Book a call » à droite, aux
mêmes places du haut de la page au bas. Ce qui change entre les deux, c'est le
milieu.

**Onglets → bouton Menu.** Le mécanisme est celui du thème et il existait déjà :
`show-menu`, posée en haut de page, fait descendre le libellé « Menu » hors de
son masque et remonter les onglets dans le leur ; passé ~80 px la classe tombe et
les deux repartent en sens inverse. Comme l'en-tête s'escamotait, cette bascule
se jouait hors champ. Elle est maintenant visible, et échelonnée : les six
onglets partent en cascade (22 ms d'écart), le bouton Menu ne descend qu'ensuite
(190 ms). Au retour en haut, l'ordre s'inverse — le Menu s'efface d'abord, les
onglets reviennent derrière lui.

**Le bloc LinkedIn** apparaît au même moment (le thème ne lui donnait qu'un fondu
d'opacité ; il monte maintenant de 0,7 rem en arrivant, 200 ms après les onglets).
La translation porte sur le bloc et non sur son contenu : l'intérieur est un
bandeau défilant piloté par le thème.

**LinkedIn à gauche, Menu à droite.** Les deux blocs sont placés par identifiant
dans la feuille du thème (`#w-node-…`) : les échanger demande de reprendre les
mêmes sélecteurs, ce que fait `header.css` — bornés par plage, car sous 768 px le
thème range déjà le Menu au bord droit et masque LinkedIn.

**Le bouton d'appel à l'action suit `on-dark`** (`assets/header.css`). Ses
couleurs viennent d'un jeu de variables que le thème bascule avec la section,
mais après la transition Barba, pas pendant : au retour sur l'accueil, on voyait
une seconde une pastille noire sur le hero noir. Raccroché à la classe que pose
la sonde de contraste, le bouton suit ce qui est peint, sans attendre.

**La couleur suit ce qui passe dessous** — `assets/header-contrast.js`. Une barre
qui reste pose un problème que le thème n'avait pas à traiter : le texte doit
rester lisible sur tout ce qui défile derrière. Sa classe `on-dark` était calée
sur des repères pensés pour un en-tête escamotable, et le résultat se
désaccordait (mesuré sur l'accueil : texte blanc sur section blanche vers
2 000 px, texte sombre sur fond noir vers 3 500 et 4 000 px).

Les surfaces viennent de la **pile du test de survol elle-même**, parcourue du
fond vers l'avant : c'est la seule liste qui dise ce qui est devant à cet
instant. Un inventaire constitué au chargement ne le dirait pas — sur la page de
réservation, la section noire n'est pas encore dimensionnée quand l'écran de
démarrage couvre la page, et la barre restait sombre sur fond noir faute d'un
défilement pour rattraper l'erreur (d'où les quelques reprises programmées
pendant l'intro).

Le test de survol ne suffit pas à lui seul : à 4 000 px sur l'accueil, ce qui
peint le noir derrière la barre est une image en `pointer-events: none`,
invisible à `elementsFromPoint`. Le script regarde donc ce qui est
**réellement peint** —
fonds de couleur, images, vidéos, canvas — et les compose d'arrière en avant
comme le ferait le navigateur, en échantillonnant chaque média sur la seule bande
qui passe derrière la barre. Un dégradé moyenné en entier donnerait un gris qui
ne correspond à rien de ce qu'on voit à cette hauteur ; et une couche à demi
transparente n'est ni opaque ni absente, elle se compose. La classe posée est
celle du thème, si bien que tout son habillage suit sans une ligne de CSS de plus.

Vérifié en masquant la barre et en mesurant la luminance réelle de la rangée :
27 positions tous les 250 px sur l'accueil, plus 5 autres pages, sans un seul
écart texte/fond insuffisant. Coût négligeable — 18 surfaces recensées sur
l'accueil, 2 croisent la barre à un instant donné, 121 images/s en défilement
continu.

## Le hero survit aux navigations

Le site est une SPA : Barba remplace le contenu du conteneur, et **rien d'autre**.
Tout ce qui vit hors du conteneur appartient donc à la page par laquelle on est
entré, et n'est jamais remplacé. C'est la règle à garder en tête pour toute
addition au hero.

Deux conséquences, toutes deux corrigées :

- **Le CSS du hero est une feuille à part** (`assets/hero.css`), liée au `<head>`
  des 40 pages. Il vivait dans le `<style>` embarqué d'`index.html`, à
  l'intérieur de `.component-global` — un bloc qui précède le conteneur. En
  arrivant sur l'accueil depuis une autre page, c'est le bloc de la page quittée
  qui restait en place : titre en police de repli, onglets en colonne, fond nu.
- **Les deux scripts du hero sont chargés partout** (`hero-title-reveal.js`,
  `hero-dots.js`), et non plus par la seule page d'accueil. Ils sont écrits pour
  ça : sans hero dans le document ils ne font rien, et leur `MutationObserver`
  les réveille quand le conteneur arrive.

Vérifié depuis `/contact`, `/about`, `/services` et `/insights`, plus deux
allers-retours d'affilée sans rechargement : titre en Sora à 80,6 px centré à
720 px, canvas à 1440 × 900, onglets en rangée, une seule instance, aucune erreur.

## Titre du hero (accueil)

Sur deux lignes, dans la casse écrite : `Grow Your Business` / `to New Heights`.
Aucun `text-transform` — le titre s'affiche tel qu'il est saisi.

- Markup : `<h1 class="need-help-title"><span class="nh-line-mask"><span class="nh-line">Grow Your Business</span></span><span class="nh-line-mask"><span class="nh-line">to New Heights</span></span></h1>`
- Police : **Sora** (Google Fonts), graisse **370**. Variable de 100 à 800, donc
  cette graisse est réellement dessinée. Ses deux sous-ensembles latins sont
  servis depuis `/cdn` comme le reste des polices : aucune requête ne sort vers
  `fonts.gstatic.com`. Elle a remplacé Bricolage Grotesque, qui n'avait pas
  d'autre usage dans le site et dont les fichiers sont partis avec elle.
- Corps en `5.6vw`, `white-space:nowrap`. Vérifié de 390 à 1920 px : deux lignes,
  sans débordement — au plus large, 1 071 px de titre pour 1 920 px d'écran. Le
  téléphone (< 768 px) garde les `7vw` d'origine : le titre y est déjà au plus
  juste, et le réduire l'aurait mis au niveau de la description.
- Apparition : `assets/hero-title-reveal.js`, CSS dans le `<style>` embarqué
  d'`index.html`.

**Ce titre est volontairement hors du système d'animation du thème** (pas de classe
`heading`) : son SplitText posait une largeur en ligne qui décalait le bloc de
472 px au chargement. Apparition et sortie sont donc gérées par le script.

**Apparition** — mêmes réglages que la description juste en dessous : une ligne =
un balayage, `--bg-progress` 30 → 100 en 1200 ms, quad in-out, 100 ms entre les
deux lignes. Le dégradé d'une ligne peignant aussi le texte de ses enfants
(`background-clip:text`), la ligne apparaît d'une seule coulée.

Le déclencheur est le démarrage réel du balayage du bandeau « One operator », pas
l'attribut `data-init-hidden` : le thème le retire ~400 ms trop tôt.

**Sortie au scroll** — calquée sur celle du reste du hero. Le thème pose la classe
`on-hidden` sur `.home-hero-text-wrap` dès le scroll et fait remonter chaque ligne
de `-100%` dans un parent en `overflow:hidden` (`transition:transform .4s`,
réversible au scroll arrière). Comme le titre n'a pas de `.split-line`, il lui
faut ses propres masques : `.nh-line-mask` reproduit le mécanisme à l'identique.
Deux différences imposées par la fonte : le masque déborde de `0.13em` vers le bas
(sinon le jambage du « g » de *Grow* et du « g » de *Heights* est rogné), marge
négative pour ne pas toucher à l'interligne ; et la sortie va à `-115%` pour
évacuer aussi cette réserve.

`window.gsap` n'étant pas exposé par le bundle, tout est en `requestAnimationFrame`.

## Arrière-plan du hero (accueil)

Une trame de points parcourue par une **onde circulaire** — des cercles qui
s'élargissent depuis le centre, comme après une goutte d'eau. Dessin au canvas 2D
dans `assets/hero-dots.js`. Le calque `.hv-bg` est le premier enfant de
`.home-hero-stick`, qui est collant : il reste donc fixe pendant les 150 vh du
hero, exactement comme le globe qu'il a fini par remplacer.

**Les réglages sont mesurés, pas devinés.** Ils viennent de sept images d'une
vidéo de référence, analysées au pixel : détection des points, ajustement de
cercle sur les crêtes, profils radiaux, analyse de teinte. Le bloc `CFG` en tête
du fichier porte chaque mesure en commentaire.

| Ce qu'on voit | Réglage | Mesure d'origine |
|---|---|---|
| Grille carrée | pas de 29 px, plancher 20 | 12,5 px pour 630 de large, soit 2 % de la largeur |
| Point au repos | opacité 7,5 %, rayon 0,04 pas | luminance 12-20 sur 255 |
| Rythme | une onde toutes les 7 s, traversée en 6 s | 7,15 s, vitesse constante à ±5 % |
| Crête | demi-largeur 0,075 D | 0,06 D à mi-hauteur, profil symétrique |
| Vie de l'onde | naît discrète, culmine aux ¾ du trajet, s'éteint au bord | 0,51 / 0,83 / 1,00 / 0,76 à 28 / 53 / 74 / 83 % du trajet |
| Centre | 49,4 % de la largeur, 56,5 % de la hauteur | fixe à ±5 px sur 10 s, quelle que soit la souris |

`D` est la demi-diagonale du hero. C'est la seule unité qui garde la même
animation d'un format à l'autre : l'onde couvre exactement le hero en 6 s, du
téléphone au 1920. Le pas de la grille, lui, est en pixels et borné — proportionnel
à la largeur, il collerait les points à 390 px.

**Au survol, la souris n'impose pas sa forme** : elle ajoute de l'énergie à ce que
l'onde dessine déjà. C'est net sur la référence — les points blancs autour du
curseur suivent l'arc de la crête, pas un cercle autour du pointeur.

- **L'orbe ne vit que pendant le geste.** Pointeur immobile depuis plus de 120 ms,
  elle s'éteint ; au moindre déplacement, elle revient. L'apparition est courte
  (170 ms, le geste doit être suivi) et l'extinction plus longue (520 ms), pour
  que l'arrêt se lise comme une extinction et non comme une coupure. Le relevé du
  tracé, lui, continue de tourner : à l'arrêt les positions convergent, donc
  l'orbe se referme en même temps qu'elle s'efface et le geste suivant repart
  d'un point net.
- Éclaircissement dans un rayon de `0,125 D`, **teinte dans un rayon deux fois plus
  large** (`0,28 D`) : la couleur déborde largement la zone éclairée.
- La teinte se pose **sur** le niveau de l'onde. Entre deux crêtes, le curseur
  laisse donc des points sombres mais colorés (mesuré sur la référence :
  RGB 17, 9, 22).
- Elle **dérive dans le temps**, un tour complet en 25 s. La référence montre tout
  le spectre — turquoise, bleu, violet, magenta, rouge — sans loi lisible ni
  corrélation avec la position du curseur ; une dérive lente est ce qui reproduit
  le mieux cette variété.
- La crête se **bombe** au passage du curseur, dans un rayon de `0,23 D`.
- **L'orbe n'est pas accrochée au curseur, c'est le relevé de son tracé.** Une
  tête court après le pointeur (rattrapage de 8 par seconde, donc elle traîne
  déjà visiblement derrière lui), et un tampon circulaire garde ses positions des
  **26 derniers relevés sur 1 s**. Souris lancée, les relevés s'espacent et
  l'orbe s'étire le long du geste ; souris arrêtée, ils se rejoignent et elle se
  referme en une seconde. Le poids (×0,958) et le rayon (×0,962) décroissent d'un
  relevé au précédent : tête large, queue effilée — à rayon constant, la traînée
  se lisait comme une bande de largeur égale, donc comme une zone teintée plutôt
  que comme un mouvement.

  Deux points de méthode. L'influence retenue est le **maximum** sur les relevés,
  jamais la somme : additionner ferait un bourrelet plus clair partout où deux
  relevés se chevauchent, c'est-à-dire dès que la souris ralentit — exactement là
  où l'orbe doit rester lisse. Et la fenêtre doit couvrir **plus d'une demi-
  seconde** : à 0,6 s, un déplacement ordinaire (400 à 500 px/s) ne produisait
  qu'une traînée aussi longue que le diamètre de l'orbe, qui restait donc ronde.

  Une errance lente de la tête (0,024 D à 0,13 Hz) l'empêche de se figer en cercle
  parfait au repos. C'est le seul écart assumé avec la référence, où le halo suit
  le curseur d'un bloc.

**Coût.** Deux passes de dessin : tous les points au repos — l'immense majorité —
sont empilés dans un seul tracé et remplis d'un coup ; seuls ceux que l'onde ou le
curseur touchent sont traités un par un, avec leur couleur. Le halo des points
vifs est une empreinte pré-dessinée qu'on étire, pas un dégradé recalculé à chaque
image — et un aplat ferait pire que rien, son bord net cerclerait chaque point
d'un anneau gris. Mesuré à 1440 × 900 : **122 images/s**.

**Le fondu au scroll est rejoué**, comme pour la sphère avant elle. Le thème
effaçait `.home-hero-globe` et `.home-hero-bg-star` pendant que la section suivante
remontait ; ces deux éléments ayant disparu, `hero-dots.js` reproduit le fondu sur
les mêmes bornes (`top top-=20%` → `center top`, au-dessus de 991 px). Il porte sur
le canvas et non sur le calque : le noir du fond, lui, doit tenir jusqu'au bout.

**Le site est une SPA.** Barba récupère les pages en XHR : le hero est un nœud neuf
à chaque retour sur l'accueil. Un `MutationObserver` compare le canvas courant à
celui de l'instance en cours — nouveau canvas, nouvelle instance ; plus de canvas,
on démonte (boucle, `ResizeObserver` et écouteurs compris). Le pointeur est écouté
sur `document` et non sur le canvas : `.home-hero-text-wrap` couvre toute la
largeur du hero par-dessus lui et avalerait les événements.

**Un squelette masqué subsiste.** La timeline d'intro du thème
(`app/chunks/Home-*.js`, minifié) cible encore `.home-hero-globe`,
`.home-hero-canvas`, `.home-hero-globe-shadow`, `.globe-label-text`,
`.home-hero-bg-star` et `.home-hero-bg-mb`. Un bloc `.hv-theme-hooks` vide et en
`display:none` lui rend ses cibles. Rien n'en sort — c'est le prix à payer pour ne
pas toucher au bundle.

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

## Chatbot (mis de côté)

Un assistant Claude en streaming — badge en bas à droite, carte de discussion sur
les 40 pages — a vécu ici jusqu'au commit `96f427d`. Il est **retiré du site**,
pas jeté : plus rien ne s'affiche, aucun point de terminaison n'écoute, et
`ANTHROPIC_API_KEY` ne sert plus à rien.

| Où le retrouver | Quoi |
|-----------------|------|
| Branche `chatbot-mis-de-cote` | Le dépôt entier au dernier commit qui l'embarque — le plus simple pour relire le code tel qu'il tournait. |
| Commits `8c97c3d`, `c915ddd`, `f7b0477` | Le retrait en trois temps : le balisage des 40 pages, `assets/chat-widget.{css,js}`, puis `api/` + `netlify/functions/` + la configuration des hébergeurs. |

Pour le remettre, révoquer les trois dans l'ordre inverse :

```bash
git revert f7b0477 c915ddd 8c97c3d
```

Restent alors trois choses que le retrait n'a pas pu faire à votre place :
rétablir `ANTHROPIC_API_KEY` chez l'hébergeur (Vercel : Settings → Environment
Variables ; Netlify : Site settings → Environment variables), relire les chiffres
de `api/_lib/persona.mjs` — délais et garanties y sont des valeurs plausibles à
valider, que l'assistant présente comme des faits —, et remettre cette section à
jour.

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

**Le coin inférieur droit est à lui seul** depuis le retrait du
[chatbot](#chatbot-mis-de-côté), qui le visait aussi. La règle qui effaçait le
bandeau pendant une conversation (`.hv-chat-open`, posée sur `<html>` par le
widget) est partie avec lui, et reviendra avec lui.

## Réserver un appel (/contact)

La page de contact est devenue une prise de rendez-vous, reprise du booker de
Cal.com — `assets/booking.css`, `assets/booking.js`.

**La palette n'est pas approchée à l'œil.** Elle est relevée dans la feuille de
Cal.com (sélecteur `.dark`) et reportée telle quelle : `#0f0f0f` le fond,
`#171717` les surfaces, `#262626` les filets, `#404040` les jours libres,
`#d4d4d4` le texte, `#fafafa` l'emphase, `#4d4d4d` les bordures de champ,
`#285231` le vert du succès, `#772522` le rouge de l'annulation. Les images-clés
d'animation sont les leurs aussi (`fadeIn`, `fade-in-up`, `slideInBottom`), et la
police est Inter, servie depuis `/cdn` comme les autres.

Trois écrans, puis deux fins :

1. **Qui appelle** : nom, société, service — en pastilles.
2. **Quand** : trois colonnes, événement à gauche, mois au milieu, créneaux à
   droite. Carte de 817 × 410 px sur un écran de 1 440. Le créneau cliqué passe
   au blanc avant que la carte tourne — 320 ms, le temps d'un regard : sans ce
   délai, l'écran suivant arrive avant que l'œil ait vu ce qui a été choisi.
3. **Comment** : récapitulatif à gauche, formulaire à droite — e-mail, notes, et
   le choix entre Google Meet et appel téléphonique. Le nom n'est pas redemandé :
   il a été donné au premier écran.
4. **Planifié** : la carte de confirmation de Cal.com — rond vert, puis
   *What / When / Who / Where*, jeton « Host », l'ajout au calendrier avec les
   marques (Google, Outlook, Microsoft, `.ics`), un bouton vers la page
   [Get in touch](#écrire-un-message-get-in-touch), et un bandeau
   « Need to make a change? Reschedule or Cancel » : replanifier renvoie au
   calendrier, annuler bascule sur la carte rouge.
5. **Annulé** : la même carte en rouge, mentions barrées, jetons « Host » et
   « Guest ». Sans serveur, aucune réservation n'existe : cet écran est une
   maquette, atteignable par `/contact?state=cancelled`.

**Les liens d'ajout au calendrier sont réels** : Google, Outlook, Microsoft 365
et un fichier `.ics` en `data:` — tout se fabrique côté client, sans serveur.

**La disponibilité tient dans un seul bloc**, `DISPO` en tête de `booking.js` :
9 h à 22 h, créneaux de 15 minutes, 2 heures de préavis, 60 jours d'horizon, tous
les jours de la semaine (`joursOuvres: null` ; mettre `[1,2,3,4,5]` pour s'en
tenir aux jours ouvrés). Les services proposés suivent le métier : site,
application ou produit web, automatisation, gestion et exploitation, marque et
contenu, acquisition, maintenance, et « Not sure yet ».

**Rien n'est envoyé nulle part.** Le site est statique : la confirmation affiche
le récapitulatif et découvre le bloc de contact, mais aucune réservation n'est
enregistrée et aucun e-mail ne part. Le jour où une vraie prise de rendez-vous
existera, c'est `envoyer()` qu'il faudra brancher — tout le reste est en place.

**Ce qui n'est pas repris de Cal.com**, à dessein : le mobilier de leur produit —
« Retour aux réservations », le pied « Cal.com », « Signaler la réservation », la
bascule de superposition d'agenda. Sur ce site, ces éléments ne mèneraient nulle
part.

**La carte s'ajuste à son écran** : 517 px pour les détails, 817 pour le
calendrier — seul écran qui a besoin de ses trois colonnes —, 717 pour la
confirmation, 617 pour la carte finale. Une ligne de formulaire étalée sur mille
pixels ne se lit pas, et la référence fait la même chose.

**La barre ne porte que deux choses** sur cette page : le bloc « Follow us on
github » à gauche et le bouton Menu à droite, à la place qu'il occupe partout
ailleurs sur le site. Les onglets sont retirés du rendu — laissés à la charge du
thème, qui les remonte dans leur masque, ils laissaient dépasser un liseré
(33/255 contre 15 pour le fond) visible sur un grand écran sombre. Le bloc social
n'apparaît d'ordinaire qu'au défilement ; il n'y a rien à faire défiler ici, on
le découvre donc d'emblée. Le bouton « Book a call » est retiré : le visiteur y
est déjà.

**Ces règles suivent la présence du module, pas l'adresse.** Pendant une
transition Barba, l'adresse change avant l'animation : réglée dessus, la barre
reprenait ses habits d'accueil — bouton « Book a call » compris — alors que la
page de réservation était encore à l'écran. Le module, lui, disparaît avec son
conteneur, à la fin de l'animation. Le bouton n'apparaît donc plus avant la
transition ; et il n'apparaît plus mal peint non plus, ses couleurs suivant
désormais `on-dark`.

**Le pied de page et le bouton de la barre sont repeints** pour cette page
seulement : le bandeau légal passe au noir avec le texte en blanc, et le bouton
« Book a call » de l'en-tête redevient blanc — le thème le peignait en noir sur
noir, ses couleurs venant d'un jeu de variables que la page ne peut pas basculer
depuis son balisage. Le sélecteur passe par `.body-inner`, l'en-tête vivant hors
du conteneur Barba. Le texte de la barre suit : il vient de
`--_color---content--main`, qui vaut ici la version claire, si bien que le
libellé « Menu » et le nom de la marque restaient en #111 sur le noir.

Le noir est posé sur `.body-inner`, pas seulement sur la section : sous 992 px le
hero commence à 58 px du haut, et une bande blanche subsistait derrière la barre.

**Un seul écran.** La page ne montre que la réservation : pas de titre, pas de
description, rien à faire défiler. Le hero prend `calc(100svh - 5.4rem)` — la
fenêtre moins la bande du pied de page. Vérifié à 1440 × 900, 1280 × 800,
1920 × 1080 et sur téléphone : aucun débordement, ni vertical ni latéral.

**La liste des créneaux porte `data-lenis-prevent`.** Sans lui, le défilement
lissé du thème capte la molette et la liste reste figée.

**Le bloc de contact est replié, pas masqué.** `display:none` le retirerait du
flux, et le SplitText du thème — qui découpe les textes au chargement —
mesurerait une largeur nulle : il posait alors `width: 5px` en ligne sur chaque
libellé, et le bloc révélé s'affichait à un mot par ligne. Replié par
`max-height`, il garde sa largeur réelle pendant que le thème le mesure.

**Le module de page du thème ne tourne plus ici.** La page ne portant plus de
formulaire, `Hero.interact` du module *Contact* échouait au chargement
(« e is not iterable »). Le conteneur porte donc un autre `data-barba-namespace`,
et — puisque plus aucun module ne lève l'attribut — la section a perdu son
`data-init-hidden` : sans quoi elle restait à `opacity: 0`, page blanche. Le
module *Contact* du thème, lui, sert désormais la page « Get in touch », qui a le
formulaire qu'il attend.

## Écrire un message (/get-in-touch)

Le formulaire de contact a sa page à part : titre « Get in touch », la même
description qu'avant, puis « Send us a message » et les cinq champs (nom, société,
e-mail, téléphone, message). C'est là que mène le bouton de la carte de
confirmation, une fois le rendez-vous pris.

De l'ancienne page de contact ne restent que ce formulaire et son en-tête, sans le
motif de demande. Carte, bureaux, adresses, hotline, horaires et vignette ont été
retirés.

## Ce que contient la copie

| Dossier    | Contenu |
|------------|---------|
| `*/index.html` | Les 61 pages (accueil, about, services, industries, insights, careers, contact, merch, produits, politiques, articles, ai-news) |
| `cdn/`     | Tous les médias Webflow : images, `srcset` responsives, 650 frames AVIF des séquences animées, vidéos MP4/WebM, polices, CSS |
| `app/`     | L'application custom du site (Vite/Rolldown) : Three.js, GSAP, Barba.js, Lenis, Swiper, curseur custom — 34 chunks |
| `vendor/`  | jQuery et la librairie Finsweet Attributes (47 chunks) |
| `images/ocean/` | Textures de la scène Three.js de l'accueil |
| `assets/`  | Les ajouts maison : `hero.css` (police, mise en page et fond du hero), `hero-dots.js` (l'onde), `hero-title-reveal.js` (apparition du titre), `header.css` et `header-contrast.js` (barre de navigation), `booking.css` / `booking.js` (réservation d'appel), `logo-glass.css` (marque), le bandeau cookies (`cookie-consent.*`, `cookie.svg`) |
| `background/` | `sphere.html` — la sphère de points qui a occupé ce fond entre le globe et l'onde ; autonome et réglable, plus câblée dans le site |
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
