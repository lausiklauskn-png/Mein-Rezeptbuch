# Sync Modul 17 + Modul 02 nach Sage-Pflege-PR #173

**Datum:** 2026-05-26
**Endknoten:** Mein-Rezeptbuch (lausiklauskn-png/Mein-Rezeptbuch)
**Branch:** `claude/sync-modul-17-02-pflege-tooltips-heartbeat`
**Sitzungs-Typ:** Mini-Pflege-Sitzung (Sync vom Sage-Protokol-Pflege-PR)

---

## Übernommene Sage-Protokol-Version

| Modul | Datei | Sage-Protokol Commit | Datum |
|---|---|---|---|
| 17 Floating-Widget | `sbkim/17_floating_widget.js` | `99d017d7c4a84afc9843b9dc0cb11e010246d92b` | 2026-05-26 |
| 02 Spore | `sbkim/02_spore.js` | `99d017d7c4a84afc9843b9dc0cb11e010246d92b` | 2026-05-26 |

**Sage-Protokol-PR #173** — „Pflege 17 — Doppel-Tooltips weg +
Self-Heartbeat-Fallback (#173)" — behebt die zwei Befunde aus
der Endknoten-Re-Migration vom 2026-05-26 (Rezeptbuch PR #246):

1. **Doppel-Tooltips** auf rechten Pille-Slots → behoben.
2. **LEBT-Slot bleibt grau** → behoben durch Self-Heartbeat-Fallback
   in Modul 17 + `dispatchAliveOnce` auch in Modul-02-`loadIdentity()`
   + sichtbarer LEBT-Atmungs-Ring (kein Halbbogen mehr).

---

## Eingriffe in diesem Repo

1. `sbkim/17_floating_widget.js` — 1:1-Kopie von Sage-Protokol-`99d017d`
   (1694 → 1778 Zeilen, +84).
2. `sbkim/02_spore.js` — 1:1-Kopie von Sage-Protokol-`99d017d`
   (1124 → 1167 Zeilen, +43).
3. `app-sw.js` — Cache-Bust `mrz-v14` → `mrz-v15`.
4. `.pages-rebuild` — Trigger-Timestamp aktualisiert.

---

## Vorgänger-Sitzungen

- 2026-05-26 PR #245 — Re-Migration auf Modul 17 Floating-Widget
  (Sage-Commit `b2cf42c` übernommen).
- 2026-05-26 PR #246 — Sichttest-Ergebnis + zwei Befunde dokumentiert.
- **DIESE Sitzung:** Sync der Befund-Fixes aus Sage-PR #173.

---

## Heilige Regeln eingehalten

- `sbkim/spore.json` nicht angetastet.
- Module 00, 01, 03–08 byte-identisch zu Sage-Main (nicht verändert).
- Modul 02 + Modul 17 byte-identisch zu Sage-Main-`99d017d`.
- `PROTOCOL_VERSION` / `DB_VERSION` / `BACKUP_FORMAT_VERSION` /
  `dbSuffix` unverändert.
- KEIN Endknoten-eigener Modul-Code-Eingriff.
- KEIN Sage-Protokol-Eingriff (anderes Repo).

---

## Sichttest-Checkliste (Klaus' DeX-Chrome, Galaxy Tab S6)

1. Hard-Reload nach git pull.
2. Pille bottom-right mit vier Slots (LEBT/VERKEHR/FREMD).
3. **LEBT pulst grün** mit sichtbarem Atmungs-Ring (kein Halbbogen).
4. Longpress auf rechten Slots (FREMD/Minimize/X) → **nur ein Tooltip**.
5. Konsole sauber.
