// Schreibt KERN.json: Fassung und SHA-256 jeder Datei unter kern/ (für den Pin im Mixarium).
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
export const FASSUNG = '0.10.0';
export function stand(ordner = 'kern') {
  const dateien = {};
  const geh = (d) => { for (const n of readdirSync(d).sort()) { const p = join(d, n); if (statSync(p).isDirectory()) geh(p); else dateien[p] = createHash('sha256').update(readFileSync(p)).digest('hex'); } };
  geh(ordner);
  return { fassung: FASSUNG, inhalt: 'Ausgaben-Schalter, Rezeptmodell, Kategorien, Suche, Sicherung, Übernahme, Speicher, Mengen, Symbole, Farben, Bild, Kochansicht (Zutaten je Schritt, Zeit, Geräte), Einkaufsliste, Wochenplan, Text-Import, Spracheingabe', dateien };
}
if (import.meta.url === `file://${process.argv[1]}`) { writeFileSync('KERN.json', JSON.stringify(stand(), null, 1) + '\n'); console.log('KERN.json geschrieben'); }
