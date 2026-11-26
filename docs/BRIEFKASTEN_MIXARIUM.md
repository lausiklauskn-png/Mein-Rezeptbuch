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

## Runde K · 26.11.2026 · Kern 0.33.2, PWA 0.19.9 (Fotos, Doppelungen im ganzen Buch, Blättern)

| Kern | neu |
|---|---|
| 0.32 | `modell/doppel.mjs`: `findeDoppelImBuch(alle, {hash})` (ganzes Buch, jedes Rezept in höchstens einem Paar), Mengen-Regel (`mengenGleich`, gleiche Mengen in gleicher Folge = dieselbe Übersetzung), Vergleich auch über `sicht(r, sprache)` |
| 0.33 | `oberflaeche/bild.mjs`: Fotos als WebP 0.86 mit 1600 px (`BILD_SPEICHER`, `alsDatenAdresse`), `platzSparen`, `datenGroesse`, `aufloesung` |
| 0.33.1 | `mengenGleich` zählt erst ab drei verschiedenen Mengen (überall „2 cl“ machte den Virgin Mojito zum Doppel des Mojito; gefunden in der Mixarium-Probe) |
| 0.33.2 | `platzSparen` rechnet ein schon gespeichertes WebP bis 1600 px nicht noch einmal (Absicherung; die 10-%-Schwelle fing es im Test schon ab) |

- **Mixarium hat es übernommen (vor42):** „Doppelte suchen“ und „Platz sparen“ auf der Bilder-Seite, Proben `smoke_neu_doppel` (40), `scan` (56), `web` (29).
- **Klaus 26.11.:** Mixarium misst live 96 · 99 · 100 · 100. Fürs Rezeptbuch ist geplant: App zuerst, Startbilder unscharf vorab, scharf im Hintergrund.
  Neu fürs Mixarium: Getränke aus dem Rezeptbuch, die dort fehlen, und eine Kategorie **Fingerfood**. Der Verlauf im Mixarium-Bild bleibt, wie er ist.

## Runde J · 25.11.2026 spätabends · Kern 0.31.0, PWA 0.19.0 (R6 Doppelungen, Merkmale einer Variante) (vorige Fassung)

| Kern | neu |
|---|---|
| 0.31.0 | `modell/rezept.mjs`: `rezeptVerschieben(rezepte, uid, zielUid, nach)` (eigene Reihenfolge, R5) |
| 0.30.0 | `modell/doppel.mjs`: `vergleiche`, `findeDoppel(alle, neue, { hash })` (Name bereinigt, Zutaten mit Wortformen, Bild-Fingerabdruck dHash 9×8 von der App), `wendeAn(alt, neu, wahl)` mit `meins · bild · text · ganz · beide`; `alkoholArt`, `sindVarianten`; `MERKMALE` (vegan, laktosefrei, glutenfrei), `merkmaleVon`, `merkmalUmschalten` |

- **Klaus' Regeln (25.11.):** „mit Alkohol“ und „alkoholfrei“ sind **nie** ein Doppel (Feld `alcohol` oder Wörter wie alkoholfrei, Virgin,
  Mocktail); ebenso zwei Rezepte mit **verschiedenen Merkmalen** (die laktosefreie Variante bleibt neben dem Original). Gezeigt werden „sicher“
  (Vorgabe „Meins behalten“) und „vielleicht“ (Vorgabe „Beide behalten“).
- **R5 (PWA 0.19.0, nur `neu/`):** Karte lange drücken und ziehen (umsortieren, auf Kategorie/Event-Ordner) und Wischen zwischen den
  Bildschirmen am Handy. ⚠ Fürs Mixarium prüfen: zeigt es die Getränke noch als Karussell (eine Karte sichtbar), passt das Umsortieren
  dort nicht, und das Wischen zwischen Bildschirmen stieße sich mit dem Wischen im Karussell.
- **Fürs Mixarium (beim nächsten `kern-nachziehen`):** neu, nichts Bestehendes ändert sich. Das Getränke-Feld `alcohol` wird schon gelesen;
  gemessen über alle 2072 Paare der Beispielbücher beider Apps: kein falscher Treffer. Die App-Seite (`neu/app.mjs`: `bildFingerabdruck`,
  `doppelPruefen` nach dem Einlesen und dem Stapel-Scan, `formDoppelBand` im Formular) ist übernehmbar. **Die Merkmal-Leiste NICHT** – Klaus
  25.11.: „Mixarium soll nicht betroffen sein.“ Kern 0.30.1 liest `merkmale` in Suche, Bedeutungssuche, Druck und Teilen nur, wo das Feld
  gesetzt ist; ohne Feld bleibt alles wie bisher (der Text für die Bedeutungssuche ändert sich nicht, nichts wird neu eingelesen).
