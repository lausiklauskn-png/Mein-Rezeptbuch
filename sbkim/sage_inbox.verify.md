# Prüf-Vermerk — Sage-Protokol (sbkim/sage_inbox.json)

> Reziproke Verifikation der eingegangenen Spore (SBKIM §11.3). Echte Krypto über
> `scripts/verify_foreign_spore.mjs` (Ed25519 / SHA-256, node:crypto, keine npm-Abhängigkeiten).
> Inbox ist eine **signatur-reine 1:1-Kopie** aus `raw/main` des Nachbarn.

| Feld | Wert |
|---|---|
| Knoten | Sage-Protokol |
| nodeName | Sage |
| Domäne | Mycel-Bibliothek (SBKIM-Spezifikations- und Bau-Hub) |
| nodeId | `nysOZE3VuKqZA23i5G2XL67s41JIIykI58zXMtJkYfA` |
| embeddingModel | Xenova/multilingual-e5-small |
| domainVector | 384-dim |
| protocolVersion | **0.2** (11 snippetVectors) |

## 4 Prüfpunkte
1. **Pflichtfelder (9/9):** ✔
2. **nodeId == base64url(SHA256(pubkey)):** ✔ (unabhängig nachgerechnet)
3. **Ed25519-Signatur über kanonische Bytes:** ✔ gültig
4. **Manipulationsprobe (verändertes Feld bricht Signatur):** ✔ fällt durch

**Ergebnis:** ✔ VALID

## Match (Live-Cosinus, eigener domainVector ⟷ Nachbar)
- **cos = 0.792393** (Schwelle ≥ 0.80) → **Stufe: verified-spore** (unter 0.80).
- **Reziproke Neu-Einstufung 2026-07-14:** Sage hat seine Live-Spore auf **v0.2** neu signiert
  (Klaus' Browser, Siegel-Knopf — erste v0.2-Spore im Netz, SIGNAL seq 46, ausführliche
  Domänen-Beschreibung + 11 snippetVectors, `nodeId nysOZE3V… UNVERÄNDERT`). Der Cosinus
  gegen Sages **neuen** domainVector fällt von **0.824068 (v0.1) auf 0.792393** — knapp unter
  die 0.80-Schwelle. **Ehrlich und erwartbar:** der SBKIM-Spezifikations-Hub mit sehr breiter,
  protokoll-fokussierter Beschreibung ist semantisch weiter vom Kochbuch entfernt als 0.80.
  Identität ✔ VALID, kein Adress-Wand (committete nodeId == kanonische nodeId). Analog zur
  SB-KIMTool-Point-Neu-Einstufung (2026-07-14). `ack["Sage-Protokol"]=46`.

_Erzeugt 2026-06-07, aktualisiert 2026-07-14 (v0.2-Neu-Einstufung). Nachrechnen:
`node scripts/verify_foreign_spore.mjs sbkim/sage_inbox.json` + Cosinus im 📬-Briefkasten
(live im Browser)._
