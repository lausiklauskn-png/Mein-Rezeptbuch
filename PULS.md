# PULS — Mein-Rezeptbuch (SBKIM-Endknoten)

> Aktueller Stand des Knotens für die nächste Sitzung. Kurz, ehrlich, real vs. Demo getrennt.
> Letzte Aktualisierung: **2026-06-07**.

## Identität
- **Knoten:** Mein-Rezeptbuch (Kochrezepte-PWA, Domäne Essen/Kochen)
- **nodeId:** `uOpUBezUVbOMsVd2C9BkHW80agnLx5tCx_nIRy2KkXg` (Ed25519, **verified-spore ✔**)
- **Spore:** `sbkim/spore.json` — 9/9 Pflichtfelder, echter 384-dim `domainVector`
  (`Xenova/multilingual-e5-small`), lokal mit `scripts/verify_foreign_spore.mjs` → **✔ VALID**.

## Was in dieser Sitzung gebaut wurde (SBKIM-Briefkasten, 1:1 nach Mein-Tresor-Bauplan)
- **📬-Knopf im Gesicht** (Top-Header der App) mit **Gold-Zähler** (`#sbkim-mailbox-badge`,
  #C9A961) = Anzahl ungelesener Briefe (`seq>ack`); stiller Lade-Check setzt die Badge.
- **Dialog** `#sbkim-mailbox-dialog` mit **SBKIM-Siegel** (`assets/sbkim-siegel-wappen.svg`),
  drei Ebenen je Nachbar (① Spore ② Match ③ Sync) + „X/N verbunden".
- **CONFIG + Logik:** `sbkimMailboxFetch`, `sbkimCosine`, `sbkimMailboxCheck` **byte-gleich**
  zum Bauplan (4953 B identisch verifiziert); nur CONFIG umgestellt (`self="Mein-Rezeptbuch"`,
  Vollvernetzung §7 = alle anderen fünf als `peers`).
- **Daten:** `sbkim/SIGNAL.json` (seq 1, `ack`-Map) **neu angelegt**; je Nachbar reziprok
  geprüfte Spore byte-1:1 als `sbkim/<name>_inbox.json` (sage, point, jason, tresor, mixarium).
- **Auto-Issue-Wächter:** `.github/sbkim-watch.mjs` + `.github/workflows/sbkim-watch.yml`
  (CONFIG `SELF=Mein-Rezeptbuch` + 5 PEERS; `issues:write`, Cron `0 */6` + Run-Knopf).
- **Tests:** `test/sbkim.test.js` (`node --test`) → **5/5 grün** (Spore VALID, alle Inboxen
  VALID, SIGNAL-Pflichtfelder, Cosinus-Sanity).

## Live-Match (im Browser frisch gerechnet, nichts grün-gerechnet)
| Nachbar | Cosinus | Stufe |
|---|---|---|
| Mein-Mixarium | **0.9544** | ✔ verified-match (höchster — gleiche Genuss-Domäne) |
| SB-KIMTool-Point | 0.8320 | ✔ verified-match |
| Sage-Protokol | 0.8241 | ✔ verified-match |
| Mein-Tresor | 0.8137 | ✔ verified-match |
| Jasons-Tresor | 0.8137 | ✔ verified-match |

→ **5/5 verbunden.** (Alle ehrlich ≥ 0.80; kein Wert geschönt.)

## Sync-Stand (ack quittiert)
Sage 18 · SB-KIMTool-Point 20 · Jasons-Tresor 10 · Mein-Tresor 13 · **Mein-Mixarium 0**
(Mixarium hat **kein** `SIGNAL.json` → HTTP 404 → ③ Sync zeigt ehrlich „SIGNAL nicht lesbar").

## Ehrliche offene Punkte
- **Kein privater Schlüssel** in dieser Sitzung → die Spore wurde **nicht neu signiert**.
  Verwendet wird die im Netz bereits geprüfte Spore (gleiche nodeId) byte-1:1. Falls Klaus die
  Identität neu erzeugt, müssen `sbkim/spore.json` + alle Nachbar-Inboxen (reziprok) aktualisiert
  werden. Mein-Tresor hat im Postfach vermerkt, unsere alte Inbox sei evtl. veraltet — bei echter
  Neu-Signatur holen sie die frische Spore aus `raw/main`.

## Nächste Schritte
- Bei echter Identitäts-Neuerzeugung: Spore neu signieren, Inboxen aktualisieren, `seq` +1.
- Peer-Sporen periodisch frisch holen + reziprok prüfen (Inboxen aktuell halten).
- `ack` bei jedem Sitzungsstart gegen die Peer-`seq` quittieren.
