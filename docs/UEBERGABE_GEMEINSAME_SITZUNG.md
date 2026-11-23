# Übergabe an die gemeinsame Sitzung (Rezeptbuch + Mixarium)

Stand 23.11.2026. Klaus legt die Rezeptbuch-Sitzung und die Mixarium-Sitzung zu **einer** zusammen, weil er sonst alles
zweimal sagen muss. Diese Datei ist die Übergabe der Rezeptbuch-Seite. Die Mixarium-Seite schreibt ihre nach
`Mein-Mixarium/docs/UEBERGABE_GEMEINSAME_SITZUNG.md`.

## Wie die gemeinsame Sitzung arbeitet

- **Zwei Repos, ein Kern.** `Mein-Rezeptbuch` baut den Küchen-Kern (`kern/`, Pin `KERN.json`, geschrieben von
  `node kern/kern-stand.mjs`). `Mein-Mixarium` übernimmt ihn byte-gleich per Pin (`KERN-PIN.json`) und ändert ihn nie von Hand.
- **Klaus sagt etwas einmal.** Was beide Apps betrifft: erst im Kern bzw. im Rezeptbuch bauen, dann im Mixarium nachziehen
  (oder umgekehrt), immer an einer App zur Zeit. Nicht blind übertragen: je Punkt prüfen, ob er in der anderen App sinnvoll ist.
- **Immer gegen `origin/main` arbeiten**, in beiden Repos. Der GitHub-Default-Branch des Rezeptbuchs ist ein toter Decoy.
- **Die alten Apps bleiben unverändert** als Referenz (`index.html`, `QC_*.html`, `build.py`, Service Worker, Manifest, `sbkim/`).
  Gebaut wird daneben in `neu/`. Das Repo Muttis-Rezeptbuch wird nicht verändert.
- **Selbst-Merge** eigener, getesteter PRs ist erlaubt (CLAUDE.md). Codex-Kommentare werden nicht geprüft („ist raus“).
- **Keine Forschungseinträge** in diesen Repos (nur Kimhub). Schlüssel nie in Dateien oder im Chat.
- **APK und Windows erst nach Klaus' Go.** Erst wird die PWA fertig, er prüft sie. Kein Store-Eintrag, kein Release ohne sein Wort.
- Die beiden Briefkästen (`docs/BRIEFKASTEN_MIXARIUM.md` hier, `docs/ABGLEICH_REZEPTBUCH.md` im Mixarium) braucht die
  gemeinsame Sitzung nicht mehr zu führen; sie liest sie einmal zum Einstieg.

## Stand Rezeptbuch (main, PWA 0.9.0, Kern 0.10.0)

Neue PWA unter `neu/` (ES-Module ohne Bauschritt), Ausgaben in `ausgaben/rezeptbuch` und `ausgaben/muttis`, Beispiele in
`beispiele/` mit `KATALOG.json`. Proben: `npm test` (42 grün), `node tests/smoke_neu.mjs` (118 grün, echter Browser, kein Netz).

Fertig: Start mit Suche und Fotokategorien · Rezept, Portionen, Kochansicht (Wecker, Wischen, Geräte) · Formular, Text-Import
ohne KI, Spracheingabe (einfache Fassung) · Kategorien (umbenennen, Zeichen, ordnen, löschen, neu) · Einkaufsliste je Laden ·
Wochenplan · Bilder-Ordner · Bildausschnitt · Sicherung Fassung 11 und Übernahme aus der alten App · Tresor · KI-Bild (OpenAI)
und Gratis-Foto · Sinn-Suche (Modul 03/04 aus `sbkim/`, erst beim Einschalten) · Hell/Dunkel je Farbe · Schrift-Regler ·
Bild-Vollbild · Winkel in der Namenszeile statt Knöpfen auf dem Bild · Offline (Service Worker).

Kern-Bausteine: `modell/` (rezept mit `sicht`, kategorien, suche, mengen, kochen, einkauf, plan, zustand) · `sicherung/` ·
`speicher/` (speicher, uebernahme, tresor) · `import/text` · `ki/bild` · `suche/bedeutung` · `pruefung/paket` ·
`oberflaeche/` (symbole, farben mit Ton, schrift, bild, geraete, diktat) · `ausgabe/`.

## Was Klaus gesagt hat und noch offen ist

1. **„Keine Funktion auslassen“** außer SBKIM/Mycel (eingebaut, nicht geladen, unsichtbar, später freischaltbar). Bestand und
   Ziel je Funktion: `docs/FUNKTIONSLISTE.md`. Noch nicht in der neuen PWA: Ordner · Foto-Scan · Web-Import (ohne öffentliche
   Weiterleiter) · „vom Teller“ · Übersetzung (alle/einzeln, mit Kostenhinweis, Sprache „wie das Gerät“) · Nährwerte ·
   Rechtschreibung · Wochenplan-KI · Reinigung vor der KI · Kreativbuch, KI-Buch, Food-Zine, PDF-Buch, Flipbook · Drucken ·
   QR-Teilen · Notizbuch mit Kalender · Einheiten metrisch/US · Schlüssel für Anthropic und Mistral · Muttis-Ausgabe als PWA.
2. **Bewährte Bausteine übernehmen, nicht neu bauen.** Offen: Mikrofon aus Modul 21 (jetzt nur `diktat.mjs`) · KI-Richter der
   Suche · Tresor-Stände der alten App übernehmen · Prüfung des Bildauftrags auf KI-Anweisungen · Sammel-Weg „KI-Bilder für
   alle Rezepte ohne Bild / vorhandene ersetzen“ (Import-Reiter der alten App).
3. **Nicht gemessen:** alles am Tablet · echter OpenAI-Aufruf · das echte Sprachmodell der Sinn-Suche (Größe, Dauer bei vielen
   Rezepten) · die Live-Seite (github.io ist von der Sitzung aus nicht erreichbar).
4. **Unklar, bitte Klaus fragen:** was er mit „In den Einstellungen, ich muss es immer wieder sagen“ meinte · ob ein Tipp aufs
   Bild das Vollbild (jetzt so) oder die Bild-Werkzeuge öffnen soll · ob das Mixarium auf den Winkel in der Namenszeile geht.
5. **Fragen an Klaus von früher:** Labor im Kern · Ablageort Beispielbuch · familyproject.de und „PWA-Toolpoint“ (welcher
   Server, welcher Zugang) · `_CR`-Block im Kern · Sushi-Fehler auch in der alten App beheben?
6. **Bilder:** 12 Beispiel-Rezepte ohne Bild und drei App-Zeichen; Aufträge für ChatGPT in `beispiele/AENDERUNGEN.md` und
   `docs/vorschau/app-zeichen-auftraege.md`.
7. **Vom Mixarium offen** (Briefkasten dort): Kategorien und Warengruppen je Ausgabe austauschbar · `getraenke/einheiten.mjs`
   gegen `kern/modell/mengen.mjs` prüfen · Mixarium-PWA von ihren vorläufigen Teilen auf den Kern umhängen.

## Fallen, die schon Zeit gekostet haben

- Vor dem Commit die Probe wirklich grün sehen; ein `//`-Kommentar in einer Einzeiler-Funktion hat einmal die App zerlegt.
- Der Session-Branch hängt nach einem Squash-Merge hinter `main`: neu von `origin/main` aufsetzen, den alten Remote-Stand mit
  `git merge -s ours` einbinden, dann pushen (Force-Push ist gesperrt).
- Der Service Worker umgeht `page.route`; Proben, die einen Baustein nachstellen, brauchen einen Kontext mit
  `serviceWorkers: 'block'`.
- `\b` kennt keine Umlaute („andünsten“ wird als „and“ gelesen).
