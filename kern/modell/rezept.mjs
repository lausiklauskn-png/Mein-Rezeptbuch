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

/** Food-Zine am Rezept: `zine` ist eine Liste aus drei Seiten (Titelseite, Schritt für Schritt, Gesundheit und Tipps), je die
 *  data:-Adresse eines Bildes oder ''. Dieselbe Form wie `seiten` im Beispielpaket „foodzine-beispiele“. Eine fremde Adresse
 *  kommt nicht mit (sie würde beim Zeigen ins Netz greifen); ohne eine einzige Seite gibt es das Feld nicht. */
export const ZINE_SEITEN = 3;
export function zineFeld(v) {
  if (!Array.isArray(v)) return null;
  const s = Array.from({ length: ZINE_SEITEN }, (_, i) => (typeof v[i] === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v[i]) ? v[i] : ''));
  return s.some(Boolean) ? s : null;
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
  const zine = zineFeld(r.zine); if (zine) r.zine = zine; else delete r.zine;
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

/** Sicht eines Rezepts in einer Sprache: liegt r.translations[sprache] am Rezept, wird sie gezeigt, AUCH für Deutsch
 *  (die alten Apps zeigten translations.de nie; Abgleich Mixarium Runde 3 Punkt 10). Das Rezept selbst bleibt unverändert.
 *  Namen der Zutaten und Schritte werden nur ersetzt, wenn die Anzahl passt; sonst bliebe ein Text an der falschen Zeile. */
export function sicht(r, sprache = 'de') {
  const t = r && r.translations && typeof r.translations === 'object' ? r.translations[sprache] : null;
  if (!t || typeof t !== 'object') return r;
  const zn = Array.isArray(t.ingredients) ? t.ingredients : [], za = Array.isArray(t.amounts) ? t.amounts : [], st = Array.isArray(t.steps) ? t.steps : [], ings = r.ings || [], steps = r.steps || [];
  return { ...r, name: (typeof t.name === 'string' && t.name.trim()) || r.name,
    ings: zn.length === ings.length ? ings.map((z, i) => ({ ...z, name: typeof zn[i] === 'string' && zn[i] ? zn[i] : z.name, unit: za[i] && typeof za[i] === 'object' && za[i].unit ? za[i].unit : z.unit })) : ings,
    steps: st.length === steps.length ? steps.map((x, i) => ({ ...x, txt: typeof st[i] === 'string' && st[i] ? st[i] : x.txt })) : steps };
}

/** Verschiebt ein Rezept vor (nach = false) oder hinter (nach = true) ein anderes. Die Reihenfolge der Liste ist die eigene Reihenfolge
 *  der Rezepte (R5, wie in Muttis Rezeptbuch: Karte lange drücken und ziehen). Gibt es eins der beiden nicht, bleibt die Liste, wie sie ist. */
export function rezeptVerschieben(rezepte, uid, zielUid, nach = false) {
  const r = (rezepte || []).find((x) => x.uid === uid);
  if (!r || uid === zielUid || !rezepte.some((x) => x.uid === zielUid)) return rezepte;
  const rest = rezepte.filter((x) => x.uid !== uid), i = rest.findIndex((x) => x.uid === zielUid) + (nach ? 1 : 0);
  const neu = [...rest.slice(0, i), r, ...rest.slice(i)];
  return neu.every((x, j) => x === rezepte[j]) ? rezepte : neu;   // steht es schon dort: dieselbe Liste, keine Meldung „geändert“
}
