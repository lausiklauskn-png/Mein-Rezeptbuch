// Schreibt KERN.json: Fassung und SHA-256 jeder Datei unter kern/ (für den Pin im Mixarium).
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
export const FASSUNG = '0.22.0';
export function stand(ordner = 'kern') {
  const dateien = {};
  const geh = (d) => { for (const n of readdirSync(d).sort()) { const p = join(d, n); if (statSync(p).isDirectory()) geh(p); else dateien[p] = createHash('sha256').update(readFileSync(p)).digest('hex'); } };
  geh(ordner);
  return { fassung: FASSUNG, inhalt: 'Ausgaben-Schalter, Rezeptmodell, Kategorien, Suche, Sicherung, Übernahme, Speicher, Mengen, Symbole, Farben, Bild, Kochansicht (Zutaten je Schritt, Zeit, Geräte), Einkaufsliste, Wochenplan, Text-Import, Spracheingabe, Bildauftrag je Ausgabe, englische Namen für Farben, Töne, Geräte und Schrift-Regler, Kategorien und Einkauf je Ausgabe (kategorienMit mit Familien-Namen, einkaufMit), Sticker-Bild je Kategorie (katBild), Text-Import mit Bar- und US-Einheiten, Hinweis-Blasen (Tooltips), Ladebalken für alle Wartezeiten, Sprache der Oberfläche (acht Sprachen, Tabellen), KI-Schlüssel (Anthropic, OpenAI, Mistral), Claude-Aufruf, Mistral OCR, Reinigung vor der KI, Foto-Scan, Datei prüfen, Web-Import ohne Weiterleiter, Ordner', dateien };
}
if (import.meta.url === `file://${process.argv[1]}`) { writeFileSync('KERN.json', JSON.stringify(stand(), null, 1) + '\n'); console.log('KERN.json geschrieben'); }
