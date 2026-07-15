# SBKIM-Siegel — Zusammenstellung & Prüfbogen (damit jedes Repo es wie Sage baut)

> **Zweck (Klaus 2026-07-15):** Eine Liste, **was alles ins Siegel gehört** und **in welcher
> Reihenfolge** es gebaut wird — damit jedes Repo (Rezeptbuch, Mixarium, BookLedgerPro, Tresore …)
> sein Siegel so **aussehen und funktionieren** lässt wie das in **Sage**.
>
> **Quelle der Wahrheit = `Sage-Protokol`.** Alles andere sind Klone. Regel: das Siegel-**Modul 16
> byte-1:1 aus Sage kopieren** (nie selbst pflegen), die **Host-Injektion** aus Sage nachbauen und
> nur die Config-Werte (Name, Domäne, `dbSuffix`, `ribbonText`) anpassen. Modul 16 bleibt
> **unangetastet** — es ist das netzweit geteilte Render-Modul. Maschinen-Rezept mit Code:
> Skill **`status-leiste-siegel`** (`family-project/.claude/skills/status-leiste-siegel/`).

## Das Siegel hat drei Teile

| Teil | Was | Woher |
|---|---|---|
| **A · Lampen-Leiste** | Immer sichtbare Pille: **LEBT · VERKEHR · FREMD · SIEGEL** | Modul **17** (Floating-Widget) + Events aus 02/05/15/16 |
| **B · Wappen-Badge** | Gold-Wappen (Korona, Ring, „OFFIZIELLE BESTÄTIGUNG / SBKIM / SIEGEL", 3 Medaillons) + **Band mit App-Namen** | Modul **16** (`WAPPEN_SVG` + `ribbonText`) |
| **C · Modal-Inhalt** | Das **Andock-Werkzeug** (siehe unten) — der Kern, der oft vergessen wird | Modul **16** rendert das Gerüst; die **App injiziert** die Werkzeuge host-seitig |

## Bau-Reihenfolge (verbindlich)

Modul **17 VOR 15/16** (17 legt die Proxy-Spans `#lamp-fremd` + `#sbkim-siegel-badge` an):

```
1. SbkimStorage.init({ dbSuffix: "<app-suffix>" })     // eigene Schublade zuerst
2. SbkimWidget.init({ allowedOrigins, repoUrl })       // 17 — Lampen + Proxy-Spans
3. SbkimMembrane.init({ allowedOrigins })              // 15 — Wächter / FREMD-Lampe
4. SbkimSiegel.init({ badgeSelector:"#sbkim-siegel-badge",
                      repoUrl, ribbonText:"<App-Name>" })  // 16 — ribbonText PFLICHT (sonst Band leer)
5. SbkimApoptose.init()                                 // 07 (Pflicht-Modul)
```

**Häufigster Fehler:** `ribbonText` vergessen → das Wappen-Band bleibt **leer** (kein Auto-Slug,
bewusst). Jede App graviert ihren **eigenen** Namen ein: Sage `"SAGE OBSERVATORIUM"`, Rezeptbuch
`"Mein Rezeptbuch"`, Mixarium seinen Namen usw.

## Was ins Modal gehört (Teil C — das Werkzeug)

Modul 16 rendert das **Gerüst** (Badge + Modal + Bronze/Gold + Pflicht-Modul-Selbstprüfliste +
Wappen + **⛨ Fremden Knoten andocken**). Die **App injiziert** host-seitig (sobald `#sbkim-siegel-modal`
im DOM hängt, via `MutationObserver`) diese Blöcke:

- [ ] **🔑 Andock-Wizard** (eigenes Modal über dem Siegel) — die **fünf Bausteine** über die echten
      Module 02/03: **(1)** Identität erzeugen · **(2)** Spore signieren + Download (mit Modell-
      Ladebalken) · **(3)** verschlüsseltes Backup (PBKDF2 600k + AES-GCM-256) · **(4)**
      Wiederherstellen (`importBackup`, auch auf neuem Gerät) · **(5) Identitäts-Wechsler**
      (`listIdentities`/`setActiveIdentity` — der wird am häufigsten vergessen!).
- [ ] **✍ Semantische Beschreibung → Vektor & Spore neu signieren** (gleiche nodeId, neuer Vektor).
- [ ] **🛡 Schutz-/Vertrauens-Block** + „Ausführlich erklärt →" als In-Page-Overlay (`sicherheit.html`).
- [ ] **⛨ Fremden Knoten andocken** (in Modul 16 enthalten): fremde `spore.json` prüfen → Match ≥ 0.80 → Handshake.

**Pflicht überall, wo das ~30-MB-Embedding-Modell lädt** (Wizard-Schritt 2, ✍ Semantik): einen
**Prozent-Ladebalken** aus dem Event `sbkim:embedding-progress` zeigen — sonst wirkt es eingefroren.

## Per-Repo-Prüfbogen (gilt das Repo als „Siegel = wie Sage"?)

- [ ] Modul-Dateien **17/15/16 + Kern 01–05/07** byte-1:1 aus Sage (Drift-Guard im Smoke).
- [ ] Init-Reihenfolge **17 → 15 → 16 → 07**, `dbSuffix` gesetzt, `SbkimSiegel.init({ ribbonText })` **mit** Namen.
- [ ] Lampen-Leiste sichtbar (LEBT/VERKEHR/FREMD/SIEGEL).
- [ ] Wappen-Band trägt den **App-Namen** (nicht leer, nicht fremd).
- [ ] Modal-Injektion vorhanden: **🔑 Wizard (5 Bausteine inkl. Identitäts-Wechsler)** · ✍ Semantik · 🛡 Schutz · ⛨ Fremd-Andock.
- [ ] Modell-Ladebalken in Wizard-Schritt 2 **und** ✍ Semantik.
- [ ] `sicherheit.html` vorhanden (für den 🛡-Overlay).
- [ ] Modul 16 **unangetastet** (nur Config + Host-Injektion angepasst).
- [ ] Ehrlich: privater Schlüssel bleibt im Browser; Lampen leuchten nur bei echtem Event.

## Stand Mein-Rezeptbuch (2026-07-15)

| Prüfpunkt | Status |
|---|---|
| Module 17/15/16 geladen, Init-Reihenfolge | ✅ |
| Modul 16 byte-identisch zu Sage (Wappen · Modul-Liste · ⛨ Fremd-Andock · Handshake) | ✅ |
| 🔑 Andock-Wizard (5 Bausteine) host-injiziert | ✅ (portiert 2026-07-15, PR #326) |
| ✍ Semantik · 🛡 Schutz | ✅ |
| **`ribbonText: "Mein Rezeptbuch"`** (Wappen-Band graviert) | ✅ **gefixt 2026-07-15** (war leer — „das Fehlende") |
| Modell-Ladebalken (Wizard Schritt 2 + ✍) | ✅ |

→ **Rezeptbuchs Siegel ist damit auf Sage-Parität.** Browser-Sichttest (Wappen mit Name, Wizard,
Fremd-Andock) läuft auf der deployten Seite nach dem Merge — Klaus prüft es live.
