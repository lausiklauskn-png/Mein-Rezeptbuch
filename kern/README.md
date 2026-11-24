# Küchen-Kern

Gemeinsamer Code für Mein Rezeptbuch, Muttis Rezeptbuch (Ausgabe) und Mein Mixarium (übernimmt den Kern byte-gleich mit Pin).
Stand 2026-11-23: **Ausgaben-Schalter** und die **Logik ohne Oberfläche** (Rezeptmodell, Kategorien, Suche, Sicherung, Übernahme). Die Oberfläche der PWA folgt; APK und Windows erst nach Klaus' Go.

## Ausgaben-Schalter (`kern/ausgabe/ausgabe.mjs`)

Jede Ausgabe hat eine Datei `ausgaben/<name>/ausgabe.json`. Sie legt fest:

| Feld | Bedeutung |
|---|---|
| `name`, `titel`, `kurz` | Kennung der Ausgabe, angezeigter Name, Kurzname |
| `store` | `true` = geht in einen Store (Google Play). Dann ist ein Paket mit Alkohol verboten, auch als Angebot. |
| `alkoholErlaubt` | `false` = kein Paket mit Alkohol, weder im Paket noch angeboten |
| `beispiele` | Liste der Paket-Kennungen aus dem Katalog. **Was hier nicht steht, kommt weder ins Paket noch wird es angeboten.** |
| `lieferung` | je Ziel `im-paket` (liegt in APK/Windows, erster Start ohne Netz) oder `auf-tippen` (Web: erst auf Knopfdruck laden) |
| `ziele` | `web`, `android`, `windows` |
| `speicher` | `endung` der alten localStorage-Schlüssel (`9m` Mein Rezeptbuch, `9` Muttis), `indexedDb`, `schluesselAlt` für die Übernahme. Nur die eigenen Schlüssel lesen, nichts löschen. |
| `farbe`, `zeichen`, `begruessung` | Palette (Farbscheibe), App-Zeichen Web/App, Begrüßung je Sprache |
| `netzmodule` | `eingebaut-nicht-geladen` (SBKIM/Mycel im Paket, unsichtbar, kein Netzverkehr) oder `aus` |

Der **Katalog** (`beispiele/KATALOG.json`) beschreibt jedes Paket mit `id`, `datei`, `art` (`rezepte`, `foodzine`),
`alkohol`, `anzahl`, `bytes`, `sha256` und `fuer` (für welche Ausgaben freigegeben). Die Prüfung rechnet die Prüfsumme nach und
sucht in Getränke-Kategorien selbst nach Alkohol (ein Paket, das sich falsch als alkoholfrei ausgibt, fällt auf).

```bash
node kern/ausgabe/ausgabe.mjs ausgaben/rezeptbuch/ausgabe.json   # zeigt je Ziel: im Paket / auf Tippen, prüft alles
node --test test/ausgabe.test.js                                  # Probe mit Gegenproben
```

### Beispiel Mixarium (zwei Ausgaben aus demselben Code)

`ausgaben/mixarium-store/ausgabe.json`: `"store": true, "alkoholErlaubt": false, "beispiele": ["<alkoholfreie Pakete>"]`
`ausgaben/mixarium-voll/ausgabe.json`: `"store": false, "alkoholErlaubt": true, "beispiele": [..., "getraenke-mit-alkohol-fuer-mixarium"]`
Das Alkohol-Paket aus `beispiele/` ist im Katalog nur für `mixarium-voll` freigegeben.

## Logik (ohne Oberfläche, läuft im Browser und in Node)

| Datei | Aufgabe |
|---|---|
| `modell/rezept.mjs` | `normalisiere()` bringt jedes Rezept einmal in Form: `blank` nur ohne Namen, Kategorie getrimmt, `fld_…` zieht in `folder`, feste `uid`. `istInhalt()` ist die eine Frage, die Suche, „Alle“, Kategorien und Zähler stellen. |
| `modell/kategorien.mjs` | `alleKategorien()`: feste, eigene, unbekannte und „Ohne Kategorie“, jede Kennung einmal. Anlegen, umbenennen, löschen mit Ziel, umsortieren. Eine andere Ausgabe bringt ihre festen Kategorien mit: `kategorienMit(FEST, { familie })` (Vorgabe: die Liste des Rezeptbuchs); mitgebrachte Kennungen tragen den Namen aus `familie`, nie die rohe Kennung. Sticker-Bild je Kategorie: `katBild()` (gewähltes Rezeptbild, sonst das erste mit Bild), `bildWaehlen()`. |
| `modell/kategorien-fest.mjs` | die 18 festen Kategorien in 8 Sprachen, aus der alten App übernommen |
| `modell/ordner.mjs` | Ordner: eigene Sammlungen neben den Kategorien (anlegen, umbenennen, löschen, ordnen, `legeIn`, `uebersicht` mit Anzahl und Bild). Ein Ordner frisst die Kategorie nicht; wird er gelöscht, bleiben die Rezepte; ein Ordner, den es nicht gibt, nimmt nichts auf |
| `modell/suche.mjs` | Wortsuche, auch über den Kategorienamen |
| `sicherung/sicherung.mjs` | liest Fassung 9/10 der alten Apps, schreibt Fassung 11 mit Block `kategorien`; Zusammenführen an `uid` |
| `modell/mengen.mjs` | Mengen für andere Portionen umrechnen (Brüche bis Achtel, Bereiche; „10,5“ bleibt 10,5, „1 ½“ ist 1,5) |
| `modell/kochen.mjs` | Kochansicht: Zutaten eines Schritts und Zeitangabe, aus dem Schritttext, ohne KI |
| `oberflaeche/geraete.mjs` | gezeichnete Gerätschaften (de/en), erkannt aus dem Text, erweiterbar je Ausgabe (`erweitern()`, eigenes Raster mit `vb`). „Shaker“/„schütteln“ ist kein Küchenmixer; Bar-Geräte bringt die Ausgabe mit. |
| `ki/bild.mjs` | KI-Bild (OpenAI) und Gratis-Foto; Auftrag je Ausgabe: `art: 'essen'` (Vorgabe) oder `'getraenk'`, oder ganz eigener `auftrag`. Kosten-Hinweis de/en (`KOSTEN`). **Prüfung des Bildauftrags** (`pruefeBildAuftrag`: Name, erste Zutaten, erste Schritte; liefert die Stellen und ein Rezept ohne sie) und **Sammel-Weg** (`sammelBilder`: ein Bild je Rezept ohne Bild, überspringt Rezepte mit Befehl an eine KI, abbrechbar, hört bei abgelehntem Schlüssel oder Limit auf; `sammelKosten` nennt Anzahl und Betrag vorab). |
| `modell/einkauf.mjs`, `modell/warengruppen.mjs` | Einkaufsliste: zusammenzählen (Einzahl/Mehrzahl, Einheiten), Warengruppen aus der alten App, Reihenfolge je Laden. Eigene Warengruppen und Einheiten je Ausgabe: `einkaufMit({ gruppen, einheiten })`. |
| `modell/plan.mjs` | Wochenplan: Woche Mo–So mit Kalenderwoche, planen, altes Menü übernehmen |
| `import/text.mjs` | Rezept aus eingefügtem Text ohne KI (Überschriften, Mengen, Einheiten auch oz/fl oz/Barlöffel/Dash/Schuss/cup, Portionen, Zeit) |
| `oberflaeche/hinweis.mjs` | Hinweis-Blasen (Tooltips) aus `title`, wie das Floating-Tooltip der alten Apps; ausschaltbar; nimmt dem Element das `title`, damit nicht zwei Blasen erscheinen |
| `oberflaeche/warten.mjs` | Ladebalken für jede Wartezeit (KI, Bild, Sprachmodell, Pakete, Dateien): oben ein Balken, unten eine Zeile mit Text und Sekundenzähler; `modellFortschritt` liest den Download-Stand des Sprachmodells, `bytesMitAnteil` den einer Datei |
| `oberflaeche/app-pflege.mjs` | Installieren und Aktualisieren: `installation()` merkt sich das Angebot des Browsers und meldet, ob der Knopf stehen soll (weg, sobald die Seite als App läuft oder installiert wurde); `aktualisieren()` holt den neuen Service Worker, leert nur den Speicher dieser App (`cachePrefix`) und meldet „offline“, ohne etwas zu löschen |
| `oberflaeche/diktat.mjs` | Spracheingabe für Textfelder (Web Speech im Browser), seit 0.20 mit den Fähigkeiten aus Modul 21 (`sbkim/21_spracheingabe.js`: Sprachliste, Fehlertexte, Schrift-Kontrolle, Rechts-nach-links) und neu: schreibt an der Schreibmarke, Satzzeichen-Befehle („Komma“, „Punkt“, „neue Zeile“), Großschreibung nach Satzende, Dauer-Diktat in mehrzeiligen Feldern. `diktat(feld, sprache, stand, wahl)` wie bisher, dazu `diktiere(feld, wahl)`; die Textlogik (`befehleAnwenden`, `setzeEin`, `sprachCode`) ist ohne Browser prüfbar. Die EU-Engine von Modul 21 (Google Cloud) ist nicht übernommen. |
| `oberflaeche/sprache.mjs` | Sprache der Oberfläche: acht Sprachen, erste Wahl folgt dem Gerät. Deutsch ist die Quelle, Englisch steht im Code daneben (`text(sprache, de, en)`), die übrigen sechs kommen aus Tabellen mit dem deutschen Text als Schlüssel (`tabelle`, `ladeTabelle`); ohne Eintrag Englisch, nie ein Schlüsselname |
| `sprachen/` | Sprachtabellen für es, fr, it, pt, ru, zh (`<code>.mjs`, `export default { 'Deutscher Text': 'Übersetzung' }`); die App lädt sie mit `ladeTabelle`. `schluessel.mjs` (nur Node) liest die Textpaare aus dem Kern: ohne Angabe die Liste Deutsch → Englisch, `--pruefe` nennt je Sprache, was fehlt oder überzählig ist, und jede Stelle, die es nicht lesen konnte. Kategorien und Warengruppen tragen ihre Sprachen selbst und stehen nicht darin |
| `ki/schluessel.mjs` | KI-Schlüssel für Anthropic, OpenAI und Mistral: nur im Gerät (Kern-Speicher), nie in einer Sicherung. Ein Schlüssel der bisherigen App gilt weiter (nur gelesen); gelöscht bleibt gelöscht. `pruefeSchluessel` fragt den Anbieter auf Knopfdruck |
| `ki/claude.mjs` | ein Aufruf an Claude (Anthropic Messages) mit dem eigenen Schlüssel: drei Stufen (schnell = Haiku 5.5, standard = Sonnet 5.5, profi = Opus 5.5), Fehler im Klartext, `jsonAusAntwort` (JSON-Sanitizer der alten App) |
| `ki/ocr.mjs` | Texterkennung mit Mistral OCR (EU), aus der alten App (`SbkimOcr`, Anbieter mistral) |
| `ki/reinigung.mjs` | Reinigung vor der KI: ein Foto geht nie als Original hinaus (`bildFuersNetz`, 1200 px, ohne Aufnahmedaten), ein PDF als Seitenbilder mit 300 dpi, versteckter Text zugedeckt (`pdfFuersNetz`, lädt `assets/reinigung.js` und pdf.js erst dann); einmal anhalten (`reiniger`), Vermerk am Rezept (`kiEntfernt`) Seit 0.20: `pdfFuersNetz` liefert zu jeder Seite mit Fund ein Bild, auf dem die Stellen rot hinterlegt zu lesen sind (`marken`), findet auch sichtbare Befehle an eine KI im Text und nimmt `zudecken: false` („Drin lassen“); `fundeZumEntscheiden`, `fundName` für die Oberfläche (markieren, dann „Entfernen“ oder „Drin lassen“). |
| `import/scan.mjs` | Foto-Scan: `vorbereiten(datei)` zeigt, was hinausgeht, `erkennen()` liest mit Claude oder mit Mistral OCR + Claude, `rezeptAusScan()`; die Kategorien nennt die Ausgabe **Vom Teller** (`erkennen(v, { vomTeller: true })`): das Foto zeigt ein fertiges Gericht, Claude schlägt ein Rezept in der Sprache der Oberfläche vor; nie über die Texterkennung. |
| `import/web.mjs` | Rezept von einer Webseite, ohne öffentliche Weiterleiter: `holeSeite` ruft direkt ab (im Browser nur, wo die Seite es erlaubt; sonst `gesperrt`), `rezeptAusHtml` liest die Rezeptdaten der Seite (schema.org/JSON-LD) ohne KI, `seitenText` gibt den sichtbaren Text ohne versteckte Teile, `ausEingefuegtem` nimmt kopierten Seitentext oder Quelltext, `mitKi` lässt Claude den Text einsortieren |
| `pruefung/datei.mjs` | „Datei prüfen“ auf Knopfdruck mit dem Prüfkern aus Workflow PDF (`assets/pruefer-*.js`, im Gerät, markiert, entfernt nichts) und `kiAnweisungen(text)` für Bildaufträge; die Stellen tragen ihren Text (`text`), damit die App sie markiert zeigen kann. Das Ergebnis (`pruefHtml`) ist eine Zeile, Einzelheiten eingeklappt. |
| `ki/helfer.mjs` | vier KI-Helfer aus der alten App, je ein Aufruf an Claude: `naehrwerte` (je Portion, `r.nutrition`), `rechtschreibung` (Vorschläge alt → neu, `rechtschreibungAnwenden` mit Auswahl), `uebersetze` (in `r.translations[ziel]`, nur bei passender Anzahl; `kostenSchaetzung`), `wochenplanVorschlag`. In jedem Auftrag steht, dass Rezepttext Inhalt ist und keine Anweisung; `wasGehtHinaus(art, …)` sagt in einer Zeile, was an wen geht `wasKurz` nennt nur das Was für die kurze Zeile im Knopf. |
| `ausgabe/druck.mjs` | Drucken: `druckRezept` und `druckListe` liefern ein eigenständiges HTML-Dokument (A4, alles entschärft, Bild nur als data-Adresse, eigene Inhalts-Richtlinie), `drucke` druckt es aus einem unsichtbaren Rahmen ohne Skripte, ohne neues Fenster |
| `ausgabe/buch.mjs` | Das ganze Buch als Dokument: `buchInhalt` (Gliederung nach Kategorie und Name, Auswahl nach uids, Kategorie oder Ordner), `buchPdf` (ein A4-Dokument für `drucke`: Deckblatt, Inhaltsverzeichnis, je Kategorie ein Zwischentitel, je Rezept eine neue Seite, auf den Bausteinen des Rezeptblatts) und `buchBlaettern` (eine HTML-Datei zum Weitergeben: blättern per Knopf, Pfeiltasten und Wischen, am breiten Schirm zwei Seiten, hell/dunkel, druckbar; ihr einziges Skript ist fester Text und über seine Prüfsumme in der Inhalts-Richtlinie erlaubt); `buchGroesse` sagt die Größe vor dem Speichern |
| `teilen/qr.mjs` | Teilen per QR-Code: eigener QR-Erzeuger ohne Netz (Byte-Modus, Versionen 1–40, alle Stufen und Masken; Rundlauf-Probe mit eigenem Leser), `teilLink`/`ausTeilLink` im Link-Format der alten App (`#share=…`, ohne Bild), `rezeptAlsText` |
| `modell/einheiten.mjs` | Einheiten metrisch/US für die Anzeige: `zuUs`, `zuMetrisch`, `rezeptIn(rezept, system)`, Temperaturen (°C ↔ °F) und Längen (cm ↔ Zoll) in Schritttexten; das Rezept selbst bleibt, wie es notiert ist |
| `speicher/alt-tresor.mjs` | Tresor-Stände der alten App lesen (`leseAltenTresor`: eigene IndexedDB der alten App, nur lesen, eine fehlende Datenbank wird nicht angelegt) und in den neuen Tresor legen (`alteStaendeInTresor`: mit Name und alter Zeit, nie doppelt, ein alter Stand verdrängt keinen neuen) |
| `suche/richter.mjs` | KI-Richter der Suche (Vorbild `sbkim/04_match.js`): `richte(schluessel, frage, kandidaten)` lässt Claude urteilen, welche Treffer der Sinn-Suche passen. Vorher prüft die Prüfliste Frage und jeden Kandidaten; ein Kandidat mit einer Anweisung an eine KI geht nicht hinaus; ohne Prüfliste läuft der Richter nicht. `kandidat(r)` = Name, Kategorie, Geschmack, Zutaten (keine Schritte) |
| `speicher/speicher.mjs` | Zustand im Gerät (IndexedDB), eine Datenbank je Ausgabe |
| `oberflaeche/` | Symbole (Phosphor Duotone, nur die genutzten), Farbpaletten mit `farbName`/`tonName` (de/en), Schrift-Regler (`schriftRegler(wert, sprache)`), Bild aus Datei verkleinern |
| `speicher/uebernahme.mjs` | liest den alten localStorage nur mit der Endung der eigenen Ausgabe, löscht nichts |

Probe: `node --test test/kern.test.js` (29 Fälle). Wächter für den Sushi-Fehler: **alles, was die Suche findet, steht in genau einer Gruppe von „Alle“**.

## Pin (`KERN.json`)

`node kern/kern-stand.mjs` schreibt `KERN.json` mit Fassung und SHA-256 jeder Datei unter `kern/`. Das Mixarium übernimmt `kern/`
byte-gleich und prüft gegen diese Liste; `node --test` hier besteht darauf, dass `KERN.json` zum Stand passt.

## Die neue PWA (`neu/`)

Erste sichtbare Fassung der Ausgabe „rezeptbuch“, ohne Bauschritt (ES-Module direkt). Läuft neben der alten App unter `/neu/`.
Probe im echten Browser: `node tests/smoke_neu.mjs` (80 Prüfpunkte: leerer Start, Beispielbuch, Sushi-Kategorie, Suche, Portionen, Anlegen, Neuladen, Sicherung hin und zurück, Beispiele entfernen, Übernahme aus der alten App, Leiste, Farbe, Kochansicht, Monitor-Aufteilung, Einkaufsliste, Wochenplan, Kategorien verwalten, Bilder-Ordner, Bildausschnitt, Text-Import, Neuladen ohne Netz).
