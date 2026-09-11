// Gegenprobe zu tests/smoke_ki_bild.mjs.
//
// Baut je einen Fehler ein und besteht darauf, dass die Probe umfällt — an der
// ROTEN ZEILE, die zu diesem Fehler gehört. Ein Fall, der die Probe an einer
// FREMDEN Zusicherung umwirft, sieht wie ein Treffer aus und beweist nichts.
//
//   node tests/gegenprobe_ki_bild.mjs
//
// Sabotiert wird eine WEGWERF-KOPIE, nie der Arbeitsbaum.
//
// ⚠ Sabotiert wird die QC-DATEI, und danach läuft build.py — index.html ist
// hier erzeugt, nicht gepflegt. Ein Eingriff in index.html allein wäre beim
// nächsten Bau weg.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const QC = readdirSync(WURZEL).filter(n => /^QC_MeinRezb_.*\.html$/.test(n)).sort().pop();

const FAELLE = [
  { name: 'response_format wandert wieder in den Aufruf',
    alt: `    body:JSON.stringify({model:variante.model,prompt,n:1,size:size||'1024x1024'})`,
    neu: `    body:JSON.stringify({model:variante.model,prompt,n:1,size:size||'1024x1024',response_format:'b64_json'})`,
    trifft: /response_format geht NICHT mehr mit hinaus/ },

  { name: 'ein anderes Modell wird zuerst gefragt',
    alt: `  {model:'dall-e-3'},`,
    neu: `  {model:'dall-e-2'},`,
    trifft: /erst wird dall-e-3 gefragt/ },

  { name: 'der zweite Versuch fällt weg',
    alt: `  {model:'gpt-image-1'},     // liefert immer b64_json, braucht nie einen Parameter`,
    neu: ``,
    trifft: /rettet der zweite Versuch den Lauf/ },

  { name: 'der zweite Versuch hängt wieder am Wort „model" im Fehlertext',
    alt: `    err.andresModellKoennteHelfen=(resp.status===400||resp.status===404);`,
    neu: `    err.andresModellKoennteHelfen=(resp.status===400||resp.status===404)&&/model/i.test(e.error?.message||'');`,
    trifft: /rettet der zweite Versuch den Lauf/ },

  { name: 'ein abgelehnter Schlüssel löst einen zweiten (bezahlten) Versuch aus',
    alt: `      if(!err.andresModellKoennteHelfen)throw err;`,
    neu: ``,
    trifft: /abgelehnter Schlüssel löst KEINEN zweiten Versuch aus/ },

  { name: 'die Food-Zine baut wieder ihren EIGENEN Aufruf',
    alt: `  const datenUrl=await _bildHolen(prompt,'1024x1792');`,
    neu: `  const resp=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Authorization':'Bearer '+getOpenAiImgKey(),'Content-Type':'application/json'},body:JSON.stringify({model:'dall-e-3',prompt,n:1,size:'1024x1792'})});
  const datenUrl=(await resp.json()).data?.[0]?.b64_json||null;`,
    trifft: /Food-Zine nimmt dieselbe Naht/ },

  { name: 'die Rezeptbilder bauen wieder ihren eigenen Aufruf',
    alt: `  return await _bildHolen(_buildDallePrompt(recipe),'1024x1024');`,
    neu: `  const resp=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Authorization':'Bearer '+getOpenAiImgKey(),'Content-Type':'application/json'},body:JSON.stringify({model:'dall-e-3',prompt:_buildDallePrompt(recipe),n:1,size:'1024x1024'})});
  return 'data:image/png;base64,'+(await resp.json()).data?.[0]?.b64_json;`,
    trifft: /Rezeptbilder nehmen die gemeinsame Naht/ },

  { name: 'eine zurückgegebene Adresse wird nicht mehr abgerufen',
    alt: `  if(eintrag.url){`,
    neu: `  if(false){`,
    trifft: /Adresse wird wirklich abgerufen/ },

  { name: 'das geholte Bild bleibt eine fremde Adresse statt data:',
    alt: `    const blob=await bild.blob();`,
    neu: `    return eintrag.url;
    const blob=await bild.blob();`,
    trifft: /nie als fremde Adresse/ },

  { name: '„Failed to fetch" wird roh durchgereicht',
    alt: `  if(/failed to fetch|load failed|networkerror|network request failed/i.test(m))`,
    neu: `  if(false)`,
    trifft: /wird übersetzt, nicht durchgereicht/ },

  { name: 'ein abgelehnter Schlüssel wird nicht benannt',
    alt: `  if(/401|invalid[_ ]api[_ ]key|incorrect api key/i.test(m))`,
    neu: `  if(false)`,
    trifft: /abgelehnter Schlüssel wird benannt/ },

  { name: 'fehlendes Guthaben wird nicht benannt',
    alt: `  if(/quota|billing|insufficient|402/i.test(m))`,
    neu: `  if(false)`,
    trifft: /Guthaben wird benannt/ },

  { name: 'der Fehlerkasten verschwindet aus der Seite',
    alt: `          <div id="igFehlerBox"`,
    neu: `          <div id="igFehlerBoxAbgeschaltet"`,
    trifft: /Fehlerkasten steht im Importieren-Fenster/ },
];

function laufProbe(wurzel) {
  const r = spawnSync('node', [join(wurzel, 'tests', 'smoke_ki_bild.mjs')], { encoding: 'utf-8', cwd: wurzel });
  return { code: r.status, aus: (r.stdout || '') + (r.stderr || '') };
}

function frischeKopie() {
  const d = mkdtempSync(join(tmpdir(), 'mrz-gegenprobe-'));
  execFileSync('sh', ['-c',
    `tar -c --exclude=./.git --exclude=./node_modules -C '${WURZEL}' . | tar -x -C '${d}'`]);
  if (existsSync(join(WURZEL, 'node_modules'))) symlinkSync(join(WURZEL, 'node_modules'), join(d, 'node_modules'));
  return d;
}

console.log('Ausgangslage prüfen …');
{
  const d = frischeKopie();
  const r = laufProbe(d);
  rmSync(d, { recursive: true, force: true });
  if (r.aus.includes('NICHT LAUFFÄHIG')) {
    console.log('⊘ NICHT LAUFFÄHIG: die Probe selbst läuft hier nicht.');
    process.exit(0);
  }
  if (r.code !== 0) {
    console.log('❌ ABBRUCH: die Probe ist schon OHNE Eingriff rot — es gäbe nichts zu messen.\n');
    console.log(r.aus.split('\n').filter(l => l.includes('ROT')).join('\n'));
    process.exit(2);
  }
  console.log('  ✓ grün\n');
}

let gefangen = 0; const durchgerutscht = [], falscheZeile = [], toteAnker = [];

for (const f of FAELLE) {
  const d = frischeKopie();
  const p = join(d, QC);
  const vorher = readFileSync(p, 'utf-8');
  if (!vorher.includes(f.alt)) {
    toteAnker.push(f.name);
    console.log('  ⚠ TOTER ANKER: ' + f.name);
    rmSync(d, { recursive: true, force: true });
    continue;
  }
  writeFileSync(p, vorher.split(f.alt).join(f.neu));
  // index.html ist ERZEUGT — ohne build.py misst die Probe die alte Fassung.
  const bau = spawnSync('python3', [join(d, 'build.py')], { cwd: d, encoding: 'utf-8' });
  if (bau.status !== 0) {
    console.log('  ⚠ build.py scheiterte: ' + f.name + ' — ' + (bau.stderr || '').slice(0, 120));
  }
  const r = laufProbe(d);
  rmSync(d, { recursive: true, force: true });

  const roteZeilen = r.aus.split('\n').filter(l => l.includes('✗ ROT:'));
  if (r.code === 0) {
    durchgerutscht.push(f.name);
    console.log('  ✗ NICHT GEFANGEN: ' + f.name);
  } else if (!roteZeilen.some(l => f.trifft.test(l))) {
    falscheZeile.push(f.name + '  → rot war: ' + (roteZeilen[0] || 'Absturz').trim());
    console.log('  ✗ AUS DEM FALSCHEN GRUND: ' + f.name);
    console.log('      rot war: ' + (roteZeilen[0] || '(Absturz, keine rote Zeile)').trim());
  } else {
    gefangen++;
    console.log('  ✓ gefangen: ' + f.name);
  }
}

console.log(`\n${gefangen} gefangen · ${durchgerutscht.length} durchgerutscht · ` +
            `${falscheZeile.length} aus dem falschen Grund · ${toteAnker.length} tote Anker`);
if (durchgerutscht.length || falscheZeile.length || toteAnker.length) process.exit(1);
