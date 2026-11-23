# Beispielbuch Mein Rezeptbuch – Änderungsliste

Überarbeitet am 23.11.2026 aus Klaus' Sicherung `mein-rezeptbuch-2026-09-16-11h19.json` (Release `eingang-rezepte`, 55,6 MB, SHA-256 `1c9b8523…f05`).

## Ergebnis

| Datei | Inhalt | Größe |
|---|---|---|
| `beispielbuch-mein-rezeptbuch.json` | 44 Rezepte für das öffentliche Beispielbuch (Essen und alkoholfreie Getränke) | 9,3 MB |
| `getraenke-mit-alkohol-fuer-mixarium.json` | 8 Getränke mit Alkohol, für Mein Mixarium | 1,6 MB |

## Was überall gemacht wurde

- 70 leere Platzhalter-Karten entfernt (je 10 in sieben Essens-Kategorien).
- Jedes Rezept hat eine feste Kennung `uid`, damit doppelte Rezepte beim Laden erkannt werden (die Datei war Fassung 9 und hatte keine).
- **Sushi-Befund:** die sieben Sushi-Rezepte standen in einer selbst angelegten Kategorie mit der Kennung `eig_1789556014817`. Name und Symbol dieser Kategorie speichert die alte App nur im Browser und schreibt sie **nicht** in die Sicherung. In jeder anderen App oder nach dem Leeren des Browsers heißt die Kategorie deshalb nur `eig_1789556014817`, und unter „Sushi“ findet man sie nur über die Suche. Die Datei trägt jetzt einen Block `kategorien` mit Name und Symbol in acht Sprachen; der neue Kern liest ihn. Die alte App kennt den Block nicht und zeigt weiter die Kennung.
- Bilder: auf höchstens 1600 px verkleinert, als JPEG gespeichert, Metadaten entfernt (GPS war in keinem Bild). Insgesamt von 55 MB auf rund 9 MB.
- Mengen und Einheiten in getrennte Felder gesetzt (z. B. „400ml“ → 400 · ml). Mengen selbst nicht verändert; amerikanische Maße umgerechnet, das Original steht als Notiz dabei.
- Keine Lab-Daten des Mixariums im Beispielbuch.

## Bitte prüfen (offen)

- **Sushi Tempura**: Sushi Tempura: Portionen 1, ergibt aber 4 Rollen zu je 8 Stücken.
- **Hühnerfrikassee mit Käse überbacken**: Hühnerfrikassee überbacken: stand unter „Vorspeisen“ – jetzt „Fleisch“.
- **Stollen**: Stollen: Zutatenliste stimmt nicht (u. a. „750 g Würste“, „2 x Backpulver“, zweimal Rosinen), Schritte in falscher Reihenfolge, Portionen 1. Bitte Originalrezept nachreichen.
- **Gnocchi-Brokkoli-Auflauf**: Gnocchi-Brokkoli-Auflauf: enthält Schinken, stand unter „Vegetarisch“ – jetzt „Fleisch“.
- **Pizza-Toast**: Pizza-Toast: enthält Salami, stand unter „Vegetarisch“ – jetzt „Fingerfood“.
- **Eierschecke**: Eierschecke: Schritte unvollständig (Boden, Quarkmasse, Backzeit fehlen), „Falscher Hefeteig“ ohne Zutaten. Bitte ergänzen.
- **Gemüsesuppe mit Fleisch**: Gemüsesuppe: Portionen 1 bei 1 l Flüssigkeit, vermutlich 2–4.

## Neue Bilder nötig (9) – Aufträge für ChatGPT

Die vorhandenen Bilder sind übernommen. Diese neun hatten nur einen Link zu einer fremden Seite (Chefkoch, TheCocktailDB, gaumenfreundin.de) oder eine fremde Grafik mit Logo; sie dürfen nicht ins öffentliche Buch. Gemeinsamer Stil für alle:

```
Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Würziger Pfirsich-Punsch

```
Zwei Glastassen mit dampfendem, goldorangem Pfirsich-Punsch, darin je eine Zimtstange, daneben ganze Gewürznelken, eine halbe Limette und ein Pfirsich. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Sushi Tempura

```
Acht Stücke frittierte, goldbraun panierte Maki-Sushi (Panko-Kruste) auf einem dunklen Steinteller, im Anschnitt sichtbar Reis, Avocado, Gurke und Frühlingszwiebel, dazu ein Schälchen süße Sojasauce. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Schnelles Hühnerfrikassee

```
Ein tiefer Teller Hühnerfrikassee mit heller, cremiger Soße, Hähnchenstücken, Möhrenwürfeln, Erbsen und Champignons, daneben eine Schale Reis und ein Zitronenschnitz. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Frühlingskartoffelsuppe mit Spargel und Bärlauch

```
Eine hellgrüne, cremige Kartoffel-Bärlauch-Suppe in einem Suppenteller, obenauf Stücke von weißem Spargel und geröstete Vollkorn-Brotwürfel, daneben ein paar frische Bärlauchblätter. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Rotbarschfilet mit Möhren und Senfcreme

```
Eine flache Auflaufform mit goldenem Rotbarschfilet auf schräg geschnittenen Möhrenscheiben und heller Senfcreme, mit frischer Petersilie bestreut. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Ratatouille

```
Eine große, hohe Pfanne mit buntem Ratatouille aus Aubergine, Zucchini, roter und gelber Paprika und Tomaten, mit frischem Thymian und Rosmarin, daneben ein Stück Baguette. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Bärlauchsuppe

```
Eine kräftig grüne, glatt pürierte Bärlauchsuppe in einer Schale, mit einem Klecks Frischkäse und etwas Kresse obenauf, daneben frische Bärlauchblätter. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Bratkartoffeln mit Spinat und Spiegelei

```
Ein Teller mit goldbraunen Bratkartoffeln mit Zwiebeln und Petersilie, cremigem Rahmspinat und zwei Spiegeleiern. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

### Erdbeer-Matcha-Latte

```
Ein hohes Glas mit drei sichtbaren Schichten: unten zerdrückte rote Erdbeeren, in der Mitte weiße Milch mit Eiswürfeln, oben hellgrüner Matcha, daneben frische Erdbeeren und ein Bambusbesen. Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. Keine Schrift, keine Logos, keine Hände, keine Personen.
```

## Je Rezept

| Nr | Rezept | Kategorie | Quelle | Änderungen |
|---|---|---|---|---|
| 0 | Tropische Kokostraum Bowl → Mixarium | bowle |  | Mengen und Einheiten getrennt; Bild: 211 KB → 208 KB |
| 1 | Tropische Kokostraum-Bowle (alkoholfrei)  | bowle |  | Name: „Tropische Kokostraum-Bowl Alkohol frei“ → „Tropische Kokostraum-Bowle (alkoholfrei)“; Mengen und Einheiten getrennt; Bild: 153 KB → 153 KB |
| 2 | Tropical-Sunrise-Bowle  | bowle |  | Name: „Tropical Sunrise Bowl“ → „Tropical-Sunrise-Bowle“; Mengen und Einheiten getrennt; Bild: 165 KB → 165 KB |
| 3 | Würziger Pfirsich-Punsch  | afckt |  | Name: „Spiced Peach Punch“ → „Würziger Pfirsich-Punsch“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: ersetzt werden (nur Link zu www.thecocktaildb.com) |
| 4 | Raspberry Cooler → Mixarium | bowle |  | Mengen und Einheiten getrennt; Bild: ersetzt werden (nur Link zu www.thecocktaildb.com) |
| 5 | Dragon Roll mit Avocado  | eig_1789556014817 |  | Name: „Avocado Sushi Roll (Dragon Roll)“ → „Dragon Roll mit Avocado“; Mengen und Einheiten getrennt; Bild: 216 KB → 216 KB |
| 6 | Tobiko Sushi mit Ebi Tempura  | eig_1789556014817 |  | Mengen und Einheiten getrennt; Bild: 122 KB → 122 KB |
| 7 | Ebi Tempura  | eig_1789556014817 |  | Bild: 90 KB → 90 KB |
| 8 | Sushi Platte  | eig_1789556014817 |  | Bild: 165 KB → 165 KB |
| 9 | Sushi Tempura  | eig_1789556014817 | fremd | Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de); ⚠ OFFEN: Sushi Tempura: Portionen 1, ergibt aber 4 Rollen zu je 8 Stücken. |
| 10 | Lachs-Sushi-Rolle mit Avocado  | eig_1789556014817 |  | Name: „Salmon Sushi Roll mit Avocado“ → „Lachs-Sushi-Rolle mit Avocado“; Bild: 107 KB → 107 KB |
| 11 | Erdbeer-Joghurt-Torte  | kuchen | fremd | Schritte in eigenen Worten neu; Bild: 3310 KB → 375 KB |
| 12 | Gyoza (japanische gebratene Teigtaschen)  | vorsp |  | Name: „Gyoza (Japanese Pan-Fried Dumplings)“ → „Gyoza (japanische gebratene Teigtaschen)“; Geschmack übersetzt; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: 114 KB → 114 KB |
| 13 | Hühnerfrikassee mit Käse überbacken  | fleisch |  | Kategorie: vorsp → fleisch; Bild: 2766 KB → 310 KB; ⚠ OFFEN: Hühnerfrikassee überbacken: stand unter „Vorspeisen“ – jetzt „Fleisch“. |
| 14 | Schnelles Hühnerfrikassee  | fleisch | fremd | Name: „Hühnerfrikassee - schnell und einfach gemacht von bienejanka“ → „Schnelles Hühnerfrikassee“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de) |
| 15 | Würzfleisch nach DDR-Art  | vorsp | fremd | Name: „Würzfleisch DDR Rezept“ → „Würzfleisch nach DDR-Art“; Schritte in eigenen Worten neu; Bild: 3596 KB → 390 KB |
| 16 | Frühlingskartoffelsuppe mit Spargel und Bärlauch  | suppe | fremd | Name: „Saisonale Frühlingskartoffelsuppe mit Spargel und Bärlauch von Kräuterjule“ → „Frühlingskartoffelsuppe mit Spargel und Bärlauch“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de) |
| 17 | Muttis Gulasch von der Beinscheibe  | fleisch | fremd | Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: 235 KB → 136 KB |
| 18 | Knusprige Sushi-Rolle mit Lachs und Avocado  | eig_1789556014817 |  | Name: „Crispy Sushi Roll mit Lachs und Avocado“ → „Knusprige Sushi-Rolle mit Lachs und Avocado“; Mengen und Einheiten getrennt; Bild: 141 KB → 141 KB |
| 19 | Bandnudeln mit Lachs  | fisch |  | Bild: 3624 KB → 447 KB |
| 20 | Rotbarschfilet mit Möhren und Senfcreme  | fisch | fremd | Name: „Rotbarsch-Filet mit Möhren und Senfcreme von trekneb“ → „Rotbarschfilet mit Möhren und Senfcreme“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de) |
| 21 | Ratatouille  | vegi | fremd | Name: „Ratatouille Rezept - das einfache Original“ → „Ratatouille“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de) |
| 22 | Bärlauchsuppe  | vegi | fremd | Name: „Bärlauchsuppe ganz einfach“ → „Bärlauchsuppe“; Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu www.gaumenfreundin.de) |
| 23 | Bratkartoffeln mit Spinat und Spiegelei  | vegi | fremd | Name: „Bratkartoffen mit Spinat und Spiegelei“ → „Bratkartoffeln mit Spinat und Spiegelei“; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: ersetzt werden (nur Link zu img.chefkoch-cdn.de) |
| 24 | Stollen  | kuchen |  | Bild: 4070 KB → 461 KB; ⚠ OFFEN: Stollen: Zutatenliste stimmt nicht (u. a. „750 g Würste“, „2 x Backpulver“, zweimal Rosinen), Schritte in falscher Reihenfolge, Portionen 1. Bitte Originalrezept nachreichen. |
| 25 | Hähnchen-Wraps mit Dip-Sauce  | fleisch |  | Bild: 3653 KB → 409 KB |
| 26 | Omas cremiger Nudelsalat mit Fleischwurst und Erbsen  | fleisch |  | Name: „Omas cremiger Nudelsalat mit Fleischwurst und Erbsen“ → „Omas cremiger Nudelsalat mit Fleischwurst und Erbsen“; Bild: 3773 KB → 432 KB |
| 27 | Bolognese-Sauce mit frischem Gemüse  | fleisch |  | Bild: 3877 KB → 468 KB |
| 28 | Szegediner Gulasch  | fleisch |  | Name: „Szegediner Gulasch nach allerbestem Rezept“ → „Szegediner Gulasch“; Mengen und Einheiten getrennt; Bild: 176 KB → 167 KB |
| 29 | Gnocchi-Brokkoli-Auflauf  | fleisch |  | Kategorie: vegi → fleisch; Tippfehler im Text korrigiert; Bild: 3622 KB → 415 KB; ⚠ OFFEN: Gnocchi-Brokkoli-Auflauf: enthält Schinken, stand unter „Vegetarisch“ – jetzt „Fleisch“. |
| 30 | Pizza-Toast  | finger |  | Kategorie: vegi → finger; Tippfehler im Text korrigiert; Bild: 2989 KB → 367 KB; ⚠ OFFEN: Pizza-Toast: enthält Salami, stand unter „Vegetarisch“ – jetzt „Fingerfood“. |
| 31 | Linsen-Curry mit Kokosmilch  | vegi |  | Mengen und Einheiten getrennt; Bild: 2561 KB → 290 KB |
| 32 | Gebratener Reis  | vegi |  | Bild: 889 KB → 231 KB |
| 33 | Couscous-Salat  | vegi |  | Bild: 2777 KB → 323 KB |
| 34 | Klassischer Kartoffelgratin  | vegi |  | Mengen und Einheiten getrennt; Tippfehler im Text korrigiert; Bild: 4449 KB → 552 KB |
| 35 | Eierragout mit Senfsoße nach Omas Rezept  | vegi |  | Mengen und Einheiten getrennt; Bild: 266 KB → 256 KB |
| 36 | Saftiger Karottenkuchen  | kuchen |  | Name: „Karottenkuchen super saftig“ → „Saftiger Karottenkuchen“; Tippfehler im Text korrigiert; Bild: 317 KB → 306 KB |
| 37 | Eierschecke  | kuchen |  | Mengen und Einheiten getrennt; Bild: 4041 KB → 356 KB; ⚠ OFFEN: Eierschecke: Schritte unvollständig (Boden, Quarkmasse, Backzeit fehlen), „Falscher Hefeteig“ ohne Zutaten. Bitte ergänzen. |
| 38 | Gemüsesuppe mit Fleisch  | suppe |  | Mengen und Einheiten getrennt; Bild: 72 KB → 72 KB; ⚠ OFFEN: Gemüsesuppe: Portionen 1 bei 1 l Flüssigkeit, vermutlich 2–4. |
| 39 | Melya  | tee |  | Kategorie: mock → tee; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: 288 KB → 284 KB |
| 40 | Amaretto fizz → Mixarium | ckt |  | Mengen und Einheiten getrennt; Bild: 252 KB → 250 KB |
| 41 | Mango Mojito → Mixarium | ckt |  | Mengen und Einheiten getrennt; Bild: 247 KB → 243 KB |
| 42 | Heißer Ingwer-Zitronen-Trunk (Kill the Cold)  | smooth |  | Name: „Kill the cold Smoothie“ → „Heißer Ingwer-Zitronen-Trunk (Kill the Cold)“; Kategorie: mock → smooth; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: 190 KB → 190 KB |
| 43 | Frucht-Shake  | smooth |  | Name: „Fruit Shake“ → „Frucht-Shake“; Kategorie: mock → smooth; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: 211 KB → 209 KB |
| 44 | Bora Bora  | mock |  | Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: 187 KB → 185 KB |
| 45 | Blind Russian → Mixarium | smooth |  | Mengen und Einheiten getrennt; Bild: 225 KB → 223 KB |
| 46 | Herbstlicher Kräuter-Nektar  | afckt |  | Mengen und Einheiten getrennt; Bild: 243 KB → 239 KB |
| 47 | Amaretto Sunrise → Mixarium | ckt |  | Mengen und Einheiten getrennt; Bild: 231 KB → 229 KB |
| 48 | Queen Charlotte → Mixarium | ckt |  | Mengen und Einheiten getrennt; Bild: 223 KB → 221 KB |
| 49 | Tropical Creamwave  | mock |  | Mengen und Einheiten getrennt; Bild: 75 KB → 75 KB |
| 50 | Solero → Mixarium | ckt | fremd | Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte in eigenen Worten neu; Bild: 179 KB → 178 KB |
| 51 | Erdbeer-Matcha-Latte  | tee |  | Name: „Strawberry Matcha Latte“ → „Erdbeer-Matcha-Latte“; Kategorie: dessert → tee; Geschmack übersetzt; Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet); Schritte übersetzt/geordnet; Bild: ersetzt werden (Fremdgrafik mit Logo) |