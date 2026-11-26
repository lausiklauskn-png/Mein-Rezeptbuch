// Schreibt KERN.json: Fassung und SHA-256 jeder Datei unter kern/ (für den Pin im Mixarium).
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
export const FASSUNG = '0.33.3';
export function stand(ordner = 'kern') {
  const dateien = {};
  const geh = (d) => { for (const n of readdirSync(d).sort()) { const p = join(d, n); if (statSync(p).isDirectory()) geh(p); else dateien[p] = createHash('sha256').update(readFileSync(p)).digest('hex'); } };
  geh(ordner);
  return { fassung: FASSUNG, inhalt: 'Ausgaben-Schalter, Rezeptmodell, Kategorien, Suche, Sicherung, Übernahme, Speicher, Mengen, Symbole, Farben, Bild, Kochansicht (Zutaten je Schritt, Zeit, Geräte), Einkaufsliste, Wochenplan, Text-Import, Spracheingabe, Bildauftrag je Ausgabe, englische Namen für Farben, Töne, Geräte und Schrift-Regler, Kategorien und Einkauf je Ausgabe (kategorienMit mit Familien-Namen, einkaufMit), Sticker-Bild je Kategorie (katBild), Text-Import mit Bar- und US-Einheiten, Hinweis-Blasen (Tooltips), Ladebalken für alle Wartezeiten, Sprache der Oberfläche (acht Sprachen, Tabellen), KI-Schlüssel (Anthropic, OpenAI, Mistral), Claude-Aufruf, Mistral OCR, Reinigung vor der KI, Foto-Scan, Datei prüfen, Web-Import ohne Weiterleiter, Ordner, App installieren und aktualisieren (app-pflege), Food-Zine: Poster-Auftrag und Sammlung (ausgabe/zine), Kreativbuch (ausgabe/kreativbuch), eigenes Buch aus Bildern (ausgabe/eigenbuch), Notizbuch (modell/notiz, zeit/tag, ausgabe/ics, import/idee), Event-Ordner (Anlass mit Datum und Gästen, in den Kalender, abgleichen, Einkauf, Menükarte; Portionen im Plan), Doppelungen nach Inhalt, Bild, Mengen und Übersetzung, auch im ganzen Buch (findeDoppelImBuch), und Merkmale einer Variante als Hinweis in Suche, Bedeutungssuche, Druck und Teilen (modell/doppel), eigene Reihenfolge der Rezepte (rezeptVerschieben), Bilder in hoher Qualität platzsparend (WebP 1600 px, platzSparen, aufloesung)', dateien };
}
if (import.meta.url === `file://${process.argv[1]}`) { writeFileSync('KERN.json', JSON.stringify(stand(), null, 1) + '\n'); console.log('KERN.json geschrieben'); }
