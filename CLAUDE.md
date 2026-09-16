# Projektregeln für Claude – Muttis Rezeptbuch

---

## 🚨 REGEL: IMMER gegen `main` prüfen — der GitHub-Default-Branch ist ein toter Decoy

**Verbindlich (Klaus 2026-07-02, nach wiederholtem Fehl-Befund).** Der auf GitHub
eingestellte **Default-Branch dieses Repos ist NICHT `main`**, sondern ein alter
**Vor-SBKIM-Branch** (`claude/recipe-book-app-update-fGP7B`, Stand aus der „Muttis"-Zeit,
ohne `sbkim/`-Verzeichnis). Automatisch angelegte Session-Branches zweigen von diesem
Default ab und tragen deshalb **kein SBKIM** — jede Sitzung, die „den ausgecheckten Stand"
oder „den Default-Branch" liest, kommt fälschlich zum Schluss „Rezeptbuch hat kein SBKIM".
**Das ist der wiederkehrende Fehler. Er ist immer derselbe.**

**Wahrheit:** `main` (`git show origin/main:…`) ist die **einzige** Quelle der Wahrheit und
die **GitHub-Pages-Deploy-Quelle**. `main` trägt die **volle SBKIM-Integration** (Module
00–08, 15, 16, 17, 18, 23, Briefkästen, Spore, `status.json`) — die Modul-09-Einbau-PWA-
Migration **hat längst stattgefunden**.

**Pflicht bei JEDER Aussage über den Rezeptbuch-Stand:**
1. **Zuerst** `git fetch origin main` und **gegen `origin/main` prüfen**, nie gegen den
   ausgecheckten Session-Branch oder den Default-Branch:
   ```bash
   git fetch origin main --quiet
   git ls-tree origin/main --name-only sbkim/ | head    # SBKIM ist da
   git show origin/main:index.html | grep 'sbkim/'       # Module sind eingebunden
   ```
2. **Session-Branch von `main` neu aufsetzen**, bevor gebaut wird (der Auto-Default ist
   wertlos): `git checkout -B <branch> origin/main`.
3. **Niemals** „Rezeptbuch hat kein SBKIM" schreiben, ohne Schritt 1 ausgeführt zu haben.

---

## ⚠️ REGEL: Vollbremsung vor der Fehlersuche

Bevor mit der Diagnose begonnen wird, ist genau **eine** Frage zu stellen:

> *Wann hat es zuletzt funktioniert – und was hat sich seitdem geändert?*

Erst wenn diese Frage beantwortet ist, wird mit der Suche begonnen. Nicht früher.

**Konkret bei Code:**
1. `git log` – Zeitachse der Änderungen ansehen
2. Den letzten Commit vor dem Problem identifizieren
3. `git diff <commit>^ <commit>` – was genau hat sich geändert
4. **Dann** erst debuggen

Diese Regel gilt auch wenn das Problem komplex wirkt, der Zeitdruck hoch ist, oder bereits eine plausible Hypothese vorhanden ist. **Gerade dann.**

---

## ⚠️ REGEL: Branch-Zustand prüfen bevor in lokalen Dateien gesucht wird

Wenn ein Feature oder Button im lokalen Code **nicht gefunden** wird, ist der erste Schritt **nicht** weiterzusuchen – sondern den Branch-Zustand zu prüfen:

```bash
git fetch origin main
git log HEAD..origin/main --oneline   # Wie weit liegt main voraus?
```

Wenn main voraus liegt: **Die relevante Datei direkt von main holen** – nicht blind mergen:

```bash
git checkout origin/main -- <dateiname>   # Nur die eine Datei
# Änderung machen
python3 build.py
git add + git commit + git push
```

**Niemals** `git merge origin/main` reflexartig ausführen wenn der Branch weit hinter main liegt – das produziert unnötige Konflikte. Stattdessen nur die benötigte Datei gezielt holen.

**Warum diese Regel:** Lokale Dateien können veraltet sein. Ein Feature das "nicht im Code steht" ist oft in einer neueren Datei auf main – nicht in der lokalen Version.

---

## ⚠️ PFLICHT-CHECKLISTE NACH JEDER ÄNDERUNG

Claude muss nach **jeder** Änderung an der QC-Datei folgende Punkte ausgeben und den Benutzer explizit darauf hinweisen:

```
✅ 1. QC-Datei geändert:   QC_MeinRezb_*.html       ← erledigt
✅ 2. index.html:          Neu gebaut via build.py ← erledigt (Claude darf bauen)
```

**Claude darf eine Aufgabe NICHT als erledigt melden, ohne diese Checkliste anzuzeigen.**

---

## Projektübersicht

### Dieses Repo: `lausiklauskn-png/Mein-Rezeptbuch`
- **App-Name:** Mein Rezeptbuch (der öffentliche Klon)
- **Lokaler Pfad:** `/home/user/Mein-Rezeptbuch/`
- **Quelldatei:** `QC_MeinRezb_24_04_26.html` → `python3 build.py` → `index.html`

### Schwesterprojekt: `lausiklauskn-png/Muttis-Rezeptbuch`
- **App-Name:** Muttis Rezeptbuch (das Original), Quelldatei `QC_MR_*.html`
- Die beiden Apps sind funktional identisch
- Änderungen werden in der Regel **zuerst dort** (Muttis Rezeptbuch) entwickelt und
  dann **hierher** übertragen — nicht umgekehrt

> **Bis 2026-08-22 stand hier das Gegenteil.** Dieser Abschnitt war aus dem
> Schwester-Repo kopiert und behauptete, dies sei Muttis-Rezeptbuch, mit dem Pfad
> `/home/user/Muttis-Rezeptbuch/`. Ausgerechnet in der Datei, die mit „IMMER gegen
> main prüfen" beginnt, las eine Sitzung damit ihre eigene Identität falsch.

---

## Dateistruktur

| Datei | Bedeutung |
|---|---|
| `index.html` | **Produktionsdatei** – enthält `_CR`-Wasserzeichen – NICHT direkt bearbeiten |
| `QC_MeinRezb_24_04_26.html` | **Quelldatei (v9.2)** – saubere, lesbare Version ohne Sicherheitsblock – hier werden Änderungen gemacht |
| `build.py` | **Build-Skript** – baut `index.html` aus QC-Datei + `_cr_block.txt` |
| `_cr_block.txt` | Gespeicherter _CR-Schutzblock (~111 KB, Einzeiler) |
| `extract_cr.py` | Einmalig: extrahiert _CR-Block aus bestehender `index.html` |
| `sw.js` / `app-sw.js` | Service Worker |
| `manifest.json` / `app-manifest.json` | PWA-Manifeste |

### Build-Workflow (index.html neu bauen)
Nach Änderungen an der QC-Datei einfach ausführen:
```bash
python3 build.py
```
Das Skript findet automatisch die neueste `QC_MeinRezb_*.html` und kombiniert sie mit `_cr_block.txt` → erzeugt `index.html`.

### QC-Datei aus index.html extrahieren (falls nötig)
Der `_CR`-Block ist **eine einzige Zeile** (~113.000 Zeichen), die mit `const _CR=Object.freeze` beginnt.
```python
python3 -c "
with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
header_end = 0
for i, l in enumerate(lines):
    if '-->' in l and i < 20:
        header_end = i + 1
        break
cr_line = None
for i, l in enumerate(lines):
    if l.strip().startswith('const _CR=Object.freeze'):
        cr_line = i
        break
import datetime
d = datetime.date.today().strftime('%d_%m_%y')
output = lines[header_end:cr_line] + lines[cr_line+1:]
filename = f'QC_MeinRezb_{d}.html'
open(filename, 'w', encoding='utf-8').writelines(output)
print(f'Gespeichert: {filename}, {len(output)} Zeilen')
"
```

---

## Übersetzungssystem
- `LANGS`-Objekt im JS (ab ca. Zeile 2324 in index.html)
- Funktion `T(k)` für alle UI-Texte
- 8 Sprachen: de, en, ru, zh, es, fr, it, pt
- Variable `CL` = aktuelle Sprache (aus localStorage `mlang9`)

---

## Workflow-Regeln

### Entwicklung
1. Änderungen **immer** in der QC-Datei (`QC_MeinRezb_*.html`) vornehmen
2. Nach Änderungen: `python3 build.py` ausführen → erzeugt neue `index.html`
3. Commit-Nachrichten auf **Deutsch**

### Selbst-Merge-Freibrief

Die Sitzung merget ihre **eigenen** PRs selbstständig nach `main`, sobald sie
getestet (Build/Smoke grün), abgegrenzt und nicht architektonisch zweifelhaft
sind — **ohne** auf ein „X mergen" zu warten. **Nicht** bei echtem Zweifel oder
wenn Klaus vorher draufschauen will. Klaus' Browser-Sichttest läuft **nach**
dem Merge auf der Live-Seite. Volltext: [NETZWEIT § 1](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md).

### "Hochladen"-Befehl
Wenn der Benutzer **"Hochladen"** schreibt:
1. Alle lokalen Änderungen committen
2. Auf aktuellen Feature-Branch pushen: `git push -u origin <branch>`
3. PR erstellen via `mcp__github__create_pull_request` → nach `main`
4. PR-URL mitteilen — **und nach dem Selbst-Merge-Freibrief direkt mergen, wenn sinnvoll**

### Pflicht-Prüfung bei "Hochladen" oder "Mergen"
**Immer** alle offenen Branches und PRs prüfen – nicht nur den aktuellen Branch:

| Schritt | Primär (MCP) | Fallback (git) |
|---|---|---|
| Offene PRs prüfen | `mcp__github__list_pull_requests` (state: open) | entfällt |
| Alle Branches prüfen | `mcp__github__list_branches` | `git fetch --all` |
| Branches ahead of main | — | `git log origin/main..origin/<branch> --oneline` für jeden Branch |

**Wenn MCP-Tools nicht verfügbar:**
- Explizit melden: *"GitHub-PRs können gerade nicht geprüft werden (MCP nicht verfügbar)"*
- git-Fallback verwenden: alle Remote-Branches auf ungemergede Commits prüfen
- NIEMALS "nichts offen" sagen ohne zu prüfen, was tatsächlich geprüft wurde

### Branch-Konvention
- Feature-Branches werden automatisch angelegt (Format: `claude/<beschreibung>-<id>`)
- Immer auf dem zugewiesenen Branch arbeiten (steht oben in der Session-Konfiguration)

### GitHub-Repo ist auf Privat gestellt
**Keine Review-Kommentare oder CI-Checks prüfen.** Das Repo ist privat – es gibt keine externen Reviewer und kein CI-System. Nach einem Push/Merge müssen weder `get_review_comments` noch `get_check_runs` aufgerufen werden.

---

## Icon-Aktualisierungen: Pflicht-Verifikation

Nach **jeder** Icon-Änderung vor dem Commit **datenbasiert** prüfen – nicht nur die `<link>`-Tags:

```python
# Alle alten Base64-PNGs aus der Referenzdatei extrahieren
import re
with open('alte_referenz.html', 'r') as f:
    alte_b64s = set(re.findall(r'data:image/png;base64,([A-Za-z0-9+/]+=*)', f.read()))

# Prüfen: Kein einziger alter PNG-Block darf noch in der neuen Datei vorkommen
with open('QC_MeinRezb_*.html', 'r') as f:
    neue_datei = f.read()

verbleibend = [b for b in alte_b64s if b in neue_datei]
assert not verbleibend, f"Noch {len(verbleibend)} alte Icons!"
print("✅ Alle Icons vollständig ersetzt")
```

**Alle 4 Orte** wo Icons stecken können:
1. `<link rel="icon">` – Tab-Favicon
2. `<link rel="apple-touch-icon">` – iOS-Icon
3. `var mj={...icons:[...]}` – **PWA-Install-Dialog** ← wird oft vergessen!
4. `shortcuts[].icons` im Manifest + `<img src="data:...">` im Seiteninhalt

**Regel:** Erst alle Base64-Blobs inventarisieren, dann ersetzen, dann verifizieren.

---

## ⚠️ REGEL GEÄNDERT 2026-08-08: Icons als DATEI mit Versionsnummer

**Bis dahin galt** (wie in Muttis-Rezeptbuch): alle Icons als Base64 in die
HTML einbetten, weil Browser externe Favicon-Adressen aggressiv cachen.

**Das Problem war echt, der Preis war zu hoch.** Gemessen am 2026-08-08: die
eingebetteten Symbole machten **439 KB** der Quelldatei aus und lagen bei
**jedem** Seitenaufruf auf dem kritischen Pfad — obwohl sie während des Ladens
**niemand sieht**.

| | vorher | nachher |
|---|---|---|
| Quelldatei | 1.512 K | **1.073 K** |
| erster Anstrich | 4,3 s | **2,6 s** |
| übertragen | 1.061 KiB | **655 KiB** |

**Neue Regel:** Icons als Datei verlinken, mit **Versionsnummer in der Adresse**:

```html
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-book-192.png?v=1">
```

Eine geänderte Adresse ist für den Cache ein **anderes** Bild — dasselbe
Ergebnis wie die Einbettung, nur ohne Bytes im Dokument.

**Nach jeder Icon-Änderung `?v=` um eins hochzählen** — in der QC-Datei **und**
in `app-sw.js`. Beide müssen dieselbe Adresse nennen, sonst holt der
Offline-Vorrat ein anderes Bild als die Seite.

**Pflicht dabei:** jedes verlinkte Icon gehört in den `SHELL`-Vorrat von
`app-sw.js` — sonst fehlen die Symbole offline. Solange sie im Dokument lagen,
stellte sich die Frage nicht.

**Ausnahme, die bleibt:** die eigenständigen Seiten (`MeinRezeptbuch-gift.html`,
`-gift2.html`, `-invite-v5.html`, USP-Seiten) behalten ihre **inline** Icons.
Dort ging es nie ums Caching, sondern darum, dass eine verschobene Datei das
Icon lautlos bricht — und diese Seiten sind klein.

---

## ⚠️ PFLICHT-REGEL: Dateien umbenennen (atomisch)

**Wenn eine Datei umbenannt wird, MÜSSEN alle Querverweise in EINEM einzigen Commit aktualisiert werden.**

### Warum diese Regel existiert
Zwischen zwei Commits deployt GitHub Pages die Zwischenzustände. Wenn Datei A auf `mr-invite-v5.html` verlinkt und diese Datei dann in einem separaten Commit zu `MeinRezeptbuch-invite-v5.html` umbenannt wird, entsteht ein Deployment-Fenster mit 404-Fehlern – selbst wenn beide Commits nur Minuten auseinanderliegen.

### Pflicht-Checkliste bei jeder Umbenennung

**Vor dem Umbenennen** – alle Stellen finden, die auf die Datei verweisen:
```bash
grep -rn "alter-dateiname" --include="*.html" --include="*.js" --include="*.json" .
```

**In EINEM einzigen Commit** alles zusammen ändern:
1. Datei umbenennen (`git mv alter-name.html neuer-name.html`)
2. Alle `href="alter-name.html"` → `href="neuer-name.html"`
3. Alle `src="alter-name.html"` → `src="neuer-name.html"`
4. Alle `location.replace('...alter-name.html'...)` → neuer Name
5. Alle `window.open('...alter-name.html'...)` → neuer Name
6. Alle absoluten GitHub-Pages-URLs mit altem Namen → neue URLs
7. Alle Referenzen in `app-manifest.json`, `sw.js`, `app-sw.js`

**Verifizieren vor dem Commit:**
```bash
grep -rn "alter-dateiname" --include="*.html" --include="*.js" --include="*.json" .
# Ergebnis muss leer sein!
```

**Regel:** Niemals eine Datei umbenennen und die Referenzaktualisierung auf einen späteren Commit verschieben.

---

## ⚠️ REGEL: Übernahme vom Schwesterprojekt – Pflicht-URL-Prüfung

Wenn Code von **Muttis-Rezeptbuch** nach **Mein-Rezeptbuch** übertragen wird, enthalten alle Dateien Muttis-spezifische Namen und URLs. Diese müssen **vollständig** ersetzt werden – sonst entstehen unsichtbare Zeitbomben die erst später als 404 auffallen.

**Nach jeder Übernahme diesen grep ausführen:**
```bash
grep -rn "mr-gift\|mr-invite\|muttis\|Muttis-Rezeptbuch\|MuttisRezeptbuch\|muttisrezeptbuch" \
  --include="*.html" --include="*.js" --include="*.json" .
# Ergebnis muss leer sein!
```

**Typische Stellen mit alten Namen:**
- `window.open('...mr-invite-v4.html'...)` im Einstellungs-Dialog der Haupt-App
- `location.replace('...mr-gift.html'...)` in den Gift-Seiten
- `dlBlob(..., 'muttis-rezeptbuch.html')` bei Download-Funktionen
- Absolute GitHub-Pages-URLs in `href`, `src`, `content`

**Regel:** Nie annehmen, dass "der Code schon passt" – immer mit grep verifizieren.

---

## ⚠️ REGEL: Eigenständige Seiten werden DIREKT bearbeitet

Die folgenden Dateien sind **eigenständige HTML-Seiten** – sie laufen NICHT durch `build.py`:

| Datei | Typ |
|-------|-----|
| `MeinRezeptbuch-gift.html` | direkt bearbeiten + committen |
| `MeinRezeptbuch-gift2.html` | direkt bearbeiten + committen |
| `MeinRezeptbuch-invite-v5.html` | direkt bearbeiten + committen |
| `USP_MeinRezeptbuch.html` | direkt bearbeiten + committen |
| `USP_Erklaerung zu MeinRezb.html` | direkt bearbeiten + committen |
| `impressum.html` | direkt bearbeiten + committen |

`build.py` ist **ausschließlich** für `index.html` zuständig.

**Pflicht-Checkliste nach Änderungen an eigenständigen Seiten:**
```
✅ Datei direkt geändert (NICHT via build.py)
✅ Alle internen Links auf Korrektheit geprüft (keine mr-* oder Muttis-URLs)
✅ Icons inline als Base64 (keine externen Dateireferenzen)
```

---

## ⚠️ REGEL: Icons in eigenständigen Seiten müssen inline sein

Externe Icon-Referenzen (`href="icons/icon-book-blue.svg"`) in eigenständigen HTML-Seiten sind **verboten**. Wenn die Icon-Datei umbenannt oder verschoben wird, bricht das Icon lautlos.

**Pflicht:** Alle Icons in gift.html, gift2.html, invite-v5.html und USP-Seiten müssen als **inline Base64 data-URI** eingebettet sein:

```html
<!-- FALSCH – externe Referenz: -->
<link rel="icon" href="icons/icon-book-blue.svg">

<!-- RICHTIG – inline Base64: -->
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,...">
```

**Verifizieren:**
```bash
grep -n 'rel="icon"' MeinRezeptbuch-gift.html MeinRezeptbuch-gift2.html MeinRezeptbuch-invite-v5.html
# Jede Zeile muss "data:" enthalten – kein "href="icons/" erlaubt
```

---

## ⚠️ REGEL: Icon-Änderungen erfordern einen einzigen vollständigen Durchgang

Fehler aus der Praxis: Icon in gift.html geändert → ein Commit → danach Nachbesserung nötig (`ac02360 Icon-Fix`), weil die anderen Seiten vergessen wurden.

**Vor dem ersten Icon-Commit** alle betroffenen Stellen inventarisieren:
```bash
grep -rn 'rel="icon"\|rel="apple-touch-icon"\|icons:\[' \
  MeinRezeptbuch-gift.html MeinRezeptbuch-gift2.html \
  MeinRezeptbuch-invite-v5.html app-manifest.json app-sw.js
```

**Alle diese Stellen in EINEM Commit** aktualisieren – kein "ich mache die anderen Seiten später".

---

## Häufige Aufgaben

### Neue Funktion hinzufügen
1. In `QC_MeinRezb_*.html` implementieren
2. `python3 build.py` ausführen
3. Hochladen

### ⚠️ REGEL: Elementhöhe niemals per CSS calc(vw) — immer JS

Hinweis: CSS `calc(vw)` wird in Chrome/Android ignoriert. Stattdessen `offsetWidth` messen + `style.setProperty` verwenden. Nur Getränke-Karten (`data-cat="drk"`) bekommen Hochformat 3:4, alle anderen bleiben Querformat 160px.

### Swipe / Touch / Drag & Drop
- Swipe-Handler: IIFE ab `// ── SWIPE-NAVIGATION ──` (kurz vor `boot()`)
- Touch-Drag: `setupTouchDrag()` und `setupWkTouchDrag()`
- Drag-Selektoren: `.drag-hdl`, `.ing-drag-hdl`, `.fld-drag-hdl`, `.wk-drag-hdl`

### Sprache hinzufügen
- Im `LANGS`-Objekt neuen Sprachblock ergänzen
- `CL`-Variable und `T(k)`-Funktion funktionieren automatisch

---

## Menüleiste (Bottom Nav) – Aktuelle Implementierung

### Schriftgrößen (Stand nach PR #3)
| Element | CSS-Klasse | Wert |
|---|---|---|
| Nav-Icon | `.bn-ico` | `font-size:1.15rem` |
| Nav-Label (Basis) | `.bn-lbl` | `font-size:.65rem` |
| Nav-Label (Typografie-Override) | `.bn-lbl` (Ende `<style>`) | `font-size:var(--text-sm)` = 13px |

### navTo() – Schritt-zurück-Verhalten
**Alle Nav-Buttons** rufen `navTo(n)` statt `showSc(n)` auf.

`navTo(n)` schließt zuerst offene fov-Overlays (Import, Export, API-Key, Sprache, Hilfe, Manual), **bevor** zum Ziel-Tab navigiert wird. Ist ein Overlay offen → wird nur geschlossen (ein Schritt zurück). Ist keins offen → normaler `showSc(n)`-Aufruf.

```javascript
// navTo() steht direkt nach showSc() in der QC-Datei
function navTo(n){ ... }
```

**Regel:** Neue Nav-Buttons immer mit `navTo()` statt `showSc()` anlegen.

---

## Mein-Menü-Overlay (`.mv-*`) – Design-Parität mit Import-Overlay (`.fov-*`)

Das `#mv`-Overlay (Mein Menü / Wochenplan) soll **optisch identisch** mit dem `#importOv`-Overlay sein.

### Aktuelle CSS-Werte (Stand nach PR #3)
| Element | `.mv-*` | entspricht `.fov-*` |
|---|---|---|
| Header | `.mv-hdr` | `.fov-hdr` – `cursor:pointer`, klickbar zum Schließen |
| Zurück-Pfeil | `.mv-back` | `color:rgba(255,255,255,.56)` |
| Titel | `.mv-title` | `font-size:.98rem; color:#fff` |
| Druck-Button | `.mv-print-btn` | Icon-Stil: `font-size:1.15rem; color:rgba(255,255,255,.72)` |
| Tab-Leiste | `.mv-tabs` | `.fov-tabs` |
| Tab-Schrift | `.mvtab` | `font-size:.72rem; padding:9px 4px; color:rgba(255,255,255,.80)` |
| Tab aktiv | `.mvtab.on` | `color:#fff; border-bottom-color:var(--gold)` |

### Spektral-Theme
`.mv-hdr` und `.mv-tabs` haben denselben Regenbogen-Verlauf wie `.fov-hdr`/`.fov-tabs`.

**Regel:** Bei Änderungen an `.fov-hdr`/`.fovtab` immer prüfen ob `.mv-hdr`/`.mvtab` ebenfalls angepasst werden müssen.

---

## 🏷️ Gerätename

Gehört ins Verbinden-Panel, gehängt vom app-eigenen Glue
(`rendezvous-init.js` bzw. `sbkim-init.js`) — **nie** in eine byte-kopierte
Panel-Datei. Jedes Feld trägt `data-sbkim-geraetename`; der Name geht **nur** an
Anzeige und Anmeldung, **nie** an `generateOwnSpore`.
Regel und Begründung: [NETZWEIT § 2](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md), Rezept: Skill `geraetename`.

---

## 🏷️ KATEGORIEN SIND UMBENENNBAR — mit eigenem Symbol (Klaus 2026-09-15)

Übertragen aus **Mein Mixarium**. Klaus: *„diese Möglichkeit des Umbenennens
der Kategorien bitte in mein Rezeptbuch und Muttis Rezeptbuch übertragen."*

Der Weg: 📂 **Ordner** → in der Knopfzeile **✎ Kategorien umbenennen**. Je Zeile
ein Symbol und ein Name; ein Tipp aufs Symbol öffnet ein Raster mit 107
Emojis. Leer lassen heisst Vorgabe, ↺ setzt eine Zeile zurück.

### Drei Sachen, die man wissen muss, bevor man daran baut

- ⚠ **Gespeichert wird NUR die Beschriftung, nie die Kennung.** `c.id` bleibt
  `fleisch`, auch wenn dort „Hauptgerichte" steht. Jedes Rezept zeigt über
  `r.cat` auf diese Kennung — wer sie umbenennt, nimmt allen Rezepten ihr
  Zuhause.
- ⚠ **Der Speicher-Schlüssel ist app-eigen.** Beide Rezeptbücher liegen auf
  derselben `github.io`-Adresse und teilen sich den localStorage. Mein
  Rezeptbuch schreibt `mrz9m`, Muttis `mrz9` — der neue Schlüssel folgt genau
  dieser Trennung (`mrzcats9m` bzw. `mrzcats9`). Eine Probe besteht darauf,
  dass der Schlüssel des ANDEREN Buches leer bleibt.
- ⚠ **Ein eigener Name gilt in allen 8 Sprachen.** Er ist selbst geschrieben;
  ihn zu übersetzen hiesse raten. Das steht im Dialog, sonst wäre es eine
  stille Entscheidung.

### Fremde Kategorien verschwinden nicht mehr still

`catsFremd()` sammelt Kennungen, die in `R` vorkommen und die `CATS` nicht
kennt — etwa aus einem Import der Schwester-App. Solche Rezepte lagen bisher
in `R`, wurden gespeichert und mitexportiert und **nie gezeichnet**, auch nicht
unter „Alle": die Alle-Ansicht lief über `CATS`. Zu finden waren sie nur über
die Suche. Sie bekommen jetzt einen eigenen Reiter, tragen im Dialog die Marke
„mitgebracht" und sind umbenennbar wie jede andere.

### ⚠ Die Namen sind mit Bedacht anders als `catName`/`catIco`

`katBeschriftung(c)` und `katSymbol(c)` nehmen das **Objekt**, die alten
`catName(id)`/`catIco(id)` eine **Kennung**. In Mixarium hiess `katSymbol`
zuerst `catIco` — Funktions-Deklarationen werden hochgezogen, die spätere
gewinnt, und jeder Aufruf landete in der falschen. **Vor dem Ergänzen
nachsehen, ob es den Namen schon gibt.**

### ⚠ Und die Emoji-Auswahl machte sich zuerst selbst wieder zu

`scrollIntoView` beim Öffnen verschob die Liste unter dem Finger; zwischen
`focus` und `click` wanderte das Feld weg, der Klick landete woanders, und der
„Tipp daneben"-Riegel schloss sofort. **Gemessen: drei Läufe derselben Datei,
zweimal offen, einmal zu.** Kein Proben-Artefakt — am Tablet schnappt dasselbe
zu. Das Scrollen ist raus, und ein Wächter auf die **Ursache** steht daneben:
ein Verhaltens-Wächter allein war in zwei von drei Läufen grün.


### ⚠ Die Auswahl war „nicht vollkommen aufgeklappt" — 12 px statt 529 (Klaus 2026-09-15)

Klaus hat es an allen drei Apps gesehen: unter der angetippten Zeile stand nur
ein flacher Streifen. **Gemessen im Browser: 12 px hoch, bei 598 px Inhalt und
107 Knöpfen — nicht eine einzige Reihe.**

**Die Ursache ist eine Zeile CSS, und sie hat nichts mit dem Raster zu tun.**
`.kat-list` ist ein Flex-Container. Ein Flex-Kind mit `overflow-y:auto`
bekommt `min-height:auto` = **0** — es wird plattgedrückt, sobald die Liste
überläuft (gemessen: 773 px Inhalt in 529 px Fenster). Die Zeilen darüber
halten stand, weil ihre Eingabefelder eine Mindesthöhe haben; das Raster nicht.

⚠ **UND DER ALTE WÄCHTER WAR DABEI GRÜN.** Er hieß „steht DIREKT unter der
bearbeiteten Zeile" und fragte, **WO** das Raster hängt — nie, **WIE HOCH** es
ist. *Ein Wächter auf die Lage misst nicht die Sichtbarkeit.* Die Zusicherung
ist ersetzt, nicht stillschweigend getauscht (Tafel-Evolutions-Klausel).

### Was jetzt gilt

Das Raster steht **außerhalb** der scrollenden Liste und legt sich als
Überlagerung **genau über sie** — gemessen gegen die echte Lage der Liste,
nicht gegen einen geratenen Abstand. Die bearbeitete Zeile wird markiert, die
Kopfzeile nennt sie beim Namen, ein × schließt ohne Wahl.

| | vorher | nachher |
|---|---|---|
| Höhe des Rasters | **12 px** | **529 px** (Tablet hoch) · 368 · 421 |
| sichtbare Reihen | 0,3 | **13,2** · 9,2 · 10,5 |
| Liste beim Öffnen | — | **bewegt sich nicht** (529 → 529) |

### ⚠ Drei Anläufe, und die ersten zwei bewegten das Layout

Jeder wurde von einer Probe gefangen, keiner vom Nachdenken:

1. **Die Liste schrumpfen lassen** (46vh → 22vh), damit der Dialog nicht über
   den Schirm wächst. Dabei wandert die angetippte Zeile unter dem Finger weg,
   der folgende `click` landet auf einer **anderen** Zeile — **vier Wächter
   fielen um.** Das ist wortgleich derselbe Fehler wie `scrollIntoView` am
   selben Tag, nur mit einer anderen Ursache für dieselbe Bewegung.
   **Ein Auswahl-Feld darf das Layout nicht bewegen.**
2. **Die Überlagerung über den ganzen Dialog** — sie deckte „Speichern" mit ab.
   Ein Tipp dort war wirkungslos: ein toter Knopf, den man sieht. Sie deckt
   jetzt genau die Liste ab.
3. **`onfocus` öffnete mit.** `focus` feuert beim **Mausdruck**, das Raster
   erscheint also noch **während** des Fingertipps unter dem Finger — und das
   Loslassen landet auf einem Emoji-Knopf darin. Gemessen: der erste Tipp
   suchte ein zufälliges Symbol aus. Es hängt jetzt **nur am Klick**, und der
   feuert erst nach dem Loslassen.

⚠ **DER WÄCHTER MISST SEITDEM DIE BEWEGUNG, NICHT DIE FOLGE:** die angetippte
Zeile muss vor und nach dem Öffnen an derselben Stelle stehen. Ein
Verhaltens-Wächter allein war beim ersten Mal in zwei von drei Läufen grün.

⚠ **UND EIN NEUER WÄCHTER WAR SELBST BLIND.** „Mehrere ganze Reihen hoch"
maß `hoehe >= 3 * knopfhoehe` — legt man das Gitter auf `display:none`, ist
die **Knopfhöhe 0**, und `hoehe >= 0` ist immer wahr. *Ein Maßstab, der selbst
verschwinden kann, misst nichts.* Gefangen hat es die Gegenprobe.
### ⚠ Und die Gegenprobe lief zweier Läufe wegen ins Leere

Zwei Läufe **nebeneinander** teilten sich feste Ablagen unter `/tmp` — sie
haben einander die Quelldatei überschrieben. Gemessen: **15 Fälle „rot aus
falschem Grund"**, und es sah aus wie ein Fehler im Code. Die Ablagen liegen
jetzt **in der Wegwerf-Kopie**.

⚠ **Und ich habe den Rückgabewert einmal von `tail` abgelesen.** Der Aufruf
war `bash tests/gegenprobe_*.sh | tail -28`; gemeldet wurde `exit 0`, während
die Gegenprobe selbst `1` zurückgab. **`| tail` ist zum Lesen da, nicht zum
Urteilen** — dieselbe Falle wie netzweit aufgeschrieben, nur in noch einem
Kostüm. Die Zahl steht in der Schlusszeile, nicht im Rückgabewert der Pipe.

### ⚠ EINE KENNUNG IST KEIN NAME — und ein Rezept ohne Kategorie hatte kein Zuhause (Klaus 2026-09-16)

Zwei Befunde aus einem Durchgang, beide von derselben Sorte: **die Auskunft war
da, nur nicht dort, wo jemand hinsieht.**

**1 · `AFCKT, was ist das?`** Aus einem Import der Schwester-App kamen Kennungen
wie `afckt`, `mock`, `bowle`, `smooth` — und die Ordner-Liste zeigte sie **roh**
an. Der Reiter war da (das war die Reparatur vom Vortag), aber niemand weiß, was
`afckt` sein soll.

⚠ **UND DIE NAMEN LAGEN SCHON IN DER APP.** Die Spore kündigt seit jeher
*„Alkfr. Cocktails, Mocktails, Bowlen, Smoothies & Shakes"* als Gast-Kategorien
an (`guestCategories` in `sbkim/sbkim-init.js`) — eine Liste von **Namen ohne
Kennungen**. Sie half der Oberfläche deshalb nichts. *Zwei Listen derselben
Sache, und die eine kennt die andere nicht.*

**`KAT_FAMILIE`** ist jetzt das Wörterbuch: Kennung → Symbol + Name in 8
Sprachen, **aus den CATS-Blöcken der drei Apps abgeleitet, nicht abgetippt**.
18 Kennungen. Ein eigener Name (`CATS_EIGEN`) gewinnt weiterhin über alles.

⚠ **Eine unbekannte Kennung wird NICHT erfunden.** Steht sie nicht im
Wörterbuch, bleibt sie sichtbar wie sie ist und trägt die Marke `unbekannt`.
*Einen Namen zu raten wäre schlimmer als eine Kennung zu zeigen.*

**2 · Die Sushi, die nur die Suche fand.** Klaus: *„gebe ich oben im Suchfeld
Sushi ein, taucht plötzlich Sushi auf … Sushi taucht immer nicht auf."* Gemessen
im Code, nicht geraten:

| | Befund |
|---|---|
| `catsFremd()` | stieg bei **leerer** Kennung mit `continue` aus |
| die „Alle"-Ansicht | läuft über `catsAlle()` — zeichnete sie also auch nicht |
| der Reiter „Alle" | zählte `R.filter(r=>r.name&&!r.blank)`, also **alle** |

**Die Zahl versprach 52, gezeichnet wurden weniger.** Nicht der Import war
schuld — die Rezepte waren da, gespeichert und exportiert, nur ohne Zuhause.

⚠ **UND EIN ORDNER, DEN ES NICHT MEHR GIBT, IST AUCH KEIN ZUHAUSE.** Eine
Kennung `fld_…` wird übersprungen, weil Ordner ihren eigenen Weg haben — steht
der Ordner aber nicht mehr in `FD`, fällt das Rezept durch dieselbe Lücke.

Sie werden jetzt als **eigene Kategorie** geführt (`KAT_OHNE`, „Ohne
Kategorie"), nicht repariert: **welche Kategorie sie bekommen sollen,
entscheidet Klaus, nicht die App.** Der Reiter erscheint nur, wenn es ihn
braucht — ein Sammel-Reiter, der immer leer dasteht, wäre ein toter Knopf mit
Beschriftung.

### ⚠ Und die drei Apps standen dabei NICHT gleich da

Gemessen am 2026-09-16: **Mein Rezeptbuch trägt alle 18 Familien-Kennungen
selbst** (Essen *und* Getränke), Muttis Rezeptbuch nur die sieben
Essens-Kategorien. Klaus' `afckt`-Befund ist deshalb ein **Muttis**-Befund; in
Mein Rezeptbuch kommt aus dem Mixarium gar nichts als „fremd" an.

**Die Wächter sagen in jeder App, was DORT gilt** — in Mein Rezeptbuch steht als
benannte Grenze, dass das Wörterbuch hier nie feuert, und gemessen wird
stattdessen, dass die eigenen Kategorien die Familie abdecken. *Drei Apps
dieselbe Zusicherung behaupten zu lassen wäre in einer davon eine Lüge.*

### ⚠ ZWEI STELLEN ZÄHLTEN DIESELBE SACHE VERSCHIEDEN (Klaus 2026-09-16)

Klaus mit Bild: *„Sushi steht in den Ordnern mit null Rezepten, obwohl
mindestens sechs drin sind. Oben in der Kategorie-Leiste in dem oberen Bereich
bei Rezepte steht Sushi mit sechs."*

**Beide Zahlen waren richtig gerechnet — sie rechneten nur aus verschiedenen
Quellen:**

| | fragte | Sushi |
|---|---|---|
| Kategorie-Leiste (`renderCatNav`) | `katVonRezept(r)` | **6** |
| Ordner-Baum (`renderFolders`) | das **rohe** Feld `r.cat` | **0** |

⚠ **DAS IST DER PREIS EINER HALBEN UMSTELLUNG.** Am Vortag ist `katVonRezept`
an **drei** Anzeige-Stellen eingesetzt worden (Reiter-Zahl, „Alle", Einzel-
Kategorie) — der Ordner-Baum blieb absichtlich unangetastet, weil er „nur
anzeigt". *Eine Kennung, die an einer Stelle gedeutet und an der anderen roh
gelesen wird, ist zwei verschiedene Kennungen.* Dieselbe Lücke traf auch
**„Ohne Kategorie"**: der Reiter zählte zwei, der Ordner-Eintrag null.

⚠ **UND EINE ZEILE TIEFER DASSELBE NOCH EINMAL.** Die Ordner-Gruppe zählte
`r.folder===…`, die Ordner-Pille `r.folder ODER r.cat==='fld_…'`. Ein Rezept,
das nur über `r.cat` in einem Ordner liegt, fiel im Baum heraus. Zwei Zeilen
untereinander, zwei Wahrheiten.

**Umgestellt sind jetzt alle Zähl- und Zeichen-Stellen**, die eine Kategorie
meinen — Ordner-Baum, Ordner-Zähler im Reiter-Abzeichen, und in Mein Rezeptbuch
zusätzlich die Gruppen des KI-Buchs und die Lieblingsrezept-Auswahl.

⚠ **DER WÄCHTER MISST DIE ÜBEREINSTIMMUNG, NICHT EINE ZAHL.** „Der Ordner zeigt
6" wäre blind, sobald sich die Leiste bewegt. Gemessen wird Gruppe für Gruppe,
dass **beide Ansichten dieselbe Zahl nennen** — plus die Gegenrichtung, dass
überhaupt eine mitgebrachte Kategorie mit Inhalt dabei ist (sonst wären alle
Zahlen 0 und stimmten trivial überein).

### ⚠ EIN ORDNER FRASS DIE KATEGORIE AUF (Klaus 2026-09-16)

Klaus, drei Befunde aus einem Bild: *„das Sushi taucht zweimal auf"* · *„wenn ich
es aufklappe, hat das Sushi Ordner als Emojis"* · *„wenn ich jetzt das Hauptemoji
für die Kategorie ändere, ändern sich die unteren Emojis für die einzelnen
Gerichte nicht."*

**Eine Ursache für alle drei.** Ein Ordner-Umzug schrieb `r.cat='fld_<id>'` —
an **drei** Stellen (Maus-Ablage, Finger auf eine Zeile, Finger auf eine Gruppe).
Das Feld, in dem die Kategorie steht, trug danach eine Ordner-Kennung: das
Gericht hatte **keine Kategorie mehr**, stand im Baum unter Kategorie *und*
Ordner, und kein Kategorie-Symbol konnte es je wieder erreichen.

**Gemessen, nicht geschlossen** (2026-09-16, echter Browser, 3 `r.cat`-Werte ×
2 `r.folder`-Werte × 2 `FD`-Zustände):

| | Befund |
|---|---|
| ein 📁 in einer Rezeptzeile | tritt **ausschließlich** dort auf, wo `r.cat` eine Ordner-Kennung trägt |
| `cat='sushi'` + `folder` gesetzt | Zeile trägt 🍣, Symbolwechsel kommt an |
| `cat='fld_…'` | Zeile trägt 📁, Symbolwechsel kommt **nicht** an |

**Was jetzt gilt: ein Ordner setzt nur noch `r.folder`.** Die Kategorie bleibt
stehen. Dazu drei Folgen, jede mit eigenem Wächter:

- **Wer in einem Ordner liegt, steht im Baum nur dort.** Sonst stünde dasselbe
  Gericht zweimal da — Klaus' erster Befund, nur andersherum.
- **Ein gelöschter Ordner erfindet keine Kategorie.** `deleteFolder` setzte
  `r.cat='fleisch'` für **jedes** Rezept des Ordners, auch für die mit eigener
  Kategorie. Aufgelöst wird jetzt nur der Ordner.
- **Die Anlage-Maske hat zwei Felder, und der Ordner überstimmt das
  Kategorie-Feld nicht mehr.** Wer einen Ordner wählte, bekam ein Rezept ohne
  Kategorie, ohne dass es irgendwo stand.

⚠ **ALTBESTAND WIRD NICHT GERATEN.** Ein `fld_…` in `r.cat` ist der Rest des
alten Weges, keine Kategorie. Beim Umzug wird es geleert und landet sichtbar
unter **„Ohne Kategorie"** — welche es sein soll, entscheidet der Nutzer.
**Klaus' sechs Sushi-Gerichte heilt das nicht von allein**; ihre Kategorie ist
schon weg. Der Weg von Hand: im Ordner-Baum auf eine **Kategorie**-Gruppe ziehen
(setzt die Kategorie, holt es aus dem Ordner), dann zurück auf den **Ordner**
ziehen — der lässt die Kategorie jetzt stehen.

⚠ **TAFEL-EVOLUTIONS-KLAUSEL, AUSDRÜCKLICH BENANNT.** Wächter 13 hieß seit dem
Vortag *„jede Gruppe zeigt in BEIDEN Ansichten dieselbe Zahl"*. Das war richtig,
solange ein Ordner die Kategorie auffraß — dann hatte ein Rezept entweder das
eine oder das andere. Jetzt hat es **beides**, und die zwei Ansichten beantworten
zwei Fragen:

| | fragt |
|---|---|
| Kategorie-Leiste | „wie viele Rezepte **haben** diese Kategorie?" — die in Ordnern zählen mit |
| Ordner-Baum | „was liegt **hier**?" — jedes Rezept steht genau einmal |

Gemessen wird deshalb **`Leiste = Baum + die, die in einem Ordner liegen`** —
der Unterschied wird ausgerechnet, nicht weggelassen.

⚠ **UND EIN NEUER WÄCHTER WAR BEIM ERSTEN LAUF SELBST BLIND.** „Das Abzeichen
zählt genau die Gruppen mit Inhalt" schob **ein** Rezept in einen Ordner — die
Kategorie hatte aber noch ein zweites draußen und zählte deshalb so oder so mit.
Gefangen hat es die Gegenprobe, nicht das Nachdenken. *Ein Fall, in dem beide
Fassungen dieselbe Zahl ergeben, misst nichts.*

⚠ **Ein zweiter hing an einem festgenagelten Zeichen:** „die Zeile trägt 🍣" war
rot, **ohne dass eine Zusicherung gefallen wäre** — ein früherer Abschnitt der
Probe hatte der Kategorie längst ein eigenes Symbol gegeben. Verglichen wird
jetzt gegen das Symbol, das die Kategorie **wirklich** trägt.

### ⚠ UND DIE WURZEL LAG IM IMPORT, NICHT IM VERSCHIEBEN (Klaus 2026-09-16)

Klaus, nach dem Sichttest: *„oben in der Navi-Leiste steht Sushi mit 7, im
Ordner aber nur mit 1"* · *„da steht auch Sushi zweimal drin"* · *„wenn keine
[Kategorie] da ist, soll eine erstellt werden — aber das sollte es schon
geben."*

**Der Verdacht vom selben Tag war zu eng.** Die Trennung von Ordner und
Kategorie hat das Verschieben von Hand repariert; entstanden sind Klaus' sechs
Gerichte ohne Kategorie aber woanders. **Gemessen im Code:**

| Stelle | was sie tat |
|---|---|
| `_showCatMapDialog` | schlug für **jede** unbekannte Kategorie „📁 als eigener Ordner" vor — **vorausgewählt** |
| `_applyCatMapping` | schrieb daraufhin `r.cat = 'fld_<id>'` — die Kategorie war weg |
| `_normalizeRecs` | machte aus **jeder** unbekannten Kennung `'fleisch'` |

**Daraus folgte alles Übrige:** das Gericht trug im Ordner 📁 statt seines
Kategorie-Symbols · ein Symbolwechsel erreichte es nicht mehr · und in der
Leiste standen **die alte Kategorie und der neue Ordner nebeneinander**, zweimal
derselbe Name.

**Klaus' eigener Satz weist darauf:** *„Avocado-Rolls habe ich ständig
verschoben und das hat ein funktionierendes Emoji-Tauschen."* Das von Hand
verschobene Rezept ist heil, die sechs unangetasteten sind es nicht — sie kamen
aus einer Datei.

⚠ **`_normalizeRecs` war die Abhilfe aus der Zeit VOR dem Fremd-Reiter.** Seit
dem 2026-09-15 bekommt jede unbekannte Kennung über `catsFremd()` einen eigenen
Reiter — die Kategorie **entsteht also von selbst**, und diese Zeile hat sie
jedes Mal vorher weggeworfen. Ersetzt, nicht stillschweigend gestrichen.

### Was jetzt gilt

| | vorher | nachher |
|---|---|---|
| unbekannte Kategorie beim Import | Vorgabe **„als eigener Ordner"** | Vorgabe **„als eigene Kategorie behalten"** |
| „in einen Ordner" gewählt | `r.cat` → `fld_…`, Kategorie weg | `r.folder` gesetzt, **Kategorie bleibt** |
| unbekannte Kennung | wurde zu `fleisch` | **bleibt** und bekommt ihren Reiter |
| Ordner-Bildschirm | „Sushi · 1 Rezept" | „Sushi · 1 Rezept **· +6 in Ordnern**" |

Die letzte Zeile ist die Antwort auf „7 gegen 1": **beide Zahlen waren richtig
gerechnet**, der Unterschied stand nur nirgends. Er wird jetzt danebengeschrieben,
statt die Doppelung im Baum zurückzuholen.

⚠ **UND DIE GEGENPROBE KONNTE EINEN TOTEN ANKER NICHT MELDEN.** Ihre
Anker-Prüfung schrieb `io.open('"$ANKERFEHL"', ...)` — in einem **zitierten**
Heredoc (`<<'PY'`) wird nichts ersetzt, also entstand eine Datei, die
**wörtlich so hieß**, und `[ -f "$ANKERFEHL" ]` traf nie zu. Folge: ein toter
Anker meldete sich als **„NICHT GEFANGEN"**, also als blinder Wächter.

**Gemessen am 2026-09-16 an zwei Fällen, deren Zeile ich selbst verschoben
hatte** — gemeldet wurden 3 durchgerutschte, davon waren **zwei tote Anker**.
Genau die Verwechslung, vor der Sages Tafel warnt: *eine grün gebliebene
Gegenprobe hat zwei mögliche Ursachen, die das Gegenteil voneinander verlangen*
(„bau einen Wächter" gegen „zieh den Fall nach"). Der Pfad kommt jetzt aus der
Umgebung.

⚠ **Und der dritte war wirklich blind — eine Sabotage, die nichts ändert, was
der Wächter SIEHT.** Sie entfernte `selected` von der ersten Option; ein
`<select>` **ohne** `selected` wählt aber ohnehin den ersten Eintrag. Getauscht
wird jetzt die Reihenfolge.

### Geprüft

```bash
node tests/smoke_kategorien.mjs        # echter Browser, an der GEBAUTEN index.html
bash tests/gegenprobe_kategorien.sh    # Wegwerf-Kopie, MIT Bau-Schritt
```

### ⚠ `T(k)` FÄLLT NICHT ZURÜCK — ES GIBT DEN SCHLÜSSEL HERAUS (Klaus 2026-09-16)

Klaus im Bild: auf dem Ordner-Bildschirm stand **„1 Rezepte · +6
fldInOrdnern"** — der Schlüsselname statt des Wortes.

```js
function T(k){ return (LANGS[CL]||LANGS.de)[k] || k; }
```

Bei einem **fehlenden** Schlüssel gibt `T(k)` den **Schlüssel zurück**, also
immer etwas Wahres. Ein `T('x') || 'Rückfall'` dahinter kann deshalb **nie**
greifen — der Rückfall sah aus wie eine Absicherung und war keine.

**Dieselbe Familie wie `a ?? b` bei `null` und `${X:-vorgabe}` bei leerem X:**
ein Ausdruck, den die Schnittstelle anders deutet als der Schreibende. *Der
Prüfstein bleibt: schreib hin, was du meinst.*

⚠ **DER WÄCHTER MISST DIE FAMILIE, NICHT DEN EINZELFALL.** Er sammelt jeden
`T('…')` aus dem Quelltext und besteht darauf, dass der Schlüssel in `LANGS.de`
steht. **Beim ersten Lauf hat er sofort fünf weitere gefunden** —
`catmapAsFolder`, `catmapTitle`, `catmapSub`, `catmapOk`, `catmapSkip`,
allesamt im Zuordnungs-Dialog beim Import, der deshalb seit längerem
Schlüsselnamen anzeigte. Alle in acht Sprachen nachgetragen, dazu `catmapKeep`.
Gemessen: **207 benutzte Schlüssel, alle vorhanden.**

⚠ **Und der Wächter auf die Ordner-Zeile fragte nur nach der ZAHL** („+2") und
war für das Wort daneben blind. **Gefunden hat es Klaus' Bild, keine Probe.**

⚠ **ZWEI TOTE ANKER IM SELBEN LAUF — und diesmal hat die Gegenprobe es gesagt.**
Beide zeigten auf Zeilen, die ich eine Stunde vorher selbst geändert hatte. Die
am selben Tag reparierte Anker-Prüfung meldete sie **als tot** statt als blinde
Wächter; vorher hätte dieselbe Lage „NICHT GEFANGEN" gemeldet und in die
falsche Richtung gewiesen.

⚠ **BENANNTE GRENZE:** für „der Schlüssel-Sammler findet überhaupt etwas" steht
**kein** Gegenprobe-Fall. Um ihn leerlaufen zu lassen, müsste eine Sabotage
**alle** `T('…')`-Aufrufe auf doppelte Anführungszeichen umstellen — `fall`
ersetzt aber nur die erste Fundstelle. Mein erster Anlauf tauschte die
**Definition** von `T()` aus; der Sammler liest die **Aufrufe**, und die blieben
unverändert, also rutschte der Fall zu Recht durch. Gedeckt ist die Zusicherung
trotzdem: der Haupt-Wächter verlangt ausdrücklich `gesamt > 20` und fällt damit
mit aus. *Ein Fall, der nichts messen kann, sähe wie Deckung aus.*

Zuletzt gemessen (2026-09-16, nach der Schlüssel-Reparatur): **67 grün · 0 ROT**
(207 Schlüssel geprüft) · Gegenprobe **44 gefangen · 0 durchgerutscht · 0 aus
falschem Grund · 0 tote Anker**.

⚠ **DIE ZAHL DAVOR BLEIBT DANEBEN STEHEN, weil sie den Fund gemacht hat:**
derselbe Lauf meldete zuerst **39 gefangen · 3 durchgerutscht**. Zwei der drei
waren tote Anker (Zeilen, die ich selbst verschoben hatte), einer ein wirklich
blinder Wächter. Nur die zweite Zahl zu nennen hiesse, den Befund durch seine
Reparatur zu ersetzen.

⚠ **Die Gegenprobe baut zwischen Sabotage und Messung neu.** Ohne
`python3 build.py` misst sie die alte `index.html`, und jeder Fall wäre „nicht
gefangen".

### ⚠ EINE KENNUNG MUSS GENAU EINMAL VORKOMMEN — zwei „Sushi" waren zwei Reiter (Klaus 2026-09-16)

Klaus mit Bild: *„oben sind zwei Kategorien Sushi selektiert. Also bei der
Arbeit, die du jetzt gemacht hast, passiert genau das. Oben zwei selektiert,
obwohl ich nur eine angeklickt habe."*

**Das war keine Anzeigefrage, sondern eine Rechenfrage.** Eine Pille trägt
`on` genau dann, wenn `CAT===c.id`. Standen **zwei** Einträge mit derselben
Kennung in der Liste, markierte ein Tipp folgerichtig **beide** — sie sind
für die App dieselbe Kategorie. `catsAlle()` hängte `CATS`, `CATS_NEU` und
`catsFremd()` aneinander, **ohne zu prüfen, ob eine Kennung schon dabei war.**

**Was jetzt gilt: `catsAlle()` gibt jede Kennung genau einmal heraus**, die
erste gewinnt. Das ist kein Filter auf der Anzeige, sondern eine Zusicherung
an der Quelle — jede Zähl- und Zeichen-Stelle liest dieselbe Liste.

⚠ **UND DIE KENNUNG IST JETZT ZU SEHEN.** Zwei Kategorien dürfen denselben
**Namen** tragen; sie zu unterscheiden war bisher unmöglich. Der
Umbenennen-Dialog zeigt neben jedem Namen die Kennung **mit ihrer
Zeichenzahl** (`"sushi" ·5`) — ohne die Zahl sehen `"sushi"` und `"sushi "`
gleich aus, und genau so entstehen zwei Einträge, die keiner auseinanderhält.

### Kategorien löschen, zusammenlegen, neu anlegen (Klaus 2026-09-16)

*„Kategorie löschen und zusammenlegen bauen."* Der Weg: 📂 **Ordner** →
**✎ Kategorien umbenennen** → 🗑 an einer Zeile bzw. **＋ Neue Kategorie**.

Löschen fragt **immer** nach dem Ziel, denn eine Kategorie zu entfernen heißt,
ihre Rezepte umzuhängen. Drei Antworten, und sie sind **drei**, nicht zwei:

| Wahl | was mit `r.cat` geschieht |
|---|---|
| eine andere Kategorie | trägt deren Kennung |
| **ausdrücklich ohne** (`''`) | leer — landet sichtbar unter „Ohne Kategorie" |
| **es war nichts zu verschieben** (`null`) | gar nichts, die Kategorie war leer |

⚠ **`null` und `''` AUSEINANDERZUHALTEN IST DER GANZE PUNKT.** Wer beides als
„leer" liest, meldet dem Nutzer ein Umhängen, das nie stattfand — dieselbe
Familie wie `${X:-vorgabe}` bei leerem X. *Schreib hin, was du meinst.*

**Eine feste Kategorie verschwindet über `CATS_AUS` (`mrzcatsaus9m`), und
nur solange sie leer ist.** `katAnzahl(id)===0` wird bei jedem `catsAlle()`
neu gerechnet: kommt wieder ein Rezept hinein, ist der Reiter von selbst
zurück. Ein Riegel, der eine Kategorie mit Inhalt verschwinden ließe, wäre
ein stiller Datenverlust.

⚠ **UND EIN WÄCHTER DAZU WAR BLIND — er löschte eine FREMDE Kategorie.** Die
verschwindet ohnehin, sobald kein Rezept mehr auf sie zeigt; der `CATS_AUS`-
Riegel wurde dabei **nie gemessen**. Gemessen wird jetzt an einer **festen**
Kategorie, die nur dieser Riegel wegnehmen kann.

⚠ **UND `＋ Neue Kategorie` SETZTE DEN FINGER IN EINE FREMDE ZEILE.** Es
fokussierte „die letzte" — `catsAlle()` hängt die mitgebrachten aber **hinter**
die eigenen, also stand der Cursor im Namensfeld einer fremden Kategorie.
Gesucht wird jetzt **nach der Kennung** der neu angelegten Zeile. Gefunden hat
es ein Wächter, nicht das Nachdenken.

### ⚠ EINE PROBE, DIE WIRFT, IST ROT — NICHT EIN TOTER LAUF

`page.click` auf ein `[data-kid="sushi"]`, das nicht da ist, wartete 30 s und
warf. Die Probe starb **ohne ihre Schlusszeile**, und die Gegenprobe urteilt an
den roten Zeilen — ein Absturz sah damit aus wie ein blinder Wächter, und man
suchte am falschen Ende. Kimhubs Lehre vom 2026-08-24, an einer anderen Tür.

Ein Absturz-Fänger (`unhandledRejection`/`uncaughtException`) zählt jetzt ein
ROT, schließt Browser und Server und **druckt die Schlusszeile**.
`process.exit()` ist dabei tabu: es wirft den stdout-Puffer weg.

⚠ **UND EINE SABOTAGE DARF DIE VORBEDINGUNG NICHT TREFFEN.** Der Fall
„catsFremd findet nichts mehr" ersetzte den **Rückgabewert** der Funktion
durch eine leere Liste — das nimmt den Sammel-Reiter „Ohne Kategorie" mit,
`renderCatNav` zeichnet gar keine Pille, und die Probe stirbt an ihrem
**Wartepunkt**, bevor ein Wächter seine rote Zeile drucken konnte. Rot war es
beides Mal; nur trug die rote Zeile den falschen Namen. Übersprungen wird
jetzt genau das Mitgebrachte. *Eine Sabotage muss treffen, was der Wächter
misst — und die rote Zeile muss den Namen der Zusicherung tragen.*

### Geprüft

Zuletzt gemessen (2026-09-16, nach dem Löschen/Zusammenlegen): **87 grün ·
0 ROT** · Gegenprobe **55 gefangen · 0 durchgerutscht · 0 aus falschem Grund ·
0 tote Anker**. Beide Rückgabewerte **direkt** gelesen, nicht hinter einer Pipe.

⚠ **Die Zahl davor bleibt daneben stehen, weil sie den Fund gemacht hat:**
derselbe Lauf meldete zuerst **54 gefangen · 1 aus falschem Grund**. Der eine
war kein Fehler im Code, sondern eine Sabotage, die die Vorbedingung traf —
siehe oben.

### 🏷️ KATEGORIE ZUORDNEN AUS DER REZEPTZEILE (Klaus 2026-09-16)

Klaus: *„links neben dem Papierkorb da noch einen reinmachen, zu einer
anderen Kategorie zuordnen … dann geht eine Leiste auf und ich kann wählen"*
· *„ich kann eine neue Kategorie anlegen, direkt aus dem Rezeptbuch. Und es
wandelt dahin."*

Das **🏷️** steht links neben dem Papierkorb. Die Auswahl trägt alle
Kategorien (die aktuelle mit ✓), darunter abgesetzt **„ohne Kategorie"** als
Weg zurück und **＋ Neue Kategorie**: Namen tippen, fertig — die Kategorie
entsteht **und** das Rezept ist im selben Griff dort.

**Gesetzt wird NUR `r.cat`.** Der Ordner bleibt, wo er ist — die Trennung vom
selben Tag. Ein `fld_…`-Altbestand in `r.cat` wird dabei **ersetzt**, nicht
danebengelegt.

⚠ **DER TRICK FUNKTIONIERT, UND ZWAR OHNE ZUTUN.** Klaus: *„dann müsste auch
der Ordner-Button sich in Fisch umwandeln, so wie es bei den anderen auch
passiert."* Leiste, Ordner-Baum und Zeilen-Symbol lesen **alle**
`katVonRezept(r)` — dieselbe Quelle. Wer umhängt, sieht es überall sofort,
und der Weg zurück ebenso.

⚠ **„KOMPLETT" GEHT SCHON — an einer anderen Stelle.** Eine **ganze**
Kategorie hängt 📂 Ordner → ✎ Kategorien umbenennen → 🗑 → Ziel wählen um.
Der neue Knopf ist für **einzelne** Rezepte. Beides zu haben ist kein
Widerspruch: das eine ist ein Handgriff, das andere eine Entscheidung über
alle.

⚠ **EINE QUELLE FÜR ZWEI WEGE.** Eine Kategorie entsteht jetzt an **zwei**
Stellen. Das Anlegen liegt deshalb in `katAnlegen(name)`, und der
Umbenennen-Dialog ruft es auf. Zwei Fassungen ergäben zwei Kennungs-Formate
— und der „eine Kennung kommt genau einmal vor"-Riegel hätte zwei Sorten zu
prüfen.

### ⚠ Sechs eigene Fehler, alle im PRÜFWERKZEUG — keiner im Code

Das ist der Befund dieses Durchgangs, und er gehört so aufgeschrieben: **der
Code stand nach dem ersten Bau; sechsmal falsch war die Messung.**

| Was | warum es nichts (oder das Falsche) mass |
|---|---|
| **eine genagelte Zahl** — „die Leiste zeigt 2" | ich hatte falsch gezählt. Gemessen wird jetzt die **Übereinstimmung** zwischen Leiste und Bestand. *Eine Zahl in einer Prüfung ist kein Vertrag.* |
| **ein toter Selektor** — `.cpill[data-cid="fleisch"]` | die Pille trägt **kein** `data-cid`, sie hängt an ihrem `setCAT('…')`. Der Wächter meldete −1, also „zieht nicht nach", während sie nachzog — **rot aus dem falschen Grund, im Wächter** |
| **die Reihenfolge im DOM statt der sichtbaren Lage** | `.rcard-acts` ist ein Flex-Container: ein `order:9` schöbe den Knopf ans Ende, und zwei Indizes blieben grün. Gemessen wird jetzt, **was man sieht** |
| **zwei Fälle brachten die Probe zum STOLPERN** | ohne den „ohne Namen"-Riegel schliesst sich das Popup, der nächste Zugriff aufs Feld warf. Beide Fälle schlugen sauber zu und meldeten sich als **„rot aus falschem Grund"** — die rote Zeile trug den Absturz statt den Namen ihrer Zusicherung |
| **zwei Riegel deckten einander** | die Auswahl schiebt die Karte nur, wenn sie **in** ihr hängt **und** im Fluss steht. `position:fixed` allein hält sie draussen, `document.body` allein auch. Die Sabotage nimmt jetzt beide — dieselbe Lehre wie `umask`+`chmod` |
| **der Bewegungs-Wächter mass die ERSTE Karte** | die bewegt sich nie: hängt die Auswahl in ihrer Knopfzeile, wächst die Karte nach **unten**, ihr `top` bleibt stehen. Gemessen werden jetzt der **angetippte Knopf** und die Karte **darunter** — was der Finger erlebt |

⚠ **UND EIN ANKER, DER ZWEIMAL TRIFFT, IST KEIN ANKER.**
`document.body.appendChild(pop)` steht auch im Bild-Popup.

### ✅ `NUR_ANKER=1` — tote Anker in Sekunden statt nach neun Minuten

```bash
NUR_ANKER=1 bash tests/gegenprobe_kategorien.sh
```

Fährt **keine** Probe, sondern prüft nur, ob jeder Anker **genau einmal**
trifft. Ein toter Anker fiel bisher erst nach einem vollen Lauf auf — die
Regel *„wer eine Zeile ändert, auf die ein Fall zeigt, zieht den Fall mit"*
steht in dieser Datei und wurde am selben Tag zweimal verletzt. **Eine Regel,
an die man sich erinnern muss, ist keine.** (Kimhub hat denselben Gang; hier
fehlte er.) In dieser einen Sitzung hat er **dreimal** zugeschlagen.

### ⚠ UND DAS AUSWAHL-FENSTER MACHTE SICH SELBST WIEDER ZU (Klaus 2026-09-16)

Klaus am Tablet: *„wenn ich anklicke plus Kategorie, geht kein Feld auf, wie
ich das benennen kann."*

**＋ Neue Kategorie tauscht den Inhalt des Fensters** gegen das Namensfeld.
Danach feuert der „Tipp daneben"-Riegel, sucht den geklickten Knopf **darin**
— und findet ihn nicht mehr, weil er gerade ersetzt wurde. Er hielt das für
einen Tipp nach draußen und schloss. Für Klaus sah es aus, als täte der Knopf
nichts.

⚠ **WORTGLEICH DIESELBE FALLE WIE DIE EMOJI-AUSWAHL AM 2026-09-15**, nur mit
einem anderen Auslöser: dort verschob `scrollIntoView` das Feld unter dem
Finger, hier verschwindet das Ziel aus dem Dokument. *Ein Auswahl-Feld, das
sich selbst wieder zumacht* — zum zweiten Mal in zwei Tagen.

**Repariert wird die URSACHE, nicht der eine Knopf:**

```js
if(!document.contains(e.target))return;   // gerade ersetzt ≠ Tipp nach draußen
```

Jeder künftige Knopf, der den Inhalt ersetzt, ist damit mitgedeckt. *Ein
Riegel am Einzelfall ist morgen am Nachbarn blind.*

### ⚠ UND DIE PROBE WAR DAFÜR BLIND, WEIL SIE SYNCHRON KLICKT

Das ist der Befund, der über diesen Fall hinausreicht. Der Riegel hängt an
einem **`setTimeout(…,0)`**. Klickt eine Probe alles in **einem** Durchgang,
läuft dazwischen kein Timer — der Riegel ist nie registriert, und die Probe
misst eine App, die es so nicht gibt.

| | gemessen am 2026-09-16, **unveränderter Code** |
|---|---|
| Probe klickt synchron | **grün** |
| Probe mit `await tick()` zwischen den Klicks | **ROT** — Klaus' Befund |

**Ein Finger ist langsamer als ein Skript.** Wer eine Bedienung prüft, deren
Code mit `setTimeout`, `requestIdleCallback` oder `requestAnimationFrame`
arbeitet, lässt zwischen den Griffen einen Tick verstreichen — sonst prüft er
den halb aufgebauten Zustand. Erst rot bekommen, dann reparieren.

⚠ **Und fehlt das Feld, wird GEMELDET statt geworfen.** Vorher starb die Probe
am Zugriff auf `null`, und der Fall meldete sich als „rot aus falschem Grund".
Jetzt fallen **sechs** Wächter einzeln, jeder mit seinem Namen in der roten
Zeile.

### Geprüft

Zuletzt gemessen (2026-09-16, nach dem Zuordnen-Knopf): **109 grün · 0 ROT**
· Gegenprobe **66 gefangen · 0 durchgerutscht · 0 aus falschem Grund · 0 tote
Anker**. Beide Rückgabewerte **direkt** gelesen, nicht hinter einer Pipe;
der Baum war vor und nach dem Lauf sauber.

⚠ **Die Zahlen davor bleiben daneben stehen, weil sie die Funde gemacht
haben:** derselbe Durchgang meldete nacheinander **61/1/2**, dann **64/1**.
Nur die letzte zu nennen hiesse, die Befunde durch ihre Reparatur zu
ersetzen.

### ⚠ EIN ORDNER, DEN ES NICHT GIBT, IST KEIN ORDNER (Klaus 2026-09-16)

Klaus am Tablet: *„sie werden immer nur innerhalb eines Ordners verschoben …
als wenn sie in einem eigenen Ordner wären. Und dieser Ordner lässt sich nicht
umbenennen, also lässt sich auch nicht zuordnen, sondern bleibt ein
**unsichtbarer Ordner**."*

**Sein Wort war genau richtig.** Seine sechs KI-erfassten Sushi-Rollen tragen
in `r.folder` eine Kennung, die in `FD` **nicht steht**. Daraus folgt beides,
was er sieht:

| | |
|---|---|
| die Kategorie-Gruppe im Baum | fragt `!r.folder` — sie **fallen heraus** |
| ein Ordner-Eintrag | **gibt es nicht**, der Ordner steht ja nicht in `FD` |
| übrig bleibt | nur die Zahl **„+6 in Ordnern"** |

Ein Ordner, den man nicht öffnen, nicht umbenennen und nicht auflösen kann.

⚠ **DIESELBE LÜCKE WIE AM VORTAG, NUR AM ANDEREN FELD.** Für `r.cat='fld_…'`
ist sie mit `katVonRezept` geschlossen worden; **`r.folder` blieb roh.** *Ein
rohes Feld zu lesen, wo eine Deutung gemeint ist, macht aus einer Kennung zwei
verschiedene* — die Lehre stand seit einem Tag in dieser Datei und traf am
nächsten das Nachbarfeld.

`ordnerVonRezept(r)` ist das Gegenstück: es gibt den Ordner **nur** zurück,
wenn es ihn in `FD` wirklich gibt. Eingesetzt an den **vier** Anzeige-Stellen,
die „liegt es in einem Ordner?" fragen.

⚠ **UND EIN ZWEITER FEHLER KAM DABEI HERAUS.** `katZuSetzen` zeichnete die
Rezeptliste neu, aber **nicht den Ordner-Baum** — wer von dort kam, sah seine
Änderung nicht. Gefunden hat es ein Wächter, nicht das Nachdenken.

**Erst die Probe rot bekommen (drei Wächter), dann repariert.**

⚠ **ZUM ZWEITEN MAL AN EINEM TAG EIN TOTER SELEKTOR IM WÄCHTER.** Die Zeile im
Baum heißt `.fld-rrow`, nicht `.fld-rec`; der Wächter meldete „steht nicht im
Baum", während es dastand. Beim ersten Mal war es `.cpill[data-cid]`.
*Ein Selektor, der ins Leere greift, misst nicht, was er zu messen glaubt* —
und er meldet in die **falsche** Richtung.

⚠ **UND DREI ÄLTERE FÄLLE ZEIGTEN AUF ZEILEN, DIE DIESE ÄNDERUNG BEWEGT HAT.**
Der `NUR_ANKER`-Gang hat sie in **Sekunden** gemeldet — zum vierten Mal an
diesem Tag. Ohne ihn wären es drei „NICHT GEFANGEN" nach neun Minuten gewesen,
und die weisen in die entgegengesetzte Richtung („bau einen Wächter" statt
„zieh den Fall nach").

### Was Klaus dabei gefragt hat — und die Antwort

*„Wenn ich ein Rezept einer anderen Kategorie zuordne, muss die Kennung
angepasst werden? … sonst weist die Kennung auf seinen Ursprung, aber nicht
auf das, was er jetzt ist."*

**Drei Dinge, die man auseinanderhalten muss:**

| | ändert sich beim Zuordnen? |
|---|---|
| **`r.id`** — die Kennung des Rezepts | **nein**, sie gehört dem Rezept |
| **`r.cat`** — auf welche Kategorie es zeigt | **ja, sie wird überschrieben** |
| **`c.id`** — die Kennung der Kategorie | **nein**, sie gehört der Kategorie |

Seine Sorge trifft also nicht zu: `r.cat` wird wirklich ersetzt, nichts weist
danach auf den Ursprung. Ein Rezept lässt sich beliebig oft umhängen.

### Geprüft

Zuletzt gemessen (2026-09-16, nach `ordnerVonRezept`): **113 grün · 0 ROT** ·
Gegenprobe **70 gefangen · 0 durchgerutscht · 0 aus falschem Grund · 0 tote
Anker**. Beide Rückgabewerte **direkt** gelesen; der Baum war vor und nach dem
Lauf sauber.

---

## 🔀 GANZE KATEGORIEN VERSCHIEBEN — Leiste und Ordner-Baum (Klaus 2026-09-16)

Klaus mit Bild: *„Die Kategorien müssen sich per Drag and Drop verschieben
lassen, sowohl in Rezepte als auch in den Ordnern. Also sind sie zugeklappt,
müssen sich ganze Kategorien verschieben lassen."* Der Grund stand daneben:
*„dass Sushi plötzlich zwischen den Getränken aufgetaucht ist. Also zwischen
den Cocktails und den Mocktails."*

**Der Weg:** eine Pille in der Reiter-Leiste oder der Anfasser links in der
Gruppen-Kopfzeile des Ordner-Baums — **Maus ziehen, Finger lang drücken und
ziehen**. Ein Strich zeigt, wohin es fällt; links/oben heißt davor,
rechts/unten dahinter. Die Folge steht in `mrzcatord9m` und überlebt das Neuladen.

⚠ **Der Speicher-Schlüssel ist app-eigen** — Muttis Rezeptbuch (`mrzcatord9`) bleibt leer. Alle drei
Apps liegen auf derselben `github.io`-Adresse; eine Probe besteht darauf.

⚠ **Ein Ordner geht diesen Weg NICHT.** Ordner stehen in `FD` und haben ihre
eigene Reihenfolge; beide in eine Liste zu schreiben hieße, zwei Ordnungen
übereinanderzulegen. „Alle" ebenso wenig — das ist eine **Ansicht**, kein Thema.

⚠ **Die Liste wird vollständig neu geschrieben, nicht ergänzt.** Eine Teil-Liste
hätte Lücken: alle Nicht-Genannten sprängen ans Ende, und ein Zug hätte die
ganze Ordnung umgeworfen. Eine Kategorie, die (noch) nicht darin steht, behält
ihren Platz — gemessen, nicht behauptet.

### ⚠ Vier echte Fehler, und KEINEN hat das Nachdenken gefunden

| Was | Wie es sich zeigte |
|---|---|
| **`renderCatNav` verliert die Finger-Griffe** | `el.innerHTML` wirft die Pillen weg, samt ihrer `touchstart`-Anmeldung. `renderCatNav()` wird an einem Dutzend Stellen **allein** gerufen — auch von `katUmsortieren` selbst: **nach dem ersten Verschieben mit dem Finger ließ sich nichts mehr verschieben.** Der Maus-Weg blieb dabei grün, weil `draggable` im Markup steht |
| **`.fld-grp-hd` gibt es nicht** — die Kopfzeile heißt `.fld-hdr` | der Rückfall `\|\|el` machte das Schattenbild zum **22 px breiten Anfasser**: man zog, ohne zu sehen WAS. Mein eigener Kommentar daneben hatte genau davor gewarnt |
| **`katZiehEnde()` löscht `_katWohin`, bevor es gelesen wird** | in `pillDrop` **und** `fldGrpDrop`. „nach" fiel damit immer auf „vor" zurück — **die Richtung gab es gar nicht** |
| **eine überflüssige Zeile, die wie ein Riegel aussah** | `katZiehMarkenWeg()` in `_tddEnd`: `_tddMove` räumt die Marken bei jeder Bewegung schon weg, und ein Treffer zeichnet ohnehin neu. *Ein Riegel, den keine Probe von seinem Fehlen unterscheiden kann, ist eine Behauptung* — er ist raus |

### ⚠ Und FÜNF eigene Wächter waren dabei blind — alle von der Gegenprobe entlarvt

Das ist der Befund dieses Durchgangs: **der Code stand nach wenigen Anläufen;
fünfmal falsch war die Messung.** Gefunden hat sie kein Nachdenken, sondern der
volle Lauf und das Nachstellen von Hand.

| Wächter | warum er nichts maß |
|---|---|
| „ein ORDNER bekommt keinen Anfasser" | **es gab gar keinen Ordner.** `.some(…)` über eine leere Liste ist immer falsch. Jetzt wird der Ordner gestellt — und dass es ihn gibt, eigens gemessen |
| „die Leiste verliert beim Neuzeichnen ihre Griffe" | vor der Messung lief `showSc`, und das meldet über `render()` die Griffe wieder an. Zuletzt wird jetzt `renderCatNav()` **allein** gerufen — genau so, wie `katUmsortieren` es tut |
| „ein Strich zeigt im Baum, wohin es fällt" | `.fld-grp` trägt **schon** einen Schatten; „nicht `none`" ist dort immer wahr. Gemessen wird jetzt der **Unterschied** zur ungezogenen Gruppe |
| „kein Strich bleibt stehen" | bei einem Treffer zeichnet `katUmsortieren` ohnehin neu. Gemessen wird jetzt das **Weiterziehen**, wo nur das Aufräumen in `_tddMove` greift |
| „„Alle" ist nicht ziehbar" | hing an **einer Zahl** („genau eine Pille ohne Kennung"). Sobald ein Ordner dazukam, war sie zwei — rot, ohne dass eine Zusicherung gefallen wäre. *Eine Zahl in einer Prüfung ist kein Vertrag* |

⚠ **Zwei der Gegenprobe-FÄLLE waren selbst falsch**, und beide sind bekannte
Sorten: einer wies `out` neu zu — **`out` ist `const`**, also meldete er einen
Absturz statt der Zusicherung; einer suchte „fa**e**llt", während die rote Zeile
„fällt" trägt. *Eine Sabotage muss treffen, was der Wächter misst — und die rote
Zeile muss den Namen der Zusicherung tragen.*

### ⚠ Und der Finger-Wächter griff zuerst neben den Schirm

Beim ersten Lauf stand die Leiste bei **`top −541`** (ein früherer Abschnitt
hatte die Seite heruntergescrollt) und die letzte Pille bei **`left 1464`** von
1280 — `elementFromPoint` gab dort `null` zurück, und der Wächter meldete „kein
Strich", als wäre der Code kaputt. Die Ausgangslage wird jetzt **gesetzt statt
vorgefunden**, die Griffe kommen aus den wirklich sichtbaren Pillen, und ein
**Selbst-Riegel** daneben besteht darauf: liegen sie nicht auf dem Schirm, hat
der ganze Abschnitt nichts gemessen. *Ein Fall, der nichts messen kann, sähe
sonst wie eine bestandene Prüfung aus.*

⚠ **BENANNTE GRENZE:** für „ein kurzer Tipp zieht NICHT" steht **kein**
Gegenprobe-Fall. Der Riegel ist die Uhr selbst — ohne abgelaufenen Langdruck
gibt es kein Schattenbild, und keine Sabotage an einer einzelnen Zeile kann
eines im selben Tick erzeugen.

## 🪣 DER SAMMEL-EIMER TRÄGT SEINEN EIGENEN NAMEN — auch beim Zuordnen (Klaus 2026-09-16)

Klaus: *„und bei Kategorie zuordnen aus den Rezepten erscheint die Kategorie
Sushi nicht."*

**Sie erschien sehr wohl — nur unter zwei verschiedenen Namen.** Die Zeile im
Zuordnen-Fenster nahm den fest verdrahteten Text `T('katZuOhne')` („ohne
Kategorie"), während Leiste und Ordner-Baum `katBeschriftung(c)` lesen. Klaus
hatte den Sammel-Eimer `__ohne` auf **„Sushi"** umbenannt — seine eigene
Aufnahme des Umbenennen-Dialogs zeigt „Sushi" mit der Kennung `"__ohne"`.

*Dieselbe Sorte wie „zwei Stellen zählten dieselbe Sache verschieden", nur am
**Namen** statt an der Zahl.*

⚠ **UND DER ZUSTAND BLEIBT DANEBEN STEHEN.** `__ohne` ist ein **Zustand**, kein
Thema: wer ihn umbenennt, gibt **jedem** künftigen Rezept ohne Kategorie diesen
Namen. Das steht jetzt als kleiner Hinweis (`.kzp-ohne-hin`) neben dem eigenen
Namen — und **nur dann**, sonst wäre es Zierde statt Auskunft. Beide Richtungen
sind bewacht.

### ⚠ Zwei benannte Abweichungen zu den Schwestern

Diese App blendet in der Reiter-Leiste **Kategorien ohne Inhalt aus**
(`if(cnt===0&&c.id!=='all')return '';`), der Ordner-Baum zeigt dagegen alle.
Daraus folgt zweierlei für die Wächter, und beides steht im Code:

| Wächter | was er hier anders macht |
|---|---|
| „der Ordner-Baum zeigt dieselbe Folge wie die Leiste" | vergleicht die **Schnittmenge** in beide Richtungen. Ein Vergleich der ganzen Listen wäre hier **immer** rot, ohne dass eine Zusicherung gefallen wäre |
| „eine Kategorie ohne Eintrag in der Folge geht nicht verloren" | legt der neuen Kategorie ein Rezept dazu. Ohne eines stünde sie so oder so nicht in der Leiste, und der Wächter hätte **nichts** gemessen |

*Drei Apps dieselbe Zusicherung behaupten zu lassen wäre in einer davon eine
Lüge* — die Regel gilt hier wörtlich.

### Geprüft

```bash
node tests/smoke_kategorien.mjs           # echter Browser
NUR_ANKER=1 bash tests/gegenprobe_kategorien.sh   # tote Anker in Sekunden
bash tests/gegenprobe_kategorien.sh       # Wegwerf-Kopie (`python3 build.py`)
```

Zuletzt gemessen (2026-09-16, nach dem Umsortieren): **145 grün · 0 ROT** ·
Gegenprobe **91 gefangen · 0 durchgerutscht · 0 aus falschem Grund · 0 tote
Anker**. Beide Rückgabewerte **direkt** gelesen, nicht hinter einer Pipe; die
Prüfsummen des Baums waren vor und nach dem Lauf gleich.

⚠ **Die fünf blinden Wächter und die zwei falschen Fälle sind in Muttis
Rezeptbuch gefunden worden** — hier steht die Fassung, die danach entstand.
Der Lauf, der sie fand, meldete dort **73 gefangen · 4 durchgerutscht · 3 aus
falschem Grund**. Nur die letzte Zahl zu nennen hieße, die Befunde durch ihre
Reparatur zu ersetzen.

---


## Netzweit — gilt in jedem Repo, steht in Sage

Freibrief · Gerätename · frisch von `origin/main` · Ton · kein PII · Ehrlichkeit:
**[`Sage-Protokol/docs/NETZWEIT.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md)**. Verträge:
**[`INTERFACES.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/INTERFACES.md)**. Die Fallen beim Abzweigen und
Veröffentlichen: **[`LEHREN.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/LEHREN.md)**.

> Die alte Fassung dieser Datei steht vollständig in
> [`docs/archiv/CLAUDE-2026-08-22.md`](docs/archiv/CLAUDE-2026-08-22.md).
