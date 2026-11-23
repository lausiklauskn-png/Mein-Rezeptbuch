// Windows-Hülle · Aus einer Adresse der App wird eine Datei im Web-Ordner. Ohne Electron, damit es sich in Node prüfen lässt
// (paket/probe.mjs fährt genau diese Datei). Regeln:
//  - nichts außerhalb des Web-Ordners (kein „..“, kein Rückstrich, kein Doppelpunkt, kein NUL, keine Verknüpfung nach draußen)
//  - „/“ am Ende und ein Ordner führen auf dessen index.html
//  - was fehlt, ist 404 – es gibt KEINEN Rückfall auf die Startseite (sonst läse ein Baustein die Startseite als JSON)
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ART = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.traineddata': 'application/octet-stream',
};

/** Adresse (nur der Pfad-Teil, z. B. „/neu/index.html“) → { datei } oder { status: 400 | 403 | 404 }. */
function aufloesen(wwwOrdner, urlPfad) {
  let p;
  try { p = decodeURIComponent(String(urlPfad || '/')); } catch { return { status: 400 }; }
  if (p.includes('\0') || p.includes('\\') || p.includes(':')) return { status: 400 };   // „:“ wäre unter Windows ein Laufwerk oder ein Nebenstrom
  if (!p.startsWith('/')) p = '/' + p;
  if (p.split('/').includes('..')) return { status: 403 };
  const wurzel = path.resolve(wwwOrdner);
  let datei = path.resolve(wurzel, '.' + p);
  if (datei !== wurzel && !datei.startsWith(wurzel + path.sep)) return { status: 403 };
  let st;
  try { st = fs.statSync(datei); } catch { return { status: 404 }; }
  if (st.isDirectory()) { datei = path.join(datei, 'index.html'); try { st = fs.statSync(datei); } catch { return { status: 404 }; } }
  if (!st.isFile()) return { status: 404 };
  let echt, echteWurzel;
  try { echt = fs.realpathSync(datei); echteWurzel = fs.realpathSync(wurzel); } catch { return { status: 404 }; }
  if (echt !== echteWurzel && !echt.startsWith(echteWurzel + path.sep)) return { status: 403 };   // Verknüpfung nach draußen
  return { datei };
}

/** Kopfzeilen für eine Datei: die Art nach der Endung, nie geraten. */
function kopf(datei) {
  return { 'content-type': ART[path.extname(datei).toLowerCase()] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache' };
}

module.exports = { aufloesen, kopf, ART };
