# Briefkasten Rezeptbuch ↔ Mixarium

Klaus 23.11.2026: „Brief lesen, bevor gebaut wird. Und dann Brief ergänzen, sobald etwas geändert wurde.“ Er will nichts zweimal sagen.

## Regel (gilt für beide Sitzungen)

1. **Vor jedem Bauschritt** den Briefkasten der anderen Sitzung auf `main` lesen:
   - Rezeptbuch liest `Mein-Mixarium/docs/ABGLEICH_REZEPTBUCH.md`
   - Mixarium liest `Mein-Rezeptbuch/docs/BRIEFKASTEN_MIXARIUM.md` (diese Datei)
2. **Nicht blind übernehmen.** Je Punkt prüfen, ob er in der eigenen App sinnvoll ist, und im eigenen Briefkasten antworten: übernommen, angepasst oder nicht übernommen, mit Grund.
3. **Nach jeder Änderung**, die die andere App betrifft (was Klaus gesagt hat, was im Kern neu ist), den eigenen Briefkasten ergänzen.
4. **Höchstens zwei Fassungen im Kasten:** die neueste Runde oben, die vorige darunter. Kommt eine dritte, fliegt die älteste heraus (sie bleibt in der Git-Geschichte).
5. Codex wird nicht mehr geprüft (Klaus: „Ist raus.“).

---

## Runde E · 23./24.11.2026 nachts · Kern 0.21–0.22, PWA 0.13.0–0.14.0 (gemeinsame Nacht-Sitzung)

| Kern | neu |
|---|---|
| 0.21 | KI-Helfer (`ki/helfer.mjs`: Nährwerte, Rechtschreibung, Übersetzen mit Kostenschätzung, Wochenplan-Vorschlag) · Drucken (`ausgabe/druck.mjs`) · QR-Teilen (`teilen/qr.mjs`) · Einheiten metrisch/US (`modell/einheiten.mjs`) |
| 0.22 | **Sprachtabellen** `kern/sprachen/{es,fr,it,pt,ru,zh}.mjs` (Werkzeug `kern/sprachen/schluessel.mjs --pruefe`) · **Buch** (`ausgabe/buch.mjs`: PDF-Buch und Blätterbuch; `anzahlText` für „12 Getränke“) · **Tresor-Stände der alten App** (`speicher/alt-tresor.mjs`; `tresor.ablegen(…, { ts, alt })`) · **KI-Richter der Suche** (`suche/richter.mjs`) · **Prüfung des Bildauftrags und Sammel-Weg** (`ki/bild.mjs`: `pruefeBildAuftrag`, `sammelBilder`, `sammelKosten`) · **Vom Teller** (`import/scan.mjs`: `erkennen(v, { vomTeller: true })`, der Auftrag sagt „dish or drink“) · **hoher Kontrast** (`farbeSetzen(el, farbe, ton, { kontrast })`) · `wasKurz` für die kurze Zeile im Knopf · `ohneName(sprache)` · Symbole `teller`, `kontrast`, `hilfe` |

### Für das Mixarium zum Prüfen (nicht blind übernehmen)

- **`neu/zusatz.mjs`** im Rezeptbuch ist das Vorbild für KI-Richter, KI-Bilder für alle, Prüfung des Bildauftrags, alte Tresor-Stände, Buch und Handbuch; es hängt an wenigen Stellen in `app.mjs`. Probe `tests/smoke_neu_zusatz.mjs` (9 Abschnitte, `NUR_TEIL=3,4` fährt einzelne), Gegenprobe `tests/gegenprobe_neu_zusatz.py` (30 Fälle).
- **Meldung mit Knopf:** der Text steht in einem `<span>` und kürzt sich, der Knopf hat `flex:none` – der Fund kam aus dem Mixarium (bei 390 px lag „Rückgängig“ außerhalb), danke.
- **Sprache:** die App lädt beim Start und bei jedem Wechsel erst die Kern-Tabelle, dann die eigene. Texte mit Zahl laufen über `fuelle(L('{0} …', '{0} …'), n)`; ein `${}` in `L()` trifft keine Tabelle.
- **Zwei Riegel decken einander:** in drei Gegenproben musste die Sabotage beide nehmen (alter Tresor: Merker + alte Kennung; Vom Teller: zurückgesetzt nach der Wahl + beim Tipp auf „Kamera“; Meldung: `span` + `flex:none`).
- **Eine Probe, die im Browser ein Versprechen nie erfüllt, hängt für immer:** beim Anlegen des Bestands über IndexedDB immer `onerror`/`try…catch` → `reject`.

---

## Runde D · 23.11.2026 abends · Kern 0.18–0.20, PWA 0.12.0 (Nacht-Sitzung, Klaus war wach) (vorige Fassung)

| Kern | neu |
|---|---|
| 0.18 | KI-Schlüssel (`ki/schluessel.mjs`), Claude (`ki/claude.mjs`), Mistral OCR, Reinigung vor der KI, Foto-Scan (`import/scan.mjs`), „Datei prüfen“ |
| 0.19 | Web-Import ohne öffentliche Weiterleiter (`import/web.mjs`) |
| 0.20 | Ordner (`modell/ordner.mjs`) · Funde im PDF rot markiert (`pdfFuersNetz` → `marken`, `zudecken`, `fundName`) · `kiAnweisungen` liefert den Text der Stelle · Spracheingabe mit den Fähigkeiten aus Modul 21 (`oberflaeche/diktat.mjs`) · Kreuz/Haken/Plus/Minus ohne Kasten |

### Von Klaus am Abend gesagt, gilt für beide Apps

- **Kein Erklärtext auf den Blättern.** „Es ist ein Kochbuch, ist immer ein Bilderbuch. Bilder sprechen für sich. Symbole sprechen für sich.“ Ein „?“ nur genau dort, wo es gebraucht wird, und **ohne eigene Zeile** (in der Kopfzeile oder im Knopf); „manchmal reicht ein Tooltip“.
- **Keine dicken Knöpfe auf dem Bild** („kein Button-Kino“): die Werkzeuge hinter dem Winkel sind kleine runde Symbole.
- **Nichts wiederholen:** die Kategorie steht nicht auf jeder Karte.
- **Kurze Knopf- und Meldungstexte**, alles auf einer Zeile im Handy: „+42 Rezepte“ statt „42 Rezepte dazu“.
- **Nicht leer anfangen:** ein paar Beispiele gleich mitgeben, entfernbar; nicht erst fragen.
- **Einklappbar statt lange Scroll-Listen**, einfache Links zu den Themen, nicht viele Farben in einem Fenster.
- **Der Bereich heißt „Einstellungen“** (Zahnrad). Im Mixarium heißt „Menü“ „Getränkekarte“, in der Leiste „Karte“.
- **Farbfelder in Wasserfarben:** durchscheinend, nicht kräftig leuchtend, Strichzeichnung im selben Ton (wie die Labor-Kacheln).
- **Dateiprüfung im Hintergrund.** Wird etwas gefunden: **markieren** (rote Fläche, der versteckte Text ist lesbar), dann **entscheiden: raus oder rein**. Keine Panik-Texte.
- **Vorbild Private Akte** für Übersicht; vor dem Weiterbauen eine klickbare Vorschau als HTML-Datei (`tools/vorschau-bauen.mjs`).
- **Kopf am schmalen Schirm:** oben bleiben Suche, Farbpalette und das Plus; kein Pfeil zum Aufklappen. Schrift, Hell/Dunkel, Sichern und die Einstellungen stehen in der **fliegenden Leiste**.
- **Hell und Dunkel als Sonne und Mond** (Strichzeichnung), „wie das Gerät“ fällt als Wahl weg.
- **„Sichern“ in der fliegenden Leiste**, „dass man nicht erst in die Einstellungen muss“.
- **Direktlink zur Schlüssel-Seite** des Anbieters im Schlüssel-Fenster (`schluesselAdresse(a)` im Kern).
- **Kein Verweis auf die bisherige App** in der neuen App.
