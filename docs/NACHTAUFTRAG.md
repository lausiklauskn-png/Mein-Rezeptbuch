# Nachtauftrag für die gemeinsame Sitzung (Mein Rezeptbuch + Mein Mixarium)

Von Klaus, 23.11.2026. Gilt für die Sitzung, die über Nacht beide PWAs fertig baut.

Du bist die gemeinsame Sitzung für Mein Rezeptbuch und Mein Mixarium. Du arbeitest über Nacht allein, bis morgen früh
6:00 Uhr (Europe/Berlin). Ziel: beide PWAs fertig bauen, sodass Klaus sie morgen früh prüfen und danach den Bau der APK und
der Windows-App für beide Apps freigeben kann.

## Freigabe für die Nacht

- Du entscheidest selbst, nach Logik und Nutzerfreundlichkeit. Wo du zwischen zwei Wegen wählen musstest, schreib die
  Entscheidung mit einem Satz Grund in die Übergabe, damit Klaus sie morgen ändern kann.
- Eigene, getestete PRs mergst du selbst nach `main`, in beiden Repos.
- Wird dein Kontext zu voll: bring alles auf `main`, aktualisiere die Übergabe und arbeite weiter. Wenn du eine neue Sitzung
  eröffnen kannst und es nötig ist, übergib an sie mit diesem Auftrag und dem neuen Stand.
- Hör nicht vorzeitig auf. Ist ein Punkt blockiert, schreib ihn auf und nimm den nächsten.

## So arbeitest du in der Nacht

- **Arbeite still.** Schreib zwischendurch nichts in den Chat: keine Ankündigungen, keine Zwischenberichte, keine Erklärungen,
  was du gerade tust. Spar die Ausgabe und steck sie in die Arbeit. Klaus liest erst morgen früh, und dann nur den einen
  Gesamtbericht.
- Der Stand steht in den Repos, nicht im Chat: kleine PRs mit klarer Beschreibung, und die Übergabe-Datei nach jedem größeren
  Schritt nachführen. Das ist auch die Absicherung, falls die Sitzung abbricht.
- **Qualität geht vor Umfang**, in beiden Apps gleich. Lieber weniger Funktionen, die sauber gebaut, im echten Browser geprüft
  und angesehen sind, als viele halbe. Nichts mergen, was du nicht grün gesehen hast. Was bis 6:00 nicht fertig wird, bleibt
  weg und steht ehrlich im Bericht; es wird nicht halb fertig eingebaut.
- Keine Eile: Die PWA muss morgen früh nicht vollständig sein. Wichtig ist, dass alles, was drin ist, stimmt.
  „Lieber besser und langsam als schnell und schlecht.“

## Fragen beantwortest du selbst

- Klaus kann nachts nicht antworten. Stell keine Frage und warte auf keine Antwort.
- Der Bauplan liegt vor dir: die fertigen alten Apps. Für Mein Rezeptbuch `index.html` und `QC_MeinRezb_24_04_26.html`, für
  das Mixarium `index.html` und `QC_Mixarium_20_04_26.html`, dazu `sbkim/` und `CLAUDE.md` in beiden Repos. Wenn unklar ist,
  wie etwas gehen, heißen oder aussehen soll: sieh dort nach und mach es so, wie es dort ist.
- Reihenfolge bei einer offenen Frage: 1. was Klaus in den Briefkästen und Übergaben gesagt hat, 2. wie die alte App es
  macht, 3. wie die andere App es schon gelöst hat, 4. was für den Nutzer am einfachsten ist.
- Jede Frage, die du so selbst beantwortet hast, kommt mit der Antwort und einem Satz Grund in den Bericht. Dort stehen auch
  die Fragen, die nur Klaus klären kann (Zugänge, Schlüssel, Server); die blockieren dich nicht, du baust um sie herum.
- Braucht ein Schritt eine Freigabe, die du nicht selbst geben kannst (eine Berechtigung, ein Zugang), dann lass ihn aus,
  schreib ihn auf und nimm den nächsten.

## Was auch nachts nicht geht

- Kein Store-Eintrag, kein Release, kein Start eines APK- oder Windows-Baus.
- Die alten Apps bleiben unverändert (`index.html`, QC-Dateien, `build.py`, `sbkim/`, alte Service Worker und Manifeste).
  Gebaut wird in `neu/`. Das Repo Muttis-Rezeptbuch wird nicht angefasst.
- Schlüssel nie in Dateien oder im Chat. Kein Force-Push, nichts löschen, was nicht von dir stammt.
- Keine Forschungseinträge in diesen Repos. Codex wird nicht geprüft.

## Einstieg

1. Arbeite in beiden Repos immer gegen `origin/main` (der GitHub-Default-Branch von Mein-Rezeptbuch ist ein toter Decoy).
   Lies `CLAUDE.md` in beiden Repos.
2. Lies, in dieser Reihenfolge:
   - `docs/UEBERGABE_GEMEINSAME_SITZUNG.md` in beiden Repos (Stand 23.11., 18:05; Versionen, was fertig ist, was fehlt,
     Entscheidungen, Fallen). Die Rezeptbuch-Datei ist die gemeinsame Seite (Arbeitsweise, Kern), die Mixarium-Datei die
     Getränke-Seite.
   - `Mein-Rezeptbuch/docs/BRIEFKASTEN_MIXARIUM.md` (neueste Runde **C**) und `Mein-Mixarium/docs/ABGLEICH_REZEPTBUCH.md`
     (neueste Runde **6**)
   - `docs/FUNKTIONSLISTE.md` in beiden Repos (jede Funktion der alten App mit Ziel)
   - `kern/README.md` (jeder Kern-Baustein mit einer Zeile; neu: `oberflaeche/hinweis.mjs`, `oberflaeche/warten.mjs`)
   - `neu/README.md` und `getraenke/README.md` im Mixarium

   Maßgeblich ist, was auf `main` liegt.

## Regeln fürs Bauen

- Der Küchen-Kern wird im Rezeptbuch gebaut (`kern/`, `KERN.json` über `node kern/kern-stand.mjs`). Das Mixarium übernimmt ihn
  byte-gleich per Pin und ändert ihn nie von Hand.
- Baue an einer App zur Zeit und ziehe danach die andere nach. Prüfe je Punkt, ob er in der anderen App sinnvoll ist; nicht
  blind übertragen.
- Bewährte Bausteine der alten Apps übernehmen, nicht neu bauen. Keine Funktion auslassen, außer SBKIM/Mycel: eingebaut,
  nicht geladen, unsichtbar.
- Erklärtexte hinter ein „?“, Meldungen kurz und einzeilig, keine Knöpfe auf dem Bild, keine neue Zeile, wo ein Pfeil reicht.
  Mikrofon in jedem größeren Textfeld.
- KI nur mit eigenem Schlüssel und nur auf Knopfdruck; vor dem Senden steht, was hinausgeht.
- Vor jedem Commit die Proben wirklich grün sehen (`npm test` und die Smoke-Proben beider Repos). Für jede neue Funktion eine
  Probe im echten Browser. Kleine PRs, oft mergen, damit nichts verloren geht.

## Auftrag, in dieser Reihenfolge

A. **Bestand:** Die Listen „was fehlt“ stehen je App in der Übergabe (Stand 18:05). Prüfe sie gegen die Funktionslisten,
   ergänze, was fehlt, und arbeite sie ab.
B. **Zuerst, was man zum Prüfen braucht** – schon gebaut und geprüft: ~~anlegen~~, ~~Text-Import~~, ~~Datei~~, ~~Sicherung~~,
   ~~Tresor~~, ~~Sinn-Suche~~, ~~Kochen/Mixen~~, ~~Einkauf je Laden~~, ~~Plan~~, ~~Bilder-Ordner~~, ~~KI-Bild einzeln~~,
   ~~OpenAI-Schlüssel~~, ~~Anthropic-Schlüssel (Mixarium)~~, ~~Ladebalken bei jeder Wartezeit~~, ~~Erklärtexte hinter „?“~~,
   ~~Hinweis-Blasen~~. Offen, in dieser Reihenfolge:
   1. Foto-Scan (einzeln/Stapel, Claude/Mistral) mit **Reinigung vor der KI** und „Datei prüfen“ (beide Apps)
   2. Web-Import ohne öffentliche Weiterleiter (beide)
   3. Schlüssel: **Mistral** (beide), **Anthropic im Rezeptbuch** (das Fenster des Mixariums übernehmen)
   4. **Ordner-Ansicht** (beide; Daten sind da, Ansicht fehlt)
   5. **Sprache „wie das Gerät“ mit Sprachmenü** (Rezeptbuch hat keins) und **Übersetzung** (alle oder einzeln, mit Kostenhinweis);
      Mixarium-Oberfläche in den übrigen sechs Sprachen
   6. **Mikrofon aus Modul 21** in jedem größeren Textfeld (jetzt nur `diktat.mjs`)
   7. Tresor-Stände der alten App übernehmen · KI-Richter der Suche · Sammel-Weg „KI-Bilder für alle ohne Bild“ · Prüfung des
      Bildauftrags auf KI-Anweisungen
   8. Mixarium: „Bekannte Drinks entdecken“ (TheCocktailDB, Netz nur auf Knopfdruck) · Bewertung am Getränk außerhalb des Labors
C. **Dann der Rest der Funktionslisten:** Nährwerte, Rechtschreibung, Wochenplan-KI, Kreativbuch, KI-Buch, Food-Zine, PDF-Buch,
   Flipbook, Drucken, QR-Teilen, Notizbuch mit Kalender, Einheiten metrisch/US, Handbuch/Hilfe, Barrierefreiheit-Schalter,
   Muttis-Ausgabe als PWA; im Mixarium das Entsprechende (~~Labor~~ ist gebaut, auf Haiku 5.5).
D. **Beide Apps angleichen:** gleiche Lage der Knöpfe, gleiche Einstellungen, gleiche Wörter. Die Mixarium-PWA von ihren
   vorläufigen Teilen auf den Kern umhängen, wo es passt (Kategorien, Einkauf, Plan, Text-Import, Sinn-Suche, Tooltips und
   Ladebalken hängen schon am Kern; offen: Oberfläche und Posten-Modell der Einkaufsliste). Verbliebene Erklär-Absätze
   (`.ftext`) in Fenstern hinter „?“ prüfen.
E. **Feinschliff:** jede Ansicht am Handy (390 px), am Tablet und am Monitor ansehen (Bildschirmfotos), hell und dunkel, ohne
   Netz. Was schief aussieht, richten.
F. **Bau von APK und Windows-App vorbereiten, nicht starten:** Weg wählen (ein Werkzeug für beide Apps, Beispiele im Paket,
   App-Zeichen mit dunklem Grund und Goldring), Gerüst anlegen und aufschreiben, was Klaus tun muss, um den Bau zu starten.

## Stand bei der Übergabe

23.11.2026, 18:05 Uhr (Europe/Berlin), übergeben von der gemeinsamen Tag-Sitzung.

| | Mein Rezeptbuch | Mein Mixarium |
|---|---|---|
| Kern | 0.17.0 | 0.17.0 (Pin `0b18345`) |
| PWA `neu/` | 0.9.5 | 10.0.0-vor19 |
| main | `0b18345` | `859c911` |
| Proben | `npm test` 52 · `smoke_neu` 140 grün · 0 ROT | `npm test` 104 · smoke_neu_pwa 71 · smoke_neu_kategorien 78 · smoke_neu_labor 43, je 0 ROT |

Nichts liegt halb fertig herum; alles Angefangene ist geprüft und gemergt.

## Morgen früh um 6:00 (die einzige Nachricht an Klaus in dieser Nacht)

Aktualisiere `docs/UEBERGABE_GEMEINSAME_SITZUNG.md` in beiden Repos und schreib einen kurzen Bericht:

- je App: was fertig und geprüft ist, was fehlt und warum
- jede Entscheidung und jede Frage, die du allein beantwortet hast, mit einem Satz Grund
- was nicht gemessen ist (Tablet, echte KI-Aufrufe, echtes Sprachmodell der Sinn-Suche, die Live-Seite)
- was Klaus prüfen soll und in welcher Reihenfolge, und was er für den Bau tun muss
- die offenen Fragen an Klaus: was er mit „In den Einstellungen, ich muss es immer wieder sagen“ meinte; familyproject.de und
  „PWA-Toolpoint“ (Server, Zugang); ob die drei App-Zeichen und die 12 fehlenden Beispielbilder vorliegen
