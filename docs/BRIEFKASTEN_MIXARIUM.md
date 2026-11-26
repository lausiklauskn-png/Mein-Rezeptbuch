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

## Runde L · 26.11.2026 abends · Kern 0.33.4, PWA 0.19.14 (APK: kein Installieren-Knopf, Aktualisieren ohne „ohne Netz“)

| Kern | neu |
|---|---|
| 0.33.4 | `oberflaeche/app-pflege.mjs`: `imPaket(w)` (Capacitor-APK oder `app://` unter Windows); `laeuftAlsApp` zählt das Paket mit, also zeigt `installation().zeigen()` dort keinen Knopf |

- **Klaus 26.11., an der signierten APK v0.19.13:** der Installieren-Knopf blieb stehen, und „Aktualisieren“ meldete „Ohne Netz“
  (in der APK gibt es keinen Service Worker, die Probe `HEAD ./sw.js` schlägt fehl). Das Rezeptbuch öffnet jetzt im Paket die
  Release-Seite (`…/Mein-Rezeptbuch/releases/latest`).
- **Fürs Mixarium:** `kopfInstall` prüfte schon `PRO`. Nachziehen trotzdem, damit beide Apps dieselbe Erkennung nutzen. Ohne DoUpdates
  meldete „pro-update“ bisher „Updates sind in dieser Fassung noch nicht eingerichtet“. Besser ist die Release-Seite.
- Releases werden über `.github/workflows/veroeffentlichen.yml` gebaut (signierte APK und Windows-Setup), Regel in `docs/VEROEFFENTLICHEN.md`.

## Runde K · 26.11.2026 · Kern 0.33.2, PWA 0.19.9 (Fotos, Doppelungen im ganzen Buch, Blättern) (vorige Fassung)

| Kern | neu |
|---|---|
| 0.32 | `modell/doppel.mjs`: `findeDoppelImBuch(alle, {hash})` (ganzes Buch, jedes Rezept in höchstens einem Paar), Mengen-Regel (`mengenGleich`, gleiche Mengen in gleicher Folge = dieselbe Übersetzung), Vergleich auch über `sicht(r, sprache)` |
| 0.33 | `oberflaeche/bild.mjs`: Fotos als WebP 0.86 mit 1600 px (`BILD_SPEICHER`, `alsDatenAdresse`), `platzSparen`, `datenGroesse`, `aufloesung` |
| 0.33.1 | `mengenGleich` zählt erst ab drei verschiedenen Mengen (überall „2 cl“ machte den Virgin Mojito zum Doppel des Mojito; gefunden in der Mixarium-Probe) |
| 0.33.2 | `platzSparen` rechnet ein schon gespeichertes WebP bis 1600 px nicht noch einmal (Absicherung; die 10-%-Schwelle fing es im Test schon ab) |

- **Mixarium hat es übernommen (vor42):** „Doppelte suchen“ und „Platz sparen“ auf der Bilder-Seite, Proben `smoke_neu_doppel` (40), `scan` (56), `web` (29).
- **Klaus 26.11.:** Mixarium misst live 96 · 99 · 100 · 100. Fürs Rezeptbuch ist geplant: App zuerst, Startbilder unscharf vorab, scharf im Hintergrund.
  Neu fürs Mixarium: Getränke aus dem Rezeptbuch, die dort fehlen, und eine Kategorie **Fingerfood**. Der Verlauf im Mixarium-Bild bleibt, wie er ist.
