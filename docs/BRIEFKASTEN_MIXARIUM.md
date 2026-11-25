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

## Runde H · 25.11.2026 nachts · Kern 0.28.0, PWA 0.16.0 (R8: Food-Zine wie alt, Kreativbuch-Auswahl)

| Kern | neu |
|---|---|
| 0.28.0 | `ausgabe/zine.mjs` neu: der Poster-Auftrag der alten App (`zinePoster`, sechs Formate, fünf Extras, `zineTrend`, `zineFotoHinweis`, `ZINE_CHAT`), Deutsch wörtlich, sonst Englisch mit Satz zur Beschriftungssprache; Sammlung `zineSammlung(lager)` im Gerät, `zineAusRezepten` (alte Seiten `r.zine` heraus), `zineSaetzeBilder`, `zineDruck`. **Entfernt** (nichts nutzte sie): `zineAuftraege`, `ZINE_STILE`, `pruefeZineAuftrag`, `setzeSeite`/`entferneSeite`, `zineGalerie`, `zineSaetzeEinlesen`, Kosten. `kbTexte` liest die alte Antwort `{name,intro,tip,serve}` ganz (tip → Kochtipp, serve → Servier-Idee). `kbProjekt` trägt `ab` (abgewählte Rezepte). Kern-Sprachtabellen: die elf Zine-Schlüssel sind raus. |

- **Fürs Mixarium:** es nutzt `ausgabe/zine.mjs` nicht (gemessen: kein Treffer in `neu/`, `getraenke/`); beim nächsten `kern-nachziehen` fällt nichts weg, was dort gebraucht wird. `modell/rezept.mjs` liest `zine` weiter.
- **Klaus' Grundsatz (25.11.):** „Hol nichts aus dem Speicher heraus, was sich nicht bewährt hat … Es soll keine neuen Kosten erzeugen.“ Im Food-Zine gibt es kein Erzeugen mit einem Schlüssel mehr; der Weg ist Kopieren → Claude/ChatGPT. Fürs Mixarium bei einem Getränke-Poster dasselbe prüfen.
- **Kreativbuch:** Rezepte einzeln anhaken (Liste gruppiert nach Kategorie/Ordner, Schnellwahl setzt die Häkchen), Auftragsfeld mit Kopieren · Claude · ChatGPT und „Auftrag neu bauen“. Fürs Mixarium übernehmbar, wenn dort ein Kreativbuch kommt.

## Runde G · 25.11.2026 abends · PWA 0.15.4–0.15.5 (kein Kern-Wechsel) (vorige Fassung)

- **Explorer „Ordner“** (R3/R9) in `neu/app.mjs` (Ansicht `baum`, Funktionen `baumHtml`/`baumGruppe`/`baumAblegen`, Ziehen `bz…`): eigener Punkt
  „Ordner“ unter „Rezepte“ in Seiten- und fliegender Leiste. Alle Kategorien und Ordner aufklappbar mit ihren Rezepten; **Klaus: gleich in der
  Zeile ändern** (Namensfeld, Tipp aufs Bild = Bild/Zeichen, Müll, „alle zuordnen“), kein Zwischenfenster. Rezept am Griff lange drücken/ziehen:
  auf Kategorie = `cat` setzen und aus dem Ordner nehmen, auf Ordner = `folder` (Kategorie bleibt). Mehrfachauswahl „Auswählen → Verschieben
  nach …“. Breiter Schirm: Baum links, Rezept rechts. Kein Kern-Teil (nutzt `legeIn`, `umsortieren` aus dem Kern) – fürs Mixarium übernehmbar,
  dort aber Kategorien-Fenster statt Ansicht prüfen. Probe `tests/smoke_neu_baum.mjs`.
- **0.15.5:** im Baum „Alle zuordnen →“ nur noch bei „Ohne Kategorie“/unbekannt, leere Kategorien eingeklappt, alte Ordner-Liste in den
  Einstellungen entfernt (Klaus: Doppelung vermeiden). **R12:** Bücher und Food-Zine-Bilder als eigener Punkt „Kreativbuch“ in der Leiste, nicht mehr
  in den Einstellungen; im Mixarium beim Getränkebuch prüfen, ob dasselbe passt.
