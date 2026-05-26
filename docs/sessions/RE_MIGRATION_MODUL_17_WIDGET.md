# Re-Migration auf Modul 17 Floating-Widget

**Datum:** 2026-05-26
**Endknoten:** Mein-Rezeptbuch (lausiklauskn-png/Mein-Rezeptbuch)
**Pipeline-Schritt:** 5d aus Sage-Protokol CLAUDE.md
**Branch:** `claude/re-migration-widget-OFC01`
**Vorgängersitzung:** PR #244 — Rückbau SBKIM Modul 15 + 16
**Folgesitzung:** Mein-Mixarium (zweite Endknoten-Re-Migration)

---

## Übernommene Sage-Protokol-Version

| Modul | Datei | Sage-Protokol Commit | Datum |
|---|---|---|---|
| 17 Floating-Widget | `sbkim/17_floating_widget.js` | `b2cf42ca0708a2f3cc12d0f344a16d28539a765d` | 2026-05-25 |

**Sage-Protokol-PR-Historie für Modul 17:**

- `afc222f` — Bau-Sitzung 17 Floating-Widget — Code-Stub + Event-Hooks (PR #166)
- `ffdea3e` — Pflege 17 UX — 1:1 Sage-Page-Stil + minimize/maximize (PR #167)
- `7b6487d` — Pflege 17 Slide-Animation — Lampen schieben hinter SIEGEL (PR #168)
- `b2cf42c` — Pflege 17 SIEGEL-Reihenfolge — vor Aktions-Knöpfen einfügen (PR #169) ← übernommen

---

## Eingriffe in diesem Repo

1. **Neue Datei:** `sbkim/17_floating_widget.js` (1694 Zeilen, 1:1-Kopie von
   Sage-Protokol-main).
2. **`QC_MeinRezb_24_04_26.html`:** `<script src="sbkim/17_floating_widget.js" defer></script>`
   vor `sbkim/sbkim-init.js` eingefügt (die Stelle wo Modul 15 + 16 wären,
   falls sie wieder aufgebaut würden).
3. **`index.html`:** Neu gebaut via `python3 build.py` aus QC + `_cr_block.txt`.
4. **`sbkim/sbkim-init.js`:** `SbkimWidget.init({allowedOrigins, repoUrl})`
   nach Storage (01) und VOR Spore (02) eingefügt. Das Widget muss früh
   im DOM sein, damit andere Module ihre Click-Handler an den Proxy-Spans
   (`#lamp-fremd`, `#sbkim-siegel-badge`) attachen können (Karte 09
   Schritt 12).
5. **`app-sw.js`:** Cache-Bust `mrz-v13` → `mrz-v14` damit die neue
   `index.html` + `sbkim/17_floating_widget.js` ohne harten Reload
   ausgeliefert werden.
6. **`.pages-rebuild`:** Timestamp aktualisiert (GitHub-Pages-Rebuild-
   Trigger).

---

## Init-Reihenfolge in sbkim-init.js (neu)

```
01 Storage
17 Floating-Widget           ← NEU
02 Spore
05 Anastomose
06 Heterokaryose
07 Apoptose
08 UI-Demo
00 Doku-Fenster
```

Modul 15 + 16 sind in diesem Endknoten aktuell **zurückgebaut** (PR #244).
Das Widget bleibt trotzdem als Vier-Slot-Live-Status-Dashboard sichtbar
(LEBT/VERKEHR/FREMD/SIEGEL) — die Slots sind nur inaktiv solange die
zugehörigen Backends fehlen. Bei einem späteren Wiederandock von 15 + 16
funktioniert die Render-Schicht ohne weiteren Eingriff.

---

## Heilige Regeln eingehalten

- `sbkim/spore.json` nicht angetastet.
- Module 00–08 byte-identisch zu Sage-Main.
- `PROTOCOL_VERSION` / `DB_VERSION` / `BACKUP_FORMAT_VERSION` / `dbSuffix`
  unverändert.
- KEIN Modul-Code-Eingriff in Modul 17 — reine Datei-Kopie.
- KEIN Sage-Protokol-Eingriff (anderes Repo).

---

## Sichttest-Checkliste (Klaus' DeX-Chrome, Galaxy Tab S6)

1. Hard-Reload nach git pull.
2. Pille bottom-right sichtbar mit vier Slots (LEBT/VERKEHR/FREMD/SIEGEL).
3. LEBT pulsiert grün (Modul 02 hat Identität geladen).
4. SIEGEL ist Gold-Medaillon mit ★ (sofern Modul 16 zertifiziert).
   *Hinweis:* Modul 15 + 16 sind hier zurückgebaut — SIEGEL bleibt
   leer/inaktiv bis 15+16 wieder andocken.
5. Klick auf FREMD-Slot würde Modul-15-Sub-(e)-Modal öffnen (15 fehlt
   → no-op).
6. Klick auf SIEGEL-Slot würde Modul-16-Sub-(c)-Modal öffnen (16 fehlt
   → no-op).
7. Drag funktioniert; X-Knopf schließt; Minimize-Knopf schrumpft auf
   SIEGEL (oder LEBT-Fallback).
8. `localStorage` persistiert Position + Sichtbarkeit + Minimize-Zustand.
9. KEINE alten Navleisten-Lampen mehr in der Navleiste (waren in PR #244
   bereits entfernt).
10. DevTools-Konsole: keine Errors.
