# Brief: Mein Rezeptbuch **Pro** als APK und als Windows-App

Stand **25.11.2026 spätabends**. Der Bau beginnt erst, wenn Klaus sagt, dass das Rezeptbuch „durch“ ist (seine Worte:
„wenn die soweit durch ist“). Bis dahin ist diese Datei die Vorbereitung. Die Bauanleitung steht in
`docs/BAU_APK_WINDOWS.md` (Werkzeuge, Paket, Probe, Signatur). Hier stehen nur die Entscheidungen vom 25.11. und was daraus
für den Bau folgt; wo beide sich widersprechen, gilt dieser Brief.

## Startauftrag

```
Lies in Mein-Rezeptbuch zuerst CLAUDE.md, dann docs/BRIEF_APK_WINDOWS_PRO.md und docs/BAU_APK_WINDOWS.md.
Freibrief wie zuvor. Qualität vor Quantität. Bau Mein Rezeptbuch Pro als APK (Capacitor) und als Windows-App (Electron),
Ausgabe `rezeptbuch`. Zuerst das Zeichen und der Name, dann der Update-Weg, dann der Bau. Prüf jeden Punkt am Code,
besprich mit mir, was dir auffällt. Gib am Ende die Fassung zum Testen frei (APK und Installer, mit Fassung).
```

## Entscheidungen von Klaus (25.11.2026)

| | Entscheidung | Folge |
|---|---|---|
| P1 | **Name: „Mein Rezeptbuch Pro“** (APK und Windows). Löst E4 („App Mein Rezeptbuch“) ab | `paket/ausgaben.json`: Name der App; der Launcher bricht ihn wie bei „Workflow PDF / Pro“ in zwei Zeilen |
| P2 | **In der App:** Zeile 1: der Name („Mein Rezeptbuch“ bzw. „Mein Mixarium“). Zeile 2, darunter: „**Pro**“ und direkt dahinter die **Versionsnummer**; die Versionsnummer ist der **Knopf** für Updates und zeigt, wenn ein neues Update da ist, ein kleines **rotes Feld mit der Aufschrift „Update“** – keine Fahne als Bild, sondern ein Schild wie in Private Akte (Klaus 26.11.; dort nachsehen und gleich bauen). Gilt genauso für „Mein Mixarium Pro“ (Klaus 26.11.) | Kopfzeile der App nur in der Hülle; in der PWA bleibt die Versionsnummer wie heute (Tipp = aktualisieren) |
| P3 | **Update-Weg wie Private Akte / Workflow PDF Pro**, damit die Versionsnummer in der APK mitzieht. Klaus: „das machen wir dann gleich mit dem Geheimnis noch“ | ⚠ Was „das Geheimnis“ ist, ist **nicht** geklärt (vermutlich das GitHub-Geheimnis für Signatur oder Update-Quelle). **Zuerst bei Klaus nachfragen**, nicht raten. Den Weg in Private Akte bzw. Workflow PDF Pro nachlesen (`add_repo`, gegen `origin/main`) |
| P4 | **Zeichen der Pro-Fassung:** dasselbe Strich-Logo wie die PWA (`icons/rezeptbuch-neu-512.png`: Löffel und Schneebesen über dem offenen Buch), aber „in derselben Art und Weise wie Workflow PDF Pro“: **die ganze Kachel farbig**, Grund **orange im Ton des Strich-Logos**, mit einem **Schattenverlauf nach innen, der heller wird** – „nicht so dünn, dass man sieht, dass es keine Linie ist, sondern ein richtiger Schattenverlauf“ | Farbtöne aus dem Logo gemessen: Mitte etwa `#E05000`–`#F06000`, dunkel `#B02E00`. Der Verlauf: außen dunkler, innen heller, breit (ein Drittel der Kachel und mehr), kein Rand-Strich. Das Strich-Logo muss sich auf dem Orange noch abheben (vermutlich hell/weiß oder mit Kontur), das zuerst Klaus als Bild vorlegen |
| P5 | **PWA ohne Farbverlauf, Pro mit Farbverlauf.** Die PWA behält das weiße Strich-Icon. **Favicon genauso:** die dunkle Variante (mit Verlauf) für die Pro-Fassung (Fenster, Taskleiste, Kopf der App in der Hülle), die ohne Verlauf für die PWA | `paket/zeichen/rezeptbuch/` (fünf Dateien, Abschnitt 3 der Bauanleitung) aus dem neuen Zeichen; die dort vorgesehene Gestaltung „dunkler Grund mit Goldring“ ist **abgelöst** |
| P6 | **Windows: dasselbe Zeichen und derselbe Name** | `zeichen/icon.png` der Windows-Hülle aus derselben Quelle |
| P7 | Klaus löscht seine bisherige APK mit dem weißen Strich-Icon | Eine Datenübernahme aus dieser APK ist nicht nötig; trotzdem zuerst fragen, ob darin Rezepte liegen (Sicherung vorher) |

## Was vorher noch zu tun ist (aus `docs/BAU_APK_WINDOWS.md` § 5, Stand 23.11., seitdem nicht nachgezogen)

- **Zeichen in der App:** der Kopf zeigt fest das Web-Zeichen; `zeichen.app` in `ausgaben/rezeptbuch/ausgabe.json` ist `null`
  und wird nicht gelesen. Für P2/P5 muss die App in der Hülle das Pro-Zeichen und „Pro &lt;Fassung&gt;“ zeigen.
- **Ausgabe aus `paket.json` lesen**, Service Worker in der Hülle nicht anmelden, Sicherung als Datei unter Android (der Weg
  über `<a download>` geht dort nicht).
- **Gerätekalender** (§ 8, Zeile 7a) und die übrigen Hüllen-Fähigkeiten in der dort genannten Reihenfolge.
- Die Zeilennummern in § 5 stammen von Rezeptbuch `07485eb`; die App ist seitdem bis 0.19.1 gewachsen – vor dem Bau neu
  nachsehen.

## Offene Fragen an Klaus (vor dem Bau stellen)

1. Was ist „das Geheimnis“ beim Update-Weg (P3)?
2. App-Kennung (`de.family_projekt.rezeptbuch` vorgeschlagen; dieselbe Vorsilbe wie die Familienakte?). Sie ist nach der
   ersten Veröffentlichung nicht mehr änderbar.
3. Release-Schlüssel für Android: neu erzeugen (am eigenen Rechner, nie in eine Sitzung) oder den der Familienakte?
4. Das Pro-Zeichen als Bild vorlegen und freigeben lassen, bevor es in die fünf Dateien geht.
5. Muttis Rezeptbuch: bekommt es auch eine Pro-Fassung, oder nur Mein Rezeptbuch?

## Nicht gemessen

Nichts von P1–P7 ist gebaut. Das Vorbild Workflow PDF Pro ist nur von Klaus' Bildschirmfoto bekannt (rote, volle Kachel mit
Motiv; Beschriftung „Workflow PDF / Pro“ in zwei Zeilen).
