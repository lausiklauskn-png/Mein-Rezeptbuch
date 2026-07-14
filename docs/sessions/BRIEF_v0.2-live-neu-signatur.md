# BRIEF — Mein-Rezeptbuch: Kontroll-Versuch messen + eigene Spore auf v0.2 (Live-Neu-Signatur)

> Folge-Brief nach der reziproken Neu-Einstufung SB-KIMTool-Point (2026-07-14, Branch
> `claude/reciprocal-reclassification-v0.2-1myevo`). Die zwei offenen Schritte brauchen **Klaus'
> Browser** (privater Schlüssel + Embedding-Modell), darum kein reiner Headless-Abschluss.

## 0. Pflichtlektüre vor Start [Pflicht — erst lesen, dann planen, dann bauen]
1. `CLAUDE.md` (Verfassung dieses Repos) — **immer** frisch von `origin/main` prüfen (Default-Branch
   ist ein toter Decoy; `main` trägt die volle SBKIM-Integration).
2. `PULS.md` — oberster Block „2026-07-14".
3. Dieser Brief.
4. `sbkim/point_inbox.verify.md` + `sbkim/NETZ-STAND.md` (Stand der Toolpoint-Einstufung).
5. `sbkim/SIGNAL.json` (seq 10, ack[SB-KIMTool-Point]=34).
Immer frisch von `origin/main` abzweigen (SBKIM-Sitzungsstart-Pflicht).

## 1. Stand [Pflicht]
- **SB-KIMTool-Point** ist reziprok **neu eingestuft**: cos unser ⟷ Points v0.2-Vektor = **0.796054
  < 0.80** → `verified-spore` (war verified-match 0.832019). `point_inbox.verify.md`, `NETZ-STAND.md`,
  `status.json`, `SIGNAL.json` (seq 10, ack 34) nachgezogen. `point_inbox.json` (kanonisch `CyunQNDR…`)
  **unverändert** — Points committete v0.2-Spore trägt eine **abweichende nodeId** `JZ7MeMtp…`
  (Adress-Wand, an Point gemeldet).
- **Browser-Messhelfer** `sbkim/messung-netz-zugehoerigkeit.html` liegt (server-los, Modul 03).
- Tests `node --test` 6/6 grün.

## 2. Ziel [Pflicht]
(a) **Kontroll-Versuch messen** (Klaus im Browser): Helfer öffnen → „Messen" → zeigt cos OHNE/MIT dem
Zusatzsatz „… Teil des SBKIM-Knotennetzes rund um Sage-Protokoll und SB-KIMTool-Point." zu Toolpoint
**und** Sage. Selbst-Test: OHNE-Zeile soll ≈ Toolpoint 0.796054 / Sage 0.824068 zeigen. **Ergebnis an
Klaus** → er entscheidet, ob der Satz dauerhaft in die `domainDescription` kommt.
(b) **Eigene Spore auf v0.2 heben:** `protocolVersion` 0.1 → 0.2 (+ optionale `snippetVectors`),
**nodeId unverändert**, **Live-Neu-Signatur im Browser** (privater Schlüssel liegt nicht im Repo) über
das Siegel (✍ neu signieren). **Vor** dem Commit alle behaltenen Peer-Matches headless prüfen (nichts
unbemerkt unter 0.80 fallen lassen).

## 3. Datenverträge / Spec [Pflicht]
Keine neuen. Spore v0.2 (9 Pflichtfelder + optional `snippetVectors`), nodeId bleibt, Andock-Schwelle
0.80 unberührt. Match = Cosinus zweier L2-normalisierter `domainVector`.

## 4. Akzeptanzkriterien [Pflicht]
- Kontroll-Versuch dokumentiert (beide Werte, mit/ohne) → Klaus-Entscheid festgehalten.
- Falls Klaus den Satz will: `domainDescription` ergänzt, Spore **v0.2 live neu signiert** (nodeId
  unverändert), `point_inbox`-Matrix + verify + status + SIGNAL nachgezogen, Tests grün.
- Alle behaltenen Matches ≥ 0.80 headless verifiziert.

## 5. Reihenfolge
1. Kontroll-Versuch messen (Klaus) → Ergebnis.
2. Klaus-Entscheid Satz ja/nein.
3. v0.2-Live-Neu-Signatur (Klaus-Browser) + Headless-Nachweis + Doku.

## 6. Offene Fragen an Klaus
- Soll der Zusatz „Teil des SBKIM-Knotennetzes" dauerhaft rein (abhängig vom Messergebnis)?
- Netz-Form: gleiches-Thema-Match (Hubs matchen Inhalts-Apps NICHT) **oder** Zugehörigkeits-Match?
- Firmen-PDF-Tool: pro-Dokument-Vektor + KI-Richter-Nachbrenner — wann spec'en?

## 7. Abschluss-Befehl [Pflicht — die Kette darf nie abreißen]
1. `PULS.md` fortschreiben (getan / offen / nächste Schritte + Manual-Check).
2. Neuen Brief nach diesem Muster anlegen (inkl. Pflichtlektüre Teil 0 + diesem Teil 7).
3. Den neuen Brief vollständig als Codeblock im Chat ausgeben.
4. Commit + Push (ein Commit pro Aufgabe), Draft-PR mit Test-Plan. Selbst-Merge nach Freibrief, wenn
   headless grün + abgegrenzt; Klaus' Browser-Sichttest bleibt der Schluss-Beweis.
5. Briefkasten §11.6: `SIGNAL.json` pflegen (seq +1), ggf. Quittung an Peers.
