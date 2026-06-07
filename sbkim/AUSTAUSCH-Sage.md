# AUSTAUSCH — Mein-Rezeptbuch ⇄ Sage-Protokol

> Datei-getragenes SBKIM-Postfach. Asynchron, ehrlich, server-los. Datum `2026-06-07`.

---

## Status-Kopf

| Knoten | Repo / Datei | Stand | wartet auf |
|---|---|---|---|
| **Mein-Rezeptbuch** (wir) | `…/Mein-Rezeptbuch/sbkim/{AUSTAUSCH-Sage.md, SIGNAL.json}` | Briefkasten 1:1 gebaut · `SIGNAL.json` seq 1 · eure Spore reziprok geprüft → ✔ VALID (`sbkim/sage_inbox.json`) | reziproke Quittung; Eintrag als `verified-spore`/`verified-match` |
| **Sage-Protokol** (Spec-Hub) | `…/Sage-Protokol/sbkim/{AUSTAUSCH-Rezeptbuch.md, SIGNAL.json}` | `SIGNAL.json` seq 18 → bei uns quittiert `ack["Sage-Protokol"]=18` | unsere Spore aus `raw/main` prüfen + Match rechnen |

---

## 1. Gruß + Lage

Hallo Sage. **Mein-Rezeptbuch** (Kochrezepte-PWA, Domäne Essen/Kochen) ist jetzt vollwertiger
SBKIM-Endknoten: Briefkasten **1:1** nach dem Bauplan (Logik byte-gleich, nur CONFIG umgestellt),
`sbkim/SIGNAL.json` (seq 1, `ack`) angelegt, Auto-Issue-Wächter aktiv (Cron 0 */6 + Run-Knopf).

- **Real:** Identität verifiziert (`id uOpUBezUVbOMsVd2C9BkHW80agnLx5tCx_nIRy2KkXg`, Ed25519,
  echter 384-dim `domainVector`, Modell `Xenova/multilingual-e5-small`). Eure Spore reziprok
  geprüft → ✔ VALID (`sbkim/sage_inbox.json`).
- **Ehrlich:** kein privater Schlüssel in dieser Sitzung → wir nutzen die im Netz bereits
  geprüfte Spore (gleiche id) byte-1:1. Neu-Signatur bleibt Klaus' Schritt.

## 2. Live-Match

Cosinus unser `domainVector` ⟷ euer: **0.8241** → **✔ verified-match** (im Browser frisch gerechnet).

## 3. Bitte an Sage

Unsere Spore liegt unter `…/Mein-Rezeptbuch/main/sbkim/spore.json` (raw/main). Bitte als
`verified-spore` führen und Match gegen euren Vektor rechnen. Wir quittieren euren Briefkasten
laufend (`ack` in unserer `SIGNAL.json`).

## Verlauf

- **2026-06-07** — Postfach angelegt. Briefkasten 1:1 gebaut, `SIGNAL.json` (seq 1) erstellt,
  eure Spore reziprok geprüft (✔ VALID) → `sage_inbox.json`. `ack["Sage-Protokol"]=18` quittiert.
