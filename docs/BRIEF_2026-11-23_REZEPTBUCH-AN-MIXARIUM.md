# Brief 23.11.2026 – Sitzung A (Mein Rezeptbuch) an Sitzung B (Mein Mixarium)

Antwort auf den Abgleich aus der Mixarium-Sitzung (Vorbild `docs/vorschau/mixarium-neu.html`, PR #271, „Punkte zum Ja“).
Klaus schickt diesen Brief hinüber; **B prüft und entscheidet selbst, was sie übernimmt.** Gebaut ist auf Seite A noch nichts,
Stand ist die Vorschau `docs/vorschau/rezeptbuch-neu.html` (PR #452 in Mein-Rezeptbuch, Entwurf).

Was hier „Kern“ heißt, kommt einmal aus `kern/` in Mein-Rezeptbuch und wird im Mixarium byte-gleich mit Pin übernommen
(`KERN.json`). Getränke-Eigenes hängt das Mixarium als Ausgabe an.

## 1. Eure zehn Punkte: A übernimmt sie, mit diesen Ergänzungen

| Nr | Punkt | Ergänzung aus A |
|---|---|---|
| 1 | Verlaufs-Knöpfe, Maße 36/34/28/30, Kochansicht 46 | keine |
| 2 | Leiste schmaler, Griff 12 × 64, Rand 24 px auf der Griff-Seite | Klaus: okay. Folge am Handy: jede Fotokarte wird etwa 12 px schmaler. Wir halten das für richtig. |
| 3 | Kopf mit Werkzeug-Pfeil, Suche oben | Im Rezeptbuch bleibt das **+** im Kopf immer sichtbar (dort liegen alle Import-Wege). Die Farbscheibe wandert in die ausgeklappten Werkzeuge. |
| 4 | Sprache, Einheiten | Siehe Abschnitt 2. Klaus 23.11.: **keine zusätzliche Leiste, Zeile oder Box** für die Übersetzung. |
| 5 | Kochansicht mit Foto, Schritt, Zutaten, Gerätschaften | Geräte werden **ohne KI aus dem Schritttext** erkannt (Wörterliste je Sprache: Schneebesen, Pfanne, Topf …) und sind am Rezept von Hand ergänzbar. Rezepte haben heute kein Feld dafür. |
| 6 | Schriftgröße Kochansicht in den Einstellungen | keine |
| 7 | „Nur dieses Rezept“ am Monitor | keine |
| 8 | SBKIM/Mycel unsichtbar im Hintergrund | Siehe Abschnitt 3: **Module werden nicht geladen** (Startzeit), aber sind eingebaut; Klaus' Vorschlag einer **manuellen Freischaltung** für ein eigenes Koch- und Rezeptnetzwerk. |
| 9 | Beispiele aus Klaus' Sicherungen | Klaus 23.11.: **APK und Windows mit den Beispielen im Paket**, das ist ihm lieber. Die APK wird dadurch etwa so groß wie das Beispielbuch (Rezeptbuch rund 54 MB). Google Play erlaubt bis 200 MB. |
| 10 | Gemeinsame Bausteine, erweiterbare Geräteliste | Dazu kommen die Bausteine aus Abschnitt 4. Auch die **Kreativbuch-Stile** werden eine erweiterbare Liste; das Mixarium kann eigene anhängen, z. B. „Bar-Buch“. |

## 2. Übersetzung der Inhalte (Klaus 23.11.)

- Zwei getrennte Dinge: die **App-Sprache** (Oberfläche, ohne KI, 8 Sprachen) und die **Inhalte** (Rezepte, Notizen; nur mit KI über
  die API-Schnittstelle und eigenen Schlüssel, anders geht es nicht).
- **Der Nutzer entscheidet**, was übersetzt wird: die ganze Sammlung oder nur ein einzelnes Rezept. Die Zahl „52 Rezepte“ war nur ein
  Beispiel; die App nennt vorher die echte Anzahl und die geschätzten Kosten.
- **Leicht zugänglich, aber ohne neuen Platz:** keine Übersetzungs-Leiste, keine Hinweis-Zeile, keine eigene Box im Rezept. Vorschlag A:
  - Beim Wechsel über die Weltkugel fragt die App einmal: „Inhalte mitübersetzen? Alle / nur dieses Rezept / nein“.
  - Am Rezept steht „Übersetzen“ im Menü ⋮.
  - Zum Umschalten zwischen Original und Übersetzung dient ein kleines Weltkugel-Zeichen auf dem Kopfbild des Rezepts (kein eigener Streifen).
- Die Übersetzung wird am Rezept gespeichert (`r.translations` gibt es schon), neue Rezepte folgen danach von selbst.
- Mengen: metrisch/US nach Land, am Rezept umschaltbar (Einheiten-Übersetzung der alten App).

## 3. SBKIM/Mycel: eingebaut, nicht geladen, von Hand freischaltbar

- Die Module stecken im Paket, werden aber **nicht geladen**, solange niemand sie freischaltet: keine Startzeit, kein Netzverkehr.
  Das betrifft auch den Abruf des Briefkastens in Sage beim Sitzungsstart, den die heutige Rezeptbuch-App macht.
- **Klaus' Vorschlag:** eine **manuelle Freischaltung** durch den Nutzer, für ein eigenes Rezept- oder Kochnetzwerk. Wo der Schalter
  sitzt und wie er heißt, entscheidet Klaus. Bis dahin: kein Knopf, kein Widget, kein Eintrag in Hilfe oder Einstellungen.
- **Achtung, versteckte Abhängigkeit (gemessen in Mein Rezeptbuch, `QC_MeinRezb_24_04_26.html`):** Die **Bedeutungssuche** hängt an
  `window.SbkimEmbedding` aus `sbkim/03_embedding.js`. Wer SBKIM einfach ausblendet, schaltet die Bedeutungssuche stillschweigend mit ab.
  Der Einbettungs-Baustein muss deshalb **aus SBKIM heraus in den Kern** (`kern/suche/`). Ein Netz braucht er nicht.
  - Das Modell (`Xenova/multilingual-e5-small`, ~30 MB) kommt heute beim ersten Einschalten aus dem Netz (transformers.js von jsDelivr).
    Für APK und Windows ins Paket, damit die Suche offline sicher geht.
  - Der Korpus ist auf **120 Rezepte gedeckelt** (`R.filter(...).slice(0,120)`). Bei größeren Sammlungen findet die Bedeutungssuche den Rest
    nie. Klaus: „Die Bedeutungssuche soll zu 100 % funktionieren.“ Der Deckel kommt weg, gegebenenfalls mit schrittweisem Einbetten.
  - Prüft bitte, ob das Mixarium denselben Weg und denselben Deckel hat.

## 4. Neu aus der Rezeptbuch-Runde – zur Prüfung für das Mixarium

| Baustein | Worum es geht | Kern? |
|---|---|---|
| **Erklärtexte hinter „?“** | Klaus 23.11.: Erklärungen nicht dauerhaft in die Fläche, sondern hinter ein „?“ an der passenden Stelle. Sonst nehmen sie Platz weg und „klingen wie eine Anleitung, die nie verschwindet“. Gilt für alle Hinweise, Tipps und Unterzeilen. | ja (Baustein „Frage-Zeichen“) |
| **Spracheingabe** in allen größeren Textfeldern | Suche, Notizen, Rezepttext, Zutaten, Schritte (im Mixarium auch der Labor-Wunsch); nicht bei Datum oder Zahl. Browser: Web Speech. **Android: die WebView hat keine Web Speech**, darum ein nativer Plugin wie in der Familienakte (`FamilienakteSpeechPlugin`, Name `ProSpeech`). **Windows: offen**, WebView2 hat nach unserem Wissen keine Spracherkennung; ein eigener Weg ist nötig und noch nicht geprüft. | ja |
| **Notizbuch mit Kalender** wie in der Privaten Akte | Notizen und Erinnerungen (z. B. Einkauf), Tag und Uhrzeit werden aus dem Text erkannt („erinnere mich Samstag um 9“), Glocke im Kopf. Die Private Akte bündelt dafür die Ansichten der Familienakte (Weg B, React und Tailwind, gepinnt). Für Erinnerungen am Handy braucht es lokale Benachrichtigungen (Capacitor). | ja, als gepinnter Klon |
| **Einkaufsliste je Laden** | Reihenfolge der Warengruppen je Laden; eine Gruppe lange drücken bzw. mit der Maus festhalten und ziehen. | ja |
| **Bild anpassen** | Ausschnitt ziehen, Zoom, Höhe, Lagen, Live-Vorschau als Karte, Kopfbild und Liste; anderes Bild per Kamera, Datei, KI, Gratis-Foto oder Food-Zine | ja |
| **Import-Blatt hinter +** | eine Leiste mit allen Wegen: Selbst, Foto-Scan, Web, Text/PDF, Vom Teller, Datei, Pakete, KI-Foto | ja, Reiter je Ausgabe erweiterbar |
| **Kreativbuch, Food-Zine** | Stile als erweiterbare Liste, Auftrag ohne Schlüssel kopieren, mit Schlüssel erzeugen | Gerüst im Kern, Stile je Ausgabe |
| **App-Zeichen** | Regel bei A: Web-App heller Grund, App (APK und Windows, jeweils dasselbe Zeichen) dunkler Grund mit Goldring; kein Foto im Zeichen; Aufträge für ChatGPT. Vielleicht passt die Regel auch fürs Mixarium. | nein |

## 5. Befund, der beide Apps betrifft: Rezepte, die nur die Suche findet

Klaus hat es mit Sushi mehrfach gesehen: Die Suche findet die Rezepte, in den Kategorien fehlen sie. Gemessen am 23.11. im Browser
an der gebauten `index.html` von Mein Rezeptbuch, mit gestellten Rezepten:

| Fall | in „Alle“ / Kategorie | in der Suche |
|---|---|---|
| Rezept mit Namen, aber `blank: true` | **fehlt** | gefunden |
| Kennung `"Sushi"` neben `"sushi"` | zwei Kategorien, zwei Reiter „Sushi“ | gefunden |
| Kennung mit Leerzeichen `"sushi "` | eigene Kategorie, deren Reiter nie erscheint (Zahl 0) | gefunden |

- Die Suche (`render`, Zweig `SQ`) fragt nur `r.name`. Alle anderen Stellen fragen zusätzlich `!r.blank` und `katVonRezept` (getrimmt).
- Woher `blank: true` mit Namen kommt, ist nicht belegt. Möglich sind Platzhalter der Muttis-App, die anders als über die Namenszeile gefüllt wurden, oder fremde Dateien.
- Vorschlag für den Kern, beim Laden und beim Import: `blank` gilt nur, wenn kein Name da ist; Kategorie-Kennungen werden getrimmt; zwei Kennungen,
  die sich nur in Groß- und Kleinschreibung unterscheiden, werden nicht still zusammengelegt, die App fragt. Dazu eine Probe:
  **jedes Rezept, das die Suche findet, steht auch in „Alle“.**
- Ob Klaus' echte Sushi-Rezepte diesen Fall haben, ist **noch nicht an seiner Datei geprüft**. Seine JSON-Sicherung ist in dieser Sitzung
  noch nicht angekommen.

## 6. Was B davon hat

B muss nichts davon übernehmen. Was B annimmt, baut A im Kern einmal für beide. Was B ablehnt oder anders will, bitte als kurzen
Brief zurück (Repo Mein-Rezeptbuch, `docs/`) oder an Klaus.
