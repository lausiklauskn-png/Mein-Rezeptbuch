# Befunde aus Klaus' Vergleich alt ↔ neu (ab 25.11.2026)

Jede Zeile: Befund (Klaus' Wort) · Prüfung am Code · Stand. Zuerst Mein Rezeptbuch (und Muttis als Ausgabe derselben
neuen App), danach Mein Mixarium.

## Entscheidungen von Klaus (25.11.)

| | Entscheidung | Folge |
|---|---|---|
| E1 | **Ersetzen beim Einlesen einer Sicherung wie im Rezeptbuch** | Mixarium: Einkaufsliste bleibt, wenn die Datei keine trägt (Umbau im Mixarium, später) |
| E2 | **Wischen an der Rezeptkarte**: ja, Muttis Rezeptbuch (alt, `_rcardHdCheck`) ist die Grundlage | in die neue App |
| E3 | **`_CR`-Wasserzeichen**: entfällt. Klaus überlässt die Entscheidung der Sitzung. Entschieden: weglassen. Nachweis der Urheberschaft sind Git-Historie und Copyright; ein Block im Code schützt bei offenem Web-Code nichts und kostet Ladezeit | Funktionsliste: „entfällt“ |
| E4 | **Name der APK**: „App Mein Rezeptbuch“ bzw. **„App Mein Mixarium“**; das Mixarium bekommt das vorgesehene neue Symbol (Entwurf als PNG liegt vor) | beim nächsten APK-Bau |
| E5 | Gebaut und geprüft wird zuerst an der **PWA** (`…/Mein-Rezeptbuch/neu/`), die APK folgt | |

## Befunde Mein Rezeptbuch (neu)

| # | Befund | Prüfung am Code | Stand |
|---|---|---|---|
| R1 | **Gratis-Foto geht nicht**: „Der Gratis-Dienst antwortet nicht (HTTP 402)“ | `kern/ki/bild.mjs` `gratisBild` ruft `image.pollinations.ai/prompt/…?model=flux` – dieselbe Adresse wie die alte App (`_POLL_BASE`). 402 = der Dienst verlangt jetzt Bezahlung/Schlüssel; betrifft also auch die alte App. Laut Doku von Pollinations braucht jedes Bild jetzt einen eigenen Schlüssel (`sk_…`) | **gebaut (0.15.2):** „Foto über Pollinations“ fragt nach dem Schlüssel, ruft `gen.pollinations.ai` mit `?key=`, sagt 401/402 im Klartext |
| R2 | **Versteckte oder nicht kategorisierte Einträge** sollen eine Kategorie bekommen können | alt: Dialog „Kategorien zuordnen“ beim Import (Bilder von Klaus); neu: kein Dialog, nur einzeln am Rezept | **gebaut (0.15.2):** in Einstellungen → Kategorien steht ein Hinweis mit der Zahl, „Ohne Kategorie“, unbekannte und mitgebrachte Kategorien haben einen Knopf „alle zuordnen“ (mit Rückgängig); einzeln weiter am Rezept; der Explorer (R3) kommt dazu |
| R3 | **Ordnerbaum wie in der alten App**, als Explorer-Baum links: Kategorien aufklappbar mit ihren Rezepten, Ordner; Rezepte verschieben und einzeln zuordnen; an der Kategorie Stift (bearbeiten) und Papierkorb (löschen) | alt: Bildschirm „Ordner“ mit aufklappbaren Kategorie-Gruppen, Griff je Rezept; neu: Kategorien und Ordner nur als Listen in den Einstellungen, Zuordnen nur über die Werkzeuge am Rezept | offen |
| R4 | Ist das alte Rezeptbuch mit dem neuen **vergleichbar**? Fehlende Werkzeuge melden | Abgleich „Sichern & Exportieren“ (alt: PDF-Buch, Kreativbuch Claude, KI-Kreativbuch ohne Schlüssel, Eigenes Kreativbuch, Datensicherung, Teilen) gegen die neue App: PDF-Buch, Blätterbuch, Kreativbuch mit Schlüssel und ohne (Auftrag kopieren), Eigenes Buch aus Bildern, Projekte, Sicherung sind da; **„Teilen“ fehlte** | **Teilen gebaut (0.15.2):** „Sicherung teilen“ (Quick Share, Bluetooth, E-Mail); weitere Vergleiche nach Klaus' Durchgang |
| R5 | Wischen an der Rezeptkarte (E2) | `FUNKTIONSLISTE.md` Zeile „Wischen an der Rezeptkarte … fehlt“ | offen |
| R6 | **Doppelungen erkennen** beim Einlesen/Hinzufügen, anhand von Inhalt und Bild; je Doppel wählen: Bild behalten, Text behalten oder Rezept behalten (Bild des einen, Text des anderen). **Achtung (Klaus):** „alkoholfrei“ und „mit Alkohol“ sind keine Doppel, auch wenn sich nur dieses Wort unterscheidet | neu: Zusammenführen erkennt Doppel nur an `uid` bzw. am Namen | offen |
| R7 | **„Bild von der KI erzeugen“ scheitert**: „The model 'gpt-image-1' does not exist.“ | `kern/ki/bild.mjs` versucht `dall-e-3`, dann `gpt-image-1` – dieselben Modelle wie die alte App (`QC_MeinRezb` Z. 6179) | **gebaut (Kern 0.27.1):** passt keins der festen Modelle, fragt der Kern `/v1/models` des Schlüssels und nimmt das neueste Bildmodell (`gpt-image*`, `dall-e*`); am echten Schlüssel nicht gemessen |
| R8 (Spezifikation: `docs/R8_KREATIVBUCH_ALT_SPEZ.md`) | **Food-Zine und KI-Kreativbuch wie im alten Rezeptbuch**, nur moderner: Prompt-Generator (Lieblingsrezept, Bild für die KI: aus Rezept/eigenes/ohne, Format Poster/A4/Instagram/Zeitung/Rezeptkarte/Panorama, Extras, KI-Überraschung „Trendrezepte“), Prompt änderbar, Kopieren/Claude/ChatGPT; **„Meine Food-Zine Bilder“**: eigene Werke sammeln, per Ziehen ordnen, groß ansehen, drucken/PDF, als Kochbuch zusammenstellen; Stile (KI entscheidet, Mediterran, Nordisch, Rustikal, Bunt, Elegant, Food-Zine, Eigener Stil) | neu: Food-Zine als drei Seiten je Rezept mit OpenAI, anders aufgebaut | offen, alter Code wird genau gelesen |
| R10 | **Bild-Wege kürzer und genauer** (Handy): ein Tipp aufs Rezeptbild öffnet gleich „Bild anpassen“ statt erst das Bild-Blatt; das Fenster „Bild anpassen“ geht im **Vollbild** auf (auch am Handy); die Vorschau **Karte/Kopfbild** zeigt nicht genau, was später zu sehen ist (das Kopfbild ist je nach Breite anders hoch) – Vorschau aus den echten Maßen rechnen, Ausschnitt für Karte und Kopf getrennt oder sicher gleich | Bilder 15:11–15:15, 15:32 | offen |
| R11 | **Navi-Leiste am breiten Schirm verschiebbar** wie am Handy: lange drücken, dann links/rechts/oben/unten einrasten | heute fest links (`kopfZeichnen`, `breit()`) | offen |
| R12 | **Kreativbuch aus den Einstellungen in die Navi-Leiste** (eigener Punkt „Kreativbuch“: Buch PDF/Blättern, Kreativbuch, aus Bildern, Projekte); von den Food-Zine-Bildern direkt zum Kreativbuch; in den Einstellungen bleiben Sichern, Schlüssel, Darstellung, Beispiele, Hilfe, Aufräumen | Klaus 15:22 | offen |
| R13 | **„?“-Erklärungen nur teilweise lesbar** (Klaus: selbst suchen) | die Blase hing rechtsbündig am „?“ (250 px) und das Fenster schnitt sie links ab; beim Scrollen schloss sie sofort | **gebaut (0.15.3):** Blase am Seitenkörper, ganz im Bild, wandert beim Scrollen mit; Probe smoke_neu 9b misst jede Erklärung bei 390/1280 px auf vier Bildschirmen |
| R9 | **Explorer** statt Ordner-Liste (Vorlage: alte Ansicht „Meine Ordner“: Suche, Neuer Ordner, Kategorien umbenennen, Alle aufklappen; Kategorien aufklappbar mit Rezepten, Griffe zum Ziehen, Rezepte direkt öffnen und neu zuordnen). Klaus 15:27: der neue „Ordner“-Bildschirm zeigt nur „Spezial für 1“ – der Baum mit allen Kategorien und ihren Rezepten fehlt. Gehört unter Rezepte (nicht in Einstellungen → Ordnung) | siehe R3 | offen, Vorschlag im Brief |

## Befunde Mein Mixarium (später)

| # | Befund | Stand |
|---|---|---|
| M1 | Ersetzen beim Einlesen wie im Rezeptbuch (E1) | vorgemerkt |
| M2 | APK-Name „App Mein Mixarium“, neues Symbol (E4) | vorgemerkt für den APK-Bau |
| M3 | Alles aus dem Rezeptbuch, was den Kern betrifft (Ordnerbaum, Wischen, Gratis-Foto), zieht über `kern-nachziehen` mit | vorgemerkt |
