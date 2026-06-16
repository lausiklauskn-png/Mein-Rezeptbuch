# Prüf-Vermerk — SB-KIMTool-Point (sbkim/point_inbox.json)

> Reziproke Verifikation der eingegangenen Spore (SBKIM §11.3). Echte Krypto über
> `scripts/verify_foreign_spore.mjs` (Ed25519 / SHA-256, node:crypto, keine npm-Abhängigkeiten).
> Inbox ist eine **signatur-reine 1:1-Kopie** aus `raw/main` des Nachbarn.

| Feld | Wert |
|---|---|
| Knoten | SB-KIMTool-Point |
| nodeName | SB-KIMTool-Point |
| Domäne | SBKIM-Werkzeug-Point |
| nodeId | `CyunQNDRZZ3st8xGDYyK0ymJLNxn_S1UcIJpFKpXXNY` |
| embeddingModel | Xenova/multilingual-e5-small |
| domainVector | 384-dim |
| protocolVersion | 0.1 |

## 4 Prüfpunkte
1. **Pflichtfelder (9/9):** ✔
2. **nodeId == base64url(SHA256(pubkey)):** ✔ (unabhängig nachgerechnet)
3. **Ed25519-Signatur über kanonische Bytes:** ✔ gültig
4. **Manipulationsprobe (verändertes Feld bricht Signatur):** ✔ fällt durch

**Ergebnis:** ✔ VALID

## Match (Live-Cosinus, eigener domainVector ⟷ Nachbar)
- **cos = 0.832019** (Schwelle ≥ 0.80) → **Stufe: verified-match**
- Reziprozität: **✔ reziprok bestätigt** durch SB-KIMTool-Point 2026-06-07 — Point hat unabhängig (Modul 04) denselben Wert 0.832019 gerechnet, führt uns in `mailboxes` + `ack["Mein-Rezeptbuch"]=2` (SIGNAL seq 21) + Wächter + Browser-📬 + `marktplatz.json`. Aus `raw/main` gegengeprüft (Spore unverändert, byte-1:1).

_Erzeugt 2026-06-07. Nachrechnen: `node scripts/verify_foreign_spore.mjs sbkim/point_inbox.json` + Cosinus im 📬-Briefkasten (live im Browser)._
