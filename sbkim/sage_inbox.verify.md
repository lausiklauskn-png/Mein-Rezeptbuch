# Prüf-Vermerk — Sage-Protokol (sbkim/sage_inbox.json)

> Reziproke Verifikation der eingegangenen Spore (SBKIM §11.3). Echte Krypto über
> `scripts/verify_foreign_spore.mjs` (Ed25519 / SHA-256, node:crypto, keine npm-Abhängigkeiten).
> Inbox ist eine **signatur-reine 1:1-Kopie** aus `raw/main` des Nachbarn.

| Feld | Wert |
|---|---|
| Knoten | Sage-Protokol |
| nodeName | Sage |
| Domäne | Mycel-Bibliothek |
| nodeId | `nysOZE3VuKqZA23i5G2XL67s41JIIykI58zXMtJkYfA` |
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
- **cos = 0.824068** (Schwelle ≥ 0.80) → **Stufe: verified-match**
- Reziprozität: **reziprok bestätigt** durch Sage 2026-06-07 (Modul 04 = 0.824068, deckt sich mit unserer Browser-Rechnung).

_Erzeugt 2026-06-07. Nachrechnen: `node scripts/verify_foreign_spore.mjs sbkim/sage_inbox.json` + Cosinus im 📬-Briefkasten (live im Browser)._
