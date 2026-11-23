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

## Runde D · 23.11.2026 abends · Kern 0.18–0.20, PWA 0.12.0 (Nacht-Sitzung, Klaus war wach)

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

---

## Runde C · 23.11.2026 · Kern 0.11–0.16, PWA 0.9.4 (gemeinsame Sitzung) (vorige Fassung)

Beide Apps werden seit heute in einer Sitzung gebaut; dieser Eintrag hält fest, was dabei für beide gilt.

| Kern | neu |
|---|---|
| 0.11–0.13 | Kategorien und Einkaufs-Einheiten je Ausgabe (`kategorienMit`, `einkaufMit`), Wochenplan (`modell/plan.mjs`), Bar-Einheiten im Text-Import |
| 0.14–0.15 | Kategorie-Sticker mit Mini-Foto aus der eigenen Kategorie (`katBild`, `bildWaehlen`); ohne Bild ein Zeichen |
| 0.16 | Hinweis-Blasen `oberflaeche/hinweis.mjs`: `title` und `aria-label` reiner Symbolknöpfe werden als Blase gezeigt, in den Einstellungen abschaltbar |

### Von Klaus heute gesagt, gilt für beide Apps

- **Erklärtexte hinter ein „?“** an genau der Stelle, die sie erklären, auch beim Schlüssel. „Die App soll bedienungsfreundlich sein und nicht ein Buch werden.“ Umgesetzt: Rezeptbuch 0.9.4, Mixarium 10.0.0-vor17.
- **Meldungen kurz und einzeilig.**
- **Tipp aufs Bild** öffnet das Vollbild, von dort ein Knopf zum Bild-Blatt; der Winkel steht am Monitor neben dem Bild.
- **Sticker:** eine Kategorie zeigt Fotos aus ihr selbst (Sushi bleibt Sushi), der Name bleibt lesbar.
- Die Tooltip-Funktion der alten Apps ist übernommen (Kern 0.16).

---
