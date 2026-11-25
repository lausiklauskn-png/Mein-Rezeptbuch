# Brief für die nächste Sitzung: Vergleich alt ↔ neu, Teil 3

Stand **25.11.2026 spätabends**. Vorgänger: `docs/BRIEF_SITZUNG_2026-11-25_TEIL2.md` (Adressen, Arbeitsweise, Fallen) und
`docs/BRIEF_SITZUNG_2026-11-25_ENDSTAND.md`. Jeder Befund mit Stand steht in `docs/BEFUNDE_VERGLEICH_2026-11-25.md` (R1–R22, M1–M3).

**Klaus' Grundsätze (25.11., verbindlich):**
- **Qualität vor Quantität – das werden Vorzeigestücke.** Lieber ein Punkt fertig und gemessen als drei halb.
- **Mitdenken und widersprechen:** fällt eine Unklarheit, ein Logik- oder Bedienfehler oder ein besserer Weg auf, sagen und
  mit Klaus besprechen, nicht einfach seine Idee übernehmen. Fragen mit Empfehlung stellen.
- **Nichts aus dem alten Code holen, was sich nicht bewährt hat** (toter Code der alten App bleibt draußen), das Bewährte
  sinnvoll an die neue App anpassen. **Keine neuen Kosten** erzeugen.
- **Direkt dort ändern, wo es steht**; keine unnötigen Zwischenfenster; am großen Schirm kurze Mauswege.
- Am Ende jeder Sitzung die PWA zum Testen freigeben (Link + Fassung, „oben auf die Versionsnummer tippen“).

## Gebaut und gemergt am 25.11. (diese Sitzung)

| PR | Fassung | Inhalt |
|---|---|---|
| #507 | 0.15.4 | R3/R9 Explorer „Ordner“ (Baum aller Kategorien und Ordner, Ziehen mit Finger/Maus, Auswählen → Verschieben, breit: Baum links, Rezept rechts) |
| #508 | 0.15.5 | R12 Bereich „Kreativbuch“ in der Leiste; Baum nach Klaus: „Alle zuordnen →“ nur bei „Ohne Kategorie“/unbekannt, leere Kategorien eingeklappt, alte Ordner-Liste weg |
| #509 (+ Mixarium #307) | – | `docs/BAU_APK_WINDOWS.md` § 8: was APK/Windows mehr können (Teilen in die App, Web-Import ohne CORS, Sicherung in Ordner, ML-Kit-Scanner, Food-Zine an ChatGPT/Claude-App, Benachrichtigungen, Diktat offline, Verknüpfungen) |
| #510 | 0.16.0 · Kern 0.28.0 | R8 Food-Zine wie alt (Poster-Generator, 6 Formate, Extras, Trend, Auftragsfeld Kopieren · Claude · ChatGPT, keine Kosten), Sammlung „Meine Food-Zine-Bilder“ (IndexedDB, nicht in der Sicherung), Kreativbuch mit Einzelauswahl, alte JSON-Antworten |
| (dieser) | 0.16.1 · Kern 0.28.1 | R10 Bild im Vollbild mit Werkzeugen unten rechts · R11 Seitenleiste links/rechts · R14 Übersetzung bearbeiten + „als Hauptfassung übernehmen“ · R15 Übersetzen im Gerät (Chrome Translator-API, nur wo vorhanden) · R16 „Einordnen“ (Kategorie + Ordner in einem Fenster, Beispiel „Hochzeit von Jonas und Lisa“), Bearbeiten vor Löschen, Stift an Zutaten/Zubereitung, Vollbild-Knopf (ganze App) unten rechts im Rezeptbild statt „Nur dieses Rezept“ · R17 Spalten nach freiem Platz (Container-Query) · R18 Food-Zine: Blättern in der Großansicht, eigenes KI-Bild aus der Sammlung, zwei Spalten · R20 ✕ im Notizfeld |

⚠ Nicht gemessen: Tablet/Finger echt, echte Translator-API mit Sprachpaket, echtes Browser-Vollbild, echtes Claude/ChatGPT
(Einfügen von Text + Bild nach dem Öffnen des Chats). `developer.chrome.com` ist aus der Sitzung nicht erreichbar (DNS);
die Translator-API-Form ist aus dem Gedächtnis gebaut (`availability`, `create` mit `monitor`/`downloadprogress`, `translate`).

## Reihenfolge für die nächste Sitzung

1. **R19 Event-Ordner** (Entscheidungen stehen in der Befundliste): Anlass, ein Datum, Gäste am Ordner; „In den Kalender
   übernehmen“ (Gänge nach Kategorie, Portionen = Gäste, danach frei bearbeitbar), „Kalender abgleichen“ bei späteren
   Änderungen, Einkaufsliste mit Gästezahl, Menükarte drucken. Kern-Teil (`kern/modell/ordner.mjs`, `plan.mjs`) mit Tests –
   das Mixarium bekommt es über `kern-nachziehen` mit.
2. **R22 Beispielbilder an den Formaten** – erst wenn Klaus die Bilder schickt (im Repo nicht gefunden; nachfragen).
3. **R6 Doppelungen beim Einlesen** (Kern `fuehreZusammen`; „alkoholfrei“ ↔ „mit Alkohol“ ist kein Doppel) und **R5 Wischen
   an der Rezeptkarte** nach Muttis (`add_repo` Muttis-Rezeptbuch, gegen `origin/main` lesen).
4. **Mixarium** (Briefkasten `docs/BRIEFKASTEN_MIXARIUM.md` Runde I lesen, Kern 0.28.1 mit `tools/kern-nachziehen.mjs`):
   M1 Ersetzen wie Rezeptbuch; Explorer, Kreativbuch-Bereich, Food-Zine/Getränke-Zine prüfen; Vollbild-Knopf, Container-Spalten,
   Einordnen, Übersetzung, Seitenleiste; `docs/BAU_APK_WINDOWS.md` dort um Zeile 7a (Kalender) ergänzen, damit beide gleich sind.
5. **Familienakte und Private Akte** (Klaus 25.11.: „nächste Sitzung“): Vollbild-Knopf wie im Rezeptbuch (ganze App,
   bedienbar, derselbe Knopf zurück) und die Ansichten passen sich dem freien Platz an. Repos: `Meine-Familienakte`,
   `Private-Akte` (`add_repo`; in dieser Sitzung nur geklont, nichts geändert). Deren CLAUDE.md zuerst lesen.
6. Erst wenn beide Kochbuch-Apps durch sind: ausdrücklich „Rezeptbuch fertig“ / „Mixarium fertig“, dann Marktplätze, dann
   APK (aus dem fertigen PWA-Stand; die APK auf Klaus' Tablet ist noch 0.15.2) und Windows mit § 8 und R21 (Gerätekalender).

## Fallen dieser Sitzung

- **Squash-Merge und derselbe Zweig:** nach einem gemergten PR enthält `origin/ccr-…` nur schon gemergte Geschichte; Push wird
  abgelehnt, Force-Push ist gesperrt. Lösung: `git fetch origin <zweig> && git merge -X ours origin/<zweig>`, prüfen, dass der
  Inhalt dem eigenen Commit gleicht (`git diff <eigener> HEAD` leer), dann pushen.
- **Höchstens 4 Browser-Proben gleichzeitig**, sonst Zeitüberschreitungen, die wie Fehler aussehen. Helfer-Läufe vorher stoppen.
- **Headless-Chromium hat Chromes Translator-API** (auf localhost). Proben, die den Claude-Weg messen, löschen
  `self.Translator` per `addInitScript` (`smoke_neu_sprache`); den Gerätweg misst `smoke_neu_bedienung` mit gestellter API.
- **Eine Probe, die ein altes Verhalten festnagelt**, wird rot, wenn Klaus das Verhalten ändert: Erwartung nach Klaus' Wort
  ändern und im Commit nennen (diesmal: „bearbeitet wird das Original“ → „die angezeigte Fassung“).
- Helfer im eigenen Arbeitsbaum (`git worktree add … origin/main`), Nachrichten mit Klaus' Nachträgen per `SendMessage`
  weitergeben; ein Helfer-Bericht ist eine Behauptung – selbst nachmessen.

## Startauftrag

```
Lies in Mein-Rezeptbuch zuerst CLAUDE.md, dann docs/BRIEF_SITZUNG_2026-11-25_TEIL3.md und docs/BEFUNDE_VERGLEICH_2026-11-25.md.
Freibrief wie zuvor. Qualität vor Quantität. Bau in der Reihenfolge des Briefs (zuerst R19 Event-Ordner), prüf jeden Punkt am Code,
bau, prüf, merge; besprich mit mir, was dir auffällt. Gib am Ende jeder Sitzung die PWA zum Testen frei (Link und Fassung).
Sag mir ausdrücklich, wenn Rezeptbuch und Mixarium fertig sind; dann Marktplätze, danach APK und Windows.
```
