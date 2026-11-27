// Küchen-Kern · Bild aus einer Datei: verkleinert auf die lange Kante, ohne Metadaten (Canvas schreibt keine).
// Klaus 26.11.: „Qualität hoch, aber runterrechnen, wenn es ohne Qualitätsverlust geht.“ Gespeichert wird mit 1600 px als WebP 86 %:
// gemessen an einem Speisefoto 1600 × 900 195 KB statt 252 KB als JPEG 84 % (−23 %) bei mindestens gleicher Schärfe.
// Kann der Browser kein WebP schreiben (er liefert dann PNG), bleibt es JPEG.
export const BILD_SPEICHER = { kante: 1600, guete: 0.86 };
/** Leinwand → data-URL: WebP, sonst JPEG. */
export function alsDatenAdresse(c, guete = BILD_SPEICHER.guete) {
  const w = c.toDataURL('image/webp', guete);
  return w.startsWith('data:image/webp') ? w : c.toDataURL('image/jpeg', Math.min(0.9, guete));
}
export async function bildAusDatei(datei, kante = BILD_SPEICHER.kante, guete = BILD_SPEICHER.guete) {
  const bmp = await createImageBitmap(datei);
  const f = Math.min(1, kante / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return alsDatenAdresse(c, guete);
}
/** Ungefähre Größe einer data-URL in Bytes. */
export const datenGroesse = (u) => Math.round(String(u || '').replace(/^data:[^,]*,/, '').length * 3 / 4);
/** Ein gespeichertes Bild platzsparend neu schreiben (Klaus 26.11.). Zurück die neue Adresse, oder null, wenn es nicht mindestens
 *  um `mindestens` (Anteil) kleiner wird – dann bleibt das alte. Ein Bild über der Kante wird dabei auf sie verkleinert. */
export async function platzSparen(adresse, { kante = BILD_SPEICHER.kante, guete = BILD_SPEICHER.guete, mindestens = 0.1 } = {}) {
  if (!/^data:image\//.test(String(adresse || ''))) return null;
  const blob = await (await fetch(adresse)).blob();
  /* Schon WebP und nicht größer als die Kante: so wurde es gespeichert. Ein zweites Rechnen wäre jedes Mal ein kleiner Verlust. */
  if (/^data:image\/webp/i.test(adresse) && globalThis.createImageBitmap) { try { const b = await createImageBitmap(blob), gross = Math.max(b.width, b.height); b.close?.(); if (gross <= kante) return null; } catch (e) { /* weiter wie sonst */ } }
  const neu = await bildAusDatei(blob, kante, guete);
  return datenGroesse(neu) <= datenGroesse(adresse) * (1 - mindestens) ? neu : null;
}
/** Reicht die Auflösung für die Fläche, auf der das Bild steht? Zurück { genug, faktor }: faktor = Bildpunkte je benötigtem Bildschirmpunkt. */
export function aufloesung(naturBreite, angezeigt, dpr = 1) {
  const braucht = Math.max(1, angezeigt * Math.min(dpr || 1, 2)), faktor = naturBreite / braucht;
  return { genug: faktor >= 0.75, faktor };
}
/** Ein Bild in mehreren Größen auf einmal (Kreativbuch aus Bildern: Buch und Vorschau): je Kante eine data-URL, JPEG, ohne Metadaten.
 *  quelle: Datei/Blob (wird einmal dekodiert) oder eine fertige Leinwand bzw. ImageBitmap (eine gezeichnete PDF-Seite).
 *  Durchsichtiges wird weiß, nicht schwarz (JPEG kennt keine Durchsicht). */
export async function bildGroessen(quelle, kanten, guete = 0.84) {
  const eigen = typeof Blob !== 'undefined' && quelle instanceof Blob, bmp = eigen ? await createImageBitmap(quelle) : quelle;
  try {
    return kanten.map((k) => {
      const f = Math.min(1, k / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * f)); c.height = Math.max(1, Math.round(bmp.height * f));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', guete);
    });
  } finally { if (eigen) bmp.close?.(); }
}

/** Klaus 27.11.: welcher Teil des Bildes in einem Rahmen mit dem Seitenverhältnis `ziel` zu sehen ist (object-fit: cover,
 *  object-position x% y%, Zoom z um denselben Punkt). Ergebnis in Bruchteilen des ganzen Bildes: { l, t, w, h }.
 *  Damit zeigt „Bild anpassen“ eine Maske über dem ganzen Bild. */
export function ausschnittRechteck(bildSeiten, ziel, x = 50, y = 50, z = 1) {
  const r = bildSeiten > 0 ? bildSeiten : 1, a = ziel > 0 ? ziel : 1, zz = Math.min(3, Math.max(1, Number(z) || 1));
  const w = (r > a ? a / r : 1) / zz, h = (r > a ? 1 : r / a) / zz;
  const px = Math.min(100, Math.max(0, Number(x))), py = Math.min(100, Math.max(0, Number(y)));
  return { l: (1 - w) * px / 100, t: (1 - h) * py / 100, w, h };
}
