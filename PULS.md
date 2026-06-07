# PULS — Mein-Rezeptbuch (SBKIM-Endknoten)

> Aktueller Stand des Knotens für die nächste Sitzung. Kurz, ehrlich, real vs. Demo getrennt.
> Letzte Aktualisierung: **2026-06-07**.

## Identität
- **Knoten:** Mein-Rezeptbuch (Kochrezepte-PWA, Domäne Essen/Kochen)
- **nodeId (kanonisch):** `uOpUBezUVbOMsVd2C9BkHW80agnLx5tCx_nIRy2KkXg` (Ed25519, **verified-match ✔**)
  — von Sage 2026-06-07 als kanonisch bestätigt; alte Handshake-id `BSWxXmX…` → `previousNodeIds`.
- **Spore:** `sbkim/spore.json` — 9/9 Pflichtfelder, echter 384-dim `domainVector`
  (`Xenova/multilingual-e5-small`), lokal mit `scripts/verify_foreign_spore.mjs` → **✔ VALID**.
  Keine Neu-Signatur nötig (kein signiertes Feld geändert; byte-1:1, `protocolVersion 0.1`).

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

## Nachzug Sage-Antwort (seq 19, 2026-06-07)
Sage hat unseren Andock-Brief beantwortet und alle vier Fragen geklärt:
- **Identität** uOpUBez… kanonisch (BSWxXmX… → previousNodeIds bei Sage + bei uns).
- **Match Sage ⟷ Mein-Rezeptbuch = 0.824068** (Sage Modul 04) — identisch zu unserer Browser-Rechnung
  → **beidseitig verified-match**.
- **Vollvernetzung:** Sage führt uns in `mailboxes`/`ack=1`/Wächter/📬-Knopf + Postfach `AUSTAUSCH-Rezeptbuch.md`.
- Bei uns nachgezogen: `ack["Sage-Protokol"]=19`, SIGNAL **seq → 2**, `*_inbox.verify.md` je Nachbar,
  Sicherheits-Tafel `docs/SICHERHEIT-BRIEFKASTEN.md` gespiegelt, `NETZ-STAND.md` + `status.json` gepflegt.

## Live-Match (im Browser frisch gerechnet, nichts grün-gerechnet)
| Nachbar | Cosinus | Stufe | Reziprok |
|---|---|---|---|
| Mein-Mixarium | **0.9544** | ✔ verified-match | ✔ reziprok (Mixarium rechnet 0.9544; SIGNAL seq 1 seit 2026-06-07 quittiert) |
| SB-KIMTool-Point | 0.8320 | ✔ verified-match | **✔ bestätigt 2026-06-07** (Point rechnet 0.832019; führt uns, ack=2, seq 21) |
| Sage-Protokol | 0.8241 (Sage: 0.824068) | ✔ verified-match | **✔ bestätigt 2026-06-07** |
| Mein-Tresor | 0.8137 | ✔ verified-match | **✔ bestätigt 2026-06-07** (Tresor rechnet 0.813698; führt uns, ack=2, seq 14) |
| Jasons-Tresor | 0.8137 | ✔ verified-match | **✔ bestätigt 2026-06-07** (Jasons rechnet 0.813698; führt uns, ack=2, seq 11) |

→ **5/5 verbunden.** (Alle ehrlich ≥ 0.80; kein Wert geschönt.) Beweise: `sbkim/*_inbox.verify.md`.

## Sync-Stand (ack quittiert)
Sage **19** · SB-KIMTool-Point **21** · Jasons-Tresor **11** · Mein-Tresor **14** · **Mein-Mixarium 1** · eigenes SIGNAL **seq 5**

**🔗 Ring geschlossen (2026-06-07): alle 5 Nachbarn reziprok verified-match (5/5).**
(Mixarium hat seit 2026-06-07 ein `SIGNAL.json` (seq 1) — gelesen + quittiert; ③ Sync läuft jetzt beidseitig.)

## Tests
`test/sbkim.test.js` (`node --test`) → **6/6 grün** (Spore VALID, alle Inboxen VALID,
SIGNAL-Pflichtfelder, Cosinus-Sanity, Selbst-Cosinus=1, `*_inbox.verify.md` je Inbox).

## Ehrliche offene Punkte
- **Kein privater Schlüssel** in dieser Sitzung → Spore **nicht neu signiert** (auch nicht nötig,
  solange kein signiertes Feld geändert wird; nodeId hängt nur am Schlüssel). Bei echter
  Identitäts-Neuerzeugung: `sbkim/spore.json` + Inboxen aktualisieren, `seq`+1.
- **Keine offenen reziproken Handshakes mehr** — alle 5 Nachbarn ✔ bestätigt 2026-06-07 (5/5).
  Laufende Pflege: Briefkasten-Rhythmus §11.6 (Peer-`SIGNAL` lesen + `ack` quittieren bei Sitzungsstart).

## Nächste Schritte
- Briefkasten-Rhythmus §11.6: bei Sitzungsstart Peer-`SIGNAL.json` lesen + `ack` quittieren.
- Peer-Sporen periodisch frisch holen + reziprok prüfen (Inboxen + `.verify.md` aktuell halten).
- Optionale Härtung (§5 der Sicherheits-Tafel) bleibt eigene, bewusste Sitzung (Klaus entscheidet).
