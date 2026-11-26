#!/usr/bin/env node
// Release-Fassung aus der FASSUNG der App (neu/app.mjs). Eine Release-Fassung ist immer X.Y.Z (so verlangt es tools/signing/apk.mjs
// für den Tag vX.Y.Z), und versionCode muss mit jeder Fassung steigen. Regel (Klaus 26.11.2026 „wie Private Akte“):
//   X.Y.Z          → Release X.Y.Z                (Mein Rezeptbuch 0.19.13 → v0.19.13)
//   X.Y.0-vorN     → Release X.Y.N                (Mein Mixarium 10.0.0-vor43 → v10.0.43, solange es „vor“-Fassungen gibt)
//   versionCode    = X·1 000 000 + Y·1 000 + Z    (0.19.13 → 19013 · 10.0.43 → 10000043)
// Jede andere Form bricht ab: lieber kein Release als eines mit geratener Nummer.
//   node paket/release-fassung.mjs                       → druckt  fassung=… release=… nummer=…  (für $GITHUB_OUTPUT)
//   node paket/release-fassung.mjs --windows <ordner>    → setzt dort in builder.json extraMetadata.version auf die Release-Fassung
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const halt = (t) => { console.error('✗ ' + t); process.exit(1); };

export function releaseFassung(fassung) {
  let m = /^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})$/.exec(fassung);
  if (!m) { m = /^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.0-vor([1-9]\d{0,2})$/.exec(fassung); }
  if (!m) return null;
  const [x, y, z] = m.slice(1, 4).map(Number);
  return { release: `${x}.${y}.${z}`, nummer: x * 1000000 + y * 1000 + z };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fassung = (readFileSync(join(WURZEL, 'neu', 'app.mjs'), 'utf8').match(/\bconst FASSUNG = '([^']+)'/) || [])[1] || halt('neu/app.mjs nennt keine FASSUNG');
  const r = releaseFassung(fassung) || halt(`Aus der Fassung ${fassung} lässt sich keine Release-Fassung X.Y.Z ableiten (Regel im Kopf dieser Datei)`);
  const i = process.argv.indexOf('--windows');
  if (i > 0) {
    const datei = join(process.argv[i + 1] || halt('--windows braucht den Arbeitsordner'), 'builder.json');
    const bj = JSON.parse(readFileSync(datei, 'utf8'));
    if (bj.extraMetadata?.version !== fassung) halt(`builder.json trägt ${bj.extraMetadata?.version}, erwartet ${fassung}`);
    bj.extraMetadata.version = r.release;
    writeFileSync(datei, JSON.stringify(bj, null, 2) + '\n');
    console.log(`✓ builder.json: Fassung ${fassung} → ${r.release}`);
  } else {
    console.log(`fassung=${fassung}\nrelease=${r.release}\nnummer=${r.nummer}`);
  }
}
