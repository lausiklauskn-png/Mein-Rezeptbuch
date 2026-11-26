# Brief für die nächste Sitzung: APK und Windows richtig veröffentlichen, Rest des Plans (Stand 26.11.2026 abends)

Gilt für **Mein Rezeptbuch** und **Mein Mixarium**. Dieselbe Datei steht in beiden Repos unter `docs/`.

Klaus 26.11.: *„Ich möchte sie nicht als ZIP haben, sondern … von Main heruntergeladen, dass die Aktualisierung genauso läuft wie bei
Private Brain und bei Privatakte und wie bei Workflow PDF. Wir bauen das alles hier fertig.“*

## 0 · Stand heute

| | PWA (Web) | APK / Windows |
|---|---|---|
| Mein Rezeptbuch | 0.19.13, Kern 0.33.3 · `…/Mein-Rezeptbuch/neu/` | Test-Bau 26.11. (Debug-APK, unsigniertes Setup) als ZIP an Lauf 45845636703 / 45845642413, gültig bis 10.12. |
| Mein Mixarium | 10.0.0-vor43 · `…/Mein-Mixarium/neu/` | Test-Bau 26.11. (`mixarium-voll`) an Lauf 45845958945 / 45845963901 |

- **Zeichen:**
  - Die PWAs bleiben hell (Rezeptbuch: Kochlöffel, Schneebesen und Buch freigestellt; Mixarium: Kolben freigestellt).
  - Die Pakete haben einen farbigen Grund: Rezeptbuch = Klaus' Vorlage `icons/quelle/rezeptbuch-app-wasserfarbe.png` (in `paket/zeichen/rezeptbuch/`), Mixarium = blauer Wasserfarben-Grund (`paket/zeichen/mixarium-*`).
  - Auf Android liegt Klaus' ganzes Bild in der sichtbaren Fläche, gegen Kreis- und Squircle-Maske geprüft.
- **Paket-Probe:** `node paket/probe.mjs --rezeptbuch … --mixarium … --vendor <Workflow-PDF>/vendor` meldet 203 grün (alle vier Ausgaben, Android und Windows).
- **Beide Repos sind öffentlich.** Damit gehen Release-Downloads ohne Anmeldung.

## 1 · Hauptauftrag: Veröffentlichen wie Private Akte (signiert, Release, Update-Fähnchen)

**Vorbild:** `lausiklauskn-png/Private-Akte`, öffentlich. Dort lesen:
- `docs/SIGNIERUNG.md`
- `docs/VEROEFFENTLICHUNG-0.9.10.md`
- `.github/workflows/signing-identity.yml`
- `.github/workflows/android-signiert.yml` (Eingabe `veroeffentlichen = ja`)
- `.github/workflows/windows.yml`
- `tools/signing/` (stammt aus Datei-Organizer Pro)

So läuft es dort:
1. **Eigener, dauerhafter Signierschlüssel je App.** Er entsteht in GitHub Actions. Im Repo liegen nur das verschlüsselte Paket und der Fingerabdruck. Aufgeschlossen wird er über ein Environment-Secret, das Klaus selbst erzeugt.
2. **„Android-App signiert“ mit `veroeffentlichen = ja`** baut, signiert und legt das **GitHub-Release `vX.Y.Z`** mit APK und `SHA256SUMS` an. Außerdem schreibt der Lauf den **Update-Feed** nach `https://family-projekt.de/updates/<app>/` (`aktuell-android.json` und `.sig`). Die App zeigt daraufhin ein Fähnchen „Update“.
3. **Windows-Lauf mit `veroeffentlichen = ja`** hängt das Setup an dasselbe Release.
4. **Downloads** sind feste Links: `https://github.com/lausiklauskn-png/<Repo>/releases/download/vX.Y.Z/<Datei>`. Kein ZIP, keine Anmeldung.

**Für unsere zwei Apps übernehmen:**
- **Rezeptbuch:** App-Kennung `de.family_projekt.rezeptbuch`, Name „Mein Rezeptbuch“.
- **Mixarium:** App-Kennung `de.family_projekt.mixarium.voll`, Name „Mein Mixarium Pro (voll)“. Ausgabe `mixarium-voll`; die Store-Ausgabe kommt später.
- **Geheimnisse:** je App ein eigenes Secret. Vorschlag `RB_SIGNING_UNLOCK` und `MX_SIGNING_UNLOCK`, jeweils im Environment `android-production`. Nie denselben Schlüssel für beide Apps.
- **Bau-Weg:** Unsere Bauten laufen über `paket/zusammenstellen.mjs` (Capacitor- und Electron-Hülle, `paket/android`, `paket/windows`). Die Signier- und Veröffentlichungs-Schritte aus Private Akte kommen **hinter** unseren Bau. Den Bau selbst nicht ersetzen.
- **Fassungsnummern:** Rezeptbuch 0.19.x → APK „0.19.x“. Mixarium „10.0.0-vor43“ ist keine Release-Nummer: für das Release eine einfache Zählung festlegen (z. B. 10.0.0, versionCode 100) und Klaus fragen.
- **Update-Baustein:**
  - Das Mixarium hat die Anzeige schon (P2, vor37: Versionsknopf und rotes Schild „Update“ über `Capacitor.Plugins.DoUpdates`). Es fehlt der Baustein selbst, dazu „das Geheimnis“ (Schlüssel für die `.sig`).
  - Das Rezeptbuch braucht dieselbe Anzeige.
  - Den Baustein aus Private Akte bzw. Datei-Organizer übernehmen (dort `UpdateFeed.Ziel`, Meta-Daten im Manifest).
- **Windows:** Das Setup bleibt unsigniert (SmartScreen „Trotzdem ausführen“), wie bei Private Akte. Ein Zertifikat ist nicht entschieden.
- **Wichtig:** Die erste **signierte** APK lässt sich nicht über die heutige Debug-APK installieren. Vorher in der App „Sicherung speichern“, Debug-App deinstallieren, signierte installieren, Sicherung einspielen. Ab dann gehen alle Updates darüber, und die Daten bleiben.

**Was nur Klaus tun kann** (wie in Private Akte `docs/SIGNIERUNG.md`, „Was Klaus einmal tun muss“):
1. Je App eine Freigabe in Termux erzeugen: `openssl rand -hex 32 > ~/rb-signing-freigabe.txt` bzw. `mx-…`. Mit `age -p` verschlüsselt sichern, die offene Datei löschen. **Nie in den Chat.**
2. In GitHub → Repo → Settings → Environments → `android-production` → Secret anlegen (Name siehe oben).
3. Danach startet die Sitzung „Signieridentität initialize“ und führt den PR `signing/android-identity` zusammen.

**Server-Spiegel steht schon bereit (gesehen 26.11. auf Klaus' Hetzner-Server):** `family-project/server/spezial/spiegeln.mjs` holt die
Pro-Dateien aus den **GitHub-Releases** auf den eigenen Server (Marktplatz Spezial, Download gegen Passkey). In `quellen.json` stehen schon
`rezeptbuch-pro` (Repo `Mein-Rezeptbuch`, „Mein Rezeptbuch Pro“) und `mixarium-pro` (`Mein-Mixarium`, „Mein Mixarium Pro“); der Lauf meldet
„unverändert“, weil es noch keine Releases gibt. Dateinamen der Release-Anhänge so wählen, wie `spiegeln.mjs` sie erwartet (dort nachlesen),
und den App-Namen des Rezeptbuchs mit Klaus klären („Mein Rezeptbuch Pro“ wie beim Mixarium?).

**Klaus' Freigaben (26.11. abends):** Befehle für Termux sind gegeben (Freigabe erzeugen, als `RB_SIGNING_UNLOCK` / `MX_SIGNING_UNLOCK` im
Environment `android-production` eintragen, mit `age -p` nach Downloads sichern, Gegenprobe „GLEICH“). ✅ **Erledigt und gemessen
(26.11., 17:05):** beide Gegenproben „GLEICH“, `gh secret list` zeigt `RB_SIGNING_UNLOCK` (Mein-Rezeptbuch) und `MX_SIGNING_UNLOCK`
(Mein-Mixarium) im Environment `android-production`, Sicherungen `rb-`/`mx-signing-freigabe.txt.age` (je 247 Bytes) in Klaus' Downloads,
Klartext gelöscht. Nicht mehr fragen, gleich mit dem Signier-Workflow beginnen.

**Fertig ist es, wenn:**
- Klaus vier feste Links hat (je App APK und Setup).
- Die zweite Fassung sich über die erste installiert.
- Das Fähnchen „Update“ in der App erscheint.

## 2 · Rest des Plans vom 26.11. (Klaus: „Wir werden den Rest auch noch umsetzen“)

1. **Mikrofon in der Android-App** (beide Apps): wie Private Akte 0.9.10 mit dem Plugin **ProSpeech** (Androids Sprachfenster, kein Mikrofon-Recht nötig) und Klebstoff, der `window.SpeechRecognition` setzt, bevor das Diktat startet. Nur ins App-Paket. Beide Apps nutzen `kern/oberflaeche/diktat.mjs` (`diktatMoeglich()`); `paket/android/package.json` hat noch kein Sprach-Plugin. Fehlerbericht als Vorbild: `Private-Akte/docs/FEHLERBERICHT_2026-11-26_MIKROFON-ANDROID-APP.md`.
2. **KI-Sternchen und Labor-Werkstatt:**
   - Rezepte von der KI tragen ein kleines Sternchen im Bild.
   - Außerhalb des Einzelmodus gilt: nach 3 niedrigen Bewertungen wird das Rezept nicht gelöscht, sondern kommt in die „Labor-Werkstatt“ bzw. „Baustelle“. Dort bekommt es eine zweite Chance mit neuem Hinweis und KI-Überarbeitung (Mikrofon und Text wie „Überarbeiten“ im Mixarium, vor40).
   - Im Einzelmodus entscheidet Klaus.
   - **Erst das alte Mixarium lesen** (`QC_Mixarium_20_04_26.html`: Lab-Pool `experimentell` → `accepted`/`removed`, `LAB_WEIGHTS`). Klaus meint, so etwas gab es schon.
3. **Drink-Datenbank im Mixarium-Labor** (TheCocktailDB, im alten Mixarium `discoverToggle()`, Filter nach Land/Tradition usw.): übernehmen. `getraenke/entdecken.mjs` kann schon `getraenkAusDb` und `schonDa`; die Oberfläche dazu prüfen. Nach dem Übernehmen Doppelte über `doppelNach` (Kern 0.33).
4. **Planabgleich an Klaus berichten** (er hat darum gebeten): was vom Plan vom 26.11. umgesetzt ist, was offen ist.

## 3 · Kleinere offene Punkte

- **Stollen und Eierschecke:** Klaus arbeitet sie selbst nach und gibt sie wieder. Dann direkt in `beispiele/rezeptbuch-2026-11-26.json` einfügen (das Revisionsskript vom 26.11. lag nur in der Sitzung, nicht im Repo; der Prüfbericht nennt jede Änderung). Danach `python3 tools/start-rezepte.py` (Rezeptbuch) und `python3 tools/rezeptbuch-getraenke.py <Pfad>` (Mixarium) laufen lassen.
- **Muttis-Ausgabe:** Sie hat noch Platzhalter-Zeichen in `paket/zeichen/`. Nicht gebaut.
- **Lighthouse Rezeptbuch** (Handy um 81): Der Rest ist Render-Verzögerung durch rund 45 einzeln geladene Module. Bündeln wäre die nächste Stufe; Klaus vorschlagen, nicht einfach bauen.
- **Startgetränke im Mixarium** bleiben „vorläufig“ (Klaus). Eine Vorschau mit Nachladen wie im Rezeptbuch (0.19.11, `bildNach`) wäre möglich.
- **Bekannt rot, auch auf `main`:**
  - Rezeptbuch `smoke_neu_scan` bricht im PDF-Teil ab.
  - Rezeptbuch `smoke_neu_kreativbuch`: Konsolenhinweis „focus-without-user-activation“.

## 4 · Fallen, die heute Zeit gekostet haben

- **Commit auf losgelöstem Stand:** PR #539 war leer, weil der Commit auf einem detached HEAD lag. Vor jedem Commit `git branch --show-current` prüfen.
- **`git merge -X ours FETCH_HEAD` nach einem Squash-Merge** brachte gelöschte Dateien zurück (2 Startbilder) und ließ einen Eintrag doppelt stehen (`beispiele` in `ausgabe.json`). Besser: Zweig vor jeder Runde frisch von `origin/main` (`git checkout -B … origin/main`) und nach dem Push `git diff --stat origin/main HEAD` lesen.
- **Paket-Weiche:** Ein Vorab-Abruf in `neu/index.html` ist für alle Ausgaben dieselbe Seite. Was ausgabenabhängig ist, gehört hinter die Weiche in `app.mjs`, sonst gibt sich eine Muttis-App als Rezeptbuch aus.
- **Artefakte in die Sitzung laden:** Die Speicheradresse wechselt je Lauf (`productionresultssa8` war gesperrt). Mit Releases (Punkt 1) entfällt das.
