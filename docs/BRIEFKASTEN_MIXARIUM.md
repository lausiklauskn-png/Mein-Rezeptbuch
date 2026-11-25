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

## Runde I · 25.11.2026 spät · Kern 0.28.1, PWA 0.16.1 (Bedienung am Rezept, Übersetzung, Bild, Seitenleiste)

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

## Runde H · 25.11.2026 nachts · Kern 0.28.0, PWA 0.16.0 (R8: Food-Zine wie alt, Kreativbuch-Auswahl) (vorige Fassung)

| Kern | neu |
|---|---|
| 0.28.0 | `ausgabe/zine.mjs` neu: der Poster-Auftrag der alten App (`zinePoster`, sechs Formate, fünf Extras, `zineTrend`, `zineFotoHinweis`, `ZINE_CHAT`), Deutsch wörtlich, sonst Englisch mit Satz zur Beschriftungssprache; Sammlung `zineSammlung(lager)` im Gerät, `zineAusRezepten` (alte Seiten `r.zine` heraus), `zineSaetzeBilder`, `zineDruck`. **Entfernt** (nichts nutzte sie): `zineAuftraege`, `ZINE_STILE`, `pruefeZineAuftrag`, `setzeSeite`/`entferneSeite`, `zineGalerie`, `zineSaetzeEinlesen`, Kosten. `kbTexte` liest die alte Antwort `{name,intro,tip,serve}` ganz (tip → Kochtipp, serve → Servier-Idee). `kbProjekt` trägt `ab` (abgewählte Rezepte). Kern-Sprachtabellen: die elf Zine-Schlüssel sind raus. |

- **Fürs Mixarium:** es nutzt `ausgabe/zine.mjs` nicht (gemessen: kein Treffer in `neu/`, `getraenke/`); beim nächsten `kern-nachziehen` fällt nichts weg, was dort gebraucht wird. `modell/rezept.mjs` liest `zine` weiter.
- **Klaus' Grundsatz (25.11.):** „Hol nichts aus dem Speicher heraus, was sich nicht bewährt hat … Es soll keine neuen Kosten erzeugen.“ Im Food-Zine gibt es kein Erzeugen mit einem Schlüssel mehr; der Weg ist Kopieren → Claude/ChatGPT. Fürs Mixarium bei einem Getränke-Poster dasselbe prüfen.
- **Kreativbuch:** Rezepte einzeln anhaken (Liste gruppiert nach Kategorie/Ordner, Schnellwahl setzt die Häkchen), Auftragsfeld mit Kopieren · Claude · ChatGPT und „Auftrag neu bauen“. Fürs Mixarium übernehmbar, wenn dort ein Kreativbuch kommt.
