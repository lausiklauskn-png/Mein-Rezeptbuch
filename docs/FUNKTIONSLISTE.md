# Funktionsliste Mein Rezeptbuch → Küchen-Kern

Stand 2026-11-23, aufgenommen aus `QC_MeinRezb_24_04_26.html` auf `origin/main` (f930a81): 1,32 MB Quelle,
719 Funktionen, 47 Bereiche (Kommentar-Kopfzeilen), 5 Hauptbildschirme (`sc-recipes`, `sc-menu`, `sc-folders`,
`sc-backup`, `sc-settings`), 15 Overlays, 22 Proben unter `tests/` und `test/`.

Auftrag: Brief `docs/BRIEF_SITZUNG_2026-11-23_REZEPTBUCH-KUECHEN-KERN.md` im Repo Meine-Familienakte.

**Spalten**

- **Ziel** — `kern` (gemeinsam mit Mixarium und Muttis), `ausgabe` (nur Rezeptbuch-Ausgaben), `entfällt` (nicht in die neue Fassung),
  `nicht Store` (bleibt nur in der alten Web-App, nicht in der Store-Fassung).
- **Stufe** — Reihenfolge aus dem Brief, Schritt 5: 1 Rezept anlegen/ansehen/bearbeiten · 2 Ordner · 3 Suche · 4 Sicherung ein/aus ·
  5 Datenübernahme · 6 Kochansicht · 7 Einkaufsliste · 8 Wochenplaner · 9 Import · 10 KI · 11 Teilen · 12 Bücher/EPUB/Zine.
- **Im Kern / Probe** — heute überall `offen`; die bestehende Probe der alten App steht dabei, wenn es eine gibt.
  Was dort geprüft wurde, muss im Kern wieder eine Probe bekommen (nichts weglassen).

## 1 · Rezepte (Bildschirm `sc-recipes`)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Rezeptliste als Karten (Foto, Name, Kategorie, Zeit, Bewertung) — `render`, `renderCatNav` | kern | 1 | offen |
| Rezept ansehen: Foto, Zutaten, Schritte, Notizen, Nährwerte, Bewertung (`r.rating`) | kern | 1 | offen |
| Rezept anlegen (Maske, Kategorie **und** Ordner getrennt) — NEW RECIPE | kern | 1 | offen |
| Inline-Bearbeiten: Name, Zutat, Schritt (`INLINE-NAME-EDIT`, Inline-Edit Zutat/Schritt) | kern | 1 | offen |
| Rückgängig im Editor (max. 10 Schritte) | kern | 1 | offen |
| Portionen umrechnen (SERVING SIZE SCALING), Ergiebigkeit bei Kuchen (Form statt Zahl) | kern | 1 | offen |
| Einheiten übersetzen (Mengeneinheit) | kern | 1 | offen |
| Zubereitungszeit (`r.prepTime`) | kern | 1 | offen |
| Notizen am Rezept (NOTES) | kern | 1 | offen |
| Bildausschnitt wählen (CROP EDITOR, Form der Karte, Zoom, Maus/Finger) | kern | 1 | offen · `smoke_bildausschnitt` |
| Bild am Rezept, Bild-Vollbild | kern | 1 | offen |
| Zutaten/Schritte per Ziehen umsortieren (Maus + Langdruck) | kern | 1 | offen |
| Karte per Ziehen in andere Kategorie / auf Kategorie-Pille | kern | 2 | offen |
| Wischen an der Rezeptkarte (`_rcardHdCheck`, nur in Muttis) — prüfen, ggf. übernehmen | kern | 1 | offen |
| `_tddPendingMove` / `_tddPendingEnd` (nur in Muttis, Ziehen und Ablegen) — prüfen, ggf. übernehmen | kern | 2 | offen |
| Doppelte Namen erlaubt (Kennung `r.uid` statt Name) | kern | 1 | offen · `smoke_doppelte_namen` |
| Rechtschreibprüfung (SPELL-CHECK, `spellModal`) | kern | 10 | offen |
| Rezept drucken (SINGLE RECIPE PRINT), Druckansicht | kern | 11 | offen |
| Swipe zwischen Bildschirmen, Zurück-Taste Android/Maus | kern | 1 | offen |
| Tastenkürzel (KEYBOARD SHORTCUTS) | kern | 1 | offen |
| Wortkarte | kern | 3 | offen · `smoke_wortkarte` (stürzt schon auf main ab) |
| **neu:** Kochansicht im Vollbild (ein Schritt groß, Wischen/Pfeiltasten, Bildschirm bleibt an, Zutaten des Schritts) | kern | 6 | neu |

## 2 · Kategorien und Ordner (`sc-folders`)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Feste Kategorien (`CATS`, 16 inkl. Getränke) mit 8 Sprachen | kern | 2 | offen |
| Kategorien umbenennen, eigenes Symbol (im Kern: Symbol aus dem SVG-Satz statt Emoji) | kern | 2 | offen · `smoke_kategorien` |
| Kategorie löschen / zusammenlegen / neu anlegen (`katAnlegen`, `CATS_AUS`) | kern | 2 | offen · `smoke_kategorien` |
| Kategorien umsortieren (Leiste + Baum, Maus + Langdruck) | kern | 2 | offen · `smoke_kategorien` |
| Fremde Kategorien (`catsFremd`, `KAT_FAMILIE` 18 Kennungen), „Ohne Kategorie“ | kern | 2 | offen · `smoke_kategorien` |
| Kategorie zuordnen aus der Rezeptzeile | kern | 2 | offen · `smoke_kategorien` |
| Ordner anlegen/umbenennen/löschen (`FD`), Ordner-Baum, `ordnerVonRezept` | kern | 2 | offen · `smoke_kategorien` |
| Ordner und Kategorie getrennt (`r.folder` ≠ `r.cat`) | kern | 2 | offen · `smoke_kategorien` |

## 3 · Suche

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Volltextsuche, mehrere Begriffe (SEARCH) | kern | 3 | offen · `smoke_a5_suchfeld_multiquery` |
| Bedeutungssuche (semantisch, offline, opt-in, `mrSemOn`) | kern | 3 | offen |
| KI-Richter für Suchtreffer (`mrJudgeOn`) | kern | 10 | offen |

## 4 · Sicherung und Datenübernahme (`sc-backup`)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| JSON-Export (v10, `r.uid`, `knoten`) | kern | 4 | offen · `smoke_herkunft` |
| JSON-Import mit Zusammenführen (`_zusammenfuehren`, Ordner mit, Dubletten an `uid`) | kern | 4 | offen · `smoke_herkunft` |
| Kategorie-Zuordnung beim Import (`_showCatMapDialog`) | kern | 4 | offen · `smoke_kategorien` |
| JSON-Sanitizer für KI-Antworten | kern | 9 | offen |
| Herkunft am Rezept (`r.herkunft`, Kette ≤ 5, nur Kennung) | kern | 4 | offen · `smoke_herkunft` |
| Tresor: mehrere Sicherungen in IndexedDB (`MeinRzBackup1`, BACKUP VAULT) | kern | 4 | offen |
| Wiederherstellen-Dialog beim Start, wenn localStorage weniger Rezepte hat | kern | 5 | offen |
| JSON aus Downloads laden | kern | 4 | offen |
| iOS-Erinnerung an Export | kern | 4 | offen |
| Persistenten Speicher anfordern | kern | 4 | offen |
| **neu:** Übernahme aus `localStorage` (`mrz9m`, `mms9m`, `mfd9m`, `mrzcats9m` … bzw. Muttis `mrz9` …) in IndexedDB, nichts löschen | kern | 5 | neu |
| **neu:** Übernahme aus `.json`-Sicherungen alter Fassungen | kern | 5 | neu |

## 5 · Einkaufsliste und Wochenplaner (`sc-menu`, Overlay `#mv`)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Einkaufsliste, zusammengefasst nach Warengruppen, Einheiten vereinheitlicht | kern | 7 | offen |
| Wochenplaner: Wochen blättern, Gang hinzufügen (AddSlot, `courseSheet`), Slots ziehen | kern | 8 | offen |
| Menü-Ansicht (MENU VIEWER), Menü drucken | kern | 8 | offen |
| Wochenplan zurücksetzen | kern | 8 | offen |
| Zähler-Abzeichen (BADGE) | kern | 7 | offen |

## 6 · Import (Overlay `importOv`: Bild, Scan, Text, Web, JSON, Bild-KI)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Bild-Import (IMAGE IMPORT), Kompression Stufe 1 | kern | 9 | offen |
| Kamera-Foto herunterrechnen statt abweisen (`bildFuersNetz`) | kern | 9 | offen · `smoke_kamera_bild` |
| KI-Scan einzeln und Stapel (Claude / Mistral-OCR, Modi schnell/standard/profi) | kern | 10 | offen |
| Reinigung vor der KI (PDF als Seitenbild 300 dpi, versteckter Text, Metadaten), Prüfen auf Knopfdruck | kern | 10 | offen · `smoke_reinigung` |
| Text-Import (TXT-SETUP, Mistral-OCR) | kern | 9 | offen |
| Web-Import (Rezept + Bild von Webseite, Kategorie raten) | kern | 9 | offen · `smoke_web_import` — **ohne** öffentliche Weiterleiter (allorigins, codetabs): in der App Capacitor-HTTP, im Browser Hinweis |
| Datei-Import (JSON) | kern | 9 | offen |

## 7 · KI (nur mit eigenem Schlüssel)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Schlüssel Anthropic / OpenAI / Mistral speichern, prüfen, löschen | kern | 10 | offen · `smoke_schluessel_loeschen`, `smoke_b3_safe_secret` |
| Schlüssel-Einführung (Wizard, `?setup=1`) | kern | 10 | offen |
| Zugangscode-Erklärung | kern | 10 | offen · `smoke_zugangscode_erklaerung` |
| KI-Bild (DALL·E 3, eine Naht, Warteschlange, Bildcache Stufe 3) | kern | 10 | offen · `smoke_ki_bild` |
| Gratis KI-Foto (Pollinations, ohne Schlüssel) | kern | 10 | offen — Datenschutz-Hinweis nötig |
| Bildauftrag einmal anhalten bei KI-Anweisung | kern | 10 | offen · `smoke_reinigung` |
| AI-Panel (Rezept verbessern, Varianten) | kern | 10 | offen |
| Übersetzung von Rezepten (TRANSLATION ENGINE, `r.translations`) | kern | 10 | offen |
| Nährwerte (`r.nutrition`), Geschmacksprofil (`r.flavors`) | kern | 10 | offen |

## 8 · Teilen und Bücher

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Rezept teilen (QR-Code + Web Share) | kern | 11 | offen |
| PDF-Buch (PDF BOOK EXPORT, Cover-Helfer) | ausgabe | 12 | offen |
| Flipbook-Export | ausgabe | 12 | offen |
| KI-Kreativbuch (Blätterbuch, Stil-System, Seiten 1–3, Kosten-Hinweis `kbCostOv`) | ausgabe | 12 | offen |
| Eigenes Kreativbuch aus Bildern | ausgabe | 12 | offen |
| KI-Buch (`aiBookOv`, `kbkResize`) | ausgabe | 12 | offen |
| Food-Zine (Galerie, Prompt-Generator, Bild+Text in Zwischenablage) | ausgabe | 12 | offen · `smoke_foodzine_bild` |
| KI-Zine (`zineOv`) | ausgabe | 12 | offen |

## 9 · Einstellungen (`sc-settings`) und Rahmen

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Sprache: 8 Sprachen (`LANGS`, `T(k)`), erste Wahl folgt dem Gerät | kern | 1 | offen · `smoke_einstellungen_sprache` |
| Themen (THEME, `mtheme9m`) → **eine** warme Palette hell/dunkel je Ausgabe | kern | 1 | ersetzt |
| Barrierefreiheit: Schriftgröße, hoher Kontrast (`a11ySize9m`, `a11yHc9m`) | kern | 1 | offen |
| Tipps aus/an (`tipsOff9m`), Tooltips | kern | 1 | offen — als „?“-Erklärungen |
| Handbuch (`manualOv`), Hilfe (`helpOv`), Cache-Hilfe (`cacheOv`) | kern | 1 | offen |
| PWA: Installieren (Kopf + Einstellungen), Update-Banner, Manifest-id | kern | 1 | offen · `smoke_manifest_id` |
| Boot-Fortschritt, Startbild | kern | 1 | ersetzt (Ziel: erster Inhalt < 1 s) |
| Toast-Meldungen | kern | 1 | offen |
| App-Bewertung (`appRatings9m`) | entfällt | – | Store-Bewertung statt eigener |
| Einklappbare Navigation | entfällt | – | ersetzt durch untere Leiste / Seitenleiste |
| Debug-Konsole Eruda (`eruda9`) | entfällt | – | nicht in Store-Fassung |
| `_CR`-Wasserzeichen (`_cr_block.txt`, `build.py`) | offen | – | Klaus entscheidet, ob im Kern |

## 10 · Netz-Module

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| SBKIM-Module 00–08, 15–18, 23 (`sbkim/`), Briefkästen, Spore, `status.json` | **eingebaut, nicht geladen, unsichtbar** | – | kein Netzverkehr; später von Hand freischaltbar (eigenes Kochnetzwerk, Klaus 23.11.) |
| Mycel / Rendezvous-Panel, Gerätename | **eingebaut, nicht geladen, unsichtbar** | – | wie SBKIM |
| KI-Richter-Prüfliste (`04_match.js`) | **nicht Store** | – | an SBKIM gebunden |
| `test/sbkim.test.js` | **nicht Store** | – | läuft weiter für die alte App |

## Speicher-Schlüssel (für die Übernahme)

| Mein Rezeptbuch (`…9m`) | Muttis (`…9`) | Inhalt |
|---|---|---|
| `mrz9m` | `mrz9` | Rezepte |
| `mms9m` | `mms9` | Wochenplan |
| `mfd9m` | `mfd9` | Ordner |
| `mrzcats9m`, `mrzcatsaus9m`, `mrzcatord9m` | `mrzcats9`, `mrzcatsaus9`, `mrzcatord9` | Kategorien: Namen, ausgeblendet, Folge |
| `mlang9m`, `mtheme9m`, `a11ySize9m`, `a11yHc9m`, `tipsOff9m` | entsprechend | Einstellungen |
| `claudeKey9m`, `openaiKey9m`, `openaiImgKey9m`, `mistralKey9m`, `scanProvider9m` | entsprechend | Schlüssel — **werden übernommen, nie exportiert** |
| IndexedDB `MeinRzBackup1` | IndexedDB `MrzBackup1` | Bilder, Tresor |

Beide Ausgaben liegen unter derselben Herkunft `lausiklauskn-png.github.io`: jede liest **nur** ihre Endung, nichts wird gelöscht.

## 11 · Neu dazu (Klaus 23.11., nach der ersten Vorschau)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| **Werkstatt** als fünfter Bereich: Bücher, Import, KI-Helfer, Tresor, Einstellungen an einem Ort | kern (Rahmen) | 1 | neu |
| Blatt hinter **+**: alle Wege zu einem neuen Rezept; Menü **⋮** am Rezept: Übersetzen, Nährwerte, Rechtschreibung, Foto, Food-Zine, QR, Drucken | kern | 1 | neu |
| **Rezeptpakete**: JSON im Format der Sicherung (v10, mit Bildern), Katalog in der App, Laden nur auf Tippen | kern | 5 | neu |
| **Beispielbuch** (~54 MB) beim ersten Start anbieten, nicht ungefragt laden | ausgabe | 5 | neu |
| Pakete prüfen vor dem Einlesen: Prüfsumme aus dem Katalog, Bilder neu kodiert (ohne Metadaten), nur bekannte Felder | kern | 5 | neu |
| Pakete mit fertigen Übersetzungen (`r.translations`), damit ohne KI-Schlüssel auch andere Sprachen gehen | kern | 5 | neu |
| **Tresor-Garantie**: Sicherung zusätzlich als Datei im Gerät (Capacitor Filesystem, Ordner Dokumente), Erinnerung nach Änderungen, Probe Export → Import byte-gleich | kern | 4 | neu |

## 12 · Abgleich Mein Mixarium (für Sitzung B)

| Funktion im Mixarium | Vorschlag | Begründung |
|---|---|---|
| **Mix-Labor** (`lab*`, 25 Funktionen): KI erfindet ein Getränk aus Kategorie, Geschmack und Wunsch-Zutaten; Lebenszyklus experimentell → in Bewertung → akzeptiert; 4 Bewertungsachsen (Geschmack 40 %, Umsetzbarkeit 25 %, Originalität 20 %, Beschreibung 15 %); Warnung → KI-Überarbeitung → Rauswurf; Favorit-Schutz, Einzelpersonen-Modus, Protokoll | **kern-Modul `labor`**, ein- und ausschaltbar je Ausgabe | Ablauf und Bewertung sind nicht getränkeabhängig; Kategorien, Geschmacks-Tags und Prompt kommen aus der Ausgabe. Im Mixarium an, im Rezeptbuch als „Küchen-Labor“ möglich (Klaus entscheidet) |
| Bekannte Drinks entdecken (TheCocktailDB) | nur Mixarium | Netz nur auf Knopfdruck, eigene Datenquelle |
| Schalter „ohne Alkohol“ (`mxNoAlc9`) | nur Mixarium | Getränke-Schicht |
| 8 Themen | ersetzt | eine Palette hell/dunkel je Ausgabe (Brief) |

## 13 · Abnahme der Vorschau (Klaus 23.11., zweite Runde)

| Punkt | Entscheid | Folge für den Kern |
|---|---|---|
| 1 Farbpalette | ja | Wasserfarben der Privaten Akte + Hellbraun/Dunkelbraun, Farbscheibe, je Ausgabe gemerkt |
| 2 Leiste | Flying Widget **wie Private Akte** | Griff, langer Druck oder Ziehen, Einrasten links/rechts/oben/unten, Lage gemerkt; Knöpfe schmal; keine untere Menüleiste am Handy |
| 3–5, 7, 8 | ja | Startseite, Rezept, Kochansicht, Planer, Muttis-Ausgabe wie gezeigt |
| 6 Einkaufsliste | ja, plus **Gruppen verschiebbar** | Reihenfolge der Warengruppen je Laden, langer Druck oder Maus festhalten |
| 9 Symbole | **Phosphor Duotone** | nur genutzte Symbole ins Paket |
| 10 App-Zeichen | Web-App Mein = goldenes Buch bleibt; drei neue Zeichen per ChatGPT | `docs/vorschau/app-zeichen-auftraege.md`; APK und Windows je Ausgabe gleich |
| 11 Extras, 12 Pakete | ja | wie gezeigt |
| neu 13 | Alles hinter + | Import-Blatt mit Reitern: Selbst, Foto-Scan, Web, Text/PDF, Vom Teller, Datei, Pakete, KI-Foto |
| neu 14 | Bild anpassen | Bildausschnitt (heute `openCrop`): ziehen, Zoom, Höhe, Lagen, Vorschau Karte/Kopf/Liste; anderes Bild per Kamera, Datei, KI, Gratis, Food-Zine |
| neu 15 | Food-Zine | drei Seiten, Auftrag ohne Schlüssel kopieren, Bild einsetzen oder mit Schlüssel erzeugen, Stil, Galerie |
| Regel | **keine Funktion auslassen** außer SBKIM und Mycel | gilt für die ganze Liste oben |

## 14 · Abgleich mit dem Mixarium und dritte Runde (Klaus 23.11.)

Klaus hat zu den zehn Punkten der Mixarium-Sitzung und zu Punkt 16 Ja gesagt. Brief dazu: `docs/BRIEF_2026-11-23_REZEPTBUCH-AN-MIXARIUM.md`.

| Baustein | Ziel | Hinweis |
|---|---|---|
| Verlaufs-Knöpfe (Wasserfarbe statt Vollton), Maße 36/34/28/30, Kochansicht 46 | kern | |
| Leiste: Griff 12 × 64, Knöpfe 34 px, Fach ≤ 180 px, 24 px Rand auf der Griff-Seite | kern | |
| Kopf: eingeklappt Name, +, Pfeil; ausgeklappt Suche, Farbe, Sprache, Notizen, Einstellungen | kern | |
| Sprache folgt dem Gerät, kein Kürzel; Inhalte nur mit KI (eigener Schlüssel), ganze Sammlung oder einzelnes Rezept, keine Zusatzzeile; Weltkugel am Rezept; Einheiten metrisch/US | kern | |
| Kochansicht: Foto, Schritt, Zutaten, Wecker, gezeichnete Geräte; Kopf klappt auf Fortschrittslinie | kern | Geräte aus dem Schritttext erkannt, von Hand ergänzbar; Geräteliste erweiterbar je Ausgabe |
| Schriftgröße der Kochansicht in den Einstellungen | kern | |
| „Nur dieses Rezept“ am Monitor | kern | |
| Beispiel-Paket: Web-App auf Tippen, APK und Windows im Paket | kern | |
| Kreativbuch (Punkt 16): 8 Stile, Kosten vorab, mit Schlüssel oder Auftrag kopieren, Blätterbuch, PDF, HTML, Rezeptbild, eigenes Buch aus Bildern, Projekte | ausgabe, Gerüst im kern | Stile als erweiterbare Liste |
| Erklärtexte hinter „?“ | kern | |
| Spracheingabe in allen größeren Textfeldern | kern | Android: nativer Baustein wie Familienakte (`ProSpeech`); Windows offen |
| Notizbuch mit Kalender und Erinnerungen (wie Private Akte) | kern, gepinnter Klon | Benachrichtigungen am Handy nötig |
| Bedeutungssuche aus SBKIM lösen, Modell ins Paket, Grenze 120 Rezepte aufheben | kern | gemessen 23.11. |
| Fehler „nur die Suche findet“ (`blank: true` mit Namen, Kennungen mit Leerzeichen oder Großschreibung) | kern | beim Laden und Import bereinigen; Probe: alles, was die Suche findet, steht auch in „Alle“ |
