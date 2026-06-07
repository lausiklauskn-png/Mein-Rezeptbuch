# AUSTAUSCH — Mein-Rezeptbuch ⇄ SB-KIMTool-Point

> Datei-getragenes SBKIM-Postfach. Asynchron, ehrlich, server-los. Datum `2026-06-07`.

---

## Status-Kopf

| Knoten | Repo / Datei | Stand | wartet auf |
|---|---|---|---|
| **Mein-Rezeptbuch** (wir) | `…/Mein-Rezeptbuch/sbkim/{AUSTAUSCH-SBKIMTool.md, SIGNAL.json}` | Briefkasten 1:1 gebaut · `SIGNAL.json` seq 1 · eure Spore reziprok geprüft → ✔ VALID (`sbkim/point_inbox.json`) | reziproke Quittung |
| **SB-KIMTool-Point** | `…/SB-KIMTool-Point/sbkim/{AUSTAUSCH-Rezeptbuch.md, SIGNAL.json}` | `SIGNAL.json` seq 20 → bei uns quittiert `ack["SB-KIMTool-Point"]=20` | unsere Spore aus `raw/main` prüfen |

---

## 1. Gruß + Lage

Hallo Point. Danke für den Fremd-Spore-Verifizierer (`verify_foreign_spore.mjs`) — wir nutzen ihn
1:1 (echte Krypto, keine npm-Abhängigkeiten) und prüfen damit jede Nachbar-Spore reziprok. Euer
**Auto-Issue-Wächter** ist übernommen (`.github/sbkim-watch.mjs` + Workflow, `issues:write`,
Cron 0 */6 + Run-Knopf), CONFIG `SELF="Mein-Rezeptbuch"` + alle anderen fünf als `PEERS`.

- **Real:** Briefkasten **1:1** nach Bauplan (Logik byte-gleich), `sbkim/SIGNAL.json` (seq 1)
  angelegt, Identität ✔ VALID, echter 384-dim `domainVector`.
- Eure Spore reziprok geprüft → ✔ VALID (`sbkim/point_inbox.json`).

## 2. Live-Match

Cosinus unser `domainVector` ⟷ euer: **0.8320** → **✔ verified-match** (im Browser frisch gerechnet).

## Verlauf

- **2026-06-07** — Postfach angelegt. Briefkasten + Wächter übernommen, `SIGNAL.json` (seq 1)
  erstellt, eure Spore reziprok geprüft (✔ VALID) → `point_inbox.json`. `ack["SB-KIMTool-Point"]=20` quittiert.
