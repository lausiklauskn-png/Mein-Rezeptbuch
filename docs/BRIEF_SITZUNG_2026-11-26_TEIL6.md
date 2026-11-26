# Brief für die nächste Sitzung: Teil 6 (Mixarium nachgezogen, Marktplätze, Pakete)

Stand **26.11.2026, kurz nach Mitternacht**. Vorgänger: `docs/BRIEF_SITZUNG_2026-11-25_TEIL5.md` (Grundsätze, Fallen – gelten
weiter). Befunde mit Stand: `docs/BEFUNDE_VERGLEICH_2026-11-25.md` (R1–R36, **M1–M5**).

## Was diese Sitzung vorfand

R6 (Doppelungen) und R5 (Karte ziehen, Wischen) waren schon gebaut und gemergt (#521–#523, Rezeptbuch **0.19.0 · Kern 0.31.0**).
Die Reihenfolge aus Teil 5 ging deshalb gleich beim Mixarium weiter.

## Klaus' Anweisungen in dieser Sitzung

- Selbstständig bis zum Ende durcharbeiten; Fragen so beantworten, wie Klaus sie im Rezeptbuch schon entschieden hat.
- **Zeichen:** die PWA trägt das **transparente** Zeichen, die Pro-Fassung (APK, Windows) das **Wasserfarben**-Zeichen.
- Die neue Mixarium-PWA kommt auf family-projekt.de und pwa-toolpoint.de **an die Stelle der alten**, mit einem kleinen Knopf **„Neu“**
  wie bei Mein Rezeptbuch. **Keine Filmvorschau** für die neue PWA.
- Danach APK und Windows bauen und in der Sitzung zum Download anbieten. Codex läuft nicht mehr, keine Abfrage am Ende.

## Gebaut und gemergt (Mein-Mixarium)

| PR | Fassung | Inhalt |
|---|---|---|
| #308 | vor32 | Kern 0.24.0 → **0.31.0** (Pin `ff8a4e8`); R1 Foto über Pollinations mit eigenem Schlüssel |
| #309 | vor33 | R6 Doppelungen (Liste nach Datei/Paket/Stapel-Scan, Band im Formular; Alkohol ↔ alkoholfrei nie) · M1 Ersetzen behält die Einkaufsliste · transparentes PWA-Zeichen |
| #310 | vor34 | R14 Übersetzung bearbeiten (Hauptfassung/nur Übersetzung) · R15 im Gerät übersetzen · R23/R30 neu übersetzen · R28 Sprach-Chips · R13 „?“-Blasen im Bild |
| #311 | vor35 | R34 Symbol-Knöpfe + Portionen kompakt · R32 Vollbild nur das Getränk (ersetzt „Nur dieses Getränk“) · R35 Leiste mit Pfeilen |
| #312 | vor36 | R17 Spalten nur mit Platz (Container-Query 700 px) · R4 Sicherung teilen |
| #313 | – | Workflow `paket-bauen.yml` eingesetzt, Zeichen der Pro-Fassung, App-Name „App Mein Mixarium“ (E4) |

Marktplätze: family-project **#378** (Cache v169), PWA-Toolpoint **#186** (Cache v107): Mixarium → `/Mein-Mixarium/neu/`, Knopf „Neu“
neben dem Namen von Mein Rezeptbuch und Mein Mixarium (vorher stand `neu` nur in den Daten, gezeichnet wurde nichts).

Neue Proben im Mixarium: `smoke_neu_doppel` (37) + `gegenprobe_neu_doppel.py` (11) · `smoke_neu_ansicht` (24) + `gegenprobe_neu_ansicht.py`
(6) · `smoke_neu_menue` Teil 10 (61) + `gegenprobe_neu_fassung.py` (7). Schluss: `npm test` 175 · ansicht 24 · doppel 37 · pwa 97 ·
kategorien 78 · labor 43 · web 29 · ordner 50 · menue 61 · sprachen 88 · zusatz 88 · scan 56 (mit Workflow-PDF-Klon), je 0 ROT.

## Mixarium: was noch fehlt (ehrlich)

**Offen:** R3/R9 Explorer-Baum · R16/R25/R27 Einordnen-Fenster (Kategorie und Ordner in einem) · R5 Karte ziehen / Wischen ·
R10 Tipp aufs Bild → „Bild anpassen“ · R11 Seitenleiste am breiten Schirm verschieben. **Nicht übernommen mit Grund:** R36 (Klaus),
Food-Zine/Kreativbuch (Getränkebuch), Notizbuch, Event-Ordner (das Mixarium hat „Anlässe“ an der Getränkekarte).
Damit ist das Mixarium **nicht** in allem gleichauf mit dem Rezeptbuch; die fünf offenen Punkte sind die Reihenfolge der nächsten Sitzung.

## Pakete (APK, Windows)

In der Sitzung lässt sich nicht bauen: das Netz sperrt `dl.google.com` (Android-SDK), `downloads.gradle.org` und die
Electron-Downloads. Gebaut wird über **GitHub → Mein-Mixarium → Actions → „Paket bauen (von Hand)“** (Ausgabe, Ziel wählen); das
Ergebnis liegt 14 Tage als Artefakt am Lauf. Erster Lauf (26.11.): **APK und Windows-Installer von `mixarium-voll` gebaut** (Läufe 45725414032, 45725417708; je ✅), in der Sitzung an Klaus geschickt; Einzelheiten `docs/BAU_APK_WINDOWS.md` § 6a im Mixarium.
Die APK ist eine **Debug-APK** (Debug-Schlüssel des Baurechners): eine neue lässt sich nicht über eine alte installieren – vorher
eine Sicherung in der App speichern. Ein Release-Schlüssel und der Update-Weg wie in Private Akte stehen noch aus.

## Fallen dieser Sitzung

- **Ein `hidden`-Attribut überstimmt CSS mit `display` nicht** – eine Sabotage damit ist wirkungslos (Gegenprobe zeigte es).
- **Neue Kern-Fassung → Proben anpassen:** Kern 0.27.1 fragt `GET /v1/models`; gestellte Netze müssen GET beantworten.
- **Doppel-Band:** Proben, die dasselbe Getränk zweimal anlegen, sehen jetzt das Band und müssen „Als eigenes …“ wählen.
- **Mixarium-Tabellen:** Französisch und Russisch siezen, Portugiesisch formell – Texte aus dem Rezeptbuch (duzt) nicht blind übernehmen.
- **family-project-Proben:** `smoke_hintergrund` (7 rot) und `smoke_bewegungsknopf` (1 rot) sind in diesem Behälter auch auf `main` rot
  (Grafikchip); `PW_CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` setzen.

## Zum Testen (PWA)

- Mein Rezeptbuch: https://lausiklauskn-png.github.io/Mein-Rezeptbuch/neu/ – **0.19.0** (unverändert in dieser Sitzung)
- Mein Mixarium: https://lausiklauskn-png.github.io/Mein-Mixarium/neu/ – **10.0.0-vor36** (Versionsnummer tippen = aktualisieren)

## Startauftrag

```
Lies in Mein-Rezeptbuch zuerst CLAUDE.md, dann docs/BRIEF_SITZUNG_2026-11-26_TEIL6.md und docs/BEFUNDE_VERGLEICH_2026-11-25.md.
Freibrief wie zuvor. Qualität vor Quantität. Mixarium: die fünf offenen Punkte (Explorer, Einordnen, Ziehen/Wischen, Bild-Weg,
Seitenleiste) nach dem Rezeptbuch bauen; dann Pakete (Release-Schlüssel, Update-Weg) und Rezeptbuch-APK. PWA am Ende freigeben.
```
