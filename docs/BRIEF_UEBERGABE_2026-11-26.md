# Übergabe der Rezeptbuch-Sitzung an die Mixarium-/Windows-Sitzung (26.11.2026, nachts)

Diese Sitzung hat seit Brief Teil 5 am **Rezeptbuch** gebaut und die neue App auf beide **Marktplätze** gestellt. Das
Mixarium hat die andere Sitzung übernommen (Klaus), sie hat auch die Freigabe für den **Windows-Bau**. Dieser Brief sagt,
was hier gebaut ist, was offen ist und wo sich beide Stände berühren. **Bitte gegen den eigenen Stand prüfen, nicht
übernehmen:** jede Angabe hat einen Commit, an dem sie nachzusehen ist.

## Startauftrag

```
Lies in Mein-Rezeptbuch docs/BRIEF_UEBERGABE_2026-11-26.md, dann docs/BRIEF_APK_WINDOWS_PRO.md. Prüf jeden Punkt gegen
deinen eigenen Stand (origin/main beider Repos), sag mir, wo er abweicht, und mach dann weiter.
```

## Stände auf `main` (gemessen am 26.11.2026, 00:0x)

| Repo | Commit | Fassung |
|---|---|---|
| Mein-Rezeptbuch | `fbfa974` (#526) | PWA **0.19.1**, Kern **0.31.0** |
| PWA-Toolpoint | `f705d90` (#185) | Cache v106 |
| family-project | `fc77af5` (#377) | Cache v168 |
| Mein-Mixarium (eure Sitzung) | `0bda1c2` (#313) | Kern-Pin `ff8a4e8` = 0.31.0 |

**Kern:** Nach `ff8a4e8` hat sich in `kern/` nichts mehr geändert (#524–#526 betreffen nur `neu/` und `docs/`). Euer Pin
ist damit aktuell.

## Gebaut in dieser Sitzung (alle mit Probe und Gegenprobe, gemergt)

| PR | Fassung | Inhalt | Fürs Mixarium |
|---|---|---|---|
| Rb #521 | 0.18.0 · Kern 0.30.0 | **R6 Doppelungen** (Kern `modell/doppel.mjs`): Liste der Paare nach dem Einlesen, Band im Formular; Alkohol und Merkmale trennen | habt ihr schon (vor33) |
| Rb #522 | 0.18.1 · Kern 0.30.1 | **R36 Merkmale** vegan · laktosefrei · glutenfrei als Hinweis am Rezept, in Suche, Bedeutungssuche, Druck und Teilen; **kein Filter** (Klaus) | **nicht übernehmen.** Klaus: „Mixarium soll nicht betroffen sein.“ Der Kern liest `merkmale` nur, wo gesetzt |
| Rb #523 | 0.19.0 · Kern 0.31.0 | **R5** Karte lange drücken und ziehen (umsortieren, auf Kategorie oder Event-Ordner fallen lassen) · **Wischen zwischen den Bildschirmen** am Handy | ⚠ prüfen: zeigt das Mixarium die Getränke noch als **Karussell** (eine Karte sichtbar)? Dann passt Umsortieren dort nicht, und Wischen zwischen Bildschirmen stieße sich mit dem Karussell-Wischen |
| Rb #524/#525 | 0.19.1 | **R22** Beispielbilder an den Food-Zine-Formaten (Klaus' Bilder; Instagram = sein „Strawberry Matcha Latte“ aus der Mixarium-Sicherung, Ausschnitt ohne TikTok-Logo). ⚠ #524 ging **leer** auf `main` (Push abgelehnt, übersehen), #525 bringt den Inhalt | das Mixarium nutzt `zine.mjs` nicht (laut Briefkasten Runde H) |
| Rb #526 | – | `docs/BRIEF_APK_WINDOWS_PRO.md`: Klaus' Entscheidungen zur **Pro-Fassung** | siehe unten „Pro“ |
| Tp #185 · Fp #377 | – | **Marktplätze:** Eintrag `markt-rezeptbuch` (Klaus' Wahl „vorhandenen Eintrag umstellen“) mit neuem Logo `icons/rezeptbuch-neu-512.png`, `appUrl` → `…/Mein-Rezeptbuch/neu/`, neues Feld **`"neu": "2026-11-25"`** | der Vermerk ist ein Datenfeld; der **schräge „Neu“-Knopf** an der Karte ist **nicht gebaut** (Klaus: „machen wir aus der anderen Sitzung“) |
| Fp #377 | – | **Vorbestehender Fehler behoben:** `normEntry` im Studio von family-project warf `vorstellung`, `besonders`, `appUrl`, `video` weg (beim nächsten Veröffentlichen bei allen 37 Einträgen). Probe `tests/smoke_studio_felder.mjs` | – |

Proben am Schluss (Rezeptbuch): `npm test` 406 · 0 · `smoke_neu` 182 · doppel 41 · ziehen 24 · zinebsp 22 · baum 46 ·
bedienung 137 · ansicht 19 · event 49 · zusatz 107 · notiz 70 · web 36 · menue 26 · ordner 43 · sprache 78 · poster 123 ·
kreativbuch 99 · 2 (vorbestehend: Warnung des Testbrowsers und fehlender Workflow-PDF-Klon).

## Wo beide Stände sich berühren – bitte entscheiden lassen

1. **Name der Pro-Fassung.** Euer #313 setzt „**App Mein Mixarium**“ (E4 vom 25.11. tagsüber). Klaus hat am 25.11.
   spätabends fürs Rezeptbuch „**Mein Rezeptbuch Pro**“ festgelegt, mit „Pro“ und Versionsnummer **unter** dem Namen als
   Knopf mit Update-Fähnchen. Ob das Mixarium dann „Mein Mixarium Pro“ heißt, ist **nicht** gesagt – Klaus fragen.
2. **Zeichen der Pro-Fassung.** Euer Mixarium: Wasserfarben-Zeichen für Pro, transparentes für die PWA. Rezeptbuch nach
   Klaus: dasselbe Strich-Logo, „wie Workflow PDF Pro“ – ganze Kachel orange im Ton des Logos (gemessen `#E05000`–`#F06000`,
   dunkel `#B02E00`), breiter Schattenverlauf nach innen; PWA ohne Verlauf; **Favicon genauso**; Windows wie APK.
3. **„Das Geheimnis“** beim Update-Weg (Klaus: „das machen wir dann gleich mit dem Geheimnis noch“) ist **nicht geklärt**.
   Steht bei euch schon, was gemeint ist (Signatur-Schlüssel als GitHub-Geheimnis?), bitte im Rezeptbuch-Brief nachtragen.
4. **`paket/`** ist je Repo eigen (Hinweis, Ausgaben). Abweichend seit #313: `paket/vorlagen/paket-bauen.yml`, und das
   Mixarium hat `.github/workflows/paket-bauen.yml`, das Rezeptbuch **noch nicht**. `docs/BAU_APK_WINDOWS.md` im
   Mixarium fehlt die Zeile **7a Gerätekalender** (Brief Teil 5, Punkt 4).

## Offen im Rezeptbuch

- **Klaus' Sichttest am Tablet** für 0.18–0.19.1 (Doppel-Fenster, Merkmale, Ziehen und Wischen, Food-Zine-Bilder). Erst danach
  „Rezeptbuch fertig“ melden.
- **R8** steht in der Befundliste noch als „offen“, laut Briefkasten Runde H ist es mit 0.16.0 gebaut – Zeile prüfen und
  nachziehen.
- **R21 Gerätekalender** und die übrigen Hüllen-Fähigkeiten: erst mit der APK/Windows (`docs/BAU_APK_WINDOWS.md` § 8).
- **Familienakte und Private Akte** (Vollbild-Knopf, Ansichten nach freiem Platz): Brief Teil 5, Punkt 5, nicht angefangen.
- **Pro-Fassung Rezeptbuch:** `docs/BRIEF_APK_WINDOWS_PRO.md` mit fünf offenen Fragen; Bau erst, wenn Klaus sagt, das
  Rezeptbuch ist „durch“.
- **Neu-Knopf** an der Marktplatz-Karte (Feld `neu` liegt bereit, beide Positivlisten reichen es durch).
- **Marktplatz-Messung:** `appUrl` ist das Mess-Ziel; ab der Nacht zum 26.11. wird die neue App gemessen, der Verlauf mischt
  kurz alt und neu.

## Fallen dieser Sitzung (damit sie euch nicht auch erwischen)

- **Ein abgelehnter Push sieht still aus**, wenn die Ausgabe gekürzt wird: nach jedem Push
  `git fetch -q origin && git diff --quiet HEAD origin/<zweig> && echo angekommen`. Nach einem Squash-Merge den Zweig
  **nicht** neu von `main` aufsetzen und dann pushen (abgelehnt), sondern `git merge -X ours origin/<zweig>` und
  `git diff --quiet <eigener Commit> HEAD` prüfen.
- **PR-Nummern nie raten.** Die Nummer kommt aus der Antwort von `create_pull_request`. Ein Merge-Aufruf auf eine alte,
  schon gemergte Nummer meldet „merged: true“ mit dem alten Commit und tut nichts – sieht aus wie Erfolg.
- **family-project:** Browser-Proben suchen Chromium unter einem alten Pfad und melden „nicht lauffähig“, nicht rot.
  `PW_CHROMIUM=/opt/pw-browsers/chromium PW_CHROME=/opt/pw-browsers/chromium` setzen; `node_modules/playwright` und
  `playwright-core` als Verweis auf `/opt/node-tools/node_modules/` (ignoriert, nicht einchecken). Auf `main` schon rot:
  `smoke_hintergrund` (7), `smoke_bewegungsknopf` (1–2, wechselnd; three.js ohne Grafikchip).
- **PWA-Toolpoint:** `smoke_detail` braucht `playwright-core` mit Namen (gleicher Verweis), sonst „0 grün, 0 ROT“.
- **Doppel-Band in alten Proben:** wer dasselbe Rezept zweimal anlegt, bekommt jetzt das Band „Gibt es schon“; die Proben
  web und notiz tippen „Als eigenes Rezept speichern“ (im Mixarium habt ihr das in web und scan schon so).
- **Probe und laufende Gegenprobe:** die Gegenproben fahren `tests/smoke_*.mjs` aus dem Arbeitsbaum, nicht aus der Kopie –
  die Probe nicht ändern, während die Gegenprobe läuft.
