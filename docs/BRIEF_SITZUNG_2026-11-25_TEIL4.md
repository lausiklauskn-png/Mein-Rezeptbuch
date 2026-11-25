# Brief für die nächste Sitzung: Vergleich alt ↔ neu, Teil 4

> **Fortsetzung:** `docs/BRIEF_SITZUNG_2026-11-25_TEIL5.md` – dort beginnen.

Stand **25.11.2026 nachts**. Vorgänger: `docs/BRIEF_SITZUNG_2026-11-25_TEIL3.md` (Grundsätze, Fallen – gelten weiter).
Jeder Befund mit Stand: `docs/BEFUNDE_VERGLEICH_2026-11-25.md` (jetzt R1–R24, M1–M3).

## Gebaut und gemergt in dieser Sitzung

| PR | Fassung | Inhalt |
|---|---|---|
| #512 | 0.17.0 · Kern 0.29.0 | **R19 Event-Ordner**: Band unter der Kopfzeile des Ordners im Baum (Datum, Gäste direkt dort), In den Kalender (Gänge nach Kategorien-Folge, Portionen = Gäste), Portionen je Gericht im Wochenplan (`planPortionen`), Kalender abgleichen, Einkaufsliste mit Gästezahl, Menükarte drucken. **R24**: Bedeutungssuche findet neu eingelesene Rezepte (Probe); „Hinzufügen“ brach bei unvollständigem Kategorien-Stand ab (behoben im Kern) |
| #513 | 0.17.1 | **R23** neu eingelesene Rezepte bekommen die Sprachen des Buchs: gratis im Gerät, wo Chromes Sprachpaket da ist; sonst Meldung mit „Übersetzen“ (Claude auf Tipp, mit Kosten) |

Proben am Schluss: `npm test` 394 · 0 · smoke_neu 181 · baum 46 · bedienung 133 · event 49 (neu) · menue 26 · notiz 70 · ordner 35 ·
poster 123 · scan 85 · sprache 77 · web 35 · zusatz 107 · kreativbuch 101 · 1 (bekannte Warnung des Testbrowsers).

⚠ Nicht gemessen: Tablet/Finger echt, echter Drucker (Menükarte), echtes Chrome mit Sprachpaket, der Formular-Weg von R23 im Browser.
⚠ Das Mixarium hat Kern 0.29.0 noch nicht: eine Sicherung des Rezeptbuchs mit Event-Ordner im Mixarium „Ersetzen“ trägt `planPortionen` mit, die dortige App nutzt sie erst nach `kern-nachziehen`.

## Entscheidungen der Sitzung (Klaus kann überstimmen)

- Der **Name** des Ordners ist der Anlass; kein eigenes Feld „Anlass“.
- Portionen im Plan stehen in einer **eigenen Karte** neben dem Plan (`{ tag: { uid: n } }`), damit ältere Fassungen (APK 0.15.2) die Sicherung weiter lesen.
- Einkaufsliste vom Anlass: ein Gericht, das schon darauf steht, bekommt die Zahl des Anlasses (wie „auf die Liste“ am Rezept).
- Die Menükarte trägt **keine** Gästezahl (sie ist für die Gäste).

## Reihenfolge für die nächste Sitzung

1. **R22 Beispielbilder** – erst wenn Klaus die Bilder schickt.
2. **R6 Doppelungen beim Einlesen** (Kern `fuehreZusammen`; „alkoholfrei“ ↔ „mit Alkohol“ ist kein Doppel) und **R5 Wischen** nach Muttis.
3. **Mixarium**: Kern 0.29.0 mit `tools/kern-nachziehen.mjs`; M1, Event-Ordner (Getränke für einen Anlass), R23/R24 dort prüfen, Rest wie Teil 3 Punkt 4.
4. Familienakte und Private Akte (Vollbild-Knopf, Ansichten nach freiem Platz).
5. Erst dann „Rezeptbuch fertig“ / „Mixarium fertig“, Marktplätze, APK, Windows.

## Fallen dieser Sitzung

- **Probe in einer Kopie**: nur `neu kern tests` zu kopieren reicht nicht (die Seite lädt nicht, jeder Fall „scheitert“ am Warten). Den ganzen Baum ohne `.git` kopieren.
- **Squash-Merge**: auch bei einem zweiten PR auf demselben Zweig meldet GitHub „merge conflicts“ – `git merge -X ours origin/main`, prüfen, dass der Inhalt dem eigenen Commit gleicht, pushen; die Zusammenführbarkeit braucht danach einen Moment (`expectedHeadSha` beim Merge).
- `sprachName` liefert den Eigennamen („Français“); im deutschen Satz `Intl.DisplayNames` nehmen (`sprachImSatz`).
- Proben mit PDF brauchen den Klon `WFPDF_KLON=/home/user/lausiklauskn-png/workflow-pdf` (`git clone --depth 1 …/Workflow-PDF`).

## Startauftrag

```
Lies in Mein-Rezeptbuch zuerst CLAUDE.md, dann docs/BRIEF_SITZUNG_2026-11-25_TEIL4.md und docs/BEFUNDE_VERGLEICH_2026-11-25.md.
Freibrief wie zuvor. Qualität vor Quantität. Bau in der Reihenfolge des Briefs, prüf jeden Punkt am Code,
bau, prüf, merge; besprich mit mir, was dir auffällt. Gib am Ende jeder Sitzung die PWA zum Testen frei (Link und Fassung).
Sag mir ausdrücklich, wenn Rezeptbuch und Mixarium fertig sind; dann Marktplätze, danach APK und Windows.
```
