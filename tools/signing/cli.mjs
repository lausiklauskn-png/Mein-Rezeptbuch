// tools/signing/cli.mjs — eigene, dauerhafte Android-Signieridentität je App (Klaus 26.11.2026: „wie bei Private Akte“).
// Übernommen aus Private Akte (dort aus Datei-Organizer Pro und BookLedgerPro); Namen und Kennung stehen in app.mjs.
// „check“ gibt auch den SHA-1 aus (Google verlangt ihn für einen OAuth-Client „Android“).
// init (einmal, nur Klaus über signing-identity.yml), check und sign-apk (android-signiert.yml). Nie einen Schlüssel einer anderen App.
import { createHash } from 'node:crypto';
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UNLOCK_NAME, createIdentity, saveNewIdentity, verifyPinnedIdentity } from './identity.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = path.join(root, 'signing');
const [command, ...args] = process.argv.slice(2);
const key = process.env[UNLOCK_NAME];
try {
  if (command === 'init') {
    for (const name of ['android-release.enc.json', 'android-certificate.json']) {
      try { await lstat(path.join(directory, name)); throw new Error('Signieridentität vorhanden; Initialisierung abgebrochen.'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const envelope = await createIdentity(key);
    await saveNewIdentity(directory, envelope);
    await verifyPinnedIdentity(directory, key);
    console.log('Eigene Signieridentität erstellt und Wiederherstellung geprüft. Zertifikat SHA-256: ' + envelope.certificateSha256);
  } else if (command === 'check') {
    await verifyPinnedIdentity(directory, key, identity => {
      const sha1 = createHash('sha1').update(identity.certificate).digest('hex').toUpperCase().match(/../g).join(':');
      console.log('Identität wiederhergestellt; Zertifikat SHA-256: ' + identity.fingerprint);
      console.log('Zertifikat SHA-1 (für Google, OAuth-Client „Android“): ' + sha1);
    });
  } else if (command === 'sign-apk') {
    const [input, output] = args;
    const { signApk } = await import('./apk.mjs');
    const receipt = await signApk({ input, output, directory, key,
      signer: process.env.APP_APKSIGNER, aapt: process.env.APP_AAPT,
      tag: process.env.APP_RELEASE_TAG, commit: process.env.APP_RELEASE_COMMIT });
    console.log('APK-Signatur, Zertifikat, App-Kennung und Version geprüft. SHA-256: ' + receipt.apkSha256);
  } else {
    throw new Error('Aufruf: node tools/signing/cli.mjs init | check | sign-apk <unsigned.apk> <neue.apk>');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
