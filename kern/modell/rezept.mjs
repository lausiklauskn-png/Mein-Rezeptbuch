// Küchen-Kern · Rezeptmodell
// Ein Rezept wird beim Laden und bei jedem Import EINMAL in diese Form gebracht. Danach liest jede Stelle dieselben Felder.
// Lehren aus der alten App (CLAUDE.md, 2026-09-15/16 und 2026-11-23):
//  - `blank` gilt nur, wenn kein Name da ist. Ein Rezept mit Namen und blank:true fand nur die Suche.
//  - Die Kategorie-Kennung wird getrimmt. "sushi " war eine eigene Kategorie, deren Reiter nie erschien.
//  - Ein Ordner steht NUR in `folder`. Ein altes `cat: "fld_…"` wird dorthin umgezogen, die Kategorie ist dann leer.
//  - `uid` ist die Identität über Geräte hinweg, `id` nur der Platz in dieser App.

export const KAT_OHNE = '__ohne';

let zaehler = 0;
export function neueUid() {
  const z = (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${(zaehler++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  return 'r-' + z;
}

const text = (v) => (v == null ? '' : String(v));

export function normalisiereZutat(z, i) {
  if (typeof z === 'string') return { id: i + 1, amt: '', unit: '', name: z.trim(), note: '', ck: false };
  return { id: z?.id ?? i + 1, amt: text(z?.amt).trim(), unit: text(z?.unit).trim(), name: text(z?.name ?? z?.origName).trim(), note: text(z?.note).trim(), ck: !!z?.ck };
}
export function normalisiereSchritt(s, i) {
  if (typeof s === 'string') return { id: i + 1, txt: s.trim(), note: '' };
  return { id: s?.id ?? i + 1, txt: text(s?.txt ?? s?.text).trim(), note: text(s?.note).trim() };
}

/** Bringt ein Rezept in die Form des Kerns. Verändert das Original nicht. Unbekannte Felder bleiben erhalten. */
export function normalisiere(roh) {
  const r = { ...roh };
  r.name = text(r.name).trim();
  r.blank = !r.name;
  let cat = typeof r.cat === 'string' ? r.cat.trim() : '';
  let folder = r.folder == null ? '' : String(r.folder).trim();
  if (cat.startsWith('fld_')) { if (!folder) folder = cat.slice(4); cat = ''; }
  r.cat = cat; r.folder = folder;
  r.ings = (Array.isArray(r.ings) ? r.ings : Array.isArray(r.ingredients) ? r.ingredients : []).map(normalisiereZutat).filter((z) => z.name || z.amt);
  r.steps = (Array.isArray(r.steps) ? r.steps : []).map(normalisiereSchritt).filter((s) => s.txt);
  r.flavors = Array.isArray(r.flavors) ? r.flavors.map(text).filter(Boolean) : [];
  const p = parseInt(r.servings, 10); r.servings = Number.isFinite(p) && p > 0 ? p : 4;
  r.img = typeof r.img === 'string' ? r.img : '';
  r.rating = r.rating && typeof r.rating === 'object' ? { stars: Number(r.rating.stars) || 0, comment: text(r.rating.comment), imps: Array.isArray(r.rating.imps) ? r.rating.imps : [] } : { stars: 0, comment: '', imps: [] };
  if (!r.uid) r.uid = r.id != null ? 'alt-' + String(r.id) : neueUid();   // gleiche alte Nummer → gleiche Kennung, auch beim zweiten Import
  r.uid = String(r.uid);
  if (!Array.isArray(r.herkunft)) delete r.herkunft;
  return r;
}

/** Ein Rezept ist Inhalt, wenn es einen Namen hat. Diese eine Frage stellen Suche, „Alle“, Kategorien und Zähler. */
export const istInhalt = (r) => !!(r && text(r.name).trim());

/** Kategorie eines Rezepts: die getrimmte Kennung oder KAT_OHNE. */
export function katVonRezept(r) {
  const id = r && typeof r.cat === 'string' ? r.cat.trim() : '';
  return id && !id.startsWith('fld_') ? id : KAT_OHNE;
}
/** Ordner eines Rezepts: nur, wenn es ihn wirklich gibt. Ein Ordner, den es nicht gibt, ist kein Ordner. */
export function ordnerVonRezept(r, ordner) {
  const f = r && r.folder != null ? String(r.folder) : '';
  return f && (ordner || []).some((o) => String(o.id) === f) ? f : '';
}
