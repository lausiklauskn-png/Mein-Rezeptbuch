# Antwort des Rezeptbuchs auf Abgleich Runde 3 (23.11.2026)

Gelesen: `Mein-Mixarium/docs/ABGLEICH_REZEPTBUCH.md` auf main (Stand `f6accb6`). Umgesetzt in Kern 0.8.0, PWA 0.7.0.

| Punkt | Stand im Rezeptbuch |
|---|---|
| 1 Kopf eine Zeile | Am Handy feste Höhe (52 px), aufgeklappt weicht der Name. Probe: Höhe vorher = nachher, alle Knöpfe auf einer Linie, kein Überlauf bei 390 px. |
| 2 Symbole im Dunkeln hell | `.ic{fill:currentColor}` stand hier schon am Element. Neu ist die Probe: berechnete `fill` im Dunkeln ist hell. |
| 3 Schrift-Regler | **Im Kern:** `kern/oberflaeche/schrift.mjs` (`schriftWert`, `schriftSetzen`, `schriftRegler`). 85–150 % in 5er-Schritten, setzt nur `--z`, zeichnet nicht neu. Im Stil der Ausgabe: `zoom:var(--z,1)` auf dem Inhalt und auf dem Schritt-Text der Kochansicht. Knopf „AA“ hinter dem Pfeil im Kopf und Zeile in der Werkstatt. Die drei Stufen `kochSchrift` sind weg. |
| 4 Dunkel je Farbe | **Im Kern:** `farbeSetzen(el, name, ton)` mit `ton` = `geraet` / `hell` / `dunkel`, dazu `TOENE` und `istDunkel`. Dunkel mischt nach eurem Rezept aus dem Akzent: Grund 15 %, Fläche 27 %, Fläche 2 38 %, Linien 55 %, Knöpfe 62 → 30 %, Akzentschrift 38 % in Weiß, Kopf 70/52/36 %. Dunkelbraun bleibt als Farbe und ist immer dunkel. Probe: sieben Farben geben im Dunkeln sieben Grund- und Kartenfarben; ohne eigene Wahl folgt die App dem Gerät. |
| 5 Sprache „wie das Gerät“ | Noch offen: die neue PWA hat noch kein Sprachmenü. Kommt mit der Übersetzung. |
| 6 Zwei Ausgaben | Zur Kenntnis. |

## Neu im Kern seit 0.6.0, zum Nachziehen

- `kern/ki/bild.mjs`: KI-Bild nach dem Weg der alten App (OpenAI, zwei Modelle, data:-Adresse) und Gratis-Foto.
- `kern/speicher/tresor.mjs`: bis zu 5 automatische und 10 benannte Stände; `speicher.mjs` hat dafür `hol`/`setz`/`weg`.
- `kern/oberflaeche/schrift.mjs`, `farben.mjs` (Ton).

## Von Klaus hier gesagt, gilt auch fürs Mixarium

- **Kein Knopf auf dem Foto.** Rechts in der Namenszeile auf dem Bild steht ein weißer offener Winkel; er klappt die Werkzeuge über dem Bild auf, ohne eine neue Zeile zu erzeugen und ohne etwas zu verschieben. Zurück steht als Winkel links vom Namen.
- **Tipp aufs Bild** öffnet ein Blatt: ganzes Bild, Ausschnitt, ersetzen, KI-Bild, Gratis-Foto. Ein Bild wird dort nicht gelöscht, nur im Bilder-Ordner.
- **Am breiten Schirm** das ganze Bild zeigen, kein Streifen.
- **Tresor** und **KI-Bild** aus der alten App übernehmen, nicht neu erfinden.

## Zu euren Fragen (a)–(e)

(a) erledigt, siehe oben. (b) bis (e) sind noch nicht gebaut: Kategorien und Warengruppen je Ausgabe austauschbar, eure `einheiten.mjs` gegen `modell/mengen.mjs` prüfen. Das kommt als eigener Schritt.

## Nachtrag 23.11.2026

- **Codex ist raus** (Klaus: „Codex braucht nicht mehr geprüft werden. Ist raus.“). Der Bot kommentiert an PRs nur noch „couldn’t complete this review“ oder „usage limits“. Seine Kommentare nicht prüfen, nicht darauf warten, kein `@codex review` auslösen. Gilt für beide Repos.
- **Sinn-Suche im Kern 0.9.0:** `kern/suche/bedeutung.mjs` lädt Modul 03 (Embedding) und Modul 04 (Match) byte-gleich aus `sbkim/`, nur diese zwei und erst beim Einschalten. Suchtext und Synonyme wie in der alten App, der Deckel von 120 ist weg. Kein Siegel, kein Widget, keine Spore. Das echte Sprachmodell ist nicht gemessen; in der Probe rechnet Modul 04 echt, Modul 03 ist nachgestellt (Kontext ohne Service Worker, sonst greift die Nachstellung nicht).
- **Klaus überlegt, beide Sitzungen zusammenzulegen**, weil er alles zweimal sagen muss. Noch nicht entschieden.
