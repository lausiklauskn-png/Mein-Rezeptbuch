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

## Runde F · 25.11.2026 · Kern 0.27.1, PWA 0.15.2 (Vergleichs-Sitzung alt ↔ neu)

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

## Runde E · 23./24.11.2026 nachts · Kern 0.21–0.22, PWA 0.13.0–0.14.0 (gemeinsame Nacht-Sitzung) (vorige Fassung)

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
