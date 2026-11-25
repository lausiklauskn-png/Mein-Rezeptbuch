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
import { alteBilder, bilderAnhaengen } from '../kern/speicher/alt-tresor.mjs';
import { speicher } from '../kern/speicher/speicher.mjs';
import { symbol as ic } from '../kern/oberflaeche/symbole.mjs';
import { FARBEN, TOENE, TOENE_EN, farbeSetzen, istDunkel } from '../kern/oberflaeche/farben.mjs';
import { schriftSetzen, schriftRegler, schriftWert } from '../kern/oberflaeche/schrift.mjs';
import { bildAusDatei } from '../kern/oberflaeche/bild.mjs';
import { zutatenFuerSchritt, zeitImSchritt } from '../kern/modell/kochen.mjs';
import { GERAETE, erkenne, geraetSvg } from '../kern/oberflaeche/geraete.mjs';
import { einkaufsliste, gruppenFolge, gruppeVerschieben, WARENGRUPPEN } from '../kern/modell/einkauf.mjs';
import { rezeptAusText, zutatAusZeile, zutatZeile } from '../kern/import/text.mjs';
import { diktat, diktatAus, diktatMoeglich } from '../kern/oberflaeche/diktat.mjs';
import { kiBild, gratisBild, KOSTEN } from '../kern/ki/bild.mjs';
import { hinweiseEinrichten } from '../kern/oberflaeche/hinweis.mjs';
import { installation, istApple, aktualisieren } from '../kern/oberflaeche/app-pflege.mjs';
import { wartenEinrichten, modellFortschritt, bytesMitAnteil } from '../kern/oberflaeche/warten.mjs';
import { tresor } from '../kern/speicher/tresor.mjs';
import { zusatz } from './zusatz.mjs';
import { zine } from './zine.mjs';
import { kreativbuch } from './kreativbuch.mjs';
import { notizbuch } from './notizbuch.mjs';
import { ladeBausteine, korpus as semKorpus, sucheBedeutung, passage as semPassage } from '../kern/suche/bedeutung.mjs';
import { woche, planen, entplanen, ausAltemMenu, tagIso } from '../kern/modell/plan.mjs';
import { text as spText, fuelle, sprache as sprWahl, kennt as sprKennt, sprachName, SPRACHEN, gebiet, ladeTabelle } from '../kern/oberflaeche/sprache.mjs';
import { schluessel as schluesselLager, ANBIETER, erklaerung as schlErklaerung, formPasst, pruefeSchluessel, schluesselAdresse } from '../kern/ki/schluessel.mjs';
import { STUFEN } from '../kern/ki/claude.mjs';
import { vorbereiten, erkennen, rezeptAusScan, wasGehtHinaus, wohinKurz, istPdf, istBild } from '../kern/import/scan.mjs';
import { vermerken, vermerkHtml, fundeZumEntscheiden, fundName, meldung as kiMeldung } from '../kern/ki/reinigung.mjs';
import { dateiPruefen, pruefHtml, kiAnweisungen } from '../kern/pruefung/datei.mjs';
import { webAdresse, holeSeite, ausEingefuegtem, ohneKi, fuerKi, mitKi, holeBild } from '../kern/import/web.mjs';
import { naehrwerte, naehrwerteAnRezept, naehrwertZeilen, rechtschreibung, rechtschreibungAnwenden, uebersetze, uebersetzungAnRezept, uebersetzungPasst, uebersetzeMit, rateSprache, alsUebersetzung, alsHauptfassung, SPRACH_CODES, kostenSchaetzung, wasGehtHinaus as helferHinaus } from '../kern/ki/helfer.mjs';
import { druckRezept, drucke } from '../kern/ausgabe/druck.mjs';
import { teilLink, ausTeilLink, qrSvg, passtInQr } from '../kern/teilen/qr.mjs';
import { rezeptIn } from '../kern/modell/einheiten.mjs';

const FASSUNG = '0.16.1';
const breit = () => matchMedia('(min-width:1000px)').matches;
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Sprache der Oberfläche (Kern: oberflaeche/sprache.mjs): Deutsch ist die Quelle, Englisch steht daneben, die übrigen sechs Sprachen kommen aus
   Tabellen mit dem deutschen Text als Schlüssel (kern/sprachen/<code>.mjs und neu/sprachen/<code>.mjs); fehlt ein Eintrag, steht Englisch da.
   E.sprache leer heißt „wie das Gerät“. L() bekommt nur wörtliche Texte, damit tools/sprach-schluessel.mjs sie auslesen kann;
   Paare, die der Kern oder die Ausgabe mitbringt (Farben, Geräte, Stufen), laufen über Lk(). */
const spr = () => sprWahl(E.sprache);
const L = (de, en) => spText(spr(), de, en);
const Lk = (de, en) => spText(spr(), de, en);
const geb = () => gebiet(spr());   // Gebietsschema für Datum und Zahlen
const jeSprache = (o) => (o && (o[spr()] || (spr() === 'de' ? '' : o.en) || o.de)) || '';   // Namen, die der Kern in allen acht Sprachen trägt (Kategorien, Warengruppen)
/* Tabellen der übrigen sechs Sprachen: geholt, sobald die Sprache gilt (beim Start und bei jedem Wechsel), eine aus dem Kern, eine aus der App.
   Fehlt eine, steht Englisch da. Der Start wartet höchstens `frist` ms darauf; kommt die Tabelle später, wird noch einmal gezeichnet. */
const tabGeholt = new Set();
function tabelleHolen(code = spr()) {
  if (code === 'de' || code === 'en' || tabGeholt.has(code)) return Promise.resolve(false);
  tabGeholt.add(code);
  return ladeTabelle(code, [new URL('../kern/sprachen/' + code + '.mjs', import.meta.url).href, new URL('./sprachen/' + code + '.mjs', import.meta.url).href]).then((da) => { if (!da) tabGeholt.delete(code); return da; }, () => { tabGeholt.delete(code); return false; });
}
async function spracheBereit(frist = 1200) {
  document.documentElement.lang = spr();
  let gewartet = false; const holen = tabelleHolen().then((da) => { if (da && gewartet) zeichne(); });
  await Promise.race([holen, new Promise((weiter) => setTimeout(weiter, frist))]); gewartet = true;
}

let ausgabe = null, lager = null;
let Z = leererZustand();                     // Rezepte, Wochenplan, Ordner, Kategorien
let E = { sprache: null, farbe: 'braun', leiste: { seite: 'r', pos: 64 }, zuletzt: null, ton: 'geraet', schrift: 100, railZu: false, sinn: false };   // Einstellungen dieses Geräts
const s = { ansicht: 'start', uid: null, frage: '', kat: 'alle', portion: {}, werkzeug: false, leisteAuf: false, form: null, nurDies: false, planTag: new Date(), bilder: { gross: false, filter: 'alle', wahl: new Set() }, bildZiel: null, rleiste: false, scan: null, web: null, scanMehr: false, werkAuf: new Set(), original: null, baum: { q: '', auf: new Set(), wahl: null } };
const LEER_EINKAUF = () => ({ posten: [], haken: {}, eigene: [], laeden: { Supermarkt: [] }, laden: 'Supermarkt' });
function ergaenze() { Z.einkauf = { ...LEER_EINKAUF(), ...(Z.einkauf || {}) }; if (!Z.einkauf.laeden[Z.einkauf.laden]) Z.einkauf.laden = Object.keys(Z.einkauf.laeden)[0] || 'Supermarkt'; if (!Z.einkauf.laeden[Z.einkauf.laden]) Z.einkauf.laeden[Z.einkauf.laden] = []; if (!Z.plan) Z.plan = ausAltemMenu(Z.menu, Z.rezepte); }

/* ---------- Speichern ---------- */
let schreibUhr = null;
function sichern() { if (Z.rezepte.some((r) => r && 'zine' in r)) ZI.nachziehen(); /* alte Food-Zine-Seiten am Rezept (bis 0.15, auch aus einer Sicherung) → Sammlung */ clearTimeout(schreibUhr); schreibUhr = setTimeout(() => lager.schreibe({ fassung: 1, zustand: Z, einstellungen: E }).catch(() => melde(L('Speichern ist fehlgeschlagen. Bitte eine Sicherung als Datei anlegen.', 'Saving failed. Please make a backup file.'))), 150); }
const rezept = (uid) => Z.rezepte.find((r) => r.uid === uid);
const zeig = (r) => (r && s.original !== r.uid ? sicht(r, spr()) : r);   // Anzeige: liegt eine Übersetzung in der App-Sprache am Rezept, gilt sie (außer „Original zeigen“); bearbeitet wird das Original
const katName = (c) => beschriftung(c, spr(), Z.kategorien);
/* Wortsuche über das, was dasteht: das Original und, wenn eine Übersetzung gezeigt wird, auch sie („potato“ findet die „Potato soup“). */
const finde = (frage) => { const da = new Set([...suche(Z.rezepte, frage, Z.kategorien, spr()), ...suche(Z.rezepte.map(zeig), frage, Z.kategorien, spr())].map((r) => r.uid)); return Z.rezepte.filter((r) => da.has(r.uid)); };
const minText = (m) => fuelle(L('{0} Min', '{0} min'), m);
const portionenText = (n) => (n === 1 ? L('1 Portion', '1 serving') : fuelle(L('{0} Portionen', '{0} servings'), n));
/* Sticker einer Kategorie (Klaus 23.11.): ein kleines Foto aus der Kategorie, sonst das Zeichen. Der Name steht immer daneben. */
const katSticker = (c) => { const b = katBild(Z.rezepte, Z.kategorien, c.id); return b ? `<img class="sticker" src="${esc(b.img)}" alt="" loading="lazy">` : katZeichen(c); };
const katZeichen = (c) => { const e = Z.kategorien.namen?.[c.id]?.emoji || c.emoji || c.emojiAlt; /* Vorgabe: das Zeichen aus der alten App, frei änderbar */ return e ? `<span aria-hidden="true">${esc(e)}</span>` : ic(c.art === 'ohne' ? 'frage' : c.art === 'unbekannt' ? 'paket' : 'karte'); };

/* ---------- Meldungen ---------- */
let toastUhr = null;
function melde(text, knopf, tun) {
  const t = $('toast'); t.innerHTML = `<span>${esc(text)}</span>` + (knopf ? `<button data-a="toast-tun">${esc(knopf)}</button>` : '');   /* der Text kürzt sich mit „…“, der Knopf bleibt immer ganz im Bild */
  t.title = text;
  toastTun = tun || null; clearTimeout(toastUhr); toastUhr = setTimeout(() => { t.innerHTML = ''; toastTun = null; }, knopf ? 7000 : 3500);
}
let toastTun = null;

/* ---------- Navigation (mit Zurück-Taste) ---------- */
function geh(ansicht, extra = {}, ersetzen = false) {
  diktatAus();
  if (ansicht === 'form' && s.ansicht !== 'form') s.formVon = s.ansicht;   /* woher das Formular kam: am breiten Schirm bleibt diese Liste links stehen */
  Object.assign(s, { ansicht, leisteAuf: false, rleiste: false, abschnitt: null, ...extra });   /* jede Ansicht beginnt mit eingeklappten Werkzeugen */
  if (ansicht === 'form' && s.ausNotiz && s.form?.neu) { s.form.notiz = s.ausNotiz; s.ausNotiz = null; }   /* aus dem Notizbuch (Foto lesen, Vom Teller): die Notiz reist mit */
  if (ansicht === 'kochen') { $('toast').innerHTML = ''; toastTun = null; }   // nichts über den Knöpfen der Kochansicht
  const st = { ansicht, uid: s.uid };
  if (ersetzen) history.replaceState(st, ''); else history.pushState(st, '');
  zeichne(true); scrollTo(0, 0); if (ansicht === 'form') document.querySelector('.md-detail')?.scrollTo(0, 0);
}
let nachZurueck = null;   // was nach einem Schritt zurück noch geschehen soll (Vollbild → Bild-Blatt)
addEventListener('popstate', (e) => { const st = e.state || { ansicht: 'start' }; Object.assign(s, { ansicht: st.ansicht, uid: st.uid || null, leisteAuf: false, form: null }); fensterZu(); zeichne(st.ansicht !== 'rezept' || !breit()); if (nachZurueck) { const f = nachZurueck; nachZurueck = null; f(); } });

const mik = (feld) => (diktatMoeglich() ? `<button type="button" class="mik" data-a="diktat" data-feld="${feld}" aria-label="${L('Sprechen statt tippen', 'Speak instead of typing')}" aria-pressed="false">${ic('mikro')}</button>` : '');
/* ---------- Kopf ---------- */
const INST = installation(() => { if ($('kopf') && ausgabe) kopfZeichnen(); if (s.ansicht === 'werkstatt' && ausgabe) zeichne(); });
/* Klaus 24.11.: oben ein Knopf „Installieren“, weg nach der Installation; die Versionsnummer oben holt beim Tippen die neueste Fassung. */
const kopfInstall = () => (INST.zeigen() ? `<button class="rund" data-a="installieren" aria-label="${L('Als App installieren', 'Install as an app')}" title="${L('Als App installieren', 'Install as an app')}">${ic('laden')}</button>` : '');
const kopfFassung = () => `<button class="ver" data-a="aktualisieren" title="${L('Tippen: App aktualisieren', 'Tap: update the app')}" aria-label="${fuelle(L('Fassung {0} – tippen zum Aktualisieren', 'Version {0} – tap to update'), FASSUNG)}">${FASSUNG}</button>`;
function kopfZeichnen() {
  const k = $('kopf');
  k.classList.toggle('zu', !!E.railZu);
  if (breit()) {
    const n = (zu, i, t) => `<button class="rail-n" data-a="geh" data-zu="${zu}" ${(zu === 'start' ? ['start', 'rezept', 'kochen'].includes(s.ansicht) : zu === 'kreativ' ? ['kreativ', 'zine'].includes(s.ansicht) : s.ansicht === zu) ? 'aria-current="page"' : ''} title="${t}">${ic(i)}<span class="t">${t}</span></button>`;
    k.innerHTML = `<div class="rail-oben"><img class="logo" src="${esc(seitenZeichen())}" alt="" width="30" height="30"><span class="name t">${esc(ausgabe.titel)}${kopfFassung()}</span>${kopfInstall()}<button class="rail-klapp" data-a="rail" aria-label="${E.railZu ? L('Leiste ausklappen', 'Expand bar') : L('Leiste einklappen', 'Collapse bar')}">${ic((E.railZu ? 'rechts' : 'links') === 'links' ? (E.railSeite === 'r' ? 'rechts' : 'links') : (E.railSeite === 'r' ? 'links' : 'rechts'))}</button><button class="rail-griff" data-a="rail-seite" aria-label="${L('Leiste verschieben: lange drücken und zur anderen Seite ziehen; ein Tipp wechselt die Seite', 'Move the bar: long-press and drag to the other side; a tap switches sides')}" title="${L('Leiste verschieben', 'Move the bar')}">${ic('pfeile')}</button></div>
     <button class="knopf akz rail-neu" data-a="neu" aria-label="${L('Neues Rezept', 'New recipe')}">${ic('plus')}<span class="t">${L('Neues Rezept', 'New recipe')}</span></button>${NB.kopfKnopf(true)}${n('start', 'buch', L('Rezepte', 'Recipes'))}${n('baum', 'ordner', L('Ordner', 'Folders'))}${n('plan', 'plan', L('Planer', 'Planner'))}${n('einkauf', 'einkauf', L('Einkauf', 'Shopping')).replace('</button>', (ekOffen() ? `<span class="zahl">${ekOffen()}</span>` : '') + '</button>')}${n('kreativ', 'zine', L('Kreativbuch', 'Creative book'))}${n('werkstatt', 'einst', L('Einstellungen', 'Settings'))}
     <button class="rail-n" data-a="farbe" title="${L('Farbe', 'Colour')}"><span class="farbknopf"></span><span class="t">${L('Farbe', 'Colour')}</span></button>`;
    return;
  }
  /* Klaus 23.11.: am schmalen Schirm bleiben oben Suche, Farbpalette und das Plus; Schrift, Hell/Dunkel, Sichern und die Einstellungen
     stehen in der fliegenden Leiste. Kein Pfeil mehr, nichts zum Aufklappen. */
  k.innerHTML = `<img class="logo" src="${esc(seitenZeichen())}" alt="" width="30" height="30"><span class="name">${esc(ausgabe.titel)}${kopfFassung()}</span>${kopfInstall()}<button class="rund" data-a="zur-suche" aria-label="${L('Suchen', 'Search')}" title="${L('Suchen', 'Search')}">${ic('suche')}</button><button class="farbknopf" data-a="farbe" aria-label="${L('Farbpalette', 'Colour palette')}" title="${L('Farbe', 'Colour')}"></button>${NB.kopfKnopf()}<button class="rund akz" data-a="neu" aria-label="${L('Neues Rezept', 'New recipe')}" title="${L('Neues Rezept', 'New recipe')}">${ic('plus')}</button>`;
}

/* ---------- Start ---------- */
/** Bildausschnitt (r.imgCrop wie in der alten App: x, y in Prozent, scale) als Stil. */
const zahl = (v, sonst) => (Number.isFinite(+v) && v !== '' && v != null ? +v : sonst);   // 0 ist ein gültiger Wert (Lage oben/links)
const ausschnitt = (r) => { const c = r.imgCrop; if (!c || (c.x === 50 && c.y === 50 && (c.scale || 1) === 1)) return ''; const x = zahl(c.x, 50), y = zahl(c.y, 50), z = Math.min(3, Math.max(1, zahl(c.scale, 1))); return `style="object-position:${x}% ${y}%;${z > 1 ? `transform:scale(${z});transform-origin:${x}% ${y}%` : ''}"`; };
const bildOder = (r, gr = '') => (r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy" ${ausschnitt(r)} ${gr}>` : ic('karte'));
/* Klaus 23.11.: ein Kochbuch ist ein Bilderbuch. Unter dem Bild steht nur der Name; die Kategorie wird nicht auf jeder Karte wiederholt
   (sie steht in der Leiste und über dem Abschnitt), nur in gemischten Trefferlisten (mitKat). */
const karte = (r0, c, mitKat = false, r = zeig(r0)) => { const unter = [r.prepTime ? ic('uhr') + esc(minText(r.prepTime)) : '', mitKat && c ? esc(katName(c)) : ''].filter(Boolean).join(' · '); return `<button class="karte" data-a="rezept" data-uid="${esc(r.uid)}"><span class="bild">${bildOder(r)}</span><span class="text"><strong>${esc(r.name)}</strong>${unter ? `<small>${unter}</small>` : ''}</span></button>`; };

function startHtml() {
  const heute = new Date().toLocaleDateString(geb(), { weekday: 'long', day: 'numeric', month: 'long' });
  let h = `<p class="gruss">${esc(ausgabe.begruessung?.[spr()] || L('Was kochen wir heute?', 'What are we cooking today?'))}<small class="datum">${esc(heute)}</small></p>
   <form class="suche" data-form="suche" role="search">${ic('suche')}<input id="suchfeld" name="q" value="${esc(s.frage)}" placeholder="${L('Rezept, Zutat oder Kategorie …', 'Recipe, ingredient or category …')}" aria-label="${L('Suchen', 'Search')}" autocomplete="off" enterkeyhint="search">${mik('#suchfeld')}<button type="button" class="sinn" data-a="sinn" aria-pressed="${!!E.sinn}" aria-label="${L('Sinn-Suche: auch nach Bedeutung suchen', 'Meaning search: also search by meaning')}" title="${L('Sinn-Suche', 'Meaning search')}">${ic('funken')}</button><button type="button" id="suche-x" data-a="suche-leer" aria-label="${L('Eingabe löschen', 'Clear input')}" ${s.frage ? '' : 'hidden'}>${ic('x')}</button></form>`;
  return h + `<div id="start-rest">${startRest()}</div>`;
}
function startRest() {
  const alle = Z.rezepte.filter(istInhalt), kats = alleKategorien(Z.rezepte, Z.kategorien).filter((c) => anzahl(Z.rezepte, c.id) > 0);
  const katVon = new Map(kats.map((c) => [c.id, c])), ordner = ordUebersicht(Z.rezepte, Z.ordner).filter((o) => o.anzahl > 0);
  if (s.kat.startsWith('ordner:') && !ordner.some((o) => 'ordner:' + o.id === s.kat)) s.kat = 'alle';   /* der Ordner ist leer oder weg */
  let h = '';
  if (!alle.length) return leerHtml();
  if (s.frage.trim()) {
    const tr = finde(s.frage);
    const sinn = sinnTreffer(tr);
    return `<div class="ueber"><h2>${L('Treffer', 'Results')}</h2><small>${fuelle(L('{0} von {1}', '{0} of {1}'), tr.length, alle.length)}</small></div>` + (tr.length ? `<div class="gitter">${tr.map((r) => karte(r, katVon.get(katVonRezept(r)), true)).join('')}</div>` : sinn.length ? '' : `<div class="leer"><p>${fuelle(L('Nichts gefunden für „{0}“.', 'Nothing found for “{0}”.'), esc(s.frage))}</p></div>`)
      + (E.sinn ? `<p class="sinn-status" id="sinn-status" role="status">${esc(sem.status)}</p>` : '') + ZU.sinnBlock(sinn, (r) => karte(r, katVon.get(katVonRezept(r)), true));
  }
  const erstesBild = (id) => katBild(Z.rezepte, Z.kategorien, id);
  h += `<div class="fotokat" role="group" aria-label="${L('Kategorien', 'Categories')}">` + [{ id: 'alle' }, ...kats].map((c) => {
    const b = erstesBild(c.id), n = c.id === 'alle' ? alle.length : anzahl(Z.rezepte, c.id);
    return `<button data-a="kat" data-kat="${esc(c.id)}" aria-pressed="${s.kat === c.id}"><span class="bild">${b ? `<img src="${esc(b.img)}" alt="" loading="lazy">` : (c.id === 'alle' ? ic('buch') : katZeichen(c))}</span><span>${esc(c.id === 'alle' ? L('Alle', 'All') : katName(c))} <small>${n}</small></span></button>`;
  }).join('') + ordner.map((o) => `<button class="ord" data-a="kat" data-kat="ordner:${esc(o.id)}" aria-pressed="${s.kat === 'ordner:' + o.id}" title="${L('Ordner', 'Folder')}"><span class="bild">${o.bild ? `<img src="${esc(o.bild)}" alt="" loading="lazy">` : ''}<i class="ord-marke">${o.ico ? esc(o.ico) : ic('ordner')}</i></span><span>${esc(ordTitel(o))} <small>${o.anzahl}</small></span></button>`).join('') + `</div>`;
  if (s.kat === 'alle') {
    const trink = new Set(['drk', 'smooth', 'mock', 'afckt', 'limo', 'tee', 'ckt', 'bowle', 'sirup']);
    const z = rezept(E.zuletzt) || alle.find((r) => r.img && !trink.has(r.cat)) || alle.find((r) => r.img) || alle[0];
    h += `${E.zuletzt && rezept(E.zuletzt) ? `<div class="ueber held-ueber"><h2>${L('Weiterkochen', 'Continue cooking')}</h2></div>` : ''}
     <button class="held" data-a="rezept" data-uid="${esc(z.uid)}">${bildOder(z)}<span class="verlauf"><strong>${esc(z.name)}</strong><span class="meta">${z.prepTime ? `<span>${ic('uhr')}${esc(minText(z.prepTime))}</span>` : ''}<span>${ic('leute')}${portionenText(z.servings)}</span></span></span></button>`;
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
const beispielText = () => { const p = katalog?.pakete?.find((x) => x.id === ausgabe.beispiele[0]); return p ? fuelle(L('{0} Rezepte, {1} MB', '{0} recipes, {1} MB'), p.anzahl, (p.bytes / 1e6).toFixed(0)) : L('aus dem Netz', 'from the net'); };

/* ---------- Sinn-Suche: Modul 03 und 04 der bisherigen App, erst beim Einschalten geladen ---------- */
const sem = { ids: [], fuer: '', status: '', uhr: null, laeuft: false, korpus: null, sig: '' };
/* Treffer der Sinn-Suche zur jetzigen Frage, ohne die, die schon nach Wort gefunden sind. */
/* Klaus 24.11.: das Suchfeld ist zuerst eine Wortsuche. Nach Bedeutung wird nur gesucht, wenn die Wortsuche nichts findet. */
function sinnTreffer(wort = finde(s.frage)) { return E.sinn && !wort.length && sem.fuer === s.frage.trim().toLowerCase() ? sem.ids.map(rezept).filter((r) => r && istInhalt(r)) : []; }
const semStatus = (t) => { sem.status = t; const el = $('sinn-status'); if (el) el.textContent = t; };
/* Ladebalken (Klaus 23.11.): das Sprachmodell (beim ersten Mal rund 120 MB) und das Einlesen der Rezepte zeigen ihren Stand. */
const W = wartenEinrichten(document);
function semBereit() {
  return W.mit(L('Sinn-Suche: Sprachmodell wird geladen …', 'Meaning search: loading the language model …'), async (w) => {
    const ab = modellFortschritt((a, g, t) => { w.anteil(a); if (t) w.text(fuelle(L('Sprachmodell wird geladen: {0} von {1} MB', 'Loading the language model: {0} of {1} MB'), g, t)); });
    try { await ladeBausteine('../sbkim/'); await window.SbkimEmbedding.init(); } finally { ab(); }
    w.anteil(null); w.text(L('Sinn-Suche wird vorbereitet …', 'Preparing meaning search …'));
    const rs = Z.rezepte.filter(istInhalt), namen = new Map(alleKategorien(Z.rezepte, Z.kategorien).map((c) => [c.id, katName(c)])), sig = rs.map((r) => r.uid + '\u0001' + semPassage(r, namen.get(katVonRezept(r)) || '')).join('\u0002');   /* ändert sich ein Rezept (oder kommt eine andere Sammlung herein), wird neu gerechnet; unveränderte Rezepte behält der Kern */
    if (!sem.korpus || sem.sig !== sig) { sem.korpus = await semKorpus(rs, (r) => namen.get(katVonRezept(r)) || '', { einbetten: (t) => window.SbkimEmbedding.embedPassage(t), fortschritt: (i, n) => { const t = fuelle(L('Sinn-Suche wird vorbereitet: {0} von {1} Rezepten', 'Preparing meaning search: {0} of {1} recipes'), i, n); semStatus(t); w.text(t); w.anteil(n ? i / n : null); } }); sem.sig = sig; }
    return sem.korpus;
  });
}
function semPlanen() { clearTimeout(sem.uhr); if (!E.sinn) return; const f = s.frage.trim().toLowerCase(); if (!f) { sem.ids = []; sem.fuer = ''; return; }
  if (finde(s.frage).length) { sem.ids = []; sem.fuer = ''; semStatus(''); return; }   /* die Wortsuche hat etwas gefunden: keine Bedeutungssuche */
  sem.uhr = setTimeout(() => semLauf(f), 350); }
async function semLauf(f) {
  if (!E.sinn) return; if (sem.laeuft) { sem.uhr = setTimeout(() => semLauf(f), 300); return; }
  sem.laeuft = true; semStatus(sem.korpus ? L('sucht nach Bedeutung …', 'searching by meaning …') : L('Sinn-Suche wird vorbereitet (beim ersten Mal lädt das Sprachmodell) …', 'Preparing meaning search (the language model loads the first time) …'));
  try {
    const c = await semBereit(); if (s.frage.trim().toLowerCase() !== f) return;   // es wurde schon weitergetippt
    sem.ids = await sucheBedeutung(window.SbkimMatch, f, c); sem.fuer = f; if (s.frage.trim().toLowerCase() !== f) return;
    if (finde(s.frage).length) { sem.ids = []; sem.fuer = ''; semStatus(''); return; }   /* inzwischen findet die Wortsuche etwas */
    const dazu = sem.ids.filter((u) => rezept(u)).length;
    sem.status = dazu ? fuelle(L('Nach Wort nichts gefunden · {0} nach Bedeutung', 'Nothing found by word · {0} by meaning'), dazu) : L('Auch nach Bedeutung nichts gefunden', 'Nothing found by meaning either');
    if (s.ansicht === 'start' && $('start-rest')) $('start-rest').innerHTML = startRest();
  } catch (f) { console.warn('Sinn-Suche:', f?.message || f); semStatus(L('Die Sinn-Suche ist gerade nicht verfügbar. Die Wortsuche läuft weiter.', 'Meaning search is not available right now. Word search keeps working.'));
 } finally { sem.laeuft = false; }
}

/* ---------- Rezept ---------- */
/* Einheiten: '' = wie notiert, sonst 'metrisch' oder 'us' (Kern modell/einheiten.mjs). Umgerechnet wird nur die Anzeige. */
const inEinheit = (r) => (r && (E.einheiten === 'us' || E.einheiten === 'metrisch') ? rezeptIn(r, E.einheiten, { sprache: spr() }) : r);
const einhName = () => ({ us: 'US', metrisch: L('metrisch', 'metric') }[E.einheiten] || L('wie notiert', 'as written'));
/* Bewertung am Rezept: fünf Sterne zum Antippen; derselbe Stern noch einmal nimmt die Bewertung zurück. */
function sterneHtml(r) {
  const n = Math.round(Number(r.rating?.stars) || 0);
  return `<span class="sterne" role="group" aria-label="${fuelle(L('Bewertung: {0} von 5', 'Rating: {0} of 5'), n)}">${[1, 2, 3, 4, 5].map((i) => `<button data-a="stern" data-n="${i}" class="${i <= n ? 'an' : ''}" aria-pressed="${i === n}" aria-label="${i === 1 ? L('1 Stern', '1 star') : fuelle(L('{0} Sterne', '{0} stars'), i)}">${ic('stern')}</button>`).join('')}</span>`;
}
/* Das Zeichen dieser Seite (index.html: das neue, muttis.html: ihr eigenes) – aus dem <link rel=icon> der Seite, nicht fest verdrahtet. */
const seitenZeichen = () => document.querySelector('link[rel=icon]')?.getAttribute('href') || '../icons/rezeptbuch-neu-192.png?v=1';
function rezeptHtml() {
  const roh = rezept(s.uid), r = inEinheit(zeig(roh)); if (!r) return `<div class="leer"><p>${L('Dieses Rezept gibt es nicht mehr.', 'This recipe no longer exists.')}</p><button class="knopf" data-a="geh" data-zu="start">${L('Zur Startseite', 'To the start page')}</button></div>`;
  const c = alleKategorien(Z.rezepte, Z.kategorien).find((x) => x.id === katVonRezept(r));
  const n = s.portion[r.uid] || r.servings, f = n / r.servings;
  /* Liegt eine Fassung in der Sprache der Oberfläche am Rezept, steht sie da; ein kleiner Umschalter in der Meta-Zeile zeigt das Original. */
  const uebAn = s.original !== roh.uid, uebTipp = uebAn ? L('Übersetzung · Tipp zeigt das Original', 'Translation · tap shows the original') : L('Original · Tipp zeigt die Übersetzung', 'Original · tap shows the translation');
  const uebUm = sicht(roh, spr()) !== roh ? `<button class="chip ueb-um" data-a="original" aria-pressed="${uebAn}" aria-label="${uebTipp}" title="${uebTipp}">${ic('welt')}${spr().toUpperCase()}</button>` : '';
  const wk = (akt, i, t, kl = '') => `<button class="chip ${kl}" data-a="${akt}" aria-label="${esc(t)}" title="${esc(t)}">${ic(i)}<span class="wk-t">${esc(t)}</span></button>`;   /* am Handy nur das Symbol (Klaus 23.11.: „kein Button-Kino“), am Monitor neben dem Bild mit Wort */
  const winkel = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  return `<div class="rezept-held" data-a="held" role="button" tabindex="0" aria-label="${r.img ? L('Bild groß ansehen', 'View picture large') : L('Bild einfügen', 'Add picture')}">${r.img ? `<img src="${esc(r.img)}" alt="${esc(r.name)}" ${ausschnitt(r)}>` : ic('karte')}
    ${vollKnopf()}<div class="verlauf"><div class="tzeile">${s.rleiste ? `<div class="rwerk" role="toolbar">${wk('einordnen', 'ordner', L('Einordnen: Kategorie und Ordner', 'Organise: category and folder'))}${wk('bild-blatt', 'bild', L('Bild', 'Picture'))}${wk('uebersetzen', 'welt', L('Übersetzen', 'Translate'))}${wk('rmenue', 'mehr', L('Mehr: Drucken, Teilen, Nährwerte …', 'More: print, share, nutrition …'))}${wk('bearbeiten', 'stift', L('Bearbeiten', 'Edit'))}${wk('loeschen', 'muell', L('Rezept löschen', 'Delete recipe'), 'rot')}</div>` : ''}<button class="wk-pf zur" data-a="zurueck" aria-label="${L('Zurück', 'Back')}">${winkel('M15 5l-7 7 7 7')}</button><h1>${esc(r.name)}</h1><button class="wk-pf" data-a="rleiste" aria-expanded="${s.rleiste}" aria-label="${L('Werkzeuge für Rezept und Bild', 'Tools for recipe and picture')}">${winkel(s.rleiste ? 'M5 9l7 7 7-7' : 'M5 15l7-7 7 7')}</button></div><div class="meta">${r.prepTime ? `<span>${ic('uhr')}${esc(minText(r.prepTime))}</span>` : ''}<span>${ic('karte')}${esc(c ? katName(c) : '')}</span>${ordnerVonRezept(r, Z.ordner) ? `<span class="im-ordner">${ic('ordner')}${esc(ordTitel(findeOrdner(Z.ordner, r.folder)))}</span>` : ''}${sterneHtml(roh)}${uebUm}</div></div></div>
   <div class="bogen"><div class="zweispalt"><div>
    ${r.steps.length ? `<div class="reihe"><button class="knopf akz" data-a="kochen" style="flex:1.3">${ic('koch')}${L('Kochen', 'Cook')}</button><button class="knopf" data-a="auf-liste" style="flex:1">${ic('einkauf')}${L('Einkaufen', 'Shop')}</button><button class="knopf" data-a="planen" aria-label="${L('In den Wochenplan', 'Into the week plan')}">${ic('plan')}</button></div>` : `<div class="reihe"><button class="knopf" data-a="auf-liste">${ic('einkauf')}${L('Einkaufen', 'Shop')}</button><button class="knopf" data-a="planen">${ic('plan')}${L('Planen', 'Plan')}</button></div>`}
    <div class="portion"><span>${L('Portionen', 'Servings')}</span><span class="st"><button data-a="portion" data-d="-1" aria-label="${L('Weniger', 'Fewer')}">${ic('minus')}</button><b id="portionen">${n}</b><button data-a="portion" data-d="1" aria-label="${L('Mehr', 'More')}">${ic('plus')}</button></span></div>
    ${abschnittKopf('ings', L('Zutaten', 'Ingredients'))}${s.abschnitt?.uid === roh.uid && s.abschnitt.teil === 'ings' ? abschnittForm(roh, 'ings') : `<ul class="zut">${r.ings.map((z) => `<li><b>${esc([skaliere(z.amt, f), z.unit].filter(Boolean).join(' '))}</b><span>${esc(z.name)}${z.note ? `<small>${esc(z.note)}</small>` : ''}</span></li>`).join('')}</ul>`}${naehrHtml(r, n)}${geraeteVon(r).length ? `<h2 class="h">${L('Geräte', 'Equipment')}</h2><div class="gr-liste">${geraeteVon(r).map((g) => `<span class="gr-chip">${geraetSvg(g)}${esc(geraetName(g))}</span>`).join('')}</div>` : ''}</div>
    <div>${abschnittKopf('steps', L('Zubereitung', 'Method'))}${s.abschnitt?.uid === roh.uid && s.abschnitt.teil === 'steps' ? abschnittForm(roh, 'steps') : `<ol class="schritte">${r.steps.map((x) => `<li><span>${esc(x.txt)}${x.note ? `<small>${esc(x.note)}</small>` : ''}</span></li>`).join('')}</ol>`}
    ${r.source ? `<p class="quelle">${fuelle(L('Quelle: {0}', 'Source: {0}'), esc(r.source))}</p>` : ''}${vermerkHtml(r, spr())}</div></div></div>`;
}

/* ---------- Abschnitt an Ort und Stelle bearbeiten (Klaus 25.11.): der Stift an „Zutaten“ und „Zubereitung“ macht genau diesen Teil zum Textfeld.
   Bearbeitet wird, was dasteht: die Übersetzung, wenn sie gezeigt wird (dann fragt das Speichern, ob sie die Hauptfassung wird). Die Nummern
   der Schritte stehen nur als Anzeige links, nicht im Text. ---------- */
const uebGezeigt = (roh) => (roh && s.original !== roh.uid && sicht(roh, spr()) !== roh ? spr() : '');
const abschnittKopf = (teil, titel) => `<h2 class="h ab-kopf">${esc(titel)}<button class="ab-stift" data-a="abschnitt" data-t="${teil}" aria-pressed="${s.abschnitt?.uid === s.uid && s.abschnitt?.teil === teil}" aria-label="${esc(fuelle(L('{0} bearbeiten', 'Edit {0}'), titel))}" title="${esc(fuelle(L('{0} bearbeiten', 'Edit {0}'), titel))}">${ic('stift')}</button></h2>`;
const abSchrittFeld = (i, txt) => `<li><span class="ab-nr" aria-hidden="true">${i + 1}</span><textarea class="feld" name="s" rows="3" aria-label="${esc(fuelle(L('Schritt {0}', 'Step {0}'), i + 1))}">${esc(txt)}</textarea></li>`;
function abschnittForm(roh, teil) {
  const ueb = uebGezeigt(roh), z = ueb ? sicht(roh, ueb) : roh;
  const hin = ueb ? `<small class="ab-hin">${esc(fuelle(L('Du bearbeitest die Übersetzung ({0}).', 'You are editing the translation ({0}).'), sprachName(ueb)))}</small>` : '';
  const knoepfe = `<div class="reihe"><button class="knopf akz" type="submit">${ic('haken')}${L('Speichern', 'Save')}</button><button class="knopf" type="button" data-a="ab-zu">${L('Abbrechen', 'Cancel')}</button></div>`;
  if (teil === 'ings') return `<form class="abschnitt" data-form="abschnitt" data-t="ings">${hin}<textarea class="feld" name="ings" id="ab-ings" rows="${Math.max(4, z.ings.length + 1)}" aria-label="${L('Zutaten, eine je Zeile', 'Ingredients, one per line')}">${esc(z.ings.map(zutatZeile).join('\n'))}</textarea>${knoepfe}</form>`;
  return `<form class="abschnitt" data-form="abschnitt" data-t="steps">${hin}<ol class="ab-schritte">${(z.steps.length ? z.steps : [{ txt: '' }]).map((x, i) => abSchrittFeld(i, x.txt)).join('')}</ol><button class="knopf" type="button" data-a="ab-schritt-dazu">${ic('plus')}${L('Schritt', 'Step')}</button>${knoepfe}</form>`;
}
function abschnittSpeichern(form) {
  const roh = rezept(s.abschnitt?.uid); if (!roh) return;
  const teil = form.dataset.t, d = new FormData(form), ueb = uebGezeigt(roh), basis = ueb ? sicht(roh, ueb) : roh;
  const neuTeil = teil === 'ings' ? String(d.get('ings') || '').split('\n').filter((t) => t.trim()).map(zutatAusZeile) : schritteMitNotiz(d.getAll('s').map(String).map((t) => t.trim()).filter(Boolean), roh.steps);
  const neu = normalisiere({ ...basis, [teil]: neuTeil });
  const fertig = () => { s.abschnitt = null; zeichne(); melde(L('Gespeichert', 'Saved')); };
  if (JSON.stringify((neu[teil] || []).map(teil === 'ings' ? zutatZeile : (x) => x.txt)) === JSON.stringify((basis[teil] || []).map(teil === 'ings' ? zutatZeile : (x) => x.txt))) { s.abschnitt = null; zeichne(); return; }   /* nichts geändert */
  if (!ueb) { rezeptSetzen(neu); fertig(); return; }
  fassungFrage(roh, neu, ueb, fertig);
}
/* ---------- Eine bearbeitete Übersetzung speichern: einmal fragen, ob sie die Hauptfassung wird (Kern: alsHauptfassung / alsUebersetzung) ---------- */
const rezeptDirekt = (r) => { Z.rezepte = Z.rezepte.map((x) => (x.uid === r.uid ? { ...r, modified: new Date().toISOString() } : x)); sichern(); };   /* ohne das Wegwerfen alter Übersetzungen: hier bleibt jede Fassung */
let fassungOffen = null, quelleFertig = null;
function fassungFrage(alt, neu, ziel, fertig) {
  fassungOffen = { uid: alt.uid, neu, ziel, fertig };
  fenster(`<h2>${L('Als Hauptfassung übernehmen?', 'Use as the main version?')}</h2><p>${esc(fuelle(L('Du hast die Übersetzung ({0}) bearbeitet. Als Hauptfassung wird sie der Text des Rezepts; das bisherige Original bleibt als Übersetzung erhalten.', 'You edited the translation ({0}). As the main version it becomes the text of the recipe; the previous original stays as a translation.'), sprachName(ziel)))}</p>
   <div class="reihe" id="fassung-wahl"><button class="knopf akz" data-a="fassung-haupt">${L('Ja, als Hauptfassung', 'Yes, as the main version')}</button><button class="knopf" data-a="fassung-ueb">${L('Nein, nur die Übersetzung', 'No, only the translation')}</button><button class="knopf" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`);
}
/* Sprache des bisherigen Originals: r.sprache, sonst geraten aus dem Text (Kern: rateSprache); ist beides nicht eindeutig, wird gefragt. */
function quellSprache(r, ziel) {
  const q = [r.sprache, rateSprache(r)].find((c) => SPRACH_CODES.includes(c) && c !== ziel);
  if (q) return Promise.resolve(q);
  return new Promise((fertig) => {
    fenster(`<h2>${L('Sprache des Originals', 'Language of the original')}</h2><p>${esc(L('In welcher Sprache ist das bisherige Original geschrieben?', 'In which language is the previous original written?'))}</p><div class="tagwahl" id="quelle-wahl">${SPRACHEN.filter(([c]) => c !== ziel).map(([c, n]) => `<button class="chip" data-a="quelle-wahl" data-s="${c}" lang="${c}">${esc(n)}</button>`).join('')}</div>`);
    quelleFertig = fertig; zuTun = () => { quelleFertig = null; fertig(''); };
  });
}

/* Vollbild (Klaus 25.11., wie in der Familienakte): ein runder Knopf mit vier Ecken unten rechts im Rezeptbild schaltet die GANZE App ins
   Vollbild des Browsers (documentElement: Leiste, Liste, Rezept, Fenster und Meldungen bleiben bedienbar, nur die Browserleiste verschwindet).
   Derselbe Knopf beendet es; endet es über Esc oder das System, folgt der Knopf über `fullscreenchange`. Geht es nicht, passiert nichts. */
const vollAn = () => !!document.fullscreenElement;
const ecken = (innen) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${innen ? 'M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5' : 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5'}"/></svg>`;
const vollKnopf = () => { const an = vollAn(), t = an ? L('Vollbild beenden', 'Exit full screen') : L('Vollbild', 'Full screen'); return `<button class="held-voll" data-a="vollbild" aria-pressed="${an}" aria-label="${t}" title="${t}">${ecken(an)}</button>`; };
document.addEventListener('fullscreenchange', () => { document.querySelectorAll('.held-voll').forEach((k) => { k.outerHTML = vollKnopf(); }); });

const geraeteVon = (r) => [...new Set(r.steps.flatMap((x) => erkenne(x.txt)))];
const geraetName = (g) => Lk(GERAETE[g].de, GERAETE[g].en);
/* Nährwerte je Portion (r.nutrition wie in der alten App): eine eingeklappte Zeile, aufgeklappt die Werte. „geschätzt“, wenn sie von der KI kommen. */
function naehrHtml(r) {
  const z = naehrwertZeilen(r.nutrition, spr()); if (!z.length) return '';
  return `<details class="naehr" data-naehr><summary>${ic('flamme')}<span>${z[0].wert} kcal ${L('je Portion', 'per serving')}${r.nutrition.quelle === 'ki' ? ' · ' + L('geschätzt', 'estimated') : ''}</span></summary><ul>${z.slice(1).map((x) => `<li><span>${esc(x.name)}</span><b>${x.wert} ${esc(x.einheit)}</b></li>`).join('')}</ul></details>`;
}
/* ---------- Menü am Rezept (abgenommene Vorschau, Punkt 11): hinter dem Winkel → „Mehr“. Eine Liste, je Zeile ein Zeichen und ein Wort.
   KI-Zeilen sagen in der Zeile selbst, was an wen hinausgeht (Klaus: Auskunft im Knopf); gesendet wird erst beim Tipp. ---------- */
const kiKurz = (was) => { const a = Lk('Hinaus geht: ', 'Sent: '), z = Lk('an Anthropic (Claude).', 'to Anthropic (Claude).'); let k = String(was); if (k.startsWith(a)) k = k.slice(a.length); if (k.endsWith(z)) k = k.slice(0, -z.length); return 'Anthropic · ' + k.trim(); };   /* aus „Hinaus geht: … an Anthropic (Claude).“ wird „Anthropic · …“ – mit genau den Satzteilen des Kerns, damit es in jeder Sprache stimmt */
const kiZeile = (a, i, t, was) => `<button class="zeile" data-a="${a}" title="${esc(was)}">${ic(i)}<span>${esc(t)}<small>${esc(kiKurz(was))}</small></span><i class="ki-marke">${L('KI', 'AI')}</i></button>`;
function rezeptMenue() {
  const r = rezept(s.uid); if (!r) return;
  fenster(`<h2 class="imp-kopf"><span>${esc(zeig(r).name)}</span></h2><div class="liste menue" id="rmenue">
   ${zeile('drucken', 'drucken', L('Drucken', 'Print'))}${zeile('qr', 'qr', L('Teilen per QR-Code', 'Share by QR code'))}${zeile('einheiten', 'waage', L('Einheiten', 'Units'), einhName())}${zeile('zine', 'zine', L('Food-Zine', 'Food zine'), ZI.stand())}
   ${kiZeile('naehrwerte', 'flamme', L('Nährwerte schätzen', 'Estimate nutrition'), helferHinaus('naehrwerte', r, spr()))}${kiZeile('rechtschreibung', 'abc', L('Rechtschreibung prüfen', 'Check spelling'), helferHinaus('rechtschreibung', r, spr()))}${kiZeile('uebersetzen', 'welt', L('Übersetzen', 'Translate'), helferHinaus('uebersetzung', r, spr()))}</div>`);
}
/* Eine Übersetzung gilt für den Text, aus dem sie entstand: ändern sich Name, Zutaten oder Schritte, fällt sie weg – sonst stünde der alte Text weiter da. */
const textKern = (r) => JSON.stringify([r.name, (r.ings || []).map((z) => z.name), (r.steps || []).map((x) => x.txt)]);
const ohneAlteUebersetzung = (alt, neu, textBlieb = false) => { if (textBlieb || !alt?.translations || neu.translations !== alt.translations || textKern(alt) === textKern(neu)) return neu; const { translations, ...rest } = neu; return rest; };
const rezeptSetzen = (neu) => { Z.rezepte = Z.rezepte.map((x) => (x.uid === neu.uid ? { ...ohneAlteUebersetzung(x, neu), modified: new Date().toISOString() } : x)); sichern(); };

/* ---------- Übersetzen (Kern: ki/helfer.mjs). Die Fassung liegt unter r.translations[ziel] (wie in der alten App) und wird gezeigt, wenn die Oberfläche
   diese Sprache spricht. Die eigene Sprache steht vorn. Gesendet wird erst beim Tipp auf eine Sprache; was hinausgeht, steht darüber. ---------- */
const zielSprachen = () => [...SPRACHEN].sort((a, b) => (b[0] === spr()) - (a[0] === spr()));
const hatUebersetzung = (r, ziel) => uebersetzungPasst(r, r.translations?.[ziel]);
/* Klaus 25.11.: kostenlos im Gerät, wo der Browser einen Übersetzer mitbringt (Chromes Translator-API; am Android-Chrome fehlt sie bisher, dann
   steht dieser Weg nicht da). Claude bleibt der zweite Weg (beste Qualität, eigener Schlüssel). Beide legen die Fassung unter r.translations ab. */
const geraetUebersetzer = () => typeof self !== 'undefined' && 'Translator' in self && typeof self.Translator?.create === 'function';
/* Angeboten wird der Weg nur, wenn der Übersetzer von der Sprache des Rezepts aus wenigstens eine Sprache kann (die API allein reicht nicht:
   ohne Sprachmodell meldet sie überall „unavailable“). Gemerkt je Ausgangssprache. */
const geraetKann = new Map();
async function geraetMoeglich(r) {
  if (!geraetUebersetzer()) return false;
  const q = SPRACH_CODES.includes(r.sprache) ? r.sprache : rateSprache(r) || 'en';
  if (!geraetKann.has(q)) geraetKann.set(q, Promise.race([new Promise((ja) => { const ziele = SPRACH_CODES.filter((z) => z !== q); let offen = ziele.length; const eins = (v) => { if (v && v !== 'unavailable') ja(true); else if (--offen === 0) ja(false); };
    for (const z of ziele) { try { self.Translator.availability({ sourceLanguage: q, targetLanguage: z }).then(eins, () => eins('')); } catch { eins(''); } } }), new Promise((w) => setTimeout(() => w(false), 1500))]));   /* antwortet die API nicht, gilt sie als nicht da */
  return geraetKann.get(q);
}
async function uebersetzFenster() {
  const r = rezept(s.uid); if (!r) return;
  const geraet = await geraetMoeglich(r);
  if (!geraet && !SK.anthropic) return schluesselFenster('anthropic', 'uebersetzen');
  const weg = geraet && s.uebWeg !== 'claude' ? 'geraet' : 'claude', was = helferHinaus('uebersetzung', r, spr());
  const wk = (w, t, u) => `<button class="chip" role="radio" aria-checked="${weg === w}" data-a="ueb-weg" data-w="${w}">${esc(t)}<small>${esc(u)}</small></button>`;
  fenster(`<h2 class="imp-kopf">${ic('welt')}<span>${L('Übersetzen', 'Translate')}<small id="ueb-was">${esc(weg === 'geraet' ? L('im Gerät · es geht nichts hinaus', 'on the device · nothing is sent') : kiKurz(was))}</small></span></h2>
   ${geraet ? `<div class="tagwahl ueb-wege" id="ueb-weg" role="radiogroup" aria-label="${L('Weg', 'Way')}">${wk('geraet', L('Im Gerät', 'On the device'), L('kostenlos', 'free'))}${wk('claude', 'Claude', L('beste Qualität', 'best quality'))}</div>` : ''}
   <div class="tagwahl" id="ueb-wahl" data-weg="${weg}" title="${esc(weg === 'geraet' ? '' : was)}">${zielSprachen().map(([c, n]) => `<button class="chip" data-a="uebersetze" data-s="${c}" lang="${c}">${hatUebersetzung(r, c) ? ic('haken') : ''}${esc(n)}</button>`).join('')}</div>`);
  if (weg === 'geraet') uebGeraetPruefen(r);
}
/* Welche Sprachen kann der Übersetzer im Gerät von der Sprache des Rezepts aus? Was er nicht kann, wird ausgegraut. */
async function uebGeraetPruefen(r) {
  const q = SPRACH_CODES.includes(r.sprache) ? r.sprache : rateSprache(r); if (!q) return;
  for (const b of document.querySelectorAll('#ueb-wahl [data-s]')) {
    const ziel = b.dataset.s; if (ziel === q) { b.disabled = true; b.title = L('Sprache des Rezepts', 'Language of the recipe'); continue; }
    try { const v = await Promise.race([self.Translator.availability({ sourceLanguage: q, targetLanguage: ziel }), new Promise((w) => setTimeout(() => w(''), 1500))]); if (v === 'unavailable' && b.isConnected) { b.disabled = true; b.title = L('Im Gerät nicht verfügbar', 'Not available on the device'); } } catch { /* unbekannt: Knopf bleibt */ }
  }
}
async function uebersetzeImGeraet(r, ziel) {
  const quelle = await quellSprache(r, ziel); if (!quelle) return;
  fensterZu();
  try {
    const t = await W.mit(fuelle(L('Wird im Gerät übersetzt: {0} …', 'Translating on the device: {0} …'), sprachName(ziel)), async (w) => {
      const v = await self.Translator.availability({ sourceLanguage: quelle, targetLanguage: ziel });
      if (v === 'unavailable') throw new Error(fuelle(L('Der Übersetzer im Gerät kann {0} → {1} nicht. Bitte Claude wählen.', 'The translator on the device cannot do {0} → {1}. Please choose Claude.'), sprachName(quelle), sprachName(ziel)));
      if (v !== 'available') w.text(L('Sprachpaket wird geladen …', 'Downloading the language pack …'));
      const tr = await self.Translator.create({ sourceLanguage: quelle, targetLanguage: ziel, monitor(m) { m.addEventListener('downloadprogress', (e) => { w.anteil(e.loaded); w.text(fuelle(L('Sprachpaket wird geladen: {0} %', 'Downloading the language pack: {0} %'), Math.round((e.loaded || 0) * 100))); }); } });
      w.anteil(null); w.text(fuelle(L('Wird im Gerät übersetzt: {0} …', 'Translating on the device: {0} …'), sprachName(ziel)));
      try { return await uebersetzeMit(r, ziel, (x) => tr.translate(x), { sprache: spr() }); } finally { try { tr.destroy?.(); } catch { /* schon frei */ } }
    });
    const da = rezept(r.uid) || r; rezeptSetzen(uebersetzungAnRezept(SPRACH_CODES.includes(da.sprache) ? da : { ...da, sprache: quelle }, ziel, t, spr())); s.original = null; zeichne(); melde(fuelle(L('Im Gerät übersetzt: {0}', 'Translated on the device: {0}'), sprachName(ziel)));
  } catch (f) { melde(f?.message || L('Die Übersetzung im Gerät ist fehlgeschlagen.', 'Translating on the device failed.')); }
}
async function uebersetzeEins(ziel) {
  const r = rezept(s.uid); if (!r || !sprKennt(ziel)) return;
  if (geraetUebersetzer() && document.querySelector('#ueb-wahl')?.dataset.weg === 'geraet') return uebersetzeImGeraet(r, ziel);
  if (!SK.anthropic) return schluesselFenster('anthropic', 'uebersetzen');
  fensterZu();
  try {
    const t = await W.mit(fuelle(L('Wird übersetzt: {0} …', 'Translating: {0} …'), sprachName(ziel)), () => uebersetze(r, ziel, { schluessel: SK.anthropic, stufe: E.scan.stufe, sprache: spr() }));
    rezeptSetzen(uebersetzungAnRezept(rezept(r.uid) || r, ziel, t, spr())); s.original = null; zeichne(); melde(fuelle(L('Übersetzt: {0}', 'Translated: {0}'), sprachName(ziel)));
  } catch (f) { melde(f.message); }
}
/* Alle übersetzen: erst die Zielsprache, dann steht im Knopf, wie viele Rezepte ohne diese Fassung es sind und was es etwa kostet (Kern: kostenSchaetzung).
   Schon Übersetzte werden übersprungen, ein Fehlschlag hält den Rest nicht auf. Solange es läuft, steht ein Fenster mit „Abbrechen“ da; es zu schließen bricht ab. */
const uebOffen = (ziel) => Z.rezepte.filter((r) => istInhalt(r) && !hatUebersetzung(r, ziel));
const rezepteText = (n) => (n === 1 ? L('1 Rezept', '1 recipe') : fuelle(L('{0} Rezepte', '{0} recipes'), n));
const kostenKurz = (n, k) => [rezepteText(n), k.usd == null ? fuelle(L('etwa {0} Token', 'about {0} tokens'), k.token.toLocaleString(geb())) : k.usd < 0.01 ? L('unter 0,01 $', 'under $0.01') : fuelle(L('etwa {0} $', 'about ${0}'), k.usd.toLocaleString(geb(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 'Anthropic'].join(' · ');
function alleUebFenster(ziel = '') {
  if (!SK.anthropic) return schluesselFenster('anthropic', 'alle-ueb');
  const offen = ziel ? uebOffen(ziel) : [], k = ziel ? kostenSchaetzung(offen, [ziel], E.scan.stufe, spr()) : null;
  fenster(`<h2 class="imp-kopf">${ic('welt')}<span>${L('Alle übersetzen', 'Translate all')}</span></h2>
   <div class="tagwahl" id="alle-ueb-wahl" role="radiogroup" aria-label="${L('Zielsprache', 'Target language')}">${zielSprachen().map(([c, n]) => `<button class="chip" role="radio" aria-checked="${c === ziel}" data-a="alle-ueb-ziel" data-s="${c}" lang="${c}">${esc(n)}</button>`).join('')}</div>
   ${!ziel ? '' : offen.length ? `<div class="reihe" style="margin-top:12px"><button class="knopf akz gross" data-a="alle-ueb-los" data-s="${ziel}" title="${esc(k.text + ' ' + helferHinaus('uebersetzung', offen, spr()))}">${ic('welt')}<span>${L('Übersetzen', 'Translate')}</span><small id="alle-ueb-was">${esc(kostenKurz(offen.length, k))}</small></button></div>` : `<p class="scan-was" id="alle-ueb-fertig" style="margin-top:12px">${L('Alle schon übersetzt', 'All translated already')}</p>`}`);
}
async function alleUebersetzen(ziel) {
  if (!SK.anthropic || !sprKennt(ziel)) return;
  const offen = uebOffen(ziel), n = offen.length, ab = new AbortController(); if (!n) return;
  const hol = (adresse, wahl) => fetch(adresse, { ...wahl, signal: ab.signal });   /* „Abbrechen“ beendet auch den laufenden Aufruf */
  let ok = 0, nicht = 0, halt = '';
  fenster(`<h2 class="imp-kopf">${ic('welt')}<span>${esc(sprachName(ziel))}</span></h2><div class="reihe"><button class="knopf gross" id="alle-ueb-stopp" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`);
  zuTun = () => ab.abort();
  await W.mit(fuelle(L('{0} Rezepte werden übersetzt …', 'Translating {0} recipes …'), n), async (w) => {
    for (let i = 0; i < n && !ab.signal.aborted; i++) {
      const r = rezept(offen[i].uid); if (!r) continue;
      w.anteil(i / n); w.text(fuelle(L('Rezept {0} von {1}: {2}', 'Recipe {0} of {1}: {2}'), i + 1, n, r.name));
      try { const t = await uebersetze(r, ziel, { schluessel: SK.anthropic, stufe: E.scan.stufe, sprache: spr(), hol }), da = rezept(r.uid); if (da) { rezeptSetzen(uebersetzungAnRezept(da, ziel, t, spr())); ok++; } }
      catch (f) { if (ab.signal.aborted) break; nicht++; if (f.schluesselAbgelehnt || f.keinSchluessel || f.status === 402 || f.status === 429) { halt = f.message; nicht = n - ok; break; } }   /* Schlüssel, Guthaben, Limit: der Rest käme genauso zurück */
    }
  });
  const abgebrochen = ab.signal.aborted; zuTun = null; if ($('alle-ueb-stopp')) fensterZu(); zeichne();
  melde(halt && !ok ? halt : [fuelle(L('{0} übersetzt', '{0} translated'), ok), nicht ? fuelle(L('{0} nicht', '{0} not'), nicht) : '', abgebrochen ? L('abgebrochen', 'cancelled') : ''].filter(Boolean).join(' · '));
}
/* Sprache der Oberfläche: „wie das Gerät“ oder eine der acht Sprachen in ihrem Eigennamen. Die Wahl wirkt sofort. */
function sprachFenster() {
  const jetzt = E.sprache || '', z = (code, name) => `<button class="zeile" role="menuitemradio" aria-checked="${jetzt === code}" data-a="sprache-wahl" data-s="${code}"${code ? ` lang="${code}"` : ''}><span>${esc(name)}</span>${jetzt === code ? ic('haken', 'pf') : ''}</button>`;
  fenster(`<h2 class="imp-kopf">${ic('welt')}<span>${L('Sprache', 'Language')}</span></h2><div class="wahl-liste" id="sprach-wahl" role="menu">${z('', L('wie das Gerät', 'same as device'))}${SPRACHEN.map(([c, n]) => z(c, n)).join('')}</div>`);
}
async function kiAmRezept(art) {
  const r = rezept(s.uid); if (!r) return;
  if (!SK.anthropic) { schluesselFenster('anthropic', 'rmenue'); return; }
  fensterZu();
  try {
    if (art === 'naehrwerte') { const w = await W.mit(L('Nährwerte werden geschätzt …', 'Estimating nutrition …'), () => naehrwerte(r, { schluessel: SK.anthropic, stufe: E.scan.stufe, sprache: spr() })); rezeptSetzen(naehrwerteAnRezept(r, w)); zeichne(); melde(L('Nährwerte geschätzt', 'Nutrition estimated')); return; }
    const e = await W.mit(L('Rechtschreibung wird geprüft …', 'Checking spelling …'), () => rechtschreibung(r, { schluessel: SK.anthropic, stufe: E.scan.stufe, sprache: spr() }));
    if (!e.aenderungen.length) { melde(L('Keine Fehler gefunden', 'No mistakes found')); return; }
    s.recht = e;
    fenster(`<h2 class="imp-kopf">${ic('abc')}<span>${fuelle(L('{0} Vorschläge', '{0} suggestions'), e.aenderungen.length)}</span></h2><form data-form="recht"><ul class="recht-liste">${e.aenderungen.map((x, i) => `<li><label><input type="checkbox" name="n" value="${i}" checked><span><s>${esc(x.alt)}</s> <b>${esc(x.neu)}</b></span></label></li>`).join('')}</ul><div class="reihe"><button class="knopf akz gross" type="submit">${ic('haken')}${L('Übernehmen', 'Apply')}</button></div></form>`);
  } catch (f) { melde(f.message); }
}
async function qrFenster() {
  const r = rezept(s.uid); if (!r) return;
  let link = ''; try { link = await teilLink(zeig(r), location.origin + location.pathname); } catch { link = ''; }
  if (!link || !passtInQr(link, 'L')) { melde(L('Dieses Rezept ist zu lang für einen QR-Code', 'This recipe is too long for a QR code')); return; }
  s.teil = link;
  fenster(`<h2 class="imp-kopf">${ic('qr')}<span>${esc(zeig(r).name)}</span></h2><div class="qr-bild" id="qr-bild" title="${L('Mit der Kamera eines anderen Geräts scannen: das Rezept öffnet sich dort im Rezeptbuch. Ohne Bild.', 'Scan with the camera of another device: the recipe opens there in the recipe book. Without picture.')}">${qrSvg(link, { stufe: 'L', groesse: 300, titel: zeig(r).name, sprache: spr() })}</div>
   <div class="reihe">${navigator.share ? `<button class="knopf akz gross" data-a="qr-teilen">${ic('teilen')}${L('Link teilen', 'Share link')}</button>` : ''}<button class="knopf gross" data-a="qr-kopieren">${ic('kopieren')}${L('Link kopieren', 'Copy link')}</button></div>`);
}


/* ---------- Kochansicht: ein Schritt groß, Wischen oder Pfeiltasten, Bildschirm bleibt an ---------- */
const K = { i: 0, kopf: true, wach: null, uhr: null, rest: 0 };
const zeitText = (sek) => `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
function kochHtml() {
  const r = zeig(rezept(s.uid)); if (!r || !r.steps.length) return '';
  const i = Math.min(K.i, r.steps.length - 1), x = r.steps[i], f = (s.portion[r.uid] || r.servings) / r.servings;
  const zs = zutatenFuerSchritt(r, i), gs = erkenne(x.txt), min = zeitImSchritt(x.txt);
  const balken = `<div class="k-balken" aria-hidden="true">${r.steps.map((_, n) => `<i class="${n < i ? 'an' : n === i ? 'jetzt' : ''}"></i>`).join('')}</div>`;
  const zut = zs.length ? `<div class="k-zut">${zs.map((z) => `<span><b>${esc([skaliere(z.amt, f), z.unit].filter(Boolean).join(' '))}</b> ${esc(z.name)}</span>`).join('')}</div>` : '';
  const wecker = min ? `<button class="k-timer" data-a="wecker" data-min="${min}">${ic('uhr')}<span id="k-zeit">${K.uhr ? zeitText(K.rest) : fuelle(L('Wecker {0} Min', 'Timer {0} min'), min)}</span></button>` : '';
  const ger = gs.length ? `<div class="k-geraete">${gs.map((g) => `<span class="gr-k">${geraetSvg(g)}${esc(geraetName(g))}</span>`).join('')}</div>` : '';
  return `<div class="koch" role="dialog" aria-modal="true" aria-label="${L('Kochansicht', 'Cooking view')}">
   ${K.kopf ? `<div class="k-kopf"><button class="rund" data-a="zurueck" aria-label="${L('Kochansicht schließen', 'Close cooking view')}">${ic('x')}</button><span class="k-name">${esc(r.name)}</span>${K.wach ? `<span class="k-wach"><i></i>${L('bleibt an', 'stays on')}</span>` : ''}<button class="k-klapp" data-a="k-kopf" aria-label="${L('Kopf einklappen', 'Collapse header')}">${ic('hoch')}</button></div>${balken}`
     : `<div class="k-kopf-zu">${balken}<button class="k-klapp" data-a="k-kopf" aria-label="${L('Kopf ausklappen', 'Expand header')}">${ic('x')}</button></div>`}
   <div class="k-rumpf"><div class="k-inhalt" id="k-inhalt">${r.img ? `<div class="k-bild"><img src="${esc(r.img)}" alt=""></div>` : ''}
     <span class="k-nr">${fuelle(L('Schritt {0} von {1}', 'Step {0} of {1}'), i + 1, r.steps.length)}</span><p class="k-text">${esc(x.txt)}</p>${x.note ? `<p class="k-notiz">${esc(x.note)}</p>` : ''}
     <div class="k-nurschmal">${zut}${wecker}${ger}</div></div>
    <aside class="k-seite"><h3>${L('Für diesen Schritt', 'For this step')}</h3>${zut || `<p class="k-notiz">${L('keine neuen Zutaten', 'no new ingredients')}</p>`}${wecker}${ger ? `<h3>${L('Geräte', 'Equipment')}</h3>${ger}` : ''}</aside></div>
   <div class="k-fuss"><button data-a="k-schritt" data-d="-1" ${i === 0 ? 'disabled' : ''}>${ic('links')}${L('Zurück', 'Back')}</button><button class="vor" data-a="${i === r.steps.length - 1 ? 'zurueck' : 'k-schritt'}" data-d="1">${i === r.steps.length - 1 ? L('Fertig', 'Done') : L('Weiter', 'Next')}${ic(i === r.steps.length - 1 ? 'haken' : 'rechts')}</button></div></div>`;
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
/* Die offenen Posten der Einkaufsliste in der Reihenfolge des gewählten Ladens, für den Druck: [{ text, menge, gruppe }]. */
function einkaufDruckZeilen() {
  const E_ = Z.einkauf, liste = einkaufsliste(ekPosten()), aus = [];
  for (const gid of gruppenFolge(E_.laeden[E_.laden])) { const g = jeSprache(WARENGRUPPEN.find((x) => x.id === gid));
    for (const x of liste.filter((y) => y.gruppe === gid && !E_.haken[y.schluessel])) aus.push({ text: x.name, menge: x.menge, gruppe: g });
    if (gid === 'sonstiges') for (const x of E_.eigene.filter((y) => !E_.haken['eig:' + y.id])) aus.push({ text: x.text, menge: '', gruppe: g }); }
  return aus;
}
function einkaufHtml() {
  const E_ = Z.einkauf, posten = ekPosten(), liste = einkaufsliste(posten), folge = gruppenFolge(E_.laeden[E_.laden]);
  let h = `<div class="ueber"><h2 style="font-size:19px">${L('Einkaufsliste', 'Shopping list')}</h2><small>${fuelle(L('{0} offen', '{0} open'), ekOffen())}</small>${posten.length || E_.eigene.length ? ZU.druckKnopf('ek-drucken') : ''}</div>`;
  if (!posten.length && !E_.eigene.length) return h + `<div class="leer"><div class="reihe"><button class="knopf" data-a="geh" data-zu="start">${ic('buch')}${L('Zu den Rezepten', 'To the recipes')}</button><button class="knopf" data-a="geh" data-zu="plan">${ic('plan')}${L('Zum Wochenplan', 'To the week plan')}</button></div></div>` + ekEigenForm();
  h += `<div class="quellen">${posten.map((p) => `<span class="quelle-chip">${p.rezept.img ? `<img src="${esc(p.rezept.img)}" alt="">` : ''}${esc(p.rezept.name)} · ${p.portionen}<button data-a="ek-rezept-weg" data-uid="${esc(p.rezept.uid)}" aria-label="${esc(fuelle(L('{0} von der Liste nehmen', 'Take {0} off the list'), p.rezept.name))}">${ic('x')}</button></span>`).join('')}</div>
   <div class="laeden">${Object.keys(E_.laeden).map((l) => `<button class="chip" data-a="ek-laden" data-l="${esc(l)}" aria-pressed="${l === E_.laden}">${ic('markt')}${esc(ladenName(l))}</button>`).join('')}<button class="chip" data-a="ek-laden-neu">${ic('plus')}${L('Laden', 'Shop')}</button>${frag(L('Jeder Laden merkt sich seine eigene Reihenfolge der Gruppen. Eine Gruppe an der Überschrift lange drücken oder mit der Maus festhalten und an ihre Stelle ziehen.', 'Each shop keeps its own order of groups. Long-press a group at its heading, or hold it with the mouse, and drag it into place.'))}</div><div id="ek-liste">`;
  for (const gid of folge) {
    const g = WARENGRUPPEN.find((x) => x.id === gid), zeilen = liste.filter((x) => x.gruppe === gid);
    const eig = gid === 'sonstiges' ? E_.eigene : [];
    if (!zeilen.length && !eig.length) continue;
    h += `<div class="ek-gruppe" data-g="${gid}"><h3 title="${L('Zum Verschieben lange drücken oder ziehen', 'Long-press or drag to move')}">${ic('griff')}${esc(jeSprache(g))}</h3>`
      + zeilen.map((x) => `<button class="ek-zeile ${E_.haken[x.schluessel] ? 'ok' : ''}" data-a="ek-haken" data-k="${esc(x.schluessel)}" aria-pressed="${!!E_.haken[x.schluessel]}"><span class="ek-box">${E_.haken[x.schluessel] ? ic('haken') : ''}</span><span class="was">${esc(x.name)}<small>${esc(x.aus.join(', '))}</small></span><b>${esc(x.menge)}</b></button>`).join('')
      + eig.map((x) => `<button class="ek-zeile ${E_.haken['eig:' + x.id] ? 'ok' : ''}" data-a="ek-haken" data-k="eig:${esc(x.id)}" aria-pressed="${!!E_.haken['eig:' + x.id]}"><span class="ek-box">${E_.haken['eig:' + x.id] ? ic('haken') : ''}</span><span class="was">${esc(x.text)}<small>${L('selbst notiert', 'added by hand')}</small></span></button>`).join('') + `</div>`;
  }
  return h + `</div>` + ekEigenForm() + `<div class="reihe" style="margin-top:12px"><button class="knopf" data-a="ek-abgehakt-weg">${L('Abgehaktes entfernen', 'Remove ticked items')}</button><button class="knopf rot" data-a="ek-leeren">${L('Liste leeren', 'Clear list')}</button></div>`;
}
const ekEigenForm = () => `<form class="suche" data-form="ek-eigen" style="margin-top:12px;max-width:720px">${ic('plus')}<input name="t" id="ek-feld" placeholder="${L('Noch etwas, z. B. Küchenrolle', 'Something else, e.g. kitchen roll')}" aria-label="${L('Eigenen Posten notieren', 'Add an item of your own')}" autocomplete="off" enterkeyhint="done">${mik('#ek-feld')}</form>`;
/* Der erste Laden heißt im Speicher „Supermarkt“ (Kennung der Reihenfolge); gezeigt wird er in der Sprache der Oberfläche. Eigene Läden bleiben, wie sie heißen. */
const ladenName = (l) => (l === 'Supermarkt' ? L('Supermarkt', 'Supermarket') : l);

/* ---------- Wochenplan ---------- */
const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const wtName = (t, i) => (spr() === 'de' ? WT[i] : t.toLocaleDateString(geb(), { weekday: 'short' }));
function planHtml() {
  const w = woche(s.planTag), heute = tagIso(new Date());
  const von = w.tage[0].toLocaleDateString('de-DE', { day: 'numeric', month: w.tage[0].getMonth() === w.tage[6].getMonth() ? undefined : 'long' }), bis = w.tage[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  const spanne = spr() === 'de' ? `${von}${von.includes('.') ? '' : '.'} bis ${bis}` : new Intl.DateTimeFormat(geb(), { day: 'numeric', month: 'long' }).formatRange(w.tage[0], w.tage[6]);   /* andere Sprachen: die Spanne, wie das Gebiet sie schreibt */
  const anzahlW = w.tage.reduce((n, t) => n + (Z.plan[tagIso(t)] || []).filter(rezept).length, 0);
  return `<div class="w-kopf"><button class="rund" data-a="plan-woche" data-d="-7" aria-label="${L('Vorige Woche', 'Previous week')}">${ic('links')}</button><strong>${fuelle(L('Woche {0}', 'Week {0}'), w.kw)}<small>${esc(spanne)}</small></strong><button class="rund" data-a="plan-woche" data-d="7" aria-label="${L('Nächste Woche', 'Next week')}">${ic('rechts')}</button></div>
   <div class="w-tage">${w.tage.map((t, i) => { const tag = tagIso(t), rz = (Z.plan[tag] || []).map(rezept).filter(Boolean);
     return `<div class="w-tag ${tag === heute ? 'heute' : ''}"><div class="d"><small>${esc(wtName(t, i))}</small><b>${t.getDate()}</b></div><div class="w-slots">${rz.map((r) => `<div class="w-slot"><button class="w-auf" data-a="rezept" data-uid="${esc(r.uid)}">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy">` : `<span class="w-ohne">${ic('karte')}</span>`}<span>${esc(r.name)}${r.prepTime ? `<small>${esc(minText(r.prepTime))}</small>` : ''}</span></button><button class="w-weg" data-a="plan-weg" data-tag="${tag}" data-uid="${esc(r.uid)}" aria-label="${esc(fuelle(L('{0} aus dem Plan nehmen', 'Remove {0} from the plan'), r.name))}">${ic('x')}</button></div>`).join('')}<button class="w-leer ${rz.length ? 'mehr' : ''}" data-a="plan-waehlen" data-tag="${tag}">${ic('plus')}${rz.length ? L('noch eins', 'one more') : L('Gericht planen', 'Plan a dish')}</button></div></div>`; }).join('')}</div>
   <div class="reihe" style="margin-top:14px"><button class="knopf ${anzahlW ? 'akz' : ''}" data-a="plan-einkauf" ${anzahlW ? '' : 'disabled'}>${ic('einkauf')}${L('Einkaufsliste für die Woche', 'Shopping list for the week')}</button><button class="knopf" data-a="plan-heute">${L('Heute', 'Today')}</button>${anzahlW ? ZU.druckKnopf('plan-drucken') : ''}${ZU.planKnopf()}</div>`;
}
function planWahlFenster(tag, uidFest) {
  if (uidFest) { const w = woche(new Date()), w2 = woche(new Date(Date.now() + 7 * 864e5));
    fenster(`<h2>${L('Wann kochen?', 'When to cook?')}</h2><div class="tagwahl">${[...w.tage, ...w2.tage].filter((t) => tagIso(t) >= tagIso(new Date())).map((t) => `<button class="chip" data-a="plan-setzen" data-tag="${tagIso(t)}" data-uid="${esc(uidFest)}">${esc(t.toLocaleDateString(geb(), { weekday: 'short', day: 'numeric', month: 'numeric' }))}</button>`).join('')}</div>`); return; }
  const alle = Z.rezepte.filter(istInhalt);
  fenster(`<h2>${L('Gericht planen', 'Plan a dish')}</h2><div class="wahl-liste">${alle.map((r) => `<button class="zeile" data-a="plan-setzen" data-tag="${tag}" data-uid="${esc(r.uid)}">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy">` : ic('karte')}<span>${esc(r.name)}</span></button>`).join('') || `<p>${L('Noch keine Rezepte im Buch.', 'No recipes in the book yet.')}</p>`}</div>`);

}

/* ---------- Kategorien verwalten ---------- */
const EMOJI = '🥗 🍜 🍲 🐟 🥦 🍰 🍮 🍷 🥤 🍹 🍸 🍋 ☕ 🍶 🫙 🥨 🍢 🍣 🍕 🍝 🍔 🌮 🥘 🍛 🥩 🍗 🥓 🧀 🥚 🥞 🧇 🍞 🥐 🥖 🥔 🥕 🌽 🍅 🍆 🥑 🌶 🧄 🧅 🍄 🥜 🍎 🍓 🍒 🍑 🍍 🥭 🍌 🍇 🍪 🧁 🍫 🍦 🍯 🫖 🍵 🥛 🧃 🍺 🎄 🎂 ❤️ ⭐ 🔥 ❄️ 👶 👵'.split(' ');
function kategorienHtml() {
  const kats = alleKategorien(Z.rezepte, Z.kategorien), aus = (Z.kategorien.ausgeblendet || []).filter((id) => !kats.some((c) => c.id === id)).map((id) => KATEGORIEN_FEST.find((c) => c.id === id)).filter(Boolean);
  return `<div class="ueber"><h2 style="font-size:19px">${L('Kategorien', 'Categories')}</h2>${frag(L('Namen und Zeichen kannst du frei ändern; ein leeres Namensfeld heißt Vorgabe. Zum Ordnen eine Zeile am Griff lange drücken oder mit der Maus ziehen. Eine Kategorie mit Rezepten fragt beim Löschen, wohin die Rezepte sollen. Ein eigener Name gilt in allen Sprachen.', 'You can change names and symbols freely; an empty name field means the default. To reorder, long-press a row at the handle or drag it with the mouse. A category with recipes asks on deletion where the recipes should go. A name of your own applies in all languages.'))}</div>
   ${(() => { const offen = kats.filter((c) => ['ohne', 'unbekannt'].includes(c.art)).reduce((m, c) => m + anzahl(Z.rezepte, c.id), 0); return offen ? `<p class="hinweis" id="kat-offen">${esc(fuelle(L('{0} Rezepte haben keine oder eine unbekannte Kategorie. Mit dem Pfeil-Knopf ordnest du alle auf einmal zu, einzeln über „Kategorie“ am Rezept.', '{0} recipes have no or an unknown category. Use the arrow button to assign them all at once, one by one via “Category” at the recipe.'), offen))}</p>` : ''; })()}
   <div class="liste" id="kat-liste">${kats.map((c) => { const n = anzahl(Z.rezepte, c.id), eig = Z.kategorien.namen?.[c.id]?.name || '';
     return `<div class="kat-zeile" data-kid="${esc(c.id)}"><span class="griff" aria-hidden="true" title="${L('Zum Verschieben lange drücken oder ziehen', 'Long-press or drag to move')}">${ic('griff')}</span><button class="kat-zeichen" data-a="kat-emoji" data-kid="${esc(c.id)}" aria-label="${L('Bild oder Zeichen ändern', 'Change picture or symbol')}">${katSticker(c)}</button>
      ${c.art === 'ohne' ? `<span class="kat-fest">${esc(katName(c))}</span>` : `<input class="feld kat-name" data-kid="${esc(c.id)}" value="${esc(c.art === 'eigen' && !eig ? c.de : eig)}" placeholder="${esc(jeSprache(c) || c.id)}" aria-label="${esc(fuelle(L('Name der Kategorie {0}', 'Name of the category {0}'), katName(c)))}" autocomplete="off">`}
      <small>${n}</small>${n && ['ohne', 'unbekannt', 'fremd'].includes(c.art) ? `<button class="rund" data-a="kat-alle" data-kid="${esc(c.id)}" aria-label="${esc(fuelle(L('Alle {0} Rezepte aus „{1}“ einer Kategorie zuordnen', 'Assign all {0} recipes from “{1}” to a category'), n, katName(c)))}" title="${esc(L('Alle zuordnen', 'Assign all'))}">${ic('pfeile')}</button>` : ''}${c.art === 'ohne' ? '<span style="width:34px"></span>' : `<button class="rund" data-a="kat-weg" data-kid="${esc(c.id)}" aria-label="${esc(fuelle(L('Kategorie {0} löschen', 'Delete category {0}'), katName(c)))}">${ic('muell')}</button>`}</div>`; }).join('')}</div>
   <div class="reihe" style="margin-top:12px"><button class="knopf akz" data-a="kat-neu">${ic('plus')}${L('Neue Kategorie', 'New category')}</button></div>
   ${aus.length ? `<div class="gruppe"><h3>${L('Ausgeblendet', 'Hidden')}</h3><div class="liste">${aus.map((c) => `<button class="zeile" data-a="kat-zurueck" data-kid="${esc(c.id)}">${ic('plus')}<span>${esc(jeSprache(c))}<small>${L('wieder zeigen', 'show again')}</small></span></button>`).join('')}</div></div>` : ''}`;
}
function katWahlFenster(titel, ohneId, aktion, uid = '') {
  const kats = alleKategorien(Z.rezepte, Z.kategorien).filter((c) => c.art !== 'ohne' && c.id !== ohneId);
  fenster(`<h2>${esc(titel)}</h2><div class="wahl-liste">${kats.map((c) => `<button class="zeile" data-a="${aktion}" data-ziel="${esc(c.id)}" data-kid="${esc(ohneId || '')}" data-uid="${esc(uid)}"><span class="kat-zeichen">${katSticker(c)}</span><span>${esc(katName(c))}</span></button>`).join('')}
    <button class="zeile" data-a="${aktion}" data-ziel="" data-kid="${esc(ohneId || '')}" data-uid="${esc(uid)}">${ic('frage')}<span>${L('ohne Kategorie', 'no category')}</span></button></div>
    ${aktion === 'kat-setzen' ? `<form class="suche" data-form="kat-neu-zu" style="margin-top:10px">${ic('plus')}<input name="n" placeholder="${L('Neue Kategorie anlegen', 'Create new category')}" autocomplete="off" aria-label="${L('Neue Kategorie', 'New category')}"></form>` : ''}`);
}

/* ---------- Ordner (Kern: modell/ordner.mjs): eigene Sammlungen neben den Kategorien. Ein Ordner frisst die Kategorie nicht. ---------- */
const ORD_ERKL = () => L('Ordner sind eigene Sammlungen neben den Kategorien, zum Beispiel „Hochzeit von Jonas und Lisa“. Ein Rezept liegt in höchstens einem Ordner und behält seine Kategorie. Wird ein Ordner gelöscht, bleiben die Rezepte.', 'Folders are your own collections next to the categories, e.g. “Jonas and Lisa’s wedding”. A recipe is in one folder at most and keeps its category. If a folder is deleted, the recipes stay.');
/* Einordnen (Klaus 25.11.): EIN Fenster für Kategorie und Ordner. Ein Tipp setzt sofort, das Fenster bleibt offen, damit beides in einem Gang geht. */
function einordnenFenster(uid) {
  const r = rezept(uid); if (!r) return; const kJetzt = katVonRezept(r), oJetzt = ordnerVonRezept(r, Z.ordner);
  const kats = alleKategorien(Z.rezepte, Z.kategorien).filter((c) => c.art !== 'ohne'), haken = (an) => (an ? ic('haken', 'pf') : '');
  fenster(`<h2 class="imp-kopf"><span>${L('Einordnen', 'Organise')}<small>${esc(zeig(r).name)}</small></span><button class="rund" data-a="fenster-zu" aria-label="${L('Schließen', 'Close')}">${ic('x')}</button></h2>
   <p class="ein-satz">${L('Die Kategorie sagt, was es ist. Ein Ordner ist eine eigene Sammlung quer dazu, z. B. „Hochzeit von Jonas und Lisa“; jedes Gericht bleibt in seiner Kategorie.', 'The category says what it is. A folder is a separate collection across it, e.g. “Jonas and Lisa’s wedding”; every dish stays in its category.')}</p>
   <h3 class="ein-h">${L('Kategorie', 'Category')}</h3><div class="wahl-liste" id="ein-kat">${kats.map((c) => `<button class="zeile" data-a="ein-kat" data-ziel="${esc(c.id)}" data-uid="${esc(uid)}" aria-pressed="${c.id === kJetzt}"><span class="kat-zeichen">${katSticker(c)}</span><span>${esc(katName(c))}</span>${haken(c.id === kJetzt)}</button>`).join('')}
    <button class="zeile" data-a="ein-kat" data-ziel="" data-uid="${esc(uid)}" aria-pressed="${kJetzt === KAT_OHNE}">${ic('frage')}<span>${L('ohne Kategorie', 'no category')}</span>${haken(kJetzt === KAT_OHNE)}</button></div>
   <form class="suche" data-form="ein-kat-neu" data-uid="${esc(uid)}" style="margin-top:8px">${ic('plus')}<input name="n" placeholder="${L('Neue Kategorie anlegen', 'Create new category')}" autocomplete="off" aria-label="${L('Neue Kategorie', 'New category')}"></form>
   <h3 class="ein-h ein-ord">${L('Ordner (optional)', 'Folder (optional)')}</h3><div class="wahl-liste" id="ein-ord">${Z.ordner.map((o) => `<button class="zeile" data-a="ein-ord" data-oid="${esc(o.id)}" data-uid="${esc(uid)}" aria-pressed="${String(o.id) === oJetzt}">${o.ico ? `<span class="kat-zeichen" aria-hidden="true">${esc(o.ico)}</span>` : ic('ordner')}<span>${esc(ordTitel(o))}</span>${haken(String(o.id) === oJetzt)}</button>`).join('')}
    ${oJetzt ? `<button class="zeile" data-a="ein-ord" data-oid="" data-uid="${esc(uid)}">${ic('x')}<span>${L('aus dem Ordner nehmen', 'take out of the folder')}</span></button>` : ''}</div>
   <form class="suche" data-form="ein-ord-neu" data-uid="${esc(uid)}" style="margin-top:8px">${ic('plus')}<input name="n" placeholder="${L('Neuer Ordner, z. B. Hochzeit von Jonas und Lisa', 'New folder, e.g. Jonas and Lisa’s wedding')}" autocomplete="off" aria-label="${L('Neuer Ordner', 'New folder')}"></form>`);
}
const einKat = (uid, ziel) => { Z.rezepte = Z.rezepte.map((r) => (r.uid === uid ? { ...r, cat: ziel } : r)); sichern(); zeichne(); einordnenFenster(uid); melde(L('Kategorie geändert', 'Category changed')); };
const einOrd = (uid, oid) => { const o = findeOrdner(Z.ordner, oid); Z.rezepte = legeIn(Z.rezepte, Z.ordner, uid, oid); sichern(); zeichne(); einordnenFenster(uid); melde(o ? fuelle(L('Liegt jetzt im Ordner „{0}“', 'Now in the folder “{0}”'), ordTitel(o)) : L('Aus dem Ordner genommen', 'Taken out of the folder')); };
function ordnerWahlFenster(uid) {
  const r = rezept(uid); if (!r) return; const jetzt = ordnerVonRezept(r, Z.ordner);
  fenster(`<h2>${L('In einen Ordner legen', 'Put into a folder')} ${frag(ORD_ERKL())}</h2><div class="wahl-liste" id="ord-wahl">${Z.ordner.map((o) => `<button class="zeile" data-a="ordner-setzen" data-oid="${esc(o.id)}" data-uid="${esc(uid)}" aria-pressed="${String(o.id) === jetzt}">${o.ico ? `<span class="kat-zeichen" aria-hidden="true">${esc(o.ico)}</span>` : ic('ordner')}<span>${esc(ordTitel(o))}</span>${String(o.id) === jetzt ? ic('haken', 'pf') : ''}</button>`).join('')}
    ${jetzt ? `<button class="zeile" data-a="ordner-setzen" data-oid="" data-uid="${esc(uid)}">${ic('x')}<span>${L('aus dem Ordner nehmen', 'take out of the folder')}</span></button>` : ''}</div>
    <form class="suche" data-form="ordner-neu-zu" data-uid="${esc(uid)}" style="margin-top:10px">${ic('plus')}<input name="n" placeholder="${L('Neuer Ordner, z. B. Hochzeit von Jonas und Lisa', 'New folder, e.g. Jonas and Lisa’s wedding')}" autocomplete="off" aria-label="${L('Neuer Ordner', 'New folder')}"></form>`);
}

/* ---------- Explorer „Ordner“ (Klaus 25.11., R3/R9): alle Kategorien und Ordner als Baum, wie „Meine Ordner“ der alten App ----------
   Eine Kategorie zeigt die Rezepte, die in keinem Ordner liegen (wer in einem Ordner liegt, steht nur dort; die Zahl daneben sagt es).
   Ziehen am Griff (Finger: lange drücken; Maus: ziehen): ein Rezept auf eine Kategorie setzt r.cat und nimmt es aus dem Ordner, auf einen
   Ordner setzt es r.folder (die Kategorie bleibt). Eine Gruppe am Griff ihrer Kopfzeile ordnet die Kategorien bzw. Ordner um.
   Mehrere auf einmal: „Auswählen“, Haken setzen, „Verschieben nach …“. Breiter Schirm: Baum links, Rezept rechts. */
const BAUM_ERKL = () => L('Hier stehen alle Kategorien und Ordner mit ihren Rezepten. Ein Tipp auf die Zeile klappt sie auf, ein Tipp auf ein Rezept öffnet es. Zum Verschieben ein Rezept am Griff lange drücken (mit der Maus: ziehen) und auf eine Kategorie oder einen Ordner legen; eine ganze Kategorie oder einen Ordner verschiebst du am Griff der Kopfzeile. Mehrere auf einmal: „Auswählen“, Haken setzen, „Verschieben nach …“. Ein Rezept in einem Ordner behält seine Kategorie und steht im Baum nur beim Ordner.', 'Here are all categories and folders with their recipes. A tap on the row opens it, a tap on a recipe opens the recipe. To move, long-press a recipe at its handle (with the mouse: drag) and drop it on a category or a folder; move a whole category or folder at the handle of its header. Several at once: “Select”, tick, “Move to …”. A recipe in a folder keeps its category and appears in the tree only under the folder.');
const bzKey = (art, id) => (art === 'kat' ? 'k:' : 'o:') + id;
function baumGruppen() {
  const q = s.baum.q.trim().toLowerCase(), alle = Z.rezepte.filter(istInhalt);
  const passt = (r) => !q || zeig(r).name.toLowerCase().includes(q) || String(r.name || '').toLowerCase().includes(q);
  const kats = alleKategorien(Z.rezepte, Z.kategorien).map((c) => { const eig = alle.filter((r) => katVonRezept(r) === c.id), frei = eig.filter((r) => !ordnerVonRezept(r, Z.ordner));
    return { art: 'kat', id: c.id, c, name: katName(c), alle: frei, rz: frei.filter(passt), imOrdner: eig.length - frei.length }; });
  const ords = ordUebersicht(Z.rezepte, Z.ordner).map((o) => { const rs = imOrdner(Z.rezepte, Z.ordner, o.id); return { art: 'ord', id: String(o.id), o, name: ordTitel(o), alle: rs, rz: rs.filter(passt) }; });
  return { q, kats, ords };
}
function baumHtml() {
  const g = baumGruppen(), alleAuf = [...g.kats, ...g.ords].every((x) => s.baum.auf.has(bzKey(x.art, x.id)));
  return `<div class="ueber"><h2 style="font-size:19px">${L('Ordner', 'Folders')}</h2>${frag(BAUM_ERKL())}</div>
   <form class="suche bz-suche" data-form="baum-suche" role="search">${ic('suche')}<input id="baumfeld" name="q" value="${esc(s.baum.q)}" placeholder="${L('Im Baum suchen …', 'Search the tree …')}" aria-label="${L('Im Baum suchen', 'Search the tree')}" autocomplete="off" enterkeyhint="search"><button type="button" id="baum-x" data-a="baum-suche-leer" aria-label="${L('Eingabe löschen', 'Clear input')}" ${s.baum.q ? '' : 'hidden'}>${ic('x')}</button></form>
   <div class="reihe bz-knoepfe"><button class="chip" data-a="baum-ordner-neu">${ic('plus')}${L('Neuer Ordner', 'New folder')}</button><button class="chip" data-a="geh" data-zu="kategorien">${ic('stift')}${L('Kategorien umbenennen', 'Rename categories')}</button><button class="chip" data-a="baum-alle" aria-pressed="${alleAuf}">${ic(alleAuf ? 'hoch' : 'rechts')}${alleAuf ? L('Alle einklappen', 'Collapse all') : L('Alle aufklappen', 'Expand all')}</button><button class="chip" data-a="baum-wahl" aria-pressed="${!!s.baum.wahl}">${ic('haken')}${L('Auswählen', 'Select')}</button></div>
   <div id="baum-rest">${baumRest(g)}</div>${s.baum.wahl ? baumWahlLeiste() : ''}`;
}
function baumRest(g = baumGruppen()) {
  const kats = g.q ? g.kats.filter((x) => x.rz.length) : g.kats, ords = g.q ? g.ords.filter((x) => x.rz.length) : g.ords;
  if (g.q && !kats.length && !ords.length) return `<div class="leer"><p>${fuelle(L('Nichts gefunden für „{0}“.', 'Nothing found for “{0}”.'), esc(g.q))}</p></div>`;
  /* leere Kategorien (Klaus 25.11.): eingeklappt hinter einer Zeile, nicht versteckt – man muss noch Rezepte hineinziehen können */
  const leer = g.q ? [] : kats.filter((x) => !x.alle.length && !x.imOrdner), voll = kats.filter((x) => !leer.includes(x));
  const leerZeile = leer.length ? `<button class="bz-leere" data-a="baum-leere" aria-expanded="${!!s.baum.leere}">${ic('rechts', 'bz-pf')}${esc(fuelle(L('+ {0} leere Kategorien', '+ {0} empty categories'), leer.length))}</button>` : '';
  return `<h3 class="bz-teil">${L('Kategorien', 'Categories')}</h3><div class="bz-baum" data-teil="kat">${voll.map((x) => baumGruppe(x, g.q)).join('')}${s.baum.leere ? leer.map((x) => baumGruppe(x, g.q)).join('') : ''}</div>${leerZeile}
   <h3 class="bz-teil">${L('Ordner', 'Folders')}</h3><div class="bz-baum" data-teil="ord">${ords.map((x) => baumGruppe(x, g.q)).join('') || `<p class="quelle" id="bz-ord-leer">${g.q ? '' : L('Noch kein Ordner. „Neuer Ordner“ legt einen an; danach Rezepte hineinziehen.', 'No folder yet. “New folder” creates one; then drag recipes into it.')}</p>`}</div>`;
}
function baumGruppe(x, q) {
  /* Klaus 25.11.: wie die alte Liste – gleich da ändern, wo es steht: Name im Feld, Tipp aufs Bild ändert das Bild, Müll löscht, Pfeile ordnen zu. Kein Zwischenfenster. */
  const k = bzKey(x.art, x.id), auf = !!q || s.baum.auf.has(k), kat = x.art === 'kat', n = x.alle.length;
  const zeichen = kat ? katSticker(x.c) : x.o.bild ? `<img class="sticker" src="${esc(x.o.bild)}" alt="" loading="lazy">` : x.o.ico ? `<span aria-hidden="true">${esc(x.o.ico)}</span>` : ic('ordner');
  const zahl = (n === 1 ? L('1 Rezept', '1 recipe') : fuelle(L('{0} Rezepte', '{0} recipes'), n)) + (kat && x.imOrdner ? ' · ' + fuelle(L('+{0} in Ordnern', '+{0} in folders'), x.imOrdner) : '');
  const eig = kat ? Z.kategorien.namen?.[x.id]?.name || '' : '';
  const feld = !kat ? `<input class="feld ord-name" data-oid="${esc(x.id)}" value="${esc(ordnerName(x.o))}" placeholder="${L('Name des Ordners', 'Folder name')}" aria-label="${L('Name des Ordners', 'Folder name')}" autocomplete="off">`
    : x.c.art === 'ohne' ? `<span class="kat-fest">${esc(x.name)}</span>` : `<input class="feld kat-name" data-kid="${esc(x.id)}" value="${esc(x.c.art === 'eigen' && !eig ? x.c.de : eig)}" placeholder="${esc(jeSprache(x.c) || x.c.id)}" aria-label="${esc(fuelle(L('Name der Kategorie {0}', 'Name of the category {0}'), x.name))}" autocomplete="off">`;
  const bild = kat ? `<button class="kat-zeichen" data-a="kat-emoji" data-kid="${esc(x.id)}" aria-label="${L('Bild oder Zeichen ändern', 'Change picture or symbol')}">${zeichen}</button>` : `<span class="kat-zeichen">${zeichen}</span>`;
  const knoepfe = kat
    ? (n + x.imOrdner && ['ohne', 'unbekannt', 'fremd'].includes(x.c.art) ? `<button class="chip bz-alle" data-a="kat-alle" data-kid="${esc(x.id)}" aria-label="${esc(fuelle(L('Alle {0} Rezepte aus „{1}“ einer Kategorie zuordnen', 'Assign all {0} recipes from “{1}” to a category'), n + x.imOrdner, x.name))}">${esc(L('Alle zuordnen →', 'Assign all →'))}</button>` : '')
      + (x.c.art === 'ohne' ? '<span class="bz-platz"></span>' : `<button class="rund" data-a="kat-weg" data-kid="${esc(x.id)}" aria-label="${esc(fuelle(L('Kategorie {0} löschen', 'Delete category {0}'), x.name))}">${ic('muell')}</button>`)
    : `<button class="rund" data-a="ordner-weg" data-oid="${esc(x.id)}" aria-label="${esc(fuelle(L('Ordner „{0}“ löschen', 'Delete folder “{0}”'), x.name))}">${ic('muell')}</button>`;
  return `<section class="bz-gruppe" data-art="${x.art}" data-id="${esc(x.id)}" data-g="${esc(k)}" data-name="${esc(x.name)}"><div class="bz-kopf">${q ? '' : `<span class="griff bz-ggriff" aria-hidden="true" title="${L('Zum Verschieben lange drücken oder ziehen', 'Long-press or drag to move')}">${ic('griff')}</span>`}${bild}<span class="bz-name">${feld}<button class="bz-zahl" data-a="baum-auf" data-g="${esc(k)}" tabindex="-1">${esc(zahl)}</button></span><button class="bz-auf" data-a="baum-auf" data-g="${esc(k)}" aria-expanded="${auf}" aria-label="${esc(auf ? fuelle(L('„{0}“ zuklappen', 'Collapse “{0}”'), x.name) : fuelle(L('„{0}“ aufklappen', 'Expand “{0}”'), x.name))}">${ic('rechts', 'bz-pf')}</button>${knoepfe}</div>
   ${auf ? `<div class="bz-rezepte">${x.rz.map((r) => baumZeile(r)).join('') || `<p class="bz-leer">${L('Keine Rezepte. Zieh eines hierher.', 'No recipes. Drag one here.')}</p>`}</div>` : ''}</section>`;
}
function baumZeile(r0) {
  const r = zeig(r0), w = s.baum.wahl, an = w?.has(r0.uid), c = alleKategorien(Z.rezepte, Z.kategorien).find((x) => x.id === katVonRezept(r0));
  return `<div class="bz-zeile" data-uid="${esc(r0.uid)}" ${breit() && s.uid === r0.uid ? 'aria-current="true"' : ''}>${w ? `<button class="bz-haken" data-a="baum-haken" data-uid="${esc(r0.uid)}" aria-pressed="${!!an}" aria-label="${esc(fuelle(L('„{0}“ auswählen', 'Select “{0}”'), r.name))}">${an ? ic('haken') : ''}</button>` : ''}<button class="bz-r" data-a="baum-rezept" data-uid="${esc(r0.uid)}"><span class="kat-zeichen bz-bild">${r0.img ? `<img class="sticker" src="${esc(r0.img)}" alt="" loading="lazy" ${ausschnitt(r0)}>` : c ? katZeichen(c) : ic('karte')}</span><span class="bz-rname">${esc(r.name)}</span></button><span class="griff bz-rgriff" aria-hidden="true" title="${L('Zum Verschieben lange drücken oder ziehen', 'Long-press or drag to move')}">${ic('griff')}</span></div>`;
}
const baumWahlLeiste = () => { const n = s.baum.wahl.size; return `<div class="bz-wahl" role="toolbar" aria-label="${L('Auswahl', 'Selection')}"><span id="bz-wahl-zahl">${esc(fuelle(L('{0} gewählt', '{0} selected'), n))}</span><button class="knopf akz" data-a="baum-verschieben" ${n ? '' : 'disabled'}>${ic('pfeile')}${L('Verschieben nach …', 'Move to …')}</button><button class="rund" data-a="baum-wahl" aria-label="${L('Auswahl beenden', 'End selection')}">${ic('x')}</button></div>`; };
function baumZielFenster(uids) {
  const kats = alleKategorien(Z.rezepte, Z.kategorien);
  fenster(`<h2>${esc(fuelle(L('{0} Rezepte verschieben nach …', 'Move {0} recipes to …'), uids.length))}</h2><h3>${L('Kategorie', 'Category')}</h3><div class="wahl-liste" id="bz-ziele">${kats.map((c) => `<button class="zeile" data-a="baum-ziel" data-art="kat" data-id="${esc(c.id)}"><span class="kat-zeichen">${katSticker(c)}</span><span>${esc(katName(c))}</span></button>`).join('')}</div>
    <h3 style="margin-top:12px">${L('Ordner', 'Folder')}</h3><div class="wahl-liste">${Z.ordner.map((o) => `<button class="zeile" data-a="baum-ziel" data-art="ord" data-id="${esc(o.id)}">${o.ico ? `<span class="kat-zeichen" aria-hidden="true">${esc(o.ico)}</span>` : ic('ordner')}<span>${esc(ordTitel(o))}</span></button>`).join('')}
    <button class="zeile" data-a="baum-ziel" data-art="ord" data-id="">${ic('x')}<span>${L('aus dem Ordner nehmen', 'take out of the folder')}</span></button></div>`);
}
/** Legt Rezepte ab: auf eine Kategorie (r.cat, raus aus dem Ordner) oder in einen Ordner (r.folder; leer = heraus). Mit Rückgängig. */
function baumAblegen(uids, art, id) {
  const vorher = Z.rezepte, menge = new Set(uids); let n = 0;
  if (art === 'kat') { const cat = id === KAT_OHNE ? '' : id; Z.rezepte = Z.rezepte.map((r) => (menge.has(r.uid) && (katVonRezept(r) !== (cat || KAT_OHNE) || ordnerVonRezept(r, Z.ordner)) ? (n++, { ...r, cat, folder: '' }) : r)); }
  else { if (id && !findeOrdner(Z.ordner, id)) return; for (const u of menge) { const r = rezept(u); if (r && (ordnerVonRezept(r, Z.ordner) || '') !== String(id)) { Z.rezepte = legeIn(Z.rezepte, Z.ordner, u, id); n++; } } }
  if (!n) { zeichne(); return; }
  if (art === 'kat') s.baum.auf.add(bzKey('kat', id)); else if (id) s.baum.auf.add(bzKey('ord', id));
  if (s.baum.wahl) s.baum.wahl.clear();
  sichern(); zeichne();
  const ziel = art === 'kat' ? katName(alleKategorien(Z.rezepte, Z.kategorien).find((c) => c.id === id) || { id, de: id }) : id ? ordTitel(findeOrdner(Z.ordner, id)) : '';
  melde(ziel ? fuelle(L('{0} Rezepte nach „{1}“ verschoben', '{0} recipes moved to “{1}”'), n, ziel) : fuelle(L('{0} Rezepte aus dem Ordner genommen', '{0} recipes taken out of the folder'), n), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher; sichern(); zeichne(); });
}
/* Ziehen im Baum: Griff am Rezept oder an der Kopfzeile; Finger nach 350 ms, Maus sofort nach 6 px. Ein Schattenbild folgt dem Zeiger. */
let bz = null, bzGezogen = 0;
const bzRoll = () => (breit() ? document.querySelector('.md-liste') : null);
function bzAn() {
  if (!bz || bz.weit) return; bz.weit = true; const w = s.baum.wahl, uids = bz.art === 'r' ? (w?.has(bz.uid) ? [...w] : [bz.uid]) : [];
  bz.uids = uids; bz.el.classList.add('bz-zieht');
  const g = document.createElement('div'); g.className = 'bz-geist'; g.textContent = bz.art === 'r' ? (uids.length > 1 ? fuelle(L('{0} Rezepte', '{0} recipes'), uids.length) : zeig(rezept(bz.uid))?.name || '') : bz.el.dataset.name || '';
  document.body.appendChild(g); bz.geist = g; bzSetze(bz.x, bz.y); navigator.vibrate?.(15);
  bz.roll = setInterval(() => { if (!bz) return; const d = bz.y < 70 ? -14 : bz.y > innerHeight - 70 ? 14 : 0; if (!d) return; const c = bzRoll(); if (c) c.scrollTop += d; else scrollBy(0, d); bzZiel(); }, 30);
}
function bzSetze(x, y) { if (bz?.geist) { bz.geist.style.left = x + 'px'; bz.geist.style.top = y + 'px'; } }
function bzZiel() {
  document.querySelectorAll('.bz-ziel,.ziel-vor,.ziel-nach').forEach((e) => e.classList.remove('bz-ziel', 'ziel-vor', 'ziel-nach'));
  /* durch Meldung, fliegende Leiste und Schattenbild hindurch: das Ziel ist die Gruppe darunter (am Gerät liegt die Meldung oft genau über dem untersten Ordner) */
  let el = null; for (const e of document.elementsFromPoint(bz.x, bz.y)) { el = e.closest('.bz-gruppe'); if (el || e.closest('.md-detail, .fenster, .bz-wahl')) break; }
  bz.ziel = null; if (!el) return;
  if (bz.art === 'r') { el.classList.add('bz-ziel'); bz.ziel = { art: el.dataset.art, id: el.dataset.id }; return; }
  if (el === bz.el || el.dataset.art !== bz.el.dataset.art) return;
  const r = el.getBoundingClientRect(), vor = bz.y < r.top + Math.min(r.height, 52) / 2; el.classList.add(vor ? 'ziel-vor' : 'ziel-nach');
  let nach = el.nextElementSibling; if (nach === bz.el) nach = nach.nextElementSibling;
  bz.ziel = { vorId: vor ? el.dataset.id : nach?.dataset.id ?? null };
}
document.addEventListener('pointerdown', (ev) => {
  const h = ev.target.closest?.('.bz-rgriff, .bz-ggriff'); if (!h || ev.button > 0) return;
  const el = h.classList.contains('bz-rgriff') ? h.closest('.bz-zeile') : h.closest('.bz-gruppe');
  bz = { el, art: h.classList.contains('bz-rgriff') ? 'r' : 'g', uid: el.dataset.uid, x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, maus: ev.pointerType === 'mouse', weit: false, ziel: null };
  bz.uhr = setTimeout(bzAn, 350); try { h.setPointerCapture(ev.pointerId); } catch { /* geht auch ohne */ } ev.preventDefault();
});
document.addEventListener('pointermove', (ev) => {
  if (!bz) return; bz.x = ev.clientX; bz.y = ev.clientY;
  if (!bz.weit) { if (Math.hypot(ev.clientX - bz.x0, ev.clientY - bz.y0) < 6) return; if (!bz.maus) { clearTimeout(bz.uhr); bz = null; return; } clearTimeout(bz.uhr); bzAn(); }
  bzSetze(ev.clientX, ev.clientY); bzZiel();
});
document.addEventListener('touchmove', (ev) => { if (bz?.weit) ev.preventDefault(); }, { passive: false });   // während des Ziehens scrollt der Finger die Seite nicht
const bzLos = (ev) => {
  if (!bz) return; const b = bz; bz = null; clearTimeout(b.uhr); clearInterval(b.roll); b.geist?.remove(); b.el.classList.remove('bz-zieht');
  document.querySelectorAll('.bz-ziel,.ziel-vor,.ziel-nach').forEach((e) => e.classList.remove('bz-ziel', 'ziel-vor', 'ziel-nach'));
  if (!b.weit) return; bzGezogen = Date.now(); if (ev?.type === 'pointercancel' || !b.ziel) { zeichne(); return; }
  if (b.art === 'r') { baumAblegen(b.uids, b.ziel.art, b.ziel.id); return; }
  if (b.el.dataset.art === 'kat') Z.kategorien = katUmsortieren(Z.rezepte, Z.kategorien, b.el.dataset.id, b.ziel.vorId); else Z.ordner = ordUmsortieren(Z.ordner, b.el.dataset.id, b.ziel.vorId);
  sichern(); zeichne();
};
document.addEventListener('pointerup', bzLos); document.addEventListener('pointercancel', bzLos);
document.addEventListener('contextmenu', (ev) => { if (ev.target.closest?.('.bz-rgriff, .bz-ggriff')) ev.preventDefault(); });
/** Name einer Kategorie setzen (Kategorien-Liste und Stift im Baum): eigene Kategorien tragen ihren Namen selbst, feste bekommen einen eigenen Namen. */
function katNameSetzen(id, wert) {
  const eig = Z.kategorien.eigene.some((c) => c.id === id);
  if (eig && wert.trim()) Z.kategorien = { ...katUmbenennen(Z.kategorien, id, ''), eigene: Z.kategorien.eigene.map((c) => (c.id === id ? { ...c, de: wert.trim() } : c)) }; else if (!eig) Z.kategorien = katUmbenennen(Z.kategorien, id, wert);
}


/* ---------- Bilder-Ordner ---------- */
function bilderHtml() {
  const B = s.bilder, mit = Z.rezepte.filter((r) => istInhalt(r) && r.img), ohne = Z.rezepte.filter((r) => istInhalt(r) && !r.img);
  if (!['alle', 'eigene', 'beispiele'].includes(B.filter)) B.filter = 'alle';   /* den Filter „Food-Zine“ gibt es seit 0.16 nicht mehr: die Food-Zine-Bilder haben ihre eigene Sammlung (Kreativbuch) */
  const gez = mit.filter((r) => B.filter === 'alle' || (B.filter === 'beispiele' ? r.beispiel : !r.beispiel));
  for (const u of [...B.wahl]) if (!gez.some((r) => r.uid === u)) B.wahl.delete(u);
  return `<div class="ueber"><h2 style="font-size:19px">${L('Bilder', 'Pictures')}</h2><small>${fuelle(L('{0} Bilder · {1} Rezepte ohne Bild', '{0} pictures · {1} recipes without a picture'), mit.length, ohne.length)}</small></div>
   <div class="laeden">${[['alle', L('Alle', 'All')], ['eigene', L('Eigene', 'Own')], ['beispiele', L('Beispiele', 'Examples')]].map(([f, t]) => `<button class="chip" data-a="bilder-filter" data-f="${f}" aria-pressed="${B.filter === f}">${t}</button>`).join('')}<button class="chip" data-a="bilder-gross" aria-pressed="${B.gross}">${ic('voll')}${B.gross ? L('Groß', 'Large') : L('Klein', 'Small')}</button>${frag(L('Tippe Bilder an, um sie auszuwählen. „Löschen“ entfernt nur das Bild; das Rezept mit seinem Text bleibt.', 'Tap pictures to select them. “Delete” removes only the picture; the recipe with its text stays.'))}</div>
   <div class="reihe" style="margin-bottom:10px"><button class="knopf rot" data-a="bilder-weg" ${B.wahl.size ? '' : 'disabled'}>${ic('muell')}${fuelle(L('Löschen ({0})', 'Delete ({0})'), B.wahl.size)}</button><button class="knopf" data-a="bilder-alle-wahl">${B.wahl.size === gez.length && gez.length ? L('Auswahl aufheben', 'Clear selection') : L('Alle auswählen', 'Select all')}</button><button class="knopf rot" data-a="bilder-alle-weg" ${mit.length ? '' : 'disabled'}>${L('Alle Bilder löschen', 'Delete all pictures')}</button>${ZU.sammelKnopf()}</div>
   <div class="bildgitter ${B.gross ? 'gross' : ''}">${gez.map((r) => `<button class="bildkachel" data-a="bild-wahl" data-uid="${esc(r.uid)}" aria-pressed="${B.wahl.has(r.uid)}"><img src="${esc(r.img)}" alt="" loading="lazy"><span class="hk">${B.wahl.has(r.uid) ? ic('haken') : ''}</span><span class="bn">${esc(r.name)}</span></button>`).join('') || `<p class="quelle">${L('Keine Bilder in dieser Auswahl.', 'No pictures in this selection.')}</p>`}</div>
   ${ohne.length ? `<div class="gruppe"><h3>${L('Rezepte ohne Bild', 'Recipes without a picture')}</h3><div class="liste">${ohne.map((r) => `<button class="zeile" data-a="bild-dazu" data-uid="${esc(r.uid)}">${ic('kamera')}<span>${esc(r.name)}<small>${L('Foto einfügen', 'Add photo')}</small></span></button>`).join('')}</div></div>` : ''}`;
}
/* Bild anpassen: Ausschnitt ziehen, Zoom, schnelle Lagen. Gespeichert in r.imgCrop wie in der alten App. */
let zs = null;
/* Klaus 25.11. (R10): „Bild anpassen“ geht im Vollbild auf, auch am Handy. Der Rahmen hat die Form des Kopfbilds, die Vorschauen Karte und
   Kopfbild sind aus den echten Maßen der Seite gerechnet. Die übrigen Bildwege stehen unten rechts am Bild. */
function bildMasse() {
  const v = (el) => { const b = el?.getBoundingClientRect(); return b && b.width > 20 && b.height > 20 ? b.width / b.height : 0; };
  let karte = v(document.querySelector('.karte .bild'));
  if (!karte) { const k = document.createElement('div'); k.style.cssText = 'position:absolute;left:-9999px;top:0;width:180px;visibility:hidden'; k.innerHTML = '<span class="karte"><span class="bild"></span></span>'; $('main').appendChild(k); karte = v(k.querySelector('.bild')); k.remove(); }
  const kopf = v(document.querySelector('.rezept-held>img')) || v(document.querySelector('.rezept-held'));
  return { karte: +(karte || 4 / 3).toFixed(4), kopf: +(kopf || 3 / 2).toFixed(4) };
}
function zuschnittFenster(uid) {
  const r = rezept(uid); if (!r?.img) { bildBlatt(uid); return; }
  zs = { uid, x: zahl(r.imgCrop?.x, 50), y: zahl(r.imgCrop?.y, 50), z: Math.min(3, Math.max(1, zahl(r.imgCrop?.scale, 1))) };
  const m = bildMasse(), bw = (w, i, t, kl = '') => `<button class="bv-k ${kl}" data-a="bv-werk" data-w="${w}" aria-label="${esc(t)}" title="${esc(t)}">${ic(i)}<span>${esc(t)}</span></button>`;
  fensterZu();
  $('fensterort').innerHTML = `<div class="bildvoll" role="dialog" aria-modal="true" aria-label="${L('Bild anpassen', 'Adjust picture')}" style="--vh:${m.kopf};--vk:${m.karte}">
   <div class="bv-kopf"><h2>${L('Bild anpassen', 'Adjust picture')}<small>${esc(zeig(r).name)}</small></h2><button class="voll-x" data-a="bv-zu" aria-label="${L('Schließen', 'Close')}">${ic('x')}</button></div>
   <div class="bv-bildort"><div class="zs-rahmen" id="zs-rahmen"><img src="${esc(r.img)}" alt="" draggable="false" id="zs-bild"></div>
    <div class="bv-werk" role="toolbar" aria-label="${L('Bild', 'Picture')}">${bw('bild-dazu', 'kamera', L('Bild ersetzen', 'Replace picture'))}${bw('ki-bild', 'funken', L('Bild von der KI erzeugen', 'Create picture with AI'))}${bw('gratis-bild', 'bild', L('Foto über Pollinations', 'Photo via Pollinations'))}${bw('zine', 'zine', L('Food-Zine', 'Food zine'))}${bw('bild-entfernen', 'muell', L('Bild entfernen', 'Remove picture'), 'rot')}</div></div>
   <div class="bv-regler"><div class="laeden">${[[L('Mitte', 'Centre'), '50,50'], [L('Oben', 'Top'), '50,0'], [L('Unten', 'Bottom'), '50,100'], [L('Links', 'Left'), '0,50'], [L('Rechts', 'Right'), '100,50']].map(([t, l]) => `<button class="chip" data-a="zs-lage" data-l="${l}">${t}</button>`).join('')}</div>
   <label class="zs-regler">${L('Zoom', 'Zoom')}<input type="range" id="zs-zoom" min="100" max="300" value="${Math.round(zs.z * 100)}"><b id="zs-wert"></b></label>
   <div class="zs-vor"><div><span class="vk"><img src="${esc(r.img)}" alt=""></span>${L('Karte', 'Card')}</div><div><span class="vh"><img src="${esc(r.img)}" alt=""></span>${L('Kopfbild', 'Header picture')}</div></div>
   <div class="reihe"><button class="knopf akz" data-a="zs-ok">${ic('haken')}${L('Übernehmen', 'Apply')}</button><button class="knopf" data-a="zs-null">${L('Zurücksetzen', 'Reset')}</button><button class="knopf" data-a="bv-zu">${L('Abbrechen', 'Cancel')}</button></div></div></div>`;
  history.pushState({ ...(history.state || { ansicht: s.ansicht, uid: s.uid }), voll: true }, '');
  zsZeigen();
}
function zsZeigen() { if (!zs) return; document.querySelectorAll('#zs-bild, .zs-vor img').forEach((i) => { i.style.objectPosition = `${zs.x}% ${zs.y}%`; i.style.transformOrigin = `${zs.x}% ${zs.y}%`; i.style.transform = `scale(${zs.z})`; }); const w = $('zs-wert'); if (w) w.textContent = zs.z.toLocaleString(geb(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '×'; }
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
const IMP = () => [['selbst', 'stift', L('Schreiben', 'Write'), WF.gelb], ['scan', 'kamera', L('Foto', 'Photo'), WF.koralle], ['web', 'welt', L('Web', 'Web'), WF.blau], ['text', 'datei', L('Text', 'Text'), WF.petrol], ['datei', 'ordner', L('Datei', 'File'), WF.violett], ['pakete', 'paket', L('Beispiele', 'Examples'), WF.gruen]];
const impKnopf = ([t, i, n, kc], gewaehlt) => `<button style="--kc:${kc}" ${t === 'selbst' ? 'data-a="neu-form"' : t === 'datei' ? 'data-a="einlesen"' : `data-a="neu-tab" data-t="${t}"`} ${gewaehlt == null ? '' : `role="tab" aria-selected="${gewaehlt}" aria-label="${n}" title="${n}"`}>${gewaehlt == null ? kfeld(i) : ic(i)}${gewaehlt === false ? '' : `<span>${n}</span>`}</button>`;
function neuFenster(tab = '') {
  const inhalt = {
    scan: scanInhalt, web: webInhalt,
    text: () => `<span class="mitmik"><textarea class="feld" id="imp-text" style="min-height:150px" placeholder="${L('Rezepttext einfügen', 'Paste the recipe text')}" aria-label="${L('Rezepttext', 'Recipe text')}"></textarea>${mik('#imp-text')}</span><button class="knopf akz gross" data-a="imp-text" title="${L('Teilt den Text ohne KI in Name, Zutaten und Schritte', 'Splits the text into name, ingredients and steps without AI')}">${ic('haken')}${L('Aufteilen', 'Split')}</button>`,
    pakete: () => `<button class="knopf akz gross" data-a="beispiel">${ic('laden')}<span>${L('Beispielbuch laden', 'Load example book')}</span><small>${esc(beispielText())}</small></button>`,
  };
  if (!inhalt[tab]) { fenster(`<h2>${L('Neues Rezept', 'New recipe')}</h2><div class="imp-tabs" role="group" aria-label="${L('Wege zu einem neuen Rezept', 'Ways to a new recipe')}">${IMP().map((x) => impKnopf(x)).join('')}</div>`); return; }
  fenster(`<div class="imp-reihe" role="tablist" aria-label="${L('Wege zu einem neuen Rezept', 'Ways to a new recipe')}">${IMP().map((x) => impKnopf(x, x[0] === tab)).join('')}</div><div class="imp-p" data-weg="${tab}">${inhalt[tab]()}</div>`);
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
  const wahl = `<details class="mehr" id="scan-mehr" ${s.scanMehr ? 'open' : ''}><summary>${ic('funken')}<span>${an === 'mistral' ? 'Mistral + Claude' : 'Claude'} · ${esc(Lk(STUFEN[st].name[0], STUFEN[st].name[1]))}</span></summary>
   <div class="scan-wahl">${[['anthropic', 'Claude'], ['mistral', 'Mistral (EU)']].map(([a, t]) => `<button class="chip" data-a="scan-anbieter" data-w="${a}" aria-pressed="${an === a}" title="${esc(tip[a])}">${esc(t)}</button>`).join('')}</div>
   <div class="scan-wahl">${Object.entries(STUFEN).map(([k, x]) => `<button class="chip" data-a="scan-stufe" data-w="${k}" aria-pressed="${st === k}" title="${esc(tip[k] || '')}">${esc(Lk(x.name[0], x.name[1]))}</button>`).join('')}</div></details>`;
  if (!n) return `<div class="zwei-gross"><button class="knopf gross" style="--kc:${WF.koralle}" data-a="scan-kamera">${kfeld('kamera')}${L('Kamera', 'Camera')}</button><button class="knopf gross" style="--kc:${WF.violett}" data-a="scan-datei" title="${L('Fotos oder PDFs wählen; mehrere werden nacheinander gelesen', 'Choose photos or PDFs; several are read one after another')}">${kfeld('ordner')}${L('Datei', 'File')}</button><button class="knopf gross" style="--kc:${WF.gelb}" data-a="scan-teller" title="${L('Ein fertiges Gericht fotografieren; Claude schlägt ein Rezept dazu vor', 'Take a picture of a finished dish; Claude suggests a recipe for it')}">${kfeld('teller')}${L('Vom Teller', 'From the plate')}</button></div>${wahl}`;
  const weg = rund('scan-neu', 'x', n === 1 ? L('Andere Datei', 'Other file') : L('Andere Dateien', 'Other files'));
  if (n === 1) { const v = sc.v, d = sc.dateien[0];
    if (fundeZumEntscheiden(v.liste).length && !sc.entschieden) return `<div class="scan-fund" data-ki-halt><div class="fund-bilder ${sc.gross ? 'gross' : ''}" data-a="fund-gross" role="button" tabindex="0" aria-label="${L('Fundstellen größer oder kleiner zeigen', 'Show the marked passages larger or smaller')}">${v.marken.map((m) => `<img src="${esc(m.bild)}" alt="${esc(fundName(v.liste, spr()))}, ${L('Seite', 'page')} ${m.seite}">`).join('')}<span class="fund-name">${ic('schild')}${esc(fundName(v.liste, spr()))}</span></div>
      <div class="reihe"><button class="knopf akz gross" data-a="scan-raus" title="${L('Die markierten Stellen gehen nicht mit an die KI; die Datei bleibt, wie sie ist', 'The marked passages are not sent to the AI; the file stays as it is')}">${ic('haken')}${L('Entfernen', 'Remove')}</button><button class="knopf gross" data-a="scan-rein" title="${L('Die Seiten gehen so an die KI, wie sie sind', 'The pages go to the AI as they are')}">${L('Drin lassen', 'Keep')}</button>${weg}</div></div>`;
    return `<div class="scan-vor" title="${esc(d.name || '')}">${v.bilder.slice(0, 6).map((b) => `<img src="${esc(b)}" alt="">`).join('')}${v.bilder.length > 6 ? `<span>+${v.bilder.length - 6}</span>` : ''}</div>
     <div class="reihe"><button class="knopf akz gross" data-a="scan-senden" title="${esc(wasGehtHinaus(v, sc.teller ? 'anthropic' : an, spr()))}">${ic(sc.teller ? 'teller' : 'scan')}<span>${sc.teller ? L('Rezept vorschlagen', 'Suggest a recipe') : L('Rezept lesen', 'Read recipe')}</span><small id="scan-was">${esc(wohinKurz(v, sc.teller ? 'anthropic' : an, spr()))}</small></button>${rund('scan-pruefen', 'schild', L('Datei gründlich prüfen (im Gerät, auch Text im Bild)', 'Check the file thoroughly (on this device, including text in the picture)'))}${weg}</div>${wahl}`; }
  const lang = L('Je Foto geht die verkleinerte Fassung ohne Aufnahmedaten hinaus, je PDF die gereinigten Seitenbilder (höchstens 10 Seiten). Versteckter Text geht nicht mit. Jede gelesene Datei wird gleich eingetragen; das Ganze lässt sich rückgängig machen.', 'Per photo the reduced version without capture data is sent, per PDF the cleaned page images (10 pages at most). Hidden text is not sent. Each file that was read is added right away; the whole run can be undone.');
  return `<p class="scan-liste" title="${esc(sc.dateien.map((d) => d.name).join(', '))}">${sc.dateien.slice(0, 4).map((d) => esc(d.name)).join(' · ')}${n > 4 ? ' …' : ''}</p>
   <div class="reihe"><button class="knopf akz gross" data-a="scan-senden" title="${esc(lang)}">${ic('scan')}<span>${fuelle(L('{0} Dateien lesen', 'Read {0} files'), n)}</span><small id="scan-was">${an === 'mistral' ? L('Mistral, dann Anthropic', 'Mistral, then Anthropic') : 'Anthropic'}</small></button>${weg}</div>${wahl}`;
}
async function scanGewaehlt(dateien) {
  dateien = dateien.filter((d) => istPdf(d) || istBild(d)); if (!dateien.length) { melde(L('Bitte Fotos oder PDFs wählen.', 'Please choose photos or PDFs.')); return; }
  s.scan = { dateien, v: null, entschieden: '', gross: false, teller: !!s.tellerWahl && dateien.length === 1 && istBild(dateien[0]) }; s.tellerWahl = false;   /* „Vom Teller“: ein Foto eines fertigen Gerichts */
  if (dateien.length === 1) { try { s.scan.v = await W.mit(L('Datei wird vorbereitet …', 'Preparing the file …'), (w) => vorbereiten(dateien[0], { sprache: spr(), fortschritt: (i, n) => { w.anteil(n ? (i - 1) / n : null); w.text(fuelle(L('Seite {0} von {1} wird gezeichnet …', 'Drawing page {0} of {1} …'), i, n)); } })); } catch (f) { s.scan = null; melde(f.message); } }
  neuFenster('scan');
}
const naechsteId = () => Z.rezepte.reduce((m, r) => Math.max(m, +r.id || 0), 0) + 1;
async function scanSenden() {
  const sc = s.scan; if (!sc || !sc.dateien.length) return;
  if (!SK.anthropic) { schluesselFenster('anthropic', 'scan'); return; }
  if (E.scan.anbieter === 'mistral' && !SK.mistral && !sc.teller) { schluesselFenster('mistral', 'scan'); return; }
  const kats = scanKats(), opt = { anbieter: E.scan.anbieter, stufe: E.scan.stufe, schluessel: SK, kategorien: kats, sprache: spr() }, n = sc.dateien.length;
  fensterZu();
  if (n === 1) {
    try {
      const roh = await W.mit(sc.teller ? L('Claude sieht sich das Gericht an …', 'Claude is looking at the dish …') : L('Rezept wird gelesen …', 'Reading the recipe …'), (w) => erkennen(sc.v, { ...opt, vomTeller: !!sc.teller, fortschritt: (t) => w.text(t), beiAnweisung: befehlFrage })), r = rezeptAusScan(roh, { kategorien: kats, bild: sc.v.store, sprache: spr() });
      s.form = { ...formAus(null), name: r.name, cat: r.cat, servings: r.servings, prepTime: r.prepTime ?? '', img: r.img, ings: r.ings.map(zutatZeile).join('\n'), steps: r.steps.map((x) => x.txt).join('\n\n'), flavors: r.flavors, kiEntfernt: sc.v.liste.filter((e) => e.grund === 'meta' || sc.v.zugedeckt) };
      const vorschlag = !!sc.teller; s.scan = null; geh('form'); melde(vorschlag ? L('Ein Vorschlag. Bitte prüfen.', 'A suggestion. Please check.') : L('Gelesen. Bitte prüfen.', 'Read. Please check.'));
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
  return `<div class="ueber"><h2 style="font-size:19px">${f.neu ? L('Neues Rezept', 'New recipe') : L('Rezept bearbeiten', 'Edit recipe')}</h2></div>${f.ueb ? `<p class="ab-hin" id="form-ueb">${esc(fuelle(L('Du bearbeitest die Übersetzung ({0}).', 'You are editing the translation ({0}).'), sprachName(f.ueb)))}</p>` : ''}
  <form class="felder" data-form="rezept">
   <label>${L('Name', 'Name')}<input class="feld" name="name" value="${esc(f.name)}" required autocomplete="off"></label>
   <div class="zwei"><label>${L('Kategorie', 'Category')}<select class="feld" name="cat"><option value="">${L('ohne Kategorie', 'no category')}</option>${kats.map((c) => `<option value="${esc(c.id)}" ${f.cat === c.id ? 'selected' : ''}>${esc(katName(c))}</option>`).join('')}</select></label>
   <label>${L('Neue Kategorie (statt Auswahl)', 'New category (instead of choosing)')}<input class="feld" name="katneu" placeholder="${L('z. B. Sushi', 'e.g. sushi')}" autocomplete="off"></label></div>
   ${Z.ordner.length ? `<label>${L('Ordner', 'Folder')}<select class="feld" name="folder"><option value="">${L('kein Ordner', 'no folder')}</option>${Z.ordner.map((o) => `<option value="${esc(o.id)}" ${String(o.id) === String(f.folder || '') ? 'selected' : ''}>${esc(ordTitel(o))}</option>`).join('')}</select></label>` : ''}
   <div class="zwei"><label>${L('Portionen', 'Servings')}<input class="feld" name="servings" type="number" min="1" max="99" value="${esc(f.servings)}"></label><label>${L('Zeit in Minuten', 'Time in minutes')}<input class="feld" name="prepTime" type="number" min="0" max="999" value="${esc(f.prepTime ?? '')}"></label></div>
   <label>${L('Zutaten, eine je Zeile (z. B. „200 g Mehl“)', 'Ingredients, one per line (e.g. “200 g flour”)')}<span class="mitmik"><textarea class="feld" name="ings" id="f-ings">${esc(f.ings)}</textarea>${mik('#f-ings')}</span></label>
   <label>${L('Schritte, einer je Absatz', 'Steps, one per paragraph')}<span class="mitmik"><textarea class="feld" name="steps" id="f-steps" style="min-height:170px">${esc(f.steps)}</textarea>${mik('#f-steps')}</span></label>
   <div class="formbild">${f.img ? `<img src="${esc(f.img)}" alt="">` : ''}<button type="button" class="knopf" data-a="bild-waehlen">${ic('kamera')}${f.img ? L('Anderes Foto', 'Other photo') : L('Foto dazu', 'Add a photo')}</button>${f.img ? `<button type="button" class="knopf" data-a="bild-weg">${L('Foto entfernen', 'Remove photo')}</button>` : ''}</div>
   <div class="reihe"><button class="knopf akz" type="submit">${ic('haken')}${L('Speichern', 'Save')}</button><button class="knopf" type="button" data-a="zurueck">${L('Abbrechen', 'Cancel')}</button></div>
  </form>`;
}
function formAus(r) {
  return { neu: !r, uid: r?.uid || null, name: r?.name || '', cat: r?.cat || (s.kat !== 'alle' && s.kat !== KAT_OHNE && !s.kat.startsWith('ordner:') ? s.kat : ''), folder: r ? ordnerVonRezept(r, Z.ordner) : (s.kat.startsWith('ordner:') ? s.kat.slice(7) : ''), servings: r?.servings || 4, prepTime: r?.prepTime ?? '', img: r?.img || '',
    ings: (r?.ings || []).map(zutatZeile).join('\n'), steps: (r?.steps || []).map((x) => x.txt).join('\n\n') };
}
function formLesen(form) { const d = new FormData(form); for (const k of ['name', 'cat', 'servings', 'prepTime', 'ings', 'steps']) s.form[k] = d.get(k); if (d.has('folder')) s.form.folder = d.get('folder'); return d; }
/* Das Formular kennt nur den Text der Schritte. Was ein Schritt sonst trägt (seine Notiz), bleibt: zuerst am gleichen Text;
   bleiben danach gleich viele alte und neue Schritte übrig, der Reihe nach (ein umgeschriebener Schritt behält seine Notiz). */
function schritteMitNotiz(texte, alte) {
  const rest = (alte || []).map((x) => ({ x, frei: true }));
  const aus = texte.map((txt) => { const a = rest.find((y) => y.frei && String(y.x.txt).trim() === txt.trim()); if (a) a.frei = false; return a ? { ...a.x, txt } : null; });
  const offen = rest.filter((y) => y.frei), paaren = aus.filter((x) => !x).length === offen.length; let j = 0;
  return aus.map((x, i) => x || (paaren ? { ...offen[j++].x, txt: texte[i] } : { txt: texte[i] }));
}
function formSpeichern(form) {
  const d = formLesen(form), f = s.form;
  if (!String(f.name).trim()) { melde(L('Bitte einen Namen eintragen.', 'Please enter a name.')); return; }
  let cat = f.cat; const katneu = String(d.get('katneu') || '').trim();
  if (katneu) {
    const da = alleKategorien(Z.rezepte, Z.kategorien).find((c) => katName(c).toLowerCase() === katneu.toLowerCase());
    if (da) cat = da.id; else { cat = 'eig_' + Date.now().toString(36); Z.kategorien = { ...Z.kategorien, eigene: [...Z.kategorien.eigene, { id: cat, de: katneu, symbol: 'karte' }] }; }
  }
  const alt = f.uid ? rezept(f.uid) : null, basis = alt && f.ueb ? sicht(alt, f.ueb) : alt, vor = basis ? formAus(basis) : null, zeilen = (t) => String(t ?? '').replace(/\r\n?/g, '\n');
  const textBlieb = !!vor && ['name', 'ings', 'steps'].every((k) => zeilen(vor[k]) === zeilen(f[k]));   /* nur Kategorie, Portionen, Zeit oder Foto geändert: eine Übersetzung bleibt */
  const roh = normalisiere({ ...(alt || { id: Z.rezepte.reduce((m, r) => Math.max(m, +r.id || 0), 0) + 1, uid: neueUid(), created: new Date().toISOString() }), name: f.name, cat, ...(findeOrdner(Z.ordner, f.folder) || f.folder === '' ? { folder: f.folder || '' } : {}), servings: f.servings, prepTime: f.prepTime === '' ? undefined : +f.prepTime, img: f.img,
    ings: String(f.ings).split('\n').filter((t) => t.trim()).map(zutatAusZeile), steps: schritteMitNotiz(String(f.steps).split(/\n\s*\n|\n/).filter((t) => t.trim()), alt ? alt.steps : []), modified: new Date().toISOString() });
  const danach = (uid) => { s.form = null; if (!(f.notiz && NB.uebernommen(f.notiz, uid))) melde(L('Gespeichert', 'Saved')); geh(s.formVon === 'baum' && breit() ? 'baum' : 'rezept', { uid }, true); };
  if (alt && f.ueb && !textBlieb) { fassungFrage(alt, roh, f.ueb, () => danach(alt.uid)); return; }   /* eine Übersetzung bearbeitet: einmal fragen */
  const neu = ohneAlteUebersetzung(alt, alt && f.ueb ? { ...roh, name: alt.name, ings: alt.ings, steps: alt.steps } : roh, textBlieb);
  delete neu.beispiel; if (f.neu && f.flavors?.length) neu.flavors = f.flavors; if (f.neu && f.source) neu.source = f.source; if (f.kiEntfernt?.length) vermerken(neu, f.kiEntfernt, 'scan');   /* was vor der KI herausgenommen wurde, steht am Rezept */
  Z.rezepte = alt ? Z.rezepte.map((r) => (r.uid === alt.uid ? neu : r)) : [...Z.rezepte, neu];
  sichern(); danach(neu.uid);

}

/* ---------- Einstellungen (Klaus 23.11.: „Werkstatt, was willst du da umbauen? Da wird nur eingestellt.“ Die Ansicht heißt im Code weiter `werkstatt`.) ---------- */
const zeile = (a, i, t, u, extra = '') => `<button class="zeile" data-a="${a}" ${extra}>${ic(i)}<span>${esc(t)}${u ? `<small>${esc(u)}</small>` : ''}</span>${ic('rechts', 'pf')}</button>`;
const frag = (t) => `<details class="frag"><summary aria-label="${L('Erklärung', 'Explanation')}">?</summary><p>${esc(t)}</p></details>`;
/* Klaus 23.11.: keine langen Listen. Sechs Themen; ein Tipp klappt eines auf. Erklärungen stehen hinter „?“ in der Kopfzeile des Themas. */
function werkstattHtml() {
  const n = Z.rezepte.filter(istInhalt).length, b = Z.rezepte.filter((r) => r.beispiel).length, bilder = Z.rezepte.filter((r) => istInhalt(r) && r.img).length;
  const themen = [
    ['sichern', 'tresor', WF.gruen, L('Sichern', 'Backup'), L('Die Rezepte liegen nur in diesem Gerät. Eine Sicherung als Datei schützt sie, wenn der Browser geleert wird, und bringt sie auf ein anderes Gerät; sie liest auch Dateien der alten App, aus Muttis Rezeptbuch und dem Mixarium. Der Tresor hält dazu mehrere Stände im Gerät (fünf automatische, zehn benannte) und hilft, wenn etwas falsch gelöscht oder eingelesen wurde. KI-Schlüssel kommen nie in eine Sicherung.', 'The recipes are stored on this device only. A backup file protects them when the browser is cleared and takes them to another device; it also reads files of the old app, Muttis Rezeptbuch and the Mixarium. The vault additionally keeps several states on the device (five automatic, ten named) and helps when something was deleted or imported by mistake. AI keys never go into a backup.'),
      zeile('sichern', 'laden', L('Sicherung als Datei', 'Backup as a file')) + (navigator.canShare ? zeile('sicherung-teilen', 'teilen', L('Sicherung teilen', 'Share backup'), L('Quick Share, Bluetooth, E-Mail …', 'Quick Share, Bluetooth, email …')) : '') + zeile('einlesen', 'ordner', L('Sicherung einlesen', 'Read a backup')) + zeile('tresor', 'tresor', L('Tresor', 'Vault'))],
    ['ki', 'funken', WF.violett, L('KI-Schlüssel', 'AI keys'), L('KI läuft nur mit deinem eigenen Schlüssel und nur, wenn du es auslöst. Anthropic (Claude) liest Fotos und Webseiten, OpenAI malt Bilder, Mistral liest Text (EU). Ein Schlüssel bleibt in diesem Gerät und kommt in keine Sicherung; die Kosten rechnet der Anbieter direkt mit dir ab.', 'AI runs only with your own key and only when you start it. Anthropic (Claude) reads photos and web pages, OpenAI draws pictures, Mistral reads text (EU). A key stays on this device and is in no backup; the provider bills you directly.'),
      `<div id="schl-liste">${Object.keys(ANBIETER).map((a) => zeile('schluessel', 'schluessel', ANBIETER[a].name, SK[a] ? L('gespeichert', 'saved') : L('noch keiner', 'none yet'), `data-anbieter="${a}"`)).join('')}</div>` + kiZeile('alle-uebersetzen', 'welt', L('Alle übersetzen', 'Translate all'), helferHinaus('uebersetzung', Z.rezepte.find(istInhalt) || { name: '–' }, spr()))],
    ['ordnung', 'karte', WF.gelb, L('Ordnung', 'Order'), '',
      zeile('geh', 'ordner', L('Alle Ordner und Kategorien als Baum', 'All folders and categories as a tree'), '', 'data-zu="baum"') + zeile('geh', 'karte', L('Kategorien', 'Categories'), '', 'data-zu="kategorien"') + zeile('geh', 'bild', L('Bilder', 'Pictures'), String(bilder), 'data-zu="bilder"')],
    ['aussehen', 'auge', WF.blau, L('Darstellung', 'Appearance'), '',
      zeile('sprache', 'welt', L('Sprache', 'Language'), E.sprache ? sprachName(E.sprache) : L('wie das Gerät', 'same as device')) + zeile('farbe', 'auge', L('Farbe, hell und dunkel', 'Colour, light and dark'), farbName(E.farbe) + ' · ' + Lk(TOENE[E.ton] || '', TOENE_EN[E.ton] || '')) + zeile('schrift', 'stift', L('Schriftgröße', 'Text size'), schriftWert(E.schrift) + ' %') + zeile('kontrast', 'kontrast', L('Hoher Kontrast', 'High contrast'), E.kontrast ? L('an', 'on') : L('aus', 'off'), `aria-pressed="${!!E.kontrast}"`) + zeile('einheiten', 'waage', L('Einheiten', 'Units'), einhName()) + zeile('hinweise', 'frage', L('Hinweis-Blasen', 'Tooltips'), E.hinweiseAus ? L('aus', 'off') : L('an', 'on'), `aria-pressed="${!E.hinweiseAus}"`) + (INST.zeigen() ? zeile('installieren', 'laden', L('Als App installieren', 'Install as an app')) : '')],
    ['beispiele', 'paket', WF.petrol, L('Beispiele', 'Examples'), '',
      zeile('beispiel', 'paket', L('Beispielbuch laden', 'Load example book'), beispielText()) + ZI.beispielZeile(zeile) + (b ? zeile('beispiele-weg', 'muell', L('Beispiele entfernen', 'Remove examples'), String(b)) : '')],
    ZU.hilfeThema(zeile, '#7d8794'),
    ['aufraeumen', 'muell', WF.koralle, L('Aufräumen', 'Clean up'), '', zeile('alles-weg', 'muell', L('Alle Rezepte löschen', 'Delete all recipes'), L('mit Rückfrage', 'asks first'))],
  ];
  return `<div class="ueber"><h2 style="font-size:19px">${L('Einstellungen', 'Settings')}</h2><small>${fuelle(L('{0} Rezepte', '{0} recipes'), n)}</small></div>
  <div class="themen">${themen.map(([id, i, kc, titel, hilfe, zeilen]) => { const auf = s.werkAuf.has(id);
    return `<div class="gruppe ${auf ? 'auf' : ''}" data-g="${id}" style="--kc:${kc}"><div class="gkopf-zeile"><button class="gkopf" data-a="werk-auf" data-g="${id}" aria-expanded="${auf}">${kfeld(i)}<span>${esc(titel)}</span>${ic(auf ? 'hoch' : 'rechts', 'pf')}</button>${auf && hilfe ? frag(hilfe) : ''}</div>${auf ? `<div class="liste">${zeilen}</div>` : ''}</div>`; }).join('')}</div>
  <p class="quelle" id="fassung">${esc(ausgabe.titel)} ${FASSUNG}</p>`;   /* kein Verweis auf die bisherige App (Klaus 23.11.: „Wir müssen nicht auf eine schlechtere Version verweisen.“) */
}

/* ---------- Kreativbuch (Klaus 25.11., R12): Bücher und Food-Zine als eigener Bereich in der Leiste, nicht mehr in den Einstellungen ---------- */
function kreativHtml() {
  const n = Z.rezepte.filter(istInhalt).length, zine = ZI.anzahl();
  return `<div class="ueber"><h2 style="font-size:19px">${L('Kreativbuch', 'Creative book')}</h2>${frag(L('Aus deinen Rezepten wird ein Buch: als PDF zum Drucken, als Datei zum Blättern, als Kreativbuch mit Texten von Claude in acht Stilen (mit Schlüssel oder über einen kopierten Auftrag ohne Schlüssel) oder aus eigenen Fotos und PDF-Seiten. Projekte heben ein angefangenes Buch auf. Food-Zine baut den Auftrag für ein Poster, das Claude oder ChatGPT zeichnet; die fertigen Bilder sammelst du unter „Meine Food-Zine-Bilder“.', 'Your recipes become a book: as a PDF to print, as a file to leaf through, as a creative book with texts by Claude in eight styles (with a key or via a copied request without a key), or from your own photos and PDF pages. Projects keep a book you started. Food zine builds the request for a poster that Claude or ChatGPT draws; you collect the finished pictures under “My food zine pictures”.'))}</div>
   <div class="gruppe kr-teil" data-g="buch"><h3>${L('Bücher', 'Books')}</h3><div class="liste">${KB.zeile(zeile)}${zeile('eb-auf', 'bild', L('Buch aus Bildern', 'Book from pictures'), L('eigene Fotos und PDF-Seiten', 'own photos and PDF pages'))}${zeile('kbp-auf', 'ordner', L('Projekte', 'Projects'), L('angefangene Bücher', 'books in progress'))}${zeile('buch', 'drucken', L('Als PDF drucken', 'Print as a PDF'), String(n), 'data-art="pdf"')}${zeile('buch', 'buch', L('Zum Blättern', 'To leaf through'), L('als Datei', 'as a file'), 'data-art="blaettern"')}</div></div>
   <div class="gruppe kr-teil" data-g="zine"><h3>${L('Food-Zine', 'Food zine')}</h3><div class="liste">${zeile('zine-auf', 'zine', L('Food-Zine', 'Food zine'), ZI.stand())}${zeile('kreativ-zine', 'bild', L('Meine Food-Zine-Bilder', 'My food zine pictures'), String(zine))}</div></div>`;
}

/* ---------- Fenster ---------- */
function fenster(html) { const z = zuTun; zuTun = null; z?.(); $('fensterort').innerHTML = `<div class="schleier" data-a="fenster-zu"><div class="fenster" role="dialog" aria-modal="true">${html}</div></div>`; }
function fensterZu() { document.getElementById('frag-blase')?.remove(); $('fensterort').innerHTML = ''; const z = zuTun; zuTun = null; z?.(); }
function frage(titel, text, ja, tun, rot = true) { jaTun = tun; fenster(`<h2>${esc(titel)}</h2><p>${esc(text)}</p><div class="reihe"><button class="knopf ${rot ? 'rot' : 'akz'}" data-a="ja">${esc(ja)}</button><button class="knopf" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`); }
let jaTun = null, zuTun = null;
/* Frage mit Antwort als Zusage (für Abläufe, die warten): Ja → true; Abbrechen, Schleier, Esc → false. html ist fertiges HTML. */
function frageP(titel, html, ja) { return new Promise((fertig) => { fenster(`<h2>${esc(titel)}</h2>${html}<div class="reihe"><button class="knopf akz" data-a="ja">${esc(ja)}</button><button class="knopf" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`); jaTun = () => fertig(true); zuTun = () => fertig(false); }); }
function farbFenster() {
  fenster(`<h2>${L('Farbe', 'Colour')}</h2><div class="laeden" role="radiogroup" aria-label="${L('Hell oder dunkel', 'Light or dark')}" style="margin-bottom:10px">${[['hell', 'sonne', L('Hell', 'Light')], ['dunkel', 'mond', L('Dunkel', 'Dark')]].map(([t, i, n]) => `<button class="chip" role="radio" aria-checked="${E.ton === t}" data-a="ton" data-ton="${t}">${ic(i)}${n}</button>`).join('')}</div><div class="fleckliste" role="menu">${Object.entries(FARBEN).map(([n, f]) => `<button role="menuitemradio" aria-checked="${E.farbe === n}" data-a="farbe-wahl" data-farbe="${n}"><span class="fleck" style="background:linear-gradient(135deg,${f.k[0]},${f.k[2]})"></span>${esc(farbName(n))}</button>`).join('')}</div>`);
}
const farbName = (n) => Lk(FARBEN[n]?.de || '', FARBEN[n]?.en || '');

/* ---------- Sicherung, Beispiele ---------- */
/* ---------- KI-Schlüssel: dieselben Speicher-Namen wie die bisherige App, damit ein dort hinterlegter Schlüssel gilt ---------- */
/* Kern: ki/schluessel.mjs. Die Schlüssel liegen im Kern-Speicher dieses Geräts; einer aus der bisherigen App gilt weiter (nur gelesen). */
let S = null; const SK = { anthropic: '', openai: '', mistral: '', pollinations: '' };
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
  fenster(`<h2>${esc(r.name)}</h2>${r.img ? `<img class="bb-bild" data-a="bild-voll" src="${esc(r.img)}" alt="${esc(r.name)}">` : `<p>${L('Dieses Rezept hat noch kein Bild.', 'This recipe has no picture yet.')}</p>`}
   <div class="liste" style="margin-top:10px">${r.img ? zeile('zuschnitt', 'zuschnitt', L('Ausschnitt anpassen', 'Adjust section'), L('verschieben und vergrößern', 'move and enlarge')) : ''}
   ${zeile('bild-dazu', 'kamera', r.img ? L('Bild ersetzen', 'Replace picture') : L('Bild einfügen', 'Add picture'), L('Foto aufnehmen oder Datei wählen', 'Take a photo or choose a file'), `data-uid="${esc(uid)}"`)}
   ${zeile('ki-bild', 'funken', L('Bild von der KI erzeugen', 'Create picture with AI'), 'OpenAI, ' + kostenBild(), `data-uid="${esc(uid)}"`)}
   ${zeile('gratis-bild', 'bild', L('Foto über Pollinations', 'Photo via Pollinations'), SK.pollinations ? L('mit deinem Pollinations-Schlüssel', 'with your Pollinations key') : L('braucht einen eigenen Pollinations-Schlüssel', 'needs your own Pollinations key'), `data-uid="${esc(uid)}"`)}
   ${zeile('zine', 'zine', L('Food-Zine', 'Food zine'), ZI.stand())}</div>
   <div class="reihe" style="margin-top:10px"><button class="knopf" data-a="fenster-zu">${L('Schließen', 'Close')}</button>${frag(L('Ein Bild löschst du in den Einstellungen unter „Bilder“.', 'You delete a picture in the settings under “Pictures”.'))}</div>`);
}
const kostenBild = () => Lk(KOSTEN.de, KOSTEN.en);
/* Meldungen, die der Kern nur deutsch kennt (Sicherung lesen, Bild erzeugen): hier steht ihr englisches Paar, der deutsche Satz ist der Schlüssel. */
function fehlerText(f, sonst = '') {
  const m = String(f?.message || ''), http = m.match(/^(.*) \(HTTP (\d+)\)\.?$/);
  const fest = { 'Die Datei ist keine gültige Sicherung (kein JSON).': L('Die Datei ist keine gültige Sicherung (kein JSON).', 'The file is not a valid backup (no JSON).'), 'In der Datei stehen keine Rezepte.': L('In der Datei stehen keine Rezepte.', 'There are no recipes in the file.'),
    'Kein Bild erhalten': L('Kein Bild erhalten', 'No picture received'), 'Bild konnte nicht gelesen werden': L('Bild konnte nicht gelesen werden', 'The picture could not be read'), 'Kein OpenAI-Schlüssel': L('Kein OpenAI-Schlüssel', 'No OpenAI key'),
    'Der OpenAI-Schlüssel wurde abgelehnt. Bitte prüfen.': L('Der OpenAI-Schlüssel wurde abgelehnt. Bitte prüfen.', 'The OpenAI key was rejected. Please check it.'), 'OpenAI meldet: Limit erreicht oder kein Guthaben.': L('OpenAI meldet: Limit erreicht oder kein Guthaben.', 'OpenAI reports: limit reached or no credit.'),
    'Pollinations verlangt jetzt einen eigenen Schlüssel.': L('Pollinations verlangt jetzt einen eigenen Schlüssel.', 'Pollinations now requires your own key.'), 'Pollinations lehnt den Schlüssel ab. Bitte prüfen.': L('Pollinations lehnt den Schlüssel ab. Bitte prüfen.', 'Pollinations rejects the key. Please check it.'), 'Pollinations meldet: Guthaben des Kontos aufgebraucht.': L('Pollinations meldet: Guthaben des Kontos aufgebraucht.', 'Pollinations reports: the account’s credit is used up.') };
  if (fest[m]) return fest[m];
  if (http && http[1] === 'Der Gratis-Dienst antwortet nicht') return fuelle(L('Der Gratis-Dienst antwortet nicht (HTTP {0}).', 'The free service does not answer (HTTP {0}).'), http[2]);
  if (http && http[1] === 'Bild-Adresse nicht abrufbar') return fuelle(L('Bild-Adresse nicht abrufbar (HTTP {0})', 'Picture address not reachable (HTTP {0})'), http[2]);
  return m || sonst;
}
async function bildErzeugen(uid, gratis) {
  const r = rezept(uid); if (!r) return; fensterZu();
  const frei = await ZU.bildFreigabe(r, gratis); if (!frei) return;   /* steht im Auftrag ein Befehl an eine KI, entscheidet erst der Mensch */
  try {
    const img = await W.mit(gratis ? L('Gratis-Foto wird erzeugt …', 'Creating free photo …') : L('KI-Bild wird erzeugt (etwa 20 s) …', 'Creating AI picture (about 20 s) …'), async (w) => { const roh = gratis ? await gratisBild(frei, { schluessel: SK.pollinations }) : await kiBild(SK.openai, frei); w.text(L('Bild wird gespeichert …', 'Saving the picture …')); return bildAusDatei(await (await fetch(roh)).blob()); }), vorher = Z.rezepte;
    Z.rezepte = Z.rezepte.map((x) => (x.uid === uid ? { ...x, img, imgCrop: { x: 50, y: 50, scale: 1 } } : x)); sichern(); zeichne();
    melde(r.img ? L('Bild ersetzt', 'Picture replaced') : L('Bild eingefügt', 'Picture added'), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher; sichern(); zeichne(); });
  } catch (f) { const t = fehlerText(f, L('Es kam kein Bild zurück.', 'No picture came back.')); if (gratis && f?.schluessel) melde(t, L('Schlüssel', 'Key'), () => schluesselFenster('pollinations', 'gratis:' + uid)); else melde(t); }
}
/* ---------- Tresor ---------- */
let tr = null;
const datum = (ts) => new Date(ts).toLocaleString(geb(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
/* Der Kern nennt einen Stand ohne eigenen Namen „Automatisch“ oder „Sicherung“; gezeigt wird das in der Sprache der Oberfläche. */
const tresorName = (x) => (x.name === 'Automatisch' ? L('Automatisch', 'Automatic') : x.name === 'Sicherung' ? L('Sicherung', 'Backup') : x.name);
/* Der Stand wird sofort festgehalten (schreibe ist synchron), abgelegt wird nebenher. Der Tresor ist eine Zugabe, er hält nichts auf. */
function tresorAuto() { if (!tr || !Z.rezepte.some(istInhalt)) return Promise.resolve(); const sich = schreibe(Z); return tr.ablegen(sich, 'auto').catch(() => {}); }
async function tresorFenster() {
  const l = await tr.liste().catch(() => []);
  fenster(`<h2>${L('Tresor', 'Vault')}</h2><form data-form="tresor" class="reihe"><input name="name" placeholder="${L('Name, zum Beispiel: vor dem Aufräumen', 'Name, for example: before tidying up')}" style="flex:1;min-width:0"><button class="knopf akz" type="submit">${ic('tresor')}${L('Jetzt sichern', 'Back up now')}</button></form>
   ${l.length ? `<div class="liste tr-liste" style="margin-top:12px">${l.map((x) => `<div class="zeile">${ic(x.art === 'auto' ? 'uhr' : 'tresor')}<span>${esc(tresorName(x))}<small>${esc(datum(x.ts))} · ${fuelle(L('{0} Rezepte', '{0} recipes'), x.anzahl)}</small></span><button class="chip" data-a="tresor-holen" data-id="${esc(x.id)}">${L('Zurückholen', 'Restore')}</button><button class="chip" data-a="tresor-datei" data-id="${esc(x.id)}" aria-label="${L('Als Datei speichern', 'Save as a file')}">${ic('laden')}</button><button class="chip" data-a="tresor-weg" data-id="${esc(x.id)}" aria-label="${L('Diesen Stand löschen', 'Delete this state')}">${ic('muell')}</button></div>`).join('')}</div>` : `<p style="margin-top:12px">${L('Noch kein Stand im Tresor.', 'No state in the vault yet.')}</p>`}
   <div class="reihe" style="margin-top:12px"><button class="knopf" data-a="fenster-zu">${L('Schließen', 'Close')}</button></div>`);
}
function herunterladen(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function einfuegen(eingang, beispiel = false) {
  if (beispiel) eingang = { ...eingang, rezepte: eingang.rezepte.map((r) => ({ ...r, beispiel: true })) };
  tresorAuto(); const h = hinweise(eingang), m = fuehreZusammen(Z, eingang);
  const vorher = Z; Z = m.zustand; ergaenze(); sichern(); s.kat = 'alle'; s.frage = '';
  melde((m.neu === 1 ? L('+1 Rezept', '+1 recipe') : fuelle(L('+{0} Rezepte', '+{0} recipes'), m.neu)) + (m.doppelt ? ' · ' + fuelle(L('{0} schon da', '{0} already there'), m.doppelt) : '') + (h.ohneKategorie ? ' · ' + fuelle(L('{0} ohne Kategorie', '{0} without category'), h.ohneKategorie) : ''), m.neu ? L('Rückgängig', 'Undo') : '', () => { Z = vorher; sichern(); zeichne(true); });
  geh('start', {}, s.ansicht === 'start');
}
/* Klaus 24.11.: nach dem Wählen einer Datei die Wahl „Hinzufügen“ (wie bisher, vorne) oder „Ersetzen“. Beispielpakete fragen nicht. */
let dateiEingang = null;
function dateiFrage(eingang) {
  dateiEingang = eingang; const n = eingang.rezepte.length;
  fenster(`<h2>${L('Datei einlesen', 'Read a file')}</h2><p id="datei-inhalt">${n === 1 ? L('1 Rezept in der Datei', '1 recipe in the file') : fuelle(L('{0} Rezepte in der Datei', '{0} recipes in the file'), n)}</p><div class="reihe"><button class="knopf akz" data-a="datei-dazu">${L('Hinzufügen', 'Add')}</button><button class="knopf" data-a="datei-ersetzen">${L('Ersetzen', 'Replace')}</button><button class="knopf" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`);
  zuTun = () => { dateiEingang = null; };
}
/* Ersetzen (Datei und „Zurückholen“ im Tresor, ein Weg): der jetzige Stand kommt vorher in den Tresor; die Datei ersetzt Rezepte, Ordner,
   Kategorien und Wochenplan, Einkauf und Plan nur, wenn sie welche trägt (fuehreZusammen 'ersetzen' des Kerns). Einstellungen und Schlüssel bleiben. */
async function ersetze(eingang, text) {
  await tresorAuto(); const vorher = Z, h = hinweise(eingang);
  Z = fuehreZusammen(Z, eingang, 'ersetzen').zustand; if (!eingang.plan && eingang.menu.length) Z.plan = null;   // alter Wochenplan ohne Plan: ergaenze baut ihn aus dem Menü
  ergaenze(); s.frage = ''; s.kat = 'alle'; sichern(); geh('start', { uid: null }, true);
  melde(fuelle(text, Z.rezepte.filter(istInhalt).length) + (h.ohneKategorie ? ' · ' + fuelle(L('{0} ohne Kategorie', '{0} without category'), h.ohneKategorie) : ''), L('Rückgängig', 'Undo'), () => { Z = vorher; sichern(); geh('start', { uid: null }, true); });
}
async function beispielLaden() {
  const p = katalog?.pakete?.find((x) => x.id === ausgabe.beispiele[0]); if (!p) { melde(L('Beispielbuch nicht erreichbar', 'Example book not reachable')); return; }
  try {
    const roh = await W.mit(L('Beispielbuch wird geladen …', 'Loading the example book …'), async (w) => { const ant = await fetch('../beispiele/' + p.datei); if (!ant.ok) throw new Error(String(ant.status)); return bytesMitAnteil(ant, (a) => w.anteil(a)); });
    const sum = [...new Uint8Array(await crypto.subtle.digest('SHA-256', roh))].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (sum !== p.sha256) { melde(L('Beispielbuch beschädigt, nicht eingelesen', 'Example book damaged, not imported')); return; }
    einfuegen(lies(new TextDecoder().decode(roh)), true);
  } catch { melde(L('Beispielbuch nicht geladen. Netz?', 'Example book not loaded. Network?')); }
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
  o.className = 'fl ' + lage.seite; document.body.dataset.fl = lage.seite; o.setAttribute('aria-label', L('Bereiche', 'Sections'));
  o.style.top = u ? '' : (s.leisteAuf ? Math.min(70, Math.max(30, lage.pos)) : lage.pos) + '%'; o.style.left = u ? (s.leisteAuf ? 50 : lage.pos) + '%' : '';
  if (!s.leisteAuf) { o.innerHTML = `<button class="fl-griff" data-a="leiste-auf" aria-label="${L('Leiste öffnen: Rezepte, Planer, Einkauf, Einstellungen. Lange drücken oder ziehen verschiebt sie.', 'Open bar: recipes, planner, shopping, settings. Long-press or drag to move it.')}"><span></span></button>`; return; }
  const k = (a, i, t, x = '') => `<button role="menuitem" data-a="${a}" ${x}>${i}${t}</button>`;
  o.innerHTML = `<div class="fl-knoepfe" role="menu"><button class="fl-zu" data-a="leiste-zu" aria-label="${L('Schließen', 'Close')}">${ic('x')}</button>`
    + k('geh', ic('buch'), L('Rezepte', 'Recipes'), `data-zu="start" ${s.ansicht === 'start' ? 'aria-current="page"' : ''}`) + k('geh', ic('ordner'), L('Ordner', 'Folders'), `data-zu="baum" ${s.ansicht === 'baum' ? 'aria-current="page"' : ''}`) + k('geh', ic('plan'), L('Planer', 'Planner'), `data-zu="plan" ${s.ansicht === 'plan' ? 'aria-current="page"' : ''}`)
    + k('geh', ic('einkauf'), L('Einkauf', 'Shopping') + (ekOffen() ? ` <span class="zahl">${ekOffen()}</span>` : ''), `data-zu="einkauf" ${s.ansicht === 'einkauf' ? 'aria-current="page"' : ''}`) + k('geh', ic('zine'), L('Kreativbuch', 'Creative book'), `data-zu="kreativ" ${s.ansicht === 'kreativ' || s.ansicht === 'zine' ? 'aria-current="page"' : ''}`) + k('geh', ic('einst'), L('Einstellungen', 'Settings'), `data-zu="werkstatt" ${s.ansicht === 'werkstatt' ? 'aria-current="page"' : ''}`)
    + '<hr>' + k('nach-oben', ic('hoch'), L('Nach oben', 'To top')) + k('zurueck', ic('zurueck'), L('Zurück', 'Back'))
    + `<hr><div class="fl-werk" role="group" aria-label="${L('Werkzeuge', 'Tools')}">${k('ton', ic('sonne'), L('Hell', 'Light'), `data-ton="hell" aria-pressed="${!istDunkel(E.farbe, E.ton)}"`)}${k('ton', ic('mond'), L('Dunkel', 'Dark'), `data-ton="dunkel" aria-pressed="${istDunkel(E.farbe, E.ton)}"`)}${k('farbe', '<span class="farbknopf"></span>', L('Farbe', 'Colour'))}${k('schrift', '<span class="aa" aria-hidden="true">A<b>A</b></span>', L('Schrift', 'Text'))}${k('sichern', ic('tresor'), L('Sichern', 'Backup'), `class="breit"
 title="${L('Sicherung als Datei speichern', 'Save a backup file')}"`)}</div></div>`;
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

/* ---------- Seitenleiste am breiten Schirm verschieben (Klaus 25.11., R11): lange drücken (oder mit der Maus am Griff ziehen), zur anderen Seite
   ziehen, loslassen: sie rastet links oder rechts ein. Oben und unten gibt es nicht: die Leiste ist eine hohe Spalte mit Namen; quer gelegt
   bräuchte sie eine zweite Gestalt, und der Platz über dem Rezept gehört dem Inhalt. Die Seite steht in den Einstellungen (E.railSeite). ---------- */
let rz = null, railGezogen = 0;
const railZiel = (x) => { let z = $('rail-ziel'); if (!z) { z = document.createElement('div'); z.id = 'rail-ziel'; z.setAttribute('aria-hidden', 'true'); document.body.appendChild(z); } z.className = 'rail-ziel ' + (x > innerWidth / 2 ? 'r' : 'l') + (E.railZu ? ' zu' : ''); };
const railZiehtAn = () => { if (!rz || rz.weit) return; rz.weit = true; document.body.classList.add('rail-zieht'); railZiel(rz.lx ?? rz.x); };
document.addEventListener('pointerdown', (ev) => { if (!breit()) return; const k = ev.target.closest?.('#kopf'); if (!k || ev.button > 0) return; rz = { x: ev.clientX, y: ev.clientY, griff: !!ev.target.closest('.rail-griff'), maus: ev.pointerType === 'mouse', weit: false, uhr: setTimeout(railZiehtAn, 450) }; });
document.addEventListener('pointermove', (ev) => {
  if (!rz) return; rz.lx = ev.clientX;
  if (!rz.weit) { if (Math.hypot(ev.clientX - rz.x, ev.clientY - rz.y) < 8) return; if (rz.griff && rz.maus) railZiehtAn(); else { clearTimeout(rz.uhr); rz = null; return; } }
  railZiel(ev.clientX);
});
const railLos = () => { if (!rz) return; const z = rz; rz = null; clearTimeout(z.uhr); if (!z.weit) return; railGezogen = Date.now(); document.body.classList.remove('rail-zieht'); $('rail-ziel')?.remove();
  const seite = (z.lx ?? z.x) > innerWidth / 2 ? 'r' : 'l'; if (seite !== (E.railSeite === 'r' ? 'r' : 'l')) { E.railSeite = seite; sichern(); zeichne(); } };
document.addEventListener('pointerup', railLos); document.addEventListener('pointercancel', railLos);
document.addEventListener('contextmenu', (ev) => { if (breit() && ev.target.closest?.('#kopf')) ev.preventDefault(); });

/* ---------- Zeichnen ---------- */
function zeichne(einzug = false) {
  kopfZeichnen(); leisteZeichnen();
  const m = $('main'), lesen = ['start', 'rezept', 'kochen'].includes(s.ansicht), formRechts = breit() && s.ansicht === 'form';
  document.body.dataset.rail = E.railSeite === 'r' ? 'r' : 'l';
  if (formRechts) {   /* Klaus 25.11.: am breiten Schirm steht das Formular im Rezeptbereich rechts; die Liste (oder der Baum) bleibt links stehen */
    const alt = m.querySelector('.md-liste')?.scrollTop || 0, ausBaum = s.formVon === 'baum';
    m.innerHTML = `<div class="md ${ausBaum ? 'bz-md' : ''}"><div class="md-liste">${ausBaum ? baumHtml() : startHtml()}</div><div class="md-detail"><div class="md-form">${formHtml()}</div></div></div>`;
    const l = m.querySelector('.md-liste'); if (l) l.scrollTop = alt;
  } else if (breit() && s.ansicht === 'baum') {   /* Explorer am breiten Schirm: Baum links, das gewählte Rezept rechts */
    const alt = m.querySelector('.md-liste')?.scrollTop || 0;
    m.innerHTML = `<div class="md bz-md ${s.nurDies && rezept(s.uid) ? 'nur' : ''}"><div class="md-liste">${baumHtml()}</div><div class="md-detail">${rezept(s.uid) ? rezeptHtml() : `<div class="leer bz-hier"><p>${L('Ein Tipp auf ein Rezept im Baum öffnet es hier.', 'Tap a recipe in the tree to open it here.')}</p></div>`}</div></div>`;
    const l = m.querySelector('.md-liste'); if (l) l.scrollTop = alt;
  } else if (breit() && lesen) {
    if (!rezept(s.uid)) s.uid = (rezept(E.zuletzt) || Z.rezepte.find(istInhalt))?.uid || null;
    const alt = m.querySelector('.md-liste')?.scrollTop || 0;
    m.innerHTML = `<div class="md ${s.nurDies ? 'nur' : ''}"><div class="md-liste">${startHtml()}</div><div class="md-detail">${rezept(s.uid) ? rezeptHtml() : ''}</div></div>`;
    const l = m.querySelector('.md-liste'); if (l) l.scrollTop = alt;
  } else m.innerHTML = s.ansicht === 'rezept' || s.ansicht === 'kochen' ? rezeptHtml() : s.ansicht === 'form' ? formHtml() : s.ansicht === 'werkstatt' ? werkstattHtml() : s.ansicht === 'einkauf' ? einkaufHtml() : s.ansicht === 'plan' ? planHtml() : s.ansicht === 'kategorien' ? kategorienHtml() : s.ansicht === 'ordner' ? baumHtml() : s.ansicht === 'baum' ? baumHtml() : s.ansicht === 'kreativ' ? kreativHtml() : s.ansicht === 'zine' ? ZI.html() : s.ansicht === 'bilder' ? bilderHtml() : startHtml();
  katInSicht(); m.classList.toggle('einzug', einzug); document.body.dataset.ansicht = s.ansicht; document.body.classList.toggle('nur', breit() && (lesen || s.ansicht === 'baum') && s.nurDies);
  if (s.ansicht !== 'kochen') { wachAus(); weckerAus(); }
  kochZeichnen();
  document.title = s.ansicht === 'rezept' && rezept(s.uid) ? `${zeig(rezept(s.uid)).name} · ${ausgabe.titel}` : ausgabe.titel;
}

/* ---------- Handlungen ---------- */
const A = {
  geh: (e) => geh(e.dataset.zu, { uid: null, form: null }),
  rezept: (e) => { E.zuletzt = e.dataset.uid; s.rleiste = false; s.original = null; /* ein anderes Rezept beginnt mit eingeklappten Werkzeugen */ sichern(); if (breit()) { s.ansicht = 'rezept'; s.uid = e.dataset.uid; history.pushState({ ansicht: 'rezept', uid: s.uid }, ''); zeichne(); document.querySelector('.md-detail')?.scrollTo(0, 0); } else geh('rezept', { uid: e.dataset.uid }); },
  zurueck: () => { s.form = null; if (history.state && history.length > 1) history.back(); else geh('start', {}, true); },
  kat: (e) => { s.kat = e.dataset.kat; if (e.dataset.geh) geh('start'); else zeichne(); },
  'ordner-zuordnen': () => ordnerWahlFenster(s.uid),
  'baum-auf': (e) => { if (Date.now() - bzGezogen < 400) return; const k = e.dataset.g; if (s.baum.q.trim()) return; if (s.baum.auf.has(k)) s.baum.auf.delete(k); else s.baum.auf.add(k); zeichne(); },
  'baum-alle': () => { const g = baumGruppen(), keys = [...g.kats, ...g.ords].map((x) => bzKey(x.art, x.id)); if (keys.every((k) => s.baum.auf.has(k))) s.baum.auf.clear(); else keys.forEach((k) => s.baum.auf.add(k)); zeichne(); },
  'baum-rezept': (e) => { if (Date.now() - bzGezogen < 400) return; const u = e.dataset.uid; if (s.baum.wahl) { A['baum-haken'](e); return; } E.zuletzt = u; s.rleiste = false; s.original = null; sichern();
    if (breit()) { s.uid = u; history.pushState({ ansicht: 'baum', uid: u }, ''); zeichne(); document.querySelector('.md-detail')?.scrollTo(0, 0); } else geh('rezept', { uid: u }); },
  'baum-leere': () => { s.baum.leere = !s.baum.leere; zeichne(); },
  'baum-wahl': () => { s.baum.wahl = s.baum.wahl ? null : new Set(); zeichne(); },
  'baum-haken': (e) => { const w = s.baum.wahl; if (!w) return; if (w.has(e.dataset.uid)) w.delete(e.dataset.uid); else w.add(e.dataset.uid); zeichne(); },
  'baum-verschieben': () => { const w = s.baum.wahl; if (w?.size) baumZielFenster([...w]); },
  'baum-ziel': (e) => { const w = [...(s.baum.wahl || [])]; fensterZu(); baumAblegen(w, e.dataset.art, e.dataset.id); },
  'baum-suche-leer': () => { s.baum.q = ''; zeichne(); $('baumfeld')?.focus(); },
  'baum-ordner-neu': () => fenster(`<h2>${L('Neuer Ordner', 'New folder')}</h2><form class="suche" data-form="baum-ordner-neu">${ic('ordner')}<input name="n" placeholder="${L('Neuer Ordner, z. B. Hochzeit von Jonas und Lisa', 'New folder, e.g. Jonas and Lisa’s wedding')}" autocomplete="off" aria-label="${L('Name des Ordners', 'Folder name')}" required></form><div class="reihe" style="margin-top:10px"><button class="knopf akz" data-a="baum-form-ok">${L('Anlegen', 'Create')}</button><button class="knopf" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`) || document.querySelector('#fensterort input[name=n]')?.focus(),
  'baum-form-ok': () => document.querySelector('#fensterort form')?.requestSubmit(),
  'ordner-setzen': (e) => { const o = findeOrdner(Z.ordner, e.dataset.oid); Z.rezepte = legeIn(Z.rezepte, Z.ordner, e.dataset.uid, e.dataset.oid); sichern(); fensterZu(); zeichne(); melde(o ? fuelle(L('Liegt jetzt im Ordner „{0}“', 'Now in the folder “{0}”'), ordTitel(o)) : L('Aus dem Ordner genommen', 'Taken out of the folder')); },
  'ordner-weg': (e) => { const vorher = { r: Z.rezepte, o: Z.ordner }, o = findeOrdner(Z.ordner, e.dataset.oid), l = ordLoeschen(Z.rezepte, Z.ordner, e.dataset.oid); Z.rezepte = l.rezepte; Z.ordner = l.ordner; sichern(); zeichne();
    melde(fuelle(l.betroffen ? L('Ordner „{0}“ gelöscht, {1} Rezepte bleiben', 'Folder “{0}” deleted, {1} recipes stay') : L('Ordner „{0}“ gelöscht', 'Folder “{0}” deleted'), ordTitel(o), l.betroffen), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher.r; Z.ordner = vorher.o; sichern(); zeichne(); }); },
  'zur-suche': () => { if (s.ansicht !== 'start') geh('start'); $('suchfeld')?.focus(); },
  sinn: () => { if (E.sinn) { E.sinn = false; sem.ids = []; sem.fuer = ''; sichern(); zeichne(); melde(L('Sinn-Suche aus', 'Meaning search off')); return; }
    frage(L('Sinn-Suche einschalten?', 'Turn on meaning search?'), L('Sie findet Rezepte auch nach Bedeutung, zum Beispiel „etwas Süßes“ oder „Eintopf“. Dafür lädt die App einmalig ein Sprachmodell aus dem Netz (etwa 120 MB). Danach rechnet sie im Gerät; deine Rezepte gehen nirgendwohin.', 'It also finds recipes by meaning, for example “something sweet” or “stew”. For this the app downloads a language model once (about 120 MB). After that it works on the device; your recipes go nowhere.'), L('Einschalten', 'Turn on'), () => { E.sinn = true; sem.status = ''; sichern(); zeichne(); if (s.frage.trim()) semPlanen(); else semBereit().then(() => melde(L('Sinn-Suche bereit', 'Meaning search ready'))).catch(() => melde(L('Die Sinn-Suche ließ sich nicht laden.', 'The meaning search could not be loaded.'))); }, false); },
  'suche-leer': () => { s.frage = ''; zeichne(); $('suchfeld')?.focus(); },
  neu: () => { s.ausNotiz = null; neuFenster(); },
  'neu-tab': (e) => { diktatAus(); neuFenster(e.dataset.t); },
  'werk-auf': (e) => { const g = e.dataset.g; if (s.werkAuf.has(g)) s.werkAuf.delete(g); else s.werkAuf.add(g); zeichne(); },
  'neu-form': () => { fensterZu(); s.form = formAus(null); geh('form'); },
  'imp-text': () => { const r = rezeptAusText($('imp-text').value); if (!r) { melde(L('Bitte zuerst einen Text einfügen.', 'Please paste a text first.')); return; } diktatAus(); fensterZu();
    s.form = { ...formAus(null), name: r.name, servings: r.servings || 4, prepTime: r.prepTime ?? '', ings: r.ings.map(zutatZeile).join('\n'), steps: r.steps.map((x) => x.txt).join('\n\n') }; geh('form');
    melde(r.sicher ? fuelle(L('{0} Zutaten und {1} Schritte erkannt. Bitte prüfen.', '{0} ingredients and {1} steps found. Please check.'), r.ings.length, r.steps.length) : L('Ohne Überschriften aufgeteilt. Bitte Zutaten und Schritte prüfen.', 'Split without headings. Please check ingredients and steps.')); },
  diktat: (e) => { const f = document.querySelector(e.dataset.feld); if (!f) return; diktat(f, spr(), (an) => { e.setAttribute('aria-pressed', String(an)); }, { beiFehler: (satz) => melde(satz) }); f.focus(); },   /* Kern 0.20: schreibt an der Schreibmarke, kennt „Komma“, „Punkt“, „neue Zeile“; Fehler (kein Mikrofon, keine Erlaubnis) werden gesagt */
  installieren: async () => { if (INST.kannFragen()) await INST.fragen(); else melde(istApple() ? L('Teilen → „Zum Home-Bildschirm“', 'Share → “Add to Home Screen”') : L('Browser-Menü ⋮ → „App installieren“', 'Browser menu ⋮ → “Install app”')); kopfZeichnen(); if (s.ansicht === 'werkstatt') zeichne(); },
  aktualisieren: async () => { melde(L('Neueste Fassung wird geholt …', 'Fetching the latest version …')); const e = await aktualisieren({ cachePrefix: 'rezeptbuch-neu-', probe: './sw.js' }); if (e === 'offline') melde(L('Ohne Netz – die App bleibt, wie sie ist', 'Offline – the app stays as it is')); else location.reload(); },
  bearbeiten: () => { const r = rezept(s.uid); if (!r) return; const ueb = uebGezeigt(r); s.form = { ...formAus(ueb ? sicht(r, ueb) : r), ueb }; geh('form'); },   /* bearbeitet wird, was dasteht (Klaus 25.11.) */
  abschnitt: (e) => { const t = e.dataset.t; s.abschnitt = s.abschnitt?.uid === s.uid && s.abschnitt.teil === t ? null : { uid: s.uid, teil: t }; zeichne(); document.querySelector('.abschnitt textarea')?.focus(); },
  'ab-zu': () => { s.abschnitt = null; zeichne(); },
  'ab-schritt-dazu': () => { const ol = document.querySelector('.ab-schritte'); if (!ol) return; ol.insertAdjacentHTML('beforeend', abSchrittFeld(ol.children.length, '')); ol.lastElementChild.querySelector('textarea').focus(); },
  'fassung-haupt': async () => { const f = fassungOffen, alt = f && rezept(f.uid); if (!alt) return; const quelle = await quellSprache(alt, f.ziel); if (!quelle) return;
    try { const r2 = alsHauptfassung(alt, f.ziel, f.neu, quelle, spr()); fassungOffen = null; rezeptDirekt(r2); s.original = null; fensterZu(); f.fertig(r2); } catch (x) { melde(x.message); } },
  'fassung-ueb': () => { const f = fassungOffen, alt = f && rezept(f.uid); if (!alt) return; try { const r2 = alsUebersetzung(alt, f.ziel, f.neu, spr()); fassungOffen = null; rezeptDirekt(r2); fensterZu(); f.fertig(r2); } catch (x) { melde(x.message); } },
  'quelle-wahl': (e) => { const f = quelleFertig; quelleFertig = null; zuTun = null; f?.(e.dataset.s); },
  'ueb-weg': (e) => { s.uebWeg = e.dataset.w; uebersetzFenster(); },
  'bild-entfernen': (e) => { const uid = e.dataset.uid || s.uid, r = rezept(uid); if (!r?.img) return; const vorher = Z.rezepte; Z.rezepte = Z.rezepte.map((x) => { if (x.uid !== uid) return x; const { imgCrop, ...rest } = x; return { ...rest, img: '' }; }); sichern(); zeichne();
    melde(L('Bild entfernt', 'Picture removed'), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher; sichern(); zeichne(); }); },
  /* Bild anpassen im Vollbild: Schließen nimmt den Schritt im Verlauf zurück; ein Werkzeug unten rechts schließt erst und tut dann seins */
  'bv-zu': () => { zs = null; if (history.state?.voll) history.back(); else fensterZu(); },
  'bv-werk': (e) => { const w = e.dataset.w, uid = s.uid; zs = null; if (w === 'bild-dazu') { s.bildZiel = uid; $('datei-bild').click(); } const tun = () => { if (w !== 'bild-dazu' && A[w]) A[w]({ dataset: { uid } }); };
    if (history.state?.voll) { nachZurueck = tun; history.back(); } else { fensterZu(); tun(); } },
  'rail-seite': () => { E.railSeite = E.railSeite === 'r' ? 'l' : 'r'; sichern(); zeichne(); },
  loeschen: () => { const r = rezept(s.uid); if (!r) return; const vorher = Z.rezepte; Z.rezepte = Z.rezepte.filter((x) => x.uid !== r.uid); sichern(); geh('start', { uid: null }, true); melde(fuelle(L('„{0}“ gelöscht', '“{0}” deleted'), r.name), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher; sichern(); zeichne(true); }); },
  kochen: () => { K.i = 0; K.kopf = true; geh('kochen', { uid: s.uid }); wachAn(); },
  'k-schritt': (e) => { const r = rezept(s.uid); K.i = Math.min(r.steps.length - 1, Math.max(0, K.i + +e.dataset.d)); weckerAus(); kochZeichnen(); $('k-inhalt')?.classList.add('k-neu'); },
  'k-kopf': () => { K.kopf = !K.kopf; kochZeichnen(); },
  wecker: (e) => { if (K.uhr) { weckerAus(); kochZeichnen(); return; } K.rest = +e.dataset.min * 60;
    K.uhr = setInterval(() => { K.rest--; document.querySelectorAll('#k-zeit').forEach((z) => { z.textContent = zeitText(Math.max(0, K.rest)); }); if (K.rest <= 0) { weckerAus(); piep(); melde(L('Die Zeit ist um.', 'Time is up.')); kochZeichnen(); } }, 1000); kochZeichnen(); },
  'auf-liste': () => { const r = rezept(s.uid); if (!r) return; const n = s.portion[r.uid] || r.servings, da = Z.einkauf.posten.find((p) => p.uid === r.uid);
    Z.einkauf = { ...Z.einkauf, posten: da ? Z.einkauf.posten.map((p) => (p.uid === r.uid ? { ...p, portionen: n } : p)) : [...Z.einkauf.posten, { uid: r.uid, portionen: n }] }; sichern(); kopfZeichnen(); leisteZeichnen();
    melde(da ? L('Steht schon auf der Liste, Portionen angepasst', 'Already on the list, servings adjusted') : fuelle(L('„{0}“ steht auf der Einkaufsliste', '“{0}” is on the shopping list'), r.name), L('Zur Liste', 'To the list'), () => geh('einkauf')); },
  'ek-haken': (e) => { const k = e.dataset.k, h = { ...Z.einkauf.haken }; if (h[k]) delete h[k]; else h[k] = true; Z.einkauf = { ...Z.einkauf, haken: h }; sichern(); zeichne(); },
  'ek-rezept-weg': (e) => { Z.einkauf = { ...Z.einkauf, posten: Z.einkauf.posten.filter((p) => p.uid !== e.dataset.uid) }; sichern(); zeichne(); },
  'ek-laden': (e) => { Z.einkauf = { ...Z.einkauf, laden: e.dataset.l }; sichern(); zeichne(); },
  'ek-laden-neu': () => fenster(`<h2>${L('Neuer Laden', 'New shop')}</h2><form class="felder" data-form="laden"><label>${L('Name', 'Name')}<input class="feld" name="n" placeholder="${L('z. B. Wochenmarkt', 'e.g. weekly market')}" required autocomplete="off"></label><div class="reihe"><button class="knopf akz" type="submit">${L('Anlegen', 'Create')}</button><button class="knopf" type="button" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div></form>`),
  'ek-abgehakt-weg': () => { const vorher = Z.einkauf, l = einkaufsliste(ekPosten()); const offenJe = (uid) => l.some((x) => !Z.einkauf.haken[x.schluessel] && x.aus.includes(rezept(uid)?.name));
    Z.einkauf = { ...Z.einkauf, posten: Z.einkauf.posten.filter((p) => offenJe(p.uid)), eigene: Z.einkauf.eigene.filter((x) => !Z.einkauf.haken['eig:' + x.id]) }; sichern(); zeichne(); melde(L('Erledigtes entfernt', 'Done items removed'), L('Rückgängig', 'Undo'), () => { Z.einkauf = vorher; sichern(); zeichne(); }); },
  'ek-leeren': () => { const vorher = Z.einkauf; Z.einkauf = { ...Z.einkauf, posten: [], haken: {}, eigene: [] }; sichern(); zeichne(); melde(L('Liste geleert', 'List cleared'), L('Rückgängig', 'Undo'), () => { Z.einkauf = vorher; sichern(); zeichne(); }); },
  planen: () => planWahlFenster(null, s.uid),
  'plan-waehlen': (e) => planWahlFenster(e.dataset.tag),
  'plan-setzen': (e) => { Z.plan = planen(Z.plan, e.dataset.tag, e.dataset.uid); sichern(); fensterZu(); if (s.ansicht === 'plan') zeichne(); else melde(L('Im Wochenplan eingetragen', 'Added to the week plan'), L('Zum Plan', 'To the plan'), () => { s.planTag = new Date(e.dataset.tag + 'T12:00'); geh('plan'); }); },
  'plan-weg': (e) => { Z.plan = entplanen(Z.plan, e.dataset.tag, e.dataset.uid); sichern(); zeichne(); },
  'plan-woche': (e) => { const d = new Date(s.planTag); d.setDate(d.getDate() + +e.dataset.d); s.planTag = d; zeichne(); },
  'plan-heute': () => { s.planTag = new Date(); zeichne(); },
  'plan-einkauf': () => { const w = woche(s.planTag); let posten = Z.einkauf.posten, n = 0;
    for (const t of w.tage) for (const uid of Z.plan[tagIso(t)] || []) { const r = rezept(uid); if (r && !posten.some((p) => p.uid === uid)) { posten = [...posten, { uid, portionen: r.servings }]; n++; } }
    Z.einkauf = { ...Z.einkauf, posten }; sichern(); kopfZeichnen(); leisteZeichnen(); melde(n ? fuelle(L('{0} Rezepte auf die Einkaufsliste gesetzt', '{0} recipes put on the shopping list'), n) : L('Alle Gerichte der Woche stehen schon auf der Liste', 'All dishes of the week are already on the list'), L('Zur Liste', 'To the list'), () => geh('einkauf')); },
  'kat-neu': () => { const a = katAnlegen(Z.kategorien, ''); Z.kategorien = a.kat; sichern(); zeichne(); document.querySelector(`.kat-name[data-kid="${a.id}"]`)?.focus(); },
  'kat-emoji': (e) => { const id = e.dataset.kid, bilder = Z.rezepte.filter((r) => istInhalt(r) && r.img && katVonRezept(r) === id), gew = Z.kategorien.namen?.[id]?.bild, jetzt = katBild(Z.rezepte, Z.kategorien, id)?.uid;
    fenster(`<h2>${L('Bild oder Zeichen', 'Picture or symbol')}</h2>${bilder.length ? `<h3>${L('Foto als Sticker', 'Photo as sticker')} ${frag(L('Ein kleines Foto aus dieser Kategorie, wie ein Sticker. Ohne Wahl steht das erste Rezept mit Bild.', 'A small photo from this category, like a sticker. Without a choice, the first recipe with a picture is shown.'))}</h3><div class="sticker-raster">${bilder.map((r) => `<button data-a="kat-bild-setzen" data-kid="${esc(id)}" data-uid="${esc(r.uid)}" aria-pressed="${r.uid === jetzt}" aria-label="${esc(r.name)}"><img src="${esc(r.img)}" alt="" loading="lazy"></button>`).join('')}</div>${gew ? `<div class="reihe" style="margin-top:8px"><button class="knopf" data-a="kat-bild-setzen" data-kid="${esc(id)}" data-uid="">${L('Vorgabe: erstes Bild', 'Default: first picture')}</button></div>` : ''}<h3 style="margin-top:14px">${L('Zeichen, wenn es kein Bild gibt', 'Symbol if there is no picture')}</h3>` : `<p>${L('In dieser Kategorie hat noch kein Rezept ein Bild. Bis dahin steht das Zeichen.', 'No recipe in this category has a picture yet. Until then the symbol is shown.')}</p>`}<div class="emoji-raster">${EMOJI.map((x) => `<button data-a="kat-emoji-setzen" data-kid="${esc(id)}" data-e="${x}">${x}</button>`).join('')}</div><div class="reihe" style="margin-top:10px"><button class="knopf" data-a="kat-emoji-setzen" data-kid="${esc(id)}" data-e="">${L('Vorgabe', 'Default')}</button></div>`); },
  'kat-bild-setzen': (e) => { Z.kategorien = bildWaehlen(Z.kategorien, e.dataset.kid, e.dataset.uid || null); sichern(); fensterZu(); zeichne(); },
  'kat-emoji-setzen': (e) => { const id = e.dataset.kid, namen = { ...(Z.kategorien.namen || {}) }, v = { ...(namen[id] || {}) }; if (e.dataset.e) v.emoji = e.dataset.e; else delete v.emoji; if (Object.keys(v).length) namen[id] = v; else delete namen[id];
    Z.kategorien = { ...Z.kategorien, namen, eigene: Z.kategorien.eigene.map((c) => (c.id === id && !e.dataset.e ? (({ emoji, ...rest }) => rest)(c) : c)) }; sichern(); fensterZu(); zeichne(); },
  'kat-weg': (e) => { const id = e.dataset.kid, n = anzahl(Z.rezepte, id); if (n) { katWahlFenster(fuelle(L('Wohin mit den {0} Rezepten?', 'Where should the {0} recipes go?'), n), id, 'kat-weg-ziel'); return; } A['kat-weg-ziel']({ dataset: { kid: id, ziel: '' } }, null, true); },
  'kat-weg-ziel': (e, ev, leer) => { const vorher = { r: Z.rezepte, k: Z.kategorien }, id = e.dataset.kid, c = alleKategorien(Z.rezepte, Z.kategorien).find((x) => x.id === id), name = c ? katName(c) : id;
    const l = katLoeschen(Z.rezepte, Z.kategorien, id, leer ? null : e.dataset.ziel); Z.rezepte = l.rezepte; Z.kategorien = l.kat; sichern(); fensterZu(); zeichne();
    melde(fuelle(L('„{0}“ gelöscht', '“{0}” deleted'), name) + (l.verschoben ? fuelle(L(', {0} Rezepte umgehängt', ', {0} recipes moved'), l.verschoben) : ''), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher.r; Z.kategorien = vorher.k; sichern(); zeichne(); }); },
  'kat-zurueck': (e) => { Z.kategorien = { ...Z.kategorien, ausgeblendet: Z.kategorien.ausgeblendet.filter((x) => x !== e.dataset.kid), eigene: Z.kategorien.eigene }; const c = KATEGORIEN_FEST.find((x) => x.id === e.dataset.kid);
    Z.kategorien = { ...Z.kategorien, eigene: [...Z.kategorien.eigene] }; sichern(); zeichne(); if (c) melde(fuelle(L('„{0}“ steht wieder in der Liste', '“{0}” is back in the list'), jeSprache(c))); },
  'kat-alle': (e) => { const id = e.dataset.kid, n = anzahl(Z.rezepte, id); if (n) katWahlFenster(fuelle(L('Wohin mit den {0} Rezepten?', 'Where should the {0} recipes go?'), n), id, 'kat-alle-ziel'); },
  'kat-alle-ziel': (e) => { const vorher = Z.rezepte, id = e.dataset.kid, ziel = e.dataset.ziel; let n = 0;
    Z.rezepte = Z.rezepte.map((r) => (istInhalt(r) && katVonRezept(r) === id ? (n++, { ...r, cat: ziel }) : r)); sichern(); fensterZu(); zeichne();
    melde(fuelle(L('{0} Rezepte zugeordnet', '{0} recipes assigned'), n), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher; sichern(); zeichne(); }); },
  einordnen: () => einordnenFenster(s.uid),
  'ein-kat': (e) => einKat(e.dataset.uid, e.dataset.ziel),
  'ein-ord': (e) => einOrd(e.dataset.uid, e.dataset.oid),
  'kat-zuordnen': () => { const r = rezept(s.uid); if (r) katWahlFenster(L('Kategorie zuordnen', 'Assign category'), null, 'kat-setzen', r.uid); },
  'kat-setzen': (e) => { Z.rezepte = Z.rezepte.map((r) => (r.uid === e.dataset.uid ? { ...r, cat: e.dataset.ziel } : r)); sichern(); fensterZu(); zeichne(); melde(L('Kategorie geändert', 'Category changed')); },
  'bilder-filter': (e) => { s.bilder.filter = e.dataset.f; zeichne(); },
  'bilder-gross': () => { s.bilder.gross = !s.bilder.gross; zeichne(); },
  'bild-wahl': (e) => { const w = s.bilder.wahl; if (w.has(e.dataset.uid)) w.delete(e.dataset.uid); else w.add(e.dataset.uid); zeichne(); },
  'bilder-alle-wahl': () => { const w = s.bilder.wahl, alle = [...document.querySelectorAll('.bildkachel')].map((b) => b.dataset.uid); if (w.size === alle.length) w.clear(); else alle.forEach((u) => w.add(u)); zeichne(); },
  'bilder-weg': () => { const w = new Set(s.bilder.wahl), vorher = Z.rezepte; Z.rezepte = Z.rezepte.map((r) => (w.has(r.uid) ? { ...r, img: '' } : r)); s.bilder.wahl.clear(); sichern(); zeichne(); melde(fuelle(L('−{0} Bilder', '−{0} pictures'), w.size), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher; sichern(); zeichne(); }); },
  'bilder-alle-weg': () => { const n = Z.rezepte.filter((r) => r.img).length; frage(L('Alle Bilder löschen?', 'Delete all pictures?'), fuelle(L('{0} Bilder werden entfernt. Die Rezepte mit ihrem Text bleiben.', '{0} pictures will be removed. The recipes with their text stay.'), n), L('Alle Bilder löschen', 'Delete all pictures'), () => { const vorher = Z.rezepte; Z.rezepte = Z.rezepte.map((r) => (r.img ? { ...r, img: '' } : r)); s.bilder.wahl.clear(); sichern(); zeichne(); melde(fuelle(L('−{0} Bilder', '−{0} pictures'), n), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher; sichern(); zeichne(); }); }); },
  'bild-dazu': (e) => { s.bildZiel = e.dataset.uid; fensterZu(); $('datei-bild').click(); },
  zuschnitt: () => zuschnittFenster(s.uid),
  rleiste: () => { s.rleiste = !s.rleiste; zeichne(); },
  rmenue: () => rezeptMenue(),
  original: () => { s.original = s.original === s.uid ? null : s.uid; zeichne(); },
  uebersetzen: () => uebersetzFenster(),
  uebersetze: (e) => uebersetzeEins(e.dataset.s),
  'alle-uebersetzen': () => alleUebFenster(),
  'alle-ueb-ziel': (e) => alleUebFenster(e.dataset.s),
  'alle-ueb-los': (e) => alleUebersetzen(e.dataset.s),
  sprache: () => sprachFenster(),
  'sprache-wahl': async (e) => { E.sprache = sprKennt(e.dataset.s) ? e.dataset.s : null; sichern(); fensterZu(); await spracheBereit(); zeichne(); },
  drucken: () => { const r = rezept(s.uid); if (!r) return; fensterZu(); const c = alleKategorien(Z.rezepte, Z.kategorien).find((x) => x.id === katVonRezept(r)); drucke(druckRezept(inEinheit(zeig(r)), { portionen: s.portion[r.uid] || r.servings, sprache: spr(), kategorieName: c ? katName(c) : '' }), { sprache: spr() }).catch((f) => melde(f.message)); },
  qr: () => qrFenster(),
  'qr-kopieren': () => { navigator.clipboard?.writeText(s.teil || '').then(() => melde(L('Link kopiert', 'Link copied')), () => melde(L('Kopieren ging nicht', 'Copying failed'))); },
  'qr-teilen': () => { navigator.share?.({ title: zeig(rezept(s.uid))?.name || '', url: s.teil }).catch(() => {}); },
  einheiten: () => { const f = ['', 'us', 'metrisch']; E.einheiten = f[(f.indexOf(E.einheiten || '') + 1) % f.length]; sichern(); zeichne(); if (document.getElementById('rmenue')) rezeptMenue(); },
  naehrwerte: () => kiAmRezept('naehrwerte'),
  rechtschreibung: () => kiAmRezept('rechtschreibung'),
  'bild-blatt': () => bildBlatt(s.uid),
  // Tipp aufs Bild: mit Bild das Vollbild, ohne Bild gleich das Bild-Blatt. Am Monitor steht die Namenszeile UNTER dem Bild
  // (Klaus 23.11.: „der Winkel soll im Monitor stehen, nicht im Bild“); ein Tipp dort öffnet kein Bild.
  held: (e, ev) => { if (breit() && ev?.target?.closest?.('.verlauf')) return; if (rezept(s.uid)?.img) zuschnittFenster(s.uid); else bildBlatt(s.uid); },   /* R10: ein Tipp aufs Bild öffnet gleich „Bild anpassen“ im Vollbild */
  'bild-voll': () => { const r = zeig(rezept(s.uid)); if (!r?.img) return; fensterZu(); $('fensterort').innerHTML = `<div class="vollbild" data-a="voll-zu" role="dialog" aria-modal="true" aria-label="${esc(r.name)}"><img src="${esc(r.img)}" alt="${esc(r.name)}"><button class="voll-werk" data-a="voll-werk">${ic('bild')}${L('Bild bearbeiten', 'Edit picture')}</button><button class="voll-x" data-a="voll-zu" aria-label="${L('Schließen', 'Close')}">${ic('x')}</button><p>${esc(r.name)}</p></div>`; history.pushState({ ...(history.state || { ansicht: s.ansicht, uid: s.uid }), voll: true }, ''); },
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
  'scan-kamera': () => { s.tellerWahl = false; $('datei-kamera').click(); },
  'scan-datei': () => { s.tellerWahl = false; $('datei-scan').click(); },
  'scan-teller': () => { s.tellerWahl = true; $('datei-kamera').click(); },
  stern: (e) => { const r0 = rezept(s.uid); if (!r0) return; const n = +e.dataset.n, alt = Math.round(Number(r0.rating?.stars) || 0); Z.rezepte = Z.rezepte.map((x) => (x.uid === r0.uid ? { ...x, rating: { ...(x.rating || {}), stars: n === alt ? 0 : n } } : x)); sichern(); zeichne(); },
  kontrast: () => { E.kontrast = !E.kontrast; farbeSetzen(document.documentElement, E.farbe, E.ton, { kontrast: E.kontrast }); sichern(); zeichne(); },
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
    frage(L('Bild von der KI erzeugen?', 'Create picture with AI?'), fuelle(L('Der Name, die ersten Zutaten und Schritte von „{0}“ gehen an OpenAI. Kosten: {1}.', 'The name, the first ingredients and steps of “{0}” go to OpenAI. Cost: {1}.'), r.name, kostenBild()) + (r.img ? ' ' + L('Das vorhandene Bild wird ersetzt.', 'The existing picture will be replaced.') : ''), L('Erzeugen', 'Create'), () => bildErzeugen(uid, false), false); },
  'gratis-bild': (e) => { const uid = e.dataset.uid, r = rezept(uid); if (!SK.pollinations) { schluesselFenster('pollinations', 'gratis:' + uid); return; }
    frage(L('Foto über Pollinations erzeugen?', 'Create photo via Pollinations?'), fuelle(L('Der Name „{0}“ geht mit deinem Schlüssel an den Dienst Pollinations. Ob es etwas kostet, regelt dein Konto dort.', 'The name “{0}” goes to the Pollinations service with your key. Whether it costs anything depends on your account there.'), r.name) + (r.img ? ' ' + L('Das vorhandene Bild wird ersetzt.', 'The existing picture will be replaced.') : ''), L('Erzeugen', 'Create'), () => bildErzeugen(uid, true), false); },
  tresor: () => tresorFenster(),
  'tresor-holen': (e) => frage(L('Diesen Stand zurückholen?', 'Restore this state?'), L('Das Buch wird durch diesen Stand ersetzt. Der jetzige Stand kommt vorher automatisch in den Tresor.', 'The book is replaced by this state. The current state goes into the vault automatically first.'), L('Zurückholen', 'Restore'), async () => { const sich = await tr.hol(e.dataset.id); if (!sich) { melde(L('Dieser Stand ist nicht mehr da.', 'This state is gone.')); return; } await ersetze(lies(JSON.stringify(sich)), L('Zurückgeholt: {0} Rezepte', 'Restored: {0} recipes')); }, false),
  'tresor-datei': async (e) => { const sich = await tr.hol(e.dataset.id); if (sich) { herunterladen(`${ausgabe.name}-tresor-${e.dataset.id.slice(2, 12)}.json`, JSON.stringify(sich)); melde(L('Als Datei gespeichert', 'Saved as a file')); } },
  'tresor-weg': async (e) => { await tr.loeschen(e.dataset.id); tresorFenster(); },
  'zs-lage': (e) => { const [x, y] = e.dataset.l.split(','); zs.x = +x; zs.y = +y; zsZeigen(); },
  'zs-null': () => { zs.x = 50; zs.y = 50; zs.z = 1; $('zs-zoom').value = 100; zsZeigen(); },
  'zs-ok': () => { const z = zs; if (!z) return; Z.rezepte = Z.rezepte.map((r) => (r.uid === z.uid ? { ...r, imgCrop: { ...(r.imgCrop || {}), x: Math.round(z.x), y: Math.round(z.y), scale: Math.round(z.z * 100) / 100 } } : r)); sichern(); A['bv-zu'](); zeichne(); },
  vollbild: () => { try { const p = vollAn() ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.(); p?.catch?.(() => melde(L('Vollbild ist hier nicht möglich.', 'Full screen is not possible here.'))); } catch { /* ohne Vollbild */ } },
  rail: () => { E.railZu = !E.railZu; sichern(); kopfZeichnen(); },
  schrift: () => fenster(`<h2>${L('Schriftgröße', 'Text size')} ${frag(L('Die Schrift ändert sich, während du schiebst. Sie gilt für die ganze App, auch beim Kochen.', 'The text changes while you slide. It applies to the whole app, also when cooking.'))}</h2>${schriftRegler(E.schrift, spr())}<div class="reihe" style="margin-top:14px"><button class="knopf" data-a="schrift-100">${L('Zurück auf 100 %', 'Back to 100 %')}</button><button class="knopf akz" data-a="fenster-zu">${L('Fertig', 'Done')}</button></div>`),
  'schrift-100': () => { E.schrift = schriftSetzen(document.documentElement, 100); $('schriftregler').value = 100; $('schriftzahl').textContent = '100 %'; sichern(); },
  ton: (e) => { E.ton = e.dataset.ton; farbeSetzen(document.documentElement, E.farbe, E.ton, { kontrast: !!E.kontrast }); sichern(); if (e.closest('.fenster')) farbFenster(); kopfZeichnen(); },
  portion: (e) => { const r = rezept(s.uid); const n = Math.min(99, Math.max(1, (s.portion[r.uid] || r.servings) + +e.dataset.d)); s.portion[r.uid] = n; zeichne(); },
  'bild-waehlen': () => { formLesen(document.querySelector('[data-form=rezept]')); $('datei-bild').click(); },
  'bild-weg': () => { formLesen(document.querySelector('[data-form=rezept]')); s.form.img = ''; zeichne(); },
  'sicherung-teilen': async () => { const d = new Date(), name = `${ausgabe.name}-${d.toISOString().slice(0, 10)}.json`, datei = new File([JSON.stringify(schreibe(Z))], name, { type: 'application/json' });
    if (!navigator.canShare?.({ files: [datei] })) { A.sichern(); melde(L('Teilen geht hier nicht, die Sicherung liegt als Datei bei den Downloads.', 'Sharing is not possible here; the backup is in your downloads.')); return; }
    try { await navigator.share({ files: [datei], title: name }); } catch { /* abgebrochen */ } },
  sichern: () => { const d = new Date(); herunterladen(`${ausgabe.name}-${d.toISOString().slice(0, 10)}.json`, JSON.stringify(schreibe(Z))); melde(L('Sicherung gespeichert', 'Backup saved')); },
  einlesen: () => { fensterZu(); $('datei-sicherung').click(); },
  'datei-dazu': () => { const e = dateiEingang; fensterZu(); if (e) einfuegen(e); },
  'datei-ersetzen': () => { const e = dateiEingang; fensterZu(); if (!e) return; if (!e.rezepte.length) { melde(L('Keine Rezepte in der Datei, nichts ersetzt', 'No recipes in the file, nothing replaced')); return; } ersetze(e, L('Ersetzt: {0} Rezepte', 'Replaced: {0} recipes')); },
  beispiel: () => beispielLaden(),
  'beispiele-weg': () => { const n = Z.rezepte.filter((r) => r.beispiel).length; frage(L('Beispiele entfernen?', 'Remove examples?'), fuelle(L('{0} Beispiel-Rezepte werden entfernt. Deine eigenen Rezepte bleiben.', '{0} example recipes will be removed. Your own recipes stay.'), n), L('Entfernen', 'Remove'), () => { tresorAuto(); const vorher = Z.rezepte; Z.rezepte = Z.rezepte.filter((r) => !r.beispiel); sichern(); zeichne(); melde(fuelle(L('−{0} Beispiele', '−{0} examples'), n), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher; sichern(); zeichne(); }); }); },
  'alles-weg': () => { const n = Z.rezepte.filter(istInhalt).length; frage(L('Alle Rezepte löschen?', 'Delete all recipes?'), fuelle(L('{0} Rezepte werden gelöscht. Der jetzige Stand kommt vorher in den Tresor.', '{0} recipes will be deleted. The current state goes into the vault first.'), n), L('Alle löschen', 'Delete all'), () => { tresorAuto(); const vorher = Z; Z = { ...leererZustand(), kategorien: leereKategorien() }; ergaenze(); E.zuletzt = null; sichern(); geh('start', {}, true); melde(L('Alle Rezepte gelöscht', 'All recipes deleted'), L('Rückgängig', 'Undo'), () => { Z = vorher; sichern(); zeichne(true); }); }); },
  farbe: () => farbFenster(),
  hinweise: () => { E.hinweiseAus = !E.hinweiseAus; sichern(); zeichne(); melde(E.hinweiseAus ? L('Hinweis-Blasen aus', 'Tooltips off') : L('Hinweis-Blasen an', 'Tooltips on')); },
  'farbe-wahl': (e) => { E.farbe = e.dataset.farbe; farbeSetzen(document.documentElement, E.farbe, E.ton, { kontrast: !!E.kontrast }); sichern(); fensterZu(); zeichne(); },
  ja: () => { const t = jaTun; jaTun = null; zuTun = null; fensterZu(); t?.(); },
  'fenster-zu': (e, ev) => { if (ev.target.closest('.fenster') && !ev.target.closest('[data-a="fenster-zu"]:not(.schleier)')) return; fensterZu(); },
  'toast-tun': () => { const t = toastTun; toastTun = null; $('toast').innerHTML = ''; t?.(); },
  'leiste-auf': () => { if (Date.now() - gezogen < 500) return; s.leisteAuf = true; leisteZeichnen(); },
  'leiste-zu': () => { s.leisteAuf = false; leisteZeichnen(); },
  'nach-oben': () => { s.leisteAuf = false; leisteZeichnen(); scrollTo({ top: 0, behavior: 'smooth' }); },
};
/* Zusätze (neu/zusatz.mjs): KI-Richter der Suche, KI-Bilder für alle, Prüfung des Bildauftrags, alte Tresor-Stände, Wochenplan-Vorschlag, Buch, Handbuch. */
const ZU = zusatz({ L, spr, esc, ic, A, s, SK, W, Z: () => Z, setzeZ: (z) => { Z = z; }, E: () => E, fenster, fensterZu, beiZu: (f) => { zuTun = f; }, melde, sichern, zeichne, rezept, istInhalt, schluesselFenster, bildAusDatei, tresorAuto, sinnTreffer,
  zeichneStart: () => { if (s.ansicht === 'start' && $('start-rest')) $('start-rest').innerHTML = startRest(); }, katNamen: () => new Map(alleKategorien(Z.rezepte, Z.kategorien).map((c) => [c.id, katName(c)])), katVon: katVonRezept,
  tr: () => tr, ausgabe: () => ausgabe, planTage: () => woche(s.planTag).tage, einkaufZeilen: einkaufDruckZeilen });
/* Rezepte gruppiert wie in der alten App (Schritt 1 des KI-Kreativbuchs, Lieblingsrezept des Food-Zines): je Kategorie die Rezepte ohne
   Ordner, dann je Ordner seine Rezepte, der Rest unter „Sonstiges“. Jede Gruppe trägt Zeichen und Namen. */
function rezeptGruppen() {
  const alle = Z.rezepte.filter(istInhalt).sort((a, b) => zeig(a).name.localeCompare(zeig(b).name, spr())), gruppen = [], drin = new Set();
  for (const c of alleKategorien(Z.rezepte, Z.kategorien)) { const rs = alle.filter((r) => !ordnerVonRezept(r, Z.ordner) && katVonRezept(r) === c.id); if (rs.length) { gruppen.push({ titel: [katSymbol(c), katName(c)].filter(Boolean).join(' '), rezepte: rs }); rs.forEach((r) => drin.add(r.uid)); } }
  for (const o of Z.ordner) { const rs = alle.filter((r) => String(ordnerVonRezept(r, Z.ordner) || '') === String(o.id)); if (rs.length) { gruppen.push({ titel: '📁 ' + ordTitel(o), rezepte: rs }); rs.forEach((r) => drin.add(r.uid)); } }
  const rest = alle.filter((r) => !drin.has(r.uid)); if (rest.length) gruppen.push({ titel: '📝 ' + L('Sonstiges', 'Other'), rezepte: rest });
  return gruppen;
}
const katSymbol = (c) => Z.kategorien.namen?.[c.id]?.emoji || c.emoji || c.emojiAlt || '';
/** Kategorie eines Rezepts für den Food-Zine-Auftrag: Kennung, Name und Zeichen, wie die App sie zeigt. */
const katInfo = (r) => { const c = alleKategorien(Z.rezepte, Z.kategorien).find((x) => x.id === katVonRezept(r)); return c ? { id: c.id, name: c.art === 'ohne' ? '' : katName(c), symbol: katSymbol(c) } : null; };
/* Food-Zine (neu/zine.mjs): der Poster-Auftrag der alten App als eigene Ansicht, die Sammlung „Meine Food-Zine-Bilder“, Beispiel-Sätze. */
const ZI = zine({ L, spr, esc, ic, A, s, W, Z: () => Z, setzeZ: (z) => { Z = z; }, fenster, fensterZu, melde, sichern, zeichne, rezept, zeig, geh, lager: () => lager, istInhalt,
  gruppen: rezeptGruppen, katInfo, bildAusDatei, frag, katalog: () => katalog, ausgabe: () => ausgabe, tresorAuto });
/* Notizbuch (neu/notizbuch.mjs): unterwegs Foto oder Notiz festhalten; später lesen, vorschlagen, planen, in den Kalender. Knopf im Kopf. */
const NB = notizbuch({ L, spr, esc, ic, A, s, W, SK, Z: () => Z, setzeZ: (z) => { Z = z; }, E: () => E, fenster, fensterZu, melde, sichern, zeichne, kopfZeichnen: () => { kopfZeichnen(); leisteZeichnen(); }, rezept, istInhalt, geh,
  geb, mik, bildAusDatei, schluesselFenster, befehlFrage, scanGewaehlt, scanKats, formAus, titel: () => ausgabe?.titel || '' });
/* Kreativbuch (neu/kreativbuch.mjs): aus den Rezepten ein gestaltetes Buch, Texte von Claude im gewählten Stil; Einstellungen → Buch. */
const KB = kreativbuch({ L, spr, esc, ic, A, W, SK, Z: () => Z, setzeZ: (z) => { Z = z; }, E: () => E, lager: () => lager, fenster, fensterZu, beiZu: (f) => { zuTun = f; }, melde, sichern, zeichne, zeig, istInhalt, schluesselFenster,
  katNamen: () => new Map(alleKategorien(Z.rezepte, Z.kategorien).map((c) => [c.id, katName(c)])), katVon: katVonRezept, gruppen: rezeptGruppen, wahl: ZU.wahl, stellenHtml: ZU.stellenHtml, ausgabe: () => ausgabe });
/* Klaus 25.11.: die Erklärung hinter „?“ war nur teilweise zu lesen – sie hing rechtsbündig am Knopf und das Fenster schnitt sie
   ab. Jetzt steht sie als eigene Blase am Seitenkörper (#frag-blase), ganz im Bild, unter oder über dem „?“; nur eine ist offen. */
function fragLegen(d) {
  document.getElementById('frag-blase')?.remove(); const p = d.querySelector('p'), k = d.querySelector('summary'); if (!p || !k) return;
  const r = k.getBoundingClientRect(), b = Math.min(300, innerWidth - 16), x = document.createElement('div');
  x.id = 'frag-blase'; x.className = 'frag-blase'; x.setAttribute('role', 'note'); x.innerHTML = p.innerHTML; x.style.width = b + 'px'; x.style.maxHeight = Math.round(innerHeight * 0.6) + 'px'; document.body.appendChild(x);
  const h = x.getBoundingClientRect().height;
  x.style.left = Math.round(Math.max(8, Math.min(r.right - b, innerWidth - b - 8))) + 'px';
  x.style.top = Math.round(r.bottom + 6 + h > innerHeight - 8 ? Math.max(8, r.top - 6 - h) : r.bottom + 6) + 'px';
}
const fragZu = () => { document.getElementById('frag-blase')?.remove(); document.querySelectorAll('details.frag[open]').forEach((x) => { x.open = false; }); };
document.addEventListener('toggle', (ev) => { const d = ev.target; if (!d.classList?.contains('frag')) return; if (d.open) { document.querySelectorAll('details.frag[open]').forEach((x) => { if (x !== d) x.open = false; }); fragLegen(d); } else if (!document.querySelector('details.frag[open]')) document.getElementById('frag-blase')?.remove(); }, true);
document.addEventListener('pointerdown', (ev) => { if (document.getElementById('frag-blase') && !ev.target.closest?.('.frag, #frag-blase')) fragZu(); }, true);
addEventListener('resize', fragZu); document.addEventListener('scroll', (ev) => { if (ev.target.closest?.('#frag-blase')) return; const d = document.querySelector('details.frag[open]'); if (!d) return; const r = d.querySelector('summary').getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) fragZu(); else fragLegen(d); }, true);   /* die Blase wandert mit dem „?“ */
document.addEventListener('click', (ev) => {
  if (Date.now() - railGezogen < 400 && ev.target.closest?.('#kopf')) return;   /* der Zug an der Seitenleiste ist kein Tipp */
  const e = ev.target.closest('[data-a]');
  if (s.leisteAuf && !ev.target.closest('#leiste')) { s.leisteAuf = false; leisteZeichnen(); }
  if (e && A[e.dataset.a]) A[e.dataset.a](e, ev);
  if (e && s.leisteAuf && e.closest('.fl-werk')) { s.leisteAuf = false; leisteZeichnen(); }   /* ein Werkzeug aus der Leiste gewählt: Leiste zu */
});
document.addEventListener('submit', (ev) => { ev.preventDefault(); const f = ev.target.dataset.form;
  if (f === 'rezept') formSpeichern(ev.target);
  else if (f === 'abschnitt') abschnittSpeichern(ev.target);
  else if (f === 'web-holen') webHolen();
  else if (f === 'recht') { const r = rezept(s.uid), wahl = new FormData(ev.target).getAll('n').map(Number), e = s.recht; if (!r || !e) return; rezeptSetzen(rechtschreibungAnwenden(r, e.aenderungen.filter((_, i) => wahl.includes(i)))); s.recht = null; fensterZu(); zeichne(); melde(fuelle(L('{0} übernommen', '{0} applied'), wahl.length)); }
  else if (f === 'schluessel') { const a = ev.target.dataset.anbieter, k = $('schl-feld').value.trim(), danach = ev.target.dataset.danach;
    (k ? S.setz(a, k) : S.weg(a)).then(() => { SK[a] = k; fensterZu(); zeichne(); melde(!k ? L('Schlüssel gelöscht', 'Key deleted') : formPasst(a, k) ? L('Schlüssel gespeichert', 'Key saved') : L('Gespeichert. Der Schlüssel sieht ungewohnt aus, bitte prüfen.', 'Saved. The key looks unusual, please check it.')); if (k && danach === 'scan') neuFenster('scan'); else if (k && danach === 'web') neuFenster('web'); else if (k && danach === 'rmenue') rezeptMenue(); else if (k && danach === 'alle-ueb') alleUebFenster(); else if (k && A[danach]) A[danach]({ dataset: {} }); else if (k && danach.startsWith('gratis:')) A['gratis-bild']({ dataset: { uid: danach.slice(7) } }); else if (k && danach) A['ki-bild']({ dataset: { uid: danach } }); }).catch(() => melde(L('Der Schlüssel ließ sich nicht speichern.', 'The key could not be saved.'))); }
  else if (f === 'tresor') { const n = String(new FormData(ev.target).get('name') || '').trim(); tr.ablegen(schreibe(Z), 'benannt', n).then(() => { tresorFenster(); melde(L('Stand im Tresor gesichert', 'State saved in the vault')); }).catch(() => melde(L('Der Tresor ließ sich nicht beschreiben.', 'The vault could not be written.'))); }
  else if (f === 'ek-eigen') { const t = String(new FormData(ev.target).get('t') || '').trim(); if (!t) return; Z.einkauf = { ...Z.einkauf, eigene: [...Z.einkauf.eigene, { id: Date.now().toString(36), text: t }] }; sichern(); zeichne(); document.querySelector('[data-form="ek-eigen"] input')?.focus(); }
  else if (f === 'baum-suche') { $('baumfeld')?.blur(); }
  else if (f === 'baum-ordner-neu') { const n = String(new FormData(ev.target).get('n') || '').trim(); if (!n) return; const a = ordAnlegen(Z.ordner, n); Z.ordner = a.ordner; s.baum.auf.add(bzKey('ord', a.id)); sichern(); fensterZu(); zeichne(); melde(a.neu ? fuelle(L('Ordner „{0}“ angelegt – zieh Rezepte hinein', 'Folder “{0}” created – drag recipes into it'), n) : fuelle(L('Den Ordner „{0}“ gibt es schon', 'The folder “{0}” already exists'), n)); }
  else if (f === 'ordner-neu-zu') { const n = String(new FormData(ev.target).get('n') || '').trim(), uid = ev.target.dataset.uid; if (!n || !uid) return; const a = ordAnlegen(Z.ordner, n); Z.ordner = a.ordner; A['ordner-setzen']({ dataset: { uid, oid: a.id } }); }
  else if (f === 'ein-kat-neu') { const n = String(new FormData(ev.target).get('n') || '').trim(), uid = ev.target.dataset.uid; if (!n || !uid) return; const a = katAnlegen(Z.kategorien, n); Z.kategorien = a.kat; einKat(uid, a.id); }
  else if (f === 'ein-ord-neu') { const n = String(new FormData(ev.target).get('n') || '').trim(), uid = ev.target.dataset.uid; if (!n || !uid) return; const a = ordAnlegen(Z.ordner, n); Z.ordner = a.ordner; einOrd(uid, a.id); }
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
document.addEventListener('change', (ev) => { const o = ev.target.closest?.('.ord-name'); if (o) { Z.ordner = ordUmbenennen(Z.ordner, o.dataset.oid, o.value); sichern(); return; } const f = ev.target.closest?.('.kat-name'); if (!f) return; katNameSetzen(f.dataset.kid, f.value);
  sichern(); });
document.addEventListener('input', (ev) => { if (ev.target.id === 'schriftregler') { E.schrift = schriftSetzen(document.documentElement, ev.target.value); $('schriftzahl').textContent = E.schrift + ' %'; sichern(); return; } if (ev.target.id === 'zs-zoom' && zs) { zs.z = +ev.target.value / 100; zsZeigen(); } });
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'baumfeld') { s.baum.q = ev.target.value; $('baum-rest').innerHTML = baumRest(); $('baum-x').hidden = !s.baum.q; return; }
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
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && s.ansicht !== 'kochen') { if (document.querySelector('.vollbild')) A['voll-zu'](); else if (document.querySelector('.bildvoll')) A['bv-zu'](); else if ($('fensterort').innerHTML) fensterZu(); else if (s.leisteAuf) { s.leisteAuf = false; leisteZeichnen(); } } });
$('datei-sicherung').addEventListener('change', async (ev) => { const d = ev.target.files[0]; ev.target.value = ''; if (!d) return; try { dateiFrage(lies(await W.mit(L('Datei wird eingelesen …', 'Reading the file …'), () => d.text()))); } catch (f) { melde(fehlerText(f, L('Die Datei konnte nicht gelesen werden.', 'The file could not be read.'))); } });
$('datei-bild').addEventListener('change', async (ev) => { const d = ev.target.files[0]; ev.target.value = ''; if (!d) return; if (s.bildZiel) { const uid = s.bildZiel; s.bildZiel = null; try { const img = await W.mit(L('Foto wird aufbereitet …', 'Preparing the photo …'), () => bildAusDatei(d)); Z.rezepte = Z.rezepte.map((r) => (r.uid === uid ? { ...r, img, imgCrop: { x: 50, y: 50, scale: 1 } } : r)); sichern(); zeichne(); melde(L('Bild eingefügt', 'Picture added')); } catch { melde(L('Das Bild konnte nicht gelesen werden.', 'The picture could not be read.')); } return; }
  if (!s.form) return; try { s.form.img = await W.mit(L('Foto wird aufbereitet …', 'Preparing the photo …'), () => bildAusDatei(d)); zeichne(); } catch { melde(L('Das Bild konnte nicht gelesen werden.', 'The picture could not be read.')); } });
for (const id of ['datei-scan', 'datei-kamera']) $(id).addEventListener('change', (ev) => { const d = [...ev.target.files]; ev.target.value = ''; if (d.length) scanGewaehlt(d); });
let altY = 0; addEventListener('scroll', () => { if (breit()) return; const y = scrollY; $('kopf').classList.toggle('weg', y > altY + 4 && y > 80 ? true : y < altY - 4 || y < 40 ? false : $('kopf').classList.contains('weg')); altY = y; }, { passive: true });



/* ---------- Start ---------- */
/* Was die alte App im Gerät hat: Rezepte (localStorage, sonst die Kopie in ihrer Datenbank) und Bilder (nur in der Datenbank). Nur lesen. */
async function altesLesen() {
  const e = ausgabe.speicher.endung, ab = await alteBilder(ausgabe.speicher.indexedDb, e).catch(() => ({ bilder: {}, rezepteText: '' }));
  let alt = null; try { const leer = localStorage.getItem('mrz' + e) == null; alt = ausAltemSpeicher(leer && ab.rezepteText ? { getItem: (k) => (k === 'mrz' + e ? ab.rezepteText : localStorage.getItem(k)) } : localStorage, e); } catch { /* kein Zugriff */ }
  return { alt, bilder: ab.bilder };
}
/* Einmal: wer vor Fassung 0.14.2 übernommen hat, bekam die Rezepte ohne Bilder. Nachgetragen wird nur, wo Nummer und Name (oder Kennung) noch zum alten Rezept passen. */
async function altBilderNachtragen() {
  if (E.altBilder) return; const { alt, bilder } = await altesLesen(); if (!alt || !alt.rezepte.length) return;
  const von = new Map(alt.rezepte.map((r) => [String(r.id), r])), e = bilderAnhaengen(Z.rezepte, bilder, (r) => { const a = von.get(String(r.id)); return !!a && (a.uid === r.uid || a.name === r.name); });
  E.altBilder = true; if (e.dazu) { Z.rezepte = e.rezepte; zeichne(); setTimeout(() => melde(e.dazu === 1 ? L('+1 Bild übernommen', '+1 picture taken over') : fuelle(L('+{0} Bilder übernommen', '+{0} pictures taken over'), e.dazu)), 600); } sichern();
}
async function start() {
  const andere = document.documentElement.dataset.ausgabe || '';   /* eine Einstiegsseite kann eine andere Ausgabe nennen (neu/muttis.html) */
  ausgabe = await (await (/^[a-z-]+$/.test(andere) ? fetch('../ausgaben/' + andere + '/ausgabe.json') : fetch('../ausgaben/rezeptbuch/ausgabe.json'))).json();
  lager = speicher('KuechenKern-' + ausgabe.name); tr = tresor(lager);
  { const e = ausgabe.speicher.endung; S = schluesselLager(lager, { altNamen: { anthropic: ['claudeKey' + e], openai: ['openaiImgKey' + e, 'openaiKey' + e], mistral: ['mistralKey' + e] } }); await schlLaden(); }
  const da = await lager.lies().catch(() => null);
  if (da?.zustand) { Z = { ...leererZustand(), ...da.zustand, rezepte: (da.zustand.rezepte || []).map(normalisiere) }; E = { ...E, ...(da.einstellungen || {}) }; altBilderNachtragen().catch(() => {}); }
  else {
    E.farbe = FARBEN[ausgabe.farbe] ? ausgabe.farbe : 'braun';
    const ab = await altesLesen(), alt = ab.alt;
    if (alt && alt.rezepte.length) { Z = { rezepte: bilderAnhaengen(alt.rezepte, ab.bilder).rezepte, menu: alt.menu, ordner: alt.ordner, kategorien: alt.kategorien }; E.altBilder = true;   /* die Bilder liegen in der Datenbank der alten App, nicht im localStorage */ if (sprKennt(alt.sprache)) E.sprache = alt.sprache; /* dort eigens gewählt */ await lager.schreibe({ fassung: 1, zustand: Z, einstellungen: E }); setTimeout(() => melde(fuelle(L('{0} Rezepte übernommen', '{0} recipes taken over'), alt.rezepte.length)), 300); }
    else if (!new URLSearchParams(location.search).has('leer')) await startRezepte();   /* …/neu/?leer beginnt ohne Startrezepte (für Proben und für alle, die leer anfangen wollen) */
  }
  ergaenze(); E.scan = { anbieter: 'anthropic', stufe: 'schnell', ...(E.scan || {}) };
  if (!sprKennt(E.sprache)) E.sprache = null;   /* leer heißt „wie das Gerät“ */
  if (E.ton !== 'hell' && E.ton !== 'dunkel') E.ton = matchMedia('(prefers-color-scheme: dark)').matches ? 'dunkel' : 'hell';   /* „wie das Gerät“ gibt es als Wahl nicht mehr (Klaus 23.11.): beim ersten Start gilt einmal das Gerät, danach Sonne oder Mond */
  farbeSetzen(document.documentElement, E.farbe, E.ton, { kontrast: !!E.kontrast }); E.schrift = schriftSetzen(document.documentElement, E.schrift);
  hinweiseEinrichten(document, { aus: () => !!E.hinweiseAus });   // Hinweis-Blasen wie in der alten App (Kern), ausschaltbar
  await spracheBereit();   /* vor dem ersten Zeichnen: die Tabelle der Sprache, wenn es eine gibt; fehlt sie, geht es gleich weiter */
  const geteilt = new URLSearchParams(location.search), geteilteAdresse = webAdresse(geteilt.get('url') || '') || webAdresse(geteilt.get('text') || '');   /* über „Teilen“ an die installierte App geschickt */
  const geteiltesRezept = /^#share=/.test(location.hash) ? location.href : '';   /* Link aus einem QR-Code (Format der bisherigen App) */
  history.replaceState({ ansicht: 'start' }, '', location.pathname);
  zeichne(true);
  if (geteilteAdresse) { s.web = { adresse: geteilteAdresse, text: '', stand: '', seitentext: '' }; neuFenster('web'); }
  if (geteiltesRezept) { try { const r = await ausTeilLink(geteiltesRezept); if (r && r.name) { s.form = { ...formAus(null), name: r.name, cat: alleKategorien(Z.rezepte, Z.kategorien).some((c) => c.id === r.cat) ? r.cat : '', servings: r.servings || 4, prepTime: r.prepTime ?? '', ings: (r.ings || []).map(zutatZeile).join('\n'), steps: (r.steps || []).map((x) => x.txt).join('\n\n'), flavors: r.flavors || [] }; geh('form'); melde(L('Geteiltes Rezept. Bitte prüfen.', 'Shared recipe. Please check.')); } } catch { melde(L('Der geteilte Link ließ sich nicht lesen', 'The shared link could not be read')); } }
  NB.beimStart();   /* heute fällige Notizen: eine Meldung beim Öffnen */
  ZI.laden(); ZI.nachziehen();   /* die Sammlung „Meine Food-Zine-Bilder“; alte Seiten am Rezept wandern einmal hinein */
  lager.dauerhaft();
  ZU.altTresor().catch(() => {});   /* Tresor-Stände der bisherigen App, einmal */
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});   // Offline-Vorrat; ohne ihn läuft die App genauso, nur nicht ohne Netz
  fetch('../beispiele/KATALOG.json').then((a) => a.json()).then((k) => { katalog = k; if (s.ansicht === 'start' || s.ansicht === 'werkstatt') zeichne(); }).catch(() => {});
}
/* Bis der Bestand gelesen ist, steht der Wartesatz der Seite da (index.html, deutsch); er folgt gleich der Sprache des Geräts. */
{ const warte = document.querySelector('#main .laden'); document.documentElement.lang = spr(); if (warte) warte.textContent = L('Rezeptbuch wird geöffnet …', 'Opening the recipe book …'); }
start().catch((f) => { $('main').innerHTML = `<div class="leer"><p>${fuelle(L('Das Rezeptbuch konnte nicht starten: {0}', 'The recipe book could not start: {0}'), esc(f.message))}</p></div>`; });

