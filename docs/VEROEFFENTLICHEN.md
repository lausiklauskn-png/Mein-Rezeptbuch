# Veröffentlichen: signierte APK und Windows-Setup als GitHub-Release

Klaus 26.11.2026: *„Ich möchte sie nicht als ZIP haben, sondern … von Main heruntergeladen, dass die Aktualisierung genauso läuft wie bei
Private Brain und bei Privatakte.“* Vorbild ist Private Akte (`docs/SIGNIERUNG.md`, `.github/workflows/android-signiert.yml`). Diese Datei
steht gleichlautend in Mein Rezeptbuch und Mein Mixarium; was je App verschieden ist, steht in der Tabelle.

| | Mein Rezeptbuch | Mein Mixarium |
|---|---|---|
| Ausgabe | `rezeptbuch` | `mixarium-voll` |
| App-Kennung | `de.family_projekt.rezeptbuch` | `de.family_projekt.mixarium.voll` |
| Freigabe (Environment `android-production`) | `RB_SIGNING_UNLOCK` | `MX_SIGNING_UNLOCK` |
| Dateien im Release | `Mein-Rezeptbuch-<v>.apk`, `Mein-Rezeptbuch-<v>-Windows-Setup.exe` | `Mein-Mixarium-Pro-<v>.apk`, `Mein-Mixarium-Pro-<v>-Windows-Setup.exe` |

## Bausteine

- `tools/signing/` aus Private Akte. Je App verschieden ist nur `tools/signing/app.mjs` (Kennung, Name, Name der Freigabe); die übrigen
  Dateien sind in beiden Repos byte-gleich. Proben: `node --test tools/signing/test-identity.mjs tools/signing/test-unlock-file.mjs`.
- `.github/workflows/signing-identity.yml`: einmal **initialize** (erzeugt den Schlüssel in Actions, legt nur `signing/android-release.enc.json`
  und `signing/android-certificate.json` als PR `signing/android-identity` ab), danach jederzeit **check**.
- `.github/workflows/veroeffentlichen.yml`: baut über `paket/zusammenstellen.mjs` die Release-APK (`assembleRelease`), signiert sie mit der
  dauerhaften Identität und baut das Windows-Setup. Mit **veroeffentlichen = ja** zusätzlich das Release `v<Fassung>` mit APK, Setup und
  `SHA256SUMS`, danach von außen gegengeprüft. Eine Fassung nur einmal.
- `paket/release-fassung.mjs`: Release-Fassung aus `FASSUNG` in `neu/app.mjs`. `X.Y.Z` bleibt; `X.Y.0-vorN` wird `X.Y.N`
  (Mixarium 10.0.0-vor43 → 10.0.43). versionCode = X·1 000 000 + Y·1 000 + Z, steigt also mit jeder Fassung.
- Der Server-Spiegel (`family-project/server/spezial/spiegeln.mjs`, `rezeptbuch-pro` / `mixarium-pro`) holt die neueste `.apk` und `.exe`
  aus den Releases; die Dateinamen passen zu seinem Muster.

## Was noch fehlt (benannt)

- **Update-Fähnchen in der App** (wie Private Akte: `family-projekt.de/updates/<app>/aktuell-android.json` + `.sig`, Baustein DoUpdates):
  braucht den Baustein in der Android-Hülle und zwei Geheimnisse je Repo (`UPDATE_SIGNING_KEY` für die Unterschrift, `UPDATE_UPLOAD_KEY`
  zum Hochladen auf den Server). Nicht gebaut. Bis dahin: neue Fassung über den festen Link holen und über die vorhandene App installieren.
- **Windows-Signatur:** keine (SmartScreen › Weitere Informationen › Trotzdem ausführen), wie bei Private Akte.
- **Wechsel von der Probe-APK:** die Probe (Debug) trägt einen anderen Schlüssel. Einmal in der App „Sicherung speichern“, Probe
  deinstallieren, signierte installieren, Sicherung einspielen. Ab dann installiert sich jede neue Fassung über die vorige.
- ⚠ Wer die Freigabe verliert, kann der App keine Updates mehr geben. Klaus' Sicherung: `rb-`/`mx-signing-freigabe.txt.age` (mit `age -p`).
