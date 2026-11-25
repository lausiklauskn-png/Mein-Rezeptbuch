# Brief für die nächste Sitzung: Vergleich alt ↔ neu, Teil 5

Stand **25.11.2026 spätabends**, PWA **0.17.6 · Kern 0.29.0**. Vorgänger: `docs/BRIEF_SITZUNG_2026-11-25_TEIL4.md` und
`TEIL3.md` (Grundsätze, Arbeitsweise, Fallen – gelten weiter). Jeder Befund mit Stand: `docs/BEFUNDE_VERGLEICH_2026-11-25.md`
(R1–R35, M1–M3). Klaus' Grundsätze: Qualität vor Quantität, mitdenken und widersprechen, direkt dort ändern, wo es steht,
keine Zwischenfenster, keine neuen Kosten, am Ende jeder Sitzung die PWA freigeben (Link + Fassung).

## Gebaut und gemergt seit Teil 4 (alles mit Probe und Gegenprobe)

| PR | Fassung | Inhalt |
|---|---|---|
| #515 | 0.17.2 | R25 Einordnen am Tablet (✓-Knopf in den Feldern, Tastatur „Fertig“ – Chrome am Android sprang mit „Weiter“ ins Ordner-Feld; ✕ in der angehakten Ordner-Zeile) · R26 „Event-Ordner“ überall (acht Sprachen; Menüpunkt „Ordner“ = Baum bleibt) · R27 Bild/Emoji der Kategorie im Einordnen-Fenster, gewähltes Zeichen schlägt automatisches Foto · R28 nach dem Übersetzen steht die neue Fassung da, Sprach-Chips (Original · EN · IT) im Rezept |
| #516 | 0.17.3 | R30 geändertes übersetztes Rezept wird neu übersetzt (gratis im Gerät, sonst Meldung „Übersetzen“) |
| #517 | 0.17.4 | R31 Bildhöhe aus dem Bild, höchstens 36 % der Höhe · R32 Vollbild-Knopf = nur das Rezept + Browser-Vollbild · R33 Spalten nur wenn nötig (Schritte → Zutaten → kleineres Bild, gemessen, nie am Handy) · R34 Symbol-Knöpfe Kochen/Einkaufen/Planen |
| #518 | 0.17.5 | R35 fliegende Leiste mit Pfeilen verschieben (Handy): Menü „Leiste verschieben“ → Pfeil-Viereck an der Stelle der Leiste, kein Bestätigen |
| #519 | 0.17.6 | Portionen kompakt: „− 👥 +“, darunter „4 Pers.“ |

Neue Probe: `tests/smoke_neu_ansicht.mjs` (Bildhöhe, Vollbild nur Rezept, Spalten, Pfeil-Leiste).
Proben am Schluss: `npm test` 394 · 0 · smoke_neu 182 · ansicht 19 · baum 46 · bedienung 137 · event 49 · menue 26 · notiz 70 ·
ordner 43 · poster 123 · scan 85 (mit Klon) · sprache 78 · web 35 · zusatz 107 · kreativbuch 101 · 1 (bekannte Warnung des Testbrowsers).

⚠ Nicht gemessen: Tablet/Handy mit dem Finger (Klaus testet), echtes Chrome-Sprachpaket, echter Drucker.
R29 (Schlüssel weg nach Aktualisieren): mit Klaus geklärt – wahrscheinlich APK/Neuinstallation verwechselt; dauerhafter Speicher
wird erbeten; Schlüssel bewusst nicht in Sicherung/Tresor (Empfehlung: Passwort-Manager).

## Entscheidungen von Klaus in dieser Sitzung

- **„Event-Ordner“** heißt die eigene Sammlung überall; der Name des Ordners ist der Anlass.
- **Übersetzen**: gratis automatisch im Gerät, wo das Sprachpaket da ist; sonst Hinweis, Claude erst auf Tipp. Jeder Nutzer
  zahlt mit seinem eigenen Schlüssel; über Klaus läuft nichts.
- **Vollbild = nur das Rezept** (Leiste, Liste, Baum weg), derselbe Knopf zurück.
- **Rezept auf einen Bildschirm**, notfalls zweite Spalte; Symbole mit kleinen Untertexten statt dicker Knöpfe.
- **Pfeil-Viereck** zum Verschieben der fliegenden Leiste, ohne Bestätigen.

## Reihenfolge für die nächste Sitzung

1. **R6 Doppelungen beim Einlesen** (Kern `fuehreZusammen`): Inhalt (Name normalisiert, Zutaten) und Bild (kleiner Hash)
   vergleichen; je Doppel wählen: Bild / Text / beides / beide behalten. „alkoholfrei“ ↔ „mit Alkohol“ ist **kein** Doppel.
   Gilt für beide Apps (Kern). Erst einen Vorschlag mit Beispielen an Klaus, dann bauen.
2. **R5 Wischen an der Rezeptkarte** nach Muttis (`add_repo` Muttis-Rezeptbuch, gegen `origin/main` lesen, `_rcardHdCheck`).
3. **R22 Beispielbilder** – nur mit Klaus' Bildern.
4. **Mixarium**: Kern 0.29.0 mit `tools/kern-nachziehen.mjs`; danach alles aus R10–R35 prüfen und übernehmen, wo es passt
   (Event-Ordner für Getränke, Einordnen, Übersetzung, Rezeptansicht, Pfeil-Leiste, Portionen), M1 Ersetzen wie Rezeptbuch;
   `docs/BAU_APK_WINDOWS.md` dort um Zeile 7a (Kalender) ergänzen.
5. Familienakte und Private Akte (Vollbild-Knopf, Ansichten nach freiem Platz).
6. Erst dann „Rezeptbuch fertig“ / „Mixarium fertig“, Marktplätze, APK (Update-Weg wie Private Akte, damit die
   Versionsnummer dort auch aktualisiert), Windows.

## Fallen dieser Sitzung

- **Squash-Merge und derselbe Zweig**: vor jeder neuen Arbeit `git checkout -B <zweig> origin/main`. Vor dem Push
  `git merge -X ours origin/<zweig>` und `git diff --quiet <eigener Commit> HEAD` prüfen; **ist es nicht leer, nicht pushen**
  (einmal hat es eine Zeile der Befundliste verdoppelt). Kein Force-Push.
- **Befundliste**: neue Zeilen direkt an die Tabelle hängen, ohne Leerzeile davor, sonst stehen sie außerhalb der Tabelle.
- **Vorrang im CSS**: `body[data-fl] .md-detail .rezept-held` überstimmt einfache Regeln – neue Regeln dort mit demselben Präfix.
- **Bildschirmfotos** erst nach den Einblend-Animationen (0,2 s) aufnehmen, sonst sieht ein Feld durchscheinend aus.
- **Ein Wächter, der die Obergrenze trifft, misst nichts**: die Bildhöhe in einer Lage messen, in der die Grenze nicht greift.
- **Probe in einer Kopie**: den ganzen Baum ohne `.git` kopieren (`tar --exclude=.git`), sonst lädt die Seite nicht.
- **Chrome am Android**: zwei Eingabefelder in einem Fenster → Tastatur zeigt „Weiter“; Felder brauchen `enterkeyhint="done"`
  und einen sichtbaren ✓-Knopf.

## Startauftrag

```
Lies in Mein-Rezeptbuch zuerst CLAUDE.md, dann docs/BRIEF_SITZUNG_2026-11-25_TEIL5.md und docs/BEFUNDE_VERGLEICH_2026-11-25.md.
Freibrief wie zuvor. Qualität vor Quantität. Bau in der Reihenfolge des Briefs (zuerst R6 Doppelungen, mit Vorschlag an mich),
prüf jeden Punkt am Code, bau, prüf, merge; besprich mit mir, was dir auffällt. Gib am Ende jeder Sitzung die PWA zum Testen frei
(Link und Fassung). Sag mir ausdrücklich, wenn Rezeptbuch und Mixarium fertig sind; dann Marktplätze, danach APK und Windows.
```
