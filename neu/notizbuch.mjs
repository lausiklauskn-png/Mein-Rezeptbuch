// Mein Rezeptbuch · Notizbuch: unterwegs schnell ein Foto oder eine Notiz festhalten, ohne KI und ohne Formular (Klaus 24.11.).
// Vorbild: Meine Familienakte, app/notiz-knopf.tsx (schreiben, sprechen, Foto zwischen Mikrofon und Haken; der Haken speichert bewusst;
// gespeicherte Notizen klappen zu einer Liste zusammen, darüber gleich das Feld für die nächste). Kern: modell/notiz.mjs, zeit/tag.mjs,
// ausgabe/ics.mjs, import/idee.mjs.
// Später geht es aus der Notiz weiter: Foto eines Rezepts → Rezept lesen; Foto einer Speise → Vom Teller; Text → ohne KI aufteilen oder
// von Claude ein Rezept vorschlagen lassen; mit Tag → ein Rezept wählen, das an diesem Tag in den Wochenplan und auf die Einkaufsliste
// kommt; Erinnerung als Kalenderdatei (.ics) für den Kalender des Handys. Beim Öffnen sagt eine Meldung, was heute fällig ist.
// Die Notizen stehen im Zustand (Z.notizen) und damit in Sicherung und Tresor; die Fotos sind im Gerät verkleinert (1200 px, ohne
// Aufnahmedaten), wie Rezeptbilder auch. Die Hauptdatei (app.mjs) reicht ihre Werkzeuge herein (wie bei zusatz.mjs und zine.mjs).
import { neueNotiz, notizen, notizenSortiert, faellig, aendereNotiz, ohneNotiz, notizTitel, NOTIZ_FOTOS_MAX, NOTIZ_KANTE } from '../kern/modell/notiz.mjs';
import { tagAusText } from '../kern/zeit/tag.mjs';
import { icsDatei } from '../kern/ausgabe/ics.mjs';
import { rezeptAusIdee, IDEE_MAX } from '../kern/import/idee.mjs';
import { kiAnweisungen } from '../kern/pruefung/datei.mjs';
import { rezeptAusText, zutatZeile } from '../kern/import/text.mjs';
import { rezeptAusScan } from '../kern/import/scan.mjs';
import { planen, tagIso } from '../kern/modell/plan.mjs';
import { fuelle } from '../kern/oberflaeche/sprache.mjs';

/** app: { L, spr, esc, ic, A, s, W, SK, Z(), setzeZ(z), E(), fenster, fensterZu, melde, sichern, zeichne, kopfZeichnen, rezept, istInhalt, geh,
 *         geb(), mik(sel), bildAusDatei, schluesselFenster(a, danach), befehlFrage(stellen), scanGewaehlt(dateien), scanKats(), formAus(r), titel() } */
export function notizbuch(app) {
  const { L, spr, esc, ic, A, s, W, SK, melde, sichern } = app;
  const $ = (id) => document.getElementById(id);
  const liste = () => notizen(app.Z().notizen);
  const setze = (l) => { app.setzeZ({ ...app.Z(), notizen: l }); sichern(); };
  const finde = (id) => liste().find((n) => n.id === id);
  /* Der Entwurf über das Schließen hinaus (wie im Vorbild), nur im Speicher der Seite; erst der Haken legt ab. */
  const entwurf = { text: '', fotos: [], tag: '', zeit: '' };
  let auf = '', fotoWahl = {}, offenFuer = '';   // aufgeklappte Notiz, gewähltes Foto je Notiz, Notiz, deren Schlüssel noch fehlte
  const tagText = (tag, zeit = '') => { const d = new Date(tag + 'T12:00'); return d.toLocaleDateString(app.geb(), { weekday: 'short', day: 'numeric', month: 'numeric' }) + (zeit ? ' · ' + zeit : ''); };

  /* Die Kamera: ein eigenes Feld, damit sie nicht mit dem Foto-Scan oder dem Rezeptbild zusammenläuft. */
  const kamera = document.createElement('input'); kamera.type = 'file'; kamera.accept = 'image/*'; kamera.multiple = true; kamera.setAttribute('capture', 'environment'); kamera.hidden = true; kamera.id = 'datei-notiz';
  document.body.appendChild(kamera);
  kamera.addEventListener('change', async () => {
    const d = [...kamera.files].filter((f) => /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name || '')); kamera.value = ''; if (!d.length) return;
    const platz = NOTIZ_FOTOS_MAX - entwurf.fotos.length; let kaputt = 0;
    await W.mit(L('Foto wird aufbereitet …', 'Preparing the photo …'), async () => { for (const f of d.slice(0, Math.max(0, platz))) { try { entwurf.fotos.push(await app.bildAusDatei(f, NOTIZ_KANTE)); } catch { kaputt++; } } });
    zeigen();
    if (kaputt) melde(L('Das Bild konnte nicht gelesen werden.', 'The picture could not be read.'));
    else if (d.length > platz) melde(fuelle(L('Höchstens {0} Fotos je Notiz', 'At most {0} photos per note'), NOTIZ_FOTOS_MAX));
  });

  /* Kopf: der Knopf „Notiz“; die Zahl sagt, wie viele Notizen heute fällig sind. */
  const kopfKnopf = (breit = false) => { const n = faellig(app.Z().notizen).length, t = L('Notizbuch', 'Notebook'), z = n ? `<span class="zahl nz-zahl" aria-label="${esc(fuelle(L('{0} heute', '{0} today'), n))}">${n}</span>` : '';
    return breit ? `<button class="rail-n nz-kopf" data-a="notiz" title="${t}">${ic('notiz')}<span class="t">${t}</span>${z}</button>` : `<button class="rund nz-kopf" data-a="notiz" aria-label="${t}" title="${t}">${ic('notiz')}${z}</button>`; };

  /* ── Das Fenster: oben das Feld (Mikrofon im Feld, daneben Kamera und Haken), darunter der erkannte Tag, darunter die Liste. ── */
  function erkanntHtml() {
    if (entwurf.tag) return `<button class="chip nz-tag an" data-a="nz-tag-weg" aria-pressed="true" title="${L('Tag entfernen', 'Remove day')}">${ic('plan')}${esc(tagText(entwurf.tag, entwurf.zeit))}${ic('x')}</button>`;
    const e = tagAusText(entwurf.text);
    return e ? `<button class="chip nz-tag" data-a="nz-tag-ja" data-tag="${e.tag}" data-zeit="${e.zeit || ''}" aria-pressed="false" title="${L('Tag übernehmen', 'Apply day')}">${ic('plan')}${esc(tagText(e.tag, e.zeit))} · ${L('übernehmen', 'apply')}</button>` : '';
  }
  const fotosHtml = (fotos, weg = '') => (fotos.length ? `<div class="nz-fotos">${fotos.map((f, i) => `<span class="nz-foto"><img src="${esc(f)}" alt="">${weg ? `<button data-a="${weg}" data-i="${i}" aria-label="${esc(fuelle(L('Foto {0} entfernen', 'Remove photo {0}'), i + 1))}">${ic('x')}</button>` : ''}</span>`).join('')}</div>` : '');
  function notizHtml(n) {
    const offen = auf === n.id, titel = notizTitel(n, spr()), unter = [n.tag ? tagText(n.tag, n.zeit) : '', n.fotos.length === 1 ? L('1 Foto', '1 photo') : n.fotos.length ? fuelle(L('{0} Fotos', '{0} photos'), n.fotos.length) : '', n.rezept && app.rezept(n.rezept) ? L('im Rezeptbuch', 'in the recipe book') : ''].filter(Boolean).join(' · ');
    let h = `<li class="nz-notiz${n.erledigt ? ' erl' : ''}${offen ? ' auf' : ''}" data-id="${esc(n.id)}"><div class="nz-zeile"><button class="nz-auf" data-a="nz-auf" data-id="${esc(n.id)}" aria-expanded="${offen}">${n.fotos[0] ? `<img src="${esc(n.fotos[0])}" alt="">` : ic('notiz')}<span><b>${esc(titel)}</b>${unter ? `<small>${esc(unter)}</small>` : ''}</span></button>
      <button class="rund" data-a="nz-haken" data-id="${esc(n.id)}" aria-pressed="${n.erledigt}" aria-label="${n.erledigt ? L('Wieder offen', 'Open again') : L('Abhaken', 'Tick off')}" title="${n.erledigt ? L('Wieder offen', 'Open again') : L('Abhaken', 'Tick off')}">${ic('haken')}</button><button class="rund" data-a="nz-weg" data-id="${esc(n.id)}" aria-label="${L('Notiz löschen', 'Delete note')}" title="${L('Notiz löschen', 'Delete note')}">${ic('muell')}</button></div>`;
    if (offen) {
      const i = Math.min(fotoWahl[n.id] || 0, Math.max(0, n.fotos.length - 1)), z = (a, sym, t, u) => `<button class="zeile" data-a="${a}" data-id="${esc(n.id)}">${ic(sym)}<span>${esc(t)}${u ? `<small>${esc(u)}</small>` : ''}</span>${ic('rechts', 'pf')}</button>`;
      h += `<div class="nz-inhalt">${n.text ? `<p class="nz-text">${esc(n.text)}</p>` : ''}
       ${n.fotos.length ? `<div class="nz-fotos wahl">${n.fotos.map((f, j) => `<button class="nz-foto" data-a="nz-foto-wahl" data-id="${esc(n.id)}" data-i="${j}" aria-pressed="${j === i}" aria-label="${esc(fuelle(L('Foto {0}', 'Photo {0}'), j + 1))}"><img src="${esc(f)}" alt=""></button>`).join('')}</div>` : ''}
       <div class="liste menue nz-wege">${n.fotos.length ? z('nz-lesen', 'scan', L('Rezept lesen', 'Read recipe'), 'Anthropic · ' + L('Foto', 'Photo')) + z('nz-teller', 'teller', L('Vom Teller', 'From the plate'), 'Anthropic · ' + L('Foto', 'Photo')) : ''}
        ${n.text ? z('nz-aufteilen', 'datei', L('Aufteilen', 'Split'), L('ohne KI', 'without AI')) + z('nz-idee', 'funken', L('Rezept vorschlagen', 'Suggest a recipe'), 'Anthropic · ' + L('Notiztext', 'Note text')) : ''}
        ${n.tag ? z('nz-planen', 'plan', fuelle(L('Rezept für {0}', 'Recipe for {0}'), tagText(n.tag)), L('Wochenplan und Einkaufsliste', 'Week plan and shopping list')) + z('nz-kalender', 'uhr', L('In den Kalender', 'Into the calendar'), L('Kalenderdatei (.ics)', 'Calendar file (.ics)')) : ''}</div>
       <label class="nz-tagfeld">${ic('plan')}<span>${L('Tag', 'Day')}</span><input type="date" class="feld" data-nz-tag="${esc(n.id)}" value="${esc(n.tag)}" aria-label="${L('Tag der Notiz', 'Day of the note')}">${n.tag ? `<input type="time" class="feld" data-nz-zeit="${esc(n.id)}" value="${esc(n.zeit)}" aria-label="${L('Uhrzeit', 'Time')}">` : ''}</label></div>`;
    }
    return h + '</li>';
  }
  function html() {
    const l = notizenSortiert(app.Z().notizen);
    return `<div id="nz"><h2 class="imp-kopf">${ic('notiz')}<span>${L('Notizbuch', 'Notebook')}</span></h2>
     <div class="nz-feld"><span class="mitmik"><textarea class="feld" id="nz-text" rows="3" placeholder="${L('Was war lecker? Was gibt es morgen?', 'What was tasty? What is for tomorrow?')}" aria-label="${L('Notiz', 'Note')}">${esc(entwurf.text)}</textarea>${app.mik('#nz-text')}</span>
      <button class="rund nz-kamera" data-a="nz-foto" aria-label="${L('Foto aufnehmen', 'Take a photo')}" title="${L('Foto aufnehmen', 'Take a photo')}" ${entwurf.fotos.length >= NOTIZ_FOTOS_MAX ? 'disabled' : ''}>${ic('kamera')}${entwurf.fotos.length ? `<i class="nz-zahl-foto">${entwurf.fotos.length}</i>` : ''}</button>
      <button class="rund akz nz-speichern" data-a="nz-speichern" aria-label="${L('Notiz speichern', 'Save note')}" title="${L('Speichern', 'Save')}">${ic('haken')}</button></div>
     <div id="nz-entwurf-fotos">${fotosHtml(entwurf.fotos, 'nz-entwurf-foto-weg')}</div><div class="nz-erkannt" id="nz-erkannt">${erkanntHtml()}</div>
     ${l.length ? `<ul class="nz-liste" id="nz-liste" aria-label="${L('Notizen', 'Notes')}">${l.map(notizHtml).join('')}</ul>` : ''}</div>`;
  }
  const zeigen = () => { const t = $('nz-text'), fokus = document.activeElement === t; app.fenster(html()); if (fokus) $('nz-text')?.focus(); };
  const frisch = () => { if ($('nz')) zeigen(); app.kopfZeichnen(); };
  function oeffnen(id = '') { if (id) auf = id; zeigen(); if (!id) $('nz-text')?.focus(); }

  document.addEventListener('input', (ev) => { if (ev.target.id !== 'nz-text') return; entwurf.text = ev.target.value; const e = $('nz-erkannt'); if (e) e.innerHTML = erkanntHtml(); });
  document.addEventListener('change', (ev) => {
    const t = ev.target.dataset?.nzTag, z = ev.target.dataset?.nzZeit;
    if (t) { setze(aendereNotiz(liste(), t, (n) => ({ ...n, tag: ev.target.value, zeit: ev.target.value ? n.zeit : '' }))); frisch(); }
    else if (z) { setze(aendereNotiz(liste(), z, (n) => ({ ...n, zeit: ev.target.value }))); frisch(); }
  });

  A.notiz = () => oeffnen();
  A['nz-foto'] = () => kamera.click();
  A['nz-entwurf-foto-weg'] = (e) => { entwurf.fotos.splice(+e.dataset.i, 1); zeigen(); };
  A['nz-tag-ja'] = (e) => { entwurf.tag = e.dataset.tag; entwurf.zeit = e.dataset.zeit || ''; const x = $('nz-erkannt'); if (x) x.innerHTML = erkanntHtml(); };
  A['nz-tag-weg'] = () => { entwurf.tag = ''; entwurf.zeit = ''; const x = $('nz-erkannt'); if (x) x.innerHTML = erkanntHtml(); };
  A['nz-speichern'] = () => {
    const text = ($('nz-text')?.value ?? entwurf.text).trim(), n = neueNotiz({ text, fotos: entwurf.fotos, tag: entwurf.tag, zeit: entwurf.zeit });
    if (!n) { melde(L('Bitte etwas schreiben oder ein Foto machen.', 'Please write something or take a photo.')); $('nz-text')?.focus(); return; }
    setze([...liste(), n]); Object.assign(entwurf, { text: '', fotos: [], tag: '', zeit: '' }); auf = '';
    zeigen(); $('nz-text')?.focus(); app.kopfZeichnen(); melde(n.tag ? fuelle(L('Notiz für {0} gespeichert', 'Note for {0} saved'), tagText(n.tag, n.zeit)) : L('Notiz gespeichert', 'Note saved'));
  };
  A['nz-auf'] = (e) => { auf = auf === e.dataset.id ? '' : e.dataset.id; zeigen(); };
  A['nz-foto-wahl'] = (e) => { fotoWahl[e.dataset.id] = +e.dataset.i; zeigen(); };
  A['nz-haken'] = (e) => { const n = finde(e.dataset.id); if (!n) return; erledigt(n.id, !n.erledigt); };
  function erledigt(id, an) {
    const vorher = app.Z().notizen; setze(aendereNotiz(liste(), id, (x) => ({ ...x, erledigt: an }))); if (an && auf === id) auf = ''; frisch();
    if (an) melde(L('Notiz abgehakt', 'Note ticked off'), L('Rückgängig', 'Undo'), () => { setze(vorher); frisch(); });
  }
  A['nz-weg'] = (e) => { const n = finde(e.dataset.id); if (!n) return; const vorher = app.Z().notizen; setze(ohneNotiz(liste(), n.id)); frisch();
    melde(fuelle(L('„{0}“ gelöscht', '“{0}” deleted'), notizTitel(n, spr(), 30)), L('Rückgängig', 'Undo'), () => { setze(vorher); frisch(); }); };

  /* ── Weiter ins Rezeptbuch. Die Notiz reist im Formular mit (s.ausNotiz → s.form.notiz); nach dem Speichern lässt sie sich abhaken. ── */
  const fotoDatei = async (n) => { const f = n.fotos[Math.min(fotoWahl[n.id] || 0, n.fotos.length - 1)], b = await (await fetch(f)).blob(); return new File([b], 'notiz.jpg', { type: b.type || 'image/jpeg' }); };
  const scan = async (e, teller) => { const n = finde(e.dataset.id); if (!n?.fotos.length) return; s.ausNotiz = n.id; s.tellerWahl = teller; app.scanGewaehlt([await fotoDatei(n)]); };   /* das Scan-Blatt zeigt vor dem Senden, was an wen geht */
  A['nz-lesen'] = (e) => scan(e, false);
  A['nz-teller'] = (e) => scan(e, true);
  const insFormular = (n, r, meldung) => { app.fensterZu(); s.ausNotiz = null;
    s.form = { ...app.formAus(null), name: r.name || '', cat: r.cat || '', servings: r.servings || 4, prepTime: r.prepTime ?? '', img: r.img || n.fotos[0] || '', ings: (r.ings || []).map(zutatZeile).join('\n'), steps: (r.steps || []).map((x) => x.txt).join('\n\n'), flavors: r.flavors || [], notiz: n.id };
    app.geh('form'); melde(meldung); };
  A['nz-aufteilen'] = (e) => { const n = finde(e.dataset.id); if (!n?.text) return; const r = rezeptAusText(n.text);
    insFormular(n, r, r.sicher ? fuelle(L('{0} Zutaten und {1} Schritte erkannt. Bitte prüfen.', '{0} ingredients and {1} steps found. Please check.'), r.ings.length, r.steps.length) : L('Ohne Überschriften aufgeteilt. Bitte Zutaten und Schritte prüfen.', 'Split without headings. Please check ingredients and steps.')); };
  A['nz-idee'] = async (e) => {
    const n = finde(e.dataset.id || offenFuer); offenFuer = ''; if (!n?.text) return;
    if (!SK.anthropic) { offenFuer = n.id; app.schluesselFenster('anthropic', 'nz-idee'); return; }
    /* erst die Prüfung auf Befehle an eine KI (wie beim Web-Import): steht einer darin, wird gefragt, bevor etwas hinausgeht */
    const stellen = await kiAnweisungen(n.text.slice(0, IDEE_MAX)); if (stellen.length && !(await app.befehlFrage(stellen))) { oeffnen(n.id); return; }
    const kats = app.scanKats(); app.fensterZu();
    try {
      const roh = await W.mit(L('Claude denkt sich ein Rezept aus …', 'Claude is coming up with a recipe …'), () => rezeptAusIdee(n.text, { schluessel: SK.anthropic, stufe: app.E().scan?.stufe || 'schnell', kategorien: kats, sprache: spr(), beiAnweisung: async () => stellen.length > 0 }));
      insFormular(n, rezeptAusScan(roh, { kategorien: kats, sprache: spr() }), L('Ein Vorschlag. Bitte prüfen.', 'A suggestion. Please check.'));
    } catch (f) { if (!f.abgebrochen) melde(f.message); oeffnen(n.id); }
  };
  /* (d) Tag → ein Rezept wählen: es kommt an diesem Tag in den Wochenplan, seine Zutaten auf die Einkaufsliste. */
  A['nz-planen'] = (e) => { const n = finde(e.dataset.id); if (!n?.tag) return; const alle = app.Z().rezepte.filter(app.istInhalt);
    app.fenster(`<h2 class="imp-kopf"><button class="rund" data-a="nz-zurueck" data-id="${esc(n.id)}" aria-label="${L('Zurück', 'Back')}">${ic('links')}</button><span>${esc(fuelle(L('Rezept für {0}', 'Recipe for {0}'), tagText(n.tag)))}<small>${esc(notizTitel(n, spr()))}</small></span></h2>
     <div class="wahl-liste" id="nz-wahl">${alle.map((r) => `<button class="zeile" data-a="nz-plan-setzen" data-id="${esc(n.id)}" data-uid="${esc(r.uid)}">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy">` : ic('karte')}<span>${esc(r.name)}</span></button>`).join('') || `<p>${L('Noch keine Rezepte im Buch.', 'No recipes in the book yet.')}</p>`}</div>`); };
  A['nz-zurueck'] = (e) => oeffnen(e.dataset.id);
  A['nz-plan-setzen'] = (e) => {
    const n = finde(e.dataset.id), r = app.rezept(e.dataset.uid); if (!n?.tag || !r) return;
    const vorher = app.Z(), ek = vorher.einkauf, da = ek.posten.some((p) => p.uid === r.uid);
    app.setzeZ({ ...vorher, plan: planen(vorher.plan || {}, n.tag, r.uid), einkauf: da ? ek : { ...ek, posten: [...ek.posten, { uid: r.uid, portionen: r.servings }] }, notizen: aendereNotiz(liste(), n.id, (x) => ({ ...x, rezept: r.uid })) });
    sichern(); oeffnen(n.id); app.kopfZeichnen();
    melde(fuelle(L('„{0}“ am {1} · auf der Liste', '“{0}” on {1} · on the list'), r.name, tagText(n.tag)), L('Rückgängig', 'Undo'), () => { app.setzeZ(vorher); sichern(); frisch(); });
  };
  /* (e) Erinnerung im Kalender des Handys: eine .ics-Datei zum Teilen oder Herunterladen. */
  A['nz-kalender'] = async (e) => {
    const n = finde(e.dataset.id); if (!n?.tag) return;
    const titel = notizTitel(n, spr()), text = icsDatei([{ uid: n.id + '@' + location.host + '-notiz', titel, beschreibung: n.text.trim() === titel ? '' : n.text, tag: n.tag, zeit: n.zeit }], { name: app.titel() });
    /* der Dateiname nur aus ASCII: mit „ü“ darin speicherte Chromium die Datei als „download“ ohne Endung (gemessen) */
    const name = (titel.replace(/[äöüÄÖÜß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' }[c])).replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'Notiz') + '.ics', datei = new File([text], name, { type: 'text/calendar' });
    if (navigator.canShare?.({ files: [datei] })) { try { await navigator.share({ files: [datei], title: titel }); return; } catch (f) { if (f?.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    melde(L('Kalenderdatei gespeichert', 'Calendar file saved'));
  };

  return {
    kopfKnopf,
    /** Nach dem Speichern eines Rezepts, das aus einer Notiz kam: die Notiz merkt sich das Rezept; die Meldung bietet „Abhaken“. */
    uebernommen(id, uid) {
      if (!finde(id)) return false;
      setze(aendereNotiz(liste(), id, (x) => ({ ...x, rezept: uid })));
      melde(L('Gespeichert', 'Saved'), L('Notiz abhaken', 'Tick off note'), () => erledigt(id, true)); return true;
    },
    /** Beim Öffnen der App: ein dezenter Hinweis, wenn heute eine Notiz fällig ist (keine Benachrichtigung bei geschlossener App). */
    beimStart() {
      const f = faellig(app.Z().notizen); if (!f.length) return;
      const heute = f.filter((n) => n.tag === tagIso(new Date())), eine = (heute[0] || f[0]);
      melde(f.length === 1 ? fuelle(L('Heute: {0}', 'Today: {0}'), notizTitel(eine, spr(), 40)) : fuelle(L('{0} Notizen fällig', '{0} notes due'), f.length), L('Ansehen', 'View'), () => oeffnen(eine.id));
    },
  };
}
