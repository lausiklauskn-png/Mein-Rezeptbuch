# Sync Modul 17 nach Sage-Pflege-PR #174 (CSS-Spezifität)

**Datum:** 2026-05-26
**Endknoten:** Mein-Rezeptbuch (lausiklauskn-png/Mein-Rezeptbuch)
**Branch:** `claude/sync-sage-d43a9b3-pflege-css-spezifitaet`
**Sitzungs-Typ:** Sync-Sitzung (zweite Mini-Pflege nach #247)

---

## Übernommene Sage-Protokol-Version

| Modul | Datei | Sage-Commit | Datum |
|---|---|---|---|
| 17 Floating-Widget | `sbkim/17_floating_widget.js` | `d43a9b3199445797b5f0774cd892f6bb0645cd4a` | 2026-05-26 |
| 02 Spore | `sbkim/02_spore.js` | unverändert (`99d017d` aus PR #247) | — |

**Sage-PR #174:** „Pflege 17 CSS-Spezifität — Ring als box-shadow +
`#sbkim-widget`-Prefix"

Modul 02 ist byte-identisch zur Vorgänger-Sitzung (PR #247) und
wurde nicht neu kopiert.

---

## Behobene Befunde

Pflege-PR #174 stapelt auf #173 und behebt PWA-Integrations-Konflikte:

- **Atmungs-Ring rechtsversetzt / halber Bogen** → behoben durch
  Umstellung auf `box-shadow:0 0 0 Npx`-Spread direkt auf der Lampe
  (robust gegen umgebende PWA-Padding-/Border-Konflikte).
- **Dicker grauer Rand um Lampen** (PWA-`button`-Defaults schlugen
  durch) → behoben durch `#sbkim-widget`-CSS-Prefix für höhere
  Spezifität gegenüber PWA-`button`-Overrides.

Bereits in #173 behoben und hier mitgeliefert:

- Doppel-Tooltips weg (`title`-Attribut entfernt, `aria-label` voll).
- Self-Heartbeat-Fallback in Modul 17 für LEBT.
- `dispatchAliveOnce` auch in `loadIdentity` (existing-Identity-Pfad).
- Modul 02 `_meta.ready`-Getter.

---

## Eingriffe in diesem Repo

1. `sbkim/17_floating_widget.js` — 1:1-Kopie von Sage-Protokol-`d43a9b3`
   (1778 → 1782 Zeilen, +4).
2. `app-sw.js` — Cache-Bust `mrz-v15` → `mrz-v16`.
3. `.pages-rebuild` — Trigger-Timestamp aktualisiert.
4. `docs/sessions/SYNC_SAGE_D43A9B3.md` — Übergabeprotokoll.

---

## Vorgänger-Sitzungen

- 2026-05-26 PR #245 — Re-Migration Modul 17 (Sage `b2cf42c`).
- 2026-05-26 PR #246 — Sichttest + zwei Befunde.
- 2026-05-26 PR #247 — Sync auf Sage `99d017d` (PR #173: Tooltips +
  Heartbeat).
- **DIESE Sitzung:** Sync auf Sage `d43a9b3` (PR #174: CSS-Spezifität).

---

## Heilige Regeln eingehalten

- `sbkim/spore.json` nicht angetastet.
- Module 00, 01, 03–08 byte-identisch zu Sage-Main.
- Modul 02 byte-identisch zu Sage-Main-`99d017d` (kein Re-Sync nötig).
- Modul 17 byte-identisch zu Sage-Main-`d43a9b3`.
- `PROTOCOL_VERSION` / `DB_VERSION` / `BACKUP_FORMAT_VERSION` /
  `dbSuffix` unverändert.
- KEINE Logik-Änderung — nur Datei-Sync.
- KEIN Endknoten-eigener Modul-Code-Eingriff.
- KEIN Sage-Protokol-Eingriff.

---

## Sichttest-Checkliste (Klaus' DeX-Chrome, Galaxy Tab S6)

1. Hard-Reload nach git pull (SW unregistern via
   `chrome://serviceworker-internals/`).
2. Pille bottom-right mit vier Slots (LEBT/VERKEHR/FREMD/SIEGEL).
3. **LEBT pulst grün mit rundlaufendem Atmungs-Ring** — NICHT
   rechtsversetzt, KEIN halber Bogen.
4. Pille **kein „dicker grauer Rand"** um die Lampen
   (PWA-`button`-Defaults überschrieben).
5. Longpress auf rechten Slots → **nur ein Tooltip**.
6. Konsole sauber.
