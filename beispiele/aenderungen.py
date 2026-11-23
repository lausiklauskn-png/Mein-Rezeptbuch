import json
p=json.load(open('aus/protokoll.json'))
B=json.load(open('aus/beispielbuch-mein-rezeptbuch.json'))['recipes']
STIL=("Realistisches Food-Foto im Querformat 3:2 (1536 × 1024 Pixel), schräg von oben (etwa 45°), warmes natürliches Tageslicht von der Seite, "
      "rustikaler Holztisch, Leinentuch, ruhiger Hintergrund mit leichter Unschärfe. Appetitlich, ehrlich, wie selbst gekocht, keine Werbe-Optik. "
      "Gestochen scharf, hohe Detailtiefe, damit es auch im Vollbild am Monitor gut aussieht. Keine Schrift, keine Logos, keine Hände, keine Personen.")
MOTIV={
 'Würziger Pfirsich-Punsch':'Zwei Glastassen mit dampfendem, goldorangem Pfirsich-Punsch, darin je eine Zimtstange, daneben ganze Gewürznelken, eine halbe Limette und ein Pfirsich.',
 'Sushi Tempura':'Acht Stücke frittierte, goldbraun panierte Maki-Sushi (Panko-Kruste) auf einem dunklen Steinteller, im Anschnitt sichtbar Reis, Avocado, Gurke und Frühlingszwiebel, dazu ein Schälchen süße Sojasauce.',
 'Schnelles Hühnerfrikassee':'Ein tiefer Teller Hühnerfrikassee mit heller, cremiger Soße, Hähnchenstücken, Möhrenwürfeln, Erbsen und Champignons, daneben eine Schale Reis und ein Zitronenschnitz.',
 'Rotbarschfilet mit Möhren und Senfcreme':'Eine flache Auflaufform mit goldenem Rotbarschfilet auf schräg geschnittenen Möhrenscheiben und heller Senfcreme, mit frischer Petersilie bestreut.',
 'Ratatouille':'Eine große, hohe Pfanne mit buntem Ratatouille aus Aubergine, Zucchini, roter und gelber Paprika und Tomaten, mit frischem Thymian und Rosmarin, daneben ein Stück Baguette.',
 'Bärlauchsuppe':'Eine kräftig grüne, glatt pürierte Bärlauchsuppe in einer Schale, mit einem Klecks Frischkäse und etwas Kresse obenauf, daneben frische Bärlauchblätter.',
 'Bratkartoffeln mit Spinat und Spiegelei':'Ein Teller mit goldbraunen Bratkartoffeln mit Zwiebeln und Petersilie, cremigem Rahmspinat und zwei Spiegeleiern.',
 'Erdbeer-Matcha-Latte':'Ein hohes Glas mit drei sichtbaren Schichten: unten zerdrückte rote Erdbeeren, in der Mitte weiße Milch mit Eiswürfeln, oben hellgrüner Matcha, daneben frische Erdbeeren und ein Bambusbesen.',
 'Eierragout mit Senfsoße nach Omas Rezept':'Eine Schüssel Eierragout: geviertelte hart gekochte Eier in heller Senfsoße mit Möhrenwürfeln, Erbsen und gehackter Petersilie, daneben Salzkartoffeln.',
 'Saftiger Karottenkuchen':'Ein angeschnittener runder Karottenkuchen mit weißem Frischkäse-Topping, darauf gehackte Pistazien und kleine Marzipanmöhren, ein Stück auf einem Kuchenteller.',
 'Gemüsesuppe mit Fleisch':'Ein tiefer Teller klare Gemüsesuppe mit Rindfleischstücken, Möhren, Kartoffelwürfeln, Erbsen und frischer Petersilie, daneben ein Stück Brot.',
 'Szegediner Gulasch':'Ein Bräter mit Szegediner Gulasch aus Schweinefleisch und Sauerkraut in Paprikasoße, mit einem Klecks saurer Sahne obenauf, daneben Lorbeerblätter und Paprikapulver.',
}
md=["# Beispielbuch Mein Rezeptbuch – Änderungsliste","",
"Überarbeitet am 23.11.2026 aus Klaus' Sicherung `mein-rezeptbuch-2026-09-16-11h19.json` (Release `eingang-rezepte`, 55,6 MB) und den Bildern im Release `eingang-bilder` (92 Dateien, 464 MB).","",
"## Ergebnis","","| Datei | Inhalt |","|---|---|",
"| `beispielbuch-mein-rezeptbuch.json` | 44 Rezepte für das öffentliche Beispielbuch (Essen und alkoholfreie Getränke) |",
"| `foodzine-beispiele.json` | 8 vollständige Food-Zine-Sätze mit je drei Seiten |",
"| `getraenke-mit-alkohol-fuer-mixarium.json` | 8 Getränke mit Alkohol, für Mein Mixarium |","",
"## Was überall gemacht wurde","",
"- 70 leere Platzhalter-Karten entfernt (je 10 in sieben Essens-Kategorien).",
"- Jedes Rezept hat eine feste Kennung `uid`, damit doppelte Rezepte beim Laden erkannt werden (die Datei war Fassung 9 und hatte keine).",
"- **Sushi-Befund:** die sieben Sushi-Rezepte stehen in einer selbst angelegten Kategorie mit der Kennung `eig_1789556014817`. Name und Symbol dieser Kategorie speichert die alte App nur im Browser und schreibt sie **nicht** in die Sicherung. In jeder anderen App oder nach dem Leeren des Browsers heißt die Kategorie deshalb nur `eig_1789556014817`, und „Sushi“ findet man nur über die Suche. Die Datei trägt jetzt einen Block `kategorien` mit Name und Symbol in acht Sprachen; der neue Kern liest ihn.",
"- Bilder: höchstens 1600 px, JPEG, ohne Metadaten. Wo es in deinen Bildern eine schärfere oder größere Fassung gab, ist sie jetzt drin.",
"- Mengen und Einheiten in getrennte Felder gesetzt. Mengen selbst nicht verändert; amerikanische Maße umgerechnet, das Original steht als Notiz dabei.","",
"## Deine Bilder (Release `eingang-bilder`)","",
"| Verwendet | Bild |","|---|---|",
"| Rezeptbild, schärfer als vorher | Dragon Roll, Tobiko Sushi, Ebi Tempura, Sushi Platte, Lachs-Sushi-Rolle, Knusprige Sushi-Rolle, Gyoza, Gebratener Reis |",
"| Rezeptbild, neu (vorher nur Link) | Frühlingskartoffelsuppe mit Spargel und Bärlauch |",
"| Food-Zine, vollständig (3 Seiten) | Ratatouille, Würzfleisch, Bärlauchsuppe, Erdbeer-Joghurt-Torte, Muttis Gulasch, Omas Eierragout, Sushi Special, Koreanische Gochujang-Lachs-Bowl (ohne Rezept im Buch) |","",
"**Nicht verwendet:**","",
"- **Doppelt:** Gochujang-Bowl als JPEG 850 × 1201 (dieselben Seiten liegen als PNG in besserer Auflösung vor), Muttis-Gulasch-Panorama zweimal, Bärlauchsuppe-Buchseite zweimal, Gyoza zweimal, Herbstlicher Kräuter-Nektar zweimal, die Panorama-PDFs (gleich wie die ZIPs).",
"- **Zu klein oder unscharf:** Gyoza 512 × 768, Gemüsesuppe 800 × 360, Bildschirmfotos (Gebratener Reis, Dateimanager).",
"- **Einzelne Seiten, kein vollständiger Satz:** Gyoza (zwei Seiten), Kartoffelgratin (Schrittseite und Panorama), die Panorama-Poster (Ratatouille, Bolognese, Muttis Gulasch, Szegediner Gulasch, Sushi Special V1/V2, Würzfleisch-Rezeptkarte), die Kochbuch-Doppelseiten (Bärlauchsuppe, Bandnudeln, Kürbisrisotto, Kichererbsen-Curry).",
"- **Vermutlich fremd:** `erdbeer-joghurt-torte.jpg` (960 × 540, Bildmaß von Chefkoch), `Karottenkuchen-von-Gaumenfreundin.jpg` und `Eierragout-mit-Kartoffeln.jpg` (gleiches Format wie gaumenfreundin.de). Wenn du sie selbst erzeugt hast, sag Bescheid, dann kommen sie wieder hinein.","",
"## Bitte prüfen (offen)",""]
for n,name,cat,alk,src,log in p:
    for l in log:
        if 'OFFEN' in l: md.append(f"- **{name}**: {l.split('OFFEN: ',1)[1]}")
fehlt=[r['name'] for r in B if not r['img']]
md+=["",f"## Neue Bilder nötig ({len(fehlt)}) – Aufträge für ChatGPT","","Gemeinsamer Stil für alle:","","```",STIL,"```",""]
for nm in fehlt:
    md+=[f"### {nm}","","```",MOTIV.get(nm,'(Motiv fehlt)')+" "+STIL,"```",""]
md+=["## Je Rezept","","| Nr | Rezept | Kategorie | Quelle | Änderungen |","|---|---|---|---|---|"]
for n,name,cat,alk,src,log in p:
    md.append(f"| {n} | {name}{' → Mixarium' if alk else ''} | {cat} | {'fremd' if src else ''} | {'; '.join(log)} |")
open('aus/AENDERUNGEN.md','w').write("\n".join(md)); print('fehlen:',fehlt)
