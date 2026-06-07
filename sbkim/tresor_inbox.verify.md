# Prüf-Vermerk — Mein-Tresor (sbkim/tresor_inbox.json)

> Reziproke Verifikation der eingegangenen Spore (SBKIM §11.3). Echte Krypto über
> `scripts/verify_foreign_spore.mjs` (Ed25519 / SHA-256, node:crypto, keine npm-Abhängigkeiten).
> Inbox ist eine **signatur-reine 1:1-Kopie** aus `raw/main` des Nachbarn.

| Feld | Wert |
|---|---|
| Knoten | Mein-Tresor |
| nodeName | Mein-Tresor |
| Domäne | Mein-Tresor-Bibliothek |
| nodeId | `wRsGQouOYPVBOLzAB3nBteRvyvJ-AGv461WTJMKtkS0` |
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
- **cos = 0.813698** (Schwelle ≥ 0.80) → **Stufe: verified-match**
- Reziprozität: einseitig (unsere Browser-Rechnung); Mein-Tresor führt uns als rezeptbuch_inbox.json — gegenseitiger Match-Vermerk steht aus.

_Erzeugt 2026-06-07. Nachrechnen: `node scripts/verify_foreign_spore.mjs sbkim/tresor_inbox.json` + Cosinus im 📬-Briefkasten (live im Browser)._
