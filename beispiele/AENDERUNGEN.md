# Beispielbuch Mein Rezeptbuch – Änderungsliste

Überarbeitet am 23.11.2026 aus Klaus' Sicherung `mein-rezeptbuch-2026-09-16-11h19.json` (Release `eingang-rezepte`, 55,6 MB) und den Bildern im Release `eingang-bilder` (92 Dateien, 464 MB).

## Ergebnis

| Datei | Inhalt |
|---|---|
| `beispielbuch-mein-rezeptbuch.json` | 42 Rezepte für das öffentliche Beispielbuch (Essen und alkoholfreie Getränke) |
| `foodzine-beispiele.json` | 8 vollständige Food-Zine-Sätze mit je drei Seiten |
| `getraenke-mit-alkohol-fuer-mixarium.json` | 8 Getränke mit Alkohol, für Mein Mixarium |

## Was überall gemacht wurde

- 70 leere Platzhalter-Karten entfernt (je 10 in sieben Essens-Kategorien).
- Jedes Rezept hat eine feste Kennung `uid`, damit doppelte Rezepte beim Laden erkannt werden (die Datei war Fassung 9 und hatte keine).
- **Sushi-Befund:** die sieben Sushi-Rezepte stehen in einer selbst angelegten Kategorie mit der Kennung `eig_1789556014817`. Name und Symbol dieser Kategorie speichert die alte App nur im Browser und schreibt sie **nicht** in die Sicherung. In jeder anderen App oder nach dem Leeren des Browsers heißt die Kategorie deshalb nur `eig_1789556014817`, und „Sushi“ findet man nur über die Suche. Die Datei trägt jetzt einen Block `kategorien` mit Name und Symbol in acht Sprachen; der neue Kern liest ihn.
- Bilder: höchstens 1600 px, JPEG, ohne Metadaten. Wo es in deinen Bildern eine schärfere oder größere Fassung gab, ist sie jetzt drin.
- Mengen und Einheiten in getrennte Felder gesetzt. Mengen selbst nicht verändert; amerikanische Maße umgerechnet, das Original steht als Notiz dabei.

## Deine Bilder (Release `eingang-bilder`)

| Verwendet | Bild |
|---|---|
| Rezeptbild, schärfer als vorher | Dragon Roll, Tobiko Sushi, Ebi Tempura, Sushi Platte, Lachs-Sushi-Rolle, Knusprige Sushi-Rolle, Gyoza, Gebratener Reis |
| Rezeptbild, neu (vorher nur Link) | Frühlingskartoffelsuppe mit Spargel und Bärlauch |
| Food-Zine, vollständig (3 Seiten) | Ratatouille, Würzfleisch, Bärlauchsuppe, Erdbeer-Joghurt-Torte, Muttis Gulasch, Omas Eierragout, Sushi Special, Koreanische Gochujang-Lachs-Bowl (ohne Rezept im Buch) |

**Nicht verwendet:**

- **Doppelt:** Gochujang-Bowl als JPEG 850 × 1201 (dieselben Seiten liegen als PNG in besserer Auflösung vor), Muttis-Gulasch-Panorama zweimal, Bärlauchsuppe-Buchseite zweimal, Gyoza zweimal, Herbstlicher Kräuter-Nektar zweimal, die Panorama-PDFs (gleich wie die ZIPs).
- **Zu klein oder unscharf:** Gyoza 512 × 768, Gemüsesuppe 800 × 360, Bildschirmfotos (Gebratener Reis, Dateimanager).
- **Einzelne Seiten, kein vollständiger Satz:** Gyoza (zwei Seiten), Kartoffelgratin (Schrittseite und Panorama), die Panorama-Poster (Ratatouille, Bolognese, Muttis Gulasch, Szegediner Gulasch, Sushi Special V1/V2, Würzfleisch-Rezeptkarte), die Kochbuch-Doppelseiten (Bärlauchsuppe, Bandnudeln, Kürbisrisotto, Kichererbsen-Curry).
- **Vermutlich fremd:** `erdbeer-joghurt-torte.jpg` (960 × 540, Bildmaß von Chefkoch), `Karottenkuchen-von-Gaumenfreundin.jpg` und `Eierragout-mit-Kartoffeln.jpg` (gleiches Format wie gaumenfreundin.de). Wenn du sie selbst erzeugt hast, sag Bescheid, dann kommen sie wieder hinein.

## Bitte prüfen (offen)

- **Sushi Tempura**: Sushi Tempura: Portionen 1, ergibt aber 4 Rollen zu je 8 Stücken.
- **Hühnerfrikassee mit Käse überbacken**: Hühnerfrikassee überbacken: stand unter „Vorspeisen“ – jetzt „Fleisch“.
- **Gnocchi-Brokkoli-Auflauf**: Gnocchi-Brokkoli-Auflauf: enthält Schinken, stand unter „Vegetarisch“ – jetzt „Fleisch“.
- **Pizza-Toast**: Pizza-Toast: enthält Salami, stand unter „Vegetarisch“ – jetzt „Fingerfood“.
- **Gemüsesuppe mit Fleisch**: Gemüsesuppe: Portionen 1 bei 1 l Flüssigkeit, vermutlich 2–4.

## Neue Bilder nötig (12) – Aufträge für ChatGPT

Gemeinsamer Stil für alle:

```
Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Würziger Pfirsich-Punsch

```
Zwei Glastassen mit dampfendem, goldorangem Pfirsich-Punsch, darin je eine Zimtstange, daneben ganze Gewürznelken, eine halbe Limette und ein Pfirsich. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Sushi Tempura

```
Acht Stücke frittierte, goldbraun panierte Maki-Sushi (Panko-Kruste) auf einem dunklen Steinteller, im Anschnitt sichtbar Reis, Avocado, Gurke und Frühlingszwiebel, dazu ein Schälchen süße Sojasauce. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Schnelles Hühnerfrikassee

```
Ein tiefer Teller Hühnerfrikassee mit heller, cremiger Soße, Hähnchenstücken, Möhrenwürfeln, Erbsen und Champignons, daneben eine Schale Reis und ein Zitronenschnitz. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Rotbarschfilet mit Möhren und Senfcreme

```
Eine flache Auflaufform mit goldenem Rotbarschfilet auf schräg geschnittenen Möhrenscheiben und heller Senfcreme, mit frischer Petersilie bestreut. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Ratatouille

```
Eine große, hohe Pfanne mit buntem Ratatouille aus Aubergine, Zucchini, roter und gelber Paprika und Tomaten, mit frischem Thymian und Rosmarin, daneben ein Stück Baguette. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Bärlauchsuppe

```
Eine kräftig grüne, glatt pürierte Bärlauchsuppe in einer Schale, mit einem Klecks Frischkäse und etwas Kresse obenauf, daneben frische Bärlauchblätter. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Bratkartoffeln mit Spinat und Spiegelei

```
Ein Teller mit goldbraunen Bratkartoffeln mit Zwiebeln und Petersilie, cremigem Rahmspinat und zwei Spiegeleiern. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Szegediner Gulasch

```
Ein Bräter mit Szegediner Gulasch aus Schweinefleisch und Sauerkraut in Paprikasoße, mit einem Klecks saurer Sahne obenauf, daneben Lorbeerblätter und Paprikapulver. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Eierragout mit Senfsoße nach Omas Rezept

```
Eine Schüssel Eierragout: geviertelte hart gekochte Eier in heller Senfsoße mit Möhrenwürfeln, Erbsen und gehackter Petersilie, daneben Salzkartoffeln. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Saftiger Karottenkuchen

```
Ein angeschnittener runder Karottenkuchen mit weißem Frischkäse-Topping, darauf gehackte Pistazien und kleine Marzipanmöhren, ein Stück auf einem Kuchenteller. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Gemüsesuppe mit Fleisch

```
Ein tiefer Teller klare Gemüsesuppe mit Rindfleischstücken, Möhren, Kartoffelwürfeln, Erbsen und frischer Petersilie, daneben ein Stück Brot. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Erdbeer-Matcha-Latte

```
Ein hohes Glas mit drei sichtbaren Schichten: unten zerdrückte rote Erdbeeren, in der Mitte weiße Milch mit Eiswürfeln, oben hellgrüner Matcha, daneben frische Erdbeeren und ein Bambusbesen. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

## Je Rezept

| Nr | Rezept | Kategorie | Quelle | Änderungen |
|---|---|---|---|---|
| 0 | Tropische Kokostraum Bowl → Mixarium | bowle |  | Mengen und Einheiten getrennt; Bild: 211 KB → 208 KB |
| 1 | Tropische Kokostraum-Bowle (alkoholfrei) | bowle |  | Name: „Tropische Kokostraum-Bowl Alkohol frei“ → „Tropische Kokostraum-Bowle (alkoholfrei)“; Mengen und Einheiten getrennt; Bild: 153 KB → 153 KB |
| 2 | Tropical-Sunrise-Bowle | bowle |  | Name: „Tropical Sunrise Bowl“ → „Tropical-Sunrise-Bowle“; Mengen und Einheiten getrennt; Bild: 165 KB → 165 KB |
| 3 | Würziger Pfirsich-Punsch | afckt |  | Name: „Spiced Peach Punch“ → „Würziger Pfirsich-Punsch“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: ersetzt werden (nur Link zu www.thecocktaildb.com) |
| 4 | Raspberry Cooler → Mixarium | bowle |  | Mengen und Einheiten getrennt; Bild: ersetzt werden (nur Link zu www.thecocktaildb.com) |
| 5 | Dragon Roll mit Avocado | eig_1789556014817 |  | Name: „Avocado Sushi Roll (Dragon Roll)“ → „Dragon Roll mit Avocado“; Mengen und Einheiten getrennt; Bild: schärferes Bild aus deinen Bildern (1402 × 1122) |
| 6 | Tobiko Sushi mit Ebi Tempura | eig_1789556014817 |  | Mengen und Einheiten getrennt; Bild: schärferes Bild aus deinen Bildern (1324 × 1188) |
| 7 | Ebi Tempura | eig_1789556014817 |  | Bild: schärferes Bild aus deinen Bildern (1402 × 1122) |
| 8 | Sushi Platte | eig_1789556014817 |  | Bild: schärferes Bild aus deinen Bildern (1333 × 1180) |
| 9 | Sushi Tempura | eig_1789556014817 | fremd | Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de); ⚠ OFFEN: Sushi Tempura: Portionen 1, ergibt aber 4 Rollen zu je 8 Stücken. |
| 10 | Lachs-Sushi-Rolle mit Avocado | eig_1789556014817 |  | Name: „Salmon Sushi Roll mit Avocado“ → „Lachs-Sushi-Rolle mit Avocado“; Bild: schärferes Bild aus deinen Bildern (1333 × 1180) |
| 11 | Erdbeer-Joghurt-Torte | kuchen | fremd | Schritte in eigenen Worten neu; Bild: 3310 KB → 375 KB |
| 12 | Gyoza (japanische gebratene Teigtaschen) | vorsp |  | Name: „Gyoza (Japanese Pan-Fried Dumplings)“ → „Gyoza (japanische gebratene Teigtaschen)“; Geschmack übersetzt; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: schärferes Bild aus deinen Bildern (1402 × 1122) |
| 13 | Hühnerfrikassee mit Käse überbacken | fleisch |  | Kategorie: vorsp → fleisch; Bild: 2766 KB → 310 KB; ⚠ OFFEN: Hühnerfrikassee überbacken: stand unter „Vorspeisen“ – jetzt „Fleisch“. |
| 14 | Schnelles Hühnerfrikassee | fleisch | fremd | Name: „Hühnerfrikassee - schnell und einfach gemacht von bienejanka“ → „Schnelles Hühnerfrikassee“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de) |
| 15 | Würzfleisch nach DDR-Art | vorsp | fremd | Name: „Würzfleisch DDR Rezept“ → „Würzfleisch nach DDR-Art“; Schritte in eigenen Worten neu; Bild: 3596 KB → 390 KB |
| 16 | Frühlingskartoffelsuppe mit Spargel und Bärlauch | suppe | fremd | Name: „Saisonale Frühlingskartoffelsuppe mit Spargel und Bärlauch von Kräuterjule“ → „Frühlingskartoffelsuppe mit Spargel und Bärlauch“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: schärferes Bild aus deinen Bildern (1024 × 1536) |
| 17 | Muttis Gulasch von der Beinscheibe | fleisch | fremd | Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: 235 KB → 136 KB |
| 18 | Knusprige Sushi-Rolle mit Lachs und Avocado | eig_1789556014817 |  | Name: „Crispy Sushi Roll mit Lachs und Avocado“ → „Knusprige Sushi-Rolle mit Lachs und Avocado“; Mengen und Einheiten getrennt; Bild: schärferes Bild aus deinen Bildern (1335 × 1178) |
| 19 | Bandnudeln mit Lachs | fisch |  | Bild: 3624 KB → 447 KB |
| 20 | Rotbarschfilet mit Möhren und Senfcreme | fisch | fremd | Name: „Rotbarsch-Filet mit Möhren und Senfcreme von trekneb“ → „Rotbarschfilet mit Möhren und Senfcreme“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de) |
| 21 | Ratatouille | vegi | fremd | Name: „Ratatouille Rezept - das einfache Original“ → „Ratatouille“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de) |
| 22 | Bärlauchsuppe | vegi | fremd | Name: „Bärlauchsuppe ganz einfach“ → „Bärlauchsuppe“; Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu www.gaumenfreundin.de) |
| 23 | Bratkartoffeln mit Spinat und Spiegelei | vegi | fremd | Name: „Bratkartoffen mit Spinat und Spiegelei“ → „Bratkartoffeln mit Spinat und Spiegelei“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de) |
| 24 | Stollen | kuchen |  | entfernt (Klaus 23.11.) |
| 25 | Hähnchen-Wraps mit Dip-Sauce | fleisch |  | Bild: 3653 KB → 409 KB |
| 26 | Omas cremiger Nudelsalat mit Fleischwurst und Erbsen | fleisch |  | Name: „Omas cremiger Nudelsalat mit Fleischwurst und Erbsen“ → „Omas cremiger Nudelsalat mit Fleischwurst und Erbsen“; Bild: 3773 KB → 432 KB |
| 27 | Bolognese-Sauce mit frischem Gemüse | fleisch |  | Bild: 3877 KB → 468 KB |
| 28 | Szegediner Gulasch | fleisch |  | Name: „Szegediner Gulasch nach allerbestem Rezept“ → „Szegediner Gulasch“; Mengen und Einheiten getrennt; Bild: ersetzt werden (nur 650 × 974 Pixel, zu klein) |
| 29 | Gnocchi-Brokkoli-Auflauf | fleisch |  | Kategorie: vegi → fleisch; Tippfehler im Text korrigiert; Bild: 3622 KB → 415 KB; ⚠ OFFEN: Gnocchi-Brokkoli-Auflauf: enthält Schinken, stand unter „Vegetarisch“ – jetzt „Fleisch“. |
| 30 | Pizza-Toast | finger |  | Kategorie: vegi → finger; Tippfehler im Text korrigiert; Bild: 2989 KB → 367 KB; ⚠ OFFEN: Pizza-Toast: enthält Salami, stand unter „Vegetarisch“ – jetzt „Fingerfood“. |
| 31 | Linsen-Curry mit Kokosmilch | vegi |  | Mengen und Einheiten getrennt; Bild: 2561 KB → 290 KB |
| 32 | Gebratener Reis | vegi |  | Bild: schärferes Bild aus deinen Bildern (1254 × 1254) |
| 33 | Couscous-Salat | vegi |  | Bild: 2777 KB → 323 KB |
| 34 | Klassischer Kartoffelgratin | vegi |  | Mengen und Einheiten getrennt; Tippfehler im Text korrigiert; Bild: 4449 KB → 552 KB |
| 35 | Eierragout mit Senfsoße nach Omas Rezept | vegi |  | Mengen und Einheiten getrennt; Bild: ersetzt werden (Datei „Eierragout-mit-Kartoffeln.jpg“, vermutlich von gaumenfreundin.de) |
| 36 | Saftiger Karottenkuchen | kuchen |  | Name: „Karottenkuchen super saftig“ → „Saftiger Karottenkuchen“; Tippfehler im Text korrigiert; Bild: ersetzt werden (Datei „Karottenkuchen-von-Gaumenfreundin.jpg“) |
| 37 | Eierschecke | kuchen |  | entfernt (Klaus 23.11.) |
| 38 | Gemüsesuppe mit Fleisch | suppe |  | Mengen und Einheiten getrennt; Bild: ersetzt werden (nur 800 × 360 Pixel, zu klein); ⚠ OFFEN: Gemüsesuppe: Portionen 1 bei 1 l Flüssigkeit, vermutlich 2–4. |
| 39 | Melya | tee |  | Kategorie: mock → tee; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: 288 KB → 284 KB |
| 40 | Amaretto fizz → Mixarium | ckt |  | Mengen und Einheiten getrennt; Bild: 252 KB → 250 KB |
| 41 | Mango Mojito → Mixarium | ckt |  | Mengen und Einheiten getrennt; Bild: 247 KB → 243 KB |
| 42 | Heißer Ingwer-Zitronen-Trunk (Kill the Cold) | smooth |  | Name: „Kill the cold Smoothie“ → „Heißer Ingwer-Zitronen-Trunk (Kill the Cold)“; Kategorie: mock → smooth; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: 190 KB → 190 KB |
| 43 | Frucht-Shake | smooth |  | Name: „Fruit Shake“ → „Frucht-Shake“; Kategorie: mock → smooth; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: 211 KB → 209 KB |
| 44 | Bora Bora | mock |  | Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: 187 KB → 185 KB |
| 45 | Blind Russian → Mixarium | smooth |  | Mengen und Einheiten getrennt; Bild: 225 KB → 223 KB |
| 46 | Herbstlicher Kräuter-Nektar | afckt |  | Mengen und Einheiten getrennt; Bild: 243 KB → 239 KB |
| 47 | Amaretto Sunrise → Mixarium | ckt |  | Mengen und Einheiten getrennt; Bild: 231 KB → 229 KB |
| 48 | Queen Charlotte → Mixarium | ckt |  | Mengen und Einheiten getrennt; Bild: 223 KB → 221 KB |
| 49 | Tropical Creamwave | mock |  | Mengen und Einheiten getrennt; Bild: 75 KB → 75 KB |
| 50 | Solero → Mixarium | ckt | fremd | Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: 179 KB → 178 KB |
| 51 | Erdbeer-Matcha-Latte | tee |  | Name: „Strawberry Matcha Latte“ → „Erdbeer-Matcha-Latte“; Kategorie: dessert → tee; Geschmack übersetzt; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: ersetzt werden (Fremdgrafik mit Logo) |