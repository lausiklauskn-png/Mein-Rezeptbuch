// Baut aus der neuen PWA (neu/) EINE HTML-Datei zum Ansehen und Durchklicken: alle Module gebündelt, Stil, Symbole,
// Ausgabe-Beschreibung und Startinhalt eingebettet. Sie läuft ohne Server und ohne Netz (auch als Anhang oder Datei).
// Der Speicher ist in der Vorschau flüchtig (nur im Arbeitsspeicher): jedes Öffnen beginnt frisch, im Gerät bleibt nichts.
// Was die Vorschau NICHT kann: PDF lesen und „Datei prüfen“ (laden Bausteine nach), offline installieren, die Sinn-Suche.
// Aufruf: node vorschau-bauen.mjs <repo> <ziel.html> [--bundler <ordner mit node_modules/esbuild>]
import { readFile, writeFile } from 'node:fs/promises'; import { join, extname, resolve, dirname } from 'node:path'; import { createRequire } from 'node:module';
const [repo, ziel] = process.argv.slice(2).map((p) => resolve(p)), wo = process.argv.indexOf('--bundler');
const esbuild = createRequire(join(wo > 0 ? resolve(process.argv[wo + 1]) : process.cwd(), 'x.js'))('esbuild');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const datenAdresse = async (pfad) => `data:${MIME[extname(pfad)]};base64,${(await readFile(pfad)).toString('base64')}`;
const SPEICHER = `export function speicher() { const m = new Map(); return { async lies() { return m.get('alles') ?? null; }, async schreibe(z) { m.set('alles', z); }, async hol(k) { return m.get(k) ?? null; }, async setz(k, w) { m.set(k, w); }, async weg(k) { m.delete(k); }, async dauerhaft() { return false; } }; }`;
const bau = await esbuild.build({ entryPoints: [join(repo, 'neu', 'app.mjs')], bundle: true, format: 'esm', write: false, logLevel: 'warning', charset: 'utf8',
  plugins: [{ name: 'fluechtiger-speicher', setup(b) { b.onLoad({ filter: /kern[\\/]speicher[\\/]speicher\.mjs$/ }, () => ({ contents: SPEICHER, loader: 'js' })); } }] });
let js = bau.outputFiles[0].text, html = await readFile(join(repo, 'neu', 'index.html'), 'utf8'), css = await readFile(join(repo, 'neu', 'app.css'), 'utf8');
/* Dateien, die die App beim Start oder auf Knopfdruck von nebenan holt: eingebettet, über einen kleinen Vorsatz vor fetch ausgeliefert. */
const holt = [...new Set([...js.matchAll(/fetch\(\s*['"`](\.{1,2}\/[^'"`$]+\.json)/g)].map((m) => m[1]))], daten = {};
for (const u of holt) { try { daten[u.split('/').pop()] = await readFile(join(repo, 'neu', u), 'utf8'); } catch { /* gibt es nicht: die App fällt auf ihren Leerzustand zurück */ } }
/* Bilder, die als Adresse im Code oder im Stil stehen */
const bilder = [...new Set([...(js + html + css).matchAll(/(\.\.\/(?:icons|assets)\/[\w.-]+\.(?:png|jpe?g|svg|webp))(\?v=\d+)?/g)].map((m) => m[0]))];
for (const b of bilder) { let d; try { d = await datenAdresse(join(repo, 'neu', b.split('?')[0])); } catch { continue; } js = js.split(b).join(d); html = html.split(b).join(d); css = css.split(b).join(d); }
const sicher = (t) => t.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
const vorsatz = `const DATEN = {}; for (const el of document.querySelectorAll('script[data-datei]')) DATEN[el.dataset.datei] = el.textContent;
const echt = window.fetch.bind(window);
window.fetch = (u, o) => { const s = String(u), n = s.split('?')[0].split('/').pop(); return !/^https?:/.test(s) && DATEN[n] !== undefined ? Promise.resolve(new Response(DATEN[n], { headers: { 'content-type': 'application/json' } })) : echt(u, o); };
for (const n of ['pushState', 'replaceState']) { const o = history[n].bind(history); history[n] = (s, t, u) => { try { o(s, t, u); } catch { try { o(s, t); } catch { /* ohne Verlauf */ } } }; }`;
html = html.replace(/<link rel="manifest"[^>]*>\s*/, '').replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`)
  .replace(/<script type="module" src="[^"]*"><\/script>/, () => Object.entries(daten).map(([n, t]) => `<script type="application/json" data-datei="${n}">${t.replace(/<\//g, '<\\/')}</script>`).join('\n') + `\n<script type="module">\n${vorsatz}\n${sicher(js)}\n</script>`);
if (html.includes('src="./app.mjs')) throw new Error('Der Einbau des Skripts hat nicht getroffen.');
await writeFile(ziel, html); console.log(`${ziel}: ${(html.length / 1048576).toFixed(2)} MB · eingebettet: ${Object.keys(daten).join(', ')} · ${bilder.length} Bilder`);
