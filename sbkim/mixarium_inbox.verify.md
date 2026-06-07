# Prüf-Vermerk — Mein-Mixarium (sbkim/mixarium_inbox.json)

> Reziproke Verifikation der eingegangenen Spore (SBKIM §11.3). Echte Krypto über
> `scripts/verify_foreign_spore.mjs` (Ed25519 / SHA-256, node:crypto, keine npm-Abhängigkeiten).
> Inbox ist eine **signatur-reine 1:1-Kopie** aus `raw/main` des Nachbarn.

| Feld | Wert |
|---|---|
| Knoten | Mein-Mixarium |
| nodeName | Mixarium Klaus |
| Domäne | lausiklauskn-png.github.io |
| nodeId | `B7Fke9CYTR1BrC3xOXzEY5q9RuRH8xxHPUuqRHV3utA` |
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
- **cos = 0.954426** (Schwelle ≥ 0.80) → **Stufe: verified-match**
- Reziprozität: **reziprok** — Mixarium führt uns in `mailboxes` und rechnet Mixarium ⟷ Rezeptbuch = 0.9544 (deckt sich); zusätzlich durch Sage-NETZ-STAND bezeugt (0.9544, 2026-05-17). Mixarium hat seit 2026-06-07 ein `SIGNAL.json` (seq 1) → ③ Sync läuft, bei uns `ack["Mein-Mixarium"]=1`.

_Erzeugt 2026-06-07. Nachrechnen: `node scripts/verify_foreign_spore.mjs sbkim/mixarium_inbox.json` + Cosinus im 📬-Briefkasten (live im Browser)._
