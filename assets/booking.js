/* Réservation d'un appel de 15 minutes — page /contact.
 *
 * Trois écrans : qui appelle, quand, et comment. Le calendrier et l'écran de
 * confirmation reprennent la disposition de Cal.com ; la disponibilité, elle,
 * est décrite par le bloc DISPO ci-dessous et rien d'autre.
 *
 * Aucun serveur derrière : le site est un site statique. La confirmation
 * n'envoie donc rien — elle affiche le récapitulatif et découvre le bloc de
 * contact. Le jour où une vraie prise de rendez-vous existera, c'est
 * envoyer() qu'il faudra brancher, tout le reste est déjà en place.
 *
 * Le site navigue avec Barba : la page peut arriver sans rechargement. On
 * surveille donc le DOM et l'on monte sur le nœud entrant.
 */
(function () {
  'use strict';

  var DISPO = {
    debut: 9,            // première heure servie
    fin: 22,             // dernière heure servie (le dernier créneau finit ici)
    pas: 15,             // minutes entre deux créneaux
    duree: 15,           // durée d'un appel
    delai: 2,            // heures de préavis minimum
    horizon: 60,         // jours ouverts à la réservation
    joursOuvres: null    // null = tous les jours ; sinon [1,2,3,4,5] par exemple
  };

  var JOURS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MOIS = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'];

  var ICONES = {
    calendrier: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>',
    horloge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18-2.5-2.7-2.5-15.3 0-18z"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10.5l6-3.5v10l-6-3.5z"/></svg>',
    tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 4h4l2 5-2.5 1.5a12 12 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z"/></svg>',
    coche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="24" height="24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  function jourClef(d) {
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function memeJour(a, b) { return a && b && jourClef(a) === jourClef(b); }
  function minuit(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function creer(el) {
    var etat = {
      nom: '', societe: '', service: '',
      jour: null, creneau: null, format24: true,
      email: '', notes: '', canal: 'meet', tel: '',
      moisVu: minuit(new Date())
    };

    var q = function (sel) { return el.querySelector(sel); };
    var fuseau = 'Local time';
    try { fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone || fuseau; } catch (e) {}

    /* ── Disponibilité ─────────────────────────────────────────────────────
       Un jour est ouvert s'il n'est pas passé, qu'il tombe dans l'horizon, et
       qu'il porte au moins un créneau encore réservable — ce dernier point
       compte surtout pour aujourd'hui, où le préavis peut tout consommer. */
    function jourOuvert(d) {
      var auj = minuit(new Date());
      var limite = new Date(auj); limite.setDate(limite.getDate() + DISPO.horizon);
      if (d < auj || d > limite) return false;
      if (DISPO.joursOuvres && DISPO.joursOuvres.indexOf(d.getDay()) < 0) return false;
      return creneaux(d).length > 0;
    }

    function creneaux(d) {
      var out = [];
      var tot = (DISPO.fin - DISPO.debut) * 60 - DISPO.duree;
      var plancher = new Date();
      plancher.setHours(plancher.getHours() + DISPO.delai);
      for (var m = 0; m <= tot; m += DISPO.pas) {
        var t = new Date(d);
        t.setHours(DISPO.debut, m, 0, 0);
        if (t >= plancher) out.push(t);
      }
      return out;
    }

    function heure(d) {
      var h = d.getHours(), m = d.getMinutes();
      var mm = m < 10 ? '0' + m : '' + m;
      if (etat.format24) return (h < 10 ? '0' + h : h) + ':' + mm;
      var suffixe = h < 12 ? 'am' : 'pm';
      var h12 = h % 12 === 0 ? 12 : h % 12;
      return h12 + ':' + mm + suffixe;
    }

    /* ── Écran 1 ───────────────────────────────────────────────────────── */
    function marqueFaute(champ, oui) {
      var bloc = champ.closest('.bk-champ');
      if (bloc) bloc.classList.toggle('est-fautif', !!oui);
      return !oui;
    }

    q('.bk-pastilles').addEventListener('click', function (e) {
      var b = e.target.closest('.bk-pastille');
      if (!b) return;
      [].forEach.call(el.querySelectorAll('.bk-pastille'), function (p) {
        p.setAttribute('aria-pressed', String(p === b));
      });
      etat.service = b.textContent.trim();
      marqueFaute(b, false);
    });

    q('#bk-suivant').addEventListener('click', function () {
      var nom = q('#bk-nom'), pastilles = q('.bk-pastilles');
      var ok = true;
      ok = marqueFaute(nom, !nom.value.trim()) && ok;
      ok = marqueFaute(pastilles, !etat.service) && ok;
      if (!ok) return;
      etat.nom = nom.value.trim();
      etat.societe = q('#bk-societe').value.trim();
      allerA('quand');
    });

    /* ── Écran 2 : calendrier ──────────────────────────────────────────── */
    function dessineMois() {
      var vue = etat.moisVu;
      q('#bk-mois').innerHTML = MOIS[vue.getMonth()] + ' <em>' + vue.getFullYear() + '</em>';

      var auj = minuit(new Date());
      q('#bk-prec').disabled = vue.getFullYear() === auj.getFullYear() && vue.getMonth() === auj.getMonth();

      var premier = new Date(vue.getFullYear(), vue.getMonth(), 1);
      var debut = new Date(premier);
      debut.setDate(1 - premier.getDay());          // on remonte au dimanche
      var grille = q('#bk-grille');
      grille.innerHTML = '';

      for (var i = 0; i < 42; i++) {
        var d = new Date(debut);
        d.setDate(debut.getDate() + i);
        if (i >= 35 && d.getMonth() !== vue.getMonth()) break;   // 6e rangée inutile
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'bk-case';
        b.textContent = d.getDate();
        b.dataset.jour = d.toISOString();
        if (d.getMonth() !== vue.getMonth() && d.getDate() === 1) {
          var tag = document.createElement('span');
          tag.className = 'bk-case-mois';
          tag.textContent = MOIS[d.getMonth()].slice(0, 3);
          b.appendChild(tag);
        }
        if (jourOuvert(d)) b.classList.add('est-libre'); else b.disabled = true;
        if (memeJour(d, minuit(new Date()))) b.classList.add('est-aujourdhui');
        if (memeJour(d, etat.jour)) b.classList.add('est-choisi');
        grille.appendChild(b);
      }
    }

    function dessineCreneaux() {
      var liste = q('#bk-liste');
      liste.innerHTML = '';
      if (!etat.jour) {
        q('#bk-jour').textContent = '';
        liste.innerHTML = '<p class="bk-vide">Pick a day to see the times.</p>';
        return;
      }
      q('#bk-jour').innerHTML = JOURS[etat.jour.getDay()] + ' <em>' + etat.jour.getDate() + '</em>';
      var libres = creneaux(etat.jour);
      if (!libres.length) {
        liste.innerHTML = '<p class="bk-vide">Nothing left on this day.</p>';
        return;
      }
      libres.forEach(function (t, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'bk-creneau';
        b.textContent = heure(t);
        b.dataset.heure = t.toISOString();
        // les vingt premiers entrent l'un après l'autre ; au-delà, le retard
        // se verrait plus qu'il n'aiderait
        b.style.animationDelay = Math.min(i, 20) * 18 + 'ms';
        liste.appendChild(b);
      });
    }

    function choisitJour(d) {
      etat.jour = minuit(d);
      etat.creneau = null;
      dessineMois();
      dessineCreneaux();
    }

    q('#bk-grille').addEventListener('click', function (e) {
      var b = e.target.closest('.bk-case');
      if (!b || b.disabled) return;
      choisitJour(new Date(b.dataset.jour));
    });

    /* Le créneau se marque d'abord, la carte tourne ensuite : sans ce délai,
       le clic passe à l'écran suivant avant que l'œil ait vu ce qui a été
       choisi. 320 ms, le temps d'un regard. */
    q('#bk-liste').addEventListener('click', function (e) {
      var b = e.target.closest('.bk-creneau');
      if (!b || b.classList.contains('est-choisi')) return;
      [].forEach.call(el.querySelectorAll('.bk-creneau'), function (x) {
        x.classList.remove('est-choisi');
      });
      b.classList.add('est-choisi');
      etat.creneau = new Date(b.dataset.heure);
      remplitRecap();
      setTimeout(function () { allerA('confirmer'); }, 320);
    });

    q('#bk-prec').addEventListener('click', function () {
      etat.moisVu = new Date(etat.moisVu.getFullYear(), etat.moisVu.getMonth() - 1, 1);
      dessineMois();
    });
    q('#bk-suiv').addEventListener('click', function () {
      etat.moisVu = new Date(etat.moisVu.getFullYear(), etat.moisVu.getMonth() + 1, 1);
      dessineMois();
    });

    q('.bk-format').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      etat.format24 = b.dataset.format === '24';
      [].forEach.call(el.querySelectorAll('.bk-format button'), function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      dessineCreneaux();
      remplitRecap();
    });

    /* ── Écran 3 : confirmation ────────────────────────────────────────── */
    function dateLongue(d) {
      return JOURS[d.getDay()] + ', ' + MOIS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function remplitRecap() {
      if (!etat.creneau) return;
      var fin = new Date(etat.creneau.getTime() + DISPO.duree * 60000);
      q('#bk-recap-date').textContent = dateLongue(etat.creneau);
      q('#bk-recap-heure').textContent = heure(etat.creneau) + ' – ' + heure(fin);
      q('#bk-recap-canal').textContent = etat.canal === 'tel' ? 'Phone call' : 'Google Meet';
      q('#bk-recap-canal-ic').innerHTML = etat.canal === 'tel' ? ICONES.tel : ICONES.video;
      q('#bk-recap-fuseau').textContent = fuseau;
      q('#bk-recap-service').textContent = etat.service;
    }

    q('.bk-choix').addEventListener('click', function (e) {
      var b = e.target.closest('.bk-option');
      if (!b) return;
      etat.canal = b.dataset.canal;
      [].forEach.call(el.querySelectorAll('.bk-option'), function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      q('#bk-champ-tel').hidden = etat.canal !== 'tel';
      remplitRecap();
    });

    q('#bk-retour').addEventListener('click', function () { allerA('quand'); });

    q('#bk-confirmer').addEventListener('click', function () {
      var email = q('#bk-email'), tel = q('#bk-tel');
      var ok = true;
      ok = marqueFaute(email, !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) && ok;
      if (etat.canal === 'tel') ok = marqueFaute(tel, tel.value.trim().length < 6) && ok;
      if (!ok) return;
      etat.email = email.value.trim();
      etat.notes = q('#bk-notes').value.trim();
      etat.tel = tel.value.trim();
      envoyer();
    });

    /* ── Fin de parcours ───────────────────────────────────────────────
       Rien ne part vers un serveur : le site est statique. On remplit la carte
       de confirmation — la même que celle de Cal.com : quoi, quand, qui, où —
       puis on découvre le bloc de contact. Les liens d'ajout au calendrier,
       eux, sont réels : ils se fabriquent entièrement côté client. */
    function horodate(d) {
      return d.getUTCFullYear() +
        ('0' + (d.getUTCMonth() + 1)).slice(-2) + ('0' + d.getUTCDate()).slice(-2) + 'T' +
        ('0' + d.getUTCHours()).slice(-2) + ('0' + d.getUTCMinutes()).slice(-2) + '00Z';
    }

    function liensAgenda(debut, fin, titre, detail, lieu) {
      var d1 = horodate(debut), d2 = horodate(fin);
      var e = encodeURIComponent;
      var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + e(titre) +
              '&dates=' + d1 + '/' + d2 + '&details=' + e(detail) + '&location=' + e(lieu);
      var commun = '/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent' +
                   '&subject=' + e(titre) + '&startdt=' + e(debut.toISOString()) +
                   '&enddt=' + e(fin.toISOString()) + '&body=' + e(detail) + '&location=' + e(lieu);
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Harborview Partners//Booking//EN',
                 'BEGIN:VEVENT', 'UID:' + Date.now() + '@harborviewpartners.com',
                 'DTSTAMP:' + horodate(new Date()), 'DTSTART:' + d1, 'DTEND:' + d2,
                 'SUMMARY:' + titre, 'DESCRIPTION:' + detail, 'LOCATION:' + lieu,
                 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      return {
        google: g,
        outlook: 'https://outlook.live.com' + commun,
        office: 'https://outlook.office.com' + commun,
        ics: 'data:text/calendar;charset=utf-8,' + e(ics)
      };
    }

    function envoyer() {
      var fin = new Date(etat.creneau.getTime() + DISPO.duree * 60000);
      var titre = '15 Min Call between Harborview Partners and ' + etat.nom;
      var lieu = etat.canal === 'tel' ? 'Phone call — ' + etat.tel : 'Google Meet';

      q('#bk-quoi').textContent = titre;
      q('#bk-quand-d').textContent = dateLongue(etat.creneau);
      q('#bk-quand-h').textContent = heure(etat.creneau) + ' – ' + heure(fin);
      q('#bk-quand-tz').textContent = '(' + fuseau + ')';
      q('#bk-qui').innerHTML =
        'Harborview Partners <span class="bk-jeton bk-jeton--hote">Host</span>' +
        '<br/><small class="bk-sec">contact@harborviewpartners.com</small>' +
        '<br/><br/>' + texte(etat.nom) + (etat.societe ? ' <span class="bk-sec">· ' + texte(etat.societe) + '</span>' : '') +
        '<br/><small class="bk-sec">' + texte(etat.email) + '</small>';
      q('#bk-ou').textContent = lieu;

      var liens = liensAgenda(etat.creneau, fin, titre,
        'Booked from harborviewpartners.com — ' + etat.service, lieu);
      q('#bk-cal-google').href = liens.google;
      q('#bk-cal-outlook').href = liens.outlook;
      q('#bk-cal-office').href = liens.office;
      q('#bk-cal-ics').href = liens.ics;

      allerA('fait');
      var contact = document.getElementById('bk-contact');
      if (contact) contact.classList.add('est-visible');
    }

    function texte(v) {
      return String(v).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

    /* ── Navigation entre écrans ───────────────────────────────────────── */
    function allerA(etape) {
      el.dataset.step = etape;
      var ordre = ['qui', 'quand', 'confirmer'];
      var n = ordre.indexOf(etape);
      [].forEach.call(el.querySelectorAll('.bk-fil-item'), function (item, i) {
        item.classList.toggle('est-actif', i === n);
        item.classList.toggle('est-fait', n < 0 || i < n);
      });
      var haut = el.getBoundingClientRect().top;
      if (haut < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // premier jour libre présélectionné, comme sur la référence
    var d = minuit(new Date());
    for (var i = 0; i < DISPO.horizon && !jourOuvert(d); i++) d.setDate(d.getDate() + 1);
    etat.jour = jourOuvert(d) ? d : null;
    etat.moisVu = etat.jour ? new Date(etat.jour.getFullYear(), etat.jour.getMonth(), 1) : etat.moisVu;
    var f2 = q('#bk-fuseau-2');
    if (f2) f2.textContent = fuseau;
    dessineMois();
    dessineCreneaux();

    /* Écran d'annulation : sans serveur, aucune réservation n'existe vraiment.
       Il est donc une maquette, atteignable par ?state=cancelled — de quoi
       juger le rendu sans avoir à inventer un parcours. */
    if (/[?&]state=cancelled/.test(location.search)) {
      var quand = new Date();
      quand.setDate(quand.getDate() + 2);
      quand.setHours(9, 30, 0, 0);
      var fin2 = new Date(quand.getTime() + DISPO.duree * 60000);
      q('#bk-a-quand-d').textContent = dateLongue(quand);
      q('#bk-a-quand-h').textContent = heure(quand) + ' – ' + heure(fin2);
      q('#bk-a-quand-tz').textContent = '(' + fuseau + ')';
      allerA('annule');
    } else {
      allerA('qui');
    }
  }

  /* ── Accrochage ──────────────────────────────────────────────────────── */
  var monte = null;

  function sync() {
    var el = document.getElementById('bk');
    if (el && el !== monte) { monte = el; creer(el); }
    if (!el) monte = null;
  }

  if (window.MutationObserver) {
    var attente = 0;
    new MutationObserver(function () {
      if (attente) return;
      attente = requestAnimationFrame(function () { attente = 0; sync(); });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  addEventListener('popstate', sync);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync);
  } else {
    sync();
  }
})();
