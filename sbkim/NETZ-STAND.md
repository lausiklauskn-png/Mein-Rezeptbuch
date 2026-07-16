# NETZ-STAND — Mein-Rezeptbuch (SBKIM-Endknoten)

> Menschenlesbare Momentaufnahme des Netzes aus Sicht von **Mein-Rezeptbuch**.
> Wahrheitsquelle bleibt `status.json` (Maschine) + die `sbkim/*_inbox.verify.md`-Vermerke
> (Beweis). Diese Datei ist die Karte darüber. Gehört zu INTERFACES §11.6.

**Stand: 2026-07-15** · Protokoll-Version `0.1`

## Eigene Identität
- **Knoten:** Mein-Rezeptbuch (Domäne: Kochrezepte / Essen — wandelbare Rezept-Bar)
- **nodeId (frisch, kanonisch):** `MT1I-y89OpfRm0Un8HH4QAxMFgs6agtFehh5rA38Q68`
  — live im Browser signiert (Ed25519 ✔ VALID), im Browser bestätigt (Andock-Wizard Identitäts-Wechsler
  zeigt nur Fach „main" = MT1I).
- **previousNodeIds:** _(leer)_ — **GENERALTEST 2026-07-15:** alte Identitäten `uOpUBez…`/`BSWxXmX…`
  **komplett entfernt**, kein Zurückholen (Klaus' Entscheidung „ganz einfach, keine Tricks").
- **Generaltest — frische Neuanmeldung:** alle Knoten werfen ihre alten Identitäten weg und melden sich
  **frisch neu an** (Modul 23 „🧹 Aufräumen & neu anmelden"), dann handshaken alle **neu im gemeinsamen
  Raum**. MT1I bleibt Rezeptbuchs frische, saubere Identität (heute in der eigenen Schublade
  `sbkim_rezeptbuch` erzeugt). Reziproke Bekanntschaft wird **im Raum frisch aufgebaut**.
- **Spore:** `sbkim/spore.json` (✔ VALID, echter 384-dim domainVector, `Xenova/multilingual-e5-small`,
  neue Beschreibung: wandelbare Rezept-Bar/Baukasten + „Teil des SBKIM-Knotennetzes").

## Nachbarn (Live-Cosinus eigener ⟷ Nachbar, im Browser nachrechenbar)

Cosinus jetzt mit dem **neuen `MT1I…`-Vektor** (neue Beschreibung) gerechnet:

| Knoten | nodeId | Spore | cos | Stufe | Reziprok |
|---|---|---|---|---|---|
| **Sage-Protokol** | `nysOZE3V…` | ✔ VALID (v0.2) | **0.881144** | `match (reziprok ausstehend)` | ⬆️ 2026-07-15: mit neuem MT1I-Vektor **≥ 0.80** (war 0.792393 gegen alten uOpUBez-Vektor). Der „Teil des Netzes"-Satz holt den Spec-Hub zurück. Sage kennt uns noch als `uOpUBez…` → Identitäts-Wechsel gemeldet (`AUSTAUSCH-Sage.md`). |
| **SB-KIMTool-Point** | `CyunQNDR…` | ✔ VALID | **0.864109** | `match (reziprok ausstehend)` | ⬆️ 2026-07-15: mit neuem MT1I-Vektor **≥ 0.80** (war 0.796054). Identitäts-Wechsel gemeldet (`AUSTAUSCH-SBKIMTool.md`). ⚠️ Points committete v0.2-Spore trägt abweichende nodeId `JZ7MeMtp…`. |
| **Jasons-Tresor** | `E13GDzIp…` | ✔ VALID | **0.842400** | `match (reziprok ausstehend)` | 2026-07-15: mit MT1I-Vektor 0.842400 (war 0.813698). Kennt uns noch als `uOpUBez…` → gemeldet (`AUSTAUSCH-JasonsTresor.md`). |
| **Mein-Tresor** | `wRsGQouO…` | ✔ VALID | **0.842400** | `match (reziprok ausstehend)` | 2026-07-15: mit MT1I-Vektor 0.842400 (war 0.813698). Gemeldet (`AUSTAUSCH-MeinTresor.md`). |
| **Mein-Mixarium** | `B7Fke9CY…` | ✔ VALID | **0.838384** | `match (reziprok ausstehend)` | 2026-07-15: mit MT1I-Vektor 0.838384 (war 0.954426; niedriger, weil die neue Beschreibung breiter ist — weiter ≥ 0.80). Gemeldet (`AUSTAUSCH-Mixarium.md`). |

→ **5/5 cos ≥ 0.80** mit dem MT1I-Vektor (unsere Rechnung, letzter bekannter Stand). **GENERALTEST
2026-07-15:** die reziproke Bekanntschaft wird **frisch im Raum neu aufgebaut** — alle Knoten melden
sich neu an und handshaken neu (Modul 23). Kein Kontinuitäts-Link nötig. Melden sich Nachbarn mit
neuer Identität an, ziehen wir sie via Raum/§11.6 nach. Beweise je Nachbar-Spore:
`sbkim/<name>_inbox.verify.md`. Nichts grün-gerechnet.

> **Muster (2026-07-15):** Der Beschreibungs-Vektor (wandelbare Rezept-Bar + „Teil des
> SBKIM-Knotennetzes") hebt **beide Hub-Knoten ≥ 0.80** (Sage 0.881, Point 0.864) — der
> Kontroll-Versuch ist beantwortet: der Zugehörigkeits-Satz holt die Hubs zurück. Der **Generaltest**
> baut die Bekanntschaft aller Knoten **frisch** neu auf (saubere Neuanmeldung im Raum), ohne alte
> Identitäten mitzuschleppen.

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
