// Mein Rezeptbuch – neue PWA (Ausgabe „rezeptbuch“ des Küchen-Kerns). Erste Fassung: Start, Rezept, Anlegen/Bearbeiten,
// Kategorien, Suche, Sicherung ein/aus, Beispielbuch, Übernahme aus der alten App. Netz nur auf Knopfdruck.
import { normalisiere, istInhalt, katVonRezept, neueUid, KAT_OHNE } from '../kern/modell/rezept.mjs';
import { alleKategorien, beschriftung, anzahl, leereKategorien } from '../kern/modell/kategorien.mjs';
import { suche } from '../kern/modell/suche.mjs';
import { skaliere } from '../kern/modell/mengen.mjs';
import { leererZustand } from '../kern/modell/zustand.mjs';
import { lies, schreibe, fuehreZusammen, hinweise } from '../kern/sicherung/sicherung.mjs';
import { ausAltemSpeicher } from '../kern/speicher/uebernahme.mjs';
import { speicher } from '../kern/speicher/speicher.mjs';
import { symbol as ic } from '../kern/oberflaeche/symbole.mjs';
import { FARBEN, farbeSetzen } from '../kern/oberflaeche/farben.mjs';
import { bildAusDatei } from '../kern/oberflaeche/bild.mjs';

const FASSUNG = '0.1.0';
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let ausgabe = null, lager = null;
let Z = leererZustand();                     // Rezepte, Wochenplan, Ordner, Kategorien
let E = { farbe: 'braun', leiste: { seite: 'r', pos: 64 }, zuletzt: null };   // Einstellungen dieses Geräts
const s = { ansicht: 'start', uid: null, frage: '', kat: 'alle', portion: {}, werkzeug: false, leisteAuf: false, form: null };

/* ---------- Speichern ---------- */
let schreibUhr = null;
function sichern() { clearTimeout(schreibUhr); schreibUhr = setTimeout(() => lager.schreibe({ fassung: 1, zustand: Z, einstellungen: E }).catch(() => melde('Speichern ist fehlgeschlagen. Bitte eine Sicherung als Datei anlegen.')), 150); }
const rezept = (uid) => Z.rezepte.find((r) => r.uid === uid);
const katName = (c) => beschriftung(c, 'de', Z.kategorien);
const katZeichen = (c) => { const e = Z.kategorien.namen?.[c.id]?.emoji || c.emoji; return e ? `<span aria-hidden="true">${esc(e)}</span>` : ic(c.art === 'ohne' ? 'frage' : c.art === 'unbekannt' ? 'paket' : 'karte'); };

/* ---------- Meldungen ---------- */
let toastUhr = null;
function melde(text, knopf, tun) {
  const t = $('toast'); t.innerHTML = esc(text) + (knopf ? `<button data-a="toast-tun">${esc(knopf)}</button>` : '');
  toastTun = tun || null; clearTimeout(toastUhr); toastUhr = setTimeout(() => { t.innerHTML = ''; toastTun = null; }, knopf ? 7000 : 3500);
}
let toastTun = null;

/* ---------- Navigation (mit Zurück-Taste) ---------- */
function geh(ansicht, extra = {}, ersetzen = false) {
  Object.assign(s, { ansicht, leisteAuf: false, ...extra });
  const st = { ansicht, uid: s.uid };
  if (ersetzen) history.replaceState(st, ''); else history.pushState(st, '');
  zeichne(true); scrollTo(0, 0);
}
addEventListener('popstate', (e) => { const st = e.state || { ansicht: 'start' }; Object.assign(s, { ansicht: st.ansicht, uid: st.uid || null, leisteAuf: false, form: null }); fensterZu(); zeichne(true); });

/* ---------- Kopf ---------- */
function kopfZeichnen() {
  const w = s.werkzeug;
  $('kopf').innerHTML = `<img class="logo" src="../icons/icon-book-192.png?v=1" alt="" width="30" height="30">`
    + (w ? `<div class="werkzeuge" aria-label="Werkzeuge"><button class="rund" data-a="zur-suche" aria-label="Suchen">${ic('suche')}</button><button class="farbknopf" data-a="farbe" aria-label="Farbpalette"></button><button class="rund" data-a="geh" data-zu="werkstatt" aria-label="Werkstatt und Einstellungen">${ic('einst')}</button></div>`
      : `<span class="name">${esc(ausgabe.titel)}</span>`)
    + `<button class="rund akz" data-a="neu" aria-label="Neues Rezept">${ic('plus')}</button>`
    + `<button class="pfeil ${w ? 'auf' : ''}" data-a="werkzeug" aria-expanded="${w}" aria-label="${w ? 'Werkzeuge einklappen' : 'Werkzeuge ausklappen: Suche, Farbe, Einstellungen'}">${ic('links')}</button>`;
}

/* ---------- Start ---------- */
const bildOder = (r, gr = '') => (r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy" ${gr}>` : ic('karte'));
const karte = (r, c) => `<button class="karte" data-a="rezept" data-uid="${esc(r.uid)}"><span class="bild">${bildOder(r)}</span><span class="text"><strong>${esc(r.name)}</strong><small>${r.prepTime ? ic('uhr') + esc(r.prepTime) + ' Min · ' : ''}${esc(c ? katName(c) : '')}</small></span></button>`;

function startHtml() {
  const heute = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  let h = `<p class="gruss">${esc(ausgabe.begruessung?.de || 'Was kochen wir heute?')}<small class="datum">${esc(heute)}</small></p>
   <form class="suche" data-form="suche" role="search">${ic('suche')}<input id="suchfeld" name="q" value="${esc(s.frage)}" placeholder="Rezept, Zutat oder Kategorie …" aria-label="Suchen" autocomplete="off" enterkeyhint="search"><button type="button" id="suche-x" data-a="suche-leer" aria-label="Eingabe löschen" ${s.frage ? '' : 'hidden'}>${ic('x')}</button></form>`;
  return h + `<div id="start-rest">${startRest()}</div>`;
}
function startRest() {
  const alle = Z.rezepte.filter(istInhalt), kats = alleKategorien(Z.rezepte, Z.kategorien).filter((c) => anzahl(Z.rezepte, c.id) > 0);
  const katVon = new Map(kats.map((c) => [c.id, c]));
  let h = '';
  if (!alle.length) return leerHtml();
  if (s.frage.trim()) {
    const tr = suche(Z.rezepte, s.frage, Z.kategorien);
    return `<div class="ueber"><h2>Treffer</h2><small>${tr.length} von ${alle.length}</small></div>` + (tr.length ? `<div class="gitter">${tr.map((r) => karte(r, katVon.get(katVonRezept(r)))).join('')}</div>` : `<div class="leer"><p>Nichts gefunden für „${esc(s.frage)}“.</p></div>`);
  }
  const erstesBild = (id) => alle.find((r) => (id === 'alle' || katVonRezept(r) === id) && r.img);
  h += `<div class="fotokat" role="group" aria-label="Kategorien">` + [{ id: 'alle', de: 'Alle' }, ...kats].map((c) => {
    const b = erstesBild(c.id), n = c.id === 'alle' ? alle.length : anzahl(Z.rezepte, c.id);
    return `<button data-a="kat" data-kat="${esc(c.id)}" aria-pressed="${s.kat === c.id}"><span class="bild">${b ? `<img src="${esc(b.img)}" alt="" loading="lazy">` : (c.id === 'alle' ? ic('buch') : katZeichen(c))}</span><span>${esc(c.id === 'alle' ? 'Alle' : katName(c))} <small>${n}</small></span></button>`;
  }).join('') + `</div>`;
  if (s.kat === 'alle') {
    const trink = new Set(['drk', 'smooth', 'mock', 'afckt', 'limo', 'tee', 'ckt', 'bowle', 'sirup']);
    const z = rezept(E.zuletzt) || alle.find((r) => r.img && !trink.has(r.cat)) || alle.find((r) => r.img) || alle[0];
    h += `<div class="ueber"><h2>${E.zuletzt && rezept(E.zuletzt) ? 'Weiterkochen' : 'Zum Anfangen'}</h2></div>
     <button class="held" data-a="rezept" data-uid="${esc(z.uid)}">${bildOder(z)}<span class="verlauf"><strong>${esc(z.name)}</strong><span class="meta">${z.prepTime ? `<span>${ic('uhr')}${esc(z.prepTime)} Min</span>` : ''}<span>${ic('leute')}${z.servings} ${z.servings === 1 ? 'Portion' : 'Portionen'}</span></span></span></button>`;
    for (const c of kats) { const rz = alle.filter((r) => katVonRezept(r) === c.id);
      h += `<div class="ueber"><h2>${esc(katName(c))}</h2><small>${rz.length}</small></div><div class="gitter">${rz.map((r) => karte(r, c)).join('')}</div>`; }
  } else {
    const c = katVon.get(s.kat), rz = alle.filter((r) => katVonRezept(r) === s.kat);
    h += `<div class="ueber"><h2>${esc(c ? katName(c) : '')}</h2><small>${rz.length}</small></div><div class="gitter">${rz.map((r) => karte(r, c)).join('')}</div>`;
  }
  return h;
}
function leerHtml() {
  return `<div class="leer"><h2 style="font-size:17px">Willkommen. Womit fangen wir an?</h2>
   <p>Das Buch ist noch leer. Du kannst das Beispielbuch laden (${beispielText()}), eine Sicherung einlesen oder das erste Rezept selbst schreiben.</p>
   <div class="reihe"><button class="knopf akz" data-a="beispiel">${ic('laden')}Beispielbuch laden</button><button class="knopf" data-a="einlesen">${ic('ordner')}Sicherung einlesen</button><button class="knopf" data-a="neu">${ic('stift')}Selbst schreiben</button></div></div>`;
}
let katalog = null;
const beispielText = () => { const p = katalog?.pakete?.find((x) => x.id === ausgabe.beispiele[0]); return p ? `${p.anzahl} Rezepte, ${(p.bytes / 1e6).toFixed(0)} MB` : 'aus dem Netz'; };

/* ---------- Rezept ---------- */
function rezeptHtml() {
  const r = rezept(s.uid); if (!r) return `<div class="leer"><p>Dieses Rezept gibt es nicht mehr.</p><button class="knopf" data-a="geh" data-zu="start">Zur Startseite</button></div>`;
  const c = alleKategorien(Z.rezepte, Z.kategorien).find((x) => x.id === katVonRezept(r));
  const n = s.portion[r.uid] || r.servings, f = n / r.servings;
  return `<div class="rezept-held">${r.img ? `<img src="${esc(r.img)}" alt="${esc(r.name)}">` : ic('karte')}
    <div class="oben"><button class="rund" data-a="zurueck" aria-label="Zurück">${ic('zurueck')}</button><span><button class="rund" data-a="bearbeiten" aria-label="Bearbeiten">${ic('stift')}</button><button class="rund" data-a="loeschen" aria-label="Rezept löschen">${ic('muell')}</button></span></div>
    <div class="verlauf"><h1>${esc(r.name)}</h1><div class="meta">${r.prepTime ? `<span>${ic('uhr')}${esc(r.prepTime)} Min</span>` : ''}<span>${ic('karte')}${esc(c ? katName(c) : '')}</span>${r.rating?.stars ? `<span>${ic('stern')}${r.rating.stars}</span>` : ''}</div></div></div>
   <div class="bogen"><div class="zweispalt"><div>
    <div class="portion"><span>Portionen</span><span class="st"><button data-a="portion" data-d="-1" aria-label="Weniger">${ic('minus')}</button><b id="portionen">${n}</b><button data-a="portion" data-d="1" aria-label="Mehr">${ic('plus')}</button></span></div>
    <h2 class="h">Zutaten</h2><ul class="zut">${r.ings.map((z) => `<li><b>${esc([skaliere(z.amt, f), z.unit].filter(Boolean).join(' '))}</b><span>${esc(z.name)}${z.note ? `<small>${esc(z.note)}</small>` : ''}</span></li>`).join('')}</ul></div>
    <div><h2 class="h">Zubereitung</h2><ol class="schritte">${r.steps.map((x) => `<li><span>${esc(x.txt)}${x.note ? `<small>${esc(x.note)}</small>` : ''}</span></li>`).join('')}</ol>
    ${r.source ? `<p class="quelle">Quelle: ${esc(r.source)}</p>` : ''}</div></div></div>`;
}

/* ---------- Anlegen und Bearbeiten ---------- */
const zutatZeile = (z) => [z.amt, z.unit, z.name].filter(Boolean).join(' ') + (z.note ? ` (${z.note})` : '');
function zutatAusZeile(t) {
  const m = t.trim().match(/^([\d.,\/½¼¾⅓⅔⅛–-]+(?:\s+[\d\/½¼¾⅓⅔⅛]+)?)\s+(?:(g|kg|ml|l|cl|EL|TL|Prise|Prisen|Stück|Bund|Dose|Dosen|Pck\.?|Päckchen|Zehe|Zehen|Scheibe|Scheiben|Blatt|Tasse|Tassen|Becher|Stange|Stangen|Handvoll|Spritzer)\s+)?(.+)$/i);
  if (!m) return { amt: '', unit: '', name: t.trim(), note: '' };
  const nn = m[3].match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return { amt: m[1].trim(), unit: m[2] || '', name: (nn ? nn[1] : m[3]).trim(), note: nn ? nn[2].trim() : '' };
}
function formHtml() {
  const f = s.form, kats = alleKategorien(Z.rezepte, Z.kategorien).filter((c) => c.art !== 'ohne');
  return `<div class="ueber"><h2 style="font-size:19px">${f.neu ? 'Neues Rezept' : 'Rezept bearbeiten'}</h2></div>
  <form class="felder" data-form="rezept">
   <label>Name<input class="feld" name="name" value="${esc(f.name)}" required autocomplete="off"></label>
   <div class="zwei"><label>Kategorie<select class="feld" name="cat"><option value="">ohne Kategorie</option>${kats.map((c) => `<option value="${esc(c.id)}" ${f.cat === c.id ? 'selected' : ''}>${esc(katName(c))}</option>`).join('')}</select></label>
   <label>Neue Kategorie (statt Auswahl)<input class="feld" name="katneu" placeholder="z. B. Sushi" autocomplete="off"></label></div>
   <div class="zwei"><label>Portionen<input class="feld" name="servings" type="number" min="1" max="99" value="${esc(f.servings)}"></label><label>Zeit in Minuten<input class="feld" name="prepTime" type="number" min="0" max="999" value="${esc(f.prepTime ?? '')}"></label></div>
   <label>Zutaten, eine je Zeile (z. B. „200 g Mehl“)<textarea class="feld" name="ings">${esc(f.ings)}</textarea></label>
   <label>Schritte, einer je Absatz<textarea class="feld" name="steps" style="min-height:170px">${esc(f.steps)}</textarea></label>
   <div class="formbild">${f.img ? `<img src="${esc(f.img)}" alt="">` : ''}<button type="button" class="knopf" data-a="bild-waehlen">${ic('kamera')}${f.img ? 'Anderes Foto' : 'Foto dazu'}</button>${f.img ? `<button type="button" class="knopf" data-a="bild-weg">Foto entfernen</button>` : ''}</div>
   <div class="reihe"><button class="knopf akz" type="submit">${ic('haken')}Speichern</button><button class="knopf" type="button" data-a="zurueck">Abbrechen</button></div>
  </form>`;
}
function formAus(r) {
  return { neu: !r, uid: r?.uid || null, name: r?.name || '', cat: r?.cat || (s.kat !== 'alle' && s.kat !== KAT_OHNE ? s.kat : ''), servings: r?.servings || 4, prepTime: r?.prepTime ?? '', img: r?.img || '',
    ings: (r?.ings || []).map(zutatZeile).join('\n'), steps: (r?.steps || []).map((x) => x.txt).join('\n\n') };
}
function formLesen(form) { const d = new FormData(form); for (const k of ['name', 'cat', 'servings', 'prepTime', 'ings', 'steps']) s.form[k] = d.get(k); return d; }
function formSpeichern(form) {
  const d = formLesen(form), f = s.form;
  if (!String(f.name).trim()) { melde('Bitte einen Namen eintragen.'); return; }
  let cat = f.cat; const katneu = String(d.get('katneu') || '').trim();
  if (katneu) {
    const da = alleKategorien(Z.rezepte, Z.kategorien).find((c) => katName(c).toLowerCase() === katneu.toLowerCase());
    if (da) cat = da.id; else { cat = 'eig_' + Date.now().toString(36); Z.kategorien = { ...Z.kategorien, eigene: [...Z.kategorien.eigene, { id: cat, de: katneu, symbol: 'karte' }] }; }
  }
  const alt = f.uid ? rezept(f.uid) : null;
  const neu = normalisiere({ ...(alt || { id: Z.rezepte.reduce((m, r) => Math.max(m, +r.id || 0), 0) + 1, uid: neueUid(), created: new Date().toISOString() }), name: f.name, cat, servings: f.servings, prepTime: f.prepTime === '' ? undefined : +f.prepTime, img: f.img,
    ings: String(f.ings).split('\n').filter((t) => t.trim()).map(zutatAusZeile), steps: String(f.steps).split(/\n\s*\n|\n/).filter((t) => t.trim()).map((txt) => ({ txt })), modified: new Date().toISOString() });
  delete neu.beispiel;
  Z.rezepte = alt ? Z.rezepte.map((r) => (r.uid === alt.uid ? neu : r)) : [...Z.rezepte, neu];
  sichern(); s.form = null; melde('Gespeichert'); geh('rezept', { uid: neu.uid }, true);
}

/* ---------- Werkstatt ---------- */
const zeile = (a, i, t, u, extra = '') => `<button class="zeile" data-a="${a}" ${extra}>${ic(i)}<span>${esc(t)}${u ? `<small>${esc(u)}</small>` : ''}</span>${ic('rechts', 'pf')}</button>`;
const frag = (t) => `<details class="frag"><summary aria-label="Erklärung">?</summary><p>${esc(t)}</p></details>`;
function werkstattHtml() {
  const n = Z.rezepte.filter(istInhalt).length, b = Z.rezepte.filter((r) => r.beispiel).length;
  return `<div class="ueber"><h2 style="font-size:19px">Werkstatt</h2><small>${n} Rezepte</small></div>
  <div class="gruppe"><h3>Sichern ${frag('Die Rezepte liegen nur in diesem Gerät. Eine Sicherung als Datei schützt sie, wenn der Browser geleert wird, und bringt sie auf ein anderes Gerät. KI-Schlüssel kommen nie in die Datei.')}</h3><div class="liste">
   ${zeile('sichern', 'laden', 'Sicherung als Datei', 'alle Rezepte mit Bildern und Kategorien')}${zeile('einlesen', 'ordner', 'Sicherung einlesen', 'auch aus der alten App, aus Muttis Rezeptbuch und dem Mixarium')}</div></div>
  <div class="gruppe"><h3>Beispiele</h3><div class="liste">
   ${zeile('beispiel', 'paket', 'Beispielbuch laden', beispielText())}${b ? zeile('beispiele-weg', 'muell', 'Beispiele entfernen', `${b} Beispiel-Rezepte, eigene bleiben`) : ''}</div></div>
  <div class="gruppe"><h3>Darstellung</h3><div class="liste">${zeile('farbe', 'einst', 'Farbe', FARBEN[E.farbe]?.de || '')}</div></div>
  <div class="gruppe"><h3>Aufräumen</h3><div class="liste">${zeile('alles-weg', 'muell', 'Alle Rezepte löschen', 'mit Rückfrage')}</div></div>
  <p class="quelle">Mein Rezeptbuch, neue Fassung ${FASSUNG}. Kochansicht, Einkaufsliste, Wochenplan, Import per Foto und Web, Bücher und Übersetzung folgen. <a href="../" style="color:inherit">Zur bisherigen App</a></p>`;
}

/* ---------- Fenster ---------- */
function fenster(html) { $('fensterort').innerHTML = `<div class="schleier" data-a="fenster-zu"><div class="fenster" role="dialog" aria-modal="true">${html}</div></div>`; }
function fensterZu() { $('fensterort').innerHTML = ''; }
function frage(titel, text, ja, tun, rot = true) { jaTun = tun; fenster(`<h2>${esc(titel)}</h2><p>${esc(text)}</p><div class="reihe"><button class="knopf ${rot ? 'rot' : 'akz'}" data-a="ja">${esc(ja)}</button><button class="knopf" data-a="fenster-zu">Abbrechen</button></div>`); }
let jaTun = null;
function farbFenster() {
  fenster(`<h2>Farbe</h2><div class="fleckliste" role="menu">${Object.entries(FARBEN).map(([n, f]) => `<button role="menuitemradio" aria-checked="${E.farbe === n}" data-a="farbe-wahl" data-farbe="${n}"><span class="fleck" style="background:linear-gradient(135deg,${f.k[0]},${f.k[2]})"></span>${esc(f.de)}</button>`).join('')}</div>`);
}

/* ---------- Sicherung, Beispiele ---------- */
function herunterladen(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function einfuegen(eingang, beispiel = false) {
  if (beispiel) eingang = { ...eingang, rezepte: eingang.rezepte.map((r) => ({ ...r, beispiel: true })) };
  const h = hinweise(eingang), m = fuehreZusammen(Z, eingang);
  const vorher = Z; Z = m.zustand; sichern(); s.kat = 'alle'; s.frage = '';
  melde(`${m.neu} Rezepte dazu${m.doppelt ? `, ${m.doppelt} waren schon da` : ''}${h.ohneKategorie ? `, ${h.ohneKategorie} ohne Kategorie` : ''}`, m.neu ? 'Rückgängig' : '', () => { Z = vorher; sichern(); zeichne(true); });
  geh('start', {}, s.ansicht === 'start');
}
async function beispielLaden() {
  const p = katalog?.pakete?.find((x) => x.id === ausgabe.beispiele[0]); if (!p) { melde('Das Beispielbuch ist gerade nicht erreichbar.'); return; }
  melde('Beispielbuch wird geladen …');
  try {
    const ant = await fetch('../beispiele/' + p.datei); if (!ant.ok) throw new Error(String(ant.status));
    const roh = await ant.arrayBuffer();
    const sum = [...new Uint8Array(await crypto.subtle.digest('SHA-256', roh))].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (sum !== p.sha256) { melde('Das Beispielbuch ist beschädigt angekommen und wurde nicht eingelesen.'); return; }
    einfuegen(lies(new TextDecoder().decode(roh)), true);
  } catch { melde('Das Beispielbuch konnte nicht geladen werden. Besteht eine Verbindung?'); }
}

/* ---------- Flying Widget ---------- */
function leisteZeichnen() {
  const o = $('leiste'), L = E.leiste, u = L.seite === 'u';
  o.className = 'fl ' + L.seite; document.body.dataset.fl = L.seite;
  o.style.top = u ? '' : (s.leisteAuf ? Math.min(70, Math.max(30, L.pos)) : L.pos) + '%'; o.style.left = u ? (s.leisteAuf ? 50 : L.pos) + '%' : '';
  if (!s.leisteAuf) { o.innerHTML = `<button class="fl-griff" data-a="leiste-auf" aria-label="Leiste öffnen: Rezepte, Werkstatt. Lange drücken oder ziehen verschiebt sie."><span></span></button>`; return; }
  const k = (a, i, t, x = '') => `<button role="menuitem" data-a="${a}" ${x}>${i}${t}</button>`;
  o.innerHTML = `<div class="fl-knoepfe" role="menu"><button class="fl-zu" data-a="leiste-zu" aria-label="Schließen">${ic('x')}</button>`
    + k('geh', ic('buch'), 'Rezepte', `data-zu="start" ${s.ansicht === 'start' ? 'aria-current="page"' : ''}`) + k('geh', ic('funken'), 'Werkstatt', `data-zu="werkstatt" ${s.ansicht === 'werkstatt' ? 'aria-current="page"' : ''}`)
    + '<hr>' + k('nach-oben', ic('hoch'), 'Nach oben') + k('zurueck', ic('zurueck'), 'Zurück') + k('farbe', '<span class="farbknopf"></span>', 'Farbe') + '</div>';
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
  const m = $('main');
  m.innerHTML = s.ansicht === 'rezept' ? rezeptHtml() : s.ansicht === 'form' ? formHtml() : s.ansicht === 'werkstatt' ? werkstattHtml() : startHtml();
  m.classList.toggle('einzug', einzug); document.body.dataset.ansicht = s.ansicht;
  document.title = s.ansicht === 'rezept' && rezept(s.uid) ? `${rezept(s.uid).name} · ${ausgabe.titel}` : ausgabe.titel;
}

/* ---------- Handlungen ---------- */
const A = {
  geh: (e) => geh(e.dataset.zu, { uid: null, form: null }),
  rezept: (e) => { E.zuletzt = e.dataset.uid; sichern(); geh('rezept', { uid: e.dataset.uid }); },
  zurueck: () => { s.form = null; if (history.state && history.length > 1) history.back(); else geh('start', {}, true); },
  kat: (e) => { s.kat = e.dataset.kat; zeichne(); },
  werkzeug: () => { s.werkzeug = !s.werkzeug; kopfZeichnen(); },
  'zur-suche': () => { if (s.ansicht !== 'start') geh('start'); $('suchfeld')?.focus(); },
  'suche-leer': () => { s.frage = ''; zeichne(); $('suchfeld')?.focus(); },
  neu: () => { s.form = formAus(null); geh('form'); },
  bearbeiten: () => { s.form = formAus(rezept(s.uid)); geh('form'); },
  loeschen: () => { const r = rezept(s.uid); if (!r) return; const vorher = Z.rezepte; Z.rezepte = Z.rezepte.filter((x) => x.uid !== r.uid); sichern(); geh('start', { uid: null }, true); melde(`„${r.name}“ gelöscht`, 'Rückgängig', () => { Z.rezepte = vorher; sichern(); zeichne(true); }); },
  portion: (e) => { const r = rezept(s.uid); const n = Math.min(99, Math.max(1, (s.portion[r.uid] || r.servings) + +e.dataset.d)); s.portion[r.uid] = n; zeichne(); },
  'bild-waehlen': () => { formLesen(document.querySelector('[data-form=rezept]')); $('datei-bild').click(); },
  'bild-weg': () => { formLesen(document.querySelector('[data-form=rezept]')); s.form.img = ''; zeichne(); },
  sichern: () => { const d = new Date(); herunterladen(`${ausgabe.name}-${d.toISOString().slice(0, 10)}.json`, JSON.stringify(schreibe(Z))); melde('Sicherung gespeichert'); },
  einlesen: () => $('datei-sicherung').click(),
  beispiel: () => beispielLaden(),
  'beispiele-weg': () => { const n = Z.rezepte.filter((r) => r.beispiel).length; frage('Beispiele entfernen?', `${n} Beispiel-Rezepte werden entfernt. Deine eigenen Rezepte bleiben.`, 'Entfernen', () => { const vorher = Z.rezepte; Z.rezepte = Z.rezepte.filter((r) => !r.beispiel); sichern(); zeichne(); melde(`${n} Beispiele entfernt`, 'Rückgängig', () => { Z.rezepte = vorher; sichern(); zeichne(); }); }); },
  'alles-weg': () => { const n = Z.rezepte.filter(istInhalt).length; frage('Alle Rezepte löschen?', `${n} Rezepte werden gelöscht. Lege vorher eine Sicherung als Datei an, wenn du sie behalten willst.`, 'Alle löschen', () => { const vorher = Z; Z = { ...leererZustand(), kategorien: leereKategorien() }; E.zuletzt = null; sichern(); geh('start', {}, true); melde('Alle Rezepte gelöscht', 'Rückgängig', () => { Z = vorher; sichern(); zeichne(true); }); }); },
  farbe: () => farbFenster(),
  'farbe-wahl': (e) => { E.farbe = e.dataset.farbe; farbeSetzen(document.documentElement, E.farbe); sichern(); fensterZu(); zeichne(); },
  ja: () => { const t = jaTun; jaTun = null; fensterZu(); t?.(); },
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
});
document.addEventListener('submit', (ev) => { ev.preventDefault(); const f = ev.target.dataset.form; if (f === 'rezept') formSpeichern(ev.target); });
document.addEventListener('input', (ev) => {
  if (ev.target.id !== 'suchfeld') return;
  s.frage = ev.target.value; $('start-rest').innerHTML = startRest(); $('suche-x').hidden = !s.frage;   // das Feld selbst bleibt stehen (Tastatur, Diktat)
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { if ($('fensterort').innerHTML) fensterZu(); else if (s.leisteAuf) { s.leisteAuf = false; leisteZeichnen(); } } });
$('datei-sicherung').addEventListener('change', async (ev) => { const d = ev.target.files[0]; ev.target.value = ''; if (!d) return; try { einfuegen(lies(await d.text())); } catch (f) { melde(f.message || 'Die Datei konnte nicht gelesen werden.'); } });
$('datei-bild').addEventListener('change', async (ev) => { const d = ev.target.files[0]; ev.target.value = ''; if (!d || !s.form) return; try { s.form.img = await bildAusDatei(d); zeichne(); } catch { melde('Das Bild konnte nicht gelesen werden.'); } });
let altY = 0; addEventListener('scroll', () => { const y = scrollY; $('kopf').classList.toggle('weg', y > altY + 4 && y > 80 ? true : y < altY - 4 || y < 40 ? false : $('kopf').classList.contains('weg')); altY = y; }, { passive: true });

/* ---------- Start ---------- */
async function start() {
  ausgabe = await (await fetch('../ausgaben/rezeptbuch/ausgabe.json')).json();
  lager = speicher('KuechenKern-' + ausgabe.name);
  const da = await lager.lies().catch(() => null);
  if (da?.zustand) { Z = { ...leererZustand(), ...da.zustand, rezepte: (da.zustand.rezepte || []).map(normalisiere) }; E = { ...E, ...(da.einstellungen || {}) }; }
  else {
    E.farbe = FARBEN[ausgabe.farbe] ? ausgabe.farbe : 'braun';
    let alt = null; try { alt = ausAltemSpeicher(localStorage, ausgabe.speicher.endung); } catch { /* kein Zugriff */ }
    if (alt && alt.rezepte.length) { Z = { rezepte: alt.rezepte, menu: alt.menu, ordner: alt.ordner, kategorien: alt.kategorien }; await lager.schreibe({ fassung: 1, zustand: Z, einstellungen: E }); setTimeout(() => melde(`${alt.rezepte.length} Rezepte aus der bisherigen App übernommen. Dort bleibt alles, wie es ist.`), 300); }
  }
  farbeSetzen(document.documentElement, E.farbe);
  history.replaceState({ ansicht: 'start' }, '');
  zeichne(true);
  lager.dauerhaft();
  fetch('../beispiele/KATALOG.json').then((a) => a.json()).then((k) => { katalog = k; if (s.ansicht === 'start' || s.ansicht === 'werkstatt') zeichne(); }).catch(() => {});
}
start().catch((f) => { $('main').innerHTML = `<div class="leer"><p>Das Rezeptbuch konnte nicht starten: ${esc(f.message)}</p></div>`; });
