// Küchen-Kern · Bild aus einer Datei: verkleinert auf die lange Kante, als JPEG, ohne Metadaten (Canvas schreibt keine).
export async function bildAusDatei(datei, kante = 1600, guete = 0.84) {
  const bmp = await createImageBitmap(datei);
  const f = Math.min(1, kante / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return c.toDataURL('image/jpeg', guete);
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
