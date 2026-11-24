// Küchen-Kern · Notizbuch: schnell festhalten, was unterwegs auffällt (Text, Fotos), ohne KI und ohne Formular.
// Eine Notiz: { id, text, fotos:[data:image/jpeg…], erstellt, tag:'JJJJ-MM-TT'|'', zeit:'HH:MM'|'', erledigt:bool, rezept: uid|'' }.
//  - Ein Tag kommt nur durch Bestätigung an die Notiz (Vorschlag aus zeit/tag.mjs, die App fragt).
//  - Fotos sind vor dem Ablegen im Gerät verkleinert (oberflaeche/bild.mjs, ohne Aufnahmedaten); hier wird nur geprüft, dass es
//    Bilder als data:-Adresse sind (eine fremde Adresse aus einer Datei wird kein Foto) und höchstens NOTIZ_FOTOS_MAX.
//  - Die Notizen stehen im Zustand (Z.notizen) und damit in Sicherung und Tresor (sicherung/sicherung.mjs).
import { text, fuelle } from '../oberflaeche/sprache.mjs';
import { tagIso } from './plan.mjs';

export const NOTIZ_FOTOS_MAX = 6, NOTIZ_KANTE = 1200, NOTIZ_TEXT_MAX = 4000;
const FOTO = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const TAG = /^\d{4}-\d{2}-\d{2}$/, ZEIT = /^\d{2}:\d{2}$/;
const str = (v) => (v == null ? '' : String(v));

/** Eine neue Notiz. Ohne Text und ohne Foto: null (nichts zu speichern). */
export function neueNotiz({ text: t = '', fotos = [], jetzt = new Date(), tag = '', zeit = '' } = {}) {
  const n = notizFeld({ id: 'n-' + jetzt.getTime().toString(36) + Math.random().toString(36).slice(2, 6), text: t, fotos, erstellt: jetzt.toISOString(), tag, zeit });
  return n && (n.text || n.fotos.length) ? n : null;
}

/** Bringt eine Notiz (aus dem Speicher oder einer Datei) in Form; Unbrauchbares wird null. */
export function notizFeld(n) {
  if (!n || typeof n !== 'object' || !str(n.id).trim()) return null;
  const tag = TAG.test(str(n.tag)) ? str(n.tag) : '';
  const aus = { id: str(n.id).trim().slice(0, 64), text: str(n.text).replace(/\r\n?/g, '\n').trim().slice(0, NOTIZ_TEXT_MAX), fotos: (Array.isArray(n.fotos) ? n.fotos : []).filter((f) => typeof f === 'string' && FOTO.test(f)).slice(0, NOTIZ_FOTOS_MAX),
    erstellt: str(n.erstellt) || new Date(0).toISOString(), tag, zeit: tag && ZEIT.test(str(n.zeit)) ? str(n.zeit) : '', erledigt: n.erledigt === true, rezept: str(n.rezept).slice(0, 80) };
  return aus.text || aus.fotos.length ? aus : null;
}
export const notizen = (liste) => (Array.isArray(liste) ? liste.map(notizFeld).filter(Boolean) : []);

/** Offene zuerst (die mit Tag nach Tag, dann die ohne, neueste zuerst), Erledigtes am Ende. */
export function notizenSortiert(liste) {
  const rang = (n) => (n.erledigt ? 2 : n.tag ? 0 : 1);
  return notizen(liste).sort((a, b) => rang(a) - rang(b) || (a.tag && b.tag ? (a.tag + a.zeit).localeCompare(b.tag + b.zeit) : 0) || b.erstellt.localeCompare(a.erstellt));
}
/** Offene Notizen, deren Tag heute ist (oder schon vorbei: nicht erledigt, also noch offen). */
export const faellig = (liste, jetzt = new Date()) => notizen(liste).filter((n) => !n.erledigt && n.tag && n.tag <= tagIso(jetzt));

export const aendereNotiz = (liste, id, f) => (liste || []).map((n) => (n.id === id ? notizFeld(f(n)) || n : n));
export const ohneNotiz = (liste, id) => (liste || []).filter((n) => n.id !== id);

/** Titel für Liste und Kalender: die erste Zeile; nur Fotos: „Foto-Notiz“. */
export function notizTitel(n, sprache = 'de', max = 80) {
  const z = str(n && n.text).split('\n').map((x) => x.trim()).find(Boolean) || '';
  if (z) return z.length > max ? z.slice(0, max - 1).trimEnd() + '…' : z;
  const k = (n && n.fotos && n.fotos.length) || 0;
  return k > 1 ? fuelle(text(sprache, 'Foto-Notiz ({0})', 'Photo note ({0})'), k) : text(sprache, 'Foto-Notiz', 'Photo note');
}
