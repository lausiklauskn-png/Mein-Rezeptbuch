# Übergabe der gemeinsamen Sitzung (Rezeptbuch + Mixarium)

Stand **23.11.2026, 18:05 Uhr** (Europe/Berlin). Die gemeinsame Sitzung (Tag) übergibt an die Nacht-Sitzung. Diese Datei ist
die Rezeptbuch-Seite und gilt für beide Apps; die Mixarium-Seite steht in `Mein-Mixarium/docs/UEBERGABE_GEMEINSAME_SITZUNG.md`.
Der Auftrag für die Nacht steht in `docs/NACHTAUFTRAG.md`.

## Nacht 23./24.11. (Nacht-Sitzung, laufend nachgeführt)

Auftrag: `docs/NACHTAUFTRAG.md`. Hier steht, was in der Nacht auf `main` gekommen ist; der Rest der Datei ist der Stand von 18:05.

| Fassung | Was | Proben |
|---|---|---|
| Kern 0.18.0 · PWA 0.10.0 | **KI-Schlüssel** für Anthropic, OpenAI, Mistral (Werkstatt → KI; speichern, prüfen, löschen; nur im Kern-Speicher des Geräts, ein Schlüssel der alten App gilt weiter und wird nur gelesen). **Foto-Scan** im Blatt hinter „+“: Foto aufnehmen oder Dateien wählen (auch PDF, mehrere = Stapel), Claude liest oder Mistral OCR + Claude, drei Stufen (schnell = Haiku 5.5, Standard = Sonnet 5.5, Profi = Opus 5.5). **Reinigung vor der KI**: Foto neu gezeichnet (1200 px, ohne Aufnahmedaten), PDF als Seitenbilder mit 300 dpi, versteckter Text zugedeckt, einmal anhalten, Vermerk am Rezept. **„Datei prüfen“** mit dem Prüfkern aus Workflow PDF. Vor dem Senden steht, was hinausgeht. | `test/kern-ki.test.js` (16) · `tests/smoke_neu_scan.mjs` (74) · `tests/gegenprobe_neu_scan.py` (9 Fälle) |

Entscheidungen der Nacht (mit Grund):

- **Schlüssel im Kern-Speicher statt im localStorage der alten App.** Die PWA 0.9.5 schrieb den OpenAI-Schlüssel unter dem Namen der alten App und löschte ihn dort auch; die alte App soll aber nur gelesen werden. Ein dort hinterlegter Schlüssel gilt weiter.
- **Modelle der drei Scan-Stufen sind die heutigen ihrer Klasse** (Haiku 5.5, Sonnet 5.5, Opus 5.5). Die alte App nannte Haiku 4.5, Sonnet 4.6, Opus 4.5; Klaus hat das Labor schon auf Haiku 5.5 gestellt.
- **Scan-Ergebnis landet im Formular** (wie beim Text-Import), nicht in einer eigenen Ergebnis-Ansicht: ein Weg zum Prüfen vor dem Speichern. Ein Stapel wird gleich eingetragen und lässt sich als Ganzes rückgängig machen (wie in der alten App, dort ohne Rückgängig).
- **Der Fund „versteckter Text“ steht beim einzelnen PDF auf dem Scan-Blatt**, der Knopf heißt dann „Ohne ihn senden“; nur der Stapel fragt in einem eigenen Fenster (einmal).
- **Sprache:** neue Texte stehen als Deutsch/Englisch-Paar im Code (`L(de, en)`, Kern `oberflaeche/sprache.mjs`); die übrigen sechs Sprachen kommen über Tabellen mit dem deutschen Text als Schlüssel.

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
