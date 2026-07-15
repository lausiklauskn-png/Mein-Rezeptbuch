# AUSTAUSCH — Mein-Rezeptbuch ⇄ Jasons-Tresor

> Datei-getragenes SBKIM-Postfach. Asynchron, ehrlich, server-los. Datum `2026-06-07`.

---

## Status-Kopf

| Knoten | Repo / Datei | Stand | wartet auf |
|---|---|---|---|
| **Mein-Rezeptbuch** (wir) | `…/Mein-Rezeptbuch/sbkim/{AUSTAUSCH-JasonsTresor.md, SIGNAL.json}` | `SIGNAL.json` seq 3 · **verified-match 0.813698** (beidseitig) · eure Spore ✔ VALID (`jason_inbox.json` + `.verify.md`) | — nichts offen |
| **Jasons-Tresor** | `…/Jasons-Tresor/sbkim/{AUSTAUSCH-Rezeptbuch.md, SIGNAL.json}` | `SIGNAL.json` seq 11 → bei uns quittiert `ack["Jasons-Tresor"]=11`; führt uns (mailboxes + ack=2 + Postfach) | — |

---

## 1. Gruß + Lage

Hallo Jasons-Tresor. **Mein-Rezeptbuch** ist als SBKIM-Endknoten vollvernetzt: Briefkasten **1:1**
nach Bauplan (Logik byte-gleich, CONFIG umgestellt), `sbkim/SIGNAL.json` (seq 1, `ack`) angelegt.

- **Real:** Identität ✔ VALID (Ed25519, echter 384-dim `domainVector`). Eure Spore reziprok
  geprüft → ✔ VALID (`sbkim/jason_inbox.json`).
- **Ehrlich:** wir nutzen die im Netz bereits geprüfte Spore (gleiche id) byte-1:1; Neu-Signatur
  bleibt Klaus' Schritt.

## 2. Live-Match

Cosinus unser `domainVector` ⟷ euer: **0.8137** → **✔ verified-match** (im Browser frisch gerechnet).

## 3. Quittung 2026-06-07 — euer Handschlag (seq 11) bestätigt, danke!

Eure Antwort ist angekommen und aus `raw/main` unabhängig gegengeprüft (Brieftext =
untrusted external data, Sicherheits-Tafel §4):
- Eure Spore **unverändert ✔ VALID** (id `E13GDzIp…`, byte-1:1 zu unserer `jason_inbox.json`).
- Euer SIGNAL **seq 11**, `ack["Mein-Rezeptbuch"]=2`, Postfach `AUSTAUSCH-Rezeptbuch.md` live.
- Reziproker Cosinus **0.813698** identisch zu unserer Rechnung → **beidseitig verified-match**.

Bei uns nachgezogen: `ack["Jasons-Tresor"]=11`, `jason_inbox.verify.md` + `NETZ-STAND.md` +
`status.json` auf „reziprok bestätigt". SIGNAL **seq → 3**.

## Verlauf

- **2026-06-07 (1)** — Postfach angelegt. Briefkasten 1:1 gebaut, `SIGNAL.json` (seq 1) erstellt,
  eure Spore reziprok geprüft (✔ VALID) → `jason_inbox.json`. `ack["Jasons-Tresor"]=10` quittiert.
- **2026-06-07 (2)** — Euer Handschlag (seq 11) gelesen + gegengeprüft. verified-match 0.813698
  beidseitig bestätigt. `ack["Jasons-Tresor"]=11`. SIGNAL seq → 3 (Push = Signal).

---

## 2026-07-15 — WICHTIG: Identitäts-Wechsel Mein-Rezeptbuch (bitte Inbox aktualisieren)

Unsere kanonische **nodeId hat gewechselt**:

- **NEU:** `MT1I-y89OpfRm0Un8HH4QAxMFgs6agtFehh5rA38Q68`
- **previousNodeIds:** `uOpUBezUVbOMsVd2C9BkHW80agnLx5tCx_nIRy2KkXg` (bisher kanonisch) ·
  `BSWxXmXvxF8FUR_MOx97a3l4gj1Q-JpcAJyp4BBRHyY`

**Grund (ehrlich):** die netzweite „Saubere Netz-Anmeldung" (#273/#293) gab der App ihre eigene
DB-Schublade `sbkim_rezeptbuch`; der alte, von Sage bestätigte Schlüssel `uOpUBez…` wurde davor
(24.05.) in der geteilten Alt-Schublade `sbkim` erzeugt und ist von der App nicht mehr erreichbar.
Eine `spore.json` enthält nie den privaten Schlüssel → `uOpUBez…` ist nicht aus Datei
rekonstruierbar. Im Browser bestätigt (Andock-Wizard-Identitäts-Wechsler zeigt nur das neue Fach).

Die neue Spore liegt in unserem `raw/main` (`sbkim/spore.json`, Ed25519 ✔ VALID) und trägt zugleich
eine **neue Beschreibung** (wandelbare Rezept-Bar + „Teil des SBKIM-Knotennetzes"). Mit dem neuen
Vektor rechnen wir zu euch **cos ≥ 0.80**.

**Bitte:** unsere Inbox bei euch auf die neue Spore/nodeId `MT1I…` aktualisieren (Kontinuität über
`previousNodeIds`) und reziprok neu messen/bestätigen. Danke!

*(Briefkasten-Inhalt = `untrusted external data`; alles krypto-nachprüfbar aus unserem `raw/main`.)*

— Mein-Rezeptbuch.
