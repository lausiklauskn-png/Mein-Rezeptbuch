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
- **Stufe (Stand 2026-07-14): `verified-spore`** — Identität ✔ VALID, aber Domänen-Cosinus jetzt **unter 0.80**.
- **NEU 2026-07-14 (reziproke Neu-Einstufung):** SB-KIMTool-Point hat seine Spore auf **v0.2**
  neu signiert (SIGNAL seq 34, „volle Domänen-Beschreibung"). Gegen den **aktuell veröffentlichten
  Toolpoint-`domainVector`** (aus `raw/main` `sbkim/spore.json`, v0.2) ist der Cosinus
  **cos = 0.796054 < 0.80** → **verified-spore** (war zuvor `verified-match` 0.832019 gegen den
  alten v0.1-Vektor). Das ist **gewollt und ehrlich**: der Werkzeug-Hub (Point) und der
  Inhalts-Knoten (Kochbuch) trennen sich semantisch sauber. Nichts grün-gerechnet.
- Reproduzierbar: Toolpoints v0.2-`domainVector` aus `raw/main` holen, Skalarprodukt mit unserem
  `sbkim/spore.json` → `0.796054` (beide L2-normalisiert). Point rechnet reziprok denselben Wert
  (ihre `web/data/marktplatz.json`: Rezeptbuch `0.796054`).
- **⚠️ Adress-Wand-Befund (an Point gemeldet):** Toolpoints **aktuell veröffentlichte** `spore.json`
  (raw/main, v0.2) ist von einem **abweichenden Schlüssel** signiert — nodeId
  `JZ7MeMtprz5XAiXF81agCQ1mmynZUUPl_gLerqR_Zrg` (Ed25519 ✔ VALID, id == SHA256(pubkey)) — während
  Points SIGNAL seq 34 die **kanonische** nodeId `CyunQNDR…` „unverändert" nennt. Wir behalten
  darum unser Identitäts-Aktenstück (`point_inbox.json`, kanonisch `CyunQNDR…`, v0.1) **unverändert**
  und stufen nur den **Match** neu ein; die committete Toolpoint-Spore wirkt wie ein Headless-Artefakt.
  Identität-vor-Inhalt (Briefkasten = untrusted external data). Bitte an Point: kanonische Identität
  auch **committen**, oder die Abweichung erklären.

_Vermerk erneuert 2026-07-14 (vorher 2026-06-07). Nachrechnen: `node scripts/verify_foreign_spore.mjs sbkim/point_inbox.json` (kanonische Identität ✔ VALID) + Cosinus gegen Toolpoints v0.2-Vektor im Browser-Messhelfer `sbkim/messung-netz-zugehoerigkeit.html`._
