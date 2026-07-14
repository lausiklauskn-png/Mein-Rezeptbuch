# BRIEF — Mein-Rezeptbuch: Kontroll-Versuch messen (BEIDE Hubs) + eigene Spore auf v0.2

## 0. Pflichtlektüre vor Start (in dieser Reihenfolge)
1. `CLAUDE.md` — immer frisch von `origin/main` prüfen (Default-Branch ist toter Decoy;
   `main` trägt SBKIM). Freibrief gilt (Selbst-Merge nach Test-grün, netzweit Klaus 2026-06-28).
2. `PULS.md` — oberster Block „2026-07-14 (b)".
3. Dieser Brief.
4. `sbkim/NETZ-STAND.md` + `sbkim/sage_inbox.verify.md` + `sbkim/point_inbox.verify.md`.
5. `sbkim/SIGNAL.json` (seq 11, ack: Sage 46 · Point 34 · Jasons 14 · Tresor 17 · Mixarium 11).

## 1. Stand (was diese Sitzung getan hat)
- **Sage reziprok neu eingestuft → `verified-spore`:** Sage hat seine Live-Spore auf **v0.2** neu
  signiert (erste v0.2-Spore im Netz, SIGNAL seq 46, 11 snippetVectors, `nodeId nysOZE3V…`
  **unverändert**, kein Adress-Wand). cos unser `domainVector` ⟷ Sage v0.2 = **0.792393 < 0.80**
  (war 0.824068 gegen v0.1). Ehrlich, wie Point (0.796054). `sage_inbox.json` auf v0.2, alle Akten
  nachgezogen (`sage_inbox.verify.md`, `NETZ-STAND`, `status.json` = **3/5 Match + 2 verified-spore**,
  `SIGNAL` seq 11, Quittung `AUSTAUSCH-Sage.md`).
- **§11.6-Sweep:** Jasons/Tresor/Mixarium seq nachgezogen (`ack` 14/17/11); deren Sporen
  unverändert v0.1, Matches ≥ 0.80 → keine Aktion.
- **Messhelfer-Selbsttest korrigiert:** Sage-Erwartungswert 0.824068 → **0.792393** (VEC_SAGE ist
  Sages Live-v0.2-Vektor). Helfer misst jetzt ehrlich gegen **beide** v0.2-Hub-Vektoren.
- **Headless:** `node --test` **6/6 grün**; alle Inboxen + eigene Spore ✔ VALID; cos 0.792393 /
  0.796054 reproduziert; drei Themen-Matches ≥ 0.80 headless bestätigt.
- **Eigene Spore unverändert** (`protocolVersion 0.1`) — v0.2-Neu-Signatur braucht Klaus' Browser
  (privater Schlüssel nicht im Repo).

## 2. Ziel dieser Folge-Sitzung
(a) **Kontroll-Versuch messen (Klaus-Browser):** `sbkim/messung-netz-zugehoerigkeit.html` öffnen →
    „Messen". Selbst-Test OHNE Zusatz ≈ Toolpoint **0.796054** / Sage **0.792393** (beide < 0.80).
    Prüfen, ob der Zusatzsatz „… Teil des SBKIM-Knotennetzes rund um Sage-Protokoll und
    SB-KIMTool-Point." **einen der beiden Hubs** wieder ≥ 0.80 hebt. Ergebnis (beide Werte,
    OHNE + MIT) dokumentieren → **Klaus entscheidet** Satz ja/nein.
(b) **Falls Klaus den Satz will:** `domainDescription` in `spore.json` ergänzen, Spore **v0.2**
    (protocolVersion 0.2 + snippetVectors, nodeId unverändert) **live neu signieren** im Browser
    (Siegel ✍). Vor Commit alle behaltenen Peer-Matches headless prüfen.
(c) Laufende §11.6-Pflege: bei Sitzungsstart Peer-SIGNAL erneut gegen `ack` prüfen.

## 3. Datenverträge
Keine neuen. Spore v0.2 (9 Pflichtfelder + optional `snippetVectors`), nodeId bleibt, Schwelle 0.80.
Match = Cosinus zweier L2-normalisierter `domainVector`. Inbox = signatur-reine 1:1-Kopie aus
`raw/main` des Nachbarn (mit `*_inbox.verify.md`).

## 4. Akzeptanzkriterien
- Kontroll-Versuch dokumentiert (OHNE + MIT, für Toolpoint **und** Sage) → Klaus-Entscheid.
- Falls Satz gewollt: `domainDescription` ergänzt, Spore v0.2 live neu signiert, alle Akten
  nachgezogen, `node --test` grün, alle behaltenen Matches ≥ 0.80 headless verifiziert.
- Bei erneutem §11.6-Sweep: neue Peer-v0.2-Sporen reziprok neu messen + ehrlich einstufen.

## 5. Offene Fragen an Klaus
- **Netz-Form:** Zugehörigkeits-Match (Netz-Satz hebt Hubs zurück ≥ 0.80) ODER reines
  Themen-Match (ehrlich: Kochbuch matcht die beiden Hubs nach v0.2 nicht mehr, nur die
  Themen-verwandten Knoten Mixarium/Tresore)?
- Zusatz „Teil des Netzes" dauerhaft in die eigene `domainDescription` (je nach Messung)?
- Firmen-PDF-Tool: pro-Dokument-Vektor + KI-Richter-Nachbrenner — wann spec'en?

## 6. Abschluss-Befehl (Pflicht am Sitzungsende)
1. `PULS.md` fortschreiben (getan / offen / nächste Schritte + Manual-Check-Vermerk).
2. Neuen Brief nach diesem Muster anlegen (inkl. Pflichtlektüre + diesem Abschluss-Befehl).
3. Neuen Brief vollständig als Codeblock im Chat ausgeben.
4. Commit + Push (ein Commit pro Aufgabe), Draft-PR; Selbst-Merge nach Freibrief bei headless grün.
5. Briefkasten §11.6: `SIGNAL.json` pflegen (seq +1), ggf. Quittung an Peers, `ack` nachziehen.
