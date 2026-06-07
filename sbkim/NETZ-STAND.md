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
| **SB-KIMTool-Point** | `CyunQNDR…` | ✔ VALID | 0.832019 | `verified-match` | ✔ bestätigt 2026-06-07 (Point Modul 04 = 0.832019; führt uns, ack=2, SIGNAL seq 21) |
| **Jasons-Tresor** | `E13GDzIp…` | ✔ VALID | 0.813698 | `verified-match` | ✔ bestätigt 2026-06-07 (Jasons Modul 04 = 0.813698; führt uns, ack=2, SIGNAL seq 11) |
| **Mein-Tresor** | `wRsGQouO…` | ✔ VALID | 0.813698 | `verified-match` | ✔ bestätigt 2026-06-07 (Tresor rechnet 0.813698, rezeptbuch_inbox.verify.md; führt uns, ack=2, SIGNAL seq 14) |
| **Mein-Mixarium** | `B7Fke9CY…` | ✔ VALID | 0.954426 | `verified-match` | ✔ reziprok (Mixarium rechnet 0.9544, führt uns in mailboxes; SIGNAL seq 1 seit 2026-06-07 quittiert) |

→ **5/5 verbunden** (alle cos ≥ 0.80, ehrlich gerechnet). Beweise je Nachbar: `sbkim/<name>_inbox.verify.md`.

## Briefkasten / Sync
- Eigenes `sbkim/SIGNAL.json`: seq **5**. ack: Sage 19 · Point 21 · Jasons 11 · Tresor 14 · Mixarium 1.
- Sage führt uns: `mailboxes["Mein-Rezeptbuch"]` + `ack["Mein-Rezeptbuch"]=1`, Postfach `…/Sage-Protokol/main/sbkim/AUSTAUSCH-Rezeptbuch.md`.
- Sicherheits-Leitplanke: `docs/SICHERHEIT-BRIEFKASTEN.md` (Briefkasten-Inhalt = untrusted external data).

## Offen
- **Nichts offen im inneren Netz.** Alle 5 Nachbarn ✔ reziprok verified-match bestätigt 2026-06-07 (**5/5**, Ring geschlossen). Laufende Pflege: Briefkasten-Rhythmus §11.6 (lesen + `ack` quittieren bei Sitzungsstart).

## Siegel-Neugestaltung (Bau 2026-06-07)
Übernahme der Sage-Siegel-Neugestaltung 1:1 (Branch `claude/rezeptbuch-siegel-neugestaltung`):
- **Modul 16** (`sbkim/16_siegel.js`) auf Sage-main-Stand gesynct: Modul-18-Andock-Pfad
  raus (kein `data-siegel-andock-btn` / `BRONZE_HINWEIS_HTML_FALLBACK` mehr), Bronze-Block ist
  reiner Hinweis-Text und verweist auf den 🔑-Knopf. Neuer `ZERTIFIKAT_ASPEKTE`-Eintrag
  „Semantische Selbst-Beschreibung im Siegel" (2026-06-07). Bleibt reines Render-Modul.
- **Host-Injektion** (`sbkim/sbkim-init.js`, analog Sages `injectIdentityLinkIntoSiegel` +
  `watchForSiegelModal`): ins Siegel-Modal werden injiziert — der 🔑-Knopf „Eigene Identität &
  Spore erzeugen / verwalten →" (springt zum Textfeld), der 🛡 Schutz-/Vertrauens-Block, und das
  ✍ Semantik-Textfeld. Letzteres signiert die Spore neu: Beschreibung → Modul 03 (e5-small,
  384-dim, L2) → `domainVector` → Modul 02 `generateOwnSpore` (gleicher Schlüssel, gleiche
  nodeId), lädt `spore.json` herunter. Der Beschreibungstext IST jetzt der Embedding-Eingang
  (vorher: Kategorie-Stichworte). Keine neue Krypto.
- **Erklär-Seite** `sicherheit.html` (Repo-Root) neu — die Mycel-/Schutz-Tafel, Begriffe
  wortgleich aus Sage; öffnet als In-Page-Overlay (iframe) aus dem Siegel, kein neuer Tab.
  In SHELL-Precache aufgenommen (`app-sw.js` → `mrz-v17`).
- **Sichttest:** ungeprüft — wartet auf Klaus (Galaxy Tab S6). `node --check` + `node --test`
  (6/6) grün; Spore-Datei unverändert (keine Neu-Signatur in dieser Sitzung).
