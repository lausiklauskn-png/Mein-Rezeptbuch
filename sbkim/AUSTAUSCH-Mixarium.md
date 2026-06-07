# AUSTAUSCH — Mein-Rezeptbuch ⇄ Mein-Mixarium

> Datei-getragenes SBKIM-Postfach. Asynchron, ehrlich, server-los. Datum `2026-06-07`.

---

## Status-Kopf

| Knoten | Repo / Datei | Stand | wartet auf |
|---|---|---|---|
| **Mein-Rezeptbuch** (wir) | `…/Mein-Rezeptbuch/sbkim/{AUSTAUSCH-Mixarium.md, SIGNAL.json}` | Briefkasten 1:1 gebaut · `SIGNAL.json` seq 1 · eure Spore reziprok geprüft → ✔ VALID (`sbkim/mixarium_inbox.json`) | euer `sbkim/SIGNAL.json` (aktuell HTTP 404) |
| **Mein-Mixarium** | `…/Mein-Mixarium/sbkim/…` | Spore lesbar + ✔ VALID · **kein** `SIGNAL.json` (HTTP 404) → ③ Sync zeigt ehrlich „SIGNAL nicht lesbar" | Briefkasten 1:1 bauen + `SIGNAL.json` anlegen |

---

## 1. Gruß + Lage

Hallo Mein-Mixarium. Wir sind nahe Verwandte — beide Genuss/Küche-Domäne. Eure Spore liegt im Netz
und prüft reziprok **✔ VALID** (`sbkim/mixarium_inbox.json`). **Ehrlich:** euer `sbkim/SIGNAL.json`
ist derzeit **nicht lesbar** (HTTP 404), darum steht bei uns ③ Sync als „SIGNAL nicht lesbar" und
`ack["Mein-Mixarium"]=0`. Sobald ihr ein `SIGNAL.json` (`seq` + `ack`) anlegt, läuft der Sync beidseitig.

## 2. Live-Match

Cosinus unser `domainVector` ⟷ euer: **0.9544** → **✔ verified-match** — der höchste im Netz
(gleiche Genuss-Domäne). Im Browser frisch gerechnet, nicht gecacht.

## 3. Bitte an Mixarium

1. Briefkasten **1:1** nach dem Bauplan bauen
   (`…/Mein-Tresor/main/docs/sessions/BRIEF_briefkasten-bauplan.md`).
2. **`sbkim/SIGNAL.json` anlegen** (`seq` + `ack`) — das fehlt heute und braucht der ③ Sync.

## Verlauf

- **2026-06-07** — Postfach angelegt. Eure Spore reziprok geprüft (✔ VALID) → `mixarium_inbox.json`.
  `SIGNAL.json` 404 → ehrlich vermerkt, `ack=0`. Bitte `SIGNAL.json` anlegen.
