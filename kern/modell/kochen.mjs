// Küchen-Kern · Kochansicht: was gehört zu einem Schritt? Ohne KI, aus dem Text des Schritts.
const falten = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const FUELL = new Set(['frisch', 'frische', 'frischer', 'frisches', 'gross', 'grosse', 'klein', 'kleine', 'rote', 'roter', 'gelbe', 'weiss', 'weisse', 'weisser', 'gehackt', 'gehackte', 'gerieben', 'geriebener', 'gemahlen', 'gemahlene', 'oder', 'und', 'mit', 'zum', 'zur', 'nach', 'aus', 'der', 'die', 'das', 'tk', 'bio']);

/** Stichwörter einer Zutat: „frischer Lachs“ → [lachs], „Honig oder Ahornsirup“ → [honig, ahornsirup]. */
export function stichworte(name) {
  return falten(name).replace(/\([^)]*\)/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !FUELL.has(w));
}
/** Zutaten, die im Text dieses Schritts vorkommen. Ein Stichwort zählt auch als Wortanfang oder -ende („Zwiebeln“ ↔ „Zwiebel“, „Reisessig“ ≠ „Reis“). */
export function zutatenFuerSchritt(rezept, i) {
  const text = falten(rezept.steps?.[i]?.txt), worte = text.split(/[^a-z0-9]+/).filter(Boolean);
  // gleich · Mehrzahl (bis 2 Buchstaben) · im Text zusammengesetzt („Lachswürfel“ nennt „Lachs“; „Reisessig“ nennt nicht „Reis“)
  const nah = (lang, kurz) => lang.startsWith(kurz) && (lang.length - kurz.length <= 2 ? kurz.length >= 4 : kurz.length >= 5);
  // Steht im Text nur der Stamm („Knoblauch“), zählt die Zutat nur mit einer Mengen-Endung („Knoblauchzehen“). „Fleisch“ ist nicht „Fleischbrühe“.
  const ENDE = new Set(['zehe', 'zehen', 'schote', 'schoten', 'blatt', 'blatter', 'stange', 'stangen', 'filet', 'filets', 'knolle', 'pulver', 'wurfel', 'scheiben', 'streifen']);
  const stamm = (k, w) => k.startsWith(w) && w.length >= 4 && (k.length - w.length <= 2 || ENDE.has(k.slice(w.length)));
  const passt = (k) => worte.some((w) => w === k || (w.length > k.length ? nah(w, k) : stamm(k, w)));
  return (rezept.ings || []).filter((z) => stichworte(z.name).some(passt));
}
/** Erste Zeitangabe im Schritt in Minuten: „10 Minuten“, „8–10 Min.“ (nimmt die größere), „2 Stunden“, „30 Sekunden“ → 1. */
export function zeitImSchritt(text) {
  const m = String(text || '').match(/(\d+)(?:\s*(?:-|–|bis)\s*(\d+))?\s*(Minuten?|Min\b\.?|Stunden?|Std\b\.?|Sekunden?|Sek\b\.?)/i);
  if (!m) return 0;
  const n = Math.max(+m[1], +(m[2] || 0)), e = m[3].toLowerCase();
  return e.startsWith('st') ? n * 60 : e.startsWith('se') ? Math.max(1, Math.round(n / 60)) : n;
}
