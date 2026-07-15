# PULS — Mein-Rezeptbuch (SBKIM-Endknoten)

> Aktueller Stand des Knotens für die nächste Sitzung. Kurz, ehrlich, real vs. Demo getrennt.
> Letzte Aktualisierung: **2026-07-15**.

## 2026-07-15 (c) — Identitäts-Befund + Andock-Wizard ins Siegel portiert (aus Sage)

**Befund (Klaus' Browser-Signatur ergab eine NEUE Identität):**
- Klaus hat im Siegel ✍ neu signiert → die App lieferte **`MT1I-y89Opf…`** statt der kanonischen
  **`uOpUBez…`**. Ursache diagnostiziert: die netzweite „Saubere Netz-Anmeldung" (#273/#293) führte
  den `dbSuffix "rezeptbuch"` ein → die App liest jetzt die Schublade `sbkim_rezeptbuch`; der alte,
  von Sage bestätigte Schlüssel `uOpUBez…` wurde davor (24.05.) in der geteilten Alt-Schublade
  `sbkim` erzeugt. Die Migrations-Automatik (`migrateIdentityFrom`, in Modul 01/23 vorhanden, läuft
  bei Start) fand **nichts** → also liegt `uOpUBez…` **nicht (mehr) in diesem Browser**.
- **Eine `spore.json` enthält nie den privaten Schlüssel** → `uOpUBez…` ist aus keiner Datei
  rekonstruierbar. Rückholbar nur, wenn er noch auf einem **anderen Gerät/Browser** lebt (dann:
  Backup dort exportieren → hier wiederherstellen).
- **Voreiligen Identitäts-Wechsel zurückgenommen** — nichts committet; das Netz kennt weiter `uOpUBez…`.
  (spore.json/status.json/SIGNAL.json/NETZ-STAND unverändert auf uOpUBez.)

**Gebaut (Klaus: „Tool einbauen — ja"):** der **Andock-Wizard ins Siegel portiert** (aus Sage, der
Quelle der Wahrheit; Skill „status-leiste-siegel"). `sbkim/sbkim-init.js`: neues Modal `#rez-andock-modal`
(z-index über dem Siegel), das der 🔑-Knopf jetzt öffnet (statt nur zum ✍-Feld zu springen). **Fünf
Bausteine** über die echten Module 02/03: (1) Identität anzeigen/erzeugen · (2) Spore signieren +
Download (mit Modell-Ladebalken) · (3) **verschlüsseltes Backup** (PBKDF2 600k + AES-GCM-256) ·
(4) **Wiederherstellen** (importBackup, auch auf neuem Gerät) · (5) **Identitäts-Wechsler**
(listIdentities/setActiveIdentity — zeigt früher erzeugte Identitäten). Kern-Module unangetastet,
kein PII, privater Schlüssel bleibt im Browser. `node --check` grün, `node --test` **7/7 grün**.
SW ist network-first → Klaus bekommt die neue Datei nach Reload.

**Offen / wartet auf Klaus (Browser):**
- Siegel öffnen → 🔑 → **Identitäts-Wechsler** ansehen: steht dort evtl. `uOpUBez…`? Oder auf einem
  anderen Gerät ein **Backup exportieren** (Schritt 3) und hier **wiederherstellen** (Schritt 4).
- Danach entscheiden: `uOpUBez…` zurückgeholt → damit neu signieren (neue Beschreibung), ODER
  `MT1I…` als neue offizielle Identität übernehmen (dann Nachbarn informieren — vorbereitet).

---

## 2026-07-15 (b) — Klaus-Entscheid: neue Beschreibung „wandelbare Rezept-Bar + Teil des Netzes"

**Klaus' Entscheidung (Chat 2026-07-15):**
- **Netz-Satz „Teil des SBKIM-Knotennetzes" → JA, aufnehmen** — unabhängig vom Zahlen-Match
  (Zugehörigkeit gehört in die Identität).
- **Wandelbare App = kein Umbau** („die App kann das schon"): der **beschreibende Text** der
  wandelbaren „Rezept-Bar" (Baukasten, nicht auf ein Thema festgelegt — Backstube, Grill-Buch,
  Frühstücksbar …; jedes Rezept = Zutaten + Schritte, bis zu den Zutaten eines Chemiebaukastens)
  soll **in den Embedding-/Cosinus-Text** (Spore-`domainDescription`). Quelle: die Bar-Sektion der
  **Mein-Rezeptbuch-Page** („Bau dir deine eigene Rezept-Bar — das Rezeptbuch ist ein Baukasten").

**Getan (headless, kein Modell nötig):**
- **`SBKIM_REZEPTBUCH_DESCRIPTION`** (in `sbkim/sbkim-init.js`) auf den neuen Text erweitert:
  Kochrezepte-Basis + **wandelbarer Rezept-Baukasten (Bar)** + **„Teil des SBKIM-Knotennetzes rund
  um Sage-Protokoll und SB-KIMTool-Point"**. Das ist der Text, den das Siegel ✍ zum **Neu-Signieren
  (v0.2)** vorschlägt (`defaultDomainDescription` zieht denselben Konstanten). `node --check` grün,
  `sbkim-init.js` wird direkt von `index.html` geladen (kein `build.py` nötig).
- **Messhelfer** `sbkim/messung-netz-zugehoerigkeit.html` misst jetzt **Zeile 1 = aktuelle
  (signierte) Beschreibung** (Selbst-Test ≈ 0.796054 / 0.792393) vs **Zeile 2 = NEUE volle
  Beschreibung** (Bar + Netz) — beide Hubs. So sieht Klaus im Browser, wohin die neue Beschreibung
  rutscht (informativ; der Netz-Satz kommt so oder so rein).
- **Drift-Guard + `node --test` weiter 7/7 grün** (Anker/Selbst-Test-Konstanten unangetastet).
- **Spore selbst unverändert** — die neue Beschreibung wirkt erst nach **Live-Neu-Signatur v0.2 im
  Browser** (privater Schlüssel nicht im Repo). Editiere ich `spore.json` headless, bräche die Signatur.

**Offen / wartet auf Klaus (Browser):**
1. **Messen** (optional, informativ): `sbkim/messung-netz-zugehoerigkeit.html` → „🔎 Messen" —
   Selbst-Test Zeile 1 muss ≈ 0.796054 / 0.792393 zeigen; Zeile 2 zeigt die neue Beschreibung.
2. **v0.2 live neu signieren** über das **Siegel (✍ Semantik-Beschreibung → Spore neu signieren)**:
   das Feld ist mit dem **neuen** Text vorbelegt — prüfen/ggf. anpassen → signieren → das ausgegebene
   Spore-JSON committen (protocolVersion 0.2, nodeId unverändert). Danach: alle Peer-Matches + eigene
   Signatur headless prüfen (`node --test`), Akten (`NETZ-STAND`, `status.json`) nachziehen.

---

## 2026-07-15 — §11.6-Sweep sauber + Messhelfer-Anker headless verifiziert + Drift-Guard

**Getan:**
- **§11.6-Sweep (alle 5 Peers aus deren `raw/main` gelesen):** Sage seq **46**, SB-KIMTool-Point
  **34**, Jasons-Tresor **14**, Mein-Tresor **17**, Mein-Mixarium **11** — **alle exakt gleich
  unserem `ack`**. Nichts Ungelesenes, keine neue Peer-v0.2-Spore, **kein Handlungsbedarf**.
- **Messhelfer-Anker headless verifiziert** (reine Vektor-Rechnung, kein Modell): der Kontroll-
  Versuchs-Helfer `sbkim/messung-netz-zugehoerigkeit.html` misst gegen die **richtigen** Anker —
  `cos(spore, VEC_SAGE) = 0.792393` und `cos(spore, VEC_TP) = 0.796054` reproduzieren die im Helfer
  angezeigten Selbst-Test-Werte **exakt**; `VEC_SAGE` ist **byte-1:1** Sages committete v0.2-Spore
  (cos 1.000000 zu `sage_inbox.json`); `VEC_TP` ist Points v0.2-Vektor (bewusst ≠ kanonisch
  `point_inbox.json` v0.1, cos 0.887890 — Adress-Wand, siehe NETZ-STAND). Der Helfer wird also
  korrekt messen, sobald Klaus ihn im Browser öffnet.
- **Drift-Guard-Test ergänzt** (`test/sbkim.test.js`, additiv): rechnet die Helfer-Anker gegen die
  eigene Spore und stellt sicher, dass die im UI genannten Selbst-Test-Werte reproduzierbar bleiben.
  Genau diese Konstante war letzte Sitzung veraltet (`0.824068`) — der Test verhindert, dass so ein
  stummer Drift wiederkehrt. `node --test` jetzt **7/7 grün**.

**Ehrlich zur Grenze (warum (a)/(b) nicht headless erledigt sind):**
- Die **eigentliche Messung** (neuen Text OHNE/MIT Netz-Satz einbetten) braucht das Modell
  `Xenova/multilingual-e5-small`. Ein Versuch, sie headless zu reproduzieren (transformers.js 2.17.2,
  identische Pipeline `pooling:mean,normalize:true`, Präfix `passage:`), scheiterte: die
  **Org-Egress-Politik blockt `huggingface.co` (403)** aus dieser Sitzung, und das Modell liegt
  nicht im Repo (`models/` fehlt). Das ist eine echte Umgebungs-Grenze, **kein** offener Bau —
  im normalen Browser (CDN + HF erreichbar) läuft der Helfer. **Nicht erneut headless versuchen.**

**Offen / wartet auf Klaus (Browser) — unverändert:**
- **Kontroll-Versuch messen** (`sbkim/messung-netz-zugehoerigkeit.html` → „🔎 Messen"): hebt der
  Zusatz „… Teil des SBKIM-Knotennetzes …" **einen der beiden Hubs** (Sage/Point) wieder ≥ 0.80?
  Selbst-Test OHNE Zusatz muss ≈ Toolpoint **0.796054** / Sage **0.792393** anzeigen (headless
  bestätigt: die Anker stimmen). Ergebnis (OHNE + MIT, beide Hubs) → **Klaus entscheidet** Satz ja/nein.
- **Eigene Spore auf v0.2** (protocolVersion 0.2 + snippetVectors, nodeId unverändert) braucht die
  **Live-Neu-Signatur im Browser** (privater Schlüssel nicht im Repo) — Klaus-Schritt über Siegel (✍).
- Browser-Sichttest des Messhelfers.

**Manual-Check:** Headless `node --test` 7/7 grün. Browser-Pfade (Messung, v0.2-Signatur) **ungeprüft,
warten auf Klaus' Browser-Lauf** — headless nicht erreichbar (HF-Egress geblockt, s.o.).

---

## 2026-07-14 (b) — §11.6-Sweep: Sage reziprok neu eingestuft (v0.2) + Messhelfer-Selbsttest korrigiert

**Getan:**
- **Briefkasten-Sweep §11.6 (alle Peers geprüft, nicht nur Sage):** Sage seq 43→**46**,
  Jasons 11→**14**, Mein-Tresor 14→**17**, Mein-Mixarium 1→**11** waren ungelesen; alle gelesen
  + quittiert. Nur **Sages** committete Spore hat sich geändert (v0.2); die anderen drei sind
  unverändert v0.1 (stabile nodeId, Matches ≥ 0.80 halten) → nur `ack` nachgezogen, keine Aktion.
- **Sage reziprok neu eingestuft → `verified-spore`:** Sage hat seine Live-Spore auf **v0.2** neu
  signiert (**erste v0.2-Spore im Netz**, SIGNAL seq 46, 11 snippetVectors, `nodeId nysOZE3V…`
  **unverändert** = kein Adress-Wand, Signatur ✔ VALID). Cosinus unser `domainVector` ⟷ Sage
  **v0.2** = **0.792393 < 0.80** (war 0.824068 gegen v0.1). **Ehrlich und erwartbar** — der
  Spec-Hub ist mit sehr breiter Beschreibung semantisch weiter vom Kochbuch als 0.80, **genau
  wie SB-KIMTool-Point** (0.796054). `sage_inbox.json` byte-1:1 auf v0.2 aktualisiert;
  `sage_inbox.verify.md`, `NETZ-STAND.md`, `status.json` (jetzt **3/5 Match + 2 verified-spore**),
  `SIGNAL.json` seq → **11**, `ack["Sage-Protokol"]=46`, Quittung in `AUSTAUSCH-Sage.md`.
- **Messhelfer-Selbsttest korrigiert (Befund dieser Sitzung):** `sbkim/messung-netz-zugehoerigkeit.html`
  nutzt als Sage-Referenz bereits Sages **Live-v0.2-Vektor** (`VEC_SAGE`, cos 1.000000 zu Sages
  committeter Spore) — aber der Selbsttest-Text nannte noch den **alten** v0.1-Erwartungswert
  **0.824068**. Korrigiert auf **0.792393** (sonst hätte Klaus' Selbst-Test „falsch gemessen"
  angezeigt). Damit misst der Kontroll-Versuch jetzt ehrlich gegen **beide** v0.2-Hub-Vektoren.
- **Headless-Beweis:** `node --test` **6/6 grün**; alle fünf `*_inbox.json` + eigene Spore ✔ VALID;
  cos 0.792393 (Sage v0.2) und 0.796054 (Point v0.2) reproduziert; drei Themen-Matches
  (Mixarium 0.954426, Jasons 0.813698, Mein-Tresor 0.813698) headless **≥ 0.80** bestätigt.

**Offen / wartet auf Klaus (Browser):**
- **Kontroll-Versuch messen** (`sbkim/messung-netz-zugehoerigkeit.html` → „Messen"): hebt der Zusatz
  „… Teil des SBKIM-Knotennetzes …" **einen der beiden Hub-Knoten** (Sage/Point) wieder ≥ 0.80?
  Danach entscheidet Klaus, ob der Satz dauerhaft in die eigene `domainDescription` soll.
- **Strategie-Frage (jetzt schärfer):** BEIDE Hubs sind nach v0.2 unter 0.80 — nur Themen-verwandte
  Knoten (Mixarium, die Tresore) bleiben Match. Will Klaus **Zugehörigkeits-Match** (Netz-Satz) oder
  **reines Themen-Match** (ehrlich: Kochbuch matcht Hubs nicht mehr)?
- **Eigene Spore auf v0.2** (protocolVersion 0.2 + snippetVectors, nodeId unverändert) braucht die
  **Live-Neu-Signatur im Browser** (privater Schlüssel nicht im Repo) — Klaus-Schritt über das Siegel (✍).
- Browser-Sichttest des Messhelfers.

---

## 2026-07-14 — Reziproke Neu-Einstufung SB-KIMTool-Point (v0.2) + Kontroll-Versuch vorbereitet

**Getan:**
- **SB-KIMTool-Point reziprok neu eingestuft:** Point hat auf **v0.2** neu signiert (volle
  Domänen-Beschreibung, ihr SIGNAL seq 34). Cosinus unser `domainVector` ⟷ Points **v0.2-Vektor**
  = **0.796054 < 0.80** → **`verified-spore`** (war `verified-match` 0.832019 gegen v0.1). **Ehrlich
  und gewollt** — Werkzeug-Hub ≠ Kochbuch. Nachgezogen: `point_inbox.verify.md`, `NETZ-STAND.md`,
  `status.json` (4/5 Match + 1 verified-spore), `SIGNAL.json` seq → **10**, `ack["SB-KIMTool-Point"]=34`.
- **Adress-Wand-Befund gemeldet:** Points **committete** v0.2-Spore (raw/main) trägt eine
  **abweichende nodeId** `JZ7MeMtp…` (Ed25519 ✔ VALID) statt der kanonischen `CyunQNDR…`. Darum
  `point_inbox.json` (kanonisch `CyunQNDR…`) **unverändert** gelassen, nur der Match neu eingestuft.
  Bitte an Point in `AUSTAUSCH-SBKIMTool.md`: kanonische Identität committen.
- **Kontroll-Versuch „Teil des Netzes"** gebaut: Browser-Messhelfer `sbkim/messung-netz-zugehoerigkeit.html`
  misst ohne/mit dem Zusatzsatz den Cosinus zu Toolpoint **und** Sage (server-los, Modul 03).
- Vier weiter als `verified-match` geführte Nachbarn **headless ≥ 0.80** bestätigt.
- Tests: `node --test` **6/6 grün**; `point_inbox.json` ✔ VALID; Cosinus 0.796054 reproduziert.

**Offen / wartet auf Klaus (Browser):**
- Kontroll-Versuch **messen** (Helfer öffnen, „Messen") → hebt der Satz den Match ≥ 0.80? Danach
  entscheidet Klaus, ob der Satz dauerhaft rein soll.
- **v0.2 der eigenen Spore** (protocolVersion 0.2 + snippetVectors, nodeId unverändert) braucht die
  **Live-Neu-Signatur im Browser** (privater Schlüssel nicht im Repo) — Klaus-Schritt über das Siegel (✍).
- Browser-Sichttest des Messhelfers.

---


## Identität
- **Knoten:** Mein-Rezeptbuch (Kochrezepte-PWA, Domäne Essen/Kochen)
- **nodeId (kanonisch):** `uOpUBezUVbOMsVd2C9BkHW80agnLx5tCx_nIRy2KkXg` (Ed25519, **verified-match ✔**)
  — von Sage 2026-06-07 als kanonisch bestätigt; alte Handshake-id `BSWxXmX…` → `previousNodeIds`.
- **Spore:** `sbkim/spore.json` — 9/9 Pflichtfelder, echter 384-dim `domainVector`
  (`Xenova/multilingual-e5-small`), lokal mit `scripts/verify_foreign_spore.mjs` → **✔ VALID**.
  Keine Neu-Signatur nötig (kein signiertes Feld geändert; byte-1:1, `protocolVersion 0.1`).

## Was in dieser Sitzung gebaut wurde (SBKIM-Briefkasten, 1:1 nach Mein-Tresor-Bauplan)
- **📬-Knopf im Gesicht** (Top-Header der App) mit **Gold-Zähler** (`#sbkim-mailbox-badge`,
  #C9A961) = Anzahl ungelesener Briefe (`seq>ack`); stiller Lade-Check setzt die Badge.
- **Dialog** `#sbkim-mailbox-dialog` mit **SBKIM-Siegel** (`assets/sbkim-siegel-wappen.svg`),
  drei Ebenen je Nachbar (① Spore ② Match ③ Sync) + „X/N verbunden".
- **CONFIG + Logik:** `sbkimMailboxFetch`, `sbkimCosine`, `sbkimMailboxCheck` **byte-gleich**
  zum Bauplan (4953 B identisch verifiziert); nur CONFIG umgestellt (`self="Mein-Rezeptbuch"`,
  Vollvernetzung §7 = alle anderen fünf als `peers`).
- **Daten:** `sbkim/SIGNAL.json` (seq 1, `ack`-Map) **neu angelegt**; je Nachbar reziprok
  geprüfte Spore byte-1:1 als `sbkim/<name>_inbox.json` (sage, point, jason, tresor, mixarium).
- **Auto-Issue-Wächter:** `.github/sbkim-watch.mjs` + `.github/workflows/sbkim-watch.yml`
  (CONFIG `SELF=Mein-Rezeptbuch` + 5 PEERS; `issues:write`, Cron `0 */6` + Run-Knopf).
- **Tests:** `test/sbkim.test.js` (`node --test`) → **5/5 grün** (Spore VALID, alle Inboxen
  VALID, SIGNAL-Pflichtfelder, Cosinus-Sanity).

## Nachzug Sage-Antwort (seq 19, 2026-06-07)
Sage hat unseren Andock-Brief beantwortet und alle vier Fragen geklärt:
- **Identität** uOpUBez… kanonisch (BSWxXmX… → previousNodeIds bei Sage + bei uns).
- **Match Sage ⟷ Mein-Rezeptbuch = 0.824068** (Sage Modul 04) — identisch zu unserer Browser-Rechnung
  → **beidseitig verified-match**.
- **Vollvernetzung:** Sage führt uns in `mailboxes`/`ack=1`/Wächter/📬-Knopf + Postfach `AUSTAUSCH-Rezeptbuch.md`.
- Bei uns nachgezogen: `ack["Sage-Protokol"]=19`, SIGNAL **seq → 2**, `*_inbox.verify.md` je Nachbar,
  Sicherheits-Tafel `docs/SICHERHEIT-BRIEFKASTEN.md` gespiegelt, `NETZ-STAND.md` + `status.json` gepflegt.

## Live-Match (im Browser frisch gerechnet, nichts grün-gerechnet)
| Nachbar | Cosinus | Stufe | Reziprok |
|---|---|---|---|
| Mein-Mixarium | **0.9544** | ✔ verified-match | ✔ reziprok (Mixarium rechnet 0.9544; SIGNAL seq 1 seit 2026-06-07 quittiert) |
| SB-KIMTool-Point | 0.8320 | ✔ verified-match | **✔ bestätigt 2026-06-07** (Point rechnet 0.832019; führt uns, ack=2, seq 21) |
| Sage-Protokol | 0.8241 (Sage: 0.824068) | ✔ verified-match | **✔ bestätigt 2026-06-07** |
| Mein-Tresor | 0.8137 | ✔ verified-match | **✔ bestätigt 2026-06-07** (Tresor rechnet 0.813698; führt uns, ack=2, seq 14) |
| Jasons-Tresor | 0.8137 | ✔ verified-match | **✔ bestätigt 2026-06-07** (Jasons rechnet 0.813698; führt uns, ack=2, seq 11) |

→ **5/5 verbunden.** (Alle ehrlich ≥ 0.80; kein Wert geschönt.) Beweise: `sbkim/*_inbox.verify.md`.

## Sync-Stand (ack quittiert)
Sage **19** · SB-KIMTool-Point **21** · Jasons-Tresor **11** · Mein-Tresor **14** · **Mein-Mixarium 1** · eigenes SIGNAL **seq 5**

**🔗 Ring geschlossen (2026-06-07): alle 5 Nachbarn reziprok verified-match (5/5).**
(Mixarium hat seit 2026-06-07 ein `SIGNAL.json` (seq 1) — gelesen + quittiert; ③ Sync läuft jetzt beidseitig.)

## Tests
`test/sbkim.test.js` (`node --test`) → **6/6 grün** (Spore VALID, alle Inboxen VALID,
SIGNAL-Pflichtfelder, Cosinus-Sanity, Selbst-Cosinus=1, `*_inbox.verify.md` je Inbox).

## Ehrliche offene Punkte
- **Kein privater Schlüssel** in dieser Sitzung → Spore **nicht neu signiert** (auch nicht nötig,
  solange kein signiertes Feld geändert wird; nodeId hängt nur am Schlüssel). Bei echter
  Identitäts-Neuerzeugung: `sbkim/spore.json` + Inboxen aktualisieren, `seq`+1.
- **Keine offenen reziproken Handshakes mehr** — alle 5 Nachbarn ✔ bestätigt 2026-06-07 (5/5).
  Laufende Pflege: Briefkasten-Rhythmus §11.6 (Peer-`SIGNAL` lesen + `ack` quittieren bei Sitzungsstart).

## Nächste Schritte
- Briefkasten-Rhythmus §11.6: bei Sitzungsstart Peer-`SIGNAL.json` lesen + `ack` quittieren.
- Peer-Sporen periodisch frisch holen + reziprok prüfen (Inboxen + `.verify.md` aktuell halten).
- Optionale Härtung (§5 der Sicherheits-Tafel) bleibt eigene, bewusste Sitzung (Klaus entscheidet).
