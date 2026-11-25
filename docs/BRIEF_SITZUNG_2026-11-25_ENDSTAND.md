# Brief für die nächste Sitzung: Mein Rezeptbuch und Mein Mixarium auf den Endstand bringen

Stand **25.11.2026**. Gilt für beide Repos (`Mein-Rezeptbuch`, `Mein-Mixarium`); die Mixarium-Übergabe verweist hierher.

## Worum es jetzt geht

Klaus vergleicht die **neuen** PWAs mit den **alten** und schreibt in die Sitzung, was er findet: was funktioniert, was nicht,
was schwer oder leicht zu finden ist, wo ein Text oder ein Knopf fehlt, was anders aufgebaut sein sollte. Die Sitzung nimmt
jeden Befund auf, prüft ihn am Code (nicht aus dem Gedächtnis), baut, prüft und merged nach dem Freibrief. Erst wenn beide
Apps durch sind, sagt die Sitzung ausdrücklich „Rezeptbuch fertig“ und „Mixarium fertig“.

| | neu (wird gebaut) | alt (zum Vergleich, bleibt unverändert) |
|---|---|---|
| Mein Rezeptbuch | https://lausiklauskn-png.github.io/Mein-Rezeptbuch/neu/ | https://lausiklauskn-png.github.io/Mein-Rezeptbuch/ |
| Mein Mixarium | https://lausiklauskn-png.github.io/Mein-Mixarium/neu/ | https://lausiklauskn-png.github.io/Mein-Mixarium/ |

Beide Fassungen liegen auf derselben Adresse (github.io) und haben getrennte Speicher; die neue liest die Daten der alten nur.

**Getrennt installierbar (25.11., Klaus):** Im Mixarium legte sich die alte PWA über die neue (nur ein Symbol). Der Bereich
(`scope`) der **alten** PWAs ist deshalb auf `./index.html` verengt (`manifest.json` bzw. `app-manifest.json`, Cache erhöht;
die alten Seiten selbst unverändert), damit `/neu/` nicht mehr dazugehört. Die neuen PWAs heißen auf dem Startbildschirm
„Mein Rezeptbuch neu“ / „Mein Mixarium neu“. Alte App zum Installieren über `…/index.html` öffnen. Am Tablet noch nicht
bestätigt; bei Problemen `chrome://webapks` (Manifest Id, Start Url, Scope) ansehen lassen. Klaus vergleicht erst in den
PWAs und zieht Änderungen danach in die APK (deren Bau dauert lange).
Beim nächsten APK-Bau: der Name der APK auf dem Startbildschirm soll „App Mein Rezeptbuch“ lauten (Klaus 25.11.;
entsprechend beim Mixarium „App Mein Mixarium“ – vorher bestätigen lassen), damit APK, alte PWA und „… neu“ auseinanderzuhalten sind.

## Stand auf `main`

| | Mein Rezeptbuch | Mein Mixarium |
|---|---|---|
| PWA | **0.15.0** | **10.0.0-vor30** |
| Kern | **0.27.0** (wird hier gebaut) | Pin **0.24.0** (`node tools/kern-nachziehen.mjs <Rezeptbuch-main>`; `kern/` nie von Hand) |
| Proben am Schluss | `npm test` 382 · 0 · smoke_neu 164 · kreativbuch 102 · menue 26 · notiz 66 · ordner 35 · scan 85 · sprache 77 · web 35 · zine 80 · zusatz 105 · kern_sprachen 18 (alle 0 ROT) | `npm test` 175 · 0 · kategorien 78 · labor 43 · menue 50 · ordner 50 · pwa 94 · scan 56 · sprachen 88 · web 28 · zusatz 86 (alle 0 ROT) |

## Was am 24./25.11. dazukam (alles gemergt, mit Gegenprobe)

**Beide Apps:** neues App-Zeichen (Rezeptbuch freigestellt mit Wasserfarbe der gewählten Farbe; Mixarium auf hellem Grund) ·
Knopf **Installieren** oben (weg nach der Installation) · **Versionsnummer oben = Aktualisieren** (holt die neueste Fassung,
leert nur den eigenen Speicher) · Sicherung einlesen: **Hinzufügen oder Ersetzen** (Ersetzen legt vorher einen Tresor-Stand an,
mit Rückgängig; Einstellungen und Schlüssel bleiben).

**Rezeptbuch:** Handbuch nennt Installieren/Aktualisieren · **Food-Zine** (#497) · **KI-Kreativbuch** (#498: Claude schreibt
Texte in acht Stilen, wie die alte App; keine KI-Bilder) · **eigenes Buch aus Bildern, Projekte, Seite als Rezeptbild** (#499) ·
**Notizbuch** (#501: Notiz mit Foto ohne KI, Tag aus dem Text, Kalenderdatei `.ics`, Hinweis beim Öffnen, Übernahme ins
Rezeptbuch über Foto-Scan / Vom Teller / Text / Idee → Claude, Wochenplan + Einkauf; Vorbild Familienakte in Private-Akte).

**Mixarium:** **Handbuch** (#301) · **„Vom Glas“** (#302) · **Getränkebuch** als PDF/Blätterdatei, „Ohne Alkohol“ gilt (#303).

## Offen (Liste für die Vergleichs-Sitzung)

- Funktionslisten: Rezeptbuch `docs/FUNKTIONSLISTE.md` 5× „fehlt“, 30× „teils“; Mixarium 3× „fehlt“ (Buch-Zeilen
  COVER/PDF/FLIPBOOK – mit vor29 erledigt, Liste noch nicht nachgeführt), 16× „teils“. Zu entscheiden von Klaus: Wischen an der
  Rezeptkarte (gab es nur in Muttis), `_CR`-Wasserzeichen. Klein: Wochenplan zurücksetzen, Export-Erinnerung auf iPhones,
  KI-Zine der alten App.
- **Ersetzen unterschiedlich:** im Mixarium ist die Einkaufsliste nach „Ersetzen“ leer, wenn die Datei keine trägt; das
  Rezeptbuch behält sie. Klaus fragen, ob angleichen (Vorschlag: wie im Rezeptbuch).
- Rezeptbuch, Kopf bei 390 px: durch den Notiz-Knopf wird der Name zu „Mein Rezept…“ gekürzt.
- Mixarium: ob die Hinzufügen-Meldung mit „Rückgängig“ bei 390 px in eine Zeile passt, ist nicht gemessen.
- Nicht gemessen in beiden Apps: am Tablet/Handy, mit echter KI, Diktat, Teilen der Kalenderdatei, echter Drucker.
- Marktplätze: neue Apps bei **PWA-Toolpoint** und **family-project** (Marktplatz) eintragen, sobald beide Apps fertig sind
  (Klaus' Wort vom 24.11.; vorher nicht).

## Danach: APK und Windows (erst wenn beide PWAs fertig sind)

- **App-Symbol:** Klaus 25.11.: APK und Windows bekommen das **neue** App-Symbol – auch das Mixarium. Die alte PWA behält ihr
  altes Symbol. Vor dem Bau einmal mit Klaus bestätigen, welche Symbolform die PWA zeigen soll.
- **Update-Weg wie Private Akte** (dort nachlesen: `docs/BRIEF_ABSCHLUSS_2026-11-19_SYMBOL-MAIL-UPDATES-0.9.1.md`,
  `docs/VEROEFFENTLICHUNG-0.9.10.md`): signierter Update-Feed je App auf dem Server, **rotes Fähnchen** am Update-Knopf,
  eigener Ed25519-**Signier**-Schlüssel je App (unterschreibt die App-Fassung, verschlüsselt keine Rezepte), Veröffentlichen
  über „Android-App signiert“ mit `veroeffentlichen = ja`, Schlüssel in der GitHub-Umgebung. Windows hatte dort noch kein
  Fähnchen. Eventuell bei Google etwas freischalten – Klaus sagt Bescheid.
- **Tresor und Sicherung** unverändert übernehmen (Klaus 24.11.: bewährtes Muster); bei der APK prüfen, ob die Sicherung
  zusätzlich in einen Ordner gehen soll („Kopie einrichten“ in Private Akte).
- Rezepte bleiben offene JSON-Dateien; ob private Rezepte geschützt werden, entscheidet Klaus später.

## Geschenkbox (25.11. an Klaus gegeben, nicht im Repo)

Pro-Geschenkbox aus `Meine-Familienakte/docs/geschenk/geschenkbox-pro.html` ergänzt (Private Akte 0.9.10, Familienakte
2.28.78, Private Brain Pro 1.0.58, Rezeptbuch und Mixarium als Web-Apps) und mit `tools/geschenkbox-datei.mjs` gebaut; als
Datei an Klaus, **nicht** ins Repo geschrieben (keine Schreibrechte). Datei-Organizer Pro 0.4.12 und PseudoDoc Pro 0.1.0 liegen
auf `family-projekt.de/updates/…` und sind nicht geprüft. Die Sicherung mit allen Repos als ZIP ist das Release
`sicherung-2026-11-23` in Private-Akte (noch ohne Rezeptbuch/Mixarium; dafür zwei Zeilen in `tools/sicherung/apps.tsv`).

## Arbeitsweise (bewährt)

- Größere Teile an einen Helfer im eigenen Worktree (`git worktree add … origin/main`), Regeln wie in der Nacht; danach
  **selbst nachmessen** (alle `tests/smoke_neu*.mjs`, `npm test`, volle Gegenprobe der neuen Fälle), dann Fassung, Cache und
  `?v=` setzen, Kern geändert → `kern/kern-stand.mjs` + `KERN.json` aus sauberer Kopie, PR, Squash-Merge, auf `main` nachsehen.
- Proben mit PDF brauchen `WFPDF_KLON=/home/user/lausiklauskn-png/workflow-pdf`; Mixarium-Proben mit `WURZEL=<Arbeitsbaum>`.
- Ein Helfer-Bericht ist eine Behauptung: Abweichungen am alten Code prüfen (so geschehen beim Kreativbuch: Texte statt Bilder
  war richtig).

## Startauftrag

```
Lies in Mein-Rezeptbuch zuerst CLAUDE.md, dann docs/BRIEF_SITZUNG_2026-11-25_ENDSTAND.md.
Freibrief wie zuvor. Ich vergleiche jetzt die neuen PWAs (Rezeptbuch und Mixarium) mit den alten und schreibe dir,
was funktioniert, was nicht, was fehlt oder anders sein soll. Nimm jeden Befund auf, prüfe ihn am Code, bau, prüf, merge.
Sag mir ausdrücklich, wenn Rezeptbuch und Mixarium fertig sind; dann Marktplätze, danach APK und Windows.
```
