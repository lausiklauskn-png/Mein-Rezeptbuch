// Mein Rezeptbuch – neue PWA (Ausgabe „rezeptbuch“ des Küchen-Kerns). Erste Fassung: Start, Rezept, Anlegen/Bearbeiten,
// Kategorien, Suche, Sicherung ein/aus, Beispielbuch, Übernahme aus der alten App. Netz nur auf Knopfdruck.
import { normalisiere, istInhalt, katVonRezept, neueUid, KAT_OHNE } from '../kern/modell/rezept.mjs';
import { alleKategorien, beschriftung, anzahl, leereKategorien, KATEGORIEN_FEST, anlegen as katAnlegen, umbenennen as katUmbenennen, loeschen as katLoeschen, umsortieren as katUmsortieren } from '../kern/modell/kategorien.mjs';
import { suche } from '../kern/modell/suche.mjs';
import { skaliere } from '../kern/modell/mengen.mjs';
import { leererZustand } from '../kern/modell/zustand.mjs';
import { lies, schreibe, fuehreZusammen, hinweise } from '../kern/sicherung/sicherung.mjs';
import { ausAltemSpeicher } from '../kern/speicher/uebernahme.mjs';
import { speicher } from '../kern/speicher/speicher.mjs';
import { symbol as ic } from '../kern/oberflaeche/symbole.mjs';
import { FARBEN, farbeSetzen } from '../kern/oberflaeche/farben.mjs';
import { bildAusDatei } from '../kern/oberflaeche/bild.mjs';
import { zutatenFuerSchritt, zeitImSchritt } from '../kern/modell/kochen.mjs';
import { GERAETE, erkenne, geraetSvg } from '../kern/oberflaeche/geraete.mjs';
import { einkaufsliste, gruppenFolge, gruppeVerschieben, WARENGRUPPEN } from '../kern/modell/einkauf.mjs';
import { rezeptAusText, zutatAusZeile, zutatZeile } from '../kern/import/text.mjs';
import { diktat, diktatAus, diktatMoeglich } from '../kern/oberflaeche/diktat.mjs';
import { woche, planen, entplanen, ausAltemMenu, tagIso } from '../kern/modell/plan.mjs';

const FASSUNG = '0.5.0';
const breit = () => matchMedia('(min-width:1000px)').matches;
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let ausgabe = null, lager = null;
let Z = leererZustand();                     // Rezepte, Wochenplan, Ordner, Kategorien
let E = { farbe: 'braun', leiste: { seite: 'r', pos: 64 }, zuletzt: null, kochSchrift: 'mittel', railZu: false };   // Einstellungen dieses Geräts
const s = { ansicht: 'start', uid: null, frage: '', kat: 'alle', portion: {}, werkzeug: false, leisteAuf: false, form: null, nurDies: false, planTag: new Date(), bilder: { gross: false, filter: 'alle', wahl: new Set() }, bildZiel: null };
const LEER_EINKAUF = () => ({ posten: [], haken: {}, eigene: [], laeden: { Supermarkt: [] }, laden: 'Supermarkt' });
function ergaenze() { Z.einkauf = { ...LEER_EINKAUF(), ...(Z.einkauf || {}) }; if (!Z.einkauf.laeden[Z.einkauf.laden]) Z.einkauf.laden = Object.keys(Z.einkauf.laeden)[0] || 'Supermarkt'; if (!Z.einkauf.laeden[Z.einkauf.laden]) Z.einkauf.laeden[Z.einkauf.laden] = []; if (!Z.plan) Z.plan = ausAltemMenu(Z.menu, Z.rezepte); }

/* ---------- Speichern ---------- */
let schreibUhr = null;
function sichern() { clearTimeout(schreibUhr); schreibUhr = setTimeout(() => lager.schreibe({ fassung: 1, zustand: Z, einstellungen: E }).catch(() => melde('Speichern ist fehlgeschlagen. Bitte eine Sicherung als Datei anlegen.')), 150); }
const rezept = (uid) => Z.rezepte.find((r) => r.uid === uid);
const katName = (c) => beschriftung(c, 'de', Z.kategorien);
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
  Object.assign(s, { ansicht, leisteAuf: false, ...extra });
  if (ansicht === 'kochen') { $('toast').innerHTML = ''; toastTun = null; }   // nichts über den Knöpfen der Kochansicht
  const st = { ansicht, uid: s.uid };
  if (ersetzen) history.replaceState(st, ''); else history.pushState(st, '');
  zeichne(true); scrollTo(0, 0);
}
addEventListener('popstate', (e) => { const st = e.state || { ansicht: 'start' }; Object.assign(s, { ansicht: st.ansicht, uid: st.uid || null, leisteAuf: false, form: null }); fensterZu(); zeichne(st.ansicht !== 'rezept' || !breit()); });

const mik = (feld) => (diktatMoeglich() ? `<button type="button" class="mik" data-a="diktat" data-feld="${feld}" aria-label="Sprechen statt tippen" aria-pressed="false">${ic('mikro')}</button>` : '');
/* ---------- Kopf ---------- */
function kopfZeichnen() {
  const w = s.werkzeug, k = $('kopf');
  k.classList.toggle('zu', !!E.railZu);
  if (breit()) {
    const n = (zu, i, t) => `<button class="rail-n" data-a="geh" data-zu="${zu}" ${(zu === 'start' ? ['start', 'rezept', 'kochen'].includes(s.ansicht) : s.ansicht === zu) ? 'aria-current="page"' : ''} title="${t}">${ic(i)}<span class="t">${t}</span></button>`;
    k.innerHTML = `<div class="rail-oben"><img class="logo" src="../icons/icon-book-192.png?v=1" alt="" width="30" height="30"><span class="name t">${esc(ausgabe.titel)}</span><button class="rail-klapp" data-a="rail" aria-label="${E.railZu ? 'Leiste ausklappen' : 'Leiste einklappen'}">${ic(E.railZu ? 'rechts' : 'links')}</button></div>
     <button class="knopf akz rail-neu" data-a="neu" aria-label="Neues Rezept">${ic('plus')}<span class="t">Neues Rezept</span></button>${n('start', 'buch', 'Rezepte')}${n('plan', 'plan', 'Planer')}${n('einkauf', 'einkauf', 'Einkauf').replace('</button>', (ekOffen() ? `<span class="zahl">${ekOffen()}</span>` : '') + '</button>')}${n('werkstatt', 'funken', 'Werkstatt')}
     <button class="rail-n" data-a="farbe" title="Farbe"><span class="farbknopf"></span><span class="t">Farbe</span></button>`;
    return;
  }
  $('kopf').innerHTML = `<img class="logo" src="../icons/icon-book-192.png?v=1" alt="" width="30" height="30">`
    + (w ? `<div class="werkzeuge" aria-label="Werkzeuge"><button class="rund" data-a="zur-suche" aria-label="Suchen">${ic('suche')}</button><button class="farbknopf" data-a="farbe" aria-label="Farbpalette"></button><button class="rund" data-a="geh" data-zu="werkstatt" aria-label="Werkstatt und Einstellungen">${ic('einst')}</button></div>`
      : `<span class="name">${esc(ausgabe.titel)}</span>`)
    + `<button class="rund akz" data-a="neu" aria-label="Neues Rezept">${ic('plus')}</button>`
    + `<button class="pfeil ${w ? 'auf' : ''}" data-a="werkzeug" aria-expanded="${w}" aria-label="${w ? 'Werkzeuge einklappen' : 'Werkzeuge ausklappen: Suche, Farbe, Einstellungen'}">${ic('links')}</button>`;
}

/* ---------- Start ---------- */
/** Bildausschnitt (r.imgCrop wie in der alten App: x, y in Prozent, scale) als Stil. */
const zahl = (v, sonst) => (Number.isFinite(+v) && v !== '' && v != null ? +v : sonst);   // 0 ist ein gültiger Wert (Lage oben/links)
const ausschnitt = (r) => { const c = r.imgCrop; if (!c || (c.x === 50 && c.y === 50 && (c.scale || 1) === 1)) return ''; const x = zahl(c.x, 50), y = zahl(c.y, 50), z = Math.min(3, Math.max(1, zahl(c.scale, 1))); return `style="object-position:${x}% ${y}%;${z > 1 ? `transform:scale(${z});transform-origin:${x}% ${y}%` : ''}"`; };
const bildOder = (r, gr = '') => (r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy" ${ausschnitt(r)} ${gr}>` : ic('karte'));
const karte = (r, c) => `<button class="karte" data-a="rezept" data-uid="${esc(r.uid)}"><span class="bild">${bildOder(r)}</span><span class="text"><strong>${esc(r.name)}</strong><small>${r.prepTime ? ic('uhr') + esc(r.prepTime) + ' Min · ' : ''}${esc(c ? katName(c) : '')}</small></span></button>`;

function startHtml() {
  const heute = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  let h = `<p class="gruss">${esc(ausgabe.begruessung?.de || 'Was kochen wir heute?')}<small class="datum">${esc(heute)}</small></p>
   <form class="suche" data-form="suche" role="search">${ic('suche')}<input id="suchfeld" name="q" value="${esc(s.frage)}" placeholder="Rezept, Zutat oder Kategorie …" aria-label="Suchen" autocomplete="off" enterkeyhint="search">${mik('#suchfeld')}<button type="button" id="suche-x" data-a="suche-leer" aria-label="Eingabe löschen" ${s.frage ? '' : 'hidden'}>${ic('x')}</button></form>`;
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
    h += `<div class="ueber held-ueber"><h2>${E.zuletzt && rezept(E.zuletzt) ? 'Weiterkochen' : 'Zum Anfangen'}</h2></div>
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
  return `<div class="rezept-held">${r.img ? `<img src="${esc(r.img)}" alt="${esc(r.name)}" ${ausschnitt(r)}>` : ic('karte')}
    <div class="oben"><button class="rund" data-a="zurueck" aria-label="Zurück">${ic('zurueck')}</button><span><button class="rund nurbreit" data-a="nurdies" aria-label="${s.nurDies ? 'Liste und Leiste wieder zeigen' : 'Nur dieses Rezept zeigen'}" title="${s.nurDies ? 'Alles zeigen' : 'Nur dieses Rezept'}">${ic('voll')}</button>${r.img ? `<button class="rund" data-a="zuschnitt" aria-label="Bild anpassen">${ic('zuschnitt')}</button>` : ''}<button class="rund" data-a="kat-zuordnen" aria-label="Kategorie zuordnen">${ic('ordner')}</button><button class="rund" data-a="bearbeiten" aria-label="Bearbeiten">${ic('stift')}</button><button class="rund" data-a="loeschen" aria-label="Rezept löschen">${ic('muell')}</button></span></div>
    <div class="verlauf"><h1>${esc(r.name)}</h1><div class="meta">${r.prepTime ? `<span>${ic('uhr')}${esc(r.prepTime)} Min</span>` : ''}<span>${ic('karte')}${esc(c ? katName(c) : '')}</span>${r.rating?.stars ? `<span>${ic('stern')}${r.rating.stars}</span>` : ''}</div></div></div>
   <div class="bogen"><div class="zweispalt"><div>
    ${r.steps.length ? `<div class="reihe"><button class="knopf akz" data-a="kochen" style="flex:1.3">${ic('koch')}Kochen</button><button class="knopf" data-a="auf-liste" style="flex:1">${ic('einkauf')}Einkaufen</button><button class="knopf" data-a="planen" aria-label="In den Wochenplan">${ic('plan')}</button></div>` : `<div class="reihe"><button class="knopf" data-a="auf-liste">${ic('einkauf')}Einkaufen</button><button class="knopf" data-a="planen">${ic('plan')}Planen</button></div>`}
    <div class="portion"><span>Portionen</span><span class="st"><button data-a="portion" data-d="-1" aria-label="Weniger">${ic('minus')}</button><b id="portionen">${n}</b><button data-a="portion" data-d="1" aria-label="Mehr">${ic('plus')}</button></span></div>
    <h2 class="h">Zutaten</h2><ul class="zut">${r.ings.map((z) => `<li><b>${esc([skaliere(z.amt, f), z.unit].filter(Boolean).join(' '))}</b><span>${esc(z.name)}${z.note ? `<small>${esc(z.note)}</small>` : ''}</span></li>`).join('')}</ul>${geraeteVon(r).length ? `<h2 class="h">Geräte</h2><div class="gr-liste">${geraeteVon(r).map((g) => `<span class="gr-chip">${geraetSvg(g)}${esc(GERAETE[g].de)}</span>`).join('')}</div>` : ''}</div>
    <div><h2 class="h">Zubereitung</h2><ol class="schritte">${r.steps.map((x) => `<li><span>${esc(x.txt)}${x.note ? `<small>${esc(x.note)}</small>` : ''}</span></li>`).join('')}</ol>
    ${r.source ? `<p class="quelle">Quelle: ${esc(r.source)}</p>` : ''}</div></div></div>`;
}

const geraeteVon = (r) => [...new Set(r.steps.flatMap((x) => erkenne(x.txt)))];

/* ---------- Kochansicht: ein Schritt groß, Wischen oder Pfeiltasten, Bildschirm bleibt an ---------- */
const K = { i: 0, kopf: true, wach: null, uhr: null, rest: 0 };
const zeitText = (sek) => `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
function kochHtml() {
  const r = rezept(s.uid); if (!r || !r.steps.length) return '';
  const i = Math.min(K.i, r.steps.length - 1), x = r.steps[i], f = (s.portion[r.uid] || r.servings) / r.servings;
  const zs = zutatenFuerSchritt(r, i), gs = erkenne(x.txt), min = zeitImSchritt(x.txt);
  const balken = `<div class="k-balken" aria-hidden="true">${r.steps.map((_, n) => `<i class="${n < i ? 'an' : n === i ? 'jetzt' : ''}"></i>`).join('')}</div>`;
  const zut = zs.length ? `<div class="k-zut">${zs.map((z) => `<span><b>${esc([skaliere(z.amt, f), z.unit].filter(Boolean).join(' '))}</b> ${esc(z.name)}</span>`).join('')}</div>` : '';
  const wecker = min ? `<button class="k-timer" data-a="wecker" data-min="${min}">${ic('uhr')}<span id="k-zeit">${K.uhr ? zeitText(K.rest) : `Wecker ${min} Min`}</span></button>` : '';
  const ger = gs.length ? `<div class="k-geraete">${gs.map((g) => `<span class="gr-k">${geraetSvg(g)}${esc(GERAETE[g].de)}</span>`).join('')}</div>` : '';
  return `<div class="koch" data-ks="${esc(E.kochSchrift)}" role="dialog" aria-modal="true" aria-label="Kochansicht">
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
    h += `<div class="ek-gruppe" data-g="${gid}"><h3>${ic('griff')}${esc(g.de)}</h3>`
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
     return `<div class="kat-zeile" data-kid="${esc(c.id)}"><span class="griff" aria-hidden="true">${ic('griff')}</span><button class="kat-zeichen" data-a="kat-emoji" data-kid="${esc(c.id)}" aria-label="Zeichen ändern">${katZeichen(c)}</button>
      ${c.art === 'ohne' ? `<span class="kat-fest">${esc(katName(c))}</span>` : `<input class="feld kat-name" data-kid="${esc(c.id)}" value="${esc(c.art === 'eigen' && !eig ? c.de : eig)}" placeholder="${esc(c.de || c.id)}" aria-label="Name der Kategorie ${esc(katName(c))}" autocomplete="off">`}
      <small>${n}</small>${c.art === 'ohne' ? '<span style="width:34px"></span>' : `<button class="rund" data-a="kat-weg" data-kid="${esc(c.id)}" aria-label="Kategorie ${esc(katName(c))} löschen">${ic('muell')}</button>`}</div>`; }).join('')}</div>
   <div class="reihe" style="margin-top:12px"><button class="knopf akz" data-a="kat-neu">${ic('plus')}Neue Kategorie</button></div>
   ${aus.length ? `<div class="gruppe"><h3>Ausgeblendet</h3><div class="liste">${aus.map((c) => `<button class="zeile" data-a="kat-zurueck" data-kid="${esc(c.id)}">${ic('plus')}<span>${esc(c.de)}<small>wieder zeigen</small></span></button>`).join('')}</div></div>` : ''}`;
}
function katWahlFenster(titel, ohneId, aktion, uid = '') {
  const kats = alleKategorien(Z.rezepte, Z.kategorien).filter((c) => c.art !== 'ohne' && c.id !== ohneId);
  fenster(`<h2>${esc(titel)}</h2><div class="wahl-liste">${kats.map((c) => `<button class="zeile" data-a="${aktion}" data-ziel="${esc(c.id)}" data-kid="${esc(ohneId || '')}" data-uid="${esc(uid)}"><span class="kat-zeichen">${katZeichen(c)}</span><span>${esc(katName(c))}</span></button>`).join('')}
    <button class="zeile" data-a="${aktion}" data-ziel="" data-kid="${esc(ohneId || '')}" data-uid="${esc(uid)}">${ic('frage')}<span>ohne Kategorie</span></button></div>
    ${aktion === 'kat-setzen' ? `<form class="suche" data-form="kat-neu-zu" style="margin-top:10px">${ic('plus')}<input name="n" placeholder="Neue Kategorie anlegen" autocomplete="off" aria-label="Neue Kategorie"></form>` : ''}`);
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
const IMP = [['selbst', 'stift', 'Selbst'], ['text', 'datei', 'Text'], ['datei', 'ordner', 'Datei'], ['pakete', 'paket', 'Pakete']];
function neuFenster(tab = 'selbst') {
  const inhalt = {
    selbst: () => `<p>Name, Zutaten und Schritte selbst eintragen, mit Foto.</p><button class="knopf akz" data-a="neu-form">${ic('stift')}Rezept schreiben</button>`,
    text: () => `<span class="mitmik"><textarea class="feld" id="imp-text" style="min-height:150px" placeholder="Rezepttext hier einfügen: aus einer Mail, einer Notiz oder von einer Webseite kopiert. Erste Zeile ist der Name."></textarea>${mik('#imp-text')}</span>
      <div class="reihe" style="margin-top:8px"><button class="knopf akz" data-a="imp-text">Aufteilen</button>${frag('Die App teilt den Text ohne KI in Zutaten und Schritte. Sie erkennt die Überschriften „Zutaten“ und „Zubereitung“, Mengen, Einheiten, Portionen und Zeit. Du siehst das Ergebnis im Formular und kannst es ändern, bevor es gespeichert wird.')}</div>`,
    datei: () => `<p>Eine Sicherung oder Rezeptdatei (JSON) einlesen. Doppelte Rezepte werden erkannt, eigene Kategorien kommen mit.</p><button class="knopf akz" data-a="einlesen">${ic('ordner')}Datei wählen</button>`,
    pakete: () => `<p>Das Beispielbuch laden (${beispielText()}). Es lässt sich später mit einem Tipp wieder entfernen.</p><button class="knopf akz" data-a="beispiel">${ic('laden')}Beispielbuch laden</button>`,
  };
  fenster(`<h2>Rezept hinzufügen</h2><div class="imp-tabs" role="tablist">${IMP.map(([t, i, l]) => `<button role="tab" aria-selected="${t === tab}" data-a="neu-tab" data-t="${t}">${ic(i)}${l}</button>`).join('')}</div><div class="imp-p">${inhalt[tab]()}</div>
   <p class="quelle">Foto-Scan, Webseite und „vom Teller“ folgen mit den KI-Funktionen.</p>`);
}

/* ---------- Anlegen und Bearbeiten ---------- */
function formHtml() {
  const f = s.form, kats = alleKategorien(Z.rezepte, Z.kategorien).filter((c) => c.art !== 'ohne');
  return `<div class="ueber"><h2 style="font-size:19px">${f.neu ? 'Neues Rezept' : 'Rezept bearbeiten'}</h2></div>
  <form class="felder" data-form="rezept">
   <label>Name<input class="feld" name="name" value="${esc(f.name)}" required autocomplete="off"></label>
   <div class="zwei"><label>Kategorie<select class="feld" name="cat"><option value="">ohne Kategorie</option>${kats.map((c) => `<option value="${esc(c.id)}" ${f.cat === c.id ? 'selected' : ''}>${esc(katName(c))}</option>`).join('')}</select></label>
   <label>Neue Kategorie (statt Auswahl)<input class="feld" name="katneu" placeholder="z. B. Sushi" autocomplete="off"></label></div>
   <div class="zwei"><label>Portionen<input class="feld" name="servings" type="number" min="1" max="99" value="${esc(f.servings)}"></label><label>Zeit in Minuten<input class="feld" name="prepTime" type="number" min="0" max="999" value="${esc(f.prepTime ?? '')}"></label></div>
   <label>Zutaten, eine je Zeile (z. B. „200 g Mehl“)<span class="mitmik"><textarea class="feld" name="ings" id="f-ings">${esc(f.ings)}</textarea>${mik('#f-ings')}</span></label>
   <label>Schritte, einer je Absatz<span class="mitmik"><textarea class="feld" name="steps" id="f-steps" style="min-height:170px">${esc(f.steps)}</textarea>${mik('#f-steps')}</span></label>
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
  ${installFrage ? `<div class="gruppe"><h3>App</h3><div class="liste">${zeile('installieren', 'laden', 'Als App installieren', 'eigenes Symbol, läuft auch ohne Netz')}</div></div>` : ''}
  <div class="gruppe"><h3>Ordnung</h3><div class="liste">${zeile('geh', 'ordner', 'Kategorien', 'umbenennen, Zeichen, ordnen, löschen, neu', 'data-zu="kategorien"')}${zeile('geh', 'bild', 'Bilder', `${Z.rezepte.filter((r) => istInhalt(r) && r.img).length} Bilder ansehen, löschen, einfügen`, 'data-zu="bilder"')}</div></div>
  <div class="gruppe"><h3>Darstellung</h3><div class="liste">${zeile('farbe', 'einst', 'Farbe', FARBEN[E.farbe]?.de || '')}${zeile('kochschrift', 'koch', 'Schrift in der Kochansicht', E.kochSchrift)}</div></div>
  <div class="gruppe"><h3>Aufräumen</h3><div class="liste">${zeile('alles-weg', 'muell', 'Alle Rezepte löschen', 'mit Rückfrage')}</div></div>
  <p class="quelle">Mein Rezeptbuch, neue Fassung ${FASSUNG}. Ordner, Import per Foto und Web, Bücher und Übersetzung folgen. <a href="../" style="color:inherit">Zur bisherigen App</a></p>`;
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
  const vorher = Z; Z = m.zustand; ergaenze(); sichern(); s.kat = 'alle'; s.frage = '';
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
  if (!s.leisteAuf) { o.innerHTML = `<button class="fl-griff" data-a="leiste-auf" aria-label="Leiste öffnen: Rezepte, Planer, Einkauf, Werkstatt. Lange drücken oder ziehen verschiebt sie."><span></span></button>`; return; }
  const k = (a, i, t, x = '') => `<button role="menuitem" data-a="${a}" ${x}>${i}${t}</button>`;
  o.innerHTML = `<div class="fl-knoepfe" role="menu"><button class="fl-zu" data-a="leiste-zu" aria-label="Schließen">${ic('x')}</button>`
    + k('geh', ic('buch'), 'Rezepte', `data-zu="start" ${s.ansicht === 'start' ? 'aria-current="page"' : ''}`) + k('geh', ic('plan'), 'Planer', `data-zu="plan" ${s.ansicht === 'plan' ? 'aria-current="page"' : ''}`)
    + k('geh', ic('einkauf'), 'Einkauf' + (ekOffen() ? ` <span class="zahl">${ekOffen()}</span>` : ''), `data-zu="einkauf" ${s.ansicht === 'einkauf' ? 'aria-current="page"' : ''}`) + k('geh', ic('funken'), 'Werkstatt', `data-zu="werkstatt" ${s.ansicht === 'werkstatt' ? 'aria-current="page"' : ''}`)
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
  const m = $('main'), lesen = ['start', 'rezept', 'kochen'].includes(s.ansicht);
  if (breit() && lesen) {
    if (!rezept(s.uid)) s.uid = (rezept(E.zuletzt) || Z.rezepte.find(istInhalt))?.uid || null;
    const alt = m.querySelector('.md-liste')?.scrollTop || 0;
    m.innerHTML = `<div class="md ${s.nurDies ? 'nur' : ''}"><div class="md-liste">${startHtml()}</div><div class="md-detail">${rezept(s.uid) ? rezeptHtml() : ''}</div></div>`;
    const l = m.querySelector('.md-liste'); if (l) l.scrollTop = alt;
  } else m.innerHTML = s.ansicht === 'rezept' || s.ansicht === 'kochen' ? rezeptHtml() : s.ansicht === 'form' ? formHtml() : s.ansicht === 'werkstatt' ? werkstattHtml() : s.ansicht === 'einkauf' ? einkaufHtml() : s.ansicht === 'plan' ? planHtml() : s.ansicht === 'kategorien' ? kategorienHtml() : s.ansicht === 'bilder' ? bilderHtml() : startHtml();
  m.classList.toggle('einzug', einzug); document.body.dataset.ansicht = s.ansicht; document.body.classList.toggle('nur', breit() && lesen && s.nurDies);
  if (s.ansicht !== 'kochen') { wachAus(); weckerAus(); }
  kochZeichnen();
  document.title = s.ansicht === 'rezept' && rezept(s.uid) ? `${rezept(s.uid).name} · ${ausgabe.titel}` : ausgabe.titel;
}

/* ---------- Handlungen ---------- */
const A = {
  geh: (e) => geh(e.dataset.zu, { uid: null, form: null }),
  rezept: (e) => { E.zuletzt = e.dataset.uid; sichern(); if (breit()) { s.ansicht = 'rezept'; s.uid = e.dataset.uid; history.pushState({ ansicht: 'rezept', uid: s.uid }, ''); zeichne(); document.querySelector('.md-detail')?.scrollTo(0, 0); } else geh('rezept', { uid: e.dataset.uid }); },
  zurueck: () => { s.form = null; if (history.state && history.length > 1) history.back(); else geh('start', {}, true); },
  kat: (e) => { s.kat = e.dataset.kat; zeichne(); },
  werkzeug: () => { s.werkzeug = !s.werkzeug; kopfZeichnen(); },
  'zur-suche': () => { if (s.ansicht !== 'start') geh('start'); $('suchfeld')?.focus(); },
  'suche-leer': () => { s.frage = ''; zeichne(); $('suchfeld')?.focus(); },
  neu: () => neuFenster(),
  'neu-tab': (e) => { diktatAus(); neuFenster(e.dataset.t); },
  'neu-form': () => { fensterZu(); s.form = formAus(null); geh('form'); },
  'imp-text': () => { const r = rezeptAusText($('imp-text').value); if (!r) { melde('Bitte zuerst einen Text einfügen.'); return; } diktatAus(); fensterZu();
    s.form = { ...formAus(null), name: r.name, servings: r.servings || 4, prepTime: r.prepTime ?? '', ings: r.ings.map(zutatZeile).join('\n'), steps: r.steps.map((x) => x.txt).join('\n\n') }; geh('form');
    melde(r.sicher ? `${r.ings.length} Zutaten und ${r.steps.length} Schritte erkannt. Bitte prüfen.` : 'Ohne Überschriften aufgeteilt. Bitte Zutaten und Schritte prüfen.'); },
  diktat: (e) => { const f = document.querySelector(e.dataset.feld); if (!f) return; diktat(f, 'de-DE', (an) => { e.setAttribute('aria-pressed', String(an)); }); f.focus(); },
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
    Z.einkauf = { ...Z.einkauf, posten: Z.einkauf.posten.filter((p) => offenJe(p.uid)), eigene: Z.einkauf.eigene.filter((x) => !Z.einkauf.haken['eig:' + x.id]) }; sichern(); zeichne(); melde('Erledigte Rezepte und Posten entfernt', 'Rückgängig', () => { Z.einkauf = vorher; sichern(); zeichne(); }); },
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
  'kat-emoji': (e) => fenster(`<h2>Zeichen wählen</h2><div class="emoji-raster">${EMOJI.map((x) => `<button data-a="kat-emoji-setzen" data-kid="${esc(e.dataset.kid)}" data-e="${x}">${x}</button>`).join('')}</div><div class="reihe" style="margin-top:10px"><button class="knopf" data-a="kat-emoji-setzen" data-kid="${esc(e.dataset.kid)}" data-e="">Vorgabe</button></div>`),
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
  'bilder-weg': () => { const w = new Set(s.bilder.wahl), vorher = Z.rezepte; Z.rezepte = Z.rezepte.map((r) => (w.has(r.uid) ? { ...r, img: '' } : r)); s.bilder.wahl.clear(); sichern(); zeichne(); melde(`${w.size} Bilder gelöscht, die Rezepte bleiben`, 'Rückgängig', () => { Z.rezepte = vorher; sichern(); zeichne(); }); },
  'bilder-alle-weg': () => { const n = Z.rezepte.filter((r) => r.img).length; frage('Alle Bilder löschen?', `${n} Bilder werden entfernt. Die Rezepte mit ihrem Text bleiben.`, 'Alle Bilder löschen', () => { const vorher = Z.rezepte; Z.rezepte = Z.rezepte.map((r) => (r.img ? { ...r, img: '' } : r)); s.bilder.wahl.clear(); sichern(); zeichne(); melde(`${n} Bilder gelöscht`, 'Rückgängig', () => { Z.rezepte = vorher; sichern(); zeichne(); }); }); },
  'bild-dazu': (e) => { s.bildZiel = e.dataset.uid; $('datei-bild').click(); },
  zuschnitt: () => zuschnittFenster(s.uid),
  'zs-lage': (e) => { const [x, y] = e.dataset.l.split(','); zs.x = +x; zs.y = +y; zsZeigen(); },
  'zs-null': () => { zs.x = 50; zs.y = 50; zs.z = 1; $('zs-zoom').value = 100; zsZeigen(); },
  'zs-ok': () => { const z = zs; zs = null; Z.rezepte = Z.rezepte.map((r) => (r.uid === z.uid ? { ...r, imgCrop: { ...(r.imgCrop || {}), x: Math.round(z.x), y: Math.round(z.y), scale: Math.round(z.z * 100) / 100 } } : r)); sichern(); fensterZu(); zeichne(); },
  nurdies: () => { s.nurDies = !s.nurDies; zeichne(); },
  rail: () => { E.railZu = !E.railZu; sichern(); kopfZeichnen(); },
  kochschrift: () => { E.kochSchrift = { klein: 'mittel', mittel: 'groß', 'groß': 'klein' }[E.kochSchrift] || 'mittel'; sichern(); zeichne(); },
  portion: (e) => { const r = rezept(s.uid); const n = Math.min(99, Math.max(1, (s.portion[r.uid] || r.servings) + +e.dataset.d)); s.portion[r.uid] = n; zeichne(); },
  'bild-waehlen': () => { formLesen(document.querySelector('[data-form=rezept]')); $('datei-bild').click(); },
  'bild-weg': () => { formLesen(document.querySelector('[data-form=rezept]')); s.form.img = ''; zeichne(); },
  sichern: () => { const d = new Date(); herunterladen(`${ausgabe.name}-${d.toISOString().slice(0, 10)}.json`, JSON.stringify(schreibe(Z))); melde('Sicherung gespeichert'); },
  einlesen: () => $('datei-sicherung').click(),
  beispiel: () => beispielLaden(),
  'beispiele-weg': () => { const n = Z.rezepte.filter((r) => r.beispiel).length; frage('Beispiele entfernen?', `${n} Beispiel-Rezepte werden entfernt. Deine eigenen Rezepte bleiben.`, 'Entfernen', () => { const vorher = Z.rezepte; Z.rezepte = Z.rezepte.filter((r) => !r.beispiel); sichern(); zeichne(); melde(`${n} Beispiele entfernt`, 'Rückgängig', () => { Z.rezepte = vorher; sichern(); zeichne(); }); }); },
  'alles-weg': () => { const n = Z.rezepte.filter(istInhalt).length; frage('Alle Rezepte löschen?', `${n} Rezepte werden gelöscht. Lege vorher eine Sicherung als Datei an, wenn du sie behalten willst.`, 'Alle löschen', () => { const vorher = Z; Z = { ...leererZustand(), kategorien: leereKategorien() }; ergaenze(); E.zuletzt = null; sichern(); geh('start', {}, true); melde('Alle Rezepte gelöscht', 'Rückgängig', () => { Z = vorher; sichern(); zeichne(true); }); }); },
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
document.addEventListener('submit', (ev) => { ev.preventDefault(); const f = ev.target.dataset.form;
  if (f === 'rezept') formSpeichern(ev.target);
  else if (f === 'ek-eigen') { const t = String(new FormData(ev.target).get('t') || '').trim(); if (!t) return; Z.einkauf = { ...Z.einkauf, eigene: [...Z.einkauf.eigene, { id: Date.now().toString(36), text: t }] }; sichern(); zeichne(); document.querySelector('[data-form="ek-eigen"] input')?.focus(); }
  else if (f === 'kat-neu-zu') { const n = String(new FormData(ev.target).get('n') || '').trim(), uid = document.querySelector('[data-a="kat-setzen"]')?.dataset.uid; if (!n || !uid) return; const a = katAnlegen(Z.kategorien, n); Z.kategorien = a.kat; A['kat-setzen']({ dataset: { uid, ziel: a.id } }); }
  else if (f === 'laden') { const n = String(new FormData(ev.target).get('n') || '').trim(); if (!n) return; Z.einkauf = { ...Z.einkauf, laeden: { ...Z.einkauf.laeden, [n]: Z.einkauf.laeden[n] || [...(Z.einkauf.laeden[Z.einkauf.laden] || [])] }, laden: n }; sichern(); fensterZu(); zeichne(); }
});
/* Warengruppe verschieben: lange drücken (350 ms) oder mit der Maus ziehen; die Reihenfolge gilt für den gewählten Laden */
let gz = null;
const gzAn = () => { if (!gz || gz.weit) return; gz.weit = true; gz.gr.classList.add('zieht'); };
document.addEventListener('pointerdown', (ev) => { const h = ev.target.closest?.('.ek-gruppe h3, .kat-zeile .griff'); if (!h) return; const gr = h.closest('.ek-gruppe, .kat-zeile'); gz = { gr, art: gr.classList.contains('kat-zeile') ? 'kat' : 'ek', y: ev.clientY, weit: false, ziel: null, uhr: setTimeout(gzAn, 350) }; try { h.setPointerCapture(ev.pointerId); } catch { /* ohne */ } });
document.addEventListener('pointermove', (ev) => { if (!gz) return; if (!gz.weit && Math.abs(ev.clientY - gz.y) < 8) return; gzAn(); gz.gr.style.transform = `translateY(${ev.clientY - gz.y}px)`;
  const andere = [...document.querySelectorAll(gz.art === 'kat' ? '.kat-zeile' : '.ek-gruppe')].filter((g) => g !== gz.gr); andere.forEach((g) => g.classList.remove('ziel-vor', 'ziel-nach')); let ziel = null, vor = true;
  for (const g of andere) { const r = g.getBoundingClientRect(); ziel = g; if (ev.clientY < r.top + r.height / 2) { vor = true; break; } vor = false; }
  if (ziel) { ziel.classList.add(vor ? 'ziel-vor' : 'ziel-nach'); gz.ziel = { id: ziel.dataset.g || ziel.dataset.kid, vor, nach: ziel.nextElementSibling === gz.gr ? ziel.nextElementSibling?.nextElementSibling : ziel.nextElementSibling }; } });
const gzLos = () => { if (!gz) return; const g = gz; gz = null; clearTimeout(g.uhr); if (!g.weit) return;
  if (g.ziel) { const vorId = g.ziel.vor ? g.ziel.id : (g.ziel.nach?.dataset.g || g.ziel.nach?.dataset.kid || null);
    if (g.art === 'kat') Z.kategorien = katUmsortieren(Z.rezepte, Z.kategorien, g.gr.dataset.kid, vorId);
    else Z.einkauf = { ...Z.einkauf, laeden: { ...Z.einkauf.laeden, [Z.einkauf.laden]: gruppeVerschieben(Z.einkauf.laeden[Z.einkauf.laden], g.gr.dataset.g, vorId) } };
    sichern(); }
  zeichne(); };
document.addEventListener('pointerup', gzLos); document.addEventListener('pointercancel', gzLos);
document.addEventListener('change', (ev) => { const f = ev.target.closest?.('.kat-name'); if (!f) return; const id = f.dataset.kid, eig = Z.kategorien.eigene.some((c) => c.id === id);
  if (eig && f.value.trim()) Z.kategorien = { ...katUmbenennen(Z.kategorien, id, ''), eigene: Z.kategorien.eigene.map((c) => (c.id === id ? { ...c, de: f.value.trim() } : c)) }; else if (!eig) Z.kategorien = katUmbenennen(Z.kategorien, id, f.value);
  sichern(); });
document.addEventListener('input', (ev) => { if (ev.target.id === 'zs-zoom' && zs) { zs.z = +ev.target.value / 100; zsZeigen(); } });
document.addEventListener('input', (ev) => {
  if (ev.target.id !== 'suchfeld') return;
  s.frage = ev.target.value; $('start-rest').innerHTML = startRest(); $('suche-x').hidden = !s.frage;   // das Feld selbst bleibt stehen (Tastatur, Diktat)
});
document.addEventListener('keydown', (ev) => {
  if (s.ansicht !== 'kochen' || $('fensterort').innerHTML) return;
  if (ev.key === 'ArrowRight') A['k-schritt']({ dataset: { d: 1 } }); else if (ev.key === 'ArrowLeft') A['k-schritt']({ dataset: { d: -1 } }); else if (ev.key === 'Escape') A.zurueck();
});
let wischX = null;
document.addEventListener('touchstart', (ev) => { wischX = ev.target.closest?.('.koch') && !ev.target.closest('button') ? ev.touches[0].clientX : null; }, { passive: true });
document.addEventListener('touchend', (ev) => { if (wischX == null) return; const d = ev.changedTouches[0].clientX - wischX; wischX = null; if (Math.abs(d) > 60) A['k-schritt']({ dataset: { d: d < 0 ? 1 : -1 } }); }, { passive: true });
matchMedia('(min-width:1000px)').addEventListener('change', () => zeichne());
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && s.ansicht !== 'kochen') { if ($('fensterort').innerHTML) fensterZu(); else if (s.leisteAuf) { s.leisteAuf = false; leisteZeichnen(); } } });
$('datei-sicherung').addEventListener('change', async (ev) => { const d = ev.target.files[0]; ev.target.value = ''; if (!d) return; try { einfuegen(lies(await d.text())); } catch (f) { melde(f.message || 'Die Datei konnte nicht gelesen werden.'); } });
$('datei-bild').addEventListener('change', async (ev) => { const d = ev.target.files[0]; ev.target.value = ''; if (!d) return; if (s.bildZiel) { const uid = s.bildZiel; s.bildZiel = null; try { const img = await bildAusDatei(d); Z.rezepte = Z.rezepte.map((r) => (r.uid === uid ? { ...r, img, imgCrop: { x: 50, y: 50, scale: 1 } } : r)); sichern(); zeichne(); melde('Bild eingefügt'); } catch { melde('Das Bild konnte nicht gelesen werden.'); } return; }
  if (!s.form) return; try { s.form.img = await bildAusDatei(d); zeichne(); } catch { melde('Das Bild konnte nicht gelesen werden.'); } });
let altY = 0; addEventListener('scroll', () => { if (breit()) return; const y = scrollY; $('kopf').classList.toggle('weg', y > altY + 4 && y > 80 ? true : y < altY - 4 || y < 40 ? false : $('kopf').classList.contains('weg')); altY = y; }, { passive: true });

let installFrage = null;
addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); installFrage = ev; if (s.ansicht === 'werkstatt') zeichne(); });
addEventListener('appinstalled', () => { installFrage = null; if (s.ansicht === 'werkstatt') zeichne(); });

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
  ergaenze();
  farbeSetzen(document.documentElement, E.farbe);
  history.replaceState({ ansicht: 'start' }, '');
  zeichne(true);
  lager.dauerhaft();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});   // Offline-Vorrat; ohne ihn läuft die App genauso, nur nicht ohne Netz
  fetch('../beispiele/KATALOG.json').then((a) => a.json()).then((k) => { katalog = k; if (s.ansicht === 'start' || s.ansicht === 'werkstatt') zeichne(); }).catch(() => {});
}
start().catch((f) => { $('main').innerHTML = `<div class="leer"><p>Das Rezeptbuch konnte nicht starten: ${esc(f.message)}</p></div>`; });
