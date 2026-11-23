# Überarbeitung der Rezept-Sicherung von Klaus (2026-11-23).
# Regeln: nichts verfälschen. Zutaten und Mengen bleiben, Einheiten nur sauber getrennt oder umgerechnet (oz -> cl/ml, cup -> ml).
# Rezepte mit fremder Quelle: Schritte in eigenen Worten. Englisches übersetzt. Bilder: vorhandene verkleinert, ohne Metadaten.
import json, base64, io, re, sys, hashlib, copy
from PIL import Image

QUELLE = sys.argv[1]; ZIEL = sys.argv[2]
d = json.load(open(QUELLE))
ALLE = [r for r in d['recipes'] if str(r.get('name') or '').strip()]

def I(amt, unit, name, note=''):
    return {'amt': amt, 'unit': unit, 'name': name, 'note': note}

# ---------------------------------------------------------------- Änderungen je Rezept (Index wie in alle.txt)
NAME = {
 1: 'Tropische Kokostraum-Bowle (alkoholfrei)', 2: 'Tropical-Sunrise-Bowle', 3: 'Würziger Pfirsich-Punsch',
 5: 'Dragon Roll mit Avocado', 10: 'Lachs-Sushi-Rolle mit Avocado',
 12: 'Gyoza (japanische gebratene Teigtaschen)', 14: 'Schnelles Hühnerfrikassee', 15: 'Würzfleisch nach DDR-Art',
 16: 'Frühlingskartoffelsuppe mit Spargel und Bärlauch', 18: 'Knusprige Sushi-Rolle mit Lachs und Avocado',
 20: 'Rotbarschfilet mit Möhren und Senfcreme', 21: 'Ratatouille', 22: 'Bärlauchsuppe',
 23: 'Bratkartoffeln mit Spinat und Spiegelei', 26: 'Omas cremiger Nudelsalat mit Fleischwurst und Erbsen',
 28: 'Szegediner Gulasch', 36: 'Saftiger Karottenkuchen', 42: 'Heißer Ingwer-Zitronen-Trunk (Kill the Cold)',
 43: 'Frucht-Shake', 51: 'Erdbeer-Matcha-Latte',
}
KAT = {13: 'fleisch', 29: 'fleisch', 30: 'finger', 39: 'tee', 42: 'smooth', 43: 'smooth', 51: 'tee'}
FLAV = {12: ['herzhaft, unten knusprig, mit würziger Füllung'], 51: ['cremig, fruchtig, herb']}

ZUT = {
 3: [I('1,4','l','Pfirsichnektar','46 oz'), I('600','ml','Orangensaft','20 oz'), I('100','g','brauner Zucker','½ Tasse'),
     I('3','Stück','Zimtstangen','je etwa 7 cm'), I('½','TL','Gewürznelken'), I('2','EL','Limettensaft')],
 12: [I('200','g','Schweinehackfleisch'), I('100','g','Weißkohl','fein gehackt'), I('2','Stangen','Frühlingszwiebeln','fein gehackt'),
      I('1','Zehe','Knoblauch','fein gehackt'), I('1','TL','Ingwer','gerieben'), I('1','EL','Sojasauce'), I('1','TL','Sesamöl'),
      I('½','TL','Salz'), I('¼','TL','weißer Pfeffer'), I('25–30','Stück','Gyoza-Teigblätter'), I('2','EL','Pflanzenöl'),
      I('100','ml','Wasser'), I('2','EL','Sojasauce','zum Dippen'), I('1','EL','Reisessig','zum Dippen'), I('1','TL','Chiliöl','zum Dippen')],
 39: [I('1','Tasse','Espresso'), I('1','TL','Honig'), I('1','TL','Kakaopulver','ungesüßt'), I('','','Sahne','zum Servieren')],
 42: [I('2–3','cm','Ingwer','1 inch'), I('¼','Stück','Zitrone'), I('250','ml','heißes Wasser','1 cup')],
 43: [I('250','ml','Fruchtjoghurt','1 cup'), I('1','Stück','Banane'), I('120','ml','Orangensaft','gefroren, 4 oz'),
      I('½','Stück','Obst nach Wahl'), I('6','Stück','Eiswürfel')],
 44: [I('10','cl','Ananassaft'), I('6','cl','Maracujasaft'), I('1','cl','Zitronensaft'), I('1','cl','Grenadine')],
 14: [I('400','ml','Hühnerbrühe'), I('250','g','Hähnchenfleisch','gegart, gern Reste'), I('150','g','Möhren'), I('150','g','Champignons'),
      I('150','g','Erbsen','tiefgekühlt'), I('25','g','Butter'), I('25','g','Mehl'), I('100','ml','Sahne'), I('1','Spritzer','Zitronensaft'),
      I('','','Salz und Pfeffer')],
 16: [I('750','ml','Wasser'), I('3','Stangen','Spargel'), I('30','g','Butter'), I('1','Prise','Salz'), I('','','Zucker'),
      I('3','Stück','Kartoffeln','mittelgroß, vorwiegend festkochend oder mehlig'), I('1','Handvoll','Bärlauch','frisch'),
      I('3','Scheiben','Vollkorntoast'), I('','','Milch oder Sahne','nach Bedarf'), I('½','TL','Gemüsebrühe','Paste')],
 17: [I('1','kg','Rinderbeinscheiben','ohne Knochen'), I('150','g','Schweineschmalz'), I('1','kg','Zwiebeln','weiß, geschnitten'),
      I('1','Spritzer','Essig'), I('40','g','Paprikapulver','edelsüß'), I('2','Zehen','Knoblauch','zerdrückt'),
      I('1','TL','Kümmel','gestrichen, gehackt; muss nicht sein, lieber weniger als mehr Gewürze'),
      I('1','TL','Majoran','gestrichen; bei Wildgulasch 5 Wacholderbeeren und 5 Pimentkörner'),
      I('1','EL','Tomatenmark','gestrichen'), I('1','Prise','Salz'), I('2','Prisen','schwarzer Kampot-Pfeffer'),
      I('1','Löffel','Preiselbeer- oder Brombeermarmelade'), I('¼','Flasche','trockener Rotwein','z. B. Dornfelder'), I('1','Bund','Suppengemüse')],
 9: [I('250','g','Sushi-Reis','gekocht'), I('4','Blatt','Nori'), I('½','Stück','Avocado','in schmale Streifen geschnitten'),
     I('','','Gurke','nach Belieben, gleiche Menge wie die Avocado, in schmale Streifen'), I('1','Stück','Frühlingszwiebel','nur das Grüne'),
     I('','','Frischkäse','nach Belieben'), I('300','ml','Öl','zum Frittieren'), I('1','Stück','Ei'), I('50','g','Mehl'),
     I('','','Salz und Pfeffer'), I('','','Chili'), I('150','g','Panko','oder Paniermehl')],
 20: [I('500','g','Möhren'), I('20','g','Butter'), I('','','Salz und Pfeffer','aus der Mühle'), I('100','ml','Gemüsebrühe'),
      I('½','Bund','Petersilie'), I('125','g','Crème fraîche'), I('1','EL','Senf'), I('350','g','Rotbarschfilet')],
 21: [I('1','Stück','Aubergine','mittelgroß'), I('2','Stück','Zucchini','mittelgroß'), I('2','Stück','rote Paprikaschoten','groß'),
      I('2','Stück','gelbe Paprikaschoten','groß'), I('1','Dose','geschälte Tomaten','groß'), I('1','Stück','Gemüsezwiebel','groß'),
      I('4','Zehen','Knoblauch'), I('1','TL','Rosmarin','frisch, gehackt'), I('1','EL','Thymian','frisch, gehackt'),
      I('1','EL','Salbei','frisch, gehackt'), I('½','TL','Lavendelblüten','getrocknet, zerrieben'), I('1','TL','Zucker','gehäuft'),
      I('100','ml','Olivenöl'), I('','','Meersalz und schwarzer Pfeffer','aus der Mühle'), I('½','Tube','Tomatenmark')],
 23: [I('450','g','Kartoffeln','festkochend'), I('2','Stück','Zwiebeln'), I('2','Stiele','Petersilie'), I('450','g','Blattspinat','tiefgekühlt'),
      I('30','ml','Milch'), I('3','EL','Rapsöl'), I('1','EL','Mehl'), I('1','EL','Crème fraîche'), I('4','Stück','Eier'),
      I('1','TL','Butter'), I('','','Salz und Pfeffer'), I('','','Muskat')],
 50: [I('5','cl','Maracujasaft'), I('3','cl','Orangensaft'), I('1','TL','Zitronensaft'), I('1','TL','Vanillesirup','sehr wichtig'),
      I('1,5','cl','Wodka'), I('','','Eis','gewürfelt oder gecrusht, nach Belieben')],
 51: [I('5–6','Stück','Erdbeeren','frisch'), I('1–2','TL','Honig oder Agavendicksaft'), I('1','TL','Matcha-Pulver'),
      I('80','ml','Milch oder Pflanzendrink'), I('30','ml','heißes Wasser'), I('1','Portion','Eiswürfel')],
}

SCHRITTE = {
 3: ['Pfirsichnektar, Orangensaft und braunen Zucker in einen großen Topf geben. Zimtstangen und Nelken in ein Gewürzsäckchen oder Teesieb füllen und hineinhängen.',
     'Langsam erhitzen und rühren, bis sich der Zucker gelöst hat.', 'Etwa 10 Minuten leise köcheln lassen.',
     'Gewürze herausnehmen, Limettensaft einrühren.', 'Heiß in vorgewärmten Tassen servieren.'],
 12: ['Hackfleisch, Weißkohl, Frühlingszwiebeln, Knoblauch, Ingwer, Sojasauce, Sesamöl, Salz und weißen Pfeffer in einer Schüssel gut vermengen.',
      'Je etwa einen Esslöffel Füllung in die Mitte eines Teigblatts setzen.',
      'Den Rand mit Wasser befeuchten, das Blatt zur Hälfte falten und den Rand in Falten fest andrücken.',
      'Öl in einer beschichteten Pfanne bei mittlerer bis starker Hitze erhitzen und die Gyoza nebeneinander hineinsetzen.',
      'Braten, bis die Unterseiten goldbraun sind, etwa 2–3 Minuten.',
      'Das Wasser angießen und sofort den Deckel auflegen, damit die Teigtaschen dämpfen.',
      'Garen, bis das Wasser verdampft und die Unterseiten wieder knusprig sind, etwa 3–4 Minuten.',
      'Sojasauce, Reisessig und Chiliöl zum Dip verrühren und die Gyoza sofort servieren, mit Frühlingszwiebelringen bestreut.'],
 39: ['Einen Espresso zubereiten.', 'Kakaopulver in eine Tasse geben und den Honig darüberträufeln.',
      'Kakao und Honig verrühren, bis eine dicke, glänzende Masse entsteht, ähnlich wie dunkle Schokoladensauce.',
      'Den heißen Espresso darübergießen und unter Rühren auflösen.', 'Mit etwas Sahne servieren.'],
 42: ['Ingwer und Zitrone entsaften oder fein reiben und auspressen.', 'Mit dem heißen Wasser aufgießen.',
      'Nach Belieben mit etwas Kardamom würzen.'],
 43: ['Alle Zutaten in einen Mixer geben und glatt und cremig mixen.'],
 44: ['Alle Zutaten im Shaker oder Mixer mit Eis kurz mixen.', 'In ein Longdrinkglas mit Eiswürfeln abseihen.',
      'Mit einer Ananasscheibe und einer Kirsche garnieren.'],
 9:  ['Die Bambusmatte in Frischhaltefolie wickeln und ein Noriblatt darauflegen. 50–65 g kalten Sushi-Reis etwa 1 cm dick verteilen und am oberen Rand 2 cm frei lassen.',
      'Frühlingszwiebelgrün und je vier Streifen Avocado und Gurke quer etwa 1 cm vom unteren Rand auflegen, nach Belieben etwas Frischkäse dazu.',
      'Mit der Matte fest aufrollen, ohne den Reis zu stark zusammenzudrücken; der freie Rand verschließt die Rolle. So alle vier Rollen formen.',
      'Für die Panade drei Teller vorbereiten: verquirltes Ei, Mehl mit einer Prise Salz, Pfeffer und Chili, Panko.',
      'Jede Rolle außen ganz leicht mit Wasser befeuchten, in Mehl wenden, durch das Ei ziehen und rundum gleichmäßig in Panko rollen.',
      'Das Öl in einem Topf oder einer tiefen Pfanne erhitzen, die groß genug für die Rollen ist. Die Rollen 3–4 Minuten goldbraun frittieren.',
      'Mit einer Zange herausheben, auf Küchenpapier abtropfen und mindestens 10 Minuten abkühlen lassen.',
      'Die Messerspitze in kaltes Wasser tauchen und jede Rolle in etwa 1,5 cm breite Stücke schneiden. Warm mit süßer Sojasauce oder Mayonnaise servieren.',
      'Tipp: Für den Anfang die Rollen vor dem Panieren halbieren. Die Füllung lässt sich frei abwandeln; ohne Ei, mit einem anderen Bindemittel, wird es vegan.'],
 11: ['Den Backofen auf 180 °C Ober-/Unterhitze vorheizen.', 'Die Eier trennen und das Eiweiß steif schlagen.',
      'Salz und 50 g Zucker einrieseln lassen, dann die Eigelbe unterrühren.', 'Mehl, Kakao und Backpulver mischen und vorsichtig unterheben.',
      'Eine Springform mit Backpapier auslegen, den Teig einfüllen und glatt streichen.', 'Etwa 10 Minuten backen und auskühlen lassen.',
      '300 g Erdbeeren klein würfeln.', 'Die Gelatine in kaltem Wasser einweichen.', 'Den Joghurt mit 75 g Zucker und dem Vanillezucker verrühren.',
      'Die Gelatine ausdrücken, auflösen und zuerst mit zwei Esslöffeln Joghurtcreme verrühren, dann unter die übrige Creme ziehen.',
      '400 g Sahne steif schlagen und zusammen mit den Erdbeerwürfeln unter die Creme heben.',
      'Die Creme auf den Boden geben und zwei Stunden kalt stellen.', 'Die Schokolade hacken und mit 100 g Sahne und dem Kokosfett schmelzen.',
      'Den Guss über die Torte gießen und 30 Minuten kühlen.', 'Den Tortenring lösen und die übrigen Erdbeeren als Deko auflegen.',
      'In Stücke schneiden und servieren.'],
 14: ['Das gegarte Hähnchenfleisch klein würfeln.',
      'Möhren schälen und sehr klein schneiden, Champignons putzen und klein schneiden, Erbsen abwiegen. Die Brühe bereitstellen.',
      'Die Butter in einem Topf schmelzen, das Mehl einrühren und unter ständigem Rühren mit dem Schneebesen hell anschwitzen.',
      'Die Brühe nach und nach einrühren und kurz aufkochen. Sahne, Champignons, Möhren und Erbsen dazugeben und 5–8 Minuten köcheln lassen, dabei gelegentlich rühren.',
      'Mit Zitronensaft, Salz und Pfeffer abschmecken, das Fleisch dazugeben und 5 Minuten darin erwärmen.',
      'Dazu passt gekochter Reis.'],
 15: ['Das Fleisch klein schneiden. Die Butter in einem Topf schmelzen, das Mehl einrühren und kurz anschwitzen.',
      'Mit Brühe und Sahne ablöschen, Weißwein und Senf dazugeben und aufkochen. Mit Salz, Pfeffer, Paprika und Worcestersauce würzen.',
      'Das Fleisch hineingeben und einige Minuten köcheln lassen.', 'In ofenfeste Förmchen füllen und mit Käse bestreuen.',
      'Bei 180 °C etwa 15–20 Minuten überbacken.', 'Mit Zitronenscheiben und Petersilie servieren.'],
 16: ['Den Spargel schälen und im Wasser mit Butter, Salz und etwas Zucker weich kochen; die Schalen können mitkochen.',
      'Den Spargel herausnehmen und warm halten. Die Schalen noch etwas weiterkochen und dann entfernen.',
      'Die Kartoffeln schälen, klein schneiden und in der Spargelbrühe weich kochen. Nach Belieben etwa ½ TL Gemüsebrühe dazugeben.',
      'Die Kartoffeln pürieren, den gewaschenen und grob gehackten Bärlauch dazugeben und noch einmal kurz pürieren. Nach Belieben etwas Milch oder Sahne einrühren.',
      'Die Spargelstücke zurück in die Suppe geben. Das Toastbrot würfeln und rösten.',
      'Die Suppe anrichten, mit den Brotwürfeln bestreuen und sofort servieren.'],
 17: ['Das Fleisch in mittelgroße Würfel schneiden und im Schmalz in einem Bräter oder einer hohen Pfanne von allen Seiten scharf anbraten, mit Salz und Pfeffer würzen. Zwiebeln und Knoblauch dazugeben und mitbraten; ruhig kräftig Farbe nehmen lassen. Inzwischen das Suppengemüse waschen und schneiden.',
      'Den Essig mit 1/16 Liter Wasser mischen und zum ersten Mal ablöschen. Nach Wunsch Kümmel (oder Wacholder und Piment), Majoran und Tomatenmark dazugeben und alles im eigenen Saft dünsten.',
      'Die Soße immer wieder einkochen lassen und mit wenig Wasser ablöschen. Das Fleisch soll anfangs nur dünsten, nicht kochen. Nach etwa 30 Minuten das Suppengemüse dazugeben.',
      'Weiter schrittweise ablöschen und reduzieren: Wasser, Wasser mit Tomatenmark, dann den Wein, dann getrocknete, zerriebene Waldpilze mit Wasser, zuletzt Wasser mit einem Würfel Jägersoße. Am Ende soll alles gerade eben von Soße bedeckt sein. Das schrittweise Zugeben und Einkochen macht das Gulasch sämig.',
      'Zum Schluss mit etwas dunkler Marmelade eine leicht süßlich-fruchtige Note geben.'],
 20: ['Den Backofen auf 200 °C Ober-/Unterhitze vorheizen und eine flache Auflaufform ausbuttern.',
      'Die Möhren schälen, schräg in Scheiben schneiden und 4–5 Minuten in Butter andünsten. Salzen, pfeffern, die Brühe angießen und zugedeckt in etwa 5 Minuten fertig garen.',
      'Die Petersilie fein hacken (etwas zum Garnieren zurückbehalten) und mit Crème fraîche und Senf verrühren, salzen und pfeffern. Den Fisch salzen und pfeffern.',
      'Die Hälfte der Möhren in die Form geben, die Hälfte der Senfcreme darauf verteilen, den Fisch auflegen und mit den übrigen Möhren und der restlichen Creme bedecken.',
      'Auf der zweiten Schiene von unten etwa 15 Minuten backen und mit Petersilie bestreut servieren. Dazu passen Nudeln.'],
 21: ['Das Gemüse waschen, putzen und in mundgerechte Stücke schneiden, die Gemüsezwiebel grob würfeln, den Knoblauch fein hacken und die Kräuter hacken.',
      'Die Auberginenstücke salzen, mindestens 10 Minuten ziehen lassen und gut trocken tupfen.',
      'Das Olivenöl in einer großen, hohen Pfanne erhitzen. Zwiebel und Zucchini anbraten, dann die Paprika und zuletzt die Aubergine dazugeben und alles etwa 5 Minuten kräftig braten.',
      'Das Tomatenmark einrühren, salzen und pfeffern. Knoblauch, Kräuter, Tomaten und Zucker dazugeben und bei mittlerer Hitze etwa 20 Minuten köcheln lassen, bei Bedarf etwas Wasser angießen. Das Gemüse soll noch Biss haben.',
      'Passt zu Baguette oder Reis und als Beilage zu Lamm oder Rind. Die Lavendelblüten können weggelassen werden, getrocknete Kräuter gehen auch.'],
 22: ['Zwiebel und Kartoffeln schälen und klein würfeln, den Bärlauch waschen und grob schneiden.',
      'Die Butter in einem großen Topf erhitzen, die Zwiebel glasig dünsten, die Kartoffeln kurz mitbraten.',
      'Die Brühe angießen und etwa 15 Minuten köcheln lassen, bis die Kartoffeln weich sind.',
      'Frischkäse und Bärlauch dazugeben und 2 Minuten bei kleiner Hitze ziehen lassen. Mit Salz, Pfeffer und Muskat würzen und fein pürieren.',
      'Nach Belieben mit Kresse garnieren.'],
 23: ['Die Kartoffeln am Vortag in der Schale in Salzwasser etwa 25 Minuten kochen, abgießen, pellen und abgedeckt kalt stellen.',
      'Eine halbe Stunde vor dem Braten herausnehmen. In einer Pfanne 1 EL Öl erhitzen, die Kartoffeln in Scheiben schneiden und braten.',
      'Eine Zwiebel würfeln und mitbraten. Die Petersilie hacken, dazugeben und alles würzen.',
      'Den Spinat in einem Topf auftauen, die Milch dazugeben und einige Minuten köcheln lassen.',
      'Die zweite Zwiebel würfeln, in 1 EL Öl glasig dünsten und zum Spinat geben.',
      'In einer kleinen Pfanne 1 EL Öl erhitzen, das Mehl einrühren und diese Einbrenne unter den Spinat rühren.',
      'Den Spinat kurz aufkochen, vom Herd nehmen, Crème fraîche einrühren und mit Salz, Pfeffer und Muskat abschmecken.',
      'Die Butter in einer weiteren Pfanne erhitzen, die Spiegeleier braten und alles zusammen servieren.'],
 50: ['Alle Zutaten verrühren und in ein Longdrinkglas füllen.', 'Nach Belieben Eis dazugeben und servieren.'],
 51: ['Die Erdbeeren waschen, entstielen und klein schneiden.', 'In ein Glas geben, den Honig dazugeben und mit einem Löffel zerdrücken.',
     'Den Matcha in eine Schale sieben, mit dem heißen Wasser aufgießen und mit einem Bambusbesen schaumig schlagen.',
     'Eiswürfel ins Glas geben und die Milch langsam über die Erdbeeren gießen.', 'Den Matcha vorsichtig darübergießen, damit sich die Schichten abheben.'],
}
# kleine Korrekturen (Tippfehler) in eigenen Texten
TIPPFEHLER = [('glattstreichne', 'glatt streichen'), ('Grad Ober- und Unterhitze', '°C Ober-/Unterhitze'), ('180°C', '180 °C')]

BILD_ERSETZEN = {51}            # TikTok-Grafik mit Logo
ROH = '/tmp/claude-0/bilder/roh/'
BILD_DATEI = {5: 'file_00000000004c71f4bfa0fd30e2868951.png', 6: 'file_00000000cc807243985fcb69f415ef81.png', 7: 'file_0000000013bc7246aaa7794d0193061a.png',
 8: 'file_000000004080724685f3fb7b1f008182.png', 10: 'file_000000008e587243a2afb04033f0b80d.png', 12: 'ChatGPT.Image.25.Apr.2026.10_41_00.png',
 16: 'file_00000000b650720a93f242e4b3bcd2bd.png', 18: 'file_00000000b9447243a03d9d74bfd42467.png', 32: 'file_000000003cb471f4b2af905d5bf4fa2a.png'}
BILD_RAUS = {35: 'ersetzt werden (Datei „Eierragout-mit-Kartoffeln.jpg“, vermutlich von gaumenfreundin.de)',
 36: 'ersetzt werden (Datei „Karottenkuchen-von-Gaumenfreundin.jpg“)', 38: 'ersetzt werden (nur 800 × 360 Pixel, zu klein)',
 28: 'ersetzt werden (nur 650 × 974 Pixel, zu klein)'}
ALKOHOL = {0, 4, 40, 41, 45, 47, 48, 50}
OFFEN = {
 37: 'Eierschecke: Schritte unvollständig (Boden, Quarkmasse, Backzeit fehlen), „Falscher Hefeteig“ ohne Zutaten. Bitte ergänzen.',
 38: 'Gemüsesuppe: Portionen 1 bei 1 l Flüssigkeit, vermutlich 2–4.',
 9:  'Sushi Tempura: Portionen 1, ergibt aber 4 Rollen zu je 8 Stücken.',
 30: 'Pizza-Toast: enthält Salami, stand unter „Vegetarisch“ – jetzt „Fingerfood“.',
 29: 'Gnocchi-Brokkoli-Auflauf: enthält Schinken, stand unter „Vegetarisch“ – jetzt „Fleisch“.',
 13: 'Hühnerfrikassee überbacken: stand unter „Vorspeisen“ – jetzt „Fleisch“.',
}

def bild(r, n):
    s = r.get('img') or ''
    if n in BILD_ERSETZEN: return '', 'ersetzt werden (Fremdgrafik mit Logo)'
    if n in BILD_RAUS: return '', BILD_RAUS[n]
    if n in BILD_DATEI:
        im = Image.open(ROH + BILD_DATEI[n]).convert('RGB'); im.thumbnail((1600, 1600), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'JPEG', quality=84, optimize=True, progressive=True)
        return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode(), f'schärferes Bild aus deinen Bildern ({im.width} × {im.height})'
    if not s.startswith('data:'): return '', ('ersetzt werden (nur Link zu ' + re.sub(r'^https?://([^/]+).*', r'\1', s) + ')') if s else 'fehlt'
    im = Image.open(io.BytesIO(base64.b64decode(s.split(',', 1)[1])))
    vorher = len(s)
    im = im.convert('RGB'); im.thumbnail((1600, 1600), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=84, optimize=True, progressive=True)   # ohne EXIF
    neu = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
    if len(neu) >= vorher and not im.info.get('exif'): neu = s  # nie größer machen
    return neu, f'{vorher//1000} KB → {len(neu)//1000} KB'

def einheit_trennen(z):
    a, u = (z.get('amt') or '').strip(), (z.get('unit') or '').strip()
    m = re.match(r'^([\d.,/½¼¾\- ]+)\s*([A-Za-zäöüÄÖÜ.]+)$', a)
    if not u and m and m.group(2).lower() not in ('fresh',):
        a, u = m.group(1).strip(), m.group(2)
    a = a.replace('0.5', '½').replace('1/2', '½').replace('1/4', '¼')
    if re.fullmatch(r'\d+\.\d+', a): a = a.replace('.', ',')
    return a, u

RAUS = {24, 37}  # Stollen und Eierschecke: Klaus 23.11. „rausnehmen“
protokoll = []; buch = []; mix = []
for n, r0 in enumerate(ALLE):
    if n in RAUS: protokoll.append((n, r0['name'], r0['cat'], False, r0.get('source',''), ['entfernt (Klaus 23.11.)'])); continue
    r = copy.deepcopy(r0); log = []
    if n in NAME: log.append(f'Name: „{r["name"]}“ → „{NAME[n]}“'); r['name'] = NAME[n]
    if n in KAT: log.append(f'Kategorie: {r["cat"]} → {KAT[n]}'); r['cat'] = KAT[n]
    if n in FLAV: r['flavors'] = FLAV[n]; log.append('Geschmack übersetzt')
    if n in ZUT:
        r['ings'] = [dict(id=i + 1, ck=False, **z) for i, z in enumerate(ZUT[n])]; log.append('Zutaten sauber gegliedert (Mengen unverändert, Einheiten getrennt oder umgerechnet)')
    else:
        geaendert = False
        for z in r['ings']:
            a, u = einheit_trennen(z)
            if (a, u) != ((z.get('amt') or '').strip(), (z.get('unit') or '').strip()): geaendert = True
            z['amt'], z['unit'] = a, u
        if geaendert: log.append('Mengen und Einheiten getrennt')
    if n in SCHRITTE:
        r['steps'] = [{'id': i + 1, 'txt': t, 'note': ''} for i, t in enumerate(SCHRITTE[n])]
        log.append('Schritte ' + ('in eigenen Worten neu' if r0.get('source') else 'übersetzt/geordnet'))
    else:
        for s in r['steps']:
            t = s.get('txt', '')
            for a, b in TIPPFEHLER: t = t.replace(a, b)
            if t != s.get('txt'): log.append('Tippfehler im Text korrigiert')
            s['txt'] = t
    r['blank'] = False
    r['uid'] = 'mrb-' + hashlib.sha1(str(r0['id']).encode()).hexdigest()[:12]
    neu, b_info = bild(r, n); r['img'] = neu
    log.append('Bild: ' + b_info)
    if n in OFFEN: log.append('⚠ OFFEN: ' + OFFEN[n])
    for k in ('labStatus', 'labRatings', 'labScore', 'labGen', 'labRevision', 'labLog'): r.pop(k, None)
    protokoll.append((n, r['name'], r['cat'], n in ALKOHOL, r0.get('source', ''), log))
    (mix if n in ALKOHOL else buch).append(r)

KATEGORIEN = [{'id': 'eig_1789556014817', 'de': 'Sushi', 'en': 'Sushi', 'ru': 'Суши', 'zh': '寿司', 'es': 'Sushi', 'fr': 'Sushi', 'it': 'Sushi', 'pt': 'Sushi', 'ico': '🍣'}]
kopf = {'version': 10, 'exported': '2026-11-23T12:00:00Z', 'quelle': 'Beispielbuch Mein Rezeptbuch, überarbeitet aus der Sicherung vom 16.09.2026',
        'kategorien': KATEGORIEN, 'menu': [], 'folders': []}
json.dump(dict(kopf, recipes=buch), open(ZIEL + '/beispielbuch-mein-rezeptbuch.json', 'w'), ensure_ascii=False)
json.dump(dict(kopf, quelle='Getränke mit Alkohol aus der Sicherung vom 16.09.2026, für Mein Mixarium', recipes=mix), open(ZIEL + '/getraenke-mit-alkohol-fuer-mixarium.json', 'w'), ensure_ascii=False)
json.dump(protokoll, open(ZIEL + '/protokoll.json', 'w'), ensure_ascii=False)
print('Buch', len(buch), 'Mixarium', len(mix))
