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

## Runde P · 28.11.2026 · PWA 0.20.1 (nach dem Foto-Scan gleich ein KI-Bild anbieten)

- **App, nicht Kern:** Klaus 28.11.: das Foto war nur zum Lesen da – nach dem Speichern eines gescannten Rezepts bietet die Meldung
  „KI-Bild erzeugen“ an; ohne OpenAI-Schlüssel steht dort „Schlüssel eintragen“, das Schlüsselfenster öffnet sich, und nach dem
  Speichern geht es gleich zum KI-Bild (Rückfrage mit Kosten). Markiert über `s.form.ausScan`. Probe `smoke_neu_scan` (3 neue Zeilen).
- **Im Mixarium gleich nachgezogen** (`Z.fenster.ausScan`, `bildErzeugen` macht nach dem Schlüssel weiter; dort ohne Kostenfrage wie bisher).

## Runde O · 28.11.2026 · Kern 0.34.0, PWA 0.20.0 (Gerade ziehen & verbessern)

- **Neu im Kern:** `oberflaeche/blatt.mjs` (Rechnung ohne DOM: `findeBlatt`, `entzerren`, `verbessern`, `drehen`, `eckenOrdnen`; nach
  Workflow PDF `blatt.js`/`scan-bild.js`, ohne Modell, ohne A4 – das Bild behält das Seitenverhältnis des Blatts) und
  `oberflaeche/blatt-fenster.mjs` (das Fenster mit eigenem Stil, zwei Reiter „Ecken“/„Ergebnis“, Regler Helligkeit, Kontrast,
  Farbe ±40, Schärfe). Die Texte reicht die App übersetzt hinein (`t`). Probe `test/kern-blatt.test.js`.
- **App:** in „Bild anpassen“ das Werkzeug `blatt-gerade` (Symbol `zuschnitt`); nach „Bild eingefügt“ bietet die Meldung „Gerade ziehen“ an.
  Übernehmen ersetzt `img`, nimmt `imgCrop` weg, mit „Rückgängig“. Nichts geändert → kein neues Speichern.
- ⚠ **Der Name `blatt` war in A schon vergeben** (Blättern) – der Knopf tat nichts. Wächter `test/neu-aktionen.test.js`.
- **Ins Mixarium:** Kern nachziehen, Werkzeug in „Bild anpassen“ und nach dem Einfügen. Probe `tests/smoke_neu_blatt.mjs`.
