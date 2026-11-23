# Übergabe der gemeinsamen Sitzung (Rezeptbuch + Mixarium)

Stand **23.11.2026, 18:05 Uhr** (Europe/Berlin). Die gemeinsame Sitzung (Tag) übergibt an die Nacht-Sitzung. Diese Datei ist
die Rezeptbuch-Seite und gilt für beide Apps; die Mixarium-Seite steht in `Mein-Mixarium/docs/UEBERGABE_GEMEINSAME_SITZUNG.md`.
Der Auftrag für die Nacht steht in `docs/NACHTAUFTRAG.md`.

## Nacht 23./24.11. (Nacht-Sitzung, laufend nachgeführt)

Auftrag: `docs/NACHTAUFTRAG.md`. Hier steht, was in der Nacht auf `main` gekommen ist; der Rest der Datei ist der Stand von 18:05.

| Fassung | Was | Proben |
|---|---|---|
| Kern 0.18.0 · PWA 0.10.0 | **KI-Schlüssel** für Anthropic, OpenAI, Mistral (Werkstatt → KI; speichern, prüfen, löschen; nur im Kern-Speicher des Geräts, ein Schlüssel der alten App gilt weiter und wird nur gelesen). **Foto-Scan** im Blatt hinter „+“: Foto aufnehmen oder Dateien wählen (auch PDF, mehrere = Stapel), Claude liest oder Mistral OCR + Claude, drei Stufen (schnell = Haiku 5.5, Standard = Sonnet 5.5, Profi = Opus 5.5). **Reinigung vor der KI**: Foto neu gezeichnet (1200 px, ohne Aufnahmedaten), PDF als Seitenbilder mit 300 dpi, versteckter Text zugedeckt, einmal anhalten, Vermerk am Rezept. **„Datei prüfen“** mit dem Prüfkern aus Workflow PDF. Vor dem Senden steht, was hinausgeht. | `test/kern-ki.test.js` (16) · `tests/smoke_neu_scan.mjs` (74) · `tests/gegenprobe_neu_scan.py` (9 Fälle) |

| Kern 0.19.0 · PWA 0.11.0 | **Web-Import ohne öffentliche Weiterleiter** (Blatt hinter „+“ → Web): die Seite wird direkt abgerufen, ihre Rezeptdaten (schema.org) ohne KI gelesen, das Bild als eigene Kopie geholt. Lässt der Browser das Lesen nicht zu: Hinweis, „Seite öffnen“, Einfügen (Seitentext oder Quelltext). Ohne Rezeptdaten: „Ohne KI aufteilen“ oder „Mit Claude lesen“ (nur der sichtbare Text; versteckte Teile der Seite gehen nicht mit; steht darin eine Anweisung an eine KI, hält die App einmal an). Die App meldet sich als Ziel für „Teilen“ an. | `test/kern-web.test.js` (8) · `tests/smoke_neu_web.mjs` (32) · `tests/gegenprobe_neu_web.py` (5 Fälle) |
| Kern 0.20.0 · PWA 0.12.0 | **Gestaltung nach Klaus' Urteil vom Abend** (er war wach und hat Bilder gesehen): acht **Startrezepte** beim allerersten Start (`neu/start-rezepte.json`, als Beispiele markiert, entfernbar; `…/neu/?leer` beginnt leer) · Karten nur Bild und Name, „Alle“ als ein Raster · Werkzeuge am Rezept als kleine runde Symbole · der Bereich heißt **„Einstellungen“** (Zahnrad), sechs einklappbare Themen mit Farbfeldern in Wasserfarben · Blatt hinter „+“: sechs Kacheln, im Weg bleibt eine Symbolreihe; **kein Erklärtext**, Auskünfte stehen im Knopf oder als Hinweis (Tooltip) · Web-Import in einer Zeile · Meldungen einzeilig („+42 Rezepte“) · **Foto-Scan**: die Auskunft „Anthropic · 53 KB“ steht im Knopf; versteckter Text und Befehle an eine KI in einem PDF werden **rot hinterlegt gezeigt**, Antwort „Entfernen“ oder „Drin lassen“; im Stapel geht Verstecktes nie mit (ohne Rückfrage, mit Vermerk); auf dem Mistral-Weg wird der gelesene Text vor Claude geprüft · **Ordner** (Kern `modell/ordner.mjs`: anlegen, umbenennen, Zeichen, ordnen, löschen; ein Ordner nimmt keine Kategorie weg; Ordner in der Fotoleiste, am Rezept, im Formular) · **Mikrofon** mit den Fähigkeiten aus Modul 21 (schreibt an der Schreibmarke, „Komma“, „Punkt“, „neue Zeile“). | `tests/smoke_neu.mjs` **155** · `smoke_neu_scan.mjs` **82** · `smoke_neu_web.mjs` **35** · `smoke_neu_ordner.mjs` **35** · `test/kern-ordner.test.js`, `kern-diktat.test.js` · Gegenproben `gegenprobe_neu_scan.py` (16 Fälle), `_web.py` (5), `_ordner.py` (5) |
| Kern 0.20.1 · PWA 0.12.1–0.12.2 | Kategorie-Namen laufen nicht mehr ineinander (Klaus' Fund in der Vorschau) · **Kopf am Handy: Suche, Farbpalette, Plus** – kein Pfeil mehr; **Schrift, Hell/Dunkel (Sonne und Mond), Farbe, Sichern und die Einstellungen stehen in der fliegenden Leiste** · „Wie das Gerät“ gibt es als Wahl nicht mehr (beim ersten Start gilt einmal das Gerät) · **Direktlink „Schlüssel holen“** im Schlüssel-Fenster (Anthropic, OpenAI, Mistral) · kein Verweis mehr auf die bisherige App. | `tests/smoke_neu.mjs` **164** · `smoke_neu_scan.mjs` **85** |
| Kern 0.21.0 · PWA 0.13.0 | **Menü am Rezept** (hinter dem Winkel → „Mehr“, wie in der abgenommenen Vorschau): **Drucken** (unsichtbarer Rahmen, kein neues Fenster), **Teilen per QR-Code** (eigener QR-Erzeuger ohne Netz; der Link im Format der alten App öffnet das Rezept im Formular), **Einheiten** (wie notiert / US / metrisch, nur Anzeige, auch °C ↔ °F), **Nährwerte schätzen** und **Rechtschreibung prüfen** (KI; die Zeile sagt, was an Anthropic geht; Nährwerte als eingeklappte Zeile am Rezept, Rechtschreibung als Liste zum Anhaken). | `tests/smoke_neu_menue.mjs` **26** · `test/kern-helfer.test.js` 15 · `kern-druck` 9 · `kern-qr` 23 · `kern-einheiten` 12 · Gegenprobe `gegenprobe_neu_menue.py` **6 gefangen · 0 nicht** |
| Kern 0.22.0 · PWA 0.14.0 | **Sprache „wie das Gerät“ mit Sprachmenü** (Einstellungen → Darstellung; jeder Text der Oberfläche läuft über `L('Deutsch', 'English')`, die übrigen sechs Sprachen kommen aus Tabellen `kern/sprachen/` und `neu/sprachen/`). **Übersetzen** am Rezept (Menü „Mehr“) und **„Alle übersetzen“** (Einstellungen → KI-Schlüssel) mit Kostenhinweis vorab, abbrechbar. **B7:** Tresor-Stände der alten App kommen einmal in den neuen Tresor · **KI-Richter der Suche** („KI prüft“ bei den Treffern nach Bedeutung) · **KI-Bilder für alle ohne Bild** (Einstellungen → Bilder; Anzahl und Kosten vorab, abbrechbar) · **Prüfung des Bildauftrags** (Stelle markiert, „Ohne senden“ / „Mit senden“). **C:** Wochenplan-Vorschlag (Planer → „Vorschlag“, erst ansehen, dann übernehmen) · **Buch** (Einstellungen → Buch: als PDF drucken, als Datei zum Blättern; ganz, eine Kategorie oder ein Ordner) · **Vom Teller** (dritte Kachel im Foto-Weg) · **hoher Kontrast** (Darstellung) · **Handbuch** (Einstellungen → Hilfe) · **Muttis-Ausgabe** als eigene Einstiegsseite `neu/muttis.html` mit eigenem Speicher. Die Meldung mit „Rückgängig“ bleibt bei 390 px ganz im Bild (vorher lag der Knopf bei langem Text außerhalb). | Zahlen stehen im PR; Proben `smoke_neu_sprache`, `smoke_neu_zusatz` (9 Abschnitte, mit `NUR_TEIL` einzeln), `smoke_kern_buch`, `smoke_kern_sprachen`; Gegenproben `gegenprobe_neu_sprache.py`, `gegenprobe_neu_zusatz.py`, `gegenprobe_kern_buch.py`, `gegenprobe_kern_sprachen.py` |
| Kern 0.22.1 · PWA 0.14.1 | Kern-Kleinigkeiten aus dem Abgleich mit dem Mixarium: russische Farbnamen kürzer (die Zeile „Farbe“ brach dort bei 390 px um) · Notizen zum ganzen Rezept stehen im Druck und im Buch (`r.notes`, das Mixarium führt sie) · `wasGehtHinaus(…, { vieleText })`: eine Ausgabe sagt „von 12 Getränken“ statt „Rezepten“. | `npm test` 333 · `smoke_kern_buch` · `smoke_neu_menue` |

Entscheidungen der Nacht (mit Grund):

- **Schlüssel im Kern-Speicher statt im localStorage der alten App.** Die PWA 0.9.5 schrieb den OpenAI-Schlüssel unter dem Namen der alten App und löschte ihn dort auch; die alte App soll aber nur gelesen werden. Ein dort hinterlegter Schlüssel gilt weiter.
- **Modelle der drei Scan-Stufen sind die heutigen ihrer Klasse** (Haiku 5.5, Sonnet 5.5, Opus 5.5). Die alte App nannte Haiku 4.5, Sonnet 4.6, Opus 4.5; Klaus hat das Labor schon auf Haiku 5.5 gestellt.
- **Scan-Ergebnis landet im Formular** (wie beim Text-Import), nicht in einer eigenen Ergebnis-Ansicht: ein Weg zum Prüfen vor dem Speichern. Ein Stapel wird gleich eingetragen und lässt sich als Ganzes rückgängig machen (wie in der alten App, dort ohne Rückgängig).
- **Der Fund „versteckter Text“ steht beim einzelnen PDF auf dem Scan-Blatt**, der Knopf heißt dann „Ohne ihn senden“; nur der Stapel fragt in einem eigenen Fenster (einmal).
- **Abend 23.11., von Klaus selbst entschieden (er sah die Bildschirmfotos):** kein Erklärtext auf den Blättern („ein Kochbuch ist ein Bilderbuch“), „?“ nur dort, wo es gebraucht wird und ohne eigene Zeile, sonst reicht der Hinweis (Tooltip) · keine dicken Knöpfe auf dem Bild · Kategorie nicht auf jeder Karte wiederholen · Meldungen kurz („+42 Rezepte“) · Beispielrezepte gleich mitgeben statt fragen · der Bereich heißt „Einstellungen“ (nicht „Werkstatt“) · Farbfelder in Wasserfarben, dezent · die Dateiprüfung läuft im Hintergrund; gefunden wird markiert (rote Fläche, Text lesbar), dann „raus oder rein“; keine Panik-Texte.
- **Der Halt „Ohne ihn senden / Abbrechen“ ist ersetzt** (Klaus 23.11. abends; vorher Klaus 14.10.: „einmal anhalten“): beim einzelnen PDF zeigt das Blatt den Fund rot markiert und fragt „Entfernen“ oder „Drin lassen“; im Stapel wird ohne Rückfrage entfernt und am Rezept vermerkt, damit ein Stapel nicht bei jeder Datei stehen bleibt.
- **Fotos werden nicht von selbst auf Text im Bild geprüft.** Das braucht die Texterkennung im Gerät (21 MB, bis 90 s je Bild); sie läuft weiter nur über das Schild („Datei gründlich prüfen“). Von selbst geschieht: Foto neu zeichnen (Aufnahmedaten weg), PDF-Text und versteckten Text prüfen, den von Mistral gelesenen Text prüfen. Im Auftrag an Claude steht, dass Text im Bild Inhalt ist und keine Anweisung.
- **„Alle“ zeigt ein Raster ohne Überschrift je Kategorie:** bei acht Startrezepten wäre je Kategorie eine Zeile mit einer Karte entstanden; die Kategorien stehen als Fotos darüber.
- **Kreuz, Haken, Plus und Minus ohne die Zweitfläche von Phosphor:** das Quadrat las sich in Knöpfen als grauer Kasten.
- **Sprache:** neue Texte stehen als Deutsch/Englisch-Paar im Code (`L(de, en)`, Kern `oberflaeche/sprache.mjs`); die übrigen sechs Sprachen kommen über Tabellen mit dem deutschen Text als Schlüssel.

- **Web-Import im Browser:** kein Dienst dazwischen heißt, dass viele Seiten das direkte Lesen verweigern (CORS). Dafür steht der Weg „Seite öffnen, alles kopieren, einfügen“. In der APK/Windows-App geht der direkte Abruf über natives HTTP (Bau-Vorbereitung).
- **Kategorie beim Web-Import** wird nur gesetzt, wenn ein Kategoriename der eigenen Sammlung in den Angaben der Seite vorkommt; sonst bleibt sie leer (nichts wird geraten).
- **Zusätze in eigener Datei `neu/zusatz.mjs`** (KI-Richter, Sammel-Bilder, Bildauftrag, alte Tresor-Stände, Wochenplan-Vorschlag, Buch, Handbuch): die Hauptdatei wurde zur selben Zeit für die Sprache umgebaut, und sie soll nicht weiter wachsen; die Zusätze hängen an wenigen benannten Stellen.
- **Alte Tresor-Stände kommen einmal** (Merker in den Einstellungen): ein Stand, den man im neuen Tresor löscht, soll nicht bei jedem Start wiederkommen. Die Datenbank der alten App wird nur gelesen und nie angelegt; ein alter Stand verdrängt keinen neuen.
- **KI-Richter nur auf Knopfdruck, höchstens zwölf Treffer, ohne Schritte:** sparsam mit Kosten und Daten. Ohne Prüfliste läuft er nicht (wie Sage Bau 04.J), ein Treffer mit einem Befehl an eine KI geht nicht hinaus.
- **Bildauftrag: drei Antworten** (ohne senden, mit senden, Kreuz); **im Sammel-Weg wird ein solches Rezept übersprungen**, damit niemand im Lauf zwölfmal gefragt wird. Die Meldung am Ende nennt die Zahl.
- **„Vom Teller“ ist die dritte Kachel im Foto-Weg**, keine siebte im Plus-Fenster: sechs Kacheln füllen das Fenster am Handy genau, und es ist ein Foto-Weg.
- **Buch als PDF über den Druck des Browsers; im Verzeichnis stehen Rezeptnummern statt Seitenzahlen:** Seitenzahlen kann der Druck des Browsers nicht verlässlich liefern, eine falsche Zahl wäre schlechter als keine.
- **Muttis-Ausgabe als zweite Einstiegsseite derselben App** (`neu/muttis.html`): ein Code, eigener Speicher, Name und Farbe aus `ausgaben/muttis`. Das Repo Muttis-Rezeptbuch ist nicht angefasst.
- **Hoher Kontrast sitzt im Kern** (`farbeSetzen(…, { kontrast })`), damit beide Apps ihn gleich bekommen.
- **Nicht gebaut: Kreativbuch, KI-Buch, Food-Zine, Notizbuch mit Kalender.** Jedes ist ein eigenes großes Stück; Qualität ging vor Menge.
- **Die Sprachtabellen sind maschinell übersetzt** und nicht von Muttersprachlern gegengelesen; fehlt ein Eintrag, steht Englisch da.

Nicht gemessen (Nacht): echte Aufrufe an Anthropic und Mistral (alle Antworten sind gestellt) · die Kamera am Gerät · pdf.js und die Texterkennung liegen wie in der alten App unter `/Workflow-PDF/vendor/` auf derselben Adresse; in einer APK oder Windows-App müssen sie ins Paket.


## Versionen auf `main`

| | Rezeptbuch | Mixarium |
|---|---|---|
| Kern | **0.17.0** (gebaut hier, `KERN.json`) | **0.17.0** per Pin, Commit `0b18345` |
| PWA (`neu/`) | **0.9.5** | **10.0.0-vor19** |
| main-Commit | `0b18345` | `859c911` |
| Alte App | unverändert | unverändert (md5 `49ce4320795972269057083e4c189f48`) |

Halb Fertiges gibt es nicht: alles, was diese Sitzung angefangen hat, ist geprüft und gemergt.

## Wie gearbeitet wird

- **Zwei Repos, ein Kern.** Der Kern wird hier gebaut (`kern/`, `node kern/kern-stand.mjs` schreibt `KERN.json`, Fassung in
  `kern/kern-stand.mjs` hochzählen, Zeile in `kern/README.md`). Das Mixarium holt ihn mit
  `node tools/kern-nachziehen.mjs ../Mein-Rezeptbuch` und prüft mit `--pruefen`; dort nie von Hand ändern.
- An einer App zur Zeit; je Punkt prüfen, ob er in der anderen sinnvoll ist. Immer gegen `origin/main`.
- Jede neue Kern-Datei gehört in den Service Worker beider PWAs (`neu/sw.js`, Liste der Hülle) – sonst fehlt sie offline;
  die Offline-Probe fängt es. Jede Änderung zählt die Fassung hoch: `neu/app.mjs` (FASSUNG), `neu/index.html` (`?v=`), `neu/sw.js`.
- Selbst-Merge eigener, geprüfter PRs. Codex wird nicht geprüft. Keine Forschungseinträge. Schlüssel nie in Dateien oder Chat.
- Briefkästen: `docs/BRIEFKASTEN_MIXARIUM.md` (hier, neueste Runde **C**) und `Mein-Mixarium/docs/ABGLEICH_REZEPTBUCH.md`
  (neueste Runde **6**). Regel aus CLAUDE.md: vor jedem Bauschritt lesen, nach jeder Änderung, die die andere App betrifft,
  ergänzen; höchstens zwei Runden je Kasten.

## Kern: was es gibt (0.17.0)

`modell/` rezept (`sicht` je Sprache), kategorien (`kategorienMit`, Familien-Namen, `katBild` für Sticker), suche, mengen
(Achtel, Bar- und US-Einheiten), kochen, einkauf (`einkaufMit` je Ausgabe), plan (Woche, `ausAltemMenu`), zustand ·
`sicherung/` (Fassung 11) · `speicher/` (speicher, uebernahme, tresor) · `import/text` (ohne KI) · `ki/bild` (dall-e-3, dann
gpt-image-1; Pollinations; Auftrag je `art`) · `suche/bedeutung` (Modul 03/04 aus `sbkim/`, erst beim Einschalten) ·
`pruefung/paket` · `ausgabe/` · `oberflaeche/` symbole, farben (Ton), schrift, bild, geraete, diktat (einfach),
**hinweis** (Tooltips, 0.16), **warten** (Ladebalken, 0.17).

Neu in dieser Sitzung: 0.11 Bildauftrag je Ausgabe, Bar-Geräte, englische Namen · 0.12 Kategorien/Einkauf je Ausgabe ·
0.13 Familien-Namen für mitgebrachte Kennungen · 0.14/0.15 Sticker-Bild je Kategorie · 0.16 Hinweis-Blasen · 0.17 Ladebalken.

## Rezeptbuch-PWA 0.9.5: fertig und geprüft

Start mit Suche und Foto-Kategorien (Sticker mit Mini-Foto aus der eigenen Kategorie, sonst Zeichen) · Rezept, Portionen,
Kochansicht (Wecker, Wischen, Geräte) · Formular, Text-Import ohne KI, Spracheingabe (einfach) · Kategorien (umbenennen,
Zeichen, ordnen, löschen, neu) · Einkaufsliste je Laden · Wochenplan · Bilder-Ordner (einziger Ort zum Löschen eines Bildes) ·
Bildausschnitt · Tipp aufs Bild → Vollbild mit Knopf zum Bild-Blatt · Winkel in der Namenszeile, am Monitor neben dem Bild ·
Sicherung Fassung 11, Übernahme aus der alten App · Tresor · KI-Bild (OpenAI) und Gratis-Foto · Sinn-Suche · Hell/Dunkel je
Farbe · Schrift-Regler · Hinweis-Blasen (abschaltbar) · Erklärtexte hinter „?“ · Ladebalken bei jeder Wartezeit · offline.

Proben (zuletzt gesehen): `npm test` **52** grün · `node tests/smoke_neu.mjs` **140 grün · 0 ROT** (dreimal hintereinander;
ein früherer Lauf brach einmal in einem frühen Abschnitt ab und ließ sich nicht wiederholen – im Auge behalten).

## Rezeptbuch: was fehlt (gemessen an `docs/FUNKTIONSLISTE.md`)

Nach Wichtigkeit für Klaus' Prüfung:
1. **Import-Wege:** Foto-Scan (einzeln/Stapel, Claude/Mistral, Reinigung vor der KI, „Datei prüfen“), Web-Import (ohne
   öffentliche Weiterleiter), „vom Teller“.
2. **Schlüssel für Anthropic und Mistral** (nur OpenAI ist da). Die Mixarium-PWA hat ein Anthropic-Fenster, das man übernehmen kann.
3. **Ordner-Ansicht** (Daten in `Z.ordner` sind da und werden übernommen, es gibt keine Ansicht).
4. **Übersetzung** (alle/einzeln, mit Kostenhinweis) und **Sprachmenü „wie das Gerät“** – die Oberfläche ist nur Deutsch.
5. **Mikrofon aus Modul 21** statt `diktat.mjs`; KI-Richter der Suche; Tresor-Stände der alten App übernehmen; Sammel-Weg
   „KI-Bilder für alle ohne Bild“; Prüfung des Bildauftrags auf KI-Anweisungen.
6. Nährwerte · Rechtschreibung · Wochenplan-KI · Einheiten metrisch/US · Drucken · QR-Teilen · Notizbuch mit Kalender.
7. Kreativbuch, KI-Buch, Food-Zine, PDF-Buch, Flipbook.
8. Muttis-Ausgabe als PWA (`ausgaben/muttis` gibt es, eigene Einstiegsseite nicht).

## Was Klaus in dieser Sitzung gesagt hat

Erledigt: Tipp aufs Bild → Vollbild + Bild-Blatt · Winkel am Monitor neben dem Bild · Sticker mit Mini-Fotos aus der eigenen
Kategorie, Name bleibt lesbar („Sushi bleibt Sushi“, ohne Bild ein Zeichen) · Erklärtexte hinter „?“ an der Stelle, die sie
erklären, auch beim Schlüssel („bedienungsfreundlich, nicht ein Buch“) · kurze, einzeilige Meldungen · Tooltips der alten Apps
übernommen · Ladebalken überall, wo Zeit vergeht („damit nie der Eindruck entsteht, die App ist abgestürzt“) · Mixarium: Labor
auf Haiku 5.5, Kacheln dicht und in Wasserfarben, Status „Bewertung“.

Gilt weiter: erst die PWAs fertig, Klaus prüft; **APK und Windows erst nach seinem Go**; kein Store-Eintrag, kein Release ohne
sein Wort · keine Funktion auslassen außer SBKIM/Mycel (eingebaut, nicht geladen, unsichtbar) · bewährte Bausteine übernehmen.

## Entscheidungen dieser Sitzung (mit Grund)

- Ladebalken als **ein** Kern-Baustein (Balken oben + Zeile unten mit Sekundenzähler), ohne Klick-Sperre; unter 250 ms nichts,
  weil ein Aufblitzen unruhiger ist als nichts.
- Erklärtexte als `<details class="frag">` mit Blase, nicht als Absatz; kurze Zeile + „?“, wo sonst ein leerer Platz bliebe.
- Hinweis-Blasen nehmen `title` und `aria-label` reiner Symbolknöpfe; kein zweiter Tooltip des Browsers.
- Sticker: das Bild der Kategorie kommt aus ihren eigenen Rezepten; ohne Bild das Zeichen (kein fremdes Foto).

## Nicht gemessen

Tablet und Handy von Klaus · echte Aufrufe an OpenAI, Anthropic, Pollinations · das echte Sprachmodell der Sinn-Suche (120 MB,
Dauer bei vielen Rezepten) · die Live-Seite (github.io ist aus der Sitzung nicht erreichbar).

## Offene Fragen an Klaus

Was er mit „In den Einstellungen, ich muss es immer wieder sagen“ meinte · familyproject.de und „PWA-Toolpoint“ (Server,
Zugang) · ob die drei App-Zeichen und die 12 fehlenden Beispielbilder vorliegen (Aufträge: `beispiele/AENDERUNGEN.md`,
`docs/vorschau/app-zeichen-auftraege.md`) · Labor auch im Rezeptbuch/Kern? · `_CR`-Block im Kern · Sushi-Fehler auch in der
alten App beheben?

## Fallen

- **`//`-Kommentar in einem Einzeiler** zerlegt `app.mjs` (SyntaxError). In Einzeilern nur `/* */`. Nach jeder Änderung
  `node --check neu/app.mjs`.
- **Session-Branch nach Squash-Merge:** `git checkout -B <branch> origin/main`, vor dem Push `git fetch origin <branch>` und
  `git merge -s ours FETCH_HEAD` (Force-Push gesperrt). Vorher prüfen, dass `git diff origin/main HEAD` nur die eigene Änderung zeigt.
- **PR-Nummer aus der Antwort nehmen**, nicht raten: einmal wurde ein Merge mit der Nummer eines fremden PRs (#478) aufgerufen
  (blieb folgenlos, der war schon gemergt).
- **Service Worker umgeht `page.route`:** Proben, die etwas nachstellen, brauchen `serviceWorkers: 'block'`.
- **Neue Kern-Datei fehlt im SW** → offline kaputt; die Offline-Probe fängt es.
- **`\b` kennt keine Umlaute.**
- **Proben auf Bedingungen warten lassen, nicht auf die Uhr:** `kiBild` versucht zwei Modelle nacheinander; eine Wartezeit von
  fester Länge war zu kurz.
- **Backticks in einer Commit-Nachricht in doppelten Anführungszeichen** führt die Shell aus; Nachricht per Heredoc übergeben.
- **`.ftext`-Absätze** sind in den Fenstern noch häufig; neue Erklärtexte gehören hinter `frag()`.
