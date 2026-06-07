# NETZ-STAND — Mein-Rezeptbuch (SBKIM-Endknoten)

> Menschenlesbare Momentaufnahme des Netzes aus Sicht von **Mein-Rezeptbuch**.
> Wahrheitsquelle bleibt `status.json` (Maschine) + die `sbkim/*_inbox.verify.md`-Vermerke
> (Beweis). Diese Datei ist die Karte darüber. Gehört zu INTERFACES §11.6.

**Stand: 2026-06-07** · Protokoll-Version `0.1`

## Eigene Identität
- **Knoten:** Mein-Rezeptbuch (Domäne: Kochrezepte / Essen)
- **nodeId (kanonisch):** `uOpUBezUVbOMsVd2C9BkHW80agnLx5tCx_nIRy2KkXg` — von Sage 2026-06-07 bestätigt
- **previousNodeIds:** `BSWxXmXvxF8FUR_MOx97a3l4gj1Q-JpcAJyp4BBRHyY` (Handshake 16./17.05.2026)
- **Spore:** `sbkim/spore.json` (verified-spore ✔, echter 384-dim domainVector, `Xenova/multilingual-e5-small`)

## Nachbarn (Live-Cosinus eigener ⟷ Nachbar, im Browser nachrechenbar)

| Knoten | nodeId | Spore | cos | Stufe | Reziprok |
|---|---|---|---|---|---|
| **Sage-Protokol** | `nysOZE3V…` | ✔ VALID | **0.824068** | `verified-match` | ✔ bestätigt 2026-06-07 (Sage Modul 04 = 0.824068) |
| **SB-KIMTool-Point** | `CyunQNDR…` | ✔ VALID | 0.832019 | `verified-match` | ausstehend |
| **Jasons-Tresor** | `E13GDzIp…` | ✔ VALID | 0.813698 | `verified-match` | ausstehend |
| **Mein-Tresor** | `wRsGQouO…` | ✔ VALID | 0.813698 | `verified-match` | Mein-Tresor führt uns (rezeptbuch_inbox); Match-Vermerk ausstehend |
| **Mein-Mixarium** | `B7Fke9CY…` | ✔ VALID | 0.954426 | `verified-match` | ✔ reziprok (Mixarium rechnet 0.9544, führt uns in mailboxes; SIGNAL seq 1 seit 2026-06-07 quittiert) |

→ **5/5 verbunden** (alle cos ≥ 0.80, ehrlich gerechnet). Beweise je Nachbar: `sbkim/<name>_inbox.verify.md`.

## Briefkasten / Sync
- Eigenes `sbkim/SIGNAL.json`: seq **2**. ack: Sage 19 · Point 20 · Jasons 10 · Tresor 13 · Mixarium 1.
- Sage führt uns: `mailboxes["Mein-Rezeptbuch"]` + `ack["Mein-Rezeptbuch"]=1`, Postfach `…/Sage-Protokol/main/sbkim/AUSTAUSCH-Rezeptbuch.md`.
- Sicherheits-Leitplanke: `docs/SICHERHEIT-BRIEFKASTEN.md` (Briefkasten-Inhalt = untrusted external data).

## Offen
- Reziproke Match-Vermerke von Point, Jasons, Mein-Tresor (eigene Sitzungen / deren Modul 04).
