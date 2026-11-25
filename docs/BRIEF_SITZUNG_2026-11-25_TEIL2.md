# Brief für die nächste Sitzung: Vergleich alt ↔ neu, Teil 2 (Bau)

Stand **25.11.2026 abends**. Vorgänger: `docs/BRIEF_SITZUNG_2026-11-25_ENDSTAND.md` (gilt weiter für Adressen, Arbeitsweise,
APK/Windows danach). Klaus hat am 25.11. die neue PWA mit der alten verglichen; **jeder Befund steht mit Prüfung am Code in
`docs/BEFUNDE_VERGLEICH_2026-11-25.md`** (R1–R13, M1–M3). Diese Datei sagt, was gebaut ist, was als Nächstes kommt und wie.

**Arbeitsweise (Klaus 25.11.):** zuerst die **PWAs** (Mein Rezeptbuch, danach Mein Mixarium) fertig bauen und immer mit den
**alten PWAs** vergleichen. Die APK kommt danach, aus dem fertigen Stand. Beim Mixarium den Briefkasten lesen
(`docs/BRIEFKASTEN_MIXARIUM.md`, Runde F) und den Kern mit `tools/kern-nachziehen.mjs` holen.

**Regel (Klaus 25.11.): Am Ende jeder Sitzung und vor jeder Übergabe die PWA zum Testen freigeben.** Das heißt: alles Gebaute
gemergt (dann liefert GitHub Pages es aus), auf `main` die Fassung nachgesehen, und Klaus bekommt den Link
**https://lausiklauskn-png.github.io/Mein-Rezeptbuch/neu/** (bzw. `…/Mein-Mixarium/neu/`) mit der Fassungsnummer und dem Hinweis,
oben auf die Versionsnummer zu tippen. Die PWA geht schneller als eine APK.

## Gebaut und gemergt am 25.11.

| PR | Fassung | Inhalt |
|---|---|---|
| #505 | App 0.15.2 · Kern 0.27.1 | R1 Foto über Pollinations (eigener Schlüssel, Pollinations antwortet ohne Schlüssel mit 402, auch in der alten App) · R7 KI-Bild: Rückfall über `/v1/models`, wenn `dall-e-3`/`gpt-image-1` nicht passen · R2 „Ohne Kategorie“, unbekannte und mitgebrachte Kategorien auf einmal zuordnen · R4 „Sicherung teilen“ |
| (dieser) | App 0.15.3 | R13 „?“-Erklärungen ganz lesbar (Blase am Seitenkörper `#frag-blase`, wandert beim Scrollen mit) · Spezifikation R8 · dieser Brief |

⚠ Klaus' Tablet zeigte noch 0.15.1/0.15.2: **auf die Versionsnummer oben tippen** holt die neue Fassung.
⚠ Nicht gemessen: echter Pollinations- und OpenAI-Schlüssel, Teilen am Tablet.

## Entscheidungen von Klaus (25.11.)

- Ersetzen beim Einlesen wie im Rezeptbuch (Mixarium nachziehen, M1).
- Wischen an der Rezeptkarte: ja, Vorbild **Muttis Rezeptbuch** (alt, `_rcardHdCheck`). Der alte Muttis-Code liegt **nicht** in
  diesem Repo: Repo `lausiklauskn-png/Muttis-Rezeptbuch` per `add_repo` (lesen) holen, **gegen `origin/main`** lesen.
- `_CR`-Wasserzeichen: entfällt (Sitzung entschieden).
- APK-Namen: „App Mein Rezeptbuch“, „App Mein Mixarium“ (bestätigt), das Mixarium mit dem vorgesehenen neuen Symbol (PNG-Entwurf liegt vor).
- Food-Zine-Bilder direkt am Rezeptbild ist richtig; das **Kreativbuch gehört nicht in die Einstellungen**.

## Reihenfolge für den Bau (Vorschlag der Sitzung, Klaus fragt nur nach, wenn er anders will)

1. **R9/R3 Explorer „Ordner“** (größter Wunsch). Eigener Punkt in der Navi-Leiste unter „Rezepte“ (und in der fliegenden
   Leiste am Handy). Vorlage: alte Ansicht „Meine Ordner“ (Bilder 13:52–15:27): Kopf mit Suche, Neuer Ordner, Kategorien
   umbenennen, Alle auf-/einklappen; darunter **alle Kategorien** aufklappbar mit ihren Rezepten (Zeichen/Sticker, Zahl), darunter
   die **Ordner** genauso. Breiter Schirm: Baum links, Rezept rechts; Handy: Baum füllt den Schirm.
   - An jeder Kategorie ✎ (Name/Zeichen), 🗑 (löschen → Ziel), ⇄ (alle zuordnen, gibt es seit 0.15.2 als `kat-alle`).
   - Rezepte ziehen (Maus, langer Druck): auf Kategorie = `r.cat`, auf Ordner = `r.folder` (Kern `legeIn`). Ziehen gibt es schon
     für Zeilen (`gz` in `neu/app.mjs`, Pointer-Events), daran anlehnen.
   - Mehrere auf einmal: „Auswählen“ → Haken → „Verschieben nach …“ (Klaus: „wie soll ich mehrere verbinden?“).
   - Tipp auf ein Rezept öffnet es. „Ordnung“ in den Einstellungen darf auf den Explorer zeigen.
   - Klaus' Befund 15:27: der jetzige Ordner-Bildschirm zeigt nur „Spezial für 1“ – genau das ist der fehlende Baum.
2. **R12 Kreativbuch in die Navi-Leiste**: Buch (PDF, Blättern), Kreativbuch, Aus Bildern, Projekte aus den Einstellungen
   (`ZU.buchThema`, `KB.zeile`) in einen eigenen Bereich; im Food-Zine-Fenster ein Weg dorthin.
3. **R8 Kreativbuch/Food-Zine wie alt**, nach `docs/R8_KREATIVBUCH_ALT_SPEZ.md` (mit Zeilennummern der alten App):
   Prompt-Generator (Lieblingsrezept, Bild für die KI, 6 Formate, 5 Extras, KI-Überraschung „Trendrezepte“), Prompt-Feld
   änderbar, Knöpfe **Kopieren · Claude · ChatGPT** (kopieren und `claude.ai/new` bzw. `chatgpt.com` öffnen, kein Schlüssel),
   Rezepte einzeln an-/abwählen, „Meine Food-Zine Bilder“ (sammeln, ziehen mit Finger und Maus, groß ansehen, drucken/PDF),
   Antwort-JSON der alten App (`{"kreativbuch":[{name,intro,tip,serve}]}`) zusätzlich lesen. Offene Fragen stehen in § 8 der
   Spezifikation (u. a. „KI erfindet das Rezeptbild“ ist in der alten Datei nicht gefunden – Klaus fragen, welcher Knopf).
4. **R10 Bild**: Tipp aufs Rezeptbild → gleich „Bild anpassen“ (Vollbild, auch am Handy); darin unten die übrigen Wege (ersetzen,
   KI, Pollinations, Food-Zine). Vorschau Karte/Kopfbild aus den **echten** Maßen (`.karte .bild`, `.rezept-held` je Breite) rechnen.
5. **R6 Doppelungen** beim Einlesen (Kern `fuehreZusammen`): Text (Name normalisiert, Zutaten) und Bild (kleiner Hash) vergleichen;
   je Doppel wählen: Bild behalten / Text behalten / Rezept (beides) behalten / beide behalten. **„alkoholfrei“ ↔ „mit Alkohol“
   ist kein Doppel**, auch wenn nur dieses Wort fehlt (gilt für beide Apps, gehört in den Kern).
6. **R11 Navi-Leiste verschiebbar** am breiten Schirm (links/rechts/oben/unten, langer Druck), Lage gemerkt.
7. **R5 Wischen an der Rezeptkarte** nach Muttis (siehe oben).
8. Danach **Mixarium**: M1 (Ersetzen), Kern nachziehen (Pollinations-Schlüssel in `bildErzeugen` mitgeben), alle obigen
   Kern-Teile prüfen; Briefkasten Runde F.

Erst wenn beide durch sind: ausdrücklich „Rezeptbuch fertig“ / „Mixarium fertig“, dann Marktplätze, dann APK und Windows.

## Fallen, die heute Zeit gekostet haben

- **`mitThemen` in den Proben klappt die Einstellungen selbst auf**; ein zusätzlicher Tipp auf `werk-auf` klappt sie wieder zu.
- **Headless-Chromium kann nicht teilen** (`navigator.canShare` fehlt): eine Prüfung „steht da, wo der Browser teilen kann“ ist
  dort blind. Teilen in der Probe stellen (`addInitScript`).
- **`elementFromPoint` an runden Ecken** (12 px) trifft das Element nicht: Ecken 14 px innen messen.
- **Ein leeres Element ist für `waitForSelector` unsichtbar** (`#ord-wahl` ohne Ordner).
- **Scroll-Ereignisse kommen nach dem Tipp an**: was beim Scrollen schließt, schließt sofort nach einem Tipp, der erst scrollen musste.
- **Ein Fenster, das hereingleitet (`transform`), verschiebt `position:fixed`-Kinder**: Blasen an den Seitenkörper hängen.
- Proben mit PDF: `WFPDF_KLON=/home/user/lausiklauskn-png/workflow-pdf` (öffentlich, `git clone --depth 1`).
- `smoke_neu_kreativbuch` meldet 1 ROT („focus-without-user-activation“) – gleich auf `main` vor dieser Arbeit, eine Warnung des Testbrowsers.

## Startauftrag

```
Lies in Mein-Rezeptbuch zuerst CLAUDE.md, dann docs/BRIEF_SITZUNG_2026-11-25_TEIL2.md und docs/BEFUNDE_VERGLEICH_2026-11-25.md.
Freibrief wie zuvor. Bau die offenen Befunde in der Reihenfolge des Briefs (zuerst der Explorer „Ordner“), prüf jeden am Code
und an der alten PWA, bau, prüf, merge. Ich vergleiche weiter und schicke neue Befunde. Gib am Ende jeder Sitzung die PWA zum Testen frei (Link und Fassung).
Sag mir ausdrücklich, wenn Rezeptbuch und Mixarium fertig sind; dann Marktplätze, danach APK und Windows.
```
