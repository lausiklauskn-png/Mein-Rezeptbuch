# Android-APK und Windows-App bauen

Stand 2026-11-23. Gilt für **Mein Rezeptbuch** (Ausgaben `rezeptbuch`, `muttis`) und **Mein Mixarium** (Ausgaben
`mixarium-store`, `mixarium-voll`); diese Datei und der Ordner `paket/` liegen in beiden Repos gleich.

**Gebaut ist noch nichts.** Es gibt keine APK, keinen Installer, keinen Store-Eintrag, kein Release. Vorbereitet sind die Wahl
des Werkzeugs, das Zusammenstellen des Pakets, die Einstellungen der Hüllen und eine Probe. Der Bau startet erst, wenn Klaus
es will (Abschnitt 4).

## 1 · Die Wahl

**Android: Capacitor 8. Windows: Electron mit einer eigenen, kleinen Hülle, verpackt mit electron-builder.**

1. Capacitor ist in der Familienakte schon im Einsatz, der native Sprach-Baustein (ProSpeech) ist dafür geschrieben, und die
   Android-Hülle bringt mit, was diese Apps brauchen: Foto über die Dateiwahl mit Kamera, natives HTTP ohne CORS, Zurück-Taste
   (über `@capacitor/app`).
2. Für Windows gibt es von Capacitor nichts Aktuelles: `@capacitor-community/electron` steht seit dem 21.09.2023 bei 5.0.1
   und setzt Capacitor 5 voraus; deshalb zeigt eine eigene Hülle von rund 70 Zeilen (`paket/windows/haupt.cjs`) denselben
   Web-Ordner in Electron.
3. Tauri 2 könnte beide Ziele aus einem Werkzeug, verlangt aber Rust und das Android-NDK und einen Neubau des
   Sprach-Bausteins; eine PWA als MSIX zeigt auf die Web-Adresse und legt die Beispiele nicht ins Paket – beides passt nicht
   zu den Vorgaben.

„Ein Werkzeug“ heißt hier: **ein** Zusammensteller (`paket/zusammenstellen.mjs`) für beide Apps und beide Ziele, der **einen**
Web-Ordner erzeugt; darum liegen zwei dünne Hüllen.

Fassungen, nachgesehen am 23.11.2026 in der npm-Registry und in den Paketen selbst (nicht geraten):

| Baustein | Fassung | Verlangt |
|---|---|---|
| `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` | 8.6.2 (12.11.2026) | Node ≥ 22; aus der Android-Vorlage der CLI: Java 21, compileSdk/targetSdk 36, minSdk 24 (Android 7), Android-Gradle-Plugin 8.13.0, Gradle 8.14.3 |
| `@capacitor/app` | 8.1.2 | Zurück-Taste: ohne eigenen Lauscher geht sie in der App einen Schritt zurück |
| `@capacitor/assets` | 4.0.0 | erzeugt die Android-Zeichen aus fünf Bildern |
| `electron` | 45.4.1 (19.11.2026) | Node ≥ 22.12 zum Installieren |
| `electron-builder` | 26.18.0 | baut den Installer auf einem Windows-Rechner |

Die Fassungen stehen fest in `paket/android/package.json` und `paket/windows/package.json`, samt `package-lock.json`.

## 2 · Was im Paket liegt

`node paket/zusammenstellen.mjs --ausgabe <name> --ziel android|windows` legt einen Arbeitsordner an
(Vorgabe `paket/aus/<ausgabe>-<ziel>/`, steht in `.gitignore`). Darin:

| Im Web-Ordner `www/` | Woher | Bemerkung |
|---|---|---|
| `index.html` | erzeugt | Startseite, führt nach `neu/index.html` (die App arbeitet mit `../kern/…`) |
| `neu/` | Repo | die App; **ohne** `sw.js` (Abschnitt 5) |
| `kern/` | Repo | nur `.mjs`, ohne die zwei Werkzeuge für Node; vorher gegen `KERN.json` geprüft |
| `getraenke/` | Repo | nur Mixarium |
| `assets/*.js` | Repo | Reinigung und Prüfkern |
| `ausgaben/<name>/ausgabe.json` | Repo | genau diese eine |
| `beispiele/` | Repo | nur die Pakete aus `beispiele` der Ausgabe, mit gekürztem `KATALOG.json` |
| `sbkim/03_embedding.js`, `04_match.js` | Repo | für die Sinn-Suche |
| Zeichen | Repo | die Bilder, auf die `neu/` verweist (werden von selbst mitgenommen) |
| `Workflow-PDF/vendor/pdfjs/`, `…/tesseract/` | Workflow PDF | pdf.js und Texterkennung mit den Sprachdaten aus `OCR_SPRACHEN` (heute deu, eng, rus), unter derselben Adresse wie im Netz; geprüft gegen `paket/vendor-pin.json` |
| `impressum.html` | Repo | nur Mixarium (die App verweist darauf) |
| `LICENSE`, `THIRD_PARTY.md` | Repo | |
| `paket.json` | erzeugt | Paketzettel: Ausgabe, Ziel, Fassungen, Prüfsumme jeder Datei |

Größe des Web-Ordners (gemessen): `rezeptbuch` und `muttis` 46,8 MB (Beispiele 23,9 MB, pdf.js und Texterkennung 21,8 MB) ·
`mixarium-store` 22,9 MB · `mixarium-voll` 24,4 MB.

Neben `www/` liegen die Einstellungen der Hülle. Android: `capacitor.config.json`, `package.json`, `package-lock.json`,
`assets/` (Zeichen). Windows: `haupt.cjs`, `pfad.cjs`, `paket-windows.json`, `builder.json`, `package.json`,
`package-lock.json`, `zeichen/icon.png`.

**Das Werkzeug bricht ab** und schreibt nichts, wenn

- die Prüfung des Küchen-Kerns (`kern/ausgabe/ausgabe.mjs`) etwas meldet: Paket nicht freigegeben, Alkohol in einer Ausgabe
  ohne Alkohol oder für den Store (auch wenn sich ein Paket fälschlich als alkoholfrei ausgibt), Prüfsumme falsch;
- das Ziel nicht in `ziele` steht oder die Lieferung nicht `im-paket` ist;
- `kern/` nicht zu `KERN.json` passt, pdf.js oder die Texterkennung nicht zu `paket/vendor-pin.json`;
- die App ihre Ausgabe anders festlegt, als `paket/ausgaben.json` sagt (siehe „Weiche“);
- ein Verweis der App im Paket ins Leere ginge;
- der Arbeitsordner das Repo selbst wäre oder ein fremder, nicht leerer Ordner.

**Weiche.** Beide Apps legen ihre Ausgabe heute fest im Code fest (Rezeptbuch: `fetch('../ausgaben/rezeptbuch/ausgabe.json')`,
Mixarium: `const AUSGABE = 'mixarium-voll'` mit dem Vermerk „die Store-Fassung wird beim Bauen erzeugt“). Für `muttis` und
`mixarium-store` stellt das Werkzeug diese eine Stelle **in der Kopie** um; das Repo bleibt, wie es ist. Trifft die Stelle
nicht genau einmal, bricht es ab – ein Store-Paket, das sich wie die volle Ausgabe verhält, kann so nicht entstehen.

## 3 · Was Klaus entscheidet (Vorschläge stehen in `paket/ausgaben.json`)

**App-Kennung.** Sie lässt sich nach der ersten Veröffentlichung nie mehr ändern; an ihr hängen auf dem Gerät die Daten.
Vorschlag nach der Adresse `family-projekt.de` (ein Bindestrich ist in einer Kennung nicht erlaubt, daher der Unterstrich):

| Ausgabe | App-Kennung (Vorschlag) | Name der App (Vorschlag) |
|---|---|---|
| `rezeptbuch` | `de.family_projekt.rezeptbuch` | Mein Rezeptbuch |
| `muttis` | `de.family_projekt.muttis` | Muttis Rezeptbuch |
| `mixarium-store` | `de.family_projekt.mixarium` | Mein Mixarium |
| `mixarium-voll` | `de.family_projekt.mixarium.voll` | Mein Mixarium (voll) |

Frage: welche Vorsilbe hat die Kennung der Familienakte? Dann dieselbe nehmen. Die zwei Mixarium-Ausgaben brauchen
verschiedene Namen, sonst liegen auf einem Gerät zwei gleich beschriftete Apps.

**Sicherung durch Android.** Die Vorlage von Capacitor erlaubt sie (`allowBackup="true"`); dann wandert der Speicher der App
mit der Geräte-Sicherung zu Google – auch die KI-Schlüssel, die laut App „nur im Gerät“ liegen. Vorgabe hier: **aus**
(`paket/android/nachbessern.mjs`), gesichert wird über Tresor und Sicherungsdatei. Mit `--android-sicherung an` bleibt sie an.

**Zeichen** (dunkler Grund mit Goldring). Je Ausgabe fünf Dateien nach `paket/zeichen/<ausgabe>/`; solange eine fehlt, nimmt
das Werkzeug das Platzhalter-Zeichen („PLATZHALTER“ auf dunklem Grund, `paket/zeichen/platzhalter/`) und sagt es bei jedem Lauf.

| Datei | Größe | Inhalt | Wird zu |
|---|---|---|---|
| `icon-only.png` | 1024 × 1024, ohne Transparenz | das ganze Zeichen: dunkler Grund, Goldring, Motiv | Android (ältere Geräte), Windows (Fenster, Verknüpfung, Installer; electron-builder macht daraus die `.ico`, mindestens 256 × 256) |
| `icon-foreground.png` | 1024 × 1024, transparent | nur das Motiv (die „zweite Fassung“ aus `docs/vorschau/app-zeichen-auftraege.md`) | Android: Vordergrund des anpassbaren Zeichens |
| `icon-background.png` | 1024 × 1024, ohne Transparenz | nur der dunkle Grund | Android: Hintergrund |
| `splash.png` | 2732 × 2732 | Startbild hell: Motiv klein in der Mitte | Android: Startbild |
| `splash-dark.png` | 2732 × 2732 | Startbild dunkel | Android: Startbild im Dunkelmodus |

Android schneidet das Zeichen rund oder eckig zu. `@capacitor/assets` setzt Vorder- und Hintergrund mit 16,7 % Rand ein
(im Trockenlauf gesehen); ob der Goldring danach noch gut sitzt, zeigt erst das Gerät. Das Zeichen **in** der App (Kopfzeile)
ist ein eigener Punkt, siehe Abschnitt 5.

## 4 · Schritt für Schritt

### Einmal einrichten

1. Erledigt (23.11.2026): der Ordner `paket/` und diese Datei liegen in beiden Repos, `paket/aus/` steht in `.gitignore`.
2. `paket/ausgaben.json` ansehen: Kennung und Name je Ausgabe bestätigen oder ändern.
3. Die Probe fahren (Abschnitt 6). Sie braucht beide Repos nebeneinander und einen Klon von Workflow PDF.
4. Die Vorlage `paket/vorlagen/paket-bauen.yml` nach `.github/workflows/paket-bauen.yml` kopieren und einchecken.
   Sie hat nur den Knopf „Run workflow“ (`workflow_dispatch`), keinen Start durch `push`, und veröffentlicht nichts.
5. Ist das Repo Workflow-PDF privat: ein Lese-Token (fine-grained, nur dieses Repo, nur „Contents: Read“) als Geheimnis
   `WORKFLOW_PDF_LESEN` anlegen und die auskommentierte Zeile `token:` in der Workflow-Datei einschalten. Ist es öffentlich,
   entfällt das.

### Einen Bau starten

GitHub → Repo → **Actions** → „Paket bauen (von Hand)“ → **Run workflow** → Ausgabe und Ziel wählen → starten.
Nach dem Lauf liegt unter „Artifacts“ eine ZIP-Datei mit der APK oder dem Installer (14 Tage).

- **APK aufs Gerät:** ZIP entpacken, APK auf das Tablet, „Aus dieser Quelle zulassen“, installieren.
- **Windows:** die `.exe` starten. Ohne Signatur warnt Windows („Unbekannter Herausgeber“) → „Weitere Informationen“ →
  „Trotzdem ausführen“.

### Am eigenen Rechner (wenn gewünscht)

```bash
node paket/zusammenstellen.mjs --ausgabe rezeptbuch --ziel android --vendor ../Workflow-PDF/vendor
cd paket/aus/rezeptbuch-android
npm ci
npx cap add android                              # erzeugt android/ aus der Vorlage (braucht kein Android-SDK); beim nächsten Mal: npx cap sync android
npx capacitor-assets generate --android          # setzt die Zeichen ein
node ../../android/nachbessern.mjs --ordner . --nummer 1
npx cap open android                             # Android Studio; dort bauen (braucht Java 21 und SDK-Plattform 36)
```

```bash
node paket/zusammenstellen.mjs --ausgabe rezeptbuch --ziel windows --vendor ../Workflow-PDF/vendor
cd paket/aus/rezeptbuch-windows
npm ci
npx electron .                                   # nur ansehen, ohne Installer
npx electron-builder --win nsis --x64 --config builder.json --publish never     # Installer nach ausgabe/, nur unter Windows
```

### Signatur-Schlüssel für Android

- **Die Debug-APK** aus dem Workflow trägt nur den Debug-Schlüssel des Baurechners, und der ist bei jedem Lauf ein anderer.
  Folge: eine neue Debug-APK lässt sich **nicht über** eine alte installieren; man muss die alte entfernen, und dabei gehen
  die Daten der App verloren. Vor jedem Wechsel in der App eine Sicherung speichern.
- **Der Release-Schlüssel** (für alles, was länger auf einem Gerät bleiben oder in den Store soll) wird einmal erzeugt, am
  eigenen Rechner:
  `keytool -genkeypair -v -keystore kueche-release.jks -alias kueche -keyalg RSA -keysize 4096 -validity 10000`
- **Wo er liegt:** außerhalb jedes Repos – im Passwort-Tresor und auf einem zweiten Datenträger, zusammen mit beiden
  Passwörtern. Geht er verloren, lässt sich die App nicht mehr aktualisieren.
- **Er kommt nie ins Repo**, nie in einen Chat, nie in eine Sitzung. Soll später ein Workflow signieren, liegt er nur als
  GitHub-Geheimnis vor (base64 der Datei, Passwörter, Alias) – das ist ein eigener, späterer Schritt und **nicht** Teil der
  Vorlage hier.
- Frage: nutzt die Familienakte schon einen Schlüssel? Für jede App einen eigenen zu nehmen ist üblich.
- **Windows:** ein Signatur-Zertifikat kostet Geld und ist für das Ausprobieren nicht nötig.

## 5 · Was die Web-App im Paket anders braucht

„Vorbereitet“ heißt: Paket und Hülle können es. „Fehlt“ nennt die Stelle im App-Code. Zeilen nach dem Stand Rezeptbuch
`07485eb`, Mixarium `7ec4e2d`.

| Punkt | Vorbereitet | Fehlt noch im App-Code |
|---|---|---|
| **Ausgabe wählen** | Weiche in der Kopie (Abschnitt 2); `www/paket.json` nennt Ausgabe und Ziel | Die App sollte die Ausgabe selbst lesen (z. B. aus `../paket.json`, sonst wie bisher). Rezeptbuch `neu/app.mjs` Z. 765, Mixarium `neu/app.mjs` Z. 584. Dann entfällt die Weiche. Für `muttis` bleiben Seitentitel und Logo die des Rezeptbuchs (`neu/index.html`, `neu/app.mjs` Z. 86 und 91) |
| **Beispiele im Paket** | liegen drin; „Beispielbuch laden“ bzw. „Beispiele laden“ holt sie ohne Netz (gemessen) | Niemand liest `lieferung`: auch im Paket lädt die App erst auf Tippen. Soll der erste Start die Beispiele von selbst zeigen, braucht `start()` das. Rezeptbuch lädt nur `beispiele[0]` (Z. 532); `foodzine-beispiele` (15 MB) liegt im Paket und wird noch von nichts gelesen. Die Meldung „Besteht eine Verbindung?“ passt im Paket nicht |
| **Service Worker** | bleibt draußen: im Paket liegt alles schon im Gerät, und ein Vorrat daneben würde nach einer Aktualisierung alte Dateien ausliefern. Mit `--mit-sw` käme er mit | Die Anmeldung überspringen, wenn die App im Paket läuft. Heute: Rezeptbuch versucht sie (Z. 784) und bekommt ein 404, das die App schluckt (gemessen); Mixarium versucht sie nur unter `https:` (Z. 1019), also in der APK |
| **Web-Import ohne CORS** | Android: natives HTTP gehört zu Capacitor (kein Zusatzpaket); in `capacitor.config.json` ist das **globale** Umbiegen von `fetch` ausgeschaltet, damit KI-Aufrufe laufen wie im Browser. Der Kern hat die Naht: `holeSeite(adresse, { hol })` (`kern/import/web.mjs` Z. 29) | Beim Aufruf `hol` mitgeben, wenn `globalThis.Capacitor?.isNativePlatform()`: Rezeptbuch Z. 339, Mixarium Z. 526. `Capacitor.Plugins.CapacitorHttp` ist in der APK ohne Bündler da (im Quelltext von Capacitor 8.6.2 nachgelesen). **Windows:** dafür fehlt die Brücke (Vorlade-Skript und Abruf im Hauptprozess); bis dahin bleibt der Weg „Seite öffnen, kopieren, einfügen“ |
| **Mikrofon** | Android: fragt eine Seite nach dem Mikrofon, reicht Capacitor die Frage an Android weiter (Quelltext); die Erlaubnis muss dafür im Manifest stehen, und das bringt erst ein Sprach-Baustein mit. Windows: die Hülle erlaubt der eigenen Seite das Mikrofon | Die Android-WebView hat keine eingebaute Spracherkennung; `diktatMoeglich()` ist dort voraussichtlich falsch, die Knöpfe fehlen dann. Nötig: ProSpeech aus der Familienakte als Plugin in `paket/android/package.json` und ein Zweig in `kern/oberflaeche/diktat.mjs` (`Capacitor.Plugins.ProSpeech`). **Windows:** in Electron ist `diktatMoeglich()` wahr (gemessen), der Knopf erscheint also; ob die Erkennung dort etwas liefert, ist nicht gemessen – Electron bringt nach bisherigem Stand keinen Erkennungsdienst mit. Dort ausblenden, bis es einen Weg gibt |
| **Sicherung als Datei** | Windows: „Sicherung speichern“ öffnet den Speichern-Dialog (nicht gemessen) | **Android: der heutige Weg (`<a download>` mit `blob:`) geht in der APK nicht** – Capacitor behandelt keine Downloads (Quelltext durchsucht). Rezeptbuch `herunterladen()` Z. 523, Mixarium Z. 667. Nötig: `@capacitor/filesystem` 8.1.5 in `paket/android/package.json` und in der App `Capacitor.Plugins.Filesystem.writeFile({ directory: 'DOCUMENTS', … })`. Laut Plugin: bis Android 10 braucht das die Schreib-Erlaubnis im Manifest; ab Android 11 sieht die App dort nur Dateien, die sie selbst angelegt hat – nach einer Neuinstallation also keine mehr. Einlesen geht über die Dateiwahl. Die Erinnerung nach Änderungen (Tresor-Garantie) fehlt in beiden Apps |
| **pdf.js und Texterkennung** | im Paket, unter derselben Adresse wie im Netz; PDF-Scan und „Datei prüfen“ laufen ohne Netz (gemessen im Browser und in Electron) | nichts |
| **Foto aufnehmen** | Capacitor öffnet bei `<input capture>` die Kamera (im Quelltext nachgelesen) | nichts bekannt; am Gerät nicht gemessen |
| **Zurück-Taste** | `@capacitor/app` ist dabei: ein Schritt zurück in der App | An der Startansicht tut die Taste nichts. Wer dort die App verlassen will, braucht einen Lauscher (`Capacitor.Plugins.App`) |
| **Sinn-Suche** | die zwei sbkim-Bausteine liegen im Paket | Beim Einschalten lädt Modul 03 `transformers.js` von jsDelivr und das Modell von HuggingFace (`sbkim/03_embedding.js` Z. 46 und 58) – im Paket also nur mit Netz. „Modell ins Paket“ (120 MB unter `www/models/…`) ist ein eigener Schritt; die Adresse der Bibliothek steht fest in der Kanon-Datei |
| **Zeichen in der App** | – | Das Logo im Kopf ist fest das der Web-App (`../icons/icon-book-192.png`, `../icons/mixarium-192.png`); `zeichen.app` in `ausgabe.json` ist `null` und wird nicht gelesen |
| **Wege aus der Web-Welt** | – | Mixarium: „Bisherige App öffnen“ (Z. 419, `../index.html`) führt im Paket auf die Startseite des Pakets, also im Kreis – im Paket ausblenden. Die Übernahme aus der alten App findet im Paket nichts (anderer Speicher); der Weg ist: Sicherung in der Web-App speichern, in der App einlesen |
| **Lizenzhinweise** | `THIRD_PARTY.md` und `LICENSE` liegen im Paket; die Lizenztexte der Texterkennung auch | `THIRD_PARTY.md` nennt pdf.js und Tesseract noch nicht als mitgeliefert; in der App gibt es keine Seite dafür |

## 6 · Probe

```bash
node paket/probe.mjs --vendor ../Workflow-PDF/vendor            # beide Repos nebeneinander; Schlusszeile „N grün · M ROT“
node paket/probe.mjs --nur mixarium-store                       # nur eine Ausgabe
node paket/probe.mjs --electron <ordner von node_modules/electron>   # dazu die Windows-Hülle in Electron (nur unter Linux)
```

Sie stellt jede der vier Ausgaben für beide Ziele in einen Wegwerf-Ordner zusammen, liefert den Web-Ordner aus wie die Hülle
(Android wie Capacitor, Windows mit `paket/windows/pfad.cjs`) und prüft im echten Browser: Start ohne Netz nach außen (jede
fremde Anfrage wird gesperrt und gezählt), die richtige Ausgabe, Beispiele aus dem Paket, pdf.js und Texterkennung aus dem
Paket, kein Alkohol-Paket außerhalb von `mixarium-voll`. Dazu elf Gegenproben, in denen das Werkzeug abbrechen muss.

**Zuletzt gemessen (23.11.2026):**

| Lauf | Stand | Ergebnis |
|---|---|---|
| feste Stände, mit Electron 45.4.1 unter Linux | Rezeptbuch `07485eb` (Kern 0.19.0, PWA 0.11.0), Mixarium `7ec4e2d` (PWA 10.0.0-vor21) | **248 grün · 0 ROT** |
| die Arbeitskopien, wie sie in dem Augenblick waren (nur gelesen), erster Lauf | Rezeptbuch `07485eb` mit 11 ungespeicherten Änderungen einer anderen Sitzung, Mixarium `7ec4e2d` | 248 grün · 0 ROT |
| dieselben Arbeitskopien, eine halbe Stunde später | Rezeptbuch `07485eb` mit 15 ungespeicherten Änderungen | **136 grün · 4 ROT** – viermal dieselbe Zeile für `rezeptbuch` und `muttis`: „kern/ passt nicht zu KERN.json (Fassung 0.20.0): kern/import/scan.mjs, kern/ki/reinigung.mjs, kern/pruefung/datei.mjs“. Dort wurde gerade am Kern gearbeitet, `KERN.json` war noch nicht nachgezogen; das Werkzeug packt einen solchen Stand mit Absicht nicht |
| `paket/` wie später im Repo, ohne Angaben aufgerufen, ohne Electron | Kopien derselben Stände | 199 grün · 0 ROT |
| in der Nacht 23./24.11., an den Ständen auf `main`, ohne Electron | Rezeptbuch `43d204c` (Kern 0.22.1, PWA 0.14.1), Mixarium `101a6ec` (PWA 10.0.0-vor23) | zuerst **121 grün · 8 ROT**: der Browser-Lauf der Probe tippte noch auf Stellen der alten Oberfläche (das Beispielbuch steht jetzt hinter dem Plus; die Apps beginnen mit Startrezepten). Probe nachgezogen, danach **203 grün · 0 ROT** |

Der erste volle Lauf endete mit **218 grün · 4 ROT**. Alle vier lagen in der Probe, nicht im Paket: sie fragte in Electron nach
angemeldeten Service Workern, und unter der eigenen Adresse der Hülle sind die gar nicht erlaubt (die Frage wirft). Die Probe
zählt das jetzt als „keiner angemeldet“ und schreibt den Grund dazu.

Von Hand nachgestellt (das Werkzeug in einer Kopie verändert, die Probe darauf gefahren; jeder dieser Läufe meldet zusätzlich,
dass die veränderte Kopie nicht mehr byte-gleich mit der anderen ist):

| Sabotage | Die Probe meldet |
|---|---|
| pdf.js und Texterkennung werden nicht ins Paket gelegt | 6 ROT je Ziel, darunter „pdf.js kommt aus dem Paket“, „die Texterkennung kommt aus dem Paket“, „der App fehlt keine Datei“; dazu „die Vendor-Adresse des Kerns trifft“ |
| die Startseite lädt ein Skript von einer fremden Adresse | 3 ROT je Ziel, darunter „keine Anfrage ging nach außen“ mit der Adresse |
| das Alkohol-Paket wird ins Store-Paket gelegt, die Riegel des Werkzeugs sind aus | 3 ROT je Ziel: Beispiele ≠ Ausgabe, „kein Paket mit Alkohol im Paket“ (mit den acht Namen), „auf direkte Nachfrage nicht da“ |
| die Weiche für `muttis` wird nicht gestellt | das Werkzeug bricht selbst ab („Verweise der App gehen im Paket ins Leere“) |

Die dritte Zeile hat einen blinden Punkt der Probe gezeigt: die Nachfrage im Browser richtete sich zuerst nach dem Katalog
**im Paket** und blieb grün. Sie fragt jetzt nach jedem Alkohol-Paket, das der Katalog im Repo kennt.

**Trockenläufe ohne Bau** (in einem Wegwerf-Ordner, nicht im Repo):

- Android: `npm ci` (154 Pakete) · `npx cap add android` legt das Projekt aus der Vorlage an (Kennung, Name, `@capacitor/app`
  gefunden, 48 MB Web-Ordner kopiert) · `npx capacitor-assets generate --android` (74 Bilder aus dem Platzhalter) ·
  `nachbessern.mjs` (Fassung, Nummer, Sicherung). Kein Gradle.
- Windows: `npm ci --ignore-scripts` (283 Pakete) · alle Schlüssel von `builder.json` stehen im Schema von electron-builder
  26.18.0 · `haupt.cjs` lief in Electron 45.4.1 unter Linux mit allen vier Ausgaben: eigene Adresse `app://paket/`, Beispiele,
  pdf.js und Texterkennung aus dem Paket, eigener Datenordner je Ausgabe, kein zweites Fenster.

## 7 · Nicht gemessen

- **Kein Bau.** Keine APK, kein Gradle-Lauf, kein Installer; `electron-builder` ist nie gelaufen (nur die Schlüssel von
  `builder.json` sind gegen sein Schema gehalten). Die Größe der fertigen APK und des Installers ist unbekannt.
- **Kein Gerät, kein Windows.** Kamera, Dateiwahl, Zurück-Taste, Tastatur, Ränder am Bildschirm (Android zeichnet ab
  Fassung 15 bis an den Rand), Startbild, das zugeschnittene Zeichen, Speichern-Dialog, Mikrofon. `haupt.cjs` lief nur unter
  Linux in Electron 45.4.1, nie unter Windows.
- **Die Workflow-Vorlage ist nie gelaufen.** Offen: ob Workflow-PDF öffentlich ist, ob die SDK-Plattform 36 auf dem
  Baurechner liegt, ob das Abschalten der Zeilenenden-Umwandlung unter Windows genügt (sonst stimmen dort die Prüfsummen nicht).
- **KI-Aufrufe aus der Hülle.** Die Herkunft ist dort `https://localhost` (Android) bzw. `app://paket` (Windows) statt
  `github.io`; ob Anthropic, OpenAI und Mistral das annehmen, ist nicht geprüft.
- **Sinn-Suche, Teilen, Wachhalten des Bildschirms** in der Hülle.
- **ProSpeech.** Die Familienakte lag in dieser Sitzung nicht vor; in welcher Form der Sprach-Baustein dort steckt (eigenes
  Plugin-Paket oder Code im Android-Projekt) und ob er zu Capacitor 8 passt, ist nicht geprüft.
- **Aktualisierung** von einer Fassung des Pakets auf die nächste (bleiben die Daten, greift die neue App sofort).
- **Tauri und MSIX** sind nicht ausprobiert; die Gründe in Abschnitt 1 stammen aus der Lage der Werkzeuge, nicht aus einem Versuch.
- Die Doku-Seiten von Capacitor, Electron und Tauri waren aus der Sitzung nicht erreichbar. Die Angaben oben stammen aus der
  npm-Registry und aus den Paketen selbst (Quelltext, Typ-Beschreibungen, Schema, Vorlage).
- Die Arbeitskopien beider Repos waren während der Arbeit in Bewegung; gemessen ist an festen Ständen (siehe Abschnitt 6).
