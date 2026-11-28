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

## Runde N · 28.11.2026 · PWA 0.19.17 (Namen in „Weiterkochen“ und im Kopfbild)

- **App, nicht Kern:** Klaus 28.11.: Namen von Rezepten aus Foto oder KI-Scan sind lang und standen zu groß da. „Weiterkochen“ auf der
  Startseite jetzt 16–19 px, höchstens zwei Zeilen (vorher 20 px, drei Zeilen und mehr); im Namen des Kopfbilds wird ein langes Wort
  getrennt statt rechts abgeschnitten (`hyphens:auto`, `overflow-wrap:anywhere`). Probe `smoke_neu_ansicht.mjs` (drei neue Zeilen).
  Im Mixarium gleich nachgezogen (Name im Kopfbild am Handy).
- **Vorschlag offen (Klaus entscheidet):** die vier Ecken aus dem Scanner von Workflow PDF für den Foto-Scan – siehe Antwort in der Sitzung.

## Runde M · 27.11.2026 · Kern 0.33.6, PWA 0.19.16 (echtes Vollbild, Kategorie aus der Leiste, Kopfbild 16 : 9, Maske)

- **Neu im Kern:** `kern/oberflaeche/vollbild.mjs` (`vollbildSetzen(an)`). Browser und Windows: requestFullscreen; APK: das Plugin
  `AppVollbild`, das `paket/android/nachbessern.mjs` in die MainActivity schreibt (Capacitor beendet das Browser-Vollbild sonst sofort).
  Übernehmen: Kern nachziehen, `nachbessern.mjs` byte-gleich, `vollbild.mjs` in den Vorrat (sw.js), und nach jedem Zeichnen abgleichen
  (soll = „nur das Getränk“ an ODER Bild groß). Im Mixarium schon gebaut.
- **App, nicht Kern:** zweiter Tipp auf die gewählte Kategorie in der Leiste öffnet Umbenennen + „Alle N verschieben nach …“ (auch in eine
  neue Kategorie). Im Mixarium nachgebaut (`katBearbeiten`).
- **App:** am breiten Schirm oben `padding-top: env(safe-area-inset-top)` (APK am DeX lag unter der Leiste); Vollbild-Knopf immer ganz außen
  unter dem rechten Pfeil; jedes Kopfbild gleich hoch (Pfeile wandern nicht). Prüfen, ob das Mixarium das braucht.
- **Kern 0.33.6:** `ausschnittRechteck(seiten, ziel, x, y, z)` in `oberflaeche/bild.mjs` – „Bild anpassen“ zeigt das ganze Bild mit einer Maske
  (Kopfbild hell mit Rahmen, Karte gestrichelt); beim Ziehen folgt das helle Feld dem Finger. Im Mixarium übernommen.
- **App:** Kopfbild auf JEDER Breite 16 : 9 (Klaus: im geteilten Schirm zeigte jede Breite einen anderen Ausschnitt); Werkzeug-Knöpfe
  im Bild nur mit Text, wenn der Rahmen breit genug ist (Container-Abfrage); Name im Kopfbild am Handy kleiner (17–21 px, zwei Zeilen).

