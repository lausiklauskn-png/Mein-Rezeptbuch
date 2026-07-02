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

### Dieses Repo: `lausiklauskn-png/Muttis-Rezeptbuch`
- **App-Name:** Muttis Rezeptbuch (das Original)
- **Aktuelle Version:** v9.2
- **Lokaler Pfad:** `/home/user/Muttis-Rezeptbuch/`

### Schwesterprojekt: `lausiklauskn-png/Mein-Rezeptbuch`
- **App-Name:** Mein Rezeptbuch (öffentlicher Klon)
- Die beiden Apps sind funktional identisch – Mein Rezeptbuch ist ein Klon
- Änderungen werden in der Regel **zuerst hier** (Muttis Rezeptbuch) entwickelt, dann in Mein-Rezeptbuch übertragen

---

## Dateistruktur

| Datei | Bedeutung |
|---|---|
| `index.html` | **Produktionsdatei** – enthält `_CR`-Wasserzeichen – NICHT direkt bearbeiten |
| `QC_MeinRezb_12_4_26.html` | **Quelldatei (v9.2)** – saubere, lesbare Version ohne Sicherheitsblock – hier werden Änderungen gemacht |
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

### Selbst-Merge-Freibrief (Klaus 2026-06-28, netzweit für ALLE Repos)
Klaus' stehende Anweisung: die Sitzung merget ihre **eigenen** PRs **selbstständig** nach
`main`, sobald sie getestet (Smoke/Build grün, bei reinen Doku-/byte-Kopie-Änderungen
Drift-Guard grün), abgegrenzt und nicht architektonisch zweifelhaft sind — **ohne auf
"X mergen" zu warten** (Draft-PR → ready → squash-merge). **NICHT** automatisch mergen bei
echtem Zweifel (Richtungsentscheid, schwer umkehrbar, mehrere gleich gute Wege) ODER wenn
Klaus ausdrücklich vorher draufschauen will. Klaus' Browser-Sichttest am Tablet bleibt davon
unberührt (er läuft auf der live-deployten Seite nach dem Merge). Niemals auf einen anderen
als den vorgegebenen Branch pushen.

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
