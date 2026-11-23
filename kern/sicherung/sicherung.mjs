// Küchen-Kern · Sicherung (JSON). Liest die Fassungen 9 und 10 der alten Apps und schreibt Fassung 11.
// Neu in 11: der Block `kategorien` (eigene Kategorien, Namen und Symbole, Ausblendungen, Reihenfolge).
// Schlüssel für KI-Dienste kommen NIE in eine Sicherung.
import { normalisiere, istInhalt } from '../modell/rezept.mjs';
import { leereKategorien } from '../modell/kategorien.mjs';
import { leererZustand } from '../modell/zustand.mjs';

export const FASSUNG = 11;
const SPR = ['de', 'en', 'ru', 'zh', 'es', 'fr', 'it', 'pt'];

function liesKategorien(k) {
  const aus = leereKategorien();
  if (!k) return aus;
  // Form A (Beispielbuch 23.11.): Liste [{id, de, …, ico|symbol}]
  const eigene = Array.isArray(k) ? k : Array.isArray(k.eigene) ? k.eigene : [];
  for (const c of eigene) {
    if (!c || c.id == null) continue;
    const e = { id: String(c.id), symbol: c.symbol || 'karte' };
    for (const s of SPR) if (c[s]) e[s] = String(c[s]);
    if (!e.de) e.de = e.id;
    const emoji = c.emoji || c.ico; if (emoji) e.emoji = String(emoji);   // vom Nutzer gewähltes Zeichen bleibt erhalten
    aus.eigene.push(e);
  }
  if (!Array.isArray(k)) {
    if (k.namen && typeof k.namen === 'object') for (const [id, v] of Object.entries(k.namen)) if (v && (v.name || v.symbol || v.emoji)) aus.namen[id] = { ...(v.name ? { name: String(v.name) } : {}), ...(v.symbol ? { symbol: v.symbol } : {}), ...(v.emoji ? { emoji: v.emoji } : {}) };
    if (Array.isArray(k.ausgeblendet)) aus.ausgeblendet = k.ausgeblendet.map(String);
    if (Array.isArray(k.folge)) aus.folge = k.folge.map(String);
  }
  return aus;
}

/** Liest eine Sicherung (Text oder Objekt) in die Form des Kerns. Wirft bei unbrauchbarem Inhalt einen Fehler mit Klartext. */
export function lies(eingabe) {
  let d = eingabe;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { throw new Error('Die Datei ist keine gültige Sicherung (kein JSON).'); } }
  if (Array.isArray(d)) d = { recipes: d };
  if (!d || typeof d !== 'object' || !Array.isArray(d.recipes)) throw new Error('In der Datei stehen keine Rezepte.');
  const rezepte = d.recipes.filter((r) => r && typeof r === 'object').map(normalisiere).filter(istInhalt);   // leere Platzhalter-Karten kommen nicht mit
  return {
    fassung: Number(d.version) || 0,
    rezepte,
    menu: Array.isArray(d.menu) ? d.menu : [],
    ordner: (Array.isArray(d.folders) ? d.folders : []).filter((o) => o && o.id != null).map((o) => ({ ...o, id: String(o.id), name: String(o.name || '') })),
    kategorien: liesKategorien(d.kategorien),
    einkauf: d.einkauf && typeof d.einkauf === 'object' ? d.einkauf : null,
    plan: d.plan && typeof d.plan === 'object' ? d.plan : null,
  };
}

/** Schreibt den Zustand als Sicherung der Fassung 11. */
export function schreibe(zustand, { knoten = '', jetzt = new Date() } = {}) {
  return { version: FASSUNG, exported: jetzt.toISOString(), knoten, recipes: zustand.rezepte.filter(istInhalt), menu: zustand.menu || [], folders: zustand.ordner || [], kategorien: zustand.kategorien || leereKategorien(), einkauf: zustand.einkauf || null, plan: zustand.plan || null };
}

const namensSchluessel = (r) => String(r.name).trim().toLowerCase();

/** Führt eine gelesene Sicherung in den Zustand. weise: 'dazu' (zusammenführen) oder 'ersetzen'.
 *  Dubletten: an `uid`; trägt die Datei keine echte Kennung (alles vor Fassung 10), am Namen.
 *  Vorhandenes wird nie überschrieben: eigene Ordner, eigene Kategorien und eigene Namen gewinnen. */
export function fuehreZusammen(zustand, eingang, weise = 'dazu') {
  if (weise === 'ersetzen') return { zustand: { ...zustand, rezepte: eingang.rezepte, menu: eingang.menu, ordner: eingang.ordner, kategorien: eingang.kategorien, ...(eingang.einkauf ? { einkauf: eingang.einkauf } : {}), ...(eingang.plan ? { plan: eingang.plan } : {}) }, neu: eingang.rezepte.length, doppelt: 0 };
  const z = { ...leererZustand(), ...zustand };
  const uids = new Set(z.rezepte.map((r) => r.uid)), namen = new Set(z.rezepte.filter(istInhalt).map(namensSchluessel));
  const dazu = []; let doppelt = 0;
  const altOhneKennung = eingang.fassung < 10;
  let maxId = z.rezepte.reduce((m, r) => (typeof r.id === 'number' && r.id > m ? r.id : m), 0);
  for (const r of eingang.rezepte) {
    const schonDa = uids.has(r.uid) || (altOhneKennung && namen.has(namensSchluessel(r)));
    if (schonDa) { doppelt++; continue; }
    uids.add(r.uid); namen.add(namensSchluessel(r));
    dazu.push({ ...r, id: ++maxId });   // id ist der Platz in DIESER App, uid bleibt
  }
  const ordnerIds = new Set(z.ordner.map((o) => String(o.id)));
  const ordner = [...z.ordner, ...eingang.ordner.filter((o) => !ordnerIds.has(String(o.id)))];
  const k = z.kategorien || leereKategorien(), e = eingang.kategorien || leereKategorien();
  const eigIds = new Set(k.eigene.map((c) => c.id));
  const kategorien = { eigene: [...k.eigene, ...e.eigene.filter((c) => !eigIds.has(c.id))], namen: { ...e.namen, ...k.namen }, ausgeblendet: k.ausgeblendet, folge: k.folge.length ? k.folge : e.folge };
  return { zustand: { ...z, rezepte: [...z.rezepte, ...dazu], menu: z.menu, ordner, kategorien }, neu: dazu.length, doppelt };   // Einkaufsliste und Wochenplan bleiben die eigenen
}

/** Was nach einem Import auffallen würde, bevor es jemand sucht: Rezepte ohne Kategorie, unbekannte Kennungen, fehlende Ordner. */
export function hinweise(eingang) {
  const eig = new Set(eingang.kategorien.eigene.map((c) => c.id));
  return { ohneKategorie: eingang.rezepte.filter((r) => !r.cat).length, ohneBild: eingang.rezepte.filter((r) => !r.img).length,
    ordnerFehlt: eingang.rezepte.filter((r) => r.folder && !eingang.ordner.some((o) => o.id === r.folder)).length, eigeneKategorien: eig.size };
}
