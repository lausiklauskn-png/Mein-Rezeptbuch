# BRIEF — Briefkasten empfangen & gebaut (Mein-Rezeptbuch)

> Antwort-/Bau-Brief von **Mein-Rezeptbuch** an alle SBKIM-Knoten
> (Sage-Protokol · SB-KIMTool-Point · Jasons-Tresor · Mein-Tresor · Mein-Mixarium). Datum 2026-06-07.

## Pflichtlektüre vor der Arbeit (in dieser Reihenfolge)
1. `CLAUDE.md` (Projektregeln + Build-Workflow: QC-Datei ändern → `python3 build.py`).
2. `PULS.md` (aktueller Stand).
3. Dieser Brief.
4. `status.json` (ehrlicher Real-Anteil).
5. `index.html` (dort sitzt der Briefkasten, gebaut aus `QC_MeinRezb_*.html`) + `sbkim/*`.
6. Mein-Tresor-Bauplan: `…/Mein-Tresor/main/docs/sessions/BRIEF_briefkasten-bauplan.md`.

## Was erledigt wurde
- **Briefkasten 1:1** nach Bauplan §3: Knopf 📬 (im Top-Header), Dialog, CONFIG, Logik.
  `sbkimMailboxFetch`/`sbkimCosine`/`sbkimMailboxCheck` **byte-gleich** (4953 B identisch geprüft);
  nur CONFIG umgestellt (`self="Mein-Rezeptbuch"`, Vollvernetzung §7 = alle anderen fünf).
- **Gold-Zähler** am geschlossenen Knopf (`#sbkim-mailbox-badge`, #C9A961, `seq>ack`) + **SBKIM-Siegel**.
- **`sbkim/SIGNAL.json`** neu angelegt (seq 1, `ack`) — vorher fehlte es (Netz sah uns als 404).
- **Nachbar-Sporen** reziprok geprüft (`scripts/verify_foreign_spore.mjs` → ✔ VALID) und byte-1:1
  als `sbkim/<name>_inbox.json` abgelegt (sage, point, jason, tresor, mixarium).
- **Eigene Spore** `sbkim/spore.json` (verified-spore ✔, echter 384-dim `domainVector`).
- **Auto-Issue-Wächter** 1:1 übernommen (CONFIG `SELF=Mein-Rezeptbuch` + 5 PEERS).
- **`npm test` grün** (`test/sbkim.test.js`, 5/5; additiv, App-Kern unberührt).

## Live-Match (im Browser frisch gerechnet — ehrlich)
Mixarium 0.9544 · Point 0.8320 · Sage 0.8241 · Tresor 0.8137 · Jasons 0.8137 → **5/5 verbunden**.
Nichts grün-gerechnet; alle Werte real ≥ 0.80 (Rezeptbuch ist Genuss-Domäne, daher hohe Nähe v.a. zu Mixarium).

## Ehrlicher Hinweis
Kein privater Schlüssel in dieser Sitzung → Spore **nicht neu signiert**; verwendet wird die im
Netz bereits geprüfte Spore (gleiche nodeId) byte-1:1. Bei echter Neu-Erzeugung durch Klaus:
`sbkim/spore.json` + Inboxen aktualisieren, `seq`+1.

## Abschluss-Befehl (für die nächste Empfänger-/Folge-Sitzung)
Briefkasten nach Bauplan §3 pflegen (CONFIG anpassen, Logik byte-gleich) → `sbkim/SIGNAL.json` +
`*_inbox.json` aktuell halten → `npm test` grün → `PULS.md` fortschreiben → neuen Brief schreiben
(Pflichtlektüre + diesen Abschluss-Befehl wiederholen) → Commit/Push auf `claude/<scope>` →
Draft-PR mit Test-Plan. **Merge entscheidet Klaus.**
