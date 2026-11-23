# Küchen-Kern

Gemeinsamer Code für Mein Rezeptbuch, Muttis Rezeptbuch (Ausgabe) und Mein Mixarium (übernimmt den Kern byte-gleich mit Pin).
Stand 2026-11-23: **Ausgaben-Schalter** und die **Logik ohne Oberfläche** (Rezeptmodell, Kategorien, Suche, Sicherung, Übernahme). Die Oberfläche der PWA folgt; APK und Windows erst nach Klaus' Go.

## Ausgaben-Schalter (`kern/ausgabe/ausgabe.mjs`)

Jede Ausgabe hat eine Datei `ausgaben/<name>/ausgabe.json`. Sie legt fest:

| Feld | Bedeutung |
|---|---|
| `name`, `titel`, `kurz` | Kennung der Ausgabe, angezeigter Name, Kurzname |
| `store` | `true` = geht in einen Store (Google Play). Dann ist ein Paket mit Alkohol verboten, auch als Angebot. |
| `alkoholErlaubt` | `false` = kein Paket mit Alkohol, weder im Paket noch angeboten |
| `beispiele` | Liste der Paket-Kennungen aus dem Katalog. **Was hier nicht steht, kommt weder ins Paket noch wird es angeboten.** |
| `lieferung` | je Ziel `im-paket` (liegt in APK/Windows, erster Start ohne Netz) oder `auf-tippen` (Web: erst auf Knopfdruck laden) |
| `ziele` | `web`, `android`, `windows` |
| `speicher` | `endung` der alten localStorage-Schlüssel (`9m` Mein Rezeptbuch, `9` Muttis), `indexedDb`, `schluesselAlt` für die Übernahme. Nur die eigenen Schlüssel lesen, nichts löschen. |
| `farbe`, `zeichen`, `begruessung` | Palette (Farbscheibe), App-Zeichen Web/App, Begrüßung je Sprache |
| `netzmodule` | `eingebaut-nicht-geladen` (SBKIM/Mycel im Paket, unsichtbar, kein Netzverkehr) oder `aus` |

Der **Katalog** (`beispiele/KATALOG.json`) beschreibt jedes Paket mit `id`, `datei`, `art` (`rezepte`, `foodzine`),
`alkohol`, `anzahl`, `bytes`, `sha256` und `fuer` (für welche Ausgaben freigegeben). Die Prüfung rechnet die Prüfsumme nach und
sucht in Getränke-Kategorien selbst nach Alkohol (ein Paket, das sich falsch als alkoholfrei ausgibt, fällt auf).

```bash
node kern/ausgabe/ausgabe.mjs ausgaben/rezeptbuch/ausgabe.json   # zeigt je Ziel: im Paket / auf Tippen, prüft alles
node --test test/ausgabe.test.js                                  # Probe mit Gegenproben
```

### Beispiel Mixarium (zwei Ausgaben aus demselben Code)

`ausgaben/mixarium-store/ausgabe.json`: `"store": true, "alkoholErlaubt": false, "beispiele": ["<alkoholfreie Pakete>"]`
`ausgaben/mixarium-voll/ausgabe.json`: `"store": false, "alkoholErlaubt": true, "beispiele": [..., "getraenke-mit-alkohol-fuer-mixarium"]`
Das Alkohol-Paket aus `beispiele/` ist im Katalog nur für `mixarium-voll` freigegeben.

## Logik (ohne Oberfläche, läuft im Browser und in Node)

| Datei | Aufgabe |
|---|---|
| `modell/rezept.mjs` | `normalisiere()` bringt jedes Rezept einmal in Form: `blank` nur ohne Namen, Kategorie getrimmt, `fld_…` zieht in `folder`, feste `uid`. `istInhalt()` ist die eine Frage, die Suche, „Alle“, Kategorien und Zähler stellen. |
| `modell/kategorien.mjs` | `alleKategorien()`: feste, eigene, unbekannte und „Ohne Kategorie“, jede Kennung einmal. Anlegen, umbenennen, löschen mit Ziel, umsortieren. |
| `modell/kategorien-fest.mjs` | die 18 festen Kategorien in 8 Sprachen, aus der alten App übernommen |
| `modell/suche.mjs` | Wortsuche, auch über den Kategorienamen |
| `sicherung/sicherung.mjs` | liest Fassung 9/10 der alten Apps, schreibt Fassung 11 mit Block `kategorien`; Zusammenführen an `uid` |
| `speicher/uebernahme.mjs` | liest den alten localStorage nur mit der Endung der eigenen Ausgabe, löscht nichts |

Probe: `node --test test/kern.test.js` (13 Fälle). Wächter für den Sushi-Fehler: **alles, was die Suche findet, steht in genau einer Gruppe von „Alle“**.

## Pin (`KERN.json`)

`node kern/kern-stand.mjs` schreibt `KERN.json` mit Fassung und SHA-256 jeder Datei unter `kern/`. Das Mixarium übernimmt `kern/`
byte-gleich und prüft gegen diese Liste; `node --test` hier besteht darauf, dass `KERN.json` zum Stand passt.
