# Übergabeprotokoll — Rückbau SBKIM Modul 15 + 16 (Endknoten Mein-Rezeptbuch)

**Datum:** 2026-05-25
**Endknoten:** lausiklauskn-png/Mein-Rezeptbuch (Live: https://lausiklauskn-png.github.io/Mein-Rezeptbuch/)
**Branch:** `claude/rueckbau-15-16-DeMXd`
**Auslöser:** PR #243 (gemerged 2026-05-25) — *„SBKIM Modul 15+16 Erst-Andock + Multi-Identity-Migration"* — verursachte Topbar-/Navleisten-Regression und Spore-Verlust laut Klaus' UI-Befund vom 25.05. 17:30.

Diese Sitzung folgt dem Brief `BRIEF_RUECKBAU_15_16_ENDKNOTEN.md` (Sage-Protokol, gemerged via PR #164).

---

## Phase A0 — Repo- und PR-Stand vor Rückbau

### PR-Historie der letzten 7 Tage

| # | Status | Datum | Inhalt |
|---|---|---|---|
| **#243** | merged | 25.05. | **Rückbau-Ziel** — SBKIM 15+16 Erst-Andock + Multi-Identity-Migration |
| #242 | merged | 24.05. | Spore neu nach Browser-Wipe |
| #241 | merged | 22.05. | Fix 05_anastomose-v2.js Sync (Nachzieher #240) |
| #240 | merged | 22.05. | SBKIM-Module auf Sage-Main-Stand |
| #239 | closed (nicht gemerged) | 22.05. | Zwischenschritt |
| #238 | merged | 16.05. | Buchstabensalat im „Rezept hinzufügen"-Button |

### Pages-Build-Stand
- `.pages-rebuild` letzter Touch: **2026-05-16** (9 Tage vor #243-Merge)
- Cache-Bust nötig: ja, via `app-sw.js` `CACHE`-Bump + `.pages-rebuild`-Touch.

---

## Phase A — Diagnose-Befund (read-only)

### A0a — `<script>`-Tags Modul 15/16 in `index.html`
```
Z. 14870  <script src="sbkim/15_membran.js"></script>
Z. 14871  <script src="sbkim/16_siegel.js"></script>
```
Reihenfolge der 13 SBKIM-Scripts Z. 14861–14872, `sbkim-init.js` als letzter Tag Z. 14872.

### A0b — CSS-Anker Modul 15/16 in `index.html`
| Anker | Zeile | Verwendung |
|---|---|---|
| `--lamp-alert` | 85 | Var-Def → Z. 2037–2038 |
| `--lamp-pulse-ms` | 86 | Var-Def → Z. 2036, 2039 |
| `--siegel-gold` | 87 | Var-Def → Z. 2047–2048 |
| `--siegel-gold-glow` | 88 | Var-Def → Z. 2047, 2050 |
| `--siegel-ink` | 89 | Var-Def, **ungenutzt** |
| `--siegel-line` | 90 | Var-Def, **ungenutzt** |
| `.lamp.fremd-alert` / `.lamp.fremd-pulse` | 2037–2039 | nur Modul 15 |
| `#sbkim-siegel-badge { … }` | 2045–2049 | nur Modul 16 |
| `@keyframes siegel-first-boot` | 2050 | nur Modul 16 |
| `@keyframes lamp-alert-pulse` | 2043 | nur Modul 15 |
| `.sbkim-topbar` / `-inner` / `-spacer` | 2029–2031 | Wrapper, kam erst mit #243 |
| Kommentar-Block | 2025–2028 | „SBKIM-Topbar — Modul 15 + 16 …" |

### A0c — Sage-Page-spezifische Lampen-Reste (Visual-Stand-Beleg)
**Bestätigt: mit-kopiert.** Diese gehen per Klaus' Anweisung MIT raus:
| Anker | Zeile |
|---|---|
| `.lamp.alive` CSS | 2034–2035 |
| `.lamp.traffic-pulse` CSS | 2036 |
| `.lamps` (Container) | 2032 |
| `.lamp` (Basis) | 2033 |
| `.lamp-label` | 2040 |
| `@keyframes lamp-breath` | 2041 |
| `@keyframes lamp-pulse` | 2042 |
| Markup `#lamp-alive`, `#lamp-traffic`, zwei `<span class="lamp-label">` | 2083–2086 |

### A0d — UI-Markup-Block
`<header class="sbkim-topbar">` Z. 2075–2090 (inkl. Kommentar) — komplett raus.
**Siegel-Badge ist nicht statisch im HTML** — Modul 16 injiziert `<button id="sbkim-siegel-badge">` in `.lamps` zur Laufzeit.

### A0e — `sbkim/sbkim-init.js` (206 Zeilen)
| Block | Zeile | Aktion |
|---|---|---|
| `initModule("SbkimMembrane", …)` | 94–102 | raus |
| `initModule("SbkimSiegel", …)` | 104–114 | raus |
| Endknoten-Hook (Lamp-alive Setting + lamp-traffic Listener) | 127–165 | raus (A0c-Konsequenz) |

Module 01 Storage / 02 Spore / 05 Anastomose / 06 Heterokaryose / 07 Apoptose / 08 UI-Demo / 00 Doku **bleiben unangetastet**.

### A0f — `sbkim/sbkim-sw.js` (417 Z.) und Root-Kopie `sbkim-sw-v3.js` (417 Z.)
**Bit-identisch (`diff` = 0).** Beide patchen.
| Anker | Zeile | Aktion |
|---|---|---|
| `MEMBRANE_PROBE_CHANNEL = "sbkim-membrane"` | 77 | raus |
| `MEMBRANE_PROBE_MESSAGE_TYPE` | 78 | raus |
| `SBKIM_ENDPOINT_PATHS` Array | 79–84 | raus |
| Probe-Funktionen (`maybeRecordMembraneProbe`, `postProbeViaBroadcastChannel`, `classifyOrigin`, `parseRefererOrigin`) | 307–417 | raus |
| Bridge-Branches anastomose/legacy/heterokaryose | 128–139 | **bleiben** |

### A0g — `app-sw.js` (Root, 33 Z.)
- Z. 2: `importScripts("./sbkim-sw-v3.js")` — bleibt aktiv
- Z. 5: `const CACHE = 'mrz-v12'` → **Bump auf `'mrz-v13'`** (Phase D)

### A0h — Modulgrößen
- `sbkim/15_membran.js`: **1215 Zeilen** → `git rm`
- `sbkim/16_siegel.js`: **936 Zeilen** → `git rm`
- Exports `window.SbkimMembrane`, `window.SbkimSiegel` bestätigt.

### A0i — Auffälligkeiten
- `--siegel-ink` (Z. 89), `--siegel-line` (Z. 90) — definiert, aber **nirgends verwendet**. Mit raus.
- `sbkim/sbkim-sw.js` ↔ `sbkim-sw-v3.js` (Root) bit-identisch — beide Dateien gleich behandeln.

---

## Phase B–D — Rückbau-Scope (vor Ausführung von Klaus bestätigt)

| Phase | Datei | Aktion |
|---|---|---|
| B1 | `index.html` Z. 14870–14871 | `<script>`-Tags 15+16 entfernen |
| B2 | `index.html` Z. 85–90 | CSS-Vars `--lamp-alert`, `--lamp-pulse-ms`, `--siegel-*` entfernen |
| B3 | `index.html` Z. 2025–2050 | Topbar-CSS-Block komplett entfernen (inkl. A0c-Reste) |
| B4 | `index.html` Z. 2075–2090 | `<header class="sbkim-topbar">` Markup komplett entfernen |
| C1 | `sbkim/sbkim-init.js` Z. 94–114 | beide `initModule`-Aufrufe entfernen |
| C2 | `sbkim/sbkim-init.js` Z. 127–165 | Endknoten-Lampen-Hook entfernen |
| C3 | `sbkim/15_membran.js`, `sbkim/16_siegel.js` | `git rm` |
| C4 | `sbkim/sbkim-sw.js` + `sbkim-sw-v3.js` | Probe-Detektor Z. 77–84 + 307–417 entfernen (beide Dateien) |
| D1 | `app-sw.js` Z. 5 | `CACHE = 'mrz-v12'` → `'mrz-v13'` |
| D2 | `.pages-rebuild` | Touch |

## Phase E — Erwartete Sichttest-Befunde (nach Push & Pages-Build)
- **9 Modul-Logs** in der Konsole statt 11 (01, 02, 05, 06, 07, 08, 00 + zwei Storage-Substufen).
- **Keine FREMD-Lampe** mehr, **kein Siegel-Badge**, **keine eigene Topbar** über der App.
- App-Versionssiegel `<span id="appVersion">v10.0</span>` Z. 2110 bleibt unangetastet (kein Versionssprung — Rückbau ist Rollback, kein Release).

---

## Heilige Regeln eingehalten
- ✅ Kein Sage-Protokol-Repo-Eingriff.
- ✅ `sbkim/spore.json` nicht angetastet.
- ✅ Keine IndexedDB-Manipulation (kein Browser-Code in dieser Sitzung).
- ✅ Module 00–08 bleiben.
- ✅ `PROTOCOL_VERSION`, `DB_VERSION`, `BACKUP_FORMAT_VERSION`, `SbkimStorage.init({dbSuffix})` unverändert.

---

## Phase F — Klaus' Schritt nach der Sitzung (NICHT diese Sitzung)

Klaus' Spore-Diagnose im Browser, drei Pfade je nach Befund:

- **F2 (Identität OK):** `getOwnSpore()` auslesen → in `sbkim/spore.json` schreiben.
- **F3 (Backup vorhanden):** `importBackup()` + `generateOwnSpore()`.
- **F4 (Neubau):** Frisches Keypair + neue `nodeId`. Domain-Kontext: Kochrezepte. IndexedDB-DB-Name: `sbkim_rezeptbuch`.

---

## Commit-Reihenfolge (drei Commits)
1. **Phase-A-Diagnose** — dieses Übergabeprotokoll
2. **Phase-B+C+D-Rückbau** — Code-Streichungen + Modul-Löschungen
3. **Phase-D-Cache-Bust** — `CACHE`-Bump v12→v13 + `.pages-rebuild`-Touch
