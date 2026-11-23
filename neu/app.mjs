// Mein Rezeptbuch – neue PWA (Ausgabe „rezeptbuch“ des Küchen-Kerns). Erste Fassung: Start, Rezept, Anlegen/Bearbeiten,
// Kategorien, Suche, Sicherung ein/aus, Beispielbuch, Übernahme aus der alten App. Netz nur auf Knopfdruck.
import { normalisiere, istInhalt, katVonRezept, ordnerVonRezept, neueUid, KAT_OHNE, sicht } from '../kern/modell/rezept.mjs';
import { anlegen as ordAnlegen, umbenennen as ordUmbenennen, loeschen as ordLoeschen, legeIn, umsortieren as ordUmsortieren, imOrdner, uebersicht as ordUebersicht, findeOrdner, ordnerName } from '../kern/modell/ordner.mjs';
import { alleKategorien, beschriftung, anzahl, leereKategorien, KATEGORIEN_FEST, anlegen as katAnlegen, umbenennen as katUmbenennen, loeschen as katLoeschen, umsortieren as katUmsortieren, katBild, bildWaehlen } from '../kern/modell/kategorien.mjs';
import { suche } from '../kern/modell/suche.mjs';
import { skaliere } from '../kern/modell/mengen.mjs';
import { leererZustand } from '../kern/modell/zustand.mjs';
import { lies, schreibe, fuehreZusammen, hinweise } from '../kern/sicherung/sicherung.mjs';
import { ausAltemSpeicher } from '../kern/speicher/uebernahme.mjs';
import { speicher } from '../kern/speicher/speicher.mjs';
import { symbol as ic } from '../kern/oberflaeche/symbole.mjs';
import { FARBEN, TOENE, farbeSetzen, istDunkel } from '../kern/oberflaeche/farben.mjs';
import { schriftSetzen, schriftRegler, schriftWert } from '../kern/oberflaeche/schrift.mjs';
import { bildAusDatei } from '../kern/oberflaeche/bild.mjs';
import { zutatenFuerSchritt, zeitImSchritt } from '../kern/modell/kochen.mjs';
import { GERAETE, erkenne, geraetSvg } from '../kern/oberflaeche/geraete.mjs';
import { einkaufsliste, gruppenFolge, gruppeVerschieben, WARENGRUPPEN } from '../kern/modell/einkauf.mjs';
import { rezeptAusText, zutatAusZeile, zutatZeile } from '../kern/import/text.mjs';
import { diktat, diktatAus, diktatMoeglich } from '../kern/oberflaeche/diktat.mjs';
import { kiBild, gratisBild, KOSTEN_TEXT } from '../kern/ki/bild.mjs';
import { hinweiseEinrichten } from '../kern/oberflaeche/hinweis.mjs';
import { wartenEinrichten, modellFortschritt, bytesMitAnteil } from '../kern/oberflaeche/warten.mjs';
import { tresor } from '../kern/speicher/tresor.mjs';
import { ladeBausteine, korpus as semKorpus, sucheBedeutung } from '../kern/suche/bedeutung.mjs';
import { woche, planen, entplanen, ausAltemMenu, tagIso } from '../kern/modell/plan.mjs';
import { text as spText, fuelle } from '../kern/oberflaeche/sprache.mjs';
import { schluessel as schluesselLager, ANBIETER, erklaerung as schlErklaerung, formPasst, pruefeSchluessel, schluesselAdresse } from '../kern/ki/schluessel.mjs';
import { STUFEN } from '../kern/ki/claude.mjs';
import { vorbereiten, erkennen, rezeptAusScan, wasGehtHinaus, wohinKurz, istPdf, istBild } from '../kern/import/scan.mjs';
import { vermerken, vermerkHtml, fundeZumEntscheiden, fundName, meldung as kiMeldung } from '../kern/ki/reinigung.mjs';
import { dateiPruefen, pruefHtml, kiAnweisungen } from '../kern/pruefung/datei.mjs';
import { webAdresse, holeSeite, ausEingefuegtem, ohneKi, fuerKi, mitKi, holeBild } from '../kern/import/web.mjs';

const FASSUNG = '0.12.2';
const breit = () => matchMedia('(min-width:1000px)').matches;
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Sprache der Oberfläche: Deutsch ist die Quelle, Englisch steht daneben (Kern: oberflaeche/sprache.mjs). Bis das Sprachmenü da ist, gilt Deutsch. */
const spr = () => 'de';
const L = (de, en) => spText(spr(), de, en);

let ausgabe = null, lager = null;
let Z = leererZustand();                     // Rezepte, Wochenplan, Ordner, Kategorien
let E = { farbe: 'braun', leiste: { seite: 'r', pos: 64 }, zuletzt: null, ton: 'geraet', schrift: 100, railZu: false, sinn: false };   // Einstellungen dieses Geräts
const s = { ansicht: 'start', uid: null, frage: '', kat: 'alle', portion: {}, werkzeug: false, leisteAuf: false, form: null, nurDies: false, planTag: new Date(), bilder: { gross: false, filter: 'alle', wahl: new Set() }, bildZiel: null, rleiste: false, scan: null, web: null, scanMehr: false, werkAuf: new Set() };
const LEER_EINKAUF = () => ({ posten: [], haken: {}, eigene: [], laeden: { Supermarkt: [] }, laden: 'Supermarkt' });
function ergaenze() { Z.einkauf = { ...LEER_EINKAUF(), ...(Z.einkauf || {}) }; if (!Z.einkauf.laeden[Z.einkauf.laden]) Z.einkauf.laden = Object.keys(Z.einkauf.laeden)[0] || 'Supermarkt'; if (!Z.einkauf.laeden[Z.einkauf.laden]) Z.einkauf.laeden[Z.einkauf.laden] = []; if (!Z.plan) Z.plan = ausAltemMenu(Z.menu, Z.rezepte); }

/* ---------- Speichern ---------- */
let schreibUhr = null;
function sichern() { clearTimeout(schreibUhr); schreibUhr = setTimeout(() => lager.schreibe({ fassung: 1, zustand: Z, einstellungen: E }).catch(() => melde('Speichern ist fehlgeschlagen. Bitte eine Sicherung als Datei anlegen.')), 150); }
const rezept = (uid) => Z.rezepte.find((r) => r.uid === uid);
const zeig = (r) => (r ? sicht(r, 'de') : r);   // Anzeige: liegt eine Übersetzung in der App-Sprache am Rezept, gilt sie; bearbeitet wird das Original
const katName = (c) => beschriftung(c, 'de', Z.kategorien);
/* Sticker einer Kategorie (Klaus 23.11.): ein kleines Foto aus der Kategorie, sonst das Zeichen. Der Name steht immer daneben. */
const katSticker = (c) => { const b = katBild(Z.rezepte, Z.kategorien, c.id); return b ? `<img class="sticker" src="${esc(b.img)}" alt="" loading="lazy">` : katZeichen(c); };
const katZeichen = (c) => { const e = Z.kategorien.namen?.[c.id]?.emoji || c.emoji || c.emojiAlt; /* Vorgabe: das Zeichen aus der alten App, frei änderbar */ return e ? `<span aria-hidden="true">${esc(e)}</span>` : ic(c.art === 'ohne' ? 'frage' : c.art === 'unbekannt' ? 'paket' : 'karte'); };

/* ---------- Meldungen ---------- */
let toastUhr = null;
function melde(text, knopf, tun) {
  const t = $('toast'); t.innerHTML = esc(text) + (knopf ? `<button data-a="toast-tun">${esc(knopf)}</button>` : '');
  toastTun = tun || null; clearTimeout(toastUhr); toastUhr = setTimeout(() => { t.innerHTML = ''; toastTun = null; }, knopf ? 7000 : 3500);
}
let toastTun = null;

/* ---------- Navigation (mit Zurück-Taste) ---------- */
function geh(ansicht, extra = {}, ersetzen = false) {
  diktatAus();
  Object.assign(s, { ansicht, leisteAuf: false, rleiste: false, ...extra });   /* jede Ansicht beginnt mit eingeklappten Werkzeugen */
  if (ansicht === 'kochen') { $('toast').innerHTML = ''; toastTun = null; }   // nichts über den Knöpfen der Kochansicht
  const st = { ansicht, uid: s.uid };
  if (ersetzen) history.replaceState(st, ''); else history.pushState(st, '');
  zeichne(true); scrollTo(0, 0);
}
let nachZurueck = null;   // was nach einem Schritt zurück noch geschehen soll (Vollbild → Bild-Blatt)
addEventListener('popstate', (e) => { const st = e.state || { ansicht: 'start' }; Object.assign(s, { ansicht: st.ansicht, uid: st.uid || null, leisteAuf: false, form: null }); fensterZu(); zeichne(st.ansicht !== 'rezept' || !breit()); if (nachZurueck) { const f = nachZurueck; nachZurueck = null; f(); } });

const mik = (feld) => (diktatMoeglich() ? `<button type="button" class="mik" data-a="diktat" data-feld="${feld}" aria-label="Sprechen statt tippen" aria-pressed="false">${ic('mikro')}</button>` : '');
/* ---------- Kopf ---------- */
function kopfZeichnen() {
  const k = $('kopf');
  k.classList.toggle('zu', !!E.railZu);
  if (breit()) {
    const n = (zu, i, t) => `<button class="rail-n" data-a="geh" data-zu="${zu}" ${(zu === 'start' ? ['start', 'rezept', 'kochen'].includes(s.ansicht) : s.ansicht === zu) ? 'aria-current="page"' : ''} title="${t}">${ic(i)}<span class="t">${t}</span></button>`;
    k.innerHTML = `<div class="rail-oben"><img class="logo" src="../icons/icon-book-192.png?v=1" alt="" width="30" height="30"><span class="name t">${esc(ausgabe.titel)}</span><button class="rail-klapp" data-a="rail" aria-label="${E.railZu ? 'Leiste ausklappen' : 'Leiste einklappen'}">${ic(E.railZu ? 'rechts' : 'links')}</button></div>
     <button class="knopf akz rail-neu" data-a="neu" aria-label="Neues Rezept">${ic('plus')}<span class="t">Neues Rezept</span></button>${n('start', 'buch', 'Rezepte')}${n('plan', 'plan', 'Planer')}${n('einkauf', 'einkauf', 'Einkauf').replace('</button>', (ekOffen() ? `<span class="zahl">${ekOffen()}</span>` : '') + '</button>')}${n('werkstatt', 'einst', 'Einstellungen')}
     <button class="rail-n" data-a="farbe" title="Farbe"><span class="farbknopf"></span><span class="t">Farbe</span></button>`;
    return;
  }
  /* Klaus 23.11.: am schmalen Schirm bleiben oben Suche, Farbpalette und das Plus; Schrift, Hell/Dunkel, Sichern und die Einstellungen
     stehen in der fliegenden Leiste. Kein Pfeil mehr, nichts zum Aufklappen. */
  k.innerHTML = `<img class="logo" src="../icons/icon-book-192.png?v=1" alt="" width="30" height="30"><span class="name">${esc(ausgabe.titel)}</span><button class="rund" data-a="zur-suche" aria-label="Suchen" title="Suchen">${ic('suche')}</button><button class="farbknopf" data-a="farbe" aria-label="Farbpalette" title="Farbe"></button><button class="rund akz" data-a="neu" aria-label="Neues Rezept" title="Neues Rezept">${ic('plus')}</button>`;
}

/* ---------- Start ---------- */
/** Bildausschnitt (r.imgCrop wie in der alten App: x, y in Prozent, scale) als Stil. */
const zahl = (v, sonst) => (Number.isFinite(+v) && v !== '' && v != null ? +v : sonst);   // 0 ist ein gültiger Wert (Lage oben/links)
const ausschnitt = (r) => { const c = r.imgCrop; if (!c || (c.x === 50 && c.y === 50 && (c.scale || 1) === 1)) return ''; const x = zahl(c.x, 50), y = zahl(c.y, 50), z = Math.min(3, Math.max(1, zahl(c.scale, 1))); return `style="object-position:${x}% ${y}%;${z > 1 ? `transform:scale(${z});transform-origin:${x}% ${y}%` : ''}"`; };
const bildOder = (r, gr = '') => (r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy" ${ausschnitt(r)} ${gr}>` : ic('karte'));
/* Klaus 23.11.: ein Kochbuch ist ein Bilderbuch. Unter dem Bild steht nur der Name; die Kategorie wird nicht auf jeder Karte wiederholt
   (sie steht in der Leiste und über dem Abschnitt), nur in gemischten Trefferlisten (mitKat). */
const karte = (r0, c, mitKat = false, r = zeig(r0)) => { const unter = [r.prepTime ? ic('uhr') + esc(r.prepTime) + ' Min' : '', mitKat && c ? esc(katName(c)) : ''].filter(Boolean).join(' · '); return `<button class="karte" data-a="rezept" data-uid="${esc(r.uid)}"><span class="bild">${bildOder(r)}</span><span class="text"><strong>${esc(r.name)}</strong>${unter ? `<small>${unter}</small>` : ''}</span></button>`; };

function startHtml() {
  const heute = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  let h = `<p class="gruss">${esc(ausgabe.begruessung?.de || 'Was kochen wir heute?')}<small class="datum">${esc(heute)}</small></p>
   <form class="suche" data-form="suche" role="search">${ic('suche')}<input id="suchfeld" name="q" value="${esc(s.frage)}" placeholder="Rezept, Zutat oder Kategorie …" aria-label="Suchen" autocomplete="off" enterkeyhint="search">${mik('#suchfeld')}<button type="button" class="sinn" data-a="sinn" aria-pressed="${!!E.sinn}" aria-label="Sinn-Suche: auch nach Bedeutung suchen" title="Sinn-Suche">${ic('funken')}</button><button type="button" id="suche-x" data-a="suche-leer" aria-label="Eingabe löschen" ${s.frage ? '' : 'hidden'}>${ic('x')}</button></form>`;
  return h + `<div id="start-rest">${startRest()}</div>`;
}
function startRest() {
  const alle = Z.rezepte.filter(istInhalt), kats = alleKategorien(Z.rezepte, Z.kategorien).filter((c) => anzahl(Z.rezepte, c.id) > 0);
  const katVon = new Map(kats.map((c) => [c.id, c])), ordner = ordUebersicht(Z.rezepte, Z.ordner).filter((o) => o.anzahl > 0);
  if (s.kat.startsWith('ordner:') && !ordner.some((o) => 'ordner:' + o.id === s.kat)) s.kat = 'alle';   /* der Ordner ist leer oder weg */
  let h = '';
  if (!alle.length) return leerHtml();
  if (s.frage.trim()) {
    const tr = suche(Z.rezepte, s.frage, Z.kategorien);
    const da = new Set(tr.map((r) => r.uid)), sinn = E.sinn && sem.fuer === s.frage.trim().toLowerCase() ? sem.ids.map(rezept).filter((r) => r && istInhalt(r) && !da.has(r.uid)) : [];
    return `<div class="ueber"><h2>Treffer</h2><small>${tr.length} von ${alle.length}</small></div>` + (tr.length ? `<div class="gitter">${tr.map((r) => karte(r, katVon.get(katVonRezept(r)), true)).join('')}</div>` : sinn.length ? '' : `<div class="leer"><p>Nichts gefunden für „${esc(s.frage)}“.</p></div>`)
      + (E.sinn ? `<p class="sinn-status" id="sinn-status" role="status">${esc(sem.status)}</p>` : '') + (sinn.length ? `<div class="ueber"><h2>Nach Bedeutung</h2><small>${sinn.length}</small></div><div class="gitter" id="sinn-treffer">${sinn.map((r) => karte(r, katVon.get(katVonRezept(r)), true)).join('')}</div>` : '');
  }
  const erstesBild = (id) => katBild(Z.rezepte, Z.kategorien, id);
  h += `<div class="fotokat" role="group" aria-label="Kategorien">` + [{ id: 'alle', de: 'Alle' }, ...kats].map((c) => {
    const b = erstesBild(c.id), n = c.id === 'alle' ? alle.length : anzahl(Z.rezepte, c.id);
    return `<button data-a="kat" data-kat="${esc(c.id)}" aria-pressed="${s.kat === c.id}"><span class="bild">${b ? `<img src="${esc(b.img)}" alt="" loading="lazy">` : (c.id === 'alle' ? ic('buch') : katZeichen(c))}</span><span>${esc(c.id === 'alle' ? 'Alle' : katName(c))} <small>${n}</small></span></button>`;
  }).join('') + ordner.map((o) => `<button class="ord" data-a="kat" data-kat="ordner:${esc(o.id)}" aria-pressed="${s.kat === 'ordner:' + o.id}" title="${L('Ordner', 'Folder')}"><span class="bild">${o.bild ? `<img src="${esc(o.bild)}" alt="" loading="lazy">` : ''}<i class="ord-marke">${o.ico ? esc(o.ico) : ic('ordner')}</i></span><span>${esc(ordTitel(o))} <small>${o.anzahl}</small></span></button>`).join('') + `</div>`;
  if (s.kat === 'alle') {
    const trink = new Set(['drk', 'smooth', 'mock', 'afckt', 'limo', 'tee', 'ckt', 'bowle', 'sirup']);
    const z = rezept(E.zuletzt) || alle.find((r) => r.img && !trink.has(r.cat)) || alle.find((r) => r.img) || alle[0];
    h += `${E.zuletzt && rezept(E.zuletzt) ? `<div class="ueber held-ueber"><h2>Weiterkochen</h2></div>` : ''}
     <button class="held" data-a="rezept" data-uid="${esc(z.uid)}">${bildOder(z)}<span class="verlauf"><strong>${esc(z.name)}</strong><span class="meta">${z.prepTime ? `<span>${ic('uhr')}${esc(z.prepTime)} Min</span>` : ''}<span>${ic('leute')}${z.servings} ${z.servings === 1 ? 'Portion' : 'Portionen'}</span></span></span></button>`;
    /* Ein Raster, keine Überschrift je Kategorie: die Kategorien stehen als Fotos darüber, und eine Zeile je Gruppe wäre bei wenigen Rezepten mehr Rahmen als Inhalt. In der Reihenfolge der Kategorien. */
    h += `<div class="gitter alle">${kats.flatMap((c) => alle.filter((r) => katVonRezept(r) === c.id)).map((r) => karte(r)).join('')}</div>`;
  } else if (s.kat.startsWith('ordner:')) {
    const o = ordner.find((x) => 'ordner:' + x.id === s.kat), rz = imOrdner(Z.rezepte, Z.ordner, o.id);
    h += `<div class="gitter eins" data-ordner="${esc(o.id)}">${rz.map((r) => karte(r)).join('')}</div>`;   /* der gewählte Ordner steht schon in der Leiste; keine zweite Überschrift */
  } else {
    const c = katVon.get(s.kat), rz = alle.filter((r) => katVonRezept(r) === s.kat);
    h += `<div class="gitter eins">${rz.map((r) => karte(r, c)).join('')}</div>`;   /* die gewählte Kategorie steht schon in der Leiste */
  }
  return h;
}
const ordTitel = (o) => ordnerName(o) || L('Ordner', 'Folder');
function leerHtml() {
  return `<div class="leer einladung"><img class="leer-bild" src="../icons/ausgeloest-48fb59f123.jpg?v=1" alt="" width="640" height="427"><div class="leer-text"><h2>${L('Noch keine Rezepte', 'No recipes yet')}</h2>
   <div class="reihe"><button class="knopf akz" data-a="neu">${ic('plus')}${L('Rezept', 'Recipe')}</button><button class="knopf" data-a="beispiel" title="${esc(beispielText())}">${ic('paket')}${L('Beispielbuch', 'Example book')}</button></div></div></div>`;
}
let katalog = null;
const beispielText = () => { const p = katalog?.pakete?.find((x) => x.id === ausgabe.beispiele[0]); return p ? `${p.anzahl} Rezepte, ${(p.bytes / 1e6).toFixed(0)} MB` : 'aus dem Netz'; };

/* ---------- Sinn-Suche: Modul 03 und 04 der bisherigen App, erst beim Einschalten geladen ---------- */
const sem = { ids: [], fuer: '', status: '', uhr: null, laeuft: false, korpus: null, sig: '' };
const semStatus = (t) => { sem.status = t; const el = $('sinn-status'); if (el) el.textContent = t; };
/* Ladebalken (Klaus 23.11.): das Sprachmodell (beim ersten Mal rund 120 MB) und das Einlesen der Rezepte zeigen ihren Stand. */
const W = wartenEinrichten(document);
function semBereit() {
  return W.mit('Sinn-Suche: Sprachmodell wird geladen …', async (w) => {
    const ab = modellFortschritt((a, g, t) => { w.anteil(a); if (t) w.text(`Sprachmodell wird geladen: ${g} von ${t} MB`); });
    try { await ladeBausteine('../sbkim/'); await window.SbkimEmbedding.init(); } finally { ab(); }
    w.anteil(null); w.text('Sinn-Suche wird vorbereitet …');
    const rs = Z.rezepte.filter(istInhalt), namen = new Map(alleKategorien(Z.rezepte, Z.kategorien).map((c) => [c.id, katName(c)])), sig = rs.map((r) => r.uid).join(',');
    if (!sem.korpus || sem.sig !== sig) { sem.korpus = await semKorpus(rs, (r) => namen.get(katVonRezept(r)) || '', { einbetten: (t) => window.SbkimEmbedding.embedPassage(t), fortschritt: (i, n) => { const t = `Sinn-Suche wird vorbereitet: ${i} von ${n} Rezepten`; semStatus(t); w.text(t); w.anteil(n ? i / n : null); } }); sem.sig = sig; }
    return sem.korpus;
  });
}
function semPlanen() { clearTimeout(sem.uhr); if (!E.sinn) return; const f = s.frage.trim().toLowerCase(); if (!f) { sem.ids = []; sem.fuer = ''; return; } sem.uhr = setTimeout(() => semLauf(f), 350); }
async function semLauf(f) {
  if (!E.sinn) return; if (sem.laeuft) { sem.uhr = setTimeout(() => semLauf(f), 300); return; }
  sem.laeuft = true; semStatus(sem.korpus ? 'sucht nach Bedeutung …' : 'Sinn-Suche wird vorbereitet (beim ersten Mal lädt das Sprachmodell) …');
  try {
    const c = await semBereit(); if (s.frage.trim().toLowerCase() !== f) return;   // es wurde schon weitergetippt
    sem.ids = await sucheBedeutung(window.SbkimMatch, f, c); sem.fuer = f; if (s.frage.trim().toLowerCase() !== f) return;
    const wort = new Set(suche(Z.rezepte, s.frage, Z.kategorien).map((r) => r.uid)), dazu = sem.ids.filter((u) => !wort.has(u) && rezept(u)).length;
    sem.status = dazu ? `${dazu} zusätzlich nach Bedeutung gefunden` : 'Sinn-Suche an, keine weiteren Treffer';
    if (s.ansicht === 'start' && $('start-rest')) $('start-rest').innerHTML = startRest();
  } catch (f) { console.warn('Sinn-Suche:', f?.message || f); semStatus('Die Sinn-Suche ist gerade nicht verfügbar. Die Wortsuche läuft weiter.'); } finally { sem.laeuft = false; }
}

/* ---------- Rezept ---------- */
function rezeptHtml() {
  const r = zeig(rezept(s.uid)); if (!r) return `<div class="leer"><p>Dieses Rezept gibt es nicht mehr.</p><button class="knopf" data-a="geh" data-zu="start">Zur Startseite</button></div>`;
  const c = alleKategorien(Z.rezepte, Z.kategorien).find((x) => x.id === katVonRezept(r));
  const n = s.portion[r.uid] || r.servings, f = n / r.servings;
  const wk = (akt, i, t, kl = '') => `<button class="chip ${kl}" data-a="${akt}" aria-label="${esc(t)}" title="${esc(t)}">${ic(i)}<span class="wk-t">${esc(t)}</span></button>`;   /* am Handy nur das Symbol (Klaus 23.11.: „kein Button-Kino“), am Monitor neben dem Bild mit Wort */
  const winkel = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  return `<div class="rezept-held" data-a="held" role="button" tabindex="0" aria-label="${r.img ? 'Bild groß ansehen' : 'Bild einfügen'}">${r.img ? `<img src="${esc(r.img)}" alt="${esc(r.name)}" ${ausschnitt(r)}>` : ic('karte')}
    <div class="verlauf"><div class="tzeile">${s.rleiste ? `<div class="rwerk">${wk('bearbeiten', 'stift', 'Bearbeiten')}${wk('kat-zuordnen', 'karte', 'Kategorie')}${wk('ordner-zuordnen', 'ordner', L('Ordner', 'Folder'))}${wk('bild-blatt', 'bild', 'Bild')}${wk('nurdies', 'voll', s.nurDies ? 'Alles zeigen' : 'Nur dieses Rezept', 'nurbreit')}${wk('loeschen', 'muell', 'Rezept löschen', 'rot')}</div>` : ''}<button class="wk-pf zur" data-a="zurueck" aria-label="Zurück">${winkel('M15 5l-7 7 7 7')}</button><h1>${esc(r.name)}</h1><button class="wk-pf" data-a="rleiste" aria-expanded="${s.rleiste}" aria-label="Werkzeuge für Rezept und Bild">${winkel(s.rleiste ? 'M5 9l7 7 7-7' : 'M5 15l7-7 7 7')}</button></div><div class="meta">${r.prepTime ? `<span>${ic('uhr')}${esc(r.prepTime)} Min</span>` : ''}<span>${ic('karte')}${esc(c ? katName(c) : '')}</span>${ordnerVonRezept(r, Z.ordner) ? `<span class="im-ordner">${ic('ordner')}${esc(ordTitel(findeOrdner(Z.ordner, r.folder)))}</span>` : ''}${r.rating?.stars ? `<span>${ic('stern')}${r.rating.stars}</span>` : ''}</div></div></div>
   <div class="bogen"><div class="zweispalt"><div>
    ${r.steps.length ? `<div class="reihe"><button class="knopf akz" data-a="kochen" style="flex:1.3">${ic('koch')}Kochen</button><button class="knopf" data-a="auf-liste" style="flex:1">${ic('einkauf')}Einkaufen</button><button class="knopf" data-a="planen" aria-label="In den Wochenplan">${ic('plan')}</button></div>` : `<div class="reihe"><button class="knopf" data-a="auf-liste">${ic('einkauf')}Einkaufen</button><button class="knopf" data-a="planen">${ic('plan')}Planen</button></div>`}
    <div class="portion"><span>Portionen</span><span class="st"><button data-a="portion" data-d="-1" aria-label="Weniger">${ic('minus')}</button><b id="portionen">${n}</b><button data-a="portion" data-d="1" aria-label="Mehr">${ic('plus')}</button></span></div>
    <h2 class="h">Zutaten</h2><ul class="zut">${r.ings.map((z) => `<li><b>${esc([skaliere(z.amt, f), z.unit].filter(Boolean).join(' '))}</b><span>${esc(z.name)}${z.note ? `<small>${esc(z.note)}</small>` : ''}</span></li>`).join('')}</ul>${geraeteVon(r).length ? `<h2 class="h">Geräte</h2><div class="gr-liste">${geraeteVon(r).map((g) => `<span class="gr-chip">${geraetSvg(g)}${esc(GERAETE[g].de)}</span>`).join('')}</div>` : ''}</div>
    <div><h2 class="h">Zubereitung</h2><ol class="schritte">${r.steps.map((x) => `<li><span>${esc(x.txt)}${x.note ? `<small>${esc(x.note)}</small>` : ''}</span></li>`).join('')}</ol>
    ${r.source ? `<p class="quelle">Quelle: ${esc(r.source)}</p>` : ''}${vermerkHtml(r, spr())}</div></div></div>`;
}

const geraeteVon = (r) => [...new Set(r.steps.flatMap((x) => erkenne(x.txt)))];

/* ---------- Kochansicht: ein Schritt groß, Wischen oder Pfeiltasten, Bildschirm bleibt an ---------- */
const K = { i: 0, kopf: true, wach: null, uhr: null, rest: 0 };
const zeitText = (sek) => `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
function kochHtml() {
  const r = zeig(rezept(s.uid)); if (!r || !r.steps.length) return '';
  const i = Math.min(K.i, r.steps.length - 1), x = r.steps[i], f = (s.portion[r.uid] || r.servings) / r.servings;
  const zs = zutatenFuerSchritt(r, i), gs = erkenne(x.txt), min = zeitImSchritt(x.txt);
  const balken = `<div class="k-balken" aria-hidden="true">${r.steps.map((_, n) => `<i class="${n < i ? 'an' : n === i ? 'jetzt' : ''}"></i>`).join('')}</div>`;
  const zut = zs.length ? `<div class="k-zut">${zs.map((z) => `<span><b>${esc([skaliere(z.amt, f), z.unit].filter(Boolean).join(' '))}</b> ${esc(z.name)}</span>`).join('')}</div>` : '';
  const wecker = min ? `<button class="k-timer" data-a="wecker" data-min="${min}">${ic('uhr')}<span id="k-zeit">${K.uhr ? zeitText(K.rest) : `Wecker ${min} Min`}</span></button>` : '';
  const ger = gs.length ? `<div class="k-geraete">${gs.map((g) => `<span class="gr-k">${geraetSvg(g)}${esc(GERAETE[g].de)}</span>`).join('')}</div>` : '';
  return `<div class="koch" role="dialog" aria-modal="true" aria-label="Kochansicht">
   ${K.kopf ? `<div class="k-kopf"><button class="rund" data-a="zurueck" aria-label="Kochansicht schließen">${ic('x')}</button><span class="k-name">${esc(r.name)}</span>${K.wach ? '<span class="k-wach"><i></i>bleibt an</span>' : ''}<button class="k-klapp" data-a="k-kopf" aria-label="Kopf einklappen">${ic('hoch')}</button></div>${balken}`
     : `<div class="k-kopf-zu">${balken}<button class="k-klapp" data-a="k-kopf" aria-label="Kopf ausklappen">${ic('x')}</button></div>`}
   <div class="k-rumpf"><div class="k-inhalt" id="k-inhalt">${r.img ? `<div class="k-bild"><img src="${esc(r.img)}" alt=""></div>` : ''}
     <span class="k-nr">Schritt ${i + 1} von ${r.steps.length}</span><p class="k-text">${esc(x.txt)}</p>${x.note ? `<p class="k-notiz">${esc(x.note)}</p>` : ''}
     <div class="k-nurschmal">${zut}${wecker}${ger}</div></div>
    <aside class="k-seite"><h3>Für diesen Schritt</h3>${zut || '<p class="k-notiz">keine neuen Zutaten</p>'}${wecker}${ger ? `<h3>Geräte</h3>${ger}` : ''}</aside></div>
   <div class="k-fuss"><button data-a="k-schritt" data-d="-1" ${i === 0 ? 'disabled' : ''}>${ic('links')}Zurück</button><button class="vor" data-a="${i === r.steps.length - 1 ? 'zurueck' : 'k-schritt'}" data-d="1">${i === r.steps.length - 1 ? 'Fertig' : 'Weiter'}${ic(i === r.steps.length - 1 ? 'haken' : 'rechts')}</button></div></div>`;
}
async function wachAn() { try { K.wach = await navigator.wakeLock?.request('screen') || null; } catch { K.wach = null; } if (s.ansicht === 'kochen') kochZeichnen(); }
function wachAus() { try { K.wach?.release(); } catch { /* schon frei */ } K.wach = null; }
function weckerAus() { clearInterval(K.uhr); K.uhr = null; K.rest = 0; }
function kochZeichnen() { $('kochort').innerHTML = s.ansicht === 'kochen' ? kochHtml() : ''; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && s.ansicht === 'kochen' && !K.wach) wachAn(); });
function piep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.15; o.start(); o.stop(c.currentTime + 0.6); } catch { /* ohne Ton */ } navigator.vibrate?.([300, 150, 300]); }


/* ---------- Einkaufsliste ---------- */
const ekPosten = () => Z.einkauf.posten.map((p) => ({ rezept: rezept(p.uid), portionen: p.portionen })).filter((p) => p.rezept);
const ekOffen = () => { const l = einkaufsliste(ekPosten()); return l.filter((x) => !Z.einkauf.haken[x.schluessel]).length + Z.einkauf.eigene.filter((x) => !Z.einkauf.haken['eig:' + x.id]).length; };
function einkaufHtml() {
  const E_ = Z.einkauf, posten = ekPosten(), liste = einkaufsliste(posten), folge = gruppenFolge(E_.laeden[E_.laden]);
  let h = `<div class="ueber"><h2 style="font-size:19px">Einkaufsliste</h2><small>${ekOffen()} offen</small></div>`;
  if (!posten.length && !E_.eigene.length) return h + `<div class="leer"><p>Die Liste ist leer. Öffne ein Rezept und tippe auf „Einkaufen“, oder nimm im Wochenplan die ganze Woche.</p><div class="reihe"><button class="knopf" data-a="geh" data-zu="start">${ic('buch')}Zu den Rezepten</button><button class="knopf" data-a="geh" data-zu="plan">${ic('plan')}Zum Wochenplan</button></div></div>` + ekEigenForm();
  h += `<div class="quellen">${posten.map((p) => `<span class="quelle-chip">${p.rezept.img ? `<img src="${esc(p.rezept.img)}" alt="">` : ''}${esc(p.rezept.name)} · ${p.portionen}<button data-a="ek-rezept-weg" data-uid="${esc(p.rezept.uid)}" aria-label="${esc(p.rezept.name)} von der Liste nehmen">${ic('x')}</button></span>`).join('')}</div>
   <div class="laeden">${Object.keys(E_.laeden).map((l) => `<button class="chip" data-a="ek-laden" data-l="${esc(l)}" aria-pressed="${l === E_.laden}">${ic('markt')}${esc(l)}</button>`).join('')}<button class="chip" data-a="ek-laden-neu">${ic('plus')}Laden</button>${frag('Jeder Laden merkt sich seine eigene Reihenfolge der Gruppen. Eine Gruppe an der Überschrift lange drücken oder mit der Maus festhalten und an ihre Stelle ziehen.')}</div><div id="ek-liste">`;
  for (const gid of folge) {
    const g = WARENGRUPPEN.find((x) => x.id === gid), zeilen = liste.filter((x) => x.gruppe === gid);
    const eig = gid === 'sonstiges' ? E_.eigene : [];
    if (!zeilen.length && !eig.length) continue;
    h += `<div class="ek-gruppe" data-g="${gid}"><h3 title="Zum Verschieben lange drücken oder ziehen">${ic('griff')}${esc(g.de)}</h3>`
      + zeilen.map((x) => `<button class="ek-zeile ${E_.haken[x.schluessel] ? 'ok' : ''}" data-a="ek-haken" data-k="${esc(x.schluessel)}" aria-pressed="${!!E_.haken[x.schluessel]}"><span class="ek-box">${E_.haken[x.schluessel] ? ic('haken') : ''}</span><span class="was">${esc(x.name)}<small>${esc(x.aus.join(', '))}</small></span><b>${esc(x.menge)}</b></button>`).join('')
      + eig.map((x) => `<button class="ek-zeile ${E_.haken['eig:' + x.id] ? 'ok' : ''}" data-a="ek-haken" data-k="eig:${esc(x.id)}" aria-pressed="${!!E_.haken['eig:' + x.id]}"><span class="ek-box">${E_.haken['eig:' + x.id] ? ic('haken') : ''}</span><span class="was">${esc(x.text)}<small>selbst notiert</small></span></button>`).join('') + `</div>`;
  }
  return h + `</div>` + ekEigenForm() + `<div class="reihe" style="margin-top:12px"><button class="knopf" data-a="ek-abgehakt-weg">Abgehaktes entfernen</button><button class="knopf rot" data-a="ek-leeren">Liste leeren</button></div>`;
}
const ekEigenForm = () => `<form class="suche" data-form="ek-eigen" style="margin-top:12px;max-width:720px">${ic('plus')}<input name="t" id="ek-feld" placeholder="Noch etwas, z. B. Küchenrolle" aria-label="Eigenen Posten notieren" autocomplete="off" enterkeyhint="done">${mik('#ek-feld')}</form>`;

/* ---------- Wochenplan ---------- */
const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function planHtml() {
  const w = woche(s.planTag), heute = tagIso(new Date());
  const von = w.tage[0].toLocaleDateString('de-DE', { day: 'numeric', month: w.tage[0].getMonth() === w.tage[6].getMonth() ? undefined : 'long' }), bis = w.tage[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  const anzahlW = w.tage.reduce((n, t) => n + (Z.plan[tagIso(t)] || []).filter(rezept).length, 0);
  return `<div class="w-kopf"><button class="rund" data-a="plan-woche" data-d="-7" aria-label="Vorige Woche">${ic('links')}</button><strong>Woche ${w.kw}<small>${von}${von.includes('.') ? '' : '.'} bis ${bis}</small></strong><button class="rund" data-a="plan-woche" data-d="7" aria-label="Nächste Woche">${ic('rechts')}</button></div>
   <div class="w-tage">${w.tage.map((t, i) => { const tag = tagIso(t), rz = (Z.plan[tag] || []).map(rezept).filter(Boolean);
     return `<div class="w-tag ${tag === heute ? 'heute' : ''}"><div class="d"><small>${WT[i]}</small><b>${t.getDate()}</b></div><div class="w-slots">${rz.map((r) => `<div class="w-slot"><button class="w-auf" data-a="rezept" data-uid="${esc(r.uid)}">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy">` : `<span class="w-ohne">${ic('karte')}</span>`}<span>${esc(r.name)}${r.prepTime ? `<small>${esc(r.prepTime)} Min</small>` : ''}</span></button><button class="w-weg" data-a="plan-weg" data-tag="${tag}" data-uid="${esc(r.uid)}" aria-label="${esc(r.name)} aus dem Plan nehmen">${ic('x')}</button></div>`).join('')}<button class="w-leer ${rz.length ? 'mehr' : ''}" data-a="plan-waehlen" data-tag="${tag}">${ic('plus')}${rz.length ? 'noch eins' : 'Gericht planen'}</button></div></div>`; }).join('')}</div>
   <div class="reihe" style="margin-top:14px"><button class="knopf ${anzahlW ? 'akz' : ''}" data-a="plan-einkauf" ${anzahlW ? '' : 'disabled'}>${ic('einkauf')}Einkaufsliste für die Woche</button><button class="knopf" data-a="plan-heute">Heute</button></div>`;
}
function planWahlFenster(tag, uidFest) {
  if (uidFest) { const w = woche(new Date()), w2 = woche(new Date(Date.now() + 7 * 864e5));
    fenster(`<h2>Wann kochen?</h2><div class="tagwahl">${[...w.tage, ...w2.tage].filter((t) => tagIso(t) >= tagIso(new Date())).map((t) => `<button class="chip" data-a="plan-setzen" data-tag="${tagIso(t)}" data-uid="${esc(uidFest)}">${t.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })}</button>`).join('')}</div>`); return; }
  const alle = Z.rezepte.filter(istInhalt);
  fenster(`<h2>Gericht planen</h2><div class="wahl-liste">${alle.map((r) => `<button class="zeile" data-a="plan-setzen" data-tag="${tag}" data-uid="${esc(r.uid)}">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy">` : ic('karte')}<span>${esc(r.name)}</span></button>`).join('') || '<p>Noch keine Rezepte im Buch.</p>'}</div>`);
}

/* ---------- Kategorien verwalten ---------- */
const EMOJI = '🥗 🍜 🍲 🐟 🥦 🍰 🍮 🍷 🥤 🍹 🍸 🍋 ☕ 🍶 🫙 🥨 🍢 🍣 🍕 🍝 🍔 🌮 🥘 🍛 🥩 🍗 🥓 🧀 🥚 🥞 🧇 🍞 🥐 🥖 🥔 🥕 🌽 🍅 🍆 🥑 🌶 🧄 🧅 🍄 🥜 🍎 🍓 🍒 🍑 🍍 🥭 🍌 🍇 🍪 🧁 🍫 🍦 🍯 🫖 🍵 🥛 🧃 🍺 🎄 🎂 ❤️ ⭐ 🔥 ❄️ 👶 👵'.split(' ');
function kategorienHtml() {
  const kats = alleKategorien(Z.rezepte, Z.kategorien), aus = (Z.kategorien.ausgeblendet || []).filter((id) => !kats.some((c) => c.id === id)).map((id) => KATEGORIEN_FEST.find((c) => c.id === id)).filter(Boolean);
  return `<div class="ueber"><h2 style="font-size:19px">Kategorien</h2>${frag('Namen und Zeichen kannst du frei ändern; ein leeres Namensfeld heißt Vorgabe. Zum Ordnen eine Zeile am Griff lange drücken oder mit der Maus ziehen. Eine Kategorie mit Rezepten fragt beim Löschen, wohin die Rezepte sollen. Ein eigener Name gilt in allen Sprachen.')}</div>
   <div class="liste" id="kat-liste">${kats.map((c) => { const n = anzahl(Z.rezepte, c.id), eig = Z.kategorien.namen?.[c.id]?.name || '';
     return `<div class="kat-zeile" data-kid="${esc(c.id)}"><span class="griff" aria-hidden="true" title="Zum Verschieben lange drücken oder ziehen">${ic('griff')}</span><button class="kat-zeichen" data-a="kat-emoji" data-kid="${esc(c.id)}" aria-label="Bild oder Zeichen ändern">${katSticker(c)}</button>
      ${c.art === 'ohne' ? `<span class="kat-fest">${esc(katName(c))}</span>` : `<input class="feld kat-name" data-kid="${esc(c.id)}" value="${esc(c.art === 'eigen' && !eig ? c.de : eig)}" placeholder="${esc(c.de || c.id)}" aria-label="Name der Kategorie ${esc(katName(c))}" autocomplete="off">`}
      <small>${n}</small>${c.art === 'ohne' ? '<span style="width:34px"></span>' : `<button class="rund" data-a="kat-weg" data-kid="${esc(c.id)}" aria-label="Kategorie ${esc(katName(c))} löschen">${ic('muell')}</button>`}</div>`; }).join('')}</div>
   <div class="reihe" style="margin-top:12px"><button class="knopf akz" data-a="kat-neu">${ic('plus')}Neue Kategorie</button></div>
   ${aus.length ? `<div class="gruppe"><h3>Ausgeblendet</h3><div class="liste">${aus.map((c) => `<button class="zeile" data-a="kat-zurueck" data-kid="${esc(c.id)}">${ic('plus')}<span>${esc(c.de)}<small>wieder zeigen</small></span></button>`).join('')}</div></div>` : ''}`;
}
function katWahlFenster(titel, ohneId, aktion, uid = '') {
  const kats = alleKategorien(Z.rezepte, Z.kategorien).filter((c) => c.art !== 'ohne' && c.id !== ohneId);
  fenster(`<h2>${esc(titel)}</h2><div class="wahl-liste">${kats.map((c) => `<button class="zeile" data-a="${aktion}" data-ziel="${esc(c.id)}" data-kid="${esc(ohneId || '')}" data-uid="${esc(uid)}"><span class="kat-zeichen">${katSticker(c)}</span><span>${esc(katName(c))}</span></button>`).join('')}
    <button class="zeile" data-a="${aktion}" data-ziel="" data-kid="${esc(ohneId || '')}" data-uid="${esc(uid)}">${ic('frage')}<span>ohne Kategorie</span></button></div>
    ${aktion === 'kat-setzen' ? `<form class="suche" data-form="kat-neu-zu" style="margin-top:10px">${ic('plus')}<input name="n" placeholder="Neue Kategorie anlegen" autocomplete="off" aria-label="Neue Kategorie"></form>` : ''}`);
}

/* ---------- Ordner (Kern: modell/ordner.mjs): eigene Sammlungen neben den Kategorien. Ein Ordner frisst die Kategorie nicht. ---------- */
const ORD_ERKL = () => L('Ordner sind eigene Sammlungen neben den Kategorien, zum Beispiel „Weihnachten“ oder „Für Gäste“. Ein Rezept liegt in höchstens einem Ordner und behält seine Kategorie. Wird ein Ordner gelöscht, bleiben die Rezepte.', 'Folders are your own collections next to the categories, e.g. “Christmas” or “For guests”. A recipe is in one folder at most and keeps its category. If a folder is deleted, the recipes stay.');
function ordnerHtml() {
  const liste = ordUebersicht(Z.rezepte, Z.ordner);
  return `<div class="ueber"><h2 style="font-size:19px">${L('Ordner', 'Folders')}</h2>${frag(ORD_ERKL() + ' ' + L('Zum Ordnen eine Zeile am Griff lange drücken oder mit der Maus ziehen. Ein Rezept legst du über seine Werkzeuge (Winkel am Namen) in einen Ordner.', 'To reorder, long-press a row at the handle or drag it with the mouse. Put a recipe into a folder via its tools (the chevron at the name).'))}</div>
   <div class="liste" id="ord-liste">${liste.map((o) => `<div class="kat-zeile ord-zeile" data-oid="${esc(o.id)}"><span class="griff" aria-hidden="true" title="${L('Zum Verschieben lange drücken oder ziehen', 'Long-press or drag to move')}">${ic('griff')}</span><span class="kat-zeichen">${o.bild ? `<img class="sticker" src="${esc(o.bild)}" alt="" loading="lazy">` : o.ico ? `<span aria-hidden="true">${esc(o.ico)}</span>` : ic('ordner')}</span>
      <input class="feld ord-name" data-oid="${esc(o.id)}" value="${esc(ordnerName(o))}" placeholder="${L('Name des Ordners', 'Folder name')}" aria-label="${L('Name des Ordners', 'Folder name')}" autocomplete="off">
      <button class="chip ord-auf" data-a="kat" data-kat="ordner:${esc(o.id)}" data-geh="1" ${o.anzahl ? '' : 'disabled'} aria-label="${fuelle(L('{0} Rezepte in „{1}“ ansehen', 'View {0} recipes in “{1}”'), o.anzahl, ordTitel(o))}">${o.anzahl}</button><button class="rund" data-a="ordner-weg" data-oid="${esc(o.id)}" aria-label="${fuelle(L('Ordner „{0}“ löschen', 'Delete folder “{0}”'), ordTitel(o))}">${ic('muell')}</button></div>`).join('') || `<p class="quelle" id="ord-leer">${L('Noch kein Ordner.', 'No folder yet.')}</p>`}</div>
   <div class="reihe" style="margin-top:12px"><button class="knopf akz" data-a="ordner-neu">${ic('plus')}${L('Neuer Ordner', 'New folder')}</button></div>`;
}
function ordnerWahlFenster(uid) {
  const r = rezept(uid); if (!r) return; const jetzt = ordnerVonRezept(r, Z.ordner);
  fenster(`<h2>${L('In einen Ordner legen', 'Put into a folder')} ${frag(ORD_ERKL())}</h2><div class="wahl-liste" id="ord-wahl">${Z.ordner.map((o) => `<button class="zeile" data-a="ordner-setzen" data-oid="${esc(o.id)}" data-uid="${esc(uid)}" aria-pressed="${String(o.id) === jetzt}">${o.ico ? `<span class="kat-zeichen" aria-hidden="true">${esc(o.ico)}</span>` : ic('ordner')}<span>${esc(ordTitel(o))}</span>${String(o.id) === jetzt ? ic('haken', 'pf') : ''}</button>`).join('')}
    ${jetzt ? `<button class="zeile" data-a="ordner-setzen" data-oid="" data-uid="${esc(uid)}">${ic('x')}<span>${L('aus dem Ordner nehmen', 'take out of the folder')}</span></button>` : ''}</div>
    <form class="suche" data-form="ordner-neu-zu" data-uid="${esc(uid)}" style="margin-top:10px">${ic('plus')}<input name="n" placeholder="${L('Neuen Ordner anlegen', 'Create new folder')}" autocomplete="off" aria-label="${L('Neuer Ordner', 'New folder')}"></form>`);
}


/* ---------- Bilder-Ordner ---------- */
function bilderHtml() {
  const B = s.bilder, mit = Z.rezepte.filter((r) => istInhalt(r) && r.img), ohne = Z.rezepte.filter((r) => istInhalt(r) && !r.img);
  const gez = mit.filter((r) => B.filter === 'alle' || (B.filter === 'beispiele' ? r.beispiel : !r.beispiel));
  for (const u of [...B.wahl]) if (!gez.some((r) => r.uid === u)) B.wahl.delete(u);
  return `<div class="ueber"><h2 style="font-size:19px">Bilder</h2><small>${mit.length} Bilder · ${ohne.length} Rezepte ohne Bild</small></div>
   <div class="laeden">${[['alle', 'Alle'], ['eigene', 'Eigene'], ['beispiele', 'Beispiele']].map(([f, t]) => `<button class="chip" data-a="bilder-filter" data-f="${f}" aria-pressed="${B.filter === f}">${t}</button>`).join('')}<button class="chip" data-a="bilder-gross" aria-pressed="${B.gross}">${ic('voll')}${B.gross ? 'Groß' : 'Klein'}</button>${frag('Tippe Bilder an, um sie auszuwählen. „Löschen“ entfernt nur das Bild; das Rezept mit seinem Text bleibt.')}</div>
   <div class="reihe" style="margin-bottom:10px"><button class="knopf rot" data-a="bilder-weg" ${B.wahl.size ? '' : 'disabled'}>${ic('muell')}Löschen (${B.wahl.size})</button><button class="knopf" data-a="bilder-alle-wahl">${B.wahl.size === gez.length && gez.length ? 'Auswahl aufheben' : 'Alle auswählen'}</button><button class="knopf rot" data-a="bilder-alle-weg" ${mit.length ? '' : 'disabled'}>Alle Bilder löschen</button></div>
   <div class="bildgitter ${B.gross ? 'gross' : ''}">${gez.map((r) => `<button class="bildkachel" data-a="bild-wahl" data-uid="${esc(r.uid)}" aria-pressed="${B.wahl.has(r.uid)}"><img src="${esc(r.img)}" alt="" loading="lazy"><span class="hk">${B.wahl.has(r.uid) ? ic('haken') : ''}</span><span class="bn">${esc(r.name)}</span></button>`).join('') || '<p class="quelle">Keine Bilder in dieser Auswahl.</p>'}</div>
   ${ohne.length ? `<div class="gruppe"><h3>Rezepte ohne Bild</h3><div class="liste">${ohne.map((r) => `<button class="zeile" data-a="bild-dazu" data-uid="${esc(r.uid)}">${ic('kamera')}<span>${esc(r.name)}<small>Foto einfügen</small></span></button>`).join('')}</div></div>` : ''}`;
}
/* Bild anpassen: Ausschnitt ziehen, Zoom, schnelle Lagen. Gespeichert in r.imgCrop wie in der alten App. */
let zs = null;
function zuschnittFenster(uid) {
  const r = rezept(uid); if (!r?.img) return; zs = { uid, x: zahl(r.imgCrop?.x, 50), y: zahl(r.imgCrop?.y, 50), z: Math.min(3, Math.max(1, zahl(r.imgCrop?.scale, 1))) };
  fenster(`<h2>Bild anpassen</h2><div class="zs-rahmen" id="zs-rahmen"><img src="${esc(r.img)}" alt="" draggable="false" id="zs-bild"></div>
   <div class="laeden" style="margin:10px 0 6px">${[['Mitte', '50,50'], ['Oben', '50,0'], ['Unten', '50,100'], ['Links', '0,50'], ['Rechts', '100,50']].map(([t, l]) => `<button class="chip" data-a="zs-lage" data-l="${l}">${t}</button>`).join('')}</div>
   <label class="zs-regler">Zoom<input type="range" id="zs-zoom" min="100" max="300" value="${Math.round(zs.z * 100)}"><b id="zs-wert"></b></label>
   <div class="zs-vor"><div><span class="vk"><img src="${esc(r.img)}" alt=""></span>Karte</div><div><span class="vh"><img src="${esc(r.img)}" alt=""></span>Kopfbild</div></div>
   <div class="reihe" style="margin-top:12px"><button class="knopf akz" data-a="zs-ok">${ic('haken')}Übernehmen</button><button class="knopf" data-a="zs-null">Zurücksetzen</button><button class="knopf" data-a="fenster-zu">Abbrechen</button></div>`);
  zsZeigen();
}
function zsZeigen() { if (!zs) return; document.querySelectorAll('#zs-bild, .zs-vor img').forEach((i) => { i.style.objectPosition = `${zs.x}% ${zs.y}%`; i.style.transformOrigin = `${zs.x}% ${zs.y}%`; i.style.transform = `scale(${zs.z})`; }); const w = $('zs-wert'); if (w) w.textContent = zs.z.toFixed(1).replace('.', ',') + '×'; }
let zsZug = null;
document.addEventListener('pointerdown', (ev) => { const b = ev.target.closest?.('#zs-rahmen'); if (!b || !zs) return; zsZug = { b, x: ev.clientX, y: ev.clientY, cx: zs.x, cy: zs.y }; try { b.setPointerCapture(ev.pointerId); } catch { /* ohne */ } });
document.addEventListener('pointermove', (ev) => { if (!zsZug || !zs) return; const r = zsZug.b.getBoundingClientRect(); zs.x = Math.min(100, Math.max(0, zsZug.cx - (ev.clientX - zsZug.x) / r.width * 100 / zs.z)); zs.y = Math.min(100, Math.max(0, zsZug.cy - (ev.clientY - zsZug.y) / r.height * 100 / zs.z)); zsZeigen(); });
document.addEventListener('pointerup', () => { zsZug = null; }); document.addEventListener('pointercancel', () => { zsZug = null; });

/* ---------- Blatt hinter +: jeder Weg zu einem neuen Rezept ---------- */
/* Klaus 23.11.: Bilder und Symbole sprechen. Das Plus zeigt sechs große Symbole mit je einem Wort; ein Tipp führt in den Weg.
   Dort bleiben die sechs Wege als schmale Symbolreihe oben stehen (wie in der abgenommenen Vorschau), darunter nur, was der Weg braucht.
   „Schreiben“ und „Datei“ gehen ohne Zwischenschritt los. Kein Erklärtext: was ein Knopf tut, sagt sein Hinweis (Tooltip). */
/* Farbfelder wie die Bereiche der Private Akte, aber dezent (Klaus 23.11.: „Wasserfarben, transparent, nicht so stark leuchtend“): --kc färbt Feld und Zeichen. */
const WF = { gelb: '#d39a2e', koralle: '#e0695a', blau: '#4b86d6', petrol: '#2f9d9a', violett: '#8a6bd0', gruen: '#48a878' };
const kfeld = (i) => `<span class="kfeld">${ic(i)}</span>`;
const IMP = [['selbst', 'stift', ['Schreiben', 'Write'], WF.gelb], ['scan', 'kamera', ['Foto', 'Photo'], WF.koralle], ['web', 'welt', ['Web', 'Web'], WF.blau], ['text', 'datei', ['Text', 'Text'], WF.petrol], ['datei', 'ordner', ['Datei', 'File'], WF.violett], ['pakete', 'paket', ['Beispiele', 'Examples'], WF.gruen]];
const impKnopf = ([t, i, n, kc], gewaehlt) => `<button style="--kc:${kc}" ${t === 'selbst' ? 'data-a="neu-form"' : t === 'datei' ? 'data-a="einlesen"' : `data-a="neu-tab" data-t="${t}"`} ${gewaehlt == null ? '' : `role="tab" aria-selected="${gewaehlt}" aria-label="${L(n[0], n[1])}" title="${L(n[0], n[1])}"`}>${gewaehlt == null ? kfeld(i) : ic(i)}${gewaehlt === false ? '' : `<span>${L(n[0], n[1])}</span>`}</button>`;
function neuFenster(tab = '') {
  const inhalt = {
    scan: scanInhalt, web: webInhalt,
    text: () => `<span class="mitmik"><textarea class="feld" id="imp-text" style="min-height:150px" placeholder="${L('Rezepttext einfügen', 'Paste the recipe text')}" aria-label="${L('Rezepttext', 'Recipe text')}"></textarea>${mik('#imp-text')}</span><button class="knopf akz gross" data-a="imp-text" title="${L('Teilt den Text ohne KI in Name, Zutaten und Schritte', 'Splits the text into name, ingredients and steps without AI')}">${ic('haken')}${L('Aufteilen', 'Split')}</button>`,
    pakete: () => `<button class="knopf akz gross" data-a="beispiel">${ic('laden')}<span>${L('Beispielbuch laden', 'Load example book')}</span><small>${esc(beispielText())}</small></button>`,
  };
  if (!inhalt[tab]) { fenster(`<h2>${L('Neues Rezept', 'New recipe')}</h2><div class="imp-tabs" role="group" aria-label="${L('Wege zu einem neuen Rezept', 'Ways to a new recipe')}">${IMP.map((x) => impKnopf(x)).join('')}</div>`); return; }
  fenster(`<div class="imp-reihe" role="tablist" aria-label="${L('Wege zu einem neuen Rezept', 'Ways to a new recipe')}">${IMP.map((x) => impKnopf(x, x[0] === tab)).join('')}</div><div class="imp-p" data-weg="${tab}">${inhalt[tab]()}</div>`);
}
/* ---------- Web-Import (Kern: import/web.mjs). Direkt von der Seite, ohne Dienst dazwischen; im Browser hilft sonst Kopieren und Einfügen. ---------- */
function webInhalt() {
  const w = s.web || (s.web = { adresse: '', text: '', stand: '', seitentext: '' });
  const einfuegen = w.stand === 'gesperrt' || w.stand === 'einfuegen', tE = L('Seitentext einfügen statt Adresse', 'Paste page text instead of an address'), tH = L('Rezept von dieser Adresse holen (ohne KI, direkt von der Seite)', 'Get the recipe from this address (without AI, straight from the page)');
  const feld = `<form class="suche web-zeile" data-form="web-holen">${ic('welt')}<input id="web-adresse" name="u" inputmode="url" value="${esc(w.adresse)}" placeholder="https://…" aria-label="${L('Adresse der Seite', 'Address of the page')}" autocomplete="off" autocapitalize="off" enterkeyhint="go">${einfuegen ? '' : `<button type="button" class="feldknopf" data-a="web-einfuegen" aria-label="${tE}" title="${tE}">${ic('kopieren')}</button>`}<button type="button" class="feldknopf akz" data-a="web-holen" aria-label="${L('Rezept holen', 'Get recipe')}" title="${tH}">${ic('rechts')}</button></form>`;
  if (w.stand === 'ohneDaten') { const k = fuerKi(w.seitentext, spr());
    return feld + `<p class="scan-was" id="web-ohne">${L('Keine Rezeptdaten auf der Seite', 'No recipe data on the page')}</p>
     <div class="reihe"><button class="knopf akz gross" data-a="web-mit-ki" title="${esc(k.satz)}">${ic('funken')}<span>${L('Mit Claude lesen', 'Read with Claude')}</span><small id="web-was">Anthropic · ${fuelle(L('{0} Zeichen', '{0} characters'), k.text.length)}</small></button><button class="knopf gross" data-a="web-ohne-ki" title="${L('Erkennt die Überschriften „Zutaten“ und „Zubereitung“', 'Recognises the headings “Ingredients” and “Method”')}">${L('Ohne KI', 'Without AI')}</button></div>`; }
  return feld
    + (w.stand === 'gesperrt' ? `<p class="scan-was" id="web-gesperrt"><span>${L('Die Seite lässt sich nicht direkt lesen: öffnen, alles kopieren, hier einfügen', 'The page cannot be read directly: open it, copy everything, paste here')}</span><a class="rund" href="${esc(w.adresse)}" target="_blank" rel="noopener noreferrer" aria-label="${L('Seite öffnen', 'Open page')}" title="${L('Seite öffnen', 'Open page')}">${ic('link')}</a></p>` : '')
    + (einfuegen ? `<span class="mitmik"><textarea class="feld" id="web-text" style="min-height:96px" placeholder="${L('Seitentext einfügen', 'Paste the page text')}" aria-label="${L('Eingefügter Seitentext', 'Pasted page text')}">${esc(w.text)}</textarea></span><button class="knopf akz gross" data-a="web-eingefuegt">${ic('haken')}${L('Lesen', 'Read')}</button>` : '');
}
async function webHolen() {
  const w = s.web; if (!w) return; const roh = $('web-adresse')?.value ?? w.adresse, a = webAdresse(roh); w.adresse = roh; w.text = $('web-text')?.value ?? w.text;
  if (!a) { melde(L('Bitte eine Web-Adresse eintragen.', 'Please enter a web address.')); return; }
  w.adresse = a; w.stand = '';
  try { webAuswerten(await W.mit(L('Seite wird gelesen …', 'Reading the page …'), () => holeSeite(a, { sprache: spr() }))); }
  catch (f) { if (f.gesperrt) { w.stand = 'gesperrt'; neuFenster('web'); $('web-text')?.focus(); } else melde(f.message); }
}
function webAuswerten(roh) {
  const w = s.web, e = ausEingefuegtem(roh, webAdresse(w.adresse), { kategorien: scanKats() });
  if (e.rezept) return webInsFormular(e.rezept, L('Aus den Rezeptdaten der Seite gelesen. Bitte prüfen.', 'Read from the recipe data of the page. Please check.'));
  if (!e.text) { melde(L('Bitte zuerst etwas einfügen.', 'Please paste something first.')); return; }
  w.seitentext = e.text; w.stand = 'ohneDaten'; neuFenster('web');
}
async function webInsFormular(r, meldung) {
  let img = '';
  if (r.bildAdresse) { const b = await W.mit(L('Bild der Seite wird geholt …', 'Getting the picture of the page …'), () => holeBild(r.bildAdresse)); if (b) { try { img = await bildAusDatei(b); } catch { img = ''; } } }
  fensterZu(); s.form = { ...formAus(null), name: r.name || '', cat: r.cat || '', servings: r.servings || 4, prepTime: r.prepTime ?? '', img, ings: r.ings.map(zutatZeile).join('\n'), steps: r.steps.map((x) => x.txt).join('\n\n'), source: r.source || webAdresse(s.web?.adresse) || '', flavors: r.flavors };
  s.web = null; geh('form'); melde(meldung + (r.bildAdresse && !img ? ' ' + L('Das Bild ließ sich nicht übernehmen.', 'The picture could not be taken over.') : ''));
}
async function webMitKi() {
  const w = s.web; if (!w?.seitentext) return;
  if (!SK.anthropic) { schluesselFenster('anthropic', 'web'); return; }
  const stellen = await kiAnweisungen(fuerKi(w.seitentext, spr()).text);
  if (stellen.length && !(await befehlFrage(stellen))) { neuFenster('web'); return; }
  fensterZu();
  try { const kats = scanKats(), roh = await W.mit(L('Claude liest die Seite …', 'Claude is reading the page …'), () => mitKi(w.seitentext, { schluessel: SK.anthropic, stufe: E.scan.stufe, kategorien: kats, sprache: spr() }));
    webInsFormular({ ...rezeptAusScan(roh, { kategorien: kats, sprache: spr() }), source: webAdresse(w.adresse) || '' }, L('Von Claude gelesen. Bitte prüfen.', 'Read by Claude. Please check.')); }
  catch (f) { melde(f.message); neuFenster('web'); }
}
/* ---------- Foto-Scan (Kern: import/scan.mjs, ki/reinigung.mjs, pruefung/datei.mjs) ---------- */
const scanKats = () => alleKategorien(Z.rezepte, Z.kategorien).filter((c) => c.art !== 'ohne').map((c) => ({ id: c.id, name: katName(c) }));
/* Klaus 23.11.: markieren und entscheiden, raus oder rein – kein Lesetext. Die Fundstellen stehen rot hinterlegt; gefragt wird einmal. */
const befehlFrage = (stellen) => frageP(L('Befehl an eine KI im Text', 'Instruction to an AI in the text'), `<ul class="ki-liste rot" data-ki-halt>${stellen.slice(0, 3).map((x) => `<li><mark>${esc(String(x.text || x.satz || '').slice(0, 160))}</mark></li>`).join('')}</ul>`, L('Trotzdem senden', 'Send anyway'));
function scanInhalt() {
  const sc = s.scan, an = E.scan.anbieter, st = E.scan.stufe, n = sc ? sc.dateien.length : 0, rund = (a, i, t) => `<button class="rund" data-a="${a}" aria-label="${esc(t)}" title="${esc(t)}">${ic(i)}</button>`;
  const tip = { anthropic: L('Claude (Anthropic) liest das Foto direkt', 'Claude (Anthropic) reads the photo directly'), mistral: L('Mistral OCR (EU) liest den Text, Claude sortiert ihn; braucht zusätzlich einen Mistral-Schlüssel', 'Mistral OCR (EU) reads the text, Claude sorts it; also needs a Mistral key'),
    schnell: L('Günstig; reicht für gut lesbare Vorlagen', 'Low cost; enough for clear originals'), standard: L('Genauer bei Handschrift und schwierigen Fotos; kostet mehr', 'More accurate with handwriting and difficult photos; costs more'), profi: L('Am genauesten und am teuersten', 'Most accurate and most expensive') };
  /* Wer liest und wie gründlich: eingeklappt hinter einer Zeile, die die Wahl nennt. Was eine Wahl bedeutet, sagt ihr Hinweis. */
  const wahl = `<details class="mehr" id="scan-mehr" ${s.scanMehr ? 'open' : ''}><summary>${ic('funken')}<span>${an === 'mistral' ? 'Mistral + Claude' : 'Claude'} · ${esc(L(STUFEN[st].name[0], STUFEN[st].name[1]))}</span></summary>
   <div class="scan-wahl">${[['anthropic', 'Claude'], ['mistral', 'Mistral (EU)']].map(([a, t]) => `<button class="chip" data-a="scan-anbieter" data-w="${a}" aria-pressed="${an === a}" title="${esc(tip[a])}">${esc(t)}</button>`).join('')}</div>
   <div class="scan-wahl">${Object.entries(STUFEN).map(([k, x]) => `<button class="chip" data-a="scan-stufe" data-w="${k}" aria-pressed="${st === k}" title="${esc(tip[k] || '')}">${esc(L(x.name[0], x.name[1]))}</button>`).join('')}</div></details>`;
  if (!n) return `<div class="zwei-gross"><button class="knopf gross" style="--kc:${WF.koralle}" data-a="scan-kamera">${kfeld('kamera')}${L('Kamera', 'Camera')}</button><button class="knopf gross" style="--kc:${WF.violett}" data-a="scan-datei" title=""${L('Fotos oder PDFs wählen; mehrere werden nacheinander gelesen', 'Choose photos or PDFs; several are read one after another')}">${kfeld('ordner')}${L('Datei', 'File')}</button></div>${wahl}`;
  const weg = rund('scan-neu', 'x', n === 1 ? L('Andere Datei', 'Other file') : L('Andere Dateien', 'Other files'));
  if (n === 1) { const v = sc.v, d = sc.dateien[0];
    if (fundeZumEntscheiden(v.liste).length && !sc.entschieden) return `<div class="scan-fund" data-ki-halt><div class="fund-bilder ${sc.gross ? 'gross' : ''}" data-a="fund-gross" role="button" tabindex="0" aria-label="${L('Fundstellen größer oder kleiner zeigen', 'Show the marked passages larger or smaller')}">${v.marken.map((m) => `<img src="${esc(m.bild)}" alt="${esc(fundName(v.liste, spr()))}, ${L('Seite', 'page')} ${m.seite}">`).join('')}<span class="fund-name">${ic('schild')}${esc(fundName(v.liste, spr()))}</span></div>
      <div class="reihe"><button class="knopf akz gross" data-a="scan-raus" title="${L('Die markierten Stellen gehen nicht mit an die KI; die Datei bleibt, wie sie ist', 'The marked passages are not sent to the AI; the file stays as it is')}">${ic('haken')}${L('Entfernen', 'Remove')}</button><button class="knopf gross" data-a="scan-rein" title="${L('Die Seiten gehen so an die KI, wie sie sind', 'The pages go to the AI as they are')}">${L('Drin lassen', 'Keep')}</button>${weg}</div></div>`;
    return `<div class="scan-vor" title="${esc(d.name || '')}">${v.bilder.slice(0, 6).map((b) => `<img src="${esc(b)}" alt="">`).join('')}${v.bilder.length > 6 ? `<span>+${v.bilder.length - 6}</span>` : ''}</div>
     <div class="reihe"><button class="knopf akz gross" data-a="scan-senden" title="${esc(wasGehtHinaus(v, an, spr()))}">${ic('scan')}<span>${L('Rezept lesen', 'Read recipe')}</span><small id="scan-was">${esc(wohinKurz(v, an, spr()))}</small></button>${rund('scan-pruefen', 'schild', L('Datei gründlich prüfen (im Gerät, auch Text im Bild)', 'Check the file thoroughly (on this device, including text in the picture)'))}${weg}</div>${wahl}`; }
  const lang = L('Je Foto geht die verkleinerte Fassung ohne Aufnahmedaten hinaus, je PDF die gereinigten Seitenbilder (höchstens 10 Seiten). Versteckter Text geht nicht mit. Jede gelesene Datei wird gleich eingetragen; das Ganze lässt sich rückgängig machen.', 'Per photo the reduced version without capture data is sent, per PDF the cleaned page images (10 pages at most). Hidden text is not sent. Each file that was read is added right away; the whole run can be undone.');
  return `<p class="scan-liste" title="${esc(sc.dateien.map((d) => d.name).join(', '))}">${sc.dateien.slice(0, 4).map((d) => esc(d.name)).join(' · ')}${n > 4 ? ' …' : ''}</p>
   <div class="reihe"><button class="knopf akz gross" data-a="scan-senden" title="${esc(lang)}">${ic('scan')}<span>${fuelle(L('{0} Dateien lesen', 'Read {0} files'), n)}</span><small id="scan-was">${an === 'mistral' ? L('Mistral, dann Anthropic', 'Mistral, then Anthropic') : 'Anthropic'}</small></button>${weg}</div>${wahl}`;
}
async function scanGewaehlt(dateien) {
  dateien = dateien.filter((d) => istPdf(d) || istBild(d)); if (!dateien.length) { melde(L('Bitte Fotos oder PDFs wählen.', 'Please choose photos or PDFs.')); return; }
  s.scan = { dateien, v: null, entschieden: '', gross: false };
  if (dateien.length === 1) { try { s.scan.v = await W.mit(L('Datei wird vorbereitet …', 'Preparing the file …'), (w) => vorbereiten(dateien[0], { sprache: spr(), fortschritt: (i, n) => { w.anteil(n ? (i - 1) / n : null); w.text(fuelle(L('Seite {0} von {1} wird gezeichnet …', 'Drawing page {0} of {1} …'), i, n)); } })); } catch (f) { s.scan = null; melde(f.message); } }
  neuFenster('scan');
}
const naechsteId = () => Z.rezepte.reduce((m, r) => Math.max(m, +r.id || 0), 0) + 1;
async function scanSenden() {
  const sc = s.scan; if (!sc || !sc.dateien.length) return;
  if (!SK.anthropic) { schluesselFenster('anthropic', 'scan'); return; }
  if (E.scan.anbieter === 'mistral' && !SK.mistral) { schluesselFenster('mistral', 'scan'); return; }
  const kats = scanKats(), opt = { anbieter: E.scan.anbieter, stufe: E.scan.stufe, schluessel: SK, kategorien: kats, sprache: spr() }, n = sc.dateien.length;
  fensterZu();
  if (n === 1) {
    try {
      const roh = await W.mit(L('Rezept wird gelesen …', 'Reading the recipe …'), (w) => erkennen(sc.v, { ...opt, fortschritt: (t) => w.text(t), beiAnweisung: befehlFrage })), r = rezeptAusScan(roh, { kategorien: kats, bild: sc.v.store, sprache: spr() });
      s.form = { ...formAus(null), name: r.name, cat: r.cat, servings: r.servings, prepTime: r.prepTime ?? '', img: r.img, ings: r.ings.map(zutatZeile).join('\n'), steps: r.steps.map((x) => x.txt).join('\n\n'), flavors: r.flavors, kiEntfernt: sc.v.liste.filter((e) => e.grund === 'meta' || sc.v.zugedeckt) };
      s.scan = null; geh('form'); melde(L('Gelesen. Bitte prüfen.', 'Read. Please check.'));
    } catch (f) { if (!f.abgebrochen) melde(f.message); neuFenster('scan'); }
    return;
  }
  /* Stapel: versteckter Text geht nie mit (ohne Rückfrage, am Rezept vermerkt); ein Befehl an eine KI im gelesenen Text → die Datei wird nicht gesendet. */
  const vorher = Z.rezepte, fehler = []; let ok = 0, entfernt = 0;
  await W.mit(L('Dateien werden gelesen …', 'Reading the files …'), async (w) => {
    for (let i = 0; i < n; i++) { const d = sc.dateien[i]; w.anteil(i / n); w.text(fuelle(L('Datei {0} von {1}: {2}', 'File {0} of {1}: {2}'), i + 1, n, d.name));
      try {
        const v = await vorbereiten(d, { sprache: spr() });
        const r = rezeptAusScan(await erkennen(v, { ...opt, beiAnweisung: async () => false }), { kategorien: kats, bild: v.store, sprache: spr() }), jetzt = new Date().toISOString(), neu = normalisiere({ id: naechsteId(), uid: neueUid(), created: jetzt, modified: jetzt, ...r });
        if (v.liste.length) vermerken(neu, v.liste, 'scan'); entfernt += fundeZumEntscheiden(v.liste).length;
        Z.rezepte = [...Z.rezepte, neu]; ok++;
      } catch (f) { fehler.push([d.name, f.abgebrochen ? L('Befehl an eine KI im Text. Nicht gesendet.', 'Instruction to an AI in the text. Not sent.') : f.message]); if (f.schluesselAbgelehnt || f.keinSchluessel) break; }
    }
  });
  sichern(); s.scan = null; s.kat = 'alle'; s.frage = ''; geh('start', {}, s.ansicht === 'start');
  melde(fuelle(L('{0} von {1} gelesen', '{0} of {1} read'), ok, n) + (entfernt ? ' · ' + fuelle(L('{0} versteckt entfernt', '{0} hidden removed'), entfernt) : ''), ok ? L('Rückgängig', 'Undo') : '', () => { Z.rezepte = vorher; sichern(); zeichne(true); });
  if (fehler.length) fenster(`<h2>${L('Nicht gelesen', 'Not read')}</h2><ul class="ki-liste" id="scan-fehler">${fehler.map(([name, grund]) => `<li><b>${esc(name)}</b><br>${esc(grund)}</li>`).join('')}</ul><div class="reihe"><button class="knopf" data-a="fenster-zu">${L('Schließen', 'Close')}</button></div>`);
}

/* ---------- Anlegen und Bearbeiten ---------- */
function formHtml() {
  const f = s.form, kats = alleKategorien(Z.rezepte, Z.kategorien).filter((c) => c.art !== 'ohne');
  return `<div class="ueber"><h2 style="font-size:19px">${f.neu ? 'Neues Rezept' : 'Rezept bearbeiten'}</h2></div>
  <form class="felder" data-form="rezept">
   <label>Name<input class="feld" name="name" value="${esc(f.name)}" required autocomplete="off"></label>
   <div class="zwei"><label>Kategorie<select class="feld" name="cat"><option value="">ohne Kategorie</option>${kats.map((c) => `<option value="${esc(c.id)}" ${f.cat === c.id ? 'selected' : ''}>${esc(katName(c))}</option>`).join('')}</select></label>
   <label>Neue Kategorie (statt Auswahl)<input class="feld" name="katneu" placeholder="z. B. Sushi" autocomplete="off"></label></div>
   ${Z.ordner.length ? `<label>${L('Ordner', 'Folder')}<select class="feld" name="folder"><option value="">${L('kein Ordner', 'no folder')}</option>${Z.ordner.map((o) => `<option value="${esc(o.id)}" ${String(o.id) === String(f.folder || '') ? 'selected' : ''}>${esc(ordTitel(o))}</option>`).join('')}</select></label>` : ''}
   <div class="zwei"><label>Portionen<input class="feld" name="servings" type="number" min="1" max="99" value="${esc(f.servings)}"></label><label>Zeit in Minuten<input class="feld" name="prepTime" type="number" min="0" max="999" value="${esc(f.prepTime ?? '')}"></label></div>
   <label>Zutaten, eine je Zeile (z. B. „200 g Mehl“)<span class="mitmik"><textarea class="feld" name="ings" id="f-ings">${esc(f.ings)}</textarea>${mik('#f-ings')}</span></label>
   <label>Schritte, einer je Absatz<span class="mitmik"><textarea class="feld" name="steps" id="f-steps" style="min-height:170px">${esc(f.steps)}</textarea>${mik('#f-steps')}</span></label>
   <div class="formbild">${f.img ? `<img src="${esc(f.img)}" alt="">` : ''}<button type="button" class="knopf" data-a="bild-waehlen">${ic('kamera')}${f.img ? 'Anderes Foto' : 'Foto dazu'}</button>${f.img ? `<button type="button" class="knopf" data-a="bild-weg">Foto entfernen</button>` : ''}</div>
   <div class="reihe"><button class="knopf akz" type="submit">${ic('haken')}Speichern</button><button class="knopf" type="button" data-a="zurueck">Abbrechen</button></div>
  </form>`;
}
function formAus(r) {
  return { neu: !r, uid: r?.uid || null, name: r?.name || '', cat: r?.cat || (s.kat !== 'alle' && s.kat !== KAT_OHNE && !s.kat.startsWith('ordner:') ? s.kat : ''), folder: r ? ordnerVonRezept(r, Z.ordner) : (s.kat.startsWith('ordner:') ? s.kat.slice(7) : ''), servings: r?.servings || 4, prepTime: r?.prepTime ?? '', img: r?.img || '',
    ings: (r?.ings || []).map(zutatZeile).join('\n'), steps: (r?.steps || []).map((x) => x.txt).join('\n\n') };
}
function formLesen(form) { const d = new FormData(form); for (const k of ['name', 'cat', 'servings', 'prepTime', 'ings', 'steps']) s.form[k] = d.get(k); if (d.has('folder')) s.form.folder = d.get('folder'); return d; }
function formSpeichern(form) {
  const d = formLesen(form), f = s.form;
  if (!String(f.name).trim()) { melde('Bitte einen Namen eintragen.'); return; }
  let cat = f.cat; const katneu = String(d.get('katneu') || '').trim();
  if (katneu) {
    const da = alleKategorien(Z.rezepte, Z.kategorien).find((c) => katName(c).toLowerCase() === katneu.toLowerCase());
    if (da) cat = da.id; else { cat = 'eig_' + Date.now().toString(36); Z.kategorien = { ...Z.kategorien, eigene: [...Z.kategorien.eigene, { id: cat, de: katneu, symbol: 'karte' }] }; }
  }
  const alt = f.uid ? rezept(f.uid) : null;
  const neu = normalisiere({ ...(alt || { id: Z.rezepte.reduce((m, r) => Math.max(m, +r.id || 0), 0) + 1, uid: neueUid(), created: new Date().toISOString() }), name: f.name, cat, ...(findeOrdner(Z.ordner, f.folder) || f.folder === '' ? { folder: f.folder || '' } : {}), servings: f.servings, prepTime: f.prepTime === '' ? undefined : +f.prepTime, img: f.img,
    ings: String(f.ings).split('\n').filter((t) => t.trim()).map(zutatAusZeile), steps: String(f.steps).split(/\n\s*\n|\n/).filter((t) => t.trim()).map((txt) => ({ txt })), modified: new Date().toISOString() });
  delete neu.beispiel; if (f.neu && f.flavors?.length) neu.flavors = f.flavors; if (f.neu && f.source) neu.source = f.source; if (f.kiEntfernt?.length) vermerken(neu, f.kiEntfernt, 'scan');   /* was vor der KI herausgenommen wurde, steht am Rezept */
  Z.rezepte = alt ? Z.rezepte.map((r) => (r.uid === alt.uid ? neu : r)) : [...Z.rezepte, neu];
  sichern(); s.form = null; melde('Gespeichert'); geh('rezept', { uid: neu.uid }, true);
}

/* ---------- Einstellungen (Klaus 23.11.: „Werkstatt, was willst du da umbauen? Da wird nur eingestellt.“ Die Ansicht heißt im Code weiter `werkstatt`.) ---------- */
const zeile = (a, i, t, u, extra = '') => `<button class="zeile" data-a="${a}" ${extra}>${ic(i)}<span>${esc(t)}${u ? `<small>${esc(u)}</small>` : ''}</span>${ic('rechts', 'pf')}</button>`;
const frag = (t) => `<details class="frag"><summary aria-label="Erklärung">?</summary><p>${esc(t)}</p></details>`;
/* Klaus 23.11.: keine langen Listen. Sechs Themen; ein Tipp klappt eines auf. Erklärungen stehen hinter „?“ in der Kopfzeile des Themas. */
function werkstattHtml() {
  const n = Z.rezepte.filter(istInhalt).length, b = Z.rezepte.filter((r) => r.beispiel).length, bilder = Z.rezepte.filter((r) => istInhalt(r) && r.img).length;
  const themen = [
    ['sichern', 'tresor', WF.gruen, L('Sichern', 'Backup'), L('Die Rezepte liegen nur in diesem Gerät. Eine Sicherung als Datei schützt sie, wenn der Browser geleert wird, und bringt sie auf ein anderes Gerät; sie liest auch Dateien der alten App, aus Muttis Rezeptbuch und dem Mixarium. Der Tresor hält dazu mehrere Stände im Gerät (fünf automatische, zehn benannte) und hilft, wenn etwas falsch gelöscht oder eingelesen wurde. KI-Schlüssel kommen nie in eine Sicherung.', 'The recipes are stored on this device only. A backup file protects them when the browser is cleared and takes them to another device; it also reads files of the old app, Muttis Rezeptbuch and the Mixarium. The vault additionally keeps several states on the device (five automatic, ten named) and helps when something was deleted or imported by mistake. AI keys never go into a backup.'),
      zeile('sichern', 'laden', L('Sicherung als Datei', 'Backup as a file')) + zeile('einlesen', 'ordner', L('Sicherung einlesen', 'Read a backup')) + zeile('tresor', 'tresor', L('Tresor', 'Vault'))],
    ['ki', 'funken', WF.violett, L('KI-Schlüssel', 'AI keys'), L('KI läuft nur mit deinem eigenen Schlüssel und nur, wenn du es auslöst. Anthropic (Claude) liest Fotos und Webseiten, OpenAI malt Bilder, Mistral liest Text (EU). Ein Schlüssel bleibt in diesem Gerät und kommt in keine Sicherung; die Kosten rechnet der Anbieter direkt mit dir ab.', 'AI runs only with your own key and only when you start it. Anthropic (Claude) reads photos and web pages, OpenAI draws pictures, Mistral reads text (EU). A key stays on this device and is in no backup; the provider bills you directly.'),
      `<div id="schl-liste">${Object.keys(ANBIETER).map((a) => zeile('schluessel', 'schluessel', ANBIETER[a].name, SK[a] ? L('gespeichert', 'saved') : L('noch keiner', 'none yet'), `data-anbieter="${a}"`)).join('')}</div>`],
    ['ordnung', 'karte', WF.gelb, L('Ordnung', 'Order'), '',
      zeile('geh', 'karte', L('Kategorien', 'Categories'), '', 'data-zu="kategorien"') + zeile('geh', 'ordner', L('Ordner', 'Folders'), String(Z.ordner.length), 'data-zu="ordner"') + zeile('geh', 'bild', L('Bilder', 'Pictures'), String(bilder), 'data-zu="bilder"')],
    ['aussehen', 'auge', WF.blau, L('Darstellung', 'Appearance'), '',
      zeile('farbe', 'auge', L('Farbe, hell und dunkel', 'Colour, light and dark'), (FARBEN[E.farbe]?.de || '') + ' · ' + TOENE[E.ton]) + zeile('schrift', 'stift', L('Schriftgröße', 'Text size'), schriftWert(E.schrift) + ' %') + zeile('hinweise', 'frage', L('Hinweis-Blasen', 'Tooltips'), E.hinweiseAus ? L('aus', 'off') : L('an', 'on'), `aria-pressed="${!E.hinweiseAus}"`) + (installFrage ? zeile('installieren', 'laden', L('Als App installieren', 'Install as an app')) : '')],
    ['beispiele', 'paket', WF.petrol, L('Beispiele', 'Examples'), '',
      zeile('beispiel', 'paket', L('Beispielbuch laden', 'Load example book'), beispielText()) + (b ? zeile('beispiele-weg', 'muell', L('Beispiele entfernen', 'Remove examples'), String(b)) : '')],
    ['aufraeumen', 'muell', WF.koralle, L('Aufräumen', 'Clean up'), '', zeile('alles-weg', 'muell', L('Alle Rezepte löschen', 'Delete all recipes'), L('mit Rückfrage', 'asks first'))],
  ];
  return `<div class="ueber"><h2 style="font-size:19px">${L('Einstellungen', 'Settings')}</h2><small>${n} ${L('Rezepte', 'recipes')}</small></div>
  <div class="themen">${themen.map(([id, i, kc, titel, hilfe, zeilen]) => { const auf = s.werkAuf.has(id);
    return `<div class="gruppe ${auf ? 'auf' : ''}" data-g="${id}" style="--kc:${kc}"><div class="gkopf-zeile"><button class="gkopf" data-a="werk-auf" data-g="${id}" aria-expanded="${auf}">${kfeld(i)}<span>${esc(titel)}</span>${ic(auf ? 'hoch' : 'rechts', 'pf')}</button>${auf && hilfe ? frag(hilfe) : ''}</div>${auf ? `<div class="liste">${zeilen}</div>` : ''}</div>`; }).join('')}</div>
  <p class="quelle" id="fassung">Mein Rezeptbuch ${FASSUNG}</p>`;   /* kein Verweis auf die bisherige App (Klaus 23.11.: „Wir müssen nicht auf eine schlechtere Version verweisen.“) */
}

/* ---------- Fenster ---------- */
function fenster(html) { const z = zuTun; zuTun = null; z?.(); $('fensterort').innerHTML = `<div class="schleier" data-a="fenster-zu"><div class="fenster" role="dialog" aria-modal="true">${html}</div></div>`; }
function fensterZu() { $('fensterort').innerHTML = ''; const z = zuTun; zuTun = null; z?.(); }
function frage(titel, text, ja, tun, rot = true) { jaTun = tun; fenster(`<h2>${esc(titel)}</h2><p>${esc(text)}</p><div class="reihe"><button class="knopf ${rot ? 'rot' : 'akz'}" data-a="ja">${esc(ja)}</button><button class="knopf" data-a="fenster-zu">Abbrechen</button></div>`); }
let jaTun = null, zuTun = null;
/* Frage mit Antwort als Zusage (für Abläufe, die warten): Ja → true; Abbrechen, Schleier, Esc → false. html ist fertiges HTML. */
function frageP(titel, html, ja) { return new Promise((fertig) => { fenster(`<h2>${esc(titel)}</h2>${html}<div class="reihe"><button class="knopf akz" data-a="ja">${esc(ja)}</button><button class="knopf" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`); jaTun = () => fertig(true); zuTun = () => fertig(false); }); }
function farbFenster() {
  fenster(`<h2>Farbe</h2><div class="laeden" role="radiogroup" aria-label="Hell oder dunkel" style="margin-bottom:10px">${[['hell', 'sonne', L('Hell', 'Light')], ['dunkel', 'mond', L('Dunkel', 'Dark')]].map(([t, i, n]) => `<button class="chip" role="radio" aria-checked="${E.ton === t}" data-a="ton" data-ton="${t}">${ic(i)}${n}</button>`).join('')}</div><div class="fleckliste" role="menu">${Object.entries(FARBEN).map(([n, f]) => `<button role="menuitemradio" aria-checked="${E.farbe === n}" data-a="farbe-wahl" data-farbe="${n}"><span class="fleck" style="background:linear-gradient(135deg,${f.k[0]},${f.k[2]})"></span>${esc(f.de)}</button>`).join('')}</div>`);
}

/* ---------- Sicherung, Beispiele ---------- */
/* ---------- KI-Schlüssel: dieselben Speicher-Namen wie die bisherige App, damit ein dort hinterlegter Schlüssel gilt ---------- */
/* Kern: ki/schluessel.mjs. Die Schlüssel liegen im Kern-Speicher dieses Geräts; einer aus der bisherigen App gilt weiter (nur gelesen). */
let S = null; const SK = { anthropic: '', openai: '', mistral: '' };
async function schlLaden() { for (const a of Object.keys(SK)) SK[a] = await S.hol(a).catch(() => ''); }
function schluesselFenster(a = 'openai', danach = '') {
  const B = ANBIETER[a] || ANBIETER.openai, tP = fuelle(L('Prüfen: schickt eine kleinste Anfrage an {0} und sagt, ob der Schlüssel funktioniert', 'Check: sends a minimal request to {0} and tells whether the key works'), B.name);
  fenster(`<h2 class="imp-kopf">${ic('schluessel')}<span>${esc(B.name)}</span>${frag(schlErklaerung(a, spr()))}</h2>
   <form data-form="schluessel" data-anbieter="${esc(a)}" data-danach="${esc(danach)}"><input type="password" class="feld" id="schl-feld" autocomplete="off" placeholder="${esc(B.beginn)}…" value="${esc(SK[a])}" style="width:100%" aria-label="${esc(B.name)}-${L('Schlüssel', 'key')}">
   <p class="schl-stand" id="schl-stand" role="status"></p>
   <div class="reihe"><button class="knopf akz gross" type="submit">${ic('haken')}${L('Speichern', 'Save')}</button><a class="knopf" id="schl-holen" href="${esc(schluesselAdresse(a))}" target="_blank" rel="noopener noreferrer" title="${esc(fuelle(L('Öffnet die Seite von {0}, auf der du einen Schlüssel erstellst', 'Opens the page of {0} where you create a key'), B.name))}">${ic('link')}${L('Schlüssel holen', 'Get a key')}</a><button class="rund" type="button" data-a="schluessel-pruefen" data-anbieter="${esc(a)}" aria-label="${esc(tP)}" title="${esc(tP)}">${ic('schild')}</button>${SK[a] ? `<button class="rund rot" type="button" data-a="schluessel-weg" data-anbieter="${esc(a)}" aria-label="${L('Schlüssel löschen', 'Delete key')}" title="${L('Schlüssel löschen', 'Delete key')}">${ic('muell')}</button>` : ''}</div></form>`);
}
/* ---------- Bild-Blatt: Tipp aufs Bild. Ansehen, anpassen, ersetzen, von der KI erzeugen lassen. Gelöscht wird im Bilder-Ordner. ---------- */
function bildBlatt(uid) {
  const r = rezept(uid); if (!r) return;
  fenster(`<h2>${esc(r.name)}</h2>${r.img ? `<img class="bb-bild" data-a="bild-voll" src="${esc(r.img)}" alt="${esc(r.name)}">` : '<p>Dieses Rezept hat noch kein Bild.</p>'}
   <div class="liste" style="margin-top:10px">${r.img ? zeile('zuschnitt', 'zuschnitt', 'Ausschnitt anpassen', 'verschieben und vergrößern') : ''}
   ${zeile('bild-dazu', 'kamera', r.img ? 'Bild ersetzen' : 'Bild einfügen', 'Foto aufnehmen oder Datei wählen', `data-uid="${esc(uid)}"`)}
   ${zeile('ki-bild', 'funken', 'Bild von der KI erzeugen', 'OpenAI, ' + KOSTEN_TEXT, `data-uid="${esc(uid)}"`)}
   ${zeile('gratis-bild', 'bild', 'Gratis-Foto erzeugen', 'ohne Schlüssel, über den Dienst Pollinations', `data-uid="${esc(uid)}"`)}</div>
   <div class="reihe" style="margin-top:10px"><button class="knopf" data-a="fenster-zu">Schließen</button>${frag('Ein Bild löschst du in den Einstellungen unter „Bilder“.')}</div>`);
}
async function bildErzeugen(uid, gratis) {
  const r = rezept(uid); if (!r) return; fensterZu();
  try {
    const img = await W.mit(gratis ? 'Gratis-Foto wird erzeugt …' : 'KI-Bild wird erzeugt (etwa 20 s) …', async (w) => { const roh = gratis ? await gratisBild(r) : await kiBild(SK.openai, r); w.text('Bild wird gespeichert …'); return bildAusDatei(await (await fetch(roh)).blob()); }), vorher = Z.rezepte;
    Z.rezepte = Z.rezepte.map((x) => (x.uid === uid ? { ...x, img, imgCrop: { x: 50, y: 50, scale: 1 } } : x)); sichern(); zeichne();
    melde(r.img ? 'Bild ersetzt' : 'Bild eingefügt', 'Rückgängig', () => { Z.rezepte = vorher; sichern(); zeichne(); });
  } catch (f) { melde(f.message || 'Es kam kein Bild zurück.'); }
}
/* ---------- Tresor ---------- */
let tr = null;
const datum = (ts) => new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
/* Der Stand wird sofort festgehalten (schreibe ist synchron), abgelegt wird nebenher. Der Tresor ist eine Zugabe, er hält nichts auf. */
function tresorAuto() { if (!tr || !Z.rezepte.some(istInhalt)) return Promise.resolve(); const sich = schreibe(Z); return tr.ablegen(sich, 'auto').catch(() => {}); }
async function tresorFenster() {
  const l = await tr.liste().catch(() => []);
  fenster(`<h2>Tresor</h2><form data-form="tresor" class="reihe"><input name="name" placeholder="Name, zum Beispiel: vor dem Aufräumen" style="flex:1;min-width:0"><button class="knopf akz" type="submit">${ic('tresor')}Jetzt sichern</button></form>
   ${l.length ? `<div class="liste tr-liste" style="margin-top:12px">${l.map((x) => `<div class="zeile">${ic(x.art === 'auto' ? 'uhr' : 'tresor')}<span>${esc(x.name)}<small>${datum(x.ts)} · ${x.anzahl} Rezepte</small></span><button class="chip" data-a="tresor-holen" data-id="${esc(x.id)}">Zurückholen</button><button class="chip" data-a="tresor-datei" data-id="${esc(x.id)}" aria-label="Als Datei speichern">${ic('laden')}</button><button class="chip" data-a="tresor-weg" data-id="${esc(x.id)}" aria-label="Diesen Stand löschen">${ic('muell')}</button></div>`).join('')}</div>` : '<p style="margin-top:12px">Noch kein Stand im Tresor.</p>'}
   <div class="reihe" style="margin-top:12px"><button class="knopf" data-a="fenster-zu">Schließen</button></div>`);
}
function herunterladen(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function einfuegen(eingang, beispiel = false) {
  if (beispiel) eingang = { ...eingang, rezepte: eingang.rezepte.map((r) => ({ ...r, beispiel: true })) };
  tresorAuto(); const h = hinweise(eingang), m = fuehreZusammen(Z, eingang);
  const vorher = Z; Z = m.zustand; ergaenze(); sichern(); s.kat = 'alle'; s.frage = '';
  melde(`+${m.neu} ${m.neu === 1 ? 'Rezept' : 'Rezepte'}${m.doppelt ? ` · ${m.doppelt} schon da` : ''}${h.ohneKategorie ? ` · ${h.ohneKategorie} ohne Kategorie` : ''}`, m.neu ? 'Rückgängig' : '', () => { Z = vorher; sichern(); zeichne(true); });
  geh('start', {}, s.ansicht === 'start');
}
async function beispielLaden() {
  const p = katalog?.pakete?.find((x) => x.id === ausgabe.beispiele[0]); if (!p) { melde('Beispielbuch nicht erreichbar'); return; }
  try {
    const roh = await W.mit('Beispielbuch wird geladen …', async (w) => { const ant = await fetch('../beispiele/' + p.datei); if (!ant.ok) throw new Error(String(ant.status)); return bytesMitAnteil(ant, (a) => w.anteil(a)); });
    const sum = [...new Uint8Array(await crypto.subtle.digest('SHA-256', roh))].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (sum !== p.sha256) { melde('Beispielbuch beschädigt, nicht eingelesen'); return; }
    einfuegen(lies(new TextDecoder().decode(roh)), true);
  } catch { melde('Beispielbuch nicht geladen. Netz?'); }
}

/* Klaus 23.11.: „Man kann doch schon ein paar kleine Beispielrezepte mit reinnehmen. Man muss ja nicht erst fragen.“
   Nur beim allerersten Start (leerer Speicher, nichts aus der bisherigen App): acht Rezepte mit Bild, als Beispiele markiert
   und damit mit einem Tipp entfernbar. Sie liegen neben der App (neu/start-rezepte.json, im Offline-Vorrat); fehlt die Datei, bleibt die App leer. */
async function startRezepte() {
  try { const a = await fetch('./start-rezepte.json'); if (!a.ok) return; const e = lies(await a.text());
    Z = fuehreZusammen(Z, { ...e, rezepte: e.rezepte.map((r) => ({ ...r, beispiel: true })) }).zustand; await lager.schreibe({ fassung: 1, zustand: Z, einstellungen: E }); } catch { /* ohne Startrezepte beginnt die App leer */ }
}

/* ---------- Flying Widget ---------- */
function katInSicht() { const a = document.querySelector('.fotokat [aria-pressed="true"]'), l = a?.parentElement; if (l && (a.offsetLeft < l.scrollLeft || a.offsetLeft + a.offsetWidth > l.scrollLeft + l.clientWidth)) l.scrollLeft = a.offsetLeft - (l.clientWidth - a.offsetWidth) / 2; }
function leisteZeichnen() {
  const o = $('leiste'), lage = E.leiste, u = lage.seite === 'u';
  o.className = 'fl ' + lage.seite; document.body.dataset.fl = lage.seite;
  o.style.top = u ? '' : (s.leisteAuf ? Math.min(70, Math.max(30, lage.pos)) : lage.pos) + '%'; o.style.left = u ? (s.leisteAuf ? 50 : lage.pos) + '%' : '';
  if (!s.leisteAuf) { o.innerHTML = `<button class="fl-griff" data-a="leiste-auf" aria-label="Leiste öffnen: Rezepte, Planer, Einkauf, Einstellungen. Lange drücken oder ziehen verschiebt sie."><span></span></button>`; return; }
  const k = (a, i, t, x = '') => `<button role="menuitem" data-a="${a}" ${x}>${i}${t}</button>`;
  o.innerHTML = `<div class="fl-knoepfe" role="menu"><button class="fl-zu" data-a="leiste-zu" aria-label="Schließen">${ic('x')}</button>`
    + k('geh', ic('buch'), 'Rezepte', `data-zu="start" ${s.ansicht === 'start' ? 'aria-current="page"' : ''}`) + k('geh', ic('plan'), 'Planer', `data-zu="plan" ${s.ansicht === 'plan' ? 'aria-current="page"' : ''}`)
    + k('geh', ic('einkauf'), 'Einkauf' + (ekOffen() ? ` <span class="zahl">${ekOffen()}</span>` : ''), `data-zu="einkauf" ${s.ansicht === 'einkauf' ? 'aria-current="page"' : ''}`) + k('geh', ic('einst'), 'Einstellungen', `data-zu="werkstatt" ${s.ansicht === 'werkstatt' ? 'aria-current="page"' : ''}`)
    + '<hr>' + k('nach-oben', ic('hoch'), 'Nach oben') + k('zurueck', ic('zurueck'), 'Zurück')
    + `<hr><div class="fl-werk" role="group" aria-label="Werkzeuge">${k('ton', ic('sonne'), L('Hell', 'Light'), `data-ton="hell" aria-pressed="${!istDunkel(E.farbe, E.ton)}"`)}${k('ton', ic('mond'), L('Dunkel', 'Dark'), `data-ton="dunkel" aria-pressed="${istDunkel(E.farbe, E.ton)}"`)}${k('farbe', '<span class="farbknopf"></span>', 'Farbe')}${k('schrift', '<span class="aa" aria-hidden="true">A<b>A</b></span>', 'Schrift')}${k('sichern', ic('tresor'), 'Sichern', `class="breit" title="${L('Sicherung als Datei speichern', 'Save a backup file')}"`)}</div></div>`;
}
let zug = null, gezogen = 0;
const zieht = () => { if (!zug || zug.weit) return; zug.weit = true; const o = $('leiste'); o.classList.add('zieht'); const g = o.querySelector('.fl-griff span'); if (g) g.innerHTML = ic('pfeile'); };
document.addEventListener('pointerdown', (ev) => { const g = ev.target.closest?.('.fl-griff'); if (!g) return; zug = { x: ev.clientX, y: ev.clientY, weit: false, uhr: setTimeout(zieht, 450) }; try { g.setPointerCapture(ev.pointerId); } catch { /* geht auch ohne */ } });
document.addEventListener('pointermove', (ev) => {
  if (!zug) return; if (!zug.weit && Math.hypot(ev.clientX - zug.x, ev.clientY - zug.y) < 10) return;
  zieht(); const o = $('leiste'); o.classList.remove('l', 'r', 'u'); o.classList.add('frei'); o.style.top = ev.clientY + 'px'; o.style.left = ev.clientX + 'px';
  const k = (v) => Math.round(Math.min(92, Math.max(8, v * 100)));
  E.leiste = ev.clientY > innerHeight * 0.86 ? { seite: 'u', pos: k(ev.clientX / innerWidth) } : { seite: ev.clientX < innerWidth / 2 ? 'l' : 'r', pos: k(ev.clientY / innerHeight) };
});
const los = () => { if (!zug) return; const weit = zug.weit; clearTimeout(zug.uhr); zug = null; const o = $('leiste'); o.classList.remove('zieht', 'frei'); if (weit) { gezogen = Date.now(); sichern(); leisteZeichnen(); } };
document.addEventListener('pointerup', los); document.addEventListener('pointercancel', los);
document.addEventListener('contextmenu', (ev) => { if (ev.target.closest?.('.fl-griff')) ev.preventDefault(); });

/* ---------- Zeichnen ---------- */
function zeichne(einzug = false) {
  kopfZeichnen(); leisteZeichnen();
  const m = $('main'), lesen = ['start', 'rezept', 'kochen'].includes(s.ansicht);
  if (breit() && lesen) {
    if (!rezept(s.uid)) s.uid = (rezept(E.zuletzt) || Z.rezepte.find(istInhalt))?.uid || null;
    const alt = m.querySelector('.md-liste')?.scrollTop || 0;
    m.innerHTML = `<div class="md ${s.nurDies ? 'nur' : ''}"><div class="md-liste">${startHtml()}</div><div class="md-detail">${rezept(s.uid) ? rezeptHtml() : ''}</div></div>`;
    const l = m.querySelector('.md-liste'); if (l) l.scrollTop = alt;
  } else m.innerHTML = s.ansicht === 'rezept' || s.ansicht === 'kochen' ? rezeptHtml() : s.ansicht === 'form' ? formHtml() : s.ansicht === 'werkstatt' ? werkstattHtml() : s.ansicht === 'einkauf' ? einkaufHtml() : s.ansicht === 'plan' ? planHtml() : s.ansicht === 'kategorien' ? kategorienHtml() : s.ansicht === 'ordner' ? ordnerHtml() : s.ansicht === 'bilder' ? bilderHtml() : startHtml();
  katInSicht(); m.classList.toggle('einzug', einzug); document.body.dataset.ansicht = s.ansicht; document.body.classList.toggle('nur', breit() && lesen && s.nurDies);
  if (s.ansicht !== 'kochen') { wachAus(); weckerAus(); }
  kochZeichnen();
  document.title = s.ansicht === 'rezept' && rezept(s.uid) ? `${rezept(s.uid).name} · ${ausgabe.titel}` : ausgabe.titel;
}

/* ---------- Handlungen ---------- */
const A = {
  geh: (e) => geh(e.dataset.zu, { uid: null, form: null }),
  rezept: (e) => { E.zuletzt = e.dataset.uid; s.rleiste = false; /* ein anderes Rezept beginnt mit eingeklappten Werkzeugen */ sichern(); if (breit()) { s.ansicht = 'rezept'; s.uid = e.dataset.uid; history.pushState({ ansicht: 'rezept', uid: s.uid }, ''); zeichne(); document.querySelector('.md-detail')?.scrollTo(0, 0); } else geh('rezept', { uid: e.dataset.uid }); },
  zurueck: () => { s.form = null; if (history.state && history.length > 1) history.back(); else geh('start', {}, true); },
  kat: (e) => { s.kat = e.dataset.kat; if (e.dataset.geh) geh('start'); else zeichne(); },
  'ordner-zuordnen': () => ordnerWahlFenster(s.uid),
  'ordner-setzen': (e) => { const o = findeOrdner(Z.ordner, e.dataset.oid); Z.rezepte = legeIn(Z.rezepte, Z.ordner, e.dataset.uid, e.dataset.oid); sichern(); fensterZu(); zeichne(); melde(o ? fuelle(L('Liegt jetzt im Ordner „{0}“', 'Now in the folder “{0}”'), ordTitel(o)) : L('Aus dem Ordner genommen', 'Taken out of the folder')); },
  'ordner-neu': () => { const a = ordAnlegen(Z.ordner, ''); Z.ordner = a.ordner; sichern(); zeichne(); document.querySelector(`.ord-name[data-oid="${a.id}"]`)?.focus(); },
  'ordner-weg': (e) => { const vorher = { r: Z.rezepte, o: Z.ordner }, o = findeOrdner(Z.ordner, e.dataset.oid), l = ordLoeschen(Z.rezepte, Z.ordner, e.dataset.oid); Z.rezepte = l.rezepte; Z.ordner = l.ordner; sichern(); zeichne();
    melde(fuelle(l.betroffen ? L('Ordner „{0}“ gelöscht, {1} Rezepte bleiben', 'Folder “{0}” deleted, {1} recipes stay') : L('Ordner „{0}“ gelöscht', 'Folder “{0}” deleted'), ordTitel(o), l.betroffen), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher.r; Z.ordner = vorher.o; sichern(); zeichne(); }); },
  'zur-suche': () => { if (s.ansicht !== 'start') geh('start'); $('suchfeld')?.focus(); },
  sinn: () => { if (E.sinn) { E.sinn = false; sem.ids = []; sem.fuer = ''; sichern(); zeichne(); melde('Sinn-Suche aus'); return; }
    frage('Sinn-Suche einschalten?', 'Sie findet Rezepte auch nach Bedeutung, zum Beispiel „etwas Süßes“ oder „Eintopf“. Dafür lädt die App einmalig ein Sprachmodell aus dem Netz (etwa 120 MB). Danach rechnet sie im Gerät; deine Rezepte gehen nirgendwohin.', 'Einschalten', () => { E.sinn = true; sem.status = ''; sichern(); zeichne(); if (s.frage.trim()) semPlanen(); else semBereit().then(() => melde('Sinn-Suche bereit')).catch(() => melde('Die Sinn-Suche ließ sich nicht laden.')); }, false); },
  'suche-leer': () => { s.frage = ''; zeichne(); $('suchfeld')?.focus(); },
  neu: () => neuFenster(),
  'neu-tab': (e) => { diktatAus(); neuFenster(e.dataset.t); },
  'werk-auf': (e) => { const g = e.dataset.g; if (s.werkAuf.has(g)) s.werkAuf.delete(g); else s.werkAuf.add(g); zeichne(); },
  'neu-form': () => { fensterZu(); s.form = formAus(null); geh('form'); },
  'imp-text': () => { const r = rezeptAusText($('imp-text').value); if (!r) { melde('Bitte zuerst einen Text einfügen.'); return; } diktatAus(); fensterZu();
    s.form = { ...formAus(null), name: r.name, servings: r.servings || 4, prepTime: r.prepTime ?? '', ings: r.ings.map(zutatZeile).join('\n'), steps: r.steps.map((x) => x.txt).join('\n\n') }; geh('form');
    melde(r.sicher ? `${r.ings.length} Zutaten und ${r.steps.length} Schritte erkannt. Bitte prüfen.` : 'Ohne Überschriften aufgeteilt. Bitte Zutaten und Schritte prüfen.'); },
  diktat: (e) => { const f = document.querySelector(e.dataset.feld); if (!f) return; diktat(f, spr(), (an) => { e.setAttribute('aria-pressed', String(an)); }, { beiFehler: (satz) => melde(satz) }); f.focus(); },   /* Kern 0.20: schreibt an der Schreibmarke, kennt „Komma“, „Punkt“, „neue Zeile“; Fehler (kein Mikrofon, keine Erlaubnis) werden gesagt */
  installieren: async () => { const p = installFrage; if (!p) return; installFrage = null; p.prompt(); await p.userChoice.catch(() => null); zeichne(); },
  bearbeiten: () => { s.form = formAus(rezept(s.uid)); geh('form'); },
  loeschen: () => { const r = rezept(s.uid); if (!r) return; const vorher = Z.rezepte; Z.rezepte = Z.rezepte.filter((x) => x.uid !== r.uid); sichern(); geh('start', { uid: null }, true); melde(`„${r.name}“ gelöscht`, 'Rückgängig', () => { Z.rezepte = vorher; sichern(); zeichne(true); }); },
  kochen: () => { K.i = 0; K.kopf = true; geh('kochen', { uid: s.uid }); wachAn(); },
  'k-schritt': (e) => { const r = rezept(s.uid); K.i = Math.min(r.steps.length - 1, Math.max(0, K.i + +e.dataset.d)); weckerAus(); kochZeichnen(); $('k-inhalt')?.classList.add('k-neu'); },
  'k-kopf': () => { K.kopf = !K.kopf; kochZeichnen(); },
  wecker: (e) => { if (K.uhr) { weckerAus(); kochZeichnen(); return; } K.rest = +e.dataset.min * 60;
    K.uhr = setInterval(() => { K.rest--; document.querySelectorAll('#k-zeit').forEach((z) => { z.textContent = zeitText(Math.max(0, K.rest)); }); if (K.rest <= 0) { weckerAus(); piep(); melde('Die Zeit ist um.'); kochZeichnen(); } }, 1000); kochZeichnen(); },
  'auf-liste': () => { const r = rezept(s.uid); if (!r) return; const n = s.portion[r.uid] || r.servings, da = Z.einkauf.posten.find((p) => p.uid === r.uid);
    Z.einkauf = { ...Z.einkauf, posten: da ? Z.einkauf.posten.map((p) => (p.uid === r.uid ? { ...p, portionen: n } : p)) : [...Z.einkauf.posten, { uid: r.uid, portionen: n }] }; sichern(); kopfZeichnen(); leisteZeichnen();
    melde(da ? 'Steht schon auf der Liste, Portionen angepasst' : `„${r.name}“ steht auf der Einkaufsliste`, 'Zur Liste', () => geh('einkauf')); },
  'ek-haken': (e) => { const k = e.dataset.k, h = { ...Z.einkauf.haken }; if (h[k]) delete h[k]; else h[k] = true; Z.einkauf = { ...Z.einkauf, haken: h }; sichern(); zeichne(); },
  'ek-rezept-weg': (e) => { Z.einkauf = { ...Z.einkauf, posten: Z.einkauf.posten.filter((p) => p.uid !== e.dataset.uid) }; sichern(); zeichne(); },
  'ek-laden': (e) => { Z.einkauf = { ...Z.einkauf, laden: e.dataset.l }; sichern(); zeichne(); },
  'ek-laden-neu': () => fenster(`<h2>Neuer Laden</h2><form class="felder" data-form="laden"><label>Name<input class="feld" name="n" placeholder="z. B. Wochenmarkt" required autocomplete="off"></label><div class="reihe"><button class="knopf akz" type="submit">Anlegen</button><button class="knopf" type="button" data-a="fenster-zu">Abbrechen</button></div></form>`),
  'ek-abgehakt-weg': () => { const vorher = Z.einkauf, l = einkaufsliste(ekPosten()); const offenJe = (uid) => l.some((x) => !Z.einkauf.haken[x.schluessel] && x.aus.includes(rezept(uid)?.name));
    Z.einkauf = { ...Z.einkauf, posten: Z.einkauf.posten.filter((p) => offenJe(p.uid)), eigene: Z.einkauf.eigene.filter((x) => !Z.einkauf.haken['eig:' + x.id]) }; sichern(); zeichne(); melde('Erledigtes entfernt', 'Rückgängig', () => { Z.einkauf = vorher; sichern(); zeichne(); }); },
  'ek-leeren': () => { const vorher = Z.einkauf; Z.einkauf = { ...Z.einkauf, posten: [], haken: {}, eigene: [] }; sichern(); zeichne(); melde('Liste geleert', 'Rückgängig', () => { Z.einkauf = vorher; sichern(); zeichne(); }); },
  planen: () => planWahlFenster(null, s.uid),
  'plan-waehlen': (e) => planWahlFenster(e.dataset.tag),
  'plan-setzen': (e) => { Z.plan = planen(Z.plan, e.dataset.tag, e.dataset.uid); sichern(); fensterZu(); if (s.ansicht === 'plan') zeichne(); else melde('Im Wochenplan eingetragen', 'Zum Plan', () => { s.planTag = new Date(e.dataset.tag + 'T12:00'); geh('plan'); }); },
  'plan-weg': (e) => { Z.plan = entplanen(Z.plan, e.dataset.tag, e.dataset.uid); sichern(); zeichne(); },
  'plan-woche': (e) => { const d = new Date(s.planTag); d.setDate(d.getDate() + +e.dataset.d); s.planTag = d; zeichne(); },
  'plan-heute': () => { s.planTag = new Date(); zeichne(); },
  'plan-einkauf': () => { const w = woche(s.planTag); let posten = Z.einkauf.posten, n = 0;
    for (const t of w.tage) for (const uid of Z.plan[tagIso(t)] || []) { const r = rezept(uid); if (r && !posten.some((p) => p.uid === uid)) { posten = [...posten, { uid, portionen: r.servings }]; n++; } }
    Z.einkauf = { ...Z.einkauf, posten }; sichern(); kopfZeichnen(); leisteZeichnen(); melde(n ? `${n} Rezepte auf die Einkaufsliste gesetzt` : 'Alle Gerichte der Woche stehen schon auf der Liste', 'Zur Liste', () => geh('einkauf')); },
  'kat-neu': () => { const a = katAnlegen(Z.kategorien, ''); Z.kategorien = a.kat; sichern(); zeichne(); document.querySelector(`.kat-name[data-kid="${a.id}"]`)?.focus(); },
  'kat-emoji': (e) => { const id = e.dataset.kid, bilder = Z.rezepte.filter((r) => istInhalt(r) && r.img && katVonRezept(r) === id), gew = Z.kategorien.namen?.[id]?.bild, jetzt = katBild(Z.rezepte, Z.kategorien, id)?.uid;
    fenster(`<h2>Bild oder Zeichen</h2>${bilder.length ? `<h3>Foto als Sticker ${frag('Ein kleines Foto aus dieser Kategorie, wie ein Sticker. Ohne Wahl steht das erste Rezept mit Bild.')}</h3><div class="sticker-raster">${bilder.map((r) => `<button data-a="kat-bild-setzen" data-kid="${esc(id)}" data-uid="${esc(r.uid)}" aria-pressed="${r.uid === jetzt}" aria-label="${esc(r.name)}"><img src="${esc(r.img)}" alt="" loading="lazy"></button>`).join('')}</div>${gew ? `<div class="reihe" style="margin-top:8px"><button class="knopf" data-a="kat-bild-setzen" data-kid="${esc(id)}" data-uid="">Vorgabe: erstes Bild</button></div>` : ''}<h3 style="margin-top:14px">Zeichen, wenn es kein Bild gibt</h3>` : '<p>In dieser Kategorie hat noch kein Rezept ein Bild. Bis dahin steht das Zeichen.</p>'}<div class="emoji-raster">${EMOJI.map((x) => `<button data-a="kat-emoji-setzen" data-kid="${esc(id)}" data-e="${x}">${x}</button>`).join('')}</div><div class="reihe" style="margin-top:10px"><button class="knopf" data-a="kat-emoji-setzen" data-kid="${esc(id)}" data-e="">Vorgabe</button></div>`); },
  'kat-bild-setzen': (e) => { Z.kategorien = bildWaehlen(Z.kategorien, e.dataset.kid, e.dataset.uid || null); sichern(); fensterZu(); zeichne(); },
  'kat-emoji-setzen': (e) => { const id = e.dataset.kid, namen = { ...(Z.kategorien.namen || {}) }, v = { ...(namen[id] || {}) }; if (e.dataset.e) v.emoji = e.dataset.e; else delete v.emoji; if (Object.keys(v).length) namen[id] = v; else delete namen[id];
    Z.kategorien = { ...Z.kategorien, namen, eigene: Z.kategorien.eigene.map((c) => (c.id === id && !e.dataset.e ? (({ emoji, ...rest }) => rest)(c) : c)) }; sichern(); fensterZu(); zeichne(); },
  'kat-weg': (e) => { const id = e.dataset.kid, n = anzahl(Z.rezepte, id); if (n) { katWahlFenster(`Wohin mit den ${n} Rezepten?`, id, 'kat-weg-ziel'); return; } A['kat-weg-ziel']({ dataset: { kid: id, ziel: '' } }, null, true); },
  'kat-weg-ziel': (e, ev, leer) => { const vorher = { r: Z.rezepte, k: Z.kategorien }, id = e.dataset.kid, c = alleKategorien(Z.rezepte, Z.kategorien).find((x) => x.id === id), name = c ? katName(c) : id;
    const l = katLoeschen(Z.rezepte, Z.kategorien, id, leer ? null : e.dataset.ziel); Z.rezepte = l.rezepte; Z.kategorien = l.kat; sichern(); fensterZu(); zeichne();
    melde(`„${name}“ gelöscht${l.verschoben ? `, ${l.verschoben} Rezepte umgehängt` : ''}`, 'Rückgängig', () => { Z.rezepte = vorher.r; Z.kategorien = vorher.k; sichern(); zeichne(); }); },
  'kat-zurueck': (e) => { Z.kategorien = { ...Z.kategorien, ausgeblendet: Z.kategorien.ausgeblendet.filter((x) => x !== e.dataset.kid), eigene: Z.kategorien.eigene }; const c = KATEGORIEN_FEST.find((x) => x.id === e.dataset.kid);
    Z.kategorien = { ...Z.kategorien, eigene: [...Z.kategorien.eigene] }; sichern(); zeichne(); if (c) melde(`„${c.de}“ steht wieder in der Liste`); },
  'kat-zuordnen': () => { const r = rezept(s.uid); if (r) katWahlFenster('Kategorie zuordnen', null, 'kat-setzen', r.uid); },
  'kat-setzen': (e) => { Z.rezepte = Z.rezepte.map((r) => (r.uid === e.dataset.uid ? { ...r, cat: e.dataset.ziel } : r)); sichern(); fensterZu(); zeichne(); melde('Kategorie geändert'); },
  'bilder-filter': (e) => { s.bilder.filter = e.dataset.f; zeichne(); },
  'bilder-gross': () => { s.bilder.gross = !s.bilder.gross; zeichne(); },
  'bild-wahl': (e) => { const w = s.bilder.wahl; if (w.has(e.dataset.uid)) w.delete(e.dataset.uid); else w.add(e.dataset.uid); zeichne(); },
  'bilder-alle-wahl': () => { const w = s.bilder.wahl, alle = [...document.querySelectorAll('.bildkachel')].map((b) => b.dataset.uid); if (w.size === alle.length) w.clear(); else alle.forEach((u) => w.add(u)); zeichne(); },
  'bilder-weg': () => { const w = new Set(s.bilder.wahl), vorher = Z.rezepte; Z.rezepte = Z.rezepte.map((r) => (w.has(r.uid) ? { ...r, img: '' } : r)); s.bilder.wahl.clear(); sichern(); zeichne(); melde(`−${w.size} Bilder`, 'Rückgängig', () => { Z.rezepte = vorher; sichern(); zeichne(); }); },
  'bilder-alle-weg': () => { const n = Z.rezepte.filter((r) => r.img).length; frage('Alle Bilder löschen?', `${n} Bilder werden entfernt. Die Rezepte mit ihrem Text bleiben.`, 'Alle Bilder löschen', () => { const vorher = Z.rezepte; Z.rezepte = Z.rezepte.map((r) => (r.img ? { ...r, img: '' } : r)); s.bilder.wahl.clear(); sichern(); zeichne(); melde(`−${n} Bilder`, 'Rückgängig', () => { Z.rezepte = vorher; sichern(); zeichne(); }); }); },
  'bild-dazu': (e) => { s.bildZiel = e.dataset.uid; fensterZu(); $('datei-bild').click(); },
  zuschnitt: () => zuschnittFenster(s.uid),
  rleiste: () => { s.rleiste = !s.rleiste; zeichne(); },
  'bild-blatt': () => bildBlatt(s.uid),
  // Tipp aufs Bild: mit Bild das Vollbild, ohne Bild gleich das Bild-Blatt. Am Monitor steht die Namenszeile UNTER dem Bild
  // (Klaus 23.11.: „der Winkel soll im Monitor stehen, nicht im Bild“); ein Tipp dort öffnet kein Bild.
  held: (e, ev) => { if (breit() && ev?.target?.closest?.('.verlauf')) return; A[rezept(s.uid)?.img ? 'bild-voll' : 'bild-blatt'](); },
  'bild-voll': () => { const r = zeig(rezept(s.uid)); if (!r?.img) return; fensterZu(); $('fensterort').innerHTML = `<div class="vollbild" data-a="voll-zu" role="dialog" aria-modal="true" aria-label="${esc(r.name)}"><img src="${esc(r.img)}" alt="${esc(r.name)}"><button class="voll-werk" data-a="voll-werk">${ic('bild')}Bild bearbeiten</button><button class="voll-x" data-a="voll-zu" aria-label="Schließen">${ic('x')}</button><p>${esc(r.name)}</p></div>`; history.pushState({ ...(history.state || { ansicht: s.ansicht, uid: s.uid }), voll: true }, ''); },
  'voll-zu': () => { if (document.querySelector('.vollbild')) { fensterZu(); if (history.state?.voll) history.back(); } },
  // Klaus 23.11.: ein Tipp aufs Bild öffnet das Vollbild, von dort geht es mit einem Tipp zum Bild-Blatt (Ausschnitt, ersetzen, KI-Bild).
  'voll-werk': () => { const uid = s.uid; if (history.state?.voll) { nachZurueck = () => bildBlatt(uid); history.back(); } else { fensterZu(); bildBlatt(uid); } },
  schluessel: (e) => schluesselFenster(e.dataset.anbieter || 'openai'),
  'schluessel-weg': async (e) => { const a = e.dataset.anbieter; await S.weg(a).catch(() => {}); SK[a] = ''; fensterZu(); zeichne(); melde(L('Schlüssel gelöscht', 'Key deleted')); },
  'schluessel-pruefen': async (e) => { const a = e.dataset.anbieter, st = $('schl-stand'), wert = $('schl-feld').value; const p = await W.mit(L('Schlüssel wird geprüft …', 'Checking the key …'), () => pruefeSchluessel(a, wert, { sprache: spr() })); if (st?.isConnected) { st.textContent = p.text; st.dataset.ok = String(p.ok); } },
  'web-holen': () => webHolen(),
  'web-einfuegen': () => { const w = s.web; if (!w) return; w.adresse = $('web-adresse')?.value ?? w.adresse; w.stand = 'einfuegen'; neuFenster('web'); $('web-text')?.focus(); },
  'web-eingefuegt': () => { const w = s.web; if (!w) return; w.adresse = $('web-adresse')?.value ?? w.adresse; w.text = $('web-text')?.value || ''; webAuswerten(w.text); },
  'web-ohne-ki': () => { const w = s.web, r = w && ohneKi(w.seitentext, webAdresse(w.adresse)); if (!r) { melde(L('Ohne KI ließ sich kein Rezept erkennen.', 'No recipe could be recognised without AI.')); return; } webInsFormular({ ...r, cat: '' }, r.sicher ? L('Ohne KI aufgeteilt. Bitte prüfen.', 'Split without AI. Please check.') : L('Ohne Überschriften aufgeteilt. Bitte genau prüfen.', 'Split without headings. Please check carefully.')); },
  'web-mit-ki': () => webMitKi(),
  'scan-kamera': () => $('datei-kamera').click(),
  'scan-datei': () => $('datei-scan').click(),
  'scan-anbieter': (e) => { E.scan = { ...E.scan, anbieter: e.dataset.w }; s.scanMehr = true; sichern(); neuFenster('scan'); },
  'scan-stufe': (e) => { E.scan = { ...E.scan, stufe: e.dataset.w }; s.scanMehr = true; sichern(); neuFenster('scan'); },
  'scan-neu': () => { s.scan = null; neuFenster('scan'); },
  'scan-raus': () => { if (!s.scan) return; s.scan.entschieden = 'raus'; neuFenster('scan'); },
  'scan-rein': async () => { const sc = s.scan; if (!sc) return; try { sc.v = await W.mit(L('Datei wird vorbereitet …', 'Preparing the file …'), () => vorbereiten(sc.dateien[0], { sprache: spr(), zudecken: false })); sc.entschieden = 'rein'; } catch (f) { melde(f.message); } neuFenster('scan'); },
  'fund-gross': () => { if (!s.scan) return; s.scan.gross = !s.scan.gross; neuFenster('scan'); },
  'scan-senden': () => scanSenden(),
  'scan-pruefen': async () => { const d = s.scan?.dateien[0]; if (!d) return; const p = await W.mit(L('Datei wird im Gerät geprüft …', 'Checking the file on this device …'), () => dateiPruefen(d.name, d));
    fenster(`<h2 class="imp-kopf"><button class="rund" data-a="neu-tab" data-t="scan" aria-label="${L('Zurück zum Scan', 'Back to the scan')}">${ic('links')}</button>${ic('schild')}<span>${L('Prüfung', 'Check')}</span></h2>${pruefHtml(p, spr())}`); },
  'ki-bild': (e) => { const uid = e.dataset.uid, r = rezept(uid); if (!SK.openai) { schluesselFenster('openai', uid); return; }
    frage('Bild von der KI erzeugen?', `Der Name, die ersten Zutaten und Schritte von „${r.name}“ gehen an OpenAI. Kosten: ${KOSTEN_TEXT}.${r.img ? ' Das vorhandene Bild wird ersetzt.' : ''}`, 'Erzeugen', () => bildErzeugen(uid, false), false); },
  'gratis-bild': (e) => { const uid = e.dataset.uid, r = rezept(uid); frage('Gratis-Foto erzeugen?', `Der Name „${r.name}“ geht an den Dienst Pollinations. Kein Schlüssel, keine Kosten.${r.img ? ' Das vorhandene Bild wird ersetzt.' : ''}`, 'Erzeugen', () => bildErzeugen(uid, true), false); },
  tresor: () => tresorFenster(),
  'tresor-holen': (e) => frage('Diesen Stand zurückholen?', 'Das Buch wird durch diesen Stand ersetzt. Der jetzige Stand kommt vorher automatisch in den Tresor.', 'Zurückholen', async () => { const sich = await tr.hol(e.dataset.id); if (!sich) { melde('Dieser Stand ist nicht mehr da.'); return; } await tresorAuto(); Z = fuehreZusammen({ ...leererZustand(), kategorien: leereKategorien() }, lies(JSON.stringify(sich))).zustand; ergaenze(); s.frage = ''; s.kat = 'alle'; sichern(); geh('start', { uid: null }, true); melde(`Zurückgeholt: ${Z.rezepte.filter(istInhalt).length} Rezepte`); }, false),
  'tresor-datei': async (e) => { const sich = await tr.hol(e.dataset.id); if (sich) { herunterladen(`${ausgabe.name}-tresor-${e.dataset.id.slice(2, 12)}.json`, JSON.stringify(sich)); melde('Als Datei gespeichert'); } },
  'tresor-weg': async (e) => { await tr.loeschen(e.dataset.id); tresorFenster(); },
  'zs-lage': (e) => { const [x, y] = e.dataset.l.split(','); zs.x = +x; zs.y = +y; zsZeigen(); },
  'zs-null': () => { zs.x = 50; zs.y = 50; zs.z = 1; $('zs-zoom').value = 100; zsZeigen(); },
  'zs-ok': () => { const z = zs; zs = null; Z.rezepte = Z.rezepte.map((r) => (r.uid === z.uid ? { ...r, imgCrop: { ...(r.imgCrop || {}), x: Math.round(z.x), y: Math.round(z.y), scale: Math.round(z.z * 100) / 100 } } : r)); sichern(); fensterZu(); zeichne(); },
  nurdies: () => { s.nurDies = !s.nurDies; zeichne(); },
  rail: () => { E.railZu = !E.railZu; sichern(); kopfZeichnen(); },
  schrift: () => fenster(`<h2>Schriftgröße ${frag('Die Schrift ändert sich, während du schiebst. Sie gilt für die ganze App, auch beim Kochen.')}</h2>${schriftRegler(E.schrift)}<div class="reihe" style="margin-top:14px"><button class="knopf" data-a="schrift-100">Zurück auf 100 %</button><button class="knopf akz" data-a="fenster-zu">Fertig</button></div>`),
  'schrift-100': () => { E.schrift = schriftSetzen(document.documentElement, 100); $('schriftregler').value = 100; $('schriftzahl').textContent = '100 %'; sichern(); },
  ton: (e) => { E.ton = e.dataset.ton; farbeSetzen(document.documentElement, E.farbe, E.ton); sichern(); if (e.closest('.fenster')) farbFenster(); kopfZeichnen(); },
  portion: (e) => { const r = rezept(s.uid); const n = Math.min(99, Math.max(1, (s.portion[r.uid] || r.servings) + +e.dataset.d)); s.portion[r.uid] = n; zeichne(); },
  'bild-waehlen': () => { formLesen(document.querySelector('[data-form=rezept]')); $('datei-bild').click(); },
  'bild-weg': () => { formLesen(document.querySelector('[data-form=rezept]')); s.form.img = ''; zeichne(); },
  sichern: () => { const d = new Date(); herunterladen(`${ausgabe.name}-${d.toISOString().slice(0, 10)}.json`, JSON.stringify(schreibe(Z))); melde('Sicherung gespeichert'); },
  einlesen: () => { fensterZu(); $('datei-sicherung').click(); },
  beispiel: () => beispielLaden(),
  'beispiele-weg': () => { const n = Z.rezepte.filter((r) => r.beispiel).length; frage('Beispiele entfernen?', `${n} Beispiel-Rezepte werden entfernt. Deine eigenen Rezepte bleiben.`, 'Entfernen', () => { tresorAuto(); const vorher = Z.rezepte; Z.rezepte = Z.rezepte.filter((r) => !r.beispiel); sichern(); zeichne(); melde(`−${n} Beispiele`, 'Rückgängig', () => { Z.rezepte = vorher; sichern(); zeichne(); }); }); },
  'alles-weg': () => { const n = Z.rezepte.filter(istInhalt).length; frage('Alle Rezepte löschen?', `${n} Rezepte werden gelöscht. Der jetzige Stand kommt vorher in den Tresor.`, 'Alle löschen', () => { tresorAuto(); const vorher = Z; Z = { ...leererZustand(), kategorien: leereKategorien() }; ergaenze(); E.zuletzt = null; sichern(); geh('start', {}, true); melde('Alle Rezepte gelöscht', 'Rückgängig', () => { Z = vorher; sichern(); zeichne(true); }); }); },
  farbe: () => farbFenster(),
  hinweise: () => { E.hinweiseAus = !E.hinweiseAus; sichern(); zeichne(); melde(E.hinweiseAus ? 'Hinweis-Blasen aus' : 'Hinweis-Blasen an'); },
  'farbe-wahl': (e) => { E.farbe = e.dataset.farbe; farbeSetzen(document.documentElement, E.farbe, E.ton); sichern(); fensterZu(); zeichne(); },
  ja: () => { const t = jaTun; jaTun = null; zuTun = null; fensterZu(); t?.(); },
  'fenster-zu': (e, ev) => { if (ev.target.closest('.fenster') && !ev.target.closest('[data-a="fenster-zu"]:not(.schleier)')) return; fensterZu(); },
  'toast-tun': () => { const t = toastTun; toastTun = null; $('toast').innerHTML = ''; t?.(); },
  'leiste-auf': () => { if (Date.now() - gezogen < 500) return; s.leisteAuf = true; leisteZeichnen(); },
  'leiste-zu': () => { s.leisteAuf = false; leisteZeichnen(); },
  'nach-oben': () => { s.leisteAuf = false; leisteZeichnen(); scrollTo({ top: 0, behavior: 'smooth' }); },
};
document.addEventListener('click', (ev) => {
  const e = ev.target.closest('[data-a]');
  if (s.leisteAuf && !ev.target.closest('#leiste')) { s.leisteAuf = false; leisteZeichnen(); }
  if (e && A[e.dataset.a]) A[e.dataset.a](e, ev);
  if (e && s.leisteAuf && e.closest('.fl-werk')) { s.leisteAuf = false; leisteZeichnen(); }   /* ein Werkzeug aus der Leiste gewählt: Leiste zu */
});
document.addEventListener('submit', (ev) => { ev.preventDefault(); const f = ev.target.dataset.form;
  if (f === 'rezept') formSpeichern(ev.target);
  else if (f === 'web-holen') webHolen();
  else if (f === 'schluessel') { const a = ev.target.dataset.anbieter, k = $('schl-feld').value.trim(), danach = ev.target.dataset.danach;
    (k ? S.setz(a, k) : S.weg(a)).then(() => { SK[a] = k; fensterZu(); zeichne(); melde(!k ? L('Schlüssel gelöscht', 'Key deleted') : formPasst(a, k) ? L('Schlüssel gespeichert', 'Key saved') : L('Gespeichert. Der Schlüssel sieht ungewohnt aus, bitte prüfen.', 'Saved. The key looks unusual, please check it.')); if (k && danach === 'scan') neuFenster('scan'); else if (k && danach === 'web') neuFenster('web'); else if (k && danach) A['ki-bild']({ dataset: { uid: danach } }); }).catch(() => melde(L('Der Schlüssel ließ sich nicht speichern.', 'The key could not be saved.'))); }
  else if (f === 'tresor') { const n = String(new FormData(ev.target).get('name') || '').trim(); tr.ablegen(schreibe(Z), 'benannt', n).then(() => { tresorFenster(); melde('Stand im Tresor gesichert'); }).catch(() => melde('Der Tresor ließ sich nicht beschreiben.')); }
  else if (f === 'ek-eigen') { const t = String(new FormData(ev.target).get('t') || '').trim(); if (!t) return; Z.einkauf = { ...Z.einkauf, eigene: [...Z.einkauf.eigene, { id: Date.now().toString(36), text: t }] }; sichern(); zeichne(); document.querySelector('[data-form="ek-eigen"] input')?.focus(); }
  else if (f === 'ordner-neu-zu') { const n = String(new FormData(ev.target).get('n') || '').trim(), uid = ev.target.dataset.uid; if (!n || !uid) return; const a = ordAnlegen(Z.ordner, n); Z.ordner = a.ordner; A['ordner-setzen']({ dataset: { uid, oid: a.id } }); }
  else if (f === 'kat-neu-zu') { const n = String(new FormData(ev.target).get('n') || '').trim(), uid = document.querySelector('[data-a="kat-setzen"]')?.dataset.uid; if (!n || !uid) return; const a = katAnlegen(Z.kategorien, n); Z.kategorien = a.kat; A['kat-setzen']({ dataset: { uid, ziel: a.id } }); }
  else if (f === 'laden') { const n = String(new FormData(ev.target).get('n') || '').trim(); if (!n) return; Z.einkauf = { ...Z.einkauf, laeden: { ...Z.einkauf.laeden, [n]: Z.einkauf.laeden[n] || [...(Z.einkauf.laeden[Z.einkauf.laden] || [])] }, laden: n }; sichern(); fensterZu(); zeichne(); }
});
/* Warengruppe verschieben: lange drücken (350 ms) oder mit der Maus ziehen; die Reihenfolge gilt für den gewählten Laden */
let gz = null;
const gzAn = () => { if (!gz || gz.weit) return; gz.weit = true; gz.gr.classList.add('zieht'); };
document.addEventListener('pointerdown', (ev) => { const h = ev.target.closest?.('.ek-gruppe h3, .kat-zeile .griff'); if (!h) return; const gr = h.closest('.ek-gruppe, .kat-zeile'); gz = { gr, art: gr.classList.contains('ord-zeile') ? 'ord' : gr.classList.contains('kat-zeile') ? 'kat' : 'ek', y: ev.clientY, weit: false, ziel: null, uhr: setTimeout(gzAn, 350) }; try { h.setPointerCapture(ev.pointerId); } catch { /* ohne */ } });
document.addEventListener('pointermove', (ev) => { if (!gz) return; if (!gz.weit && Math.abs(ev.clientY - gz.y) < 8) return; gzAn(); gz.gr.style.transform = `translateY(${ev.clientY - gz.y}px)`;
  const andere = [...document.querySelectorAll(gz.art === 'ek' ? '.ek-gruppe' : '.kat-zeile')].filter((g) => g !== gz.gr); andere.forEach((g) => g.classList.remove('ziel-vor', 'ziel-nach')); let ziel = null, vor = true;
  for (const g of andere) { const r = g.getBoundingClientRect(); ziel = g; if (ev.clientY < r.top + r.height / 2) { vor = true; break; } vor = false; }
  if (ziel) { ziel.classList.add(vor ? 'ziel-vor' : 'ziel-nach'); gz.ziel = { id: ziel.dataset.g || ziel.dataset.kid || ziel.dataset.oid, vor, nach: ziel.nextElementSibling === gz.gr ? ziel.nextElementSibling?.nextElementSibling : ziel.nextElementSibling }; } });
const gzLos = () => { if (!gz) return; const g = gz; gz = null; clearTimeout(g.uhr); if (!g.weit) return;
  if (g.ziel) { const vorId = g.ziel.vor ? g.ziel.id : (g.ziel.nach?.dataset.g || g.ziel.nach?.dataset.kid || g.ziel.nach?.dataset.oid || null);
    if (g.art === 'ord') Z.ordner = ordUmsortieren(Z.ordner, g.gr.dataset.oid, vorId);
    else if (g.art === 'kat') Z.kategorien = katUmsortieren(Z.rezepte, Z.kategorien, g.gr.dataset.kid, vorId);
    else Z.einkauf = { ...Z.einkauf, laeden: { ...Z.einkauf.laeden, [Z.einkauf.laden]: gruppeVerschieben(Z.einkauf.laeden[Z.einkauf.laden], g.gr.dataset.g, vorId) } };
    sichern(); }
  zeichne(); };
document.addEventListener('pointerup', gzLos); document.addEventListener('pointercancel', gzLos);
document.addEventListener('change', (ev) => { const o = ev.target.closest?.('.ord-name'); if (o) { Z.ordner = ordUmbenennen(Z.ordner, o.dataset.oid, o.value); sichern(); return; } const f = ev.target.closest?.('.kat-name'); if (!f) return; const id = f.dataset.kid, eig = Z.kategorien.eigene.some((c) => c.id === id);
  if (eig && f.value.trim()) Z.kategorien = { ...katUmbenennen(Z.kategorien, id, ''), eigene: Z.kategorien.eigene.map((c) => (c.id === id ? { ...c, de: f.value.trim() } : c)) }; else if (!eig) Z.kategorien = katUmbenennen(Z.kategorien, id, f.value);
  sichern(); });
document.addEventListener('input', (ev) => { if (ev.target.id === 'schriftregler') { E.schrift = schriftSetzen(document.documentElement, ev.target.value); $('schriftzahl').textContent = E.schrift + ' %'; sichern(); return; } if (ev.target.id === 'zs-zoom' && zs) { zs.z = +ev.target.value / 100; zsZeigen(); } });
document.addEventListener('input', (ev) => {
  if (ev.target.id !== 'suchfeld') return;
  s.frage = ev.target.value; $('start-rest').innerHTML = startRest(); $('suche-x').hidden = !s.frage; semPlanen();   // das Feld selbst bleibt stehen (Tastatur, Diktat)
});
document.addEventListener('keydown', (ev) => {
  if (s.ansicht !== 'kochen' || $('fensterort').innerHTML) return;
  if (ev.key === 'ArrowRight') A['k-schritt']({ dataset: { d: 1 } }); else if (ev.key === 'ArrowLeft') A['k-schritt']({ dataset: { d: -1 } }); else if (ev.key === 'Escape') A.zurueck();
});
let wischX = null;
document.addEventListener('touchstart', (ev) => { wischX = ev.target.closest?.('.koch') && !ev.target.closest('button') ? ev.touches[0].clientX : null; }, { passive: true });
document.addEventListener('touchend', (ev) => { if (wischX == null) return; const d = ev.changedTouches[0].clientX - wischX; wischX = null; if (Math.abs(d) > 60) A['k-schritt']({ dataset: { d: d < 0 ? 1 : -1 } }); }, { passive: true });
matchMedia('(min-width:1000px)').addEventListener('change', () => zeichne());
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && s.ansicht !== 'kochen') { if (document.querySelector('.vollbild')) A['voll-zu'](); else if ($('fensterort').innerHTML) fensterZu(); else if (s.leisteAuf) { s.leisteAuf = false; leisteZeichnen(); } } });
$('datei-sicherung').addEventListener('change', async (ev) => { const d = ev.target.files[0]; ev.target.value = ''; if (!d) return; try { einfuegen(lies(await W.mit('Datei wird eingelesen …', () => d.text()))); } catch (f) { melde(f.message || 'Die Datei konnte nicht gelesen werden.'); } });
$('datei-bild').addEventListener('change', async (ev) => { const d = ev.target.files[0]; ev.target.value = ''; if (!d) return; if (s.bildZiel) { const uid = s.bildZiel; s.bildZiel = null; try { const img = await W.mit('Foto wird aufbereitet …', () => bildAusDatei(d)); Z.rezepte = Z.rezepte.map((r) => (r.uid === uid ? { ...r, img, imgCrop: { x: 50, y: 50, scale: 1 } } : r)); sichern(); zeichne(); melde('Bild eingefügt'); } catch { melde('Das Bild konnte nicht gelesen werden.'); } return; }
  if (!s.form) return; try { s.form.img = await W.mit('Foto wird aufbereitet …', () => bildAusDatei(d)); zeichne(); } catch { melde('Das Bild konnte nicht gelesen werden.'); } });
for (const id of ['datei-scan', 'datei-kamera']) $(id).addEventListener('change', (ev) => { const d = [...ev.target.files]; ev.target.value = ''; if (d.length) scanGewaehlt(d); });
let altY = 0; addEventListener('scroll', () => { if (breit()) return; const y = scrollY; $('kopf').classList.toggle('weg', y > altY + 4 && y > 80 ? true : y < altY - 4 || y < 40 ? false : $('kopf').classList.contains('weg')); altY = y; }, { passive: true });

let installFrage = null;
addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); installFrage = ev; if (s.ansicht === 'werkstatt') zeichne(); });
addEventListener('appinstalled', () => { installFrage = null; if (s.ansicht === 'werkstatt') zeichne(); });

/* ---------- Start ---------- */
async function start() {
  ausgabe = await (await fetch('../ausgaben/rezeptbuch/ausgabe.json')).json();
  lager = speicher('KuechenKern-' + ausgabe.name); tr = tresor(lager);
  { const e = ausgabe.speicher.endung; S = schluesselLager(lager, { altNamen: { anthropic: ['claudeKey' + e], openai: ['openaiImgKey' + e, 'openaiKey' + e], mistral: ['mistralKey' + e] } }); await schlLaden(); }
  const da = await lager.lies().catch(() => null);
  if (da?.zustand) { Z = { ...leererZustand(), ...da.zustand, rezepte: (da.zustand.rezepte || []).map(normalisiere) }; E = { ...E, ...(da.einstellungen || {}) }; }
  else {
    E.farbe = FARBEN[ausgabe.farbe] ? ausgabe.farbe : 'braun';
    let alt = null; try { alt = ausAltemSpeicher(localStorage, ausgabe.speicher.endung); } catch { /* kein Zugriff */ }
    if (alt && alt.rezepte.length) { Z = { rezepte: alt.rezepte, menu: alt.menu, ordner: alt.ordner, kategorien: alt.kategorien }; await lager.schreibe({ fassung: 1, zustand: Z, einstellungen: E }); setTimeout(() => melde(`${alt.rezepte.length} Rezepte übernommen`), 300); }
    else if (!new URLSearchParams(location.search).has('leer')) await startRezepte();   /* …/neu/?leer beginnt ohne Startrezepte (für Proben und für alle, die leer anfangen wollen) */
  }
  ergaenze(); E.scan = { anbieter: 'anthropic', stufe: 'schnell', ...(E.scan || {}) };
  if (E.ton !== 'hell' && E.ton !== 'dunkel') E.ton = matchMedia('(prefers-color-scheme: dark)').matches ? 'dunkel' : 'hell';   /* „wie das Gerät“ gibt es als Wahl nicht mehr (Klaus 23.11.): beim ersten Start gilt einmal das Gerät, danach Sonne oder Mond */
  farbeSetzen(document.documentElement, E.farbe, E.ton); E.schrift = schriftSetzen(document.documentElement, E.schrift);
  hinweiseEinrichten(document, { aus: () => !!E.hinweiseAus });   // Hinweis-Blasen wie in der alten App (Kern), ausschaltbar
  const geteilt = new URLSearchParams(location.search), geteilteAdresse = webAdresse(geteilt.get('url') || '') || webAdresse(geteilt.get('text') || '');   /* über „Teilen“ an die installierte App geschickt */
  history.replaceState({ ansicht: 'start' }, '', location.pathname);
  zeichne(true);
  if (geteilteAdresse) { s.web = { adresse: geteilteAdresse, text: '', stand: '', seitentext: '' }; neuFenster('web'); }
  lager.dauerhaft();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});   // Offline-Vorrat; ohne ihn läuft die App genauso, nur nicht ohne Netz
  fetch('../beispiele/KATALOG.json').then((a) => a.json()).then((k) => { katalog = k; if (s.ansicht === 'start' || s.ansicht === 'werkstatt') zeichne(); }).catch(() => {});
}
start().catch((f) => { $('main').innerHTML = `<div class="leer"><p>Das Rezeptbuch konnte nicht starten: ${esc(f.message)}</p></div>`; });
