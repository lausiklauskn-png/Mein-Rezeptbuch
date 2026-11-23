// Küchen-Kern · Ausgaben-Schalter
// Eine Ausgabe (ausgaben/<name>/ausgabe.json) legt fest: Name, Speicher-Schlüssel, Farbe, Zeichen, Begrüßung,
// Ziele (web/android/windows), ob sie in einen Store geht, ob Alkohol erlaubt ist und WELCHE Beispiel-Pakete
// sie mitbringt. Was nicht in "beispiele" steht, kommt weder ins Paket noch wird es angeboten.
// Die Pakete stehen im Katalog (beispiele/KATALOG.json) mit Prüfsumme und Alkohol-Kennzeichen.
// Gemeinsam genutzt von Mein Rezeptbuch, Muttis Rezeptbuch und Mein Mixarium (dort mit eigenem Katalog).

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';

export const PFLICHT = ['name', 'titel', 'kurz', 'store', 'speicher', 'farbe', 'ziele', 'lieferung', 'alkoholErlaubt', 'beispiele', 'netzmodule'];
export const ZIELE = ['web', 'android', 'windows'];
export const LIEFERUNG = ['auf-tippen', 'im-paket'];
// Getränke-Kategorien: nur hier zählt Alkohol im Inhalt (Wein in einer Soße macht kein Rezept zum alkoholischen Getränk).
export const GETRAENKE = new Set(['ckt', 'mock', 'afckt', 'smooth', 'bowle', 'limo', 'tee', 'drk', 'sirup']);
const ALKOHOL = /\b(rum|wodka|vodka|gin|likör|liqueur|amaretto|sekt|prosecco|wein|wine|whisk(e)?y|tequila|kahlua|baileys|schnaps|schnapps|cognac|brandy|bier|beer)\b/i;

export function lesen(datei) { return JSON.parse(readFileSync(datei, 'utf8')); }

/** Enthält ein Getränk Alkohol? Feld `alcohol` oder eine Zutat aus der Liste (Wortgrenzen: „Ginger“ ist kein Gin). */
export function istAlkoholischesGetraenk(r) {
  if (!GETRAENKE.has(String(r.cat || ''))) return false;
  if (r.alcohol) return true;
  return (r.ings || []).some((z) => ALKOHOL.test(String(z.name || '')) && !/alkoholfrei|ginger beer|ingwer/i.test(String(z.name || '')));
}

/** Prüft eine Ausgabe gegen den Katalog. Gibt eine Liste von Fehlern zurück (leer = in Ordnung). */
export function pruefen(ausgabe, katalog, beispielOrdner) {
  const f = [];
  for (const k of PFLICHT) if (!(k in ausgabe)) f.push(`Feld fehlt: ${k}`);
  if (f.length) return f;
  if (!/^[a-z][a-z0-9-]*$/.test(ausgabe.name)) f.push(`Name ungültig: ${ausgabe.name}`);
  if (!ausgabe.speicher?.endung || !ausgabe.speicher?.indexedDb) f.push('speicher braucht endung und indexedDb');
  for (const z of ausgabe.ziele) if (!ZIELE.includes(z)) f.push(`Ziel unbekannt: ${z}`);
  for (const [z, w] of Object.entries(ausgabe.lieferung)) {
    if (!ZIELE.includes(z)) f.push(`Lieferung für unbekanntes Ziel: ${z}`);
    if (!LIEFERUNG.includes(w)) f.push(`Lieferung unbekannt: ${z}=${w}`);
  }
  if (ausgabe.netzmodule !== 'eingebaut-nicht-geladen' && ausgabe.netzmodule !== 'aus') f.push(`netzmodule: ${ausgabe.netzmodule}`);
  const pakete = new Map((katalog.pakete || []).map((p) => [p.id, p]));
  for (const id of ausgabe.beispiele) {
    const p = pakete.get(id);
    if (!p) { f.push(`Beispiel-Paket nicht im Katalog: ${id}`); continue; }
    if (p.fuer && !p.fuer.includes(ausgabe.name)) f.push(`Paket ${id} ist nicht für ${ausgabe.name} freigegeben`);
    if (p.alkohol && !ausgabe.alkoholErlaubt) f.push(`Paket ${id} enthält Alkohol, die Ausgabe ${ausgabe.name} erlaubt keinen`);
    if (ausgabe.store && p.alkohol) f.push(`Store-Ausgabe ${ausgabe.name} darf ${id} (Alkohol) weder mitbringen noch anbieten`);
    if (beispielOrdner) {
      const pfad = join(beispielOrdner, p.datei);
      if (!existsSync(pfad)) { f.push(`Datei fehlt: ${p.datei}`); continue; }
      const roh = readFileSync(pfad);
      if (createHash('sha256').update(roh).digest('hex') !== p.sha256) f.push(`Prüfsumme stimmt nicht: ${p.datei}`);
      const inhalt = JSON.parse(roh.toString('utf8'));
      if (p.art === 'rezepte') {
        const alk = (inhalt.recipes || []).filter(istAlkoholischesGetraenk).map((r) => r.name);
        if (alk.length && !p.alkohol) f.push(`Paket ${id} ist als alkoholfrei markiert, enthält aber: ${alk.join(', ')}`);
        if (alk.length && !ausgabe.alkoholErlaubt) f.push(`Ausgabe ${ausgabe.name}: Alkohol in ${id}: ${alk.join(', ')}`);
      }
    }
  }
  return f;
}

/** Welche Pakete kommen für ein Ziel ins Paket, welche werden nur angeboten (auf Tippen)? */
export function beispieleFuer(ausgabe, katalog, ziel) {
  const pakete = (katalog.pakete || []).filter((p) => ausgabe.beispiele.includes(p.id));
  const art = ausgabe.lieferung[ziel] || 'auf-tippen';
  return { imPaket: art === 'im-paket' ? pakete : [], angeboten: art === 'auf-tippen' ? pakete : [] };
}

// Aufruf: node kern/ausgabe/ausgabe.mjs <ausgaben/name/ausgabe.json> [beispiele/KATALOG.json]
if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv[2], k = process.argv[3] || 'beispiele/KATALOG.json';
  if (!a) { console.error('Aufruf: node kern/ausgabe/ausgabe.mjs ausgaben/<name>/ausgabe.json [KATALOG.json]'); process.exit(2); }
  const ausgabe = lesen(a), katalog = lesen(k);
  const fehler = pruefen(ausgabe, katalog, dirname(k));
  for (const z of ausgabe.ziele) {
    const b = beispieleFuer(ausgabe, katalog, z);
    console.log(`${ausgabe.name} · ${z}: im Paket [${b.imPaket.map((p) => p.id).join(', ')}] · auf Tippen [${b.angeboten.map((p) => p.id).join(', ')}]`);
  }
  if (fehler.length) { console.error(fehler.map((x) => '✗ ' + x).join('\n')); process.exitCode = 1; }
  else console.log(`✓ ${ausgabe.name}: in Ordnung`);
}
