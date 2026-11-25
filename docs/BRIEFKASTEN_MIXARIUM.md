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

## Runde G · 25.11.2026 abends · PWA 0.15.4–0.15.5 (kein Kern-Wechsel)

- **Explorer „Ordner“** (R3/R9) in `neu/app.mjs` (Ansicht `baum`, Funktionen `baumHtml`/`baumGruppe`/`baumAblegen`, Ziehen `bz…`): eigener Punkt
  „Ordner“ unter „Rezepte“ in Seiten- und fliegender Leiste. Alle Kategorien und Ordner aufklappbar mit ihren Rezepten; **Klaus: gleich in der
  Zeile ändern** (Namensfeld, Tipp aufs Bild = Bild/Zeichen, Müll, „alle zuordnen“), kein Zwischenfenster. Rezept am Griff lange drücken/ziehen:
  auf Kategorie = `cat` setzen und aus dem Ordner nehmen, auf Ordner = `folder` (Kategorie bleibt). Mehrfachauswahl „Auswählen → Verschieben
  nach …“. Breiter Schirm: Baum links, Rezept rechts. Kein Kern-Teil (nutzt `legeIn`, `umsortieren` aus dem Kern) – fürs Mixarium übernehmbar,
  dort aber Kategorien-Fenster statt Ansicht prüfen. Probe `tests/smoke_neu_baum.mjs`.
- **0.15.5:** im Baum „Alle zuordnen →“ nur noch bei „Ohne Kategorie“/unbekannt, leere Kategorien eingeklappt, alte Ordner-Liste in den
  Einstellungen entfernt (Klaus: Doppelung vermeiden). **R12:** Bücher und Food-Zine-Bilder als eigener Punkt „Kreativbuch“ in der Leiste, nicht mehr
  in den Einstellungen; im Mixarium beim Getränkebuch prüfen, ob dasselbe passt.

## Runde F · 25.11.2026 · Kern 0.27.1, PWA 0.15.2 (Vergleichs-Sitzung alt ↔ neu) (vorige Fassung)

| Kern | neu |
|---|---|
| 0.27.1 | `gratisBild(rezept, { schluessel })`: Pollinations nimmt Bilder seit 2026 nur mit eigenem Schlüssel (`sk_…`); ohne Schlüssel kam HTTP 402 (gilt auch für die alte App). Mit Schlüssel: `gen.pollinations.ai/image/…?key=…`. Fehler 401/402/403 tragen `f.schluessel` und Klartext. Neuer Anbieter `pollinations` in `ki/schluessel.mjs` (Prüfen über `/image/models`). |

### Von Klaus am 25.11. gesagt, gilt fürs Mixarium

- **Ersetzen beim Einlesen einer Sicherung wie im Rezeptbuch:** die Einkaufsliste bleibt, wenn die Datei keine trägt.
- **Name der APK beim nächsten Bau: „App Mein Mixarium“**, mit dem vorgesehenen neuen Symbol (Entwurf als PNG liegt vor).
- **Doppelungen beim Einlesen erkennen** (Inhalt und Bild) und je Doppel wählen: Bild behalten, Text behalten, Rezept behalten. **„alkoholfrei“ und „mit Alkohol“ sind keine Doppel**, auch wenn sich nur dieses Wort unterscheidet (kommt in den Kern).
- **Wischen an der Rezeptkarte** (Vorbild Muttis), **Explorer-Baum** für Kategorien und Ordner: kommen im Rezeptbuch, danach prüfen fürs Mixarium.
- Rezeptbuch 0.15.2: Kategorien „ohne“/„unbekannt“/„mitgebracht“ lassen sich auf einmal zuordnen (`kat-alle`); „Sicherung teilen“ (Web Share mit Datei). Fürs Mixarium prüfen.
- Mixarium ruft `gratisBild(frei, { art: 'getraenk' })` ohne Schlüssel: nach `kern-nachziehen` den Schlüssel `SK.pollinations` mitgeben (sonst bleibt HTTP 402, jetzt mit Klartext).

---
