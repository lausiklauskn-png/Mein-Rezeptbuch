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
- **Im Kern / Probe** — in der Nacht 23./24.11.2026 Zeile für Zeile gegen den Code der neuen PWA geprüft (`neu/`, `kern/`,
  Proben `tests/smoke_neu*`, `tests/smoke_kern*`, `test/*.test.js`). Formen: `da · <Probe>` = gebaut, die genannte Probe sichert es zu ·
  `da · ohne Probe` = gebaut, keine Probe gefunden · `teils · …` = nur zum Teil da, dahinter steht, was fehlt · `anders · …` = der Zweck
  ist anders gelöst · `fehlt` = nicht gefunden · `entfällt · …` = gibt es mit Absicht nicht mehr · `(in Arbeit)` = wird in derselben Nacht
  noch gebaut. Hinter „alt:“ steht die Probe der alten App. Was dort geprüft wurde, muss im Kern wieder eine Probe bekommen (nichts
  weglassen). In den Abschnitten 12 bis 15 steht derselbe Stand in der neuen letzten Spalte „Stand neue PWA“.

## 1 · Rezepte (Bildschirm `sc-recipes`)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Rezeptliste als Karten (Foto, Name, Kategorie, Zeit, Bewertung) — `render`, `renderCatNav` | kern | 1 | da · smoke_neu · die Karte zeigt Bild, Name und Zeit; Kategorie und Bewertung stehen nach Klaus 23.11. nicht auf der Karte |
| Rezept ansehen: Foto, Zutaten, Schritte, Notizen, Nährwerte, Bewertung (`r.rating`) | kern | 1 | teils · Foto, Zutaten, Schritte, Nährwerte da (smoke_neu, smoke_neu_menue); die Bewertung wird nur gezeigt, Sterne lassen sich nicht setzen |
| Rezept anlegen (Maske, Kategorie **und** Ordner getrennt) — NEW RECIPE | kern | 1 | da · smoke_neu, smoke_neu_ordner |
| Inline-Bearbeiten: Name, Zutat, Schritt (`INLINE-NAME-EDIT`, Inline-Edit Zutat/Schritt) | kern | 1 | anders · Bearbeiten im Formular (smoke_neu) |
| Rückgängig im Editor (max. 10 Schritte) | kern | 1 | teils · „Rückgängig“ nur nach Löschen, Einlesen und Stapel-Scan (smoke_neu, smoke_neu_scan); nach dem Speichern einer Bearbeitung keins |
| Portionen umrechnen (SERVING SIZE SCALING), Ergiebigkeit bei Kuchen (Form statt Zahl) | kern | 1 | teils · Portionen da (smoke_neu, mengen.test); Ergiebigkeit bei Kuchen (Form statt Zahl) fehlt |
| Einheiten übersetzen (Mengeneinheit) | kern | 1 | anders · Einheiten metrisch/US umrechnen, nur in der Anzeige (smoke_neu_menue, kern-einheiten); Einheiten-Namen je Sprache nur über eine KI-Übersetzung |
| Zubereitungszeit (`r.prepTime`) | kern | 1 | da · smoke_neu |
| Notizen am Rezept (NOTES) | kern | 1 | teils · Notiz an der Zutat in Klammern (smoke_neu); eine Notiz am Schritt wird gezeigt, lässt sich nicht schreiben und geht beim Bearbeiten im Formular verloren |
| Bildausschnitt wählen (CROP EDITOR, Form der Karte, Zoom, Maus/Finger) | kern | 1 | da · smoke_neu (alt: `smoke_bildausschnitt`) |
| Bild am Rezept, Bild-Vollbild | kern | 1 | da · smoke_neu |
| Zutaten/Schritte per Ziehen umsortieren (Maus + Langdruck) | kern | 1 | anders · Reihenfolge im Formular (Zeilen im Textfeld), kein Ziehen |
| Karte per Ziehen in andere Kategorie / auf Kategorie-Pille | kern | 2 | anders · „Kategorie“ in den Werkzeugen am Rezept (smoke_neu), kein Ziehen |
| Wischen an der Rezeptkarte (`_rcardHdCheck`, nur in Muttis) — prüfen, ggf. übernehmen | kern | 1 | fehlt |
| `_tddPendingMove` / `_tddPendingEnd` (nur in Muttis, Ziehen und Ablegen) — prüfen, ggf. übernehmen | kern | 2 | anders · Ziehen neu gebaut mit Zeiger-Ereignissen: Kategorien, Ordner, Warengruppen (smoke_neu); Karten, Zutaten und Schritte lassen sich nicht ziehen |
| Doppelte Namen erlaubt (Kennung `r.uid` statt Name) | kern | 1 | da · test/kern.test.js (alt: `smoke_doppelte_namen`) |
| Rechtschreibprüfung (SPELL-CHECK, `spellModal`) | kern | 10 | da · smoke_neu_menue, kern-helfer |
| Rezept drucken (SINGLE RECIPE PRINT), Druckansicht | kern | 11 | da · smoke_neu_menue, kern-druck |
| Swipe zwischen Bildschirmen, Zurück-Taste Android/Maus | kern | 1 | teils · Zurück-Taste da (smoke_neu); Wischen gibt es nur in der Kochansicht, nicht zwischen den Bildschirmen |
| Tastenkürzel (KEYBOARD SHORTCUTS) | kern | 1 | teils · Esc und Pfeiltasten (smoke_neu); Strg+K, Strg+N, Strg+M, Strg+Z fehlen |
| Wortkarte | kern | 3 | da · ohne Probe · Synonyme in `kern/suche/bedeutung.mjs` (alt: `smoke_wortkarte`, stürzt schon auf main ab) |
| **neu:** Kochansicht im Vollbild (ein Schritt groß, Wischen/Pfeiltasten, Bildschirm bleibt an, Zutaten des Schritts) | kern | 6 | da · smoke_neu |

## 2 · Kategorien und Ordner (`sc-folders`)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Feste Kategorien (`CATS`, 16 inkl. Getränke) mit 8 Sprachen | kern | 2 | da · test/kern.test.js, smoke_neu · 18 Kategorien in 8 Sprachen |
| Kategorien umbenennen, eigenes Symbol (im Kern: Symbol aus dem SVG-Satz statt Emoji) | kern | 2 | da · smoke_neu · das Zeichen ist ein Emoji oder ein Foto aus der Kategorie, nicht aus dem SVG-Satz (alt: `smoke_kategorien`) |
| Kategorie löschen / zusammenlegen / neu anlegen (`katAnlegen`, `CATS_AUS`) | kern | 2 | da · smoke_neu, test/kern.test.js (alt: `smoke_kategorien`) |
| Kategorien umsortieren (Leiste + Baum, Maus + Langdruck) | kern | 2 | da · smoke_neu · gezogen wird in Einstellungen → Kategorien, die Leiste folgt (alt: `smoke_kategorien`) |
| Fremde Kategorien (`catsFremd`, `KAT_FAMILIE` 18 Kennungen), „Ohne Kategorie“ | kern | 2 | da · test/kern.test.js, smoke_neu (alt: `smoke_kategorien`) |
| Kategorie zuordnen aus der Rezeptzeile | kern | 2 | da · smoke_neu · über die Werkzeuge am Rezept (alt: `smoke_kategorien`) |
| Ordner anlegen/umbenennen/löschen (`FD`), Ordner-Baum, `ordnerVonRezept` | kern | 2 | da · smoke_neu_ordner, kern-ordner (alt: `smoke_kategorien`) |
| Ordner und Kategorie getrennt (`r.folder` ≠ `r.cat`) | kern | 2 | da · smoke_neu_ordner (alt: `smoke_kategorien`) |

## 3 · Suche

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Volltextsuche, mehrere Begriffe (SEARCH) | kern | 3 | da · smoke_neu, test/kern.test.js (alt: `smoke_a5_suchfeld_multiquery`) |
| Bedeutungssuche (semantisch, offline, opt-in, `mrSemOn`) | kern | 3 | da · smoke_neu · das Sprachmodell ist in der Probe nachgestellt |
| KI-Richter für Suchtreffer (`mrJudgeOn`) | kern | 10 | da · smoke_neu_zusatz, kern-richter |

## 4 · Sicherung und Datenübernahme (`sc-backup`)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| JSON-Export (v10, `r.uid`, `knoten`) | kern | 4 | da · smoke_neu · jetzt Fassung 11 mit `r.uid` und Block `kategorien`; `knoten` bleibt leer (alt: `smoke_herkunft`) |
| JSON-Import mit Zusammenführen (`_zusammenfuehren`, Ordner mit, Dubletten an `uid`) | kern | 4 | da · smoke_neu, test/kern.test.js (alt: `smoke_herkunft`) |
| Kategorie-Zuordnung beim Import (`_showCatMapDialog`) | kern | 4 | anders · kein Dialog: unbekannte Kategorien bleiben als eigene, die Meldung nennt die Zahl „ohne Kategorie“ (smoke_neu; alt: `smoke_kategorien`) |
| JSON-Sanitizer für KI-Antworten | kern | 9 | da · kern-ki |
| Herkunft am Rezept (`r.herkunft`, Kette ≤ 5, nur Kennung) | kern | 4 | teils · `r.herkunft` bleibt beim Lesen erhalten; gestempelt und vereint wird nicht, die Sicherung trägt keinen Knoten (alt: `smoke_herkunft`) |
| Tresor: mehrere Sicherungen in IndexedDB (`MeinRzBackup1`, BACKUP VAULT) | kern | 4 | da · smoke_neu, smoke_neu_zusatz, kern-alt-tresor · neuer Tresor im Kern-Speicher; die Stände der alten App kommen einmal herüber |
| Wiederherstellen-Dialog beim Start, wenn localStorage weniger Rezepte hat | kern | 5 | anders · kein Dialog beim Start: der Bestand liegt jetzt in IndexedDB; zurück geht es von Hand über Tresor oder Datei |
| JSON aus Downloads laden | kern | 4 | da · smoke_neu · „Sicherung einlesen“ |
| iOS-Erinnerung an Export | kern | 4 | fehlt |
| Persistenten Speicher anfordern | kern | 4 | da · ohne Probe |
| **neu:** Übernahme aus `localStorage` (`mrz9m`, `mms9m`, `mfd9m`, `mrzcats9m` … bzw. Muttis `mrz9` …) in IndexedDB, nichts löschen | kern | 5 | teils · Rezepte, Wochenplan, Ordner, Kategorien, Sprache, Schlüssel kommen mit (smoke_neu, smoke_neu_ordner, test/kern.test.js); **die Bilder der Rezepte nicht** (die alte App hält sie getrennt in IndexedDB `MeinRzBackup1` unter `mrz9m_imgs`, gelesen wird nur `localStorage`); Farbe, Schriftgröße, Kontrast, Tipps auch nicht |
| **neu:** Übernahme aus `.json`-Sicherungen alter Fassungen | kern | 5 | da · test/kern.test.js, smoke_neu |

## 5 · Einkaufsliste und Wochenplaner (`sc-menu`, Overlay `#mv`)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Einkaufsliste, zusammengefasst nach Warengruppen, Einheiten vereinheitlicht | kern | 7 | da · smoke_neu, test/kern.test.js |
| Wochenplaner: Wochen blättern, Gang hinzufügen (AddSlot, `courseSheet`), Slots ziehen | kern | 8 | teils · Wochen blättern, Gericht je Tag planen und herausnehmen (smoke_neu); Gänge und Mahlzeiten je Tag und das Ziehen der Einträge fehlen |
| Menü-Ansicht (MENU VIEWER), Menü drucken | kern | 8 | teils · Wochenplan und Einkaufsliste als Ansichten da (smoke_neu); Menü oder Liste drucken fehlt (`druckListe` liegt im Kern, die App ruft es nicht) |
| Wochenplan zurücksetzen | kern | 8 | fehlt |
| Zähler-Abzeichen (BADGE) | kern | 7 | da · smoke_neu · Zahl der offenen Posten an „Einkauf“ |

## 6 · Import (Overlay `importOv`: Bild, Scan, Text, Web, JSON, Bild-KI)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Bild-Import (IMAGE IMPORT), Kompression Stufe 1 | kern | 9 | teils · ein Foto je Rezept, verkleinert (Formular, Bild-Blatt, Bilder-Ordner; smoke_neu); mehrere Bilder auf einmal einlesen und zuordnen fehlt |
| Kamera-Foto herunterrechnen statt abweisen (`bildFuersNetz`) | kern | 9 | da · smoke_neu_scan, kern-ki (alt: `smoke_kamera_bild`) |
| KI-Scan einzeln und Stapel (Claude / Mistral-OCR, Modi schnell/standard/profi) | kern | 10 | da · smoke_neu_scan, kern-ki · die Antworten der KI sind in der Probe gestellt |
| Reinigung vor der KI (PDF als Seitenbild 300 dpi, versteckter Text, Metadaten), Prüfen auf Knopfdruck | kern | 10 | da · smoke_neu_scan, kern-ki (alt: `smoke_reinigung`) |
| Text-Import (TXT-SETUP, Mistral-OCR) | kern | 9 | teils · eingefügten Text ohne KI aufteilen (smoke_neu, test/kern.test.js); PDF und Foto mit Mistral-OCR laufen über den Foto-Scan; eingefügten Text mit KI lesen gibt es nur im Web-Weg |
| Web-Import (Rezept + Bild von Webseite, Kategorie raten) | kern | 9 | da · smoke_neu_web, kern-web (alt: `smoke_web_import`) — **ohne** öffentliche Weiterleiter (allorigins, codetabs): im Browser Hinweis, „Seite öffnen“ und Einfügen; Capacitor-HTTP kommt erst mit der APK; die Kategorie wird nur gesetzt, wenn ihr Name auf der Seite steht |
| Datei-Import (JSON) | kern | 9 | da · smoke_neu |

## 7 · KI (nur mit eigenem Schlüssel)

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Schlüssel Anthropic / OpenAI / Mistral speichern, prüfen, löschen | kern | 10 | da · smoke_neu_scan, kern-ki (alt: `smoke_schluessel_loeschen`, `smoke_b3_safe_secret`) |
| Schlüssel-Einführung (Wizard, `?setup=1`) | kern | 10 | anders · das Schlüssel-Fenster erscheint, wenn ein Schlüssel gebraucht wird, mit „Schlüssel holen“ (smoke_neu_scan); kein Wizard, kein `?setup=1` |
| Zugangscode-Erklärung | kern | 10 | da · smoke_neu · hinter „?“ im Schlüssel-Fenster (alt: `smoke_zugangscode_erklaerung`) |
| KI-Bild (DALL·E 3, eine Naht, Warteschlange, Bildcache Stufe 3) | kern | 10 | da · smoke_neu, smoke_neu_zusatz, kern-bild-sammel (alt: `smoke_ki_bild`) |
| Gratis KI-Foto (Pollinations, ohne Schlüssel) | kern | 10 | da · smoke_neu prüft nur den Knopf, der Abruf ist ungeprüft — der Hinweis „der Name geht an Pollinations“ steht vor dem Senden |
| Bildauftrag einmal anhalten bei KI-Anweisung | kern | 10 | da · smoke_neu_zusatz (alt: `smoke_reinigung`) |
| AI-Panel (Rezept verbessern, Varianten) | kern | 10 | anders · Planer → „Vorschlag“: Claude verteilt eigene Rezepte auf die Woche (smoke_neu_zusatz, kern-helfer); den Auftrag zum Kopieren für eine fremde KI gibt es nicht mehr |
| Übersetzung von Rezepten (TRANSLATION ENGINE, `r.translations`) | kern | 10 | da · smoke_neu_sprache, kern-helfer |
| Nährwerte (`r.nutrition`), Geschmacksprofil (`r.flavors`) | kern | 10 | teils · Nährwerte da (smoke_neu_menue, kern-helfer); der Geschmack (`r.flavors`) wird gespeichert und durchsucht, aber nicht gezeigt |

## 8 · Teilen und Bücher

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Rezept teilen (QR-Code + Web Share) | kern | 11 | da · smoke_neu_menue, kern-qr |
| PDF-Buch (PDF BOOK EXPORT, Cover-Helfer) | ausgabe | 12 | da · smoke_neu_zusatz, smoke_kern_buch, kern-buch · über den Druck des Browsers |
| Flipbook-Export | ausgabe | 12 | da · smoke_kern_buch, smoke_neu_zusatz · „Buch zum Blättern“ als HTML-Datei |
| KI-Kreativbuch (Blätterbuch, Stil-System, Seiten 1–3, Kosten-Hinweis `kbCostOv`) | ausgabe | 12 | da · smoke_neu_kreativbuch, kern-kreativbuch · Einstellungen → Buch → Kreativbuch; Texte von Claude je Rezept (sechs Felder der alten App), acht Stile, je Rezept bis zu drei Seiten, Kosten vorab, Lauf abbrechbar |
| Eigenes Kreativbuch aus Bildern | ausgabe | 12 | fehlt |
| KI-Buch (`aiBookOv`, `kbkResize`) | ausgabe | 12 | fehlt |
| Food-Zine (Galerie, Prompt-Generator, Bild+Text in Zwischenablage) | ausgabe | 12 | da (0.14.6) · drei Seiten, Auftrag kopieren (mit und ohne Foto), Bild einsetzen oder mit OpenAI-Schlüssel erzeugen, Stil, Galerie (smoke_neu_zine) |
| KI-Zine (`zineOv`) | ausgabe | 12 | fehlt · das Food-Zine ist da (0.14.6); das KI-Zine der alten App ist nicht nachgebaut |

## 9 · Einstellungen (`sc-settings`) und Rahmen

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| Sprache: 8 Sprachen (`LANGS`, `T(k)`), erste Wahl folgt dem Gerät | kern | 1 | da · smoke_neu_sprache, smoke_kern_sprachen, kern-sprachen (alt: `smoke_einstellungen_sprache`) |
| Themen (THEME, `mtheme9m`) → **eine** warme Palette hell/dunkel je Ausgabe | kern | 1 | anders · neun Farben, je hell und dunkel (smoke_neu) |
| Barrierefreiheit: Schriftgröße, hoher Kontrast (`a11ySize9m`, `a11yHc9m`) | kern | 1 | da · smoke_neu (Schrift-Regler), smoke_neu_zusatz (hoher Kontrast) |
| Tipps aus/an (`tipsOff9m`), Tooltips | kern | 1 | da · smoke_neu · Hinweis-Blasen an und aus, Erklärungen hinter „?“ |
| Handbuch (`manualOv`), Hilfe (`helpOv`), Cache-Hilfe (`cacheOv`) | kern | 1 | teils · Handbuch da (smoke_neu_zusatz); die Cache-Hilfe fehlt |
| PWA: Installieren (Kopf + Einstellungen), Update-Banner, Manifest-id | kern | 1 | teils · Manifest-id und Offline-Vorrat da (smoke_neu; alt: `smoke_manifest_id`); „Installieren“ steht nur in den Einstellungen und nur, wenn der Browser es anbietet; kein Knopf im Kopf, kein Update-Banner |
| Boot-Fortschritt, Startbild | kern | 1 | anders · ein Wartesatz, dann sofort Inhalt; die Zeit bis zum ersten Inhalt ist nicht gemessen |
| Toast-Meldungen | kern | 1 | da · smoke_neu, smoke_neu_zusatz |
| App-Bewertung (`appRatings9m`) | entfällt | – | entfällt · Store-Bewertung statt eigener |
| Einklappbare Navigation | entfällt | – | entfällt · ersetzt durch die fliegende Leiste (Handy) und die Seitenleiste (Monitor) |
| Debug-Konsole Eruda (`eruda9`) | entfällt | – | entfällt · nicht in der neuen Fassung |
| `_CR`-Wasserzeichen (`_cr_block.txt`, `build.py`) | offen | – | fehlt · Klaus entscheidet, ob im Kern |

## 10 · Netz-Module

| Funktion | Ziel | Stufe | Im Kern / Probe |
|---|---|---|---|
| SBKIM-Module 00–08, 15–18, 23 (`sbkim/`), Briefkästen, Spore, `status.json` | **eingebaut, nicht geladen, unsichtbar** | – | entfällt · so gewollt: kein Netzverkehr, nichts zu sehen; geladen werden nur Modul 03 und 04, wenn die Sinn-Suche eingeschaltet wird (smoke_neu). Einen Weg zum Freischalten gibt es in `neu/` noch nicht (später von Hand, eigenes Kochnetzwerk, Klaus 23.11.) |
| Mycel / Rendezvous-Panel, Gerätename | **eingebaut, nicht geladen, unsichtbar** | – | entfällt · wie SBKIM: nicht geladen, nicht zu sehen |
| KI-Richter-Prüfliste (`04_match.js`) | **nicht Store** | – | anders · der KI-Richter der Suche sitzt im Kern und läuft nur mit Prüfliste (kern-richter, smoke_neu_zusatz) |
| `test/sbkim.test.js` | **nicht Store** | – | entfällt · läuft weiter für die alte App |

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
| **Werkstatt** als fünfter Bereich: Bücher, Import, KI-Helfer, Tresor, Einstellungen an einem Ort | kern (Rahmen) | 1 | da · smoke_neu · der Bereich heißt „Einstellungen“ (Klaus 23.11.); der Import liegt hinter „+“ |
| Blatt hinter **+**: alle Wege zu einem neuen Rezept; Menü **⋮** am Rezept: Übersetzen, Nährwerte, Rechtschreibung, Foto, Food-Zine, QR, Drucken | kern | 1 | da · Blatt und Menü samt Food-Zine (smoke_neu, smoke_neu_menue, smoke_neu_zine) |
| **Rezeptpakete**: JSON im Format der Sicherung (v10, mit Bildern), Katalog in der App, Laden nur auf Tippen | kern | 5 | teils · das Beispielbuch und das Food-Zine-Paket laden auf Tippen, mit Prüfsumme (smoke_neu, smoke_neu_zine); einen Katalog zur Auswahl gibt es nicht |
| **Beispielbuch** (~54 MB) beim ersten Start anbieten, nicht ungefragt laden | ausgabe | 5 | da · smoke_neu · 42 Rezepte, rund 10 MB, nur auf Tippen; dazu acht Startrezepte beim ersten Start ohne Frage (Klaus 23.11.) |
| Pakete prüfen vor dem Einlesen: Prüfsumme aus dem Katalog, Bilder neu kodiert (ohne Metadaten), nur bekannte Felder | kern | 5 | teils · die Prüfsumme wird vor dem Einlesen nachgerechnet (ohne Probe in der App; ausgabe.test prüft den Katalog); Bilder werden nicht neu kodiert, unbekannte Felder bleiben |
| Pakete mit fertigen Übersetzungen (`r.translations`), damit ohne KI-Schlüssel auch andere Sprachen gehen | kern | 5 | teils · eine Übersetzung am Rezept wird gezeigt (smoke_neu); im Beispielbuch tragen nur 2 von 42 Rezepten eine |
| **Tresor-Garantie**: Sicherung zusätzlich als Datei im Gerät (Capacitor Filesystem, Ordner Dokumente), Erinnerung nach Änderungen, Probe Export → Import byte-gleich | kern | 4 | teils · Tresor und Sicherung als Datei da (smoke_neu; test/kern.test.js: schreiben und lesen ergibt dasselbe); die Ablage im Geräte-Ordner (Capacitor) und die Erinnerung nach Änderungen fehlen |

## 12 · Abgleich Mein Mixarium (für Sitzung B)

| Funktion im Mixarium | Vorschlag | Begründung | Stand neue PWA |
|---|---|---|---|
| **Mix-Labor** (`lab*`, 25 Funktionen): KI erfindet ein Getränk aus Kategorie, Geschmack und Wunsch-Zutaten; Lebenszyklus experimentell → in Bewertung → akzeptiert; 4 Bewertungsachsen (Geschmack 40 %, Umsetzbarkeit 25 %, Originalität 20 %, Beschreibung 15 %); Warnung → KI-Überarbeitung → Rauswurf; Favorit-Schutz, Einzelpersonen-Modus, Protokoll | **kern-Modul `labor`**, ein- und ausschaltbar je Ausgabe | Ablauf und Bewertung sind nicht getränkeabhängig; Kategorien, Geschmacks-Tags und Prompt kommen aus der Ausgabe. Im Mixarium an, im Rezeptbuch als „Küchen-Labor“ möglich (Klaus entscheidet) | anders · das Labor liegt im Mixarium (`getraenke/labor.mjs`), nicht im Kern; im Rezeptbuch gibt es kein Labor |
| Bekannte Drinks entdecken (TheCocktailDB) | nur Mixarium | Netz nur auf Knopfdruck, eigene Datenquelle | entfällt · nur Mixarium |
| Schalter „ohne Alkohol“ (`mxNoAlc9`) | nur Mixarium | Getränke-Schicht | entfällt · nur Mixarium |
| 8 Themen | ersetzt | eine Palette hell/dunkel je Ausgabe (Brief) | anders · neun Farben, je hell und dunkel (smoke_neu) |

## 13 · Abnahme der Vorschau (Klaus 23.11., zweite Runde)

| Punkt | Entscheid | Folge für den Kern | Stand neue PWA |
|---|---|---|---|
| 1 Farbpalette | ja | Wasserfarben der Privaten Akte + Hellbraun/Dunkelbraun, Farbscheibe, je Ausgabe gemerkt | da · smoke_neu |
| 2 Leiste | Flying Widget **wie Private Akte** | Griff, langer Druck oder Ziehen, Einrasten links/rechts/oben/unten, Lage gemerkt; Knöpfe schmal; keine untere Menüleiste am Handy | teils · Griff, langer Druck oder Ziehen, Lage gemerkt (smoke_neu); sie rastet links, rechts und unten ein, oben nicht |
| 3–5, 7, 8 | ja | Startseite, Rezept, Kochansicht, Planer, Muttis-Ausgabe wie gezeigt | da · smoke_neu, smoke_neu_zusatz (Muttis-Ausgabe) |
| 6 Einkaufsliste | ja, plus **Gruppen verschiebbar** | Reihenfolge der Warengruppen je Laden, langer Druck oder Maus festhalten | da · smoke_neu |
| 9 Symbole | **Phosphor Duotone** | nur genutzte Symbole ins Paket | da · smoke_neu |
| 10 App-Zeichen | Web-App Mein = goldenes Buch bleibt; drei neue Zeichen per ChatGPT | `docs/vorschau/app-zeichen-auftraege.md`; APK und Windows je Ausgabe gleich | teils · das goldene Buch der Web-App ist da; die drei neuen Zeichen fehlen (die Aufträge liegen vor) |
| 11 Extras, 12 Pakete | ja | wie gezeigt | teils · Menü am Rezept da (smoke_neu_menue); bei den Paketen nur das Beispielbuch |
| neu 13 | Alles hinter + | Import-Blatt mit Reitern: Selbst, Foto-Scan, Web, Text/PDF, Vom Teller, Datei, Pakete, KI-Foto | da · smoke_neu, smoke_neu_scan, smoke_neu_web · sechs Kacheln; „Vom Teller“ und PDF stehen im Foto-Weg, das KI-Foto im Bild-Blatt |
| neu 14 | Bild anpassen | Bildausschnitt (heute `openCrop`): ziehen, Zoom, Höhe, Lagen, Vorschau Karte/Kopf/Liste; anderes Bild per Kamera, Datei, KI, Gratis, Food-Zine | teils · Ziehen, Zoom, Lagen, Vorschau Karte und Kopf, Kamera, Datei, KI, Gratis da (smoke_neu); Food-Zine da (smoke_neu_zine); „Höhe“ und die Vorschau „Liste“ fehlen |
| neu 15 | Food-Zine | drei Seiten, Auftrag ohne Schlüssel kopieren, Bild einsetzen oder mit Schlüssel erzeugen, Stil, Galerie | da (0.14.6, smoke_neu_zine) |
| Regel | **keine Funktion auslassen** außer SBKIM und Mycel | gilt für die ganze Liste oben | teils · offen sind die Zeilen mit „fehlt“ und „teils“ |

## 14 · Abgleich mit dem Mixarium und dritte Runde (Klaus 23.11.)

Klaus hat zu den zehn Punkten der Mixarium-Sitzung und zu Punkt 16 Ja gesagt. Brief dazu: `docs/BRIEF_2026-11-23_REZEPTBUCH-AN-MIXARIUM.md`.

| Baustein | Ziel | Hinweis | Stand neue PWA |
|---|---|---|---|
| Verlaufs-Knöpfe (Wasserfarbe statt Vollton), Maße 36/34/28/30, Kochansicht 46 | kern | | da · ohne Probe · 36, 34, 28 und 46 px im Stil gefunden |
| Leiste: Griff 12 × 64, Knöpfe 34 px, Fach ≤ 180 px, 24 px Rand auf der Griff-Seite | kern | | da · ohne Probe · Griff 12 × 64 und Knöpfe 34 px im Stil gefunden; Fach und Rand nicht nachgemessen |
| Kopf: eingeklappt Name, +, Pfeil; ausgeklappt Suche, Farbe, Sprache, Notizen, Einstellungen | kern | | anders · am Handy Name, Suche, Farbe und Plus, kein Pfeil; alles andere steht in der fliegenden Leiste (Klaus 23.11. abends; smoke_neu). „Notizen“ gibt es nicht |
| Sprache folgt dem Gerät, kein Kürzel; Inhalte nur mit KI (eigener Schlüssel), ganze Sammlung oder einzelnes Rezept, keine Zusatzzeile; Weltkugel am Rezept; Einheiten metrisch/US | kern | | da · smoke_neu_sprache, smoke_neu_menue |
| Kochansicht: Foto, Schritt, Zutaten, Wecker, gezeichnete Geräte; Kopf klappt auf Fortschrittslinie | kern | Geräte aus dem Schritttext erkannt, von Hand ergänzbar; Geräteliste erweiterbar je Ausgabe | teils · alles da (smoke_neu) bis auf: Geräte von Hand ergänzen |
| Schriftgröße der Kochansicht in den Einstellungen | kern | | da · smoke_neu · ein Regler für die ganze App, auch beim Kochen |
| „Nur dieses Rezept“ am Monitor | kern | | da · smoke_neu |
| Beispiel-Paket: Web-App auf Tippen, APK und Windows im Paket | kern | | teils · Web-App auf Tippen da (smoke_neu); APK und Windows sind nicht gebaut (erst nach Klaus’ Go) |
| Kreativbuch (Punkt 16): 8 Stile, Kosten vorab, mit Schlüssel oder Auftrag kopieren, Blätterbuch, PDF, HTML, Rezeptbild, eigenes Buch aus Bildern, Projekte | ausgabe, Gerüst im kern | Stile als erweiterbare Liste | teils · 8 Stile (`kbStilDazu` erweitert), Kosten vorab, mit Anthropic-Schlüssel oder Auftrag kopieren und Antwort einsetzen, Blättern in der App, PDF, HTML, Rezeptbild auf der ersten Seite (smoke_neu_kreativbuch); „eine Seite als Rezeptbild“, eigenes Buch aus Bildern und Projekte fehlen |
| Erklärtexte hinter „?“ | kern | | da · smoke_neu |
| Spracheingabe in allen größeren Textfeldern | kern | Android: nativer Baustein wie Familienakte (`ProSpeech`); Windows offen | teils · Mikrofon an Suche, Formular, Text-Import und Einkauf (kern-diktat prüft die Textlogik; im Browser ist kein Diktat gefahren); der native Android-Baustein fehlt |
| Notizbuch mit Kalender und Erinnerungen (wie Private Akte) | kern, gepinnter Klon | Benachrichtigungen am Handy nötig | fehlt |
| Bedeutungssuche aus SBKIM lösen, Modell ins Paket, Grenze 120 Rezepte aufheben | kern | gemessen 23.11. | teils · die Grenze von 120 Rezepten ist weg (smoke_neu); Modul 03 und 04 kommen weiter aus `sbkim/`, das Sprachmodell lädt beim ersten Einschalten aus dem Netz |
| Fehler „nur die Suche findet“ (`blank: true` mit Namen, Kennungen mit Leerzeichen oder Großschreibung) | kern | beim Laden und Import bereinigen; Probe: alles, was die Suche findet, steht auch in „Alle“ | da · test/kern.test.js, smoke_neu |

## 15 · Beispiele, Löschen und Bilder-Ordner (Klaus 23.11.)

| Funktion | Ziel | Hinweis | Stand neue PWA |
|---|---|---|---|
| Eigene Kategorien kommen mit Name, Symbol, Umbenennung und Reihenfolge **in die Sicherung** (Block `kategorien`) | kern | Ursache des Sushi-Fehlers: die alte App speicherte sie nur im Browser | da · smoke_neu, test/kern.test.js |
| Kategorien anlegen, umbenennen, löschen, zusammenlegen, verschieben, Rezepte von Hand zuordnen | kern | alle Funktionen der alten App bleiben | da · smoke_neu |
| Beispiel-Rezepte und -Bilder tragen eine Marke; **„Beispiele entfernen“** mit einem Klick, eigene Rezepte bleiben | kern | | da · smoke_neu |
| **Alle Rezepte löschen**, einzelne Rezepte löschen, jeweils mit Rückfrage und Rückgängig | kern | | teils · „Alle Rezepte löschen“ mit Rückfrage, Tresor und Rückgängig (smoke_neu); ein einzelnes Rezept wird ohne Rückfrage gelöscht, mit Rückgängig |
| **Bilder-Ordner** in der Werkstatt: Vorschau klein/groß, mehrere anhaken, löschen, einfügen, Filter Rezeptbilder/Food-Zine/Beispiele, „Alle Bilder löschen“ | kern | ein Rezept ohne Bild behält seinen Text | da · auch der Filter „Food-Zine“ (smoke_neu, smoke_neu_zine) |
| Food-Zine-Beispiele nur als vollständige Sätze (3 Seiten) | ausgabe | einzelne Seiten nicht | da · nur vollständige Sätze, auf Tippen geladen (smoke_neu_zine) |
