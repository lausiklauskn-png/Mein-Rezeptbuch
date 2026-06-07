# Prüf-Vermerk — Jasons-Tresor (sbkim/jason_inbox.json)

> Reziproke Verifikation der eingegangenen Spore (SBKIM §11.3). Echte Krypto über
> `scripts/verify_foreign_spore.mjs` (Ed25519 / SHA-256, node:crypto, keine npm-Abhängigkeiten).
> Inbox ist eine **signatur-reine 1:1-Kopie** aus `raw/main` des Nachbarn.

| Feld | Wert |
|---|---|
| Knoten | Jasons-Tresor |
| nodeName | Jasons-Tresor |
| Domäne | Jasons-Tresor-Bibliothek |
| nodeId | `E13GDzIp0c7JfeZD0jVvFarNxPde8AcoP7qz7FtmdNM` |
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
- Reziprozität: einseitig (unsere Browser-Rechnung); reziproke Bestätigung steht aus.

_Erzeugt 2026-06-07. Nachrechnen: `node scripts/verify_foreign_spore.mjs sbkim/jason_inbox.json` + Cosinus im 📬-Briefkasten (live im Browser)._
