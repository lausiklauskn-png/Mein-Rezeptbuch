// Küchen-Kern · Bild aus einer Datei: verkleinert auf die lange Kante, als JPEG, ohne Metadaten (Canvas schreibt keine).
export async function bildAusDatei(datei, kante = 1600, guete = 0.84) {
  const bmp = await createImageBitmap(datei);
  const f = Math.min(1, kante / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return c.toDataURL('image/jpeg', guete);
}
