// Küchen-Kern · Ordner: frei benannte Sammlungen neben den Kategorien („Weihnachten“, „Für Gäste“).
// Familien-Regel der alten Apps (2026-09-16): ein Ordner frisst die Kategorie nicht. Ein Rezept liegt in höchstens einem
// Ordner (r.folder) und behält seine Kategorie (r.cat). Ein Ordner, den es nicht gibt, ist kein Ordner (ordnerVonRezept).
// Ein Ordner hat { id, name, ico }; die Kennung bleibt beim Umbenennen. Alle Funktionen geben neue Listen zurück.
import { istInhalt, ordnerVonRezept } from './rezept.mjs';

let zaehler = 0;
const gleich = (a, b) => String(a) === String(b);
export const ordnerName = (o) => String((o && o.name) || '').trim();
export const findeOrdner = (ordner, id) => (ordner || []).find((o) => gleich(o.id, id)) || null;

/** Legt einen Ordner an. Gibt es den Namen schon (ohne Groß/Klein), kommt dessen Kennung zurück und nichts ändert sich. */
export function anlegen(ordner, name, ico = '') {
  const n = String(name || '').trim(), liste = ordner || [];
  const da = n && liste.find((o) => ordnerName(o).toLowerCase() === n.toLowerCase());
  if (da) return { ordner: liste, id: String(da.id), neu: false };
  const id = String(Date.now()) + String(zaehler++ % 1000).padStart(3, '0');
  return { ordner: [...liste, { id, name: n, ...(ico ? { ico } : {}) }], id, neu: true };
}
export const umbenennen = (ordner, id, name) => (ordner || []).map((o) => (gleich(o.id, id) ? { ...o, name: String(name || '').trim() } : o));
export const zeichenSetzen = (ordner, id, ico) => (ordner || []).map((o) => { if (!gleich(o.id, id)) return o; const { ico: alt, ...rest } = o; return ico ? { ...rest, ico } : rest; });
/** Löscht den Ordner. Die Rezepte bleiben und behalten ihre Kategorie; sie verlieren nur den Ordner. */
export function loeschen(rezepte, ordner, id) {
  let betroffen = 0;
  const r = (rezepte || []).map((x) => (x && x.folder != null && x.folder !== '' && gleich(x.folder, id) ? (betroffen++, { ...x, folder: '' }) : x));
  return { rezepte: r, ordner: (ordner || []).filter((o) => !gleich(o.id, id)), betroffen };
}
/** Legt ein Rezept in einen Ordner (id) oder nimmt es heraus (id leer). Einen Ordner, den es nicht gibt, gibt es nicht: dann ändert sich nichts. */
export function legeIn(rezepte, ordner, uid, id) {
  if (id && !findeOrdner(ordner, id)) return rezepte;
  return (rezepte || []).map((r) => (r && r.uid === uid ? { ...r, folder: id ? String(id) : '' } : r));
}
/** Setzt den Ordner `id` vor `vorId` (oder ans Ende). */
export function umsortieren(ordner, id, vorId) {
  const liste = [...(ordner || [])], von = liste.findIndex((o) => gleich(o.id, id)); if (von < 0) return liste;
  const [o] = liste.splice(von, 1), nach = vorId == null ? -1 : liste.findIndex((x) => gleich(x.id, vorId));
  if (nach < 0) liste.push(o); else liste.splice(nach, 0, o);
  return liste;
}
/** Die Rezepte eines Ordners (nur Inhalt). */
export const imOrdner = (rezepte, ordner, id) => (rezepte || []).filter((r) => istInhalt(r) && ordnerVonRezept(r, ordner) === String(id));
/** Alle Ordner mit Anzahl und einem Bild aus dem Ordner (erstes Rezept mit Bild). */
export const uebersicht = (rezepte, ordner) => (ordner || []).map((o) => { const rs = imOrdner(rezepte, ordner, o.id); return { ...o, id: String(o.id), anzahl: rs.length, bild: (rs.find((r) => r.img) || {}).img || '' }; });
/** Rezepte, deren Ordner es nicht (mehr) gibt – sie stehen in keinem Ordner; die Zahl ist eine Auskunft. */
export const ohneOrdnerZiel = (rezepte, ordner) => (rezepte || []).filter((r) => istInhalt(r) && r.folder != null && String(r.folder) !== '' && !ordnerVonRezept(r, ordner)).length;
