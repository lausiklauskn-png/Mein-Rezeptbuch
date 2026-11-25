# R8 · Spezifikation „KI-Kreativbuch · Prompt“ / „Food-Zine“ (alte App) und Abgleich mit der neuen App

Quelle alt: `/home/user/Mein-Rezeptbuch/QC_MeinRezb_24_04_26.html` (17 998 Zeilen). Alle Zahlen `Z.` = Zeilen dieser Datei.
Quelle neu: `neu/zine.mjs`, `neu/kreativbuch.mjs`, `neu/app.mjs`, `kern/ausgabe/{zine,kreativbuch,eigenbuch}.mjs`, `kern/ki/bild.mjs`.
Nur gelesen, nichts geändert. Wo etwas unklar ist, steht es dabei.

---

## 0 · Wichtig vorweg: es sind DREI verschiedene Dinge, die im Alten „Food-Zine/Kreativbuch“ heißen

| | was | Overlay | lebt? |
|---|---|---|---|
| **A** | **KI-Kreativbuch · Prompt** (Kopier-Weg ohne Schlüssel, Stil-Kacheln, im Stil „Food-Zine“ der Poster-Prompt-Generator mit Format, Extras, Bild, Trend-Knopf, Galerie) | `#aiBookOv` Z. 3426–3509 | **ja**, das ist der von Klaus gemeinte Fluss |
| B | „KI-Zine“-Viewer mit drei Seiten (Cover / Step-by-Step / Gesundheit), `buildZinePrompts`, `openZineDialog`, `openZine`, `#zineOv`; dazu `openFoodZine`/`#foodZineOv` | `#zineOv` Z. 17233–17289, `#foodZineOv` Z. 16278–16284 | **toter Code**: `openZineDialog` wird nur definiert (Z. 16907) und an `window` gehängt (Z. 17192), `openFoodZine` (Z. 7531), `startZine` (Z. 16874), `generateFreePhoto` (Z. 16749) haben **keinen Aufrufer** in der Datei (grep). |
| C | „Eigenes Kreativbuch“ aus eigenen Fotos (kbk*), 30 Bilder, Drag&Drop, PDF-Druck, `.kreativbuch`-Projektdatei | Export-Fenster Z. 3362–3401, Code Z. 16463–16725 | ja (separat im Export-Fenster) |

Daneben noch „Kreativbuch (Claude)“ mit API-Schlüssel (`startKreativbuch` Z. 10338, `#kbSelOv`/`#kbCostOv`/`#kbProgOv` Z. 3519–3558) — nicht Thema dieses Auftrags, nur erwähnt.

⚠ Die von Klaus beschriebene Funktion „die Sammlung kann ein Kochbuch/Druck werden“ gibt es in **A (Food-Zine-Galerie) NICHT**: dort gibt es nur Einzelbild-Großansicht + „Drucken / PDF“ eines Bildes (Z. 7908–7931). Ein Buch/PDF aus vielen Bildern macht nur **C** (`kbkExport`, Z. 16695). Vermutlich verwechselt; bitte mit Klaus klären.

---

## 1 · Einstiegspunkte (alt)

| Knopf | wo | Funktion |
|---|---|---|
| „📖✨ KI-Kreativbuch erstellen“ (Karte „KI-Kreativbuch“, Text „Prompt erstellen → in Claude/ChatGPT einfügen → JSON zurück → Buch herunterladen. Kein API-Key nötig.“ Z. 3800) | Export-Fenster `#exportOv`, Z. 3353–3360 | `openAiBook()` Z. 7592 |
| „📰 Food-Zine“ / Unterzeile „KI-Kreativbuch · Prompt erstellen“ (`.fz-bar`) | unten an jeder Rezeptkarte mit Namen (neben „Drucken“), `.rcard-btns` Z. 12461–12474 | `openFzgAsAiBook(r.id)` Z. 7578: `openAiBook()` → `_kbCpStyle='zine'` → `aiBookWeiter()` → Auswahlliste `#aiBookZineRec` auf das Rezept → Prompt bauen |
| „📸✨“ (Titel „KI-Bild erzeugen“/„Neues KI-Bild erstellen“) | Aktionsleiste der Rezeptkarte Z. 12353 | `openImgGenForRecipe(rid)` Z. 7466 → Import-Fenster, Reiter „🎨 KI-Bild“, Einzelblock „📸 Neues KI-Bild für: …“, Knopf „🎨 Jetzt generieren“ → `startImgGenSingle()` Z. 7485 → `_runImgQueue([rid], _dalleGenImg)` |
| Reiter „🎨 KI-Bild“ im Import (Massen-Bilder) | Z. 2826, Pane Z. 3060–3145 | `startImgGen()` (alle ohne Bild, optional „Vorhandene Bilder ersetzen“, ~0,04 €/Bild) |
| `generateFreePhoto(rid)` (Pollinations, ohne Schlüssel) | **kein Knopf** in der Datei | toter Code Z. 16749–16788 |
| „KI erfindet das Rezeptbild“ | **in der alten Datei nicht gefunden** (grep „erfind“ nur Z. 12049, fremder Zusammenhang). Unklar, was gemeint ist; evtl. der 📸✨-Weg oder Pollinations. |

---

## 2 · Der Fluss A Schritt für Schritt

### 2.1 Schritt 1 — „✨ KI-Kreativbuch · Rezepte wählen“ (`#aiBookStep1`, Z. 3433–3439)
- Kopf: `←` (Zurück, `closeAiBook`), Titel `T('aiBookTitle')` (Z. 3801).
- Leiste: Knopf „Alle wählen“/„Alle abwählen“ (`aiBookToggleAll` Z. 7714), Zähler „N / M gewählt“ (`_aiBookUpdateCount` Z. 7729).
- Liste `#aiBookList`, gruppiert (`_buildBookGroups` Z. 7617): je Kategorie aus `catsAlle()` (Rezepte ohne Ordner, `katVonRezept`), dann je Ordner `FD` (`r.folder`), Rest unter „📝 Sonstiges“. Gruppenkopf `.aib-grp-hdr` „Symbol Name“; Zeile `.aibr` mit Kästchen `.aibr-cb` (✓) + Name, Tipp schaltet (`aiBookToggleRec` Z. 7703).
- **Vorgabe: alle Rezepte mit Namen und nicht `blank` sind gewählt** (`openAiBook` Z. 7596–7597).
- Fuß: „→ Prompt erstellen“ (`aiBookWeiter` Z. 7994), deaktiviert bei 0 gewählt.

### 2.2 Schritt 2 — „✨ KI-Kreativbuch · Prompt“ (`#aiBookStep2`, Z. 3441–3504)
Kopfzeile des Abschnitts: „← Rezepte ändern“ (`_kbCpBack` Z. 8028) und Label „Stil wählen“.

**Stil-Kacheln** `#aiBookStyleGrid` (`_kbRenderStyleChips` Z. 7988; Daten `_AIBK_STYLES` Z. 7739–7763), je Kachel Symbol, Name, Farbstreifen `acc`. **Vorgabe `auto`** (Z. 7764, Modul-Variable, nicht gespeichert):

| key | Kachel (DE, Z. 3808) | Hinweis an die KI (`hint`, wörtlich) |
|---|---|---|
| auto ✨ | KI entscheidet | (leer) |
| med 🌿 | Mediterran | „Schreibe im mediterranen Stil: warm, sonnig, duftend nach Kräutern, Zitrone und Olivenöl. Sinnliche, einladende Sprache mit Bildern des Südens.“ |
| nord 🌲 | Nordisch | „Nordisch-minimalistisch: ruhig, klar, naturverbunden. Kurze präzise Sätze. Betone Frische, Qualität der Zutaten und Einfachheit.“ |
| rust 🍂 | Rustikal | „Rustikal-nostalgisch wie ein handgeschriebenes Familienrezeptbuch: gemütlich, herzlich, mit Hauch Erinnerung. Als würdest du einer Freundin das Rezept erklären.“ |
| bunt 🎨 | Bunt | „Lebhaft wie ein Food-Blogger: persönliche Freude am Essen, kleine Ausrufe, Begeisterung. Farbenfroh in der Sprache, Emojis erlaubt.“ |
| eleg 🥂 | Elegant | „Gehobenes Kochbuch: verfeinert, präzise, kulinarisches Fachvokabular. Elegant und kultiviert wie ein Gourmet-Restaurant.“ |
| zine 📰 | Food-Zine | „Food-Zine-Stil: knapp, lebendig, direkte Ansprache. …“ (wird im Zine-Modus aber NICHT benutzt, siehe 2.3) |
| custom ✏️ | Eigener Stil | `hint:null` → Text aus Textfeld `#aiBookCustomTa` (3 Zeilen, Platzhalter „Beschreibe deinen Wunschstil … z.B. "humorvoll, direkt wie ein Berliner Street-Food-Koch"“, `oninput` baut Prompt neu, Z. 3453–3456) |

Jede Kachel hat zusätzlich `cover`-Verlauf und `acc`-Farbe fürs erzeugte Buch.
`_kbCpPickStyle(key)` Z. 7956: zeigt/verbirgt Eigener-Stil-Feld, Zine-Bereich, und bei `zine`: Kachelraster aus, Pille „📰 Food-Zine · Stil ändern ›“ (`#aiBookZinePill`, `_kbZineShowGrid` Z. 7981 klappt das Raster wieder auf), **Abschnitt „2. Antwort einfügen“ ausgeblendet** (Z. 7975). Danach Prompt neu.

**„1. Prompt kopieren oder selber schreiben“** (Z. 3486–3494, Label Z. 3803): frei editierbares Textfeld `#aiBookPromptBox` (Inhalt = `_kbBuildCpPrompt()`), Knöpfe „📋 Kopieren“ (`_kbCpCopy`), „✨ Claude“ (`_kbCpOpen('https://claude.ai/new')`), „🤖 ChatGPT“ (`_kbCpOpen('https://chatgpt.com/')`).
⚠ Jede Änderung an Stil/Format/Extra/Rezept/Eigentext **überschreibt** eigene Änderungen im Textfeld.

**„2. Antwort einfügen (JSON)“** (Z. 3496–3500): Textfeld `#aiBookTa` (Platzhalter „JSON hier einfügen …“), Knopf „📖 Kreativbuch erstellen“ → `_kbCpGenerate` Z. 8332.

### 2.3 Food-Zine-Bereich (`#aiBookZineSect`, nur bei Stil `zine`, Z. 3457–3484)
Überschrift „🗞️ Erstelle deine eigenen Food-Zine Poster“.

1. **„Wähle ein Lieblingsrezept:“** `<select id="aiBookZineRec">` (`_kbFillZineSelect` Z. 7766). Erste Option „– Kein Lieblingsrezept –“; `optgroup` je Kategorie („Symbol Name“, nur Rezepte ohne Ordner), je Ordner („📁 Name“, `r.folder` oder `r.cat==='fld_'+id`), Rest „📝 Sonstiges“. ⚠ Unabhängig von der Auswahl in Schritt 1 (Kommentar Z. 8037). Ohne Wahl ist der Prompt **leer** (Z. 8042).
2. **„Bild für die KI:“** (`_fzBildRender` Z. 8262) — drei Knöpfe `.fz-bild-opt`: „📷 Bild aus Rezept“ (`rezept`, **Vorgabe**, Z. 8256), „📎 Eigenes Bild“ (`eigen`, öffnet Dateiwahl `#fzEigenIn accept=image/*` wenn noch keins), „Ohne Bild“ (`ohne`). Vorschau `#fzBildVorschau`: Miniatur des Bildes; bei „Eigenes Bild“ zusätzlich „Anderes Bild…“; bei Rezept ohne Bild Text „Dieses Rezept hat noch kein Bild.“ Eigenes Bild: `resizeImage(…,1200,0.88)` (lange Kante 1200 px, JPEG 88 %, Z. 8285, Funktion Z. 5951). Beim **Wählen** (nicht beim Klick) wird das Bild per Canvas in ein **PNG ≤ 1600 px lange Kante** umgerechnet (`_fzAlsPng` Z. 8289), weil `clipboard.write` sonst zu spät käme (Kommentar Z. 8252–8255). Nur im Speicher, nicht persistiert.
3. **„Format wählen:“** Kachelraster (`_FZ_FORMATS` Z. 7795–7802, `_fzRenderFmtGrid`), **Vorgabe `poster`** (Z. 7810):

| id | Kachel | Unterzeile | `fmt`-Text im Prompt |
|---|---|---|---|
| poster 📄 | Poster | Querformat · Standard | „Poster im Standard-Querformat (Landscape)“ |
| a4 📋 | DIN A4 | Hochformat | „DIN A4 Hochformat“ |
| insta 📱 | Instagram | 1:1 · Quadrat | „quadratisches Format 1:1 (Social Media / Instagram)“ |
| zeitung 📰 | Zeitungsseite | Zweispaltig · Hochformat | (eigene Vorlage, s. u.) |
| karte 🎴 | Rezeptkarte | A5 · Kompakt | „kompakte Rezeptkarte im A5-Format (zum Ausdrucken und Sammeln)“ |
| panorama 🖼️ | Panorama | 16:9 · Breitformat | (eigene Vorlage, s. u.) |

4. **„Extras (optional)“** Kontrollkästchen (`_FZ_EXTRAS_DEF` Z. 7803–7809, alle aus), je Haken ein Satz unter „➕ EXTRA-ANFORDERUNGEN:“:
   - Nährwert-Infografik → „Integriere eine ansprechende Nährwert-Infografik mit Balken oder Icons für Kalorien, Fett, Kohlenhydrate und Eiweiß.“
   - Step-by-Step Diagramm → „Visualisiere die Zubereitung als Step-by-Step-Diagramm mit nummerierten Schritten und kleinen Illustrationen.“
   - Einkaufslisten-Block → „Füge einen abtrennbaren Einkaufslisten-Block mit den Zutaten als Checkbox-Liste hinzu.“
   - Vintage/Retro-Stil → „Gestalte das Layout im Vintage/Retro-Stil mit gealterten Texturen, alter Typographie und Sepia-Tönen.“
   - QR-Code Platzhalter → „Reserviere einen Bereich für einen QR-Code mit dem Hinweis [QR-Code hier einfügen].“
5. **„🔥 KI-Überraschung: Trendrezepte entdecken!“** (`.fz-trend-btn`, animierter Regenbogen, CSS Z. 931–935) → `_fzTrendSurprise` Z. 7844: setzt den Prompt fest auf einen **rezept-unabhängigen** Text (Format immer „Poster im Standard-Querformat (Landscape)“, Extras/Format/Bild werden ignoriert) und scrollt zum Textfeld. Inhalt: „Du bist ein kreativer Food-Zine-Gestalter. Erstelle ein einziges, großes, spektakuläres Food-Zine-Poster im Mixed-Media-Stil für EIN aktuelles Trendrezept, das gerade in sozialen Medien viral geht.“ / „Wähle selbst ein Rezept … TikTok FoodTok, Instagram Reels oder Pinterest Trends. Überrasch uns komplett!“ / „🔥 DESIGN: Modern, trendig, Social-Media-tauglich …“ / PFLICHT-INHALTE 1–8 (Headline + #[Rezept]Trend, „Viral auf [Plattform]"-Badge, Zutaten-Infografik, 5–6 Schritte, „Warum trendet das gerade?“, Nährwert-Icons, Pro-Tipps, Serviervorschlag für den Food-Post) / „Am Ende: KI nennt das gewählte Rezept + kurze Erklärung, warum es gerade viral geht.“ Wird von der nächsten Einstellungsänderung überschrieben.
6. **„🖼️ Meine Food-Zine Bilder“** Galerie (Z. 3476–3483; Code Z. 7863–7931), siehe § 3.

### 2.4 Die Food-Zine-Prompts (`_kbBuildCpPrompt` Zine-Zweig, Z. 8038–8202)
Variablen aus dem Lieblingsrezept: `ingLines` = „• Menge Einheit Name“ je Zutat (alle), `stepLines` = „1. txt“ (alle), `zeit` = `r.prepTime+' Minuten'` sonst „ca. 30–60 Minuten“, `portionen` = `r.servings||4`, `portionText` = „Ergibt: yieldText“ oder „Portionen: N Personen“ (bei Kategorie `kuchen` „Stück“), `kat` = `catName(r.cat)||'Hauptgericht'`, `ico` = `catIco(r.cat)||'🍽️'`, `nutStr` = „Nährwerte pro Portion: kcal | Fett | KH | Eiweiß“ falls `r.nutrition.kcal`, `extras` = „Aromen/Stil: …“ aus `r.flavors`, `extraBlock` (s. o.). Gemeinsamer Rezeptblock: „📖 REZEPT: · Kategorie · 👥 · ⏱️ … 🧂 ZUTATEN: · 👨‍🍳 ZUBEREITUNG:“.

- **Zeitungsseite** (Z. 8055–8072): „STILPRIORITÄT: Natürlich wirkende aufgeschlagene Zeitung auf einem Tisch …“, Bild einer alten aufgeschlagenen Zeitung (Doppelseite, Mittelfalte, Sepia, zweispaltig), Rezeptblock, „📰 LAYOUT — AUFGESCHLAGENE DOPPELSEITE“ mit LINKE SEITE (Kopfzeile Zeitungsname/Datum, Titel, Foto/Strichillustration, Zutatenblock + Einkaufsliste mit Checkboxen) / RECHTE SEITE (Schritte als Spalten, Nährwerte als schlichte Textbox, Kultur & Geschichte, Bewusst genießen & Serviervorschlag), „🚫 NICHT SO: …“, Schlusssatz „Man sitzt am Tisch und liest eine alte gedruckte Wochenzeitung mit Rezeptseite.“ + extraBlock.
- **Panorama 16:9** (Z. 8073–8183): ein einziges Panorama-Poster, kein mehrseitiges Zine; Szene am **Herkunftsort** des Gerichts (KI bestimmt Region), Mixed-Media-Collage, Rezeptblock, LAYOUT-INHALTE 1–12 (Titel, Teaser, Infopillen „N Portionen · Zeit · Kat“, Zutaten-Illustrationen, Step-by-Step-Diagramm, „Auf einen Blick“, Nährwert-Infografik, Gesundheit, Ökologie/Saisonalität, Geschichte & Kultur, Serviervorschlag, Tipps & Variationen), DESIGN-STIL, ORTSVARIABLEN-Beispiele (Ratatouille/Provence, Gyoza/Izakaya, Sushi, Gulasch, Erdbeer-Joghurt-Torte, Gemüsesuppe), DRUCKQUALITÄT (A0, 300/150 dpi, Zielauflösungen 14043×9933 · 7022×4967 · 14043×7902 · 7022×3951 px) + extraBlock.
- **Alle anderen Formate** (poster, a4, insta, karte; Z. 8184–8211): „Erstelle ein farbiges Food-Zine Poster im Mixed-Media-Stil im {fmt} zu Folgendem Rezept:“ + Rezeptblock + „Füge nötige Schritt-für-Schritt-Abbildungen, Diagramme … ein. Ergänze auch gesundheitliche oder ökologische Hintergründe“ + „Format: {fmt} · Farbdruck · Mixed-Media-Stil“ + „📌 SEITE 1 — TITELSEITE (Cover)“ (Bild Aquarell+Foto-Collage, Titel handschriftlich, Teaser, Infopillen) + „📌 SEITE 2 — ZUBEREITUNG & DIAGRAMME“ + „📌 SEITE 3 — HINTERGRUNDWISSEN & GENUSS“ + „✏️ DESIGN-STIL: Warm, einladend … Einheitliche Farbpalette und Schriftfamilie über alle Seiten.“ + extraBlock.
- Sprache: Zine-Prompts **immer Deutsch** (keine Übersetzung).

### 2.5 Der Kreativbuch-Prompt (alle anderen Stile, Z. 8212–8236)
Rezepte = gewählte aus Schritt 1; je Rezept eine Zeile „N. Name (bis zu 6 Zutaten ‚Menge Einheit Name', …)“. Optional „Stil: {hint}“. **In 8 Sprachen** (de, en, ru, zh, es, fr, it, pt) nach `CL`. DE:
```
Schreibe für die folgenden Rezepte kurze Texte für ein persönliches Kochbuch.[\nStil: …\n]
Rezepte:
1. …
Antworte NUR mit diesem JSON (kein Text davor oder danach):
{"kreativbuch":[
  {"name":"Rezeptname","intro":"Warmherzige Einleitung (60-80 Wörter)","tip":"1 Küchentipp","serve":"Serviervorschlag (1 Satz)"},
  ...
]}
```

---

## 3 · Speicherung, Galerie, Drag&Drop, Druck (alt)

- **Kein Teil von A wird gespeichert.** `_kbCpStyle`, `_fzFormat`, `_fzExtras`, `_fzBild`, `_aiBookSel`, `_fzg.items` sind Modul-Variablen (Z. 7764, 7810–7811, 8256, 7590, 7863); nach Neuladen weg. Keine localStorage-/IndexedDB-Schlüssel.
- **Galerie „Meine Food-Zine Bilder“** (`_fzg={items:[],THUMB:280,Q:0.82}` Z. 7863): „📎 Bilder hinzufügen“ (`#fzgFileIn`, mehrfach, `accept=image/*`) → `_fzgAddFiles` Z. 7864: je Datei `URL.createObjectURL(f)` (Original bleibt als Blob-URL), Vorschau per Canvas ≤ 280 px, JPEG 82 % als data-URL. **Keine Grenze** für Anzahl oder Größe, nur `image/*`. Leer: „Noch keine Bilder“.
- Kachel `.fzg-thumb` (4:3), „✕“ entfernt (`_fzgDel`, gibt Blob-URL frei).
- **Drag&Drop**: Maus über HTML5 `draggable` (`_fzgDS/_fzgDO/_fzgDP/_fzgDE` Z. 7898–7901: splice an Zielplatz, Klassen `dragging`/`drag-over`); **Finger** über `touchstart/move/end` (`_fzgTS/_fzgTM/_fzgTE` Z. 7902–7923): Klon `position:fixed` folgt dem Finger (−44 px), Ziel per `elementFromPoint`. ⚠ Kein Langdruck, `touchstart` startet sofort; `_fzgTM` ruft `preventDefault` (verhindert Scrollen auf der Kachel).
- **Tippen** → Großansicht `.fzg-lb` (`_fzgOpen` Z. 7924, zeigt das **Original** per Blob-URL, ✕ / Tipp daneben / Esc schließen) mit Knopf „🖨️ Drucken / PDF“ → `_fzgPrint` Z. 7936: `window.open` neues Fenster, Bild schwarz hinterlegt, Leiste „🖨️ Drucken / Als PDF speichern“ (`window.print()`), `@page{size:auto;margin:0}`, Leiste beim Druck aus. **Nur ein Bild**, kein Buch aus der Galerie, kein Export, kein Speichern.
- Zum Vergleich **C „Eigenes Kreativbuch“**: max. 30 Bilder, Warnung ab 20, ≤ 15 MB/Datei, JPG/PNG/WEBP/GIF/PDF (PDF über pdf.js 3.11.174 von cdnjs, Seiten als Bilder, Fehlschlag = Platzhalter), Vorschau 320 px, Druckbild 1600 px, JPEG 85 % (Z. 16465–16470); Griff ⠿, Drag&Drop wie oben (Z. 16620–16652); „📥 Als Kochbuch-PDF erstellen“ = neues Fenster, je Bild ein A4-Blatt, `window.print()` (Z. 16695–16722); „💾 Projekt speichern (.kreativbuch)“ = Datei `{v:1,images:[{name,thumbUrl,exportUrl}]}` (Z. 16654); „📂 Kreativbuch laden“ (Z. 16666). Ebenfalls nichts in localStorage/IDB.

## 4 · Die Knöpfe Claude / ChatGPT / Kopieren (alt)

- **Kein API-Aufruf, kein Schlüssel.** `_kbCpOpen(url)` Z. 8319: ruft **zuerst `_kbCpCopy()`** und öffnet dann per verstecktem `<a target=_blank>` die Adresse. Claude: `https://claude.ai/new`; ChatGPT: `https://chatgpt.com/`, im Stil Zine aber `https://chatgpt.com/?hints=image` (Kommentar: Parameter nicht dokumentiert, Wirkung ungeprüft). Der Prompt steht **nicht** in der URL; der Nutzer fügt ihn selbst ein.
- `_kbCpCopy` Z. 8300: Textfeldinhalt. Wenn Stil `zine`, Bildwahl ≠ „ohne“, PNG fertig und `ClipboardItem` vorhanden: Text + `\n\n` + „📷 Das beigefügte Foto zeigt das echte Gericht — nutze es als Vorlage für das Bild.“ und PNG in **einem** Zwischenablage-Eintrag (`navigator.clipboard.write`), Meldung „📋 Text und Bild kopiert — in ChatGPT einfach einfügen“; schlägt das fehl → nur Text, „📋 Nur der Text ist kopiert — dieser Browser nimmt kein Bild in die Zwischenablage“. Sonst `writeText`, Knopf zeigt 2 s „✓ Kopiert!“; ohne Clipboard-API `execCommand('copy')`.

## 5 · Antwort einfügen und Buch bauen (alt, `_kbCpGenerate` Z. 8332–8380)
- Leer → „⚠️ Bitte zuerst JSON einfügen.“ Entfernt ```-Zäune, nimmt den ersten `{…}`-Block, `JSON.parse`; Fehler → „⚠️ Ungültiges JSON – bitte prüfen.“
- Liste = `data.kreativbuch || data.recipes || data` (muss Array sein).
- Zuordnung je gewähltem Rezept: Eintrag mit gleichem `name` (Groß/klein egal, getrimmt), sonst Eintrag an derselben Stelle.
- Felder genutzt: `intro`, `tip`, `serve`.
- Ausgabe: **eine HTML-Datei** `kreativbuch-YYYY-MM-DD.html` per `dlBlob` (Z. 9903), danach Overlays zu, Meldung „📖 Kreativbuch erstellt & heruntergeladen!“. Aufbau: Deckblatt (Verlauf `dsn.cover`, „✨ KI-Kreativbuch“, „Mein persönliches Rezeptbuch“, „Erstellt am … · KI-Texte · N Rezepte“, Stil-Abzeichen), je Rezept `<section class="kb-page">`: Bild (`r.img||r.photo`), Name, Intro-Kasten (Rand `acc`), Tipp-Kästen (Küchentipp, Servieren), „Zutaten“-Liste, „Zubereitung“-Liste; `@media print` Seitenumbruch je Rezept. Kein Blättern, kein PDF-Knopf (Drucken nur über den Browser).
- Im Stil Zine ist dieser Abschnitt verborgen (Zine erzeugt keine JSON-Antwort).

## 6 · Bild-Werkzeuge am Rezept (alt, kurz)
- `_bildHolen(prompt,size)` Z. 6219: OpenAI `/v1/images/generations` mit Schlüssel `openaiImgKey9m`/`openaiKey9m` (localStorage, Z. 6150), ohne `response_format`, Modelle `dall-e-3` dann `gpt-image-1` (Z. 6168), vorher `bildAuftragFreigabe` (Halt bei KI-Anweisung). Prompt `_buildDallePrompt` Z. 6154 („Food photography: a beautifully plated "{name}", featuring {5 Zutaten}. Preparation: {2 Schritte}. Natural light …“), Größe 1024×1024, Ergebnis `_compressImgStage1` → `r.img`.
- `generateFreePhoto` (tot): `https://image.pollinations.ai/prompt/{name}, food photography…?width=512&height=768&model=flux&nologo=true&seed=…`, danach `openCrop`.
- Toter Viewer B: `buildZinePrompts` Z. 16795 (drei englische Seiten-Prompts „PAGE 1 – COVER / PAGE 2 – STEP-BY-STEP / PAGE 3 – HEALTH & ECO“, Texte Deutsch); `startZine` erzeugte sie per `_bildHolen(…,'1024x1792')`; Prompt-Kopier-Weg `_zineShowPrompts` (Kopieren, „ChatGPT →“ `https://chatgpt.com`, „🖼️ Fertiges Bild hochladen“); `saveZinePage` setzte eine Seite als Rezeptbild, `downloadZinePage` PNG. ⚠ Nebenbefund: `buildZinePrompts` liest `ings[].items[].q/u/n` (altes Datenformat) — beim heutigen flachen `{amt,unit,name}` wäre die Zutatenliste immer „verschiedene Zutaten“, und `((s.text||s)||'').slice` auf einem Schritt-Objekt `{txt}` würfe vermutlich einen TypeError. Nicht gefahren, nur gelesen; Code ist ohnehin unerreichbar.

---

## 7 · Abgleich mit der neuen App

### 7.1 Was es gibt

| Alt | Neu | Stelle |
|---|---|---|
| Einstieg „Food-Zine“ unter der Rezeptkarte | Zeile „Food-Zine“ im Menü „Mehr“ am Rezept und im Bild-Blatt; Unterzeile „N von 3 Seiten“ | `neu/app.mjs:271`, `:727`; `A.zine` `neu/zine.mjs:46`; `stand` `:111` |
| Einstieg KI-Kreativbuch (Export) | Einstellungen → Thema „Buch“ → Zeile „Kreativbuch“ | `neu/app.mjs:686` (`KB.zeile`), `neu/kreativbuch.mjs:272`, `A.kreativ` `:61` |
| toter Drei-Seiten-Viewer B | **neu lebendig**: Fenster mit drei Seiten (Titelseite, Schritt für Schritt, Gesundheit und Tipps), je Seite: Auftrag kopieren, „Auftrag und Rezeptfoto kopieren“ (nur wenn `r.img`), Bild einsetzen/ersetzen, Erzeugen (OpenAI, Hochformat, ~8 Cent, Bestätigungsfenster, KI-Anweisungs-Halt), Seite entfernen, Großansicht | `neu/zine.mjs:31–107`; Prompts `zineAuftraege` `kern/ausgabe/zine.mjs:55` (Englisch, Beschriftung in Oberflächensprache), Prüfung `pruefeZineAuftrag` `:106` |
| Zine-Stil | 5 Bildstile als Chips: Collage (Vorgabe), Aquarell, Zeitung, Retro, Modern; gespeichert in `E.zineStil` | `kern/ausgabe/zine.mjs:27–34`, `neu/zine.mjs:48` |
| Text+Bild in einer Zwischenablage | `kopiere(i, mitFoto)` mit PNG ≤ 1600 px, vorab umgerechnet beim Öffnen; Hinweissatz Englisch `ZINE_FOTO_HINWEIS` | `neu/zine.mjs:53–70`, `kern/ausgabe/zine.mjs:72` |
| Seiten nur bis Neuladen | Seiten liegen dauerhaft am Rezept `r.zine` (3 data-URLs) → in Sicherung/Tresor (IndexedDB `KuechenKern-<ausgabe>`) | `kern/modell/rezept.mjs:31–34`, `kern/ausgabe/zine.mjs:76–86`, `kern/speicher/speicher.mjs` |
| Galerie | Bilder-Ordner, Filter „Food-Zine“: jede Zine-Seite eine Kachel, Löschen per Auswahl | `neu/app.mjs:476–481`, `:923`; `neu/zine.mjs:114–124`; `zineGalerie` `kern/ausgabe/zine.mjs:89` |
| — | Beispiel-Zines aus Paket „foodzine-beispiele“ | `neu/zine.mjs:126`, `zineSaetzeEinlesen` `kern/ausgabe/zine.mjs:118` |
| Rezeptauswahl Schritt 1 (Liste mit Häkchen, gruppiert) | **ein `<select>`**: „Alle Rezepte · N“, je Kategorie „Name · N“, je Ordner | `neu/kreativbuch.mjs:49–50` (`kb-wahl`) |
| 8 Stil-Kacheln + Eigener Stil | 8 Chips (KI entscheidet, Mediterran, Nordisch, Rustikal, **Bunt und kreativ**, Elegant, Food-Zine, Eigener Stil); Eigener Stil = einzeiliges Feld (max. 300 Zeichen); Stil gespeichert `E.kreativ.stil` | `kern/ausgabe/kreativbuch.mjs:32–41`, `neu/kreativbuch.mjs:51–52`, `:63` |
| Kopieren / Antwort einfügen | „Auftrag kopieren“ (EIN Auftrag für alle offenen Rezepte, Englisch, Ausgabesprache `zielName`), „Antwort einsetzen“ (eigenes Fenster mit Textfeld) | `A['kb-kopieren']` `neu/kreativbuch.mjs:101`, `kbSammelAuftrag` `kern/ausgabe/kreativbuch.mjs:83`; `A['kb-einsetzen(-los)']` `:108–121`, `kbAntwortLesen` `kern:104` |
| JSON `{kreativbuch:[{name,intro,tip,serve}]}` | `{kreativbuch:[{nr,name,intro,flavorNote,cookTip,servingIdea,health,eco}]}`; Zuordnung über `nr`, dann Name, dann Stelle; Texte gespeichert je Rezept **und** Stil in `E.kreativ.texte[uid][stil]` | `kern/ausgabe/kreativbuch.mjs:57–60`, `:104–123`; `legeAb` `neu/kreativbuch.mjs:43` |
| HTML-Download | „Blättern“ (iframe in der App), „PDF“ (Browser-Druck), „HTML“ (Datei) | `neu/kreativbuch.mjs:123–133`, `kreativBlaettern`/`kreativPdf` `kern:230/235` |
| — | zusätzlich Weg mit Anthropic-Schlüssel (Kosten vorab, abbrechbar) | `neu/kreativbuch.mjs:68–99`, `kbLauf` `kern:148` |
| Eigenes Kreativbuch (C) | „Aus Bildern“: 30 Bilder, 15 MB, 1600/320 px, JPEG 85 %, PDF-Seiten (pdf.js aus `/Workflow-PDF/vendor`, `pdfjsLaden`), Drag&Drop **nur Maus**, sonst Tippen + „Nach vorn/hinten“, „Als Rezeptbild“, „Entfernen“ mit Rückgängig, Blättern/PDF/HTML; Projekte im Gerät + `.kreativbuch`-Datei | `neu/kreativbuch.mjs:139–263`, `kern/ausgabe/eigenbuch.mjs:20–127` |
| 📸✨ KI-Bild | Bild-Blatt „Bild von der KI erzeugen“ (OpenAI, `kiBild`, Modelle dall-e-3 → gpt-image-1 → vom Schlüssel gemeldete) und „Foto über Pollinations“ (eigener Schlüssel) | `neu/app.mjs:725–726`, `:743–750`, `:974–977`; `kern/ki/bild.mjs` |

### 7.2 Was FEHLT oder anders ist (Kern des Auftrags)

1. **Der ganze Food-Zine-Poster-Generator aus A fehlt.** Neu gibt es nur die drei festen Seiten-Aufträge (Herkunft: toter Code B), nicht den Ein-Poster-Prompt aus `_kbBuildCpPrompt`. Im Kern gibt es keine Entsprechung (grep „Panorama“, „Zeitungsseite“, „Rezeptkarte“, „Einkaufslisten-Block“, „QR-Code Platzhalter“ in `neu/`/`kern/`: keine Treffer außer QR-Teilen). Es fehlen:
   - **„Wähle ein Lieblingsrezept“** (neu ist Zine immer am offenen Rezept; kein Rezept-Wähler im Zine-Fenster).
   - **„Bild für die KI“** mit drei Optionen: nur „Rezeptfoto“ als zweiter Kopier-Knopf; **kein „Eigenes Bild“** (Datei, 1200 px/88 %) und keine Miniatur-Vorschau des KI-Bildes; „Ohne Bild“ entspricht dem einfachen Kopieren.
   - **„Format wählen“** (Poster, DIN A4, Instagram 1:1, Zeitungsseite, Rezeptkarte A5, Panorama 16:9) — neu fest A4-Hochformat, Erzeugen fest `hoch`. Die zwei Spezialvorlagen **Zeitungsseite** (Doppelseite) und **Panorama** (Herkunftsort, 12 Inhalte, Ortsbeispiele, A0-Druckauflösung) fehlen ganz; „Zeitung“ und „Retro“ gibt es nur als kurze Stil-Sätze (`kern/ausgabe/zine.mjs:30–31`).
   - **„Extras“** (5 Kästchen) fehlen; nur „Vintage/Retro“ als Stil.
   - **„🔥 KI-Überraschung: Trendrezepte entdecken!“** fehlt (nur „Modern“ als Stil, `:32`).
   - Rezeptdaten im Prompt: alt ALLE Zutaten/Schritte, Zeit, Portionen/„Ergibt“, Kategorie+Symbol, Nährwerte, Aromen; neu 8 Zutaten, 6 Schritte à 80 Zeichen, Portionen, Zeit — ohne Kategorie, Nährwerte, Aromen, `yieldText`.
   - Prompt-Sprache: alt Deutsch, neu Englisch (mit Beschriftung in Oberflächensprache).
2. **Kein editierbares Prompt-Textfeld** („1. Prompt kopieren oder selber schreiben“) — weder im Zine (`neu/zine.mjs` kopiert direkt) noch im Kreativbuch (`kb-kopieren` kopiert direkt). Selber schreiben / vor dem Kopieren ändern geht nicht.
3. **Keine Knöpfe „✨ Claude“ / „🤖 ChatGPT“** (grep `chatgpt`/`claude.ai/new` in `neu/`, `kern/`: 0 Treffer). Alt: kopieren + `claude.ai/new` bzw. `chatgpt.com` (`?hints=image` im Zine) im neuen Tab öffnen.
4. **„Meine Food-Zine Bilder“-Galerie fehlt in ihrer alten Form**: alt freie Sammlung eigener Bilder (beliebig viele, ✕, Drag&Drop Maus **und Finger**, Großansicht mit Original, „🖨️ Drucken / PDF“ je Bild). Neu zeigt die Galerie nur die drei Seiten je Rezept (Bilder-Ordner, Filter „Food-Zine“); kein freies Hinzufügen dort, kein Umsortieren, kein Einzeldruck. Großansicht gibt es im Zine-Fenster (`A['zine-gross']` `neu/zine.mjs:49`), aber ohne Druck-Knopf. Das freie Sammeln + Ordnen + Druck/PDF als Buch steckt neu in „Aus Bildern“ (`neu/kreativbuch.mjs:139ff.`) — dort fehlt **Finger-Drag** (nur `dragstart/drop`, `:156–159`; Touch nur über Knöpfe „Nach vorn/hinten“) und eine **Großansicht** einzelner Bilder (Tippen wählt nur aus, `:151`).
5. **Rezeptauswahl**: alt Liste mit Häkchen je Rezept, gruppiert (Kategorie/Ordner/Sonstiges), Vorgabe alle, „Alle wählen/abwählen“, Zähler; neu nur Gesamt / eine Kategorie / ein Ordner (`kb-wahl`). **Einzelne Rezepte an-/abwählen geht nicht.**
6. **Eigener Stil**: alt 3-zeiliges Textfeld, neu einzeilig, max. 300 Zeichen. Kachel „Bunt“ heißt neu „Bunt und kreativ“; Stil-Hinweise sind ins Englische übersetzt, beim alten „Bunt“ fehlt neu „Emojis erlaubt“ (`kern/ausgabe/kreativbuch.mjs:37`).
7. **Food-Zine-Stil im Kreativbuch**: alt schaltet „Food-Zine“ in den Poster-Generator um (Antwort-Abschnitt aus); neu ist „Food-Zine“ nur ein Schreibstil für Buchtexte (`kern/ausgabe/kreativbuch.mjs:39`). Die Verbindung „Food-Zine-Knopf am Rezept öffnet das KI-Kreativbuch im Zine-Stil“ (`openFzgAsAiBook`) gibt es neu nicht; der Rezept-Knopf öffnet das Drei-Seiten-Fenster.
8. **JSON-Format verschieden** (siehe 7.1); die neue App liest alte Antworten mit `intro/tip/serve` nur teilweise: `kbTexte` übernimmt nur Felder aus `KB_FELDER` → von einer alten Antwort bliebe nur `intro`; `tip`/`serve` gingen verloren (`kern/ausgabe/kreativbuch.mjs:95–100`). Gelesen, nicht gefahren.
9. **Buch-Ausgabe**: alt sofortiger HTML-Download nach „Kreativbuch erstellen“; neu Texte erst ablegen, dann Blättern/PDF/HTML — Funktion ist reicher, Ablauf anders.
10. **Mehrsprachigkeit der Kopier-Prompts**: alt Kreativbuch-Prompt in 8 Sprachen; neu ein englischer Auftrag mit Zielsprache — gleichwertig in der Wirkung, aber nicht derselbe Text.

### 7.3 Neu und ohne alte Entsprechung (nur zur Vollständigkeit)
Seiten am Rezept dauerhaft gespeichert · Bild einsetzen je Zine-Seite (Ersatz für „Fertiges Bild hochladen“ aus B) · Erzeugen per OpenAI mit Kosten- und Inhaltsanzeige · KI-Anweisungs-Prüfung vor jedem Senden · Rückgängig überall · Projekte im Gerät · Beispiel-Zines.

---

## 8 · Offene Fragen an Klaus (nicht geraten)
- „KI erfindet das Rezeptbild“: in der alten Datei nicht gefunden — welcher Knopf ist gemeint?
- Soll die freie Food-Zine-Galerie wieder **eigene Sammlung** werden (und dann gespeichert, z. B. als Projekt), oder reicht „Aus Bildern“ mit Finger-Drag + Großansicht + Einzeldruck?
- Soll der neue Poster-Generator die drei festen Seiten (heutiges `neu/zine.mjs`) **ergänzen** oder ersetzen?
- Prompt-Sprache Deutsch (wie alt) oder Englisch (wie neu)?
