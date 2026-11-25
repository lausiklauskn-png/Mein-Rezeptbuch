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

## Runde J · 25.11.2026 spätabends · Kern 0.30.0, PWA 0.18.0 (R6 Doppelungen, Merkmale einer Variante)

| Kern | neu |
|---|---|
| 0.30.0 | `modell/doppel.mjs`: `vergleiche`, `findeDoppel(alle, neue, { hash })` (Name bereinigt, Zutaten mit Wortformen, Bild-Fingerabdruck dHash 9×8 von der App), `wendeAn(alt, neu, wahl)` mit `meins · bild · text · ganz · beide`; `alkoholArt`, `sindVarianten`; `MERKMALE` (vegan, laktosefrei, glutenfrei), `merkmaleVon`, `merkmalUmschalten` |

- **Klaus' Regeln (25.11.):** „mit Alkohol“ und „alkoholfrei“ sind **nie** ein Doppel (Feld `alcohol` oder Wörter wie alkoholfrei, Virgin,
  Mocktail); ebenso zwei Rezepte mit **verschiedenen Merkmalen** (die laktosefreie Variante bleibt neben dem Original). Gezeigt werden „sicher“
  (Vorgabe „Meins behalten“) und „vielleicht“ (Vorgabe „Beide behalten“).
- **Fürs Mixarium (beim nächsten `kern-nachziehen`):** neu, nichts Bestehendes ändert sich. Das Getränke-Feld `alcohol` wird schon gelesen;
  gemessen über alle 2072 Paare der Beispielbücher beider Apps: kein falscher Treffer. Die App-Seite (`neu/app.mjs`: `bildFingerabdruck`,
  `doppelPruefen` nach dem Einlesen und dem Stapel-Scan, `formDoppelBand` im Formular, `merkLeiste`/`merkZeichen`) ist übernehmbar; ob die drei
  Merkmale bei Getränken passen (vegan ja, laktosefrei bei Shakes, glutenfrei bei Bier?), ist vorher mit Klaus zu klären.

## Runde I · 25.11.2026 spät · Kern 0.28.1, PWA 0.16.1 (Bedienung am Rezept, Übersetzung, Bild, Seitenleiste) (vorige Fassung)

| Kern | neu |
|---|---|
| 0.28.1 | `ki/helfer.mjs`: `uebersetzeMit(rezept, ziel, uebersetzer)` (Übersetzer im Gerät, z. B. Chromes Translator-API; Form wie `uebersetze`, dazu `weg: 'geraet'`), `rateSprache(r)` (kyrillisch/chinesisch, sonst kleine Wörter; nicht eindeutig → ''), `alsUebersetzung(alt, ziel, neu)` und `alsHauptfassung(alt, ziel, neu, quelle)` (bearbeitete Übersetzung nur als Übersetzung bzw. als Hauptfassung; das bisherige Original wandert mit `original: true` unter seine Sprache, `r.sprache` = neue Sprache). Drei neue Kern-Texte in allen Tabellen. Proben `test/kern-fassung.test.js`. |

- **Fürs Mixarium (beim nächsten `kern-nachziehen`):** die vier Funktionen sind neu, nichts Bestehendes ändert sich. Wer dort „Bearbeiten“ an einer
  gezeigten Übersetzung anbietet, sollte dieselbe Frage stellen (sonst überschreibt er das Original mit fremdsprachigem Text).
- **PWA 0.16.1 (nur `neu/`, übernehmbar, jeweils prüfen):** Stift an „Zutaten“/„Zubereitung“ (an Ort und Stelle, Nummern nur Anzeige); „Einordnen“ =
  Kategorie und Ordner in einem Fenster; Bearbeiten direkt vor Löschen; Bearbeiten am breiten Schirm rechts; Tipp aufs Bild → „Bild anpassen“ im
  Vollbild mit Bildwegen unten rechts und Vorschau aus echten Maßen (im Mixarium: Getränkekarten sind hochkant – `bildMasse` misst die Karte, das
  passt dort von selbst); Vollbild-Knopf (ganze App) unten rechts im Rezeptbild statt „Nur dieses Rezept“; Seitenleiste links/rechts einrasten
  (`E.railSeite`); **Zweispaltigkeit per Container-Query** (am geteilten Schirm war die Zubereitung gequetscht – im Mixarium dieselbe Media-Query prüfen).
- **Food-Zine** (Mixarium nutzt es nicht): Blättern in der Großansicht; eigenes KI-Bild aus der Sammlung (Wahl-Modus); zwei Spalten.
- Klaus' Beispiel für Ordner ist jetzt „Hochzeit von Jonas und Lisa“ (statt „Weihnachten“/„Für Gäste“).
