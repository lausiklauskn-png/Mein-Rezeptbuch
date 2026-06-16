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

---

## Sichttest-Ergebnis 2026-05-26 (Klaus, DeX-Chrome, Galaxy Tab S6)

PR #245 gemerged 2026-05-26 ~08:00 (Merge-Commit `0da92cc`). Sichttest
unmittelbar danach via Eruda-Konsole + visueller App-Check:

| # | Punkt | Status | Notiz |
|---|---|---|---|
| 1 | Hard-Reload + Init-Kette in Konsole | ✅ | Alle 8 Module + Modul 17 grün, `SBKIM-Init: Init-Kette abgeschlossen` |
| 2 | Pille bottom-right mit Slots | ✅ | 3 Slots sichtbar (LEBT/VERKEHR/FREMD) — SIEGEL aufgeschoben |
| 3 | LEBT pulst grün | ⏸ stumm | Befund 2 (siehe unten) |
| 4 | SIEGEL Gold-Medaillon ★ | ⏸ | Modul 16 zurückgebaut — Slot nicht im DOM |
| 5 | FREMD-Klick → Sub-(e)-Modal | ⏸ | Modul 15 zurückgebaut — Klick ist no-op |
| 6 | SIEGEL-Klick → Sub-(c)-Modal | ⏸ | Modul 16 zurückgebaut — Slot fehlt |
| 7 | Drag + Minimize + Maximize + X + `SbkimWidget.show()` | ✅ | Alle vier Interaktionen funktionieren |
| 8 | Keine alten Navleisten-Lampen | ✅ | War in PR #244 bereits raus |
| 9 | Konsole sauber | ✅ | Nur erwartete fail-soft-Warnungen zu `#sbkim-doku-trigger` |

**Bonus:** Klick auf LEBT- und VERKEHR-Slot öffnet die Widget-internen
Modul-17-Modals — funktioniert auch ohne Modul 15/16 (Modul 17 baut
diese Modals selbst, siehe Header-Kommentar `17_floating_widget.js`
Zeile 28).

**Persistenz-Check:** Pille an Bildschirm-Mitte gezogen → Tab-Reload →
Pille erscheint an gleicher Position. `localStorage`-Schlüssel
`sbkim_widget_position` + `sbkim_widget_minimized` + `sbkim_widget_hidden`
funktionieren.

---

## Befunde für die nächste Sage-Protokol-Pflege

Beide Befunde betreffen **Modul-17-Code** und gehören nach Sage-Protokol-
Repo (nicht hier — Endknoten greift nicht in Modul-Code ein).

### Befund 1 — Doppel-Tooltips auf rechten Pille-Slots

Auf DeX-Chrome (Android-Chrome im Desktop-Modus) erscheinen Tooltips
**doppelt** an den Pille-Elementen FREMD, Minimize-Knopf, X-Knopf:

- Ein Tooltip in „Über-Position" (gestaffelt nach links/oben)
- Ein zweiter Tooltip am Element direkt (rechts/näher)

Beide Tooltips zeigen identischen Text im gleichen braun-gerundeten
Stil — sieht nicht aus wie HTML-`title=""`-Native vs. JS-Custom,
sondern wie zwei JS-Custom-Tooltip-Instanzen.

Auf LEBT + VERKEHR (linke Pille-Slots) wird der Doppel-Tooltip
**nicht** beobachtet — vermutlich weil der zweite Tooltip dort
außerhalb des Viewport landet oder anders positioniert ist.

**Reproduktion:** Mein-Rezeptbuch auf DeX-Chrome (Samsung Galaxy
Tab S6), Pille bottom-right, Finger auf FREMD-Slot halten.

**Vermutete Ursache:** Touch-Event triggert sowohl `pointerenter`
als auch `touchstart` → Tooltip-Handler läuft zweimal. Oder doppelte
Listener-Registrierung in `init()`.

**Workaround (Endknoten):** keiner möglich — Modul-Code ist in
Sage-Protokol-main gepflegt.

### Befund 2 — LEBT-Slot bleibt grau (kein Event-Sender)

Im Mein-Rezeptbuch-Endknoten dispatcht **kein Modul** das
`sbkim:alive`-Event, das Modul 17 Zeile 1115 `onAlive(ev)` triggert.
Konsequenz: LEBT-Slot bleibt dauerhaft grau, der Sichttest-Schritt 3
„LEBT pulsiert grün" ist faktisch nicht erfüllbar.

**Quellen-Inventur Mein-Rezeptbuch (per `grep -rn "sbkim:alive"`):**

- `sbkim/01_storage.js` — kein dispatch
- `sbkim/02_spore.js` — kein dispatch
- `sbkim/05_anastomose-v2.js` — kein dispatch
- `sbkim/06_heterokaryose.js` — kein dispatch
- `sbkim/07_apoptose.js` — kein dispatch
- `sbkim/08_ui_demo.js` — kein dispatch
- `sbkim/00_doku_fenster.js` — kein dispatch

Nur Modul 17 selbst kennt den Event-Namen (als Listener).

**Quellen lt. Modul-17-Doku-Header:** Module 02 (LEBT) + Modul 15
Sub (b) (VERKEHR). Modul 15 ist zurückgebaut → kein VERKEHR-Sender;
Modul 02 dispatcht das Event in dieser Version nicht.

**Sage-Protokol-Optionen:**

- (a) Modul 02 ein `sbkim:alive` beim erfolgreichen `init()` dispatchen
  lassen (Heartbeat alle N Sekunden optional).
- (b) Modul 17 einen Self-Heartbeat-Fallback einbauen: wenn nach 5 s
  kein `sbkim:alive` reinkommt aber `window.SbkimSpore` existiert,
  selbst einen synthetischen `sbkim:alive` mit `since = init-Zeit`
  emittieren.
- (c) Doku-Klarstellung: LEBT-Slot ist nur aktiv wenn Modul 02
  explizit dispatcht — Endknoten ohne diesen Patch zeigen LEBT
  grau. Sichttest-Schritt 3 dann als „nur Sage-Page" markieren.

**Workaround (Endknoten):** keiner möglich — Modul-Code-Eingriff
ist in dieser Sitzungs-Rolle verboten.

---

## Sitzungs-Abschluss

Re-Migration ist **funktional vollständig** für den Teil der prüfbar
ist (Pille, Interaktion, Persistenz, alte Lampen weg). Die vier
aufgeschobenen Punkte (3, 4, 5, 6) hängen an Modul 15+16-Wiederandock
bzw. dem Modul-02-Heartbeat-Patch in Sage-Protokol.

**Nächste Sitzung:** Mein-Mixarium (zweite Endknoten-Re-Migration),
analog mit `repoUrl: "https://github.com/lausiklauskn-png/Mein-Mixarium"`.
