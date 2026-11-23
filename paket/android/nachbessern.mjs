#!/usr/bin/env node
// Android-Hülle · bessert das von `npx cap add android` frisch erzeugte Projekt an drei Stellen nach. Mehr wird nicht angefasst.
//   1. Fassung: versionName = Fassung der App (aus www/paket.json), versionCode = --nummer (ganze Zahl, muss mit jeder
//      Veröffentlichung steigen; für eine Probe-APK genügt 1).
//   2. Sicherung durch Android/Google: android:allowBackup wird „false“ (Vorgabe). Grund: im Speicher der App liegen auch die
//      KI-Schlüssel, und die sollen das Gerät nicht verlassen; gesichert wird über den Tresor und die Sicherungsdatei der App.
//      Mit --android-sicherung an bleibt es bei „true“ (Klaus entscheidet, siehe docs/BAU_APK_WINDOWS.md).
//   3. Gegenkontrolle: die App-Kennung im Projekt ist die aus capacitor.config.json.
// Jede Stelle muss GENAU EINMAL treffen, sonst Abbruch ohne Änderung (die Vorlage von Capacitor hat sich dann geändert).
//
//   node paket/android/nachbessern.mjs --ordner paket/aus/<ausgabe>-android [--nummer 1] [--android-sicherung aus|an]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const arg = (n, vorgabe) => { const i = process.argv.indexOf('--' + n); return i < 0 ? vorgabe : process.argv[i + 1]; };
const halt = (t) => { console.error('✗ ' + t); process.exit(1); };
const ordner = resolve(arg('ordner') || halt('Aufruf: node paket/android/nachbessern.mjs --ordner <arbeitsordner> [--nummer N] [--android-sicherung aus|an]'));
const nummer = String(arg('nummer', '1')), sicherung = arg('android-sicherung', 'aus');
if (!/^[1-9]\d{0,8}$/.test(nummer)) halt(`--nummer muss eine ganze Zahl ab 1 sein: ${nummer}`);
if (!['aus', 'an'].includes(sicherung)) halt(`--android-sicherung kennt nur aus und an: ${sicherung}`);
const gradle = join(ordner, 'android', 'app', 'build.gradle'), manifest = join(ordner, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
for (const p of [gradle, manifest, join(ordner, 'www', 'paket.json'), join(ordner, 'capacitor.config.json')]) if (!existsSync(p)) halt(`fehlt: ${p} (erst zusammenstellen, dann „npx cap add android“)`);
const zettel = JSON.parse(readFileSync(join(ordner, 'www', 'paket.json'), 'utf8')), cap = JSON.parse(readFileSync(join(ordner, 'capacitor.config.json'), 'utf8'));
const fassung = String(zettel.app.fassung); if (!/^[0-9A-Za-z.+-]{1,40}$/.test(fassung)) halt(`Fassung der App ist nicht brauchbar: ${fassung}`);

const einmal = (text, muster, neu, was) => { const n = (text.match(new RegExp(muster.source, muster.flags + 'g')) || []).length; if (n !== 1) halt(`${was}: die Stelle trifft ${n}-mal statt einmal. Die Vorlage von Capacitor hat sich geändert – nachbessern.mjs anpassen.`); return text.replace(muster, neu); };
let g = readFileSync(gradle, 'utf8'), m = readFileSync(manifest, 'utf8');
if ((g.match(/applicationId "([^"]+)"/) || [])[1] !== cap.appId) halt(`App-Kennung im Projekt (${(g.match(/applicationId "([^"]+)"/) || [])[1]}) ist nicht die aus capacitor.config.json (${cap.appId})`);
g = einmal(g, /^([ \t]*)versionCode \d+[ \t]*$/m, `$1versionCode ${nummer}`, 'versionCode');
g = einmal(g, /^([ \t]*)versionName "[^"]*"[ \t]*$/m, `$1versionName "${fassung}"`, 'versionName');
m = einmal(m, /android:allowBackup="(true|false)"/, `android:allowBackup="${sicherung === 'an' ? 'true' : 'false'}"`, 'allowBackup');
writeFileSync(gradle, g); writeFileSync(manifest, m);
console.log(`✓ nachgebessert: ${cap.appId} · versionName ${fassung} · versionCode ${nummer} · Sicherung durch Android ${sicherung}`);
