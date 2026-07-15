# BRIEF — Mein-Rezeptbuch: Kontroll-Versuch messen (BEIDE Hubs) + eigene Spore auf v0.2

## 0. Pflichtlektüre vor Start (in dieser Reihenfolge)
1. `CLAUDE.md` — immer frisch von `origin/main` prüfen (Default-Branch ist toter Decoy;
   `main` trägt SBKIM). Freibrief gilt (Selbst-Merge nach Test-grün, netzweit Klaus 2026-06-28).
2. `PULS.md` — oberster Block „2026-07-15".
3. Dieser Brief.
4. `sbkim/NETZ-STAND.md` + `sbkim/sage_inbox.verify.md` + `sbkim/point_inbox.verify.md`.
5. `sbkim/SIGNAL.json` (seq 11, ack: Sage 46 · Point 34 · Jasons 14 · Tresor 17 · Mixarium 11).

## 1. Stand (was die Sitzung 2026-07-15 getan hat)
- **§11.6-Sweep sauber:** alle 5 Peers aus deren `raw/main` gelesen — Sage 46 · Point 34 ·
  Jasons 14 · Tresor 17 · Mixarium 11 = **exakt gleich unserem `ack`**. Nichts Ungelesenes,
  keine neue Peer-v0.2-Spore, **kein Handlungsbedarf**. `SIGNAL.json` seq **nicht** erhöht
  (nichts fürs Netz zu melden).
- **Messhelfer-Anker headless verifiziert** (reine Vektor-Rechnung, kein Modell): der
  Kontroll-Versuchs-Helfer misst gegen die richtigen Anker — `cos(spore, VEC_SAGE)=0.792393`
  und `cos(spore, VEC_TP)=0.796054` reproduzieren die angezeigten Selbst-Test-Werte **exakt**;
  `VEC_SAGE` ist byte-1:1 Sages committete v0.2-Spore (cos 1.0), `VEC_TP` ist Points v0.2-Vektor
  (bewusst ≠ kanonisch `point_inbox.json`, Adress-Wand). Der Helfer misst also korrekt.
- **Drift-Guard ergänzt** (`test/sbkim.test.js`): stellt sicher, dass die Helfer-Selbst-Test-
  Werte nie wieder stumm veralten (wie letzte Sitzung `0.824068`). `node --test` **7/7 grün**.
- **Ehrliche Grenze:** die eigentliche Messung (neuen Text einbetten) braucht `Xenova/multilingual-e5-small`;
  ein headless-Versuch scheiterte, weil die **Org-Egress-Politik `huggingface.co` (403) blockt**
  und das Modell nicht im Repo liegt. **Nicht erneut headless versuchen** — läuft nur im Browser.
- **Eigene Spore unverändert** (`protocolVersion 0.1`) — v0.2-Neu-Signatur braucht Klaus' Browser.

## 2. Ziel dieser Folge-Sitzung
(a) **Kontroll-Versuch messen (Klaus-Browser):** `sbkim/messung-netz-zugehoerigkeit.html` öffnen →
    „🔎 Messen". Selbst-Test OHNE Zusatz muss ≈ Toolpoint **0.796054** / Sage **0.792393** anzeigen
    (headless bestätigt: Anker stimmen — stimmt der Selbst-Test, misst die Seite korrekt). Prüfen,
    ob der Zusatzsatz „… Teil des SBKIM-Knotennetzes rund um Sage-Protokoll und SB-KIMTool-Point."
    **einen der beiden Hubs** wieder ≥ 0.80 hebt. Ergebnis (beide Werte, OHNE + MIT) dokumentieren
    → **Klaus entscheidet** Satz ja/nein.
(b) **Falls Klaus den Satz will:** `domainDescription` in `spore.json` ergänzen, Spore **v0.2**
    (protocolVersion 0.2 + snippetVectors, nodeId unverändert) **live neu signieren** im Browser
    (Siegel ✍). Vor Commit alle behaltenen Peer-Matches headless prüfen (`node --test`).
(c) Laufende §11.6-Pflege: bei Sitzungsstart Peer-SIGNAL erneut gegen `ack` prüfen.

## 3. Datenverträge
Keine neuen. Spore v0.2 (9 Pflichtfelder + optional `snippetVectors`), nodeId bleibt, Schwelle 0.80.
Match = Cosinus zweier L2-normalisierter `domainVector`. Inbox = signatur-reine 1:1-Kopie aus
`raw/main` des Nachbarn (mit `*_inbox.verify.md`). Messhelfer-Anker: `VEC_SAGE` == `sage_inbox.json`
(Drift-Guard prüft das); `VEC_TP` = Points v0.2 (bewusst ≠ `point_inbox.json`).

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
5. Briefkasten §11.6: nur `seq` +1, wenn wirklich etwas fürs Netz zu melden ist (sonst nicht);
   ggf. Quittung an Peers, `ack` nachziehen.
