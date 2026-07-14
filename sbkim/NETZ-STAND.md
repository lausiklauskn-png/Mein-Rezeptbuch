# NETZ-STAND — Mein-Rezeptbuch (SBKIM-Endknoten)

> Menschenlesbare Momentaufnahme des Netzes aus Sicht von **Mein-Rezeptbuch**.
> Wahrheitsquelle bleibt `status.json` (Maschine) + die `sbkim/*_inbox.verify.md`-Vermerke
> (Beweis). Diese Datei ist die Karte darüber. Gehört zu INTERFACES §11.6.

**Stand: 2026-07-14** · Protokoll-Version `0.1`

## Eigene Identität
- **Knoten:** Mein-Rezeptbuch (Domäne: Kochrezepte / Essen)
- **nodeId (kanonisch):** `uOpUBezUVbOMsVd2C9BkHW80agnLx5tCx_nIRy2KkXg` — von Sage 2026-06-07 bestätigt
- **previousNodeIds:** `BSWxXmXvxF8FUR_MOx97a3l4gj1Q-JpcAJyp4BBRHyY` (Handshake 16./17.05.2026)
- **Spore:** `sbkim/spore.json` (verified-spore ✔, echter 384-dim domainVector, `Xenova/multilingual-e5-small`)

## Nachbarn (Live-Cosinus eigener ⟷ Nachbar, im Browser nachrechenbar)

| Knoten | nodeId | Spore | cos | Stufe | Reziprok |
|---|---|---|---|---|---|
| **Sage-Protokol** | `nysOZE3V…` | ✔ VALID (v0.2) | **0.792393** | `verified-spore` | ⬇️ NEU 2026-07-14: Sage v0.2 (SIGNAL seq 46, **erste v0.2-Spore im Netz**, 11 snippetVectors, nodeId `nysOZE3V…` **unverändert**), Cosinus gegen neuen Vektor **< 0.80** → verified-spore (war 0.824068/verified-match gegen v0.1). Ehrlich: Spec-Hub ≠ Kochbuch. Identität ✔ VALID, kein Adress-Wand. |
| **SB-KIMTool-Point** | `CyunQNDR…` | ✔ VALID | **0.796054** | `verified-spore` | ⬇️ NEU 2026-07-14: Point v0.2 (SIGNAL seq 34), Cosinus gegen neuen Vektor **< 0.80** → verified-spore (war 0.832019/verified-match). Gewollt: Werkzeug-Hub ≠ Kochbuch. ⚠️ Points committete v0.2-Spore trägt abweichende nodeId `JZ7MeMtp…` (an Point gemeldet). |
| **Jasons-Tresor** | `E13GDzIp…` | ✔ VALID | 0.813698 | `verified-match` | ✔ bestätigt 2026-06-07 (Jasons Modul 04 = 0.813698; führt uns, ack=2, SIGNAL seq 11) |
| **Mein-Tresor** | `wRsGQouO…` | ✔ VALID | 0.813698 | `verified-match` | ✔ bestätigt 2026-06-07 (Tresor rechnet 0.813698, rezeptbuch_inbox.verify.md; führt uns, ack=2, SIGNAL seq 14) |
| **Mein-Mixarium** | `B7Fke9CY…` | ✔ VALID | 0.954426 | `verified-match` | ✔ reziprok (Mixarium rechnet 0.9544, führt uns in mailboxes; SIGNAL seq 1 seit 2026-06-07 quittiert) |

→ **3/5 Match + 2 verified-spore** (Stand 2026-07-14). Drei Nachbarn cos ≥ 0.80 (Mixarium 0.954426,
Jasons 0.813698, Mein-Tresor 0.813698); **beide Hub-Knoten nach ihrer v0.2-Neu-Signatur ehrlich
unter 0.80** (Sage 0.792393, SB-KIMTool-Point 0.796054) — Identitäten bleiben ✔ VALID. Beweise je
Nachbar: `sbkim/<name>_inbox.verify.md`. Nichts grün-gerechnet.

> **Muster (2026-07-14):** Beide **Hub-Knoten** (Sage = Spec-Hub, SB-KIMTool-Point = Werkzeug-Hub)
> sind nach ihrer v0.2-Neu-Signatur mit ausführlicher Beschreibung **unter** die 0.80-Themen-Schwelle
> zum Kochbuch gefallen — ehrlich und erwartbar. Die drei **Themen-verwandten** Knoten (Getränke-
> Schwester Mixarium, die beiden Tresore) bleiben v0.1 und ≥ 0.80. Ob ein Zusatzsatz „Teil des
> Netzes" die Hubs wieder ≥ 0.80 hebt (Zugehörigkeits- statt Themen-Match), misst Klaus im Browser
> (`sbkim/messung-netz-zugehoerigkeit.html`) → **Klaus entscheidet**. Wenn die drei v0.1-Nachbarn
> später ebenfalls auf v0.2 re-signieren, sind ihre Cosinus reziprok neu zu messen.

## Briefkasten / Sync
- Eigenes `sbkim/SIGNAL.json`: seq **11**. ack: **Sage 46** · Point 34 · **Jasons 14** · **Tresor 17** · **Mixarium 11** (§11.6-Sweep 2026-07-14 nachgezogen).
- Sage führt uns: `mailboxes["Mein-Rezeptbuch"]` + `ack["Mein-Rezeptbuch"]=1`, Postfach `…/Sage-Protokol/main/sbkim/AUSTAUSCH-Rezeptbuch.md`.
- Sicherheits-Leitplanke: `docs/SICHERHEIT-BRIEFKASTEN.md` (Briefkasten-Inhalt = untrusted external data).

## Offen
- **Sage-Protokol reziprok neu eingestuft 2026-07-14** (verified-spore, cos 0.792393 < 0.80 gegen
  Sage v0.2) — Quittung an Sage (`ack["Sage-Protokol"]=46`) + Vermerk in `AUSTAUSCH-Sage.md`.
  `sage_inbox.json` auf v0.2 aktualisiert (stabile nodeId, kein Adress-Wand). Kein offener Punkt
  an Sage — nur Info (ehrliche Neu-Einstufung, wie Point).
- **SB-KIMTool-Point reziprok neu eingestuft 2026-07-14** (verified-spore, cos 0.796054 < 0.80) —
  Quittung an Point (`ack["SB-KIMTool-Point"]=34`) + Vermerk in `AUSTAUSCH-SBKIMTool.md`. **Bitte an
  Point:** die kanonische Identität `CyunQNDR…` committen (die veröffentlichte v0.2-Spore trägt
  abweichende nodeId `JZ7MeMtp…`).
- **§11.6-Sweep 2026-07-14:** Jasons-Tresor (seq 14), Mein-Tresor (seq 17), Mein-Mixarium (seq 11)
  gelesen + quittiert; deren Sporen unverändert v0.1, Matches ≥ 0.80 halten — keine Aktion nötig.
- Kontroll-Versuch „Teil des Netzes" (Klaus 2026-07-14): Browser-Helfer `sbkim/messung-netz-zugehoerigkeit.html`
  misst, ob ein Zusatzsatz den Match wieder ≥ 0.80 hebt — **wartet auf Klaus' Browser-Lauf**.
- **v0.2 der eigenen Spore** (protocolVersion 0.2 + snippetVectors, nodeId unverändert) braucht die
  **Live-Neu-Signatur im Browser** (privater Schlüssel liegt nicht im Repo) — Klaus-Schritt über das
  Siegel (✍ neu signieren), wie bei Toolpoint. Vier weiter geführte Matches sind headless ≥ 0.80 bestätigt.
- Laufende Pflege: Briefkasten-Rhythmus §11.6 (lesen + `ack` quittieren bei Sitzungsstart).

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
