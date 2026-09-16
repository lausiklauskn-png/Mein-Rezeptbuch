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

Zuletzt gemessen (2026-09-16, nach der Trennung): **56 grün · 0 ROT** ·
Gegenprobe **37 gefangen · 0 durchgerutscht · 0 aus falschem Grund · 0 tote
Anker**.

⚠ **Die Gegenprobe baut zwischen Sabotage und Messung neu.** Ohne
`python3 build.py` misst sie die alte `index.html`, und jeder Fall wäre „nicht
gefangen".

---

## Netzweit — gilt in jedem Repo, steht in Sage

Freibrief · Gerätename · frisch von `origin/main` · Ton · kein PII · Ehrlichkeit:
**[`Sage-Protokol/docs/NETZWEIT.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md)**. Verträge:
**[`INTERFACES.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/INTERFACES.md)**. Die Fallen beim Abzweigen und
Veröffentlichen: **[`LEHREN.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/LEHREN.md)**.

> Die alte Fassung dieser Datei steht vollständig in
> [`docs/archiv/CLAUDE-2026-08-22.md`](docs/archiv/CLAUDE-2026-08-22.md).
