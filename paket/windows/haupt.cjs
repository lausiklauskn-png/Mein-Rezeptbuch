// Windows-Hülle (Electron) · zeigt den Web-Ordner „www“ aus dem Paket in einem Fenster. Mehr nicht.
// Die App selbst ist dieselbe wie im Browser und in der APK; hier steht nur, was Windows braucht.
//  - Die Seiten kommen über eine eigene Adresse (app://paket/…), nicht über file://. Diese Adresse ist die Herkunft, an der
//    die Daten der App hängen (IndexedDB). ⚠ SCHEMA und HOST nie ändern: mit einer anderen Adresse sähe die App ihre Daten nicht mehr.
//  - Die Daten liegen je Ausgabe in einem eigenen Ordner unter %APPDATA% (datenOrdner aus paket-windows.json), damit zwei
//    Ausgaben mit demselben Namen (Mixarium Store und voll) sich nichts teilen.
//  - Die Seite bekommt kein Node, kein Vorlade-Skript, keine Brücke. Fremde Adressen öffnet der Browser des Rechners.
//  - Es gibt keine Selbst-Aktualisierung und keinen Netzverkehr der Hülle. Ins Netz geht nur, was die App selbst auf Knopfdruck holt.
// Nicht gemessen: diese Datei ist geschrieben, aber noch nie unter Windows gelaufen (siehe docs/BAU_APK_WINDOWS.md).
'use strict';
const { app, BrowserWindow, Menu, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { aufloesen, kopf } = require('./pfad.cjs');

const SCHEMA = 'app', HOST = 'paket', START = `${SCHEMA}://${HOST}/index.html`;
const WWW = path.join(__dirname, 'www');
const EIN = JSON.parse(fs.readFileSync(path.join(__dirname, 'paket-windows.json'), 'utf8'));
/* Was die App vom Rechner erfragen darf – nur von der eigenen Adresse aus. Alles andere wird abgelehnt.
   media = Mikrofon/Kamera (Spracheingabe, sobald es dafür einen Weg gibt) · screen-wake-lock = Bildschirm bleibt beim Kochen an */
const ERLAUBT = new Set(['media', 'persistent-storage', 'screen-wake-lock', 'fullscreen', 'clipboard-read', 'clipboard-sanitized-write', 'notifications']);

const eigen = (adresse) => { try { const u = new URL(adresse); return u.protocol === SCHEMA + ':' && u.host === HOST; } catch { return false; } };
const nachDraussen = (adresse) => { try { const u = new URL(adresse); if (u.protocol === 'https:' || u.protocol === 'mailto:') shell.openExternal(u.href); } catch { /* keine Adresse */ } };

protocol.registerSchemesAsPrivileged([{ scheme: SCHEMA, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } }]);
app.setPath('userData', path.join(app.getPath('appData'), EIN.datenOrdner));

let fenster = null;
function oeffnen() {
  fenster = new BrowserWindow({
    width: 1200, height: 820, minWidth: 360, minHeight: 520, title: EIN.titel, backgroundColor: EIN.grund || '#2a1a10', autoHideMenuBar: true,
    icon: fs.existsSync(path.join(__dirname, 'zeichen', 'icon.png')) ? path.join(__dirname, 'zeichen', 'icon.png') : undefined,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false, devTools: process.argv.includes('--werkzeuge') },
  });
  const wc = fenster.webContents;
  fenster.on('page-title-updated', (ev) => ev.preventDefault());                       // der Fenstertitel ist der Name der Ausgabe, nicht der Seitentitel
  wc.setWindowOpenHandler(({ url }) => { nachDraussen(url); return { action: 'deny' }; });   // kein zweites Fenster; https und mailto öffnet der Rechner
  wc.on('will-navigate', (ev, url) => { if (!eigen(url)) { ev.preventDefault(); nachDraussen(url); } });
  wc.on('will-attach-webview', (ev) => ev.preventDefault());
  if (process.argv.includes('--werkzeuge')) wc.openDevTools({ mode: 'detach' });
  fenster.on('closed', () => { fenster = null; });
  fenster.loadURL(START);
}

if (!app.requestSingleInstanceLock()) app.quit();   // zwei Fenster auf demselben Datenordner sperren sich gegenseitig aus
else {
  app.on('second-instance', () => { if (fenster) { if (fenster.isMinimized()) fenster.restore(); fenster.focus(); } });
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    protocol.handle(SCHEMA, async (anfrage) => {
      let u; try { u = new URL(anfrage.url); } catch { return new Response('', { status: 400 }); }
      if (u.host !== HOST) return new Response('', { status: 404 });
      if (anfrage.method !== 'GET' && anfrage.method !== 'HEAD') return new Response('', { status: 405 });
      const z = aufloesen(WWW, u.pathname);
      if (!z.datei) return new Response('Nicht im Paket: ' + u.pathname, { status: z.status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      try { return new Response(anfrage.method === 'HEAD' ? null : await fs.promises.readFile(z.datei), { status: 200, headers: kopf(z.datei) }); }
      catch { return new Response('', { status: 404 }); }
    });
    const s = session.defaultSession;
    s.setPermissionRequestHandler((wc, erlaubnis, antwort, einzel) => antwort(eigen((einzel && einzel.requestingUrl) || (wc && wc.getURL()) || '') && ERLAUBT.has(erlaubnis)));
    s.setPermissionCheckHandler((wc, erlaubnis, herkunft) => eigen(herkunft || '') && ERLAUBT.has(erlaubnis));
    oeffnen();
  });
}
