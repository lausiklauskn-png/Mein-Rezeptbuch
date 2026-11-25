// Küchen-Kern · Food-Zine: der Poster-Auftrag der alten App (KI-Kreativbuch · Prompt, Stil „Food-Zine“, Fluss A) und die Sammlung
// „Meine Food-Zine-Bilder“. Übernommen ist, was sich in der alten App bewährt hat (_kbBuildCpPrompt Zine-Zweig, _FZ_FORMATS,
// _FZ_EXTRAS_DEF, _fzTrendSurprise, _fzg), nicht ihr Code. Rein, ohne DOM.
//  - Der Auftrag entsteht aus EINEM Rezept (alle Zutaten, alle Schritte, Zeit, Portionen oder „Ergibt“, Kategorie mit Symbol, Nährwerte,
//    Aromen), einem von sechs Formaten und bis zu fünf Extras. Zeitungsseite und Panorama haben ihre eigenen langen Vorlagen.
//    Er wird kopiert und in einen Chat gegeben (Claude, ChatGPT); die App ruft dafür keine KI auf und braucht keinen Schlüssel.
//  - Sprache: auf Deutsch die deutschen Texte der alten App, wörtlich. In jeder anderen Sprache derselbe Auftrag auf Englisch, mit dem
//    Satz, die Beschriftung des Bildes in der Sprache der Oberfläche zu setzen (die KI zeichnet das Bild, nicht die App).
//  - Die Sammlung liegt im Speicher des Geräts (zineSammlung, wie die Projekte des Kreativbuchs: eine Liste mit Vorschaubildern und je
//    Bild ein Eintrag mit dem großen Bild und dem Original). Sie steht nicht in der Sicherung; der Weg nach draußen ist „Als Buch“.
//  - Bis Fassung 0.27 lagen am Rezept drei Seiten (`zine`, aus dem toten Drei-Seiten-Viewer der alten App). zineAusRezepten nimmt sie
//    heraus, damit die App sie einmal in die Sammlung legt; modell/rezept.mjs liest das Feld weiter (alte Sicherungen).
// Anders als die alte App:
//  - die Sammlung überlebt das Neuladen (Klaus' Wahl); alt war sie nach dem Neuladen weg;
//  - ein eigenes Auftragsfeld wird nicht überschrieben, wenn sich eine Einstellung ändert (die App bietet „Auftrag neu bauen“ an);
//  - ChatGPT öffnet https://chatgpt.com/ (alt mit ?hints=image, einem nicht dokumentierten Zusatz).
import { zineFeld } from '../modell/rezept.mjs';
import { esc, druckBild, DRUCK_RICHTLINIE } from './druck.mjs';
import { blatt } from './buch.mjs';

/* ───────────── der Auftrag ───────────── */

/** Die sechs Formate in der Reihenfolge der alten App; das erste ist die Vorgabe. Namen und Unterzeilen stehen in der App. */
export const ZINE_FORMATE = ['poster', 'a4', 'insta', 'zeitung', 'karte', 'panorama'];
export const ZINE_FORMAT_VORGABE = 'poster';
/** Die Kennung eines Formats, das es gibt; sonst die Vorgabe. */
export const zineFormat = (id) => (ZINE_FORMATE.includes(id) ? id : ZINE_FORMAT_VORGABE);
/* Was im Auftrag für das Format steht (alt: fmt). d = Deutsch (wörtlich aus der alten App), e = Englisch. */
const FORMAT_TEXT = {
  poster: { d: 'Poster im Standard-Querformat (Landscape)', e: 'standard landscape poster format' },
  a4: { d: 'DIN A4 Hochformat', e: 'DIN A4 portrait format' },
  insta: { d: 'quadratisches Format 1:1 (Social Media / Instagram)', e: 'square 1:1 format (social media / Instagram)' },
  zeitung: { d: 'Zeitungsseiten-Layout (zweispaltig, Hochformat)', e: 'newspaper page layout (two columns, portrait)' },
  karte: { d: 'kompakte Rezeptkarte im A5-Format (zum Ausdrucken und Sammeln)', e: 'compact A5 recipe card (to print and collect)' },
  panorama: { d: 'Breitformat-Panorama (16:9, ideal für Screens und Pinterest)', e: 'wide 16:9 panorama (ideal for screens and Pinterest)' },
};
/** Die fünf Extras der alten App (Haken, alle aus). */
export const ZINE_EXTRAS = ['nutr', 'steps', 'shop', 'retro', 'qr'];
const EXTRA_TEXT = {
  nutr: { d: 'Integriere eine ansprechende Nährwert-Infografik mit Balken oder Icons für Kalorien, Fett, Kohlenhydrate und Eiweiß.', e: 'Include an appealing nutrition infographic with bars or icons for calories, fat, carbohydrates and protein.' },
  steps: { d: 'Visualisiere die Zubereitung als Step-by-Step-Diagramm mit nummerierten Schritten und kleinen Illustrationen.', e: 'Show the preparation as a step-by-step diagram with numbered steps and small illustrations.' },
  shop: { d: 'Füge einen abtrennbaren Einkaufslisten-Block mit den Zutaten als Checkbox-Liste hinzu.', e: 'Add a detachable shopping-list block with the ingredients as a checkbox list.' },
  retro: { d: 'Gestalte das Layout im Vintage/Retro-Stil mit gealterten Texturen, alter Typographie und Sepia-Tönen.', e: 'Design the layout in a vintage/retro style with aged textures, old typography and sepia tones.' },
  qr: { d: 'Reserviere einen Bereich für einen QR-Code mit dem Hinweis [QR-Code hier einfügen].', e: 'Reserve an area for a QR code with the note [insert QR code here].' },
};
/** Nur bekannte Extras, ohne Doppel, in der Reihenfolge der alten App. */
export const zineExtras = (liste) => { const s = new Set(liste || []); return ZINE_EXTRAS.filter((x) => s.has(x)); };

/* Sprachen, deren Namen ein englischer Auftrag nennt (für die Beschriftung des Bildes). */
const SPRACHE_EN = { es: 'Spanish', fr: 'French', it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese' };
const schriftSatz = (sprache) => (SPRACHE_EN[sprache] ? `\n\nLANGUAGE: Write every headline, label and text on the picture in ${SPRACHE_EN[sprache]}.` : '');
const str = (v) => (v == null ? '' : String(v).trim());
const zahl = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const LINIE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
const LINIE_KURZ = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

/** Was aus dem Rezept in den Auftrag geht, in der Form der alten App. kategorie: { name, symbol, id } (Anzeige der App). */
function rezeptTeile(r, de, kategorie) {
  const ingLines = (r.ings || []).map((i) => '• ' + [str(i && i.amt), str(i && i.unit), str(i && i.name)].filter(Boolean).join(' ')).filter((z) => z !== '• ').join('\n');
  const stepLines = (r.steps || []).map((s) => str(s && (s.txt ?? s.text) || (typeof s === 'string' ? s : ''))).filter(Boolean).map((t, j) => (j + 1) + '. ' + t).join('\n');
  const min = zahl(parseInt(r.prepTime, 10));
  const zeit = min ? (de ? min + ' Minuten' : min + ' minutes') : (de ? 'ca. 30–60 Minuten' : 'about 30–60 minutes');
  const portionen = zahl(parseInt(r.servings, 10)) || 4;
  const kuchen = kategorie && kategorie.id === 'kuchen';
  const portionText = str(r.yieldText) ? (de ? 'Ergibt: ' : 'Makes: ') + str(r.yieldText) : (de ? 'Portionen: ' + portionen + (kuchen ? ' Stück' : ' Personen') : 'Servings: ' + portionen + (kuchen ? ' pieces' : ' people'));
  const kat = str(kategorie && kategorie.name) || (de ? 'Hauptgericht' : 'Main course'), ico = str(kategorie && kategorie.symbol) || '🍽️';
  const n = r.nutrition && typeof r.nutrition === 'object' ? r.nutrition : null;
  const nutStr = n && zahl(n.kcal) ? (de ? '\nNährwerte pro Portion: ' + n.kcal + ' kcal | Fett: ' + (n.fat ?? 0) + 'g | KH: ' + (n.carbs ?? 0) + 'g | Eiweiß: ' + (n.protein ?? 0) + 'g' : '\nNutrition per serving: ' + n.kcal + ' kcal | fat: ' + (n.fat ?? 0) + 'g | carbs: ' + (n.carbs ?? 0) + 'g | protein: ' + (n.protein ?? 0) + 'g') : '';
  const aromen = (r.flavors || []).map(str).filter(Boolean), extras = aromen.length ? (de ? '\nAromen/Stil: ' : '\nFlavours/style: ') + aromen.join(', ') : '';
  const name = str(r.name);
  const block = (de ? '📖 REZEPT: ' : '📖 RECIPE: ') + name + '\n' + ico + (de ? ' Kategorie: ' : ' Category: ') + kat + '\n'
    + '👥 ' + portionText + '\n'
    + (de ? '⏱️ Zubereitungszeit: ' : '⏱️ Preparation time: ') + zeit + nutStr + extras + '\n\n'
    + (de ? '🧂 ZUTATEN:\n' : '🧂 INGREDIENTS:\n') + (ingLines || (de ? '(keine Zutaten angegeben)' : '(no ingredients given)')) + '\n\n'
    + (de ? '👨‍🍳 ZUBEREITUNG:\n' : '👨‍🍳 PREPARATION:\n') + (stepLines || (de ? '(keine Schritte angegeben)' : '(no steps given)'));
  return { name, zeit, portionen, kat, block };
}

/** Der Auftrag für EIN Food-Zine-Poster (alt: _kbBuildCpPrompt, Stil „zine“). Ohne Rezept: ''.
 *  opt: { format, extras: [Kennungen], sprache, kategorie: { id, name, symbol } }. */
export function zinePoster(rezept, { format = ZINE_FORMAT_VORGABE, extras = [], sprache = 'de', kategorie = null } = {}) {
  const r = rezept || {}; if (!str(r.name)) return '';
  const de = sprache === 'de', f = zineFormat(format), t = rezeptTeile(r, de, kategorie);
  const ex = zineExtras(extras).map((x) => '• ' + (de ? EXTRA_TEXT[x].d : EXTRA_TEXT[x].e));
  const extraBlock = ex.length ? (de ? '\n\n➕ EXTRA-ANFORDERUNGEN:\n' : '\n\n➕ EXTRA REQUIREMENTS:\n') + ex.join('\n') : '';
  const schluss = extraBlock + (de ? '' : schriftSatz(sprache));
  if (f === 'zeitung') return (de ? zeitungDe(t) : zeitungEn(t)) + schluss;
  if (f === 'panorama') return (de ? panoramaDe(t) : panoramaEn(t)) + schluss;
  const fmt = de ? FORMAT_TEXT[f].d : FORMAT_TEXT[f].e;
  return (de ? posterDe(t, fmt) : posterEn(t, fmt)) + schluss;
}

const posterDe = (t, fmt) => 'Erstelle ein farbiges Food-Zine Poster im Mixed-Media-Stil im ' + fmt + ' zu Folgendem Rezept:\n\n'
  + t.block + '\n\n' + LINIE + '\n\n'
  + 'Füge nötige Schritt-für-Schritt-Abbildungen, Diagramme (wenn sinnvoll und kein Stilbruch) sowie Erklärungen ein.\n'
  + 'Ergänze auch gesundheitliche oder ökologische Hintergründe zum Gericht.\n\n'
  + 'Format: ' + fmt + ' · Farbdruck · Mixed-Media-Stil\n\n'
  + '📌 SEITE 1 — TITELSEITE (Cover)\n'
  + '• Großes, appetitliches Bild des fertigen Gerichts (Aquarell + Foto-Collage)\n'
  + '• Titel „' + t.name + '" in handschriftlicher / kreativer Typografie\n'
  + '• Kurzer Teaser: Herkunft, besonderes Merkmal, Stimmung des Gerichts\n'
  + '• Infopillen: ' + t.portionen + ' Port. · ' + t.zeit + ' · ' + t.kat + '\n\n'
  + '📌 SEITE 2 — ZUBEREITUNG & DIAGRAMME\n'
  + '• Schritt-für-Schritt-Illustrationen (handgezeichnet / Infografik-Stil)\n'
  + '• Zutaten als illustriertes Diagramm mit Mengenangaben\n'
  + '• Infografik: Zubereitungszeit / Schwierigkeitsgrad / Portionen\n'
  + '• Tipps & Tricks, Variationen\n\n'
  + '📌 SEITE 3 — HINTERGRUNDWISSEN & GENUSS\n'
  + '• Gesundheitliche Vorteile der wichtigsten Zutaten\n'
  + '• Ökologischer Fußabdruck / Saisonalität / regionale Herkunft\n'
  + '• Geschichte und Kultur des Gerichts\n'
  + '• Serviervorschlag & Anrichtetipps (illustriert)\n\n'
  + '✏️ DESIGN-STIL:\n'
  + 'Warm, einladend, lebendig — Mixed Media: Aquarell-Texturen, handgezeichnete Elemente, moderne Typografie.\n'
  + 'Einheitliche Farbpalette und Schriftfamilie über alle Seiten.';
const posterEn = (t, fmt) => 'Create a colourful food zine poster in mixed-media style, in ' + fmt + ', for the following recipe:\n\n'
  + t.block + '\n\n' + LINIE + '\n\n'
  + 'Add the necessary step-by-step pictures, diagrams (where useful and without breaking the style) and explanations.\n'
  + 'Also add health or ecological background on the dish.\n\n'
  + 'Format: ' + fmt + ' · colour print · mixed-media style\n\n'
  + '📌 PAGE 1 — COVER\n'
  + '• Large, appetising picture of the finished dish (watercolour + photo collage)\n'
  + '• Title “' + t.name + '” in handwritten / creative typography\n'
  + '• Short teaser: origin, special feature, mood of the dish\n'
  + '• Info pills: ' + t.portionen + ' serv. · ' + t.zeit + ' · ' + t.kat + '\n\n'
  + '📌 PAGE 2 — PREPARATION & DIAGRAMS\n'
  + '• Step-by-step illustrations (hand-drawn / infographic style)\n'
  + '• Ingredients as an illustrated diagram with quantities\n'
  + '• Infographic: preparation time / difficulty / servings\n'
  + '• Tips & tricks, variations\n\n'
  + '📌 PAGE 3 — BACKGROUND & ENJOYMENT\n'
  + '• Health benefits of the main ingredients\n'
  + '• Ecological footprint / seasonality / regional origin\n'
  + '• History and culture of the dish\n'
  + '• Serving suggestion & plating tips (illustrated)\n\n'
  + '✏️ DESIGN STYLE:\n'
  + 'Warm, inviting, lively — mixed media: watercolour textures, hand-drawn elements, modern typography.\n'
  + 'One colour palette and one font family across all pages.';

const zeitungDe = (t) => 'STILPRIORITÄT: Natürlich wirkende aufgeschlagene Zeitung auf einem Tisch. Realistische Zeitungspapier-Textur, sichtbare Mittelfalte, Schatten, dezente Sepia-Töne, ruhiges klassisches Zeitungslayout. Nicht Poster, nicht Zine, nicht Magazincover.\n\n'
  + 'Erstelle ein einziges Bild einer aufgeschlagenen alten Zeitung, die auf einem Tisch liegt. Die Zeitung soll wie eine echte gedruckte Rezept-Zeitungsseite wirken — nicht wie ein Poster, nicht wie ein Food-Zine und nicht wie eine moderne Infografik. Zwei gegenüberliegende Zeitungsseiten im Hochformat, mit sichtbarer Mittelfalte, Papierwellen, leichtem Schatten auf dem Tisch, Sepia-Papier, natürlicher Druckoptik und ruhigem zweispaltigem Layout.\n\n'
  + t.block + '\n\n' + LINIE + '\n\n'
  + '📰 LAYOUT — AUFGESCHLAGENE DOPPELSEITE:\n'
  + 'Keine Titelseite, keine 3 Einzelseiten, kein Posterlayout. Alles auf einer aufgeschlagenen Doppelseite einer Zeitung.\n\n'
  + 'LINKE SEITE: Zeitungsname/Datum als gesetzte Kopfzeile · Großer Rezepttitel in klassischer Zeitungsschrift · Rezeptfoto oder Strichillustration des fertigen Gerichts · Zweispaltiger Zutatenblock und Einkaufsliste mit Checkboxen.\n\n'
  + 'RECHTE SEITE: Zubereitungsschritte als nummerierte Zeitungsspalten · Nährwerte als schlichte Textbox (keine bunte Infografik) · Kultur & Geschichte des Gerichts als kurzer Zeitungsartikel · Bewusst genießen & Serviervorschlag als abgesetzte Rubrik.\n\n'
  + '🚫 NICHT SO: Nicht als modernes Food-Zine gestalten. Keine überfüllte Collage, keine großen bunten Sticker, keine Comic-Optik, keine Posterwirkung, keine dreigeteilte Seitenstruktur. Keine leuchtenden Farben, keine modernen Magazinelemente.\n\n'
  + 'Der Eindruck soll sein: Man sitzt am Tisch und liest eine alte gedruckte Wochenzeitung mit Rezeptseite.';
const zeitungEn = (t) => 'STYLE PRIORITY: A natural-looking open newspaper lying on a table. Realistic newsprint texture, visible centre fold, shadows, subtle sepia tones, a calm classic newspaper layout. Not a poster, not a zine, not a magazine cover.\n\n'
  + 'Create one single picture of an open old newspaper lying on a table. The newspaper should look like a real printed recipe page in a newspaper — not like a poster, not like a food zine and not like a modern infographic. Two facing newspaper pages in portrait format, with a visible centre fold, paper waves, a light shadow on the table, sepia paper, a natural print look and a calm two-column layout.\n\n'
  + t.block + '\n\n' + LINIE + '\n\n'
  + '📰 LAYOUT — OPEN DOUBLE PAGE:\n'
  + 'No cover page, no 3 separate pages, no poster layout. Everything on one open double page of a newspaper.\n\n'
  + 'LEFT PAGE: newspaper name/date as a typeset header · large recipe title in classic newspaper type · recipe photo or line illustration of the finished dish · two-column ingredients block and a shopping list with checkboxes.\n\n'
  + 'RIGHT PAGE: preparation steps as numbered newspaper columns · nutrition as a plain text box (no colourful infographic) · culture & history of the dish as a short newspaper article · mindful enjoyment & serving suggestion as a separate column.\n\n'
  + '🚫 NOT LIKE THIS: Do not design it as a modern food zine. No crowded collage, no large colourful stickers, no comic look, no poster effect, no three-part page structure. No bright colours, no modern magazine elements.\n\n'
  + 'The impression should be: you sit at the table and read an old printed weekly newspaper with a recipe page.';

const panoramaDe = (t) => 'Erstelle ein einziges großes, farbiges Food-Zine-Poster im Mixed-Media-Stil als Breitformat-Panorama 16:9.\n\n'
  + 'WICHTIG:\nErstelle kein mehrseitiges Zine, keine Seitennummern und keine getrennten Seiten.\nDas gesamte Rezept soll als ein einziges großes 16:9-Panoramaposter erscheinen.\n\n'
  + 'Die Szene spielt an dem Ort, aus dem das Gericht ursprünglich stammt:\n'
  + t.name + ' — bitte den typischen Herkunftsort / die Region / das Land / den Kulturraum für dieses Gericht selbst bestimmen.\n\n'
  + 'Der Betrachter steht gedanklich dort vor Ort — zum Beispiel auf einer Terrasse,\nin einer Küche, auf einem Markt, in einer Gasse, an einem Küstenort,\nauf einem Bauernhof oder in einer Landschaft, die typisch für die Herkunft des Gerichts ist.\n\n'
  + 'Das Poster soll wirken, als würde man nicht nur ein Rezept lesen,\nsondern kurz in die Herkunftswelt des Gerichts hineinschauen.\nOrt, Gericht und Rezeptinformationen sollen eine einzige zusammenhängende Szene bilden.\n\n'
  + 'Das Rezept erscheint wie vor dem geistigen Auge:\nals schwebende Mixed-Media-Collage aus Rezeptkarten, handgezeichneten Zutaten,\nkleinen Schritt-für-Schritt-Illustrationen, Nährwert-Infografiken,\nKulturhinweisen, Saisonalität, ökologischen Hintergründen und Serviervorschlägen.\n\n'
  + 'Die Rezeptinformationen sollen nicht wie starre Tabellen wirken,\nsondern organisch in die Szene eingebettet sein:\nauf alten Papierzetteln, Postkarten, Küchenetiketten, Markt-Schildern,\nSkizzen, Stempeln, Notizzetteln und transparenten Collageflächen.\n\n'
  + 'Das Hauptgericht steht im Vordergrund groß, appetitlich und plastisch.\nDer Herkunftsort bildet die atmosphärische Bühne im Hintergrund.\n\n'
  + LINIE_KURZ + '\n\n' + t.block + '\n\n' + LINIE_KURZ + '\n\n'
  + 'LAYOUT-INHALTE:\n\n'
  + '1. Großer handschriftlicher Titel:\n„' + t.name + '"\n\n'
  + '2. Kurzer Teaser:\nHerkunft, besonderes Merkmal und Stimmung des Gerichts.\nZum Beispiel:\n„Ein traditionelles Gericht aus [ORT / REGION], aromatisch, farbenfroh und unkompliziert."\n\n'
  + '3. Infopillen:\n„' + t.portionen + ' Portionen" · „' + t.zeit + '" · „' + t.kat + '"\n\n'
  + '4. Zutatenübersicht:\nDie Zutaten sollen als kleine handgezeichnete oder aquarellierte Illustrationen\nmit Mengenangaben dargestellt werden.\n\n'
  + '5. Step-by-Step-Diagramm:\nDie Zubereitung soll als nummeriertes Schritt-für-Schritt-Diagramm erscheinen,\nmit kleinen Illustrationen, Pfeilen und kurzen erklärenden Texten.\n\n'
  + '6. Infografik „Auf einen Blick":\nVorbereitungszeit, Kochzeit, Gesamtzeit, Schwierigkeit und Portionen.\n\n'
  + '7. Nährwert-Infografik:\nKalorien, Fett, Kohlenhydrate und Eiweiß als Balken, Icons oder kleine Diagramme darstellen.\n\n'
  + '8. Gesundheitliche Hintergründe:\nKurze Vorteile der wichtigsten Zutaten erklären.\n\n'
  + '9. Ökologie / Saisonalität:\nSaisonale Zutaten, regionale Herkunft, Transportwege, vegetarische oder nachhaltige Aspekte\nund Resteverwertung kurz darstellen.\n\n'
  + '10. Geschichte & Kultur:\nKurzer Hinweis zur Herkunft, Bedeutung und kulinarischen Tradition des Gerichts.\n\n'
  + '11. Serviervorschlag:\nPassende Beilagen, Anrichtetipps und kleine Genussnotizen ergänzen.\n\n'
  + '12. Tipps & Variationen:\nKurze praktische Hinweise, Varianten oder Fehlervermeidung einbauen.\n\n'
  + LINIE_KURZ + '\n\n'
  + 'DESIGN-STIL:\n\nWarm, einladend, lebendig, hochwertig.\nMixed Media aus Aquarelltexturen, Foto-Collage, handgezeichneten Elementen,\ngealtertem Papier, Sepia- und Ockertönen, mediterranen oder regional passenden Farben.\nVintage/Retro-Stil, aber edel und atmosphärisch.\n\n'
  + 'Einheitliche Farbpalette und Schriftfamilie.\nHandschriftliche Headlines, gut lesbare Untertexte.\nBotanische Details, regionale Dekorationen, kleine Stempel, Skizzen, Notizzettel,\nPapierfetzen und Collageflächen.\n\n'
  + 'Das Gesamtergebnis soll wie ein großes, zusammenhängendes Panorama-Food-Zine aussehen:\natmosphärisch, poetisch, regional, detailreich und trotzdem klar lesbar.\n\n'
  + LINIE_KURZ + '\n\n'
  + 'ORTSVARIABLEN — BEISPIELE:\n\n'
  + 'Ratatouille:\nEine sonnige Terrasse in der Provence / Südfrankreich,\nmit Lavendelfeldern, Olivenbäumen, Steinmauer, Zypressen\nund Blick auf ein kleines Dorf.\n\n'
  + 'Gyoza:\nEine kleine japanische Garküche oder Izakaya-Gasse in Tokio oder Osaka,\nmit Holztresen, Laternen, Dampf, Sojasauce-Schälchen\nund urbaner Abendstimmung.\n\n'
  + 'Sushi:\nEin japanischer Sushi-Tresen mit Bambus, dunklem Holz, Keramik,\nNori, Reis, Fisch und ruhiger klarer Atmosphäre.\n\n'
  + 'Gulasch:\nEine rustikale ungarische Landküche oder ein Hof mit Kupferkessel,\nPaprika-Bündeln, Holztisch, schwerem Topf und warmer Küchenstimmung.\n\n'
  + 'Erdbeer-Joghurt-Torte:\nEine helle Sommer-Kaffeetafel im Garten,\nmit Erdbeerbeet, weißer Tischdecke, Kuchengabeln,\nPorzellan und weichem Tageslicht.\n\n'
  + 'Gemüsesuppe mit Fleisch:\nEine einfache ländliche Küche,\nSuppentopf auf altem Herd, Gemüsekörbe, Holzbrett,\nKräuterbund und warme Hausmannskost-Stimmung.\n\n'
  + LINIE_KURZ + '\n\n'
  + 'DRUCKQUALITÄT:\n\nDas Motiv soll für ein großes A0-ähnliches Panoramaposter vorbereitet sein.\nSehr hohe Detailqualität, klare Komposition, keine winzige unlesbare Schrift,\ndruckfreundliche Kontraste, saubere Kanten und keine matschigen Texturen.\n\n'
  + 'Wichtige Texte groß und gut lesbar.\nLängere Rezepttexte nur als saubere Layoutflächen oder kurze lesbare Textblöcke darstellen.\n\n'
  + 'Für echten A0-Posterdruck sollte die finale Version idealerweise so vorbereitet werden:\n\n'
  + '1. Bildmotiv ohne zu viel Kleinschrift generieren.\n2. Danach auf A0-Größe hochskalieren.\n3. Überschriften, Zutaten, Schritte und Nährwerte als echten Text oder Vektortext neu setzen.\n4. Export als PDF mit 300 dpi oder mindestens 150 dpi für Großformatdruck.\n\n'
  + 'Zielauflösung für A0 quer:\n300 dpi: ca. 14043 × 9933 Pixel\n150 dpi: ca. 7022 × 4967 Pixel\n\n'
  + 'Zielauflösung für 16:9-Panorama bei A0-Breite:\n300 dpi: ca. 14043 × 7902 Pixel\n150 dpi: ca. 7022 × 3951 Pixel\n\n'
  + 'Wichtig:\nBei sehr kleinen Texten lieber Platzhalter oder größere Textflächen verwenden,\ndamit die finale Schrift später sauber im Layoutprogramm gesetzt werden kann.';
const panoramaEn = (t) => 'Create one single large, colourful food zine poster in mixed-media style as a wide 16:9 panorama.\n\n'
  + 'IMPORTANT:\nDo not create a multi-page zine, no page numbers and no separate pages.\nThe whole recipe should appear as one single large 16:9 panorama poster.\n\n'
  + 'The scene takes place where the dish originally comes from:\n'
  + t.name + ' — please determine the typical place of origin / region / country / cultural area of this dish yourself.\n\n'
  + 'The viewer imagines standing right there — for example on a terrace,\nin a kitchen, at a market, in an alley, at a coastal town,\non a farm or in a landscape typical of where the dish comes from.\n\n'
  + 'The poster should feel as if you were not just reading a recipe,\nbut briefly looking into the world the dish comes from.\nPlace, dish and recipe information should form one single connected scene.\n\n'
  + 'The recipe appears as if before the mind’s eye:\nas a floating mixed-media collage of recipe cards, hand-drawn ingredients,\nsmall step-by-step illustrations, nutrition infographics,\ncultural notes, seasonality, ecological background and serving suggestions.\n\n'
  + 'The recipe information should not look like rigid tables,\nbut be embedded organically in the scene:\non old paper slips, postcards, kitchen labels, market signs,\nsketches, stamps, notes and transparent collage areas.\n\n'
  + 'The main dish stands large, appetising and three-dimensional in the foreground.\nThe place of origin forms the atmospheric stage in the background.\n\n'
  + LINIE_KURZ + '\n\n' + t.block + '\n\n' + LINIE_KURZ + '\n\n'
  + 'LAYOUT CONTENTS:\n\n'
  + '1. Large handwritten title:\n“' + t.name + '”\n\n'
  + '2. Short teaser:\nOrigin, special feature and mood of the dish.\nFor example:\n“A traditional dish from [PLACE / REGION], aromatic, colourful and easy.”\n\n'
  + '3. Info pills:\n“' + t.portionen + ' servings” · “' + t.zeit + '” · “' + t.kat + '”\n\n'
  + '4. Ingredients overview:\nShow the ingredients as small hand-drawn or watercolour illustrations\nwith quantities.\n\n'
  + '5. Step-by-step diagram:\nShow the preparation as a numbered step-by-step diagram,\nwith small illustrations, arrows and short explanatory texts.\n\n'
  + '6. Infographic “At a glance”:\nPreparation time, cooking time, total time, difficulty and servings.\n\n'
  + '7. Nutrition infographic:\nShow calories, fat, carbohydrates and protein as bars, icons or small charts.\n\n'
  + '8. Health background:\nBriefly explain the benefits of the main ingredients.\n\n'
  + '9. Ecology / seasonality:\nBriefly show seasonal ingredients, regional origin, transport routes, vegetarian or sustainable aspects\nand use of leftovers.\n\n'
  + '10. History & culture:\nA short note on the origin, meaning and culinary tradition of the dish.\n\n'
  + '11. Serving suggestion:\nAdd suitable side dishes, plating tips and small notes on enjoyment.\n\n'
  + '12. Tips & variations:\nAdd short practical hints, variants or how to avoid mistakes.\n\n'
  + LINIE_KURZ + '\n\n'
  + 'DESIGN STYLE:\n\nWarm, inviting, lively, high-quality.\nMixed media of watercolour textures, photo collage, hand-drawn elements,\naged paper, sepia and ochre tones, Mediterranean or regionally fitting colours.\nVintage/retro style, but refined and atmospheric.\n\n'
  + 'One colour palette and one font family.\nHandwritten headlines, easily readable body text.\nBotanical details, regional decorations, small stamps, sketches, notes,\nscraps of paper and collage areas.\n\n'
  + 'The overall result should look like one large, connected panorama food zine:\natmospheric, poetic, regional, rich in detail and still clearly readable.\n\n'
  + LINIE_KURZ + '\n\n'
  + 'PLACE VARIABLES — EXAMPLES:\n\n'
  + 'Ratatouille:\nA sunny terrace in Provence / southern France,\nwith lavender fields, olive trees, a stone wall, cypresses\nand a view of a small village.\n\n'
  + 'Gyoza:\nA small Japanese food stall or izakaya alley in Tokyo or Osaka,\nwith a wooden counter, lanterns, steam, little soy sauce bowls\nand an urban evening mood.\n\n'
  + 'Sushi:\nA Japanese sushi counter with bamboo, dark wood, ceramics,\nnori, rice, fish and a calm, clear atmosphere.\n\n'
  + 'Goulash:\nA rustic Hungarian country kitchen or a farmyard with a copper kettle,\nbunches of paprika, a wooden table, a heavy pot and a warm kitchen mood.\n\n'
  + 'Strawberry yoghurt cake:\nA bright summer coffee table in the garden,\nwith a strawberry bed, a white tablecloth, cake forks,\nporcelain and soft daylight.\n\n'
  + 'Vegetable soup with meat:\nA simple rural kitchen,\na soup pot on an old stove, vegetable baskets, a wooden board,\na bunch of herbs and a warm home-cooking mood.\n\n'
  + LINIE_KURZ + '\n\n'
  + 'PRINT QUALITY:\n\nThe motif should be prepared for a large A0-like panorama poster.\nVery high detail, clear composition, no tiny unreadable text,\nprint-friendly contrasts, clean edges and no muddy textures.\n\n'
  + 'Important texts large and easily readable.\nShow longer recipe texts only as clean layout areas or short readable text blocks.\n\n'
  + 'For real A0 poster printing the final version should ideally be prepared like this:\n\n'
  + '1. Generate the motif without too much small text.\n2. Then upscale to A0 size.\n3. Reset headlines, ingredients, steps and nutrition as real text or vector text.\n4. Export as a PDF at 300 dpi, or at least 150 dpi for large-format printing.\n\n'
  + 'Target resolution for A0 landscape:\n300 dpi: approx. 14043 × 9933 pixels\n150 dpi: approx. 7022 × 4967 pixels\n\n'
  + 'Target resolution for a 16:9 panorama at A0 width:\n300 dpi: approx. 14043 × 7902 pixels\n150 dpi: approx. 7022 × 3951 pixels\n\n'
  + 'Important:\nFor very small texts rather use placeholders or larger text areas,\nso that the final type can be set cleanly in a layout program later.';

/** „🔥 KI-Überraschung: Trendrezepte entdecken!“ (alt: _fzTrendSurprise): ein Auftrag ohne Rezept; Format immer Poster quer. */
export function zineTrend(sprache = 'de') {
  if (sprache === 'de') return 'Du bist ein kreativer Food-Zine-Gestalter. Erstelle ein einziges, großes, spektakuläres Food-Zine-Poster im Mixed-Media-Stil für EIN aktuelles Trendrezept, das gerade in sozialen Medien viral geht.\n\n'
    + 'Wähle selbst ein Rezept, das momentan angesagt ist – z.B. aus TikTok FoodTok, Instagram Reels oder Pinterest Trends. Überrasch uns komplett!\n\n'
    + 'FORMAT: Poster im Standard-Querformat (Landscape)\n\n'
    + '🔥 DESIGN: Modern, trendig, Social-Media-tauglich. Kräftige Farben, frische Ästhetik, Mixed Media aus Fotos, Illustrationen und grafischen Elementen.\n\n'
    + 'PFLICHT-INHALTE:\n'
    + '1. Rezeptname als Eye-Catching Headline + Trend-Hashtag (#[Rezept]Trend)\n'
    + '2. „Viral auf [Plattform]"-Badge\n'
    + '3. Zutaten als grafische Infografik mit Mengen\n'
    + '4. Step-by-Step-Zubereitung in 5–6 klaren Schritten\n'
    + '5. „Warum trendet das gerade?" – kurze Erklärung des Food-Trends\n'
    + '6. Nährwerte als moderne Icon-Infografik\n'
    + '7. Pro-Tipps: „So geht\'s noch besser!"\n'
    + '8. Serviervorschlag für den perfekten Food-Post\n\n'
    + 'Am Ende: KI nennt das gewählte Rezept + kurze Erklärung, warum es gerade viral geht.';
  return 'You are a creative food zine designer. Create one single, large, spectacular food zine poster in mixed-media style for ONE current trend recipe that is going viral on social media right now.\n\n'
    + 'Choose a recipe yourself that is popular at the moment – e.g. from TikTok FoodTok, Instagram Reels or Pinterest Trends. Surprise us completely!\n\n'
    + 'FORMAT: standard landscape poster format\n\n'
    + '🔥 DESIGN: Modern, trendy, made for social media. Strong colours, fresh aesthetics, mixed media of photos, illustrations and graphic elements.\n\n'
    + 'REQUIRED CONTENTS:\n'
    + '1. Recipe name as an eye-catching headline + trend hashtag (#[Recipe]Trend)\n'
    + '2. “Viral on [platform]” badge\n'
    + '3. Ingredients as a graphic infographic with quantities\n'
    + '4. Step-by-step preparation in 5–6 clear steps\n'
    + '5. “Why is this trending right now?” – a short explanation of the food trend\n'
    + '6. Nutrition as a modern icon infographic\n'
    + '7. Pro tips: “How to make it even better!”\n'
    + '8. Serving suggestion for the perfect food post\n\n'
    + 'At the end: the AI names the chosen recipe + a short explanation why it is going viral right now.' + schriftSatz(sprache);
}

/** Der Satz, der an den Auftrag kommt, wenn ein Foto mitkopiert wird (alt: fzBildHinweis). */
export const zineFotoHinweis = (sprache = 'de') => (sprache === 'de' ? '📷 Das beigefügte Foto zeigt das echte Gericht — nutze es als Vorlage für das Bild.' : '📷 The attached photo shows the real dish — use it as the reference for the picture.');
/** Wohin „Claude“ und „ChatGPT“ führen (in einem neuen Tab; der Auftrag steht nicht in der Adresse, er liegt in der Zwischenablage). */
export const ZINE_CHAT = Object.freeze({ claude: 'https://claude.ai/new', chatgpt: 'https://chatgpt.com/' });
/** Das eigene Bild für die KI: lange Kante und Güte der alten App (resizeImage(…, 1200, 0.88)); fürs Kopieren als PNG mit höchstens 1600 px. */
export const ZINE_EIGEN_KANTE = 1200, ZINE_EIGEN_GUETE = 0.88, ZINE_PNG_KANTE = 1600;

/* ───────────── die Sammlung „Meine Food-Zine-Bilder“ ───────────── */

/** Grenzen der Sammlung: je Datei höchstens 15 MB (wie „Aus Bildern“), das große Bild mit langer Kante 1600 px fürs Buch, die Vorschau
 *  mit 320 px, JPEG 85 %. Das Original bleibt daneben (für die Großansicht und den Druck), wenn es ein Bild ist, das jeder Browser zeigt. */
export const ZS_DATEI_MAX = 15 * 1024 * 1024, ZS_KANTE = 1600, ZS_KLEIN = 320, ZS_GUETE = 0.85;
const NAME_MAX = 120;
const kurzName = (v) => str(v).replace(/\s+/g, ' ').slice(0, NAME_MAX);

/** Ein Eintrag der Liste: { id, name, klein, stand, herkunft }. null, wenn die Vorschau kein eingebettetes Bild ist. */
export function zsEintrag(o, { jetzt = new Date() } = {}) {
  if (!o || typeof o !== 'object') return null;
  const klein = druckBild(o.klein); if (!klein) return null;
  const id = /^[a-z0-9-]{4,60}$/.test(String(o.id || '')) ? String(o.id) : 'z-' + jetzt.getTime().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  return { id, name: kurzName(o.name), klein, stand: typeof o.stand === 'string' && !Number.isNaN(Date.parse(o.stand)) ? o.stand : jetzt.toISOString(), herkunft: kurzName(o.herkunft) };
}
/** Verschiebt den Eintrag an Stelle `von` an Stelle `nach` (neue Liste). */
export function zsVerschiebe(liste, von, nach) {
  const l = (liste || []).slice(); if (!(von >= 0 && von < l.length)) return l;
  const z = Math.max(0, Math.min(l.length - 1, nach)); const [x] = l.splice(von, 1); l.splice(z, 0, x); return l;
}
/** Teilt gewählte Dateien: { gut, zuGross }. */
export const zsDateienTeilen = (dateien, max = ZS_DATEI_MAX) => ({ gut: (dateien || []).filter((d) => d.size <= max), zuGross: (dateien || []).filter((d) => d.size > max) });

/** Die alten Zine-Seiten am Rezept (bis Kern 0.27): heraus aus den Rezepten, hinein als Bilder für die Sammlung.
 *  Zurück: { bilder: [{ name, gross, herkunft }], rezepte } – `rezepte` trägt kein Feld `zine` mehr (dasselbe Array, wenn keins da war). */
export function zineAusRezepten(rezepte) {
  const bilder = []; let da = false;
  const neu = (rezepte || []).map((r) => {
    if (!r || !('zine' in r)) return r;
    da = true; const s = zineFeld(r.zine) || [];
    s.forEach((bild, i) => { if (bild) bilder.push({ name: [str(r.name), String(i + 1)].filter(Boolean).join(' · '), gross: bild, herkunft: 'zine:' + r.uid + ':' + i }); });
    const { zine, ...rest } = r; return rest;
  });
  return { bilder, rezepte: da ? neu : rezepte };
}
/** Beispielpaket „foodzine-beispiele“: { saetze:[{ titel, rezeptUid, seiten:[data:-Adressen] }] } → Bilder für die Sammlung
 *  (je Seite eins, Name „Titel · Nummer“). Nur eingebettete Bilder. */
export function zineSaetzeBilder(paket) {
  const saetze = paket && Array.isArray(paket.saetze) ? paket.saetze : [], bilder = [];
  for (const s of saetze) (zineFeld(s && s.seiten) || []).forEach((bild, i) => { if (bild) bilder.push({ name: [str(s.titel), String(i + 1)].filter(Boolean).join(' · '), gross: bild, herkunft: 'beispiel:' + str(s.rezeptUid || s.titel) + ':' + i }); });
  return bilder;
}

/** Die Sammlung im Speicher des Geräts. lager: { hol(k), setz(k, w), weg(k) } (speicher/speicher.mjs). Wie die Projekte: eine kleine
 *  Liste (mit den Vorschaubildern, damit die Ansicht ohne die großen Bilder steht), je Bild ein eigener Eintrag { gross, orig }.
 *  `uebernommen`: Prüfsummen der Bilder, die schon einmal aus Rezepten oder Beispielen kamen – so kommt nichts doppelt und nichts,
 *  was jemand entfernt hat, beim nächsten Einlesen wieder. */
const LISTE = 'zine-sammlung', eintrag = (id) => 'zine-bild:' + id;
export function zineSammlung(lager) {
  const lies = async () => { const l = await lager.hol(LISTE); return { folge: Array.isArray(l && l.folge) ? l.folge.map((x) => zsEintrag(x)).filter(Boolean) : [], uebernommen: Array.isArray(l && l.uebernommen) ? l.uebernommen.map(String) : [] }; };
  const schreib = (l) => lager.setz(LISTE, { folge: l.folge, uebernommen: l.uebernommen.slice(-5000) });
  return {
    /** Die Einträge in ihrer Reihenfolge: [{ id, name, klein, stand, herkunft }]. */
    liste: async () => (await lies()).folge,
    uebernommen: async () => new Set((await lies()).uebernommen),
    /** Das große Bild und das Original eines Eintrags: { gross, orig } oder null. */
    hol: async (id) => { const b = await lager.hol(eintrag(id)); return b && druckBild(b.gross) ? { gross: b.gross, orig: b.orig || null } : null; },
    /** Hängt Bilder an: [{ name, klein, gross, orig?, herkunft?, summe? }]. summe: merkt sich die Herkunft (für übernommene Bilder).
     *  Zurück: die neuen Einträge der Liste. */
    async dazu(bilder, { jetzt = new Date() } = {}) {
      const l = await lies(), neu = [];
      for (const b of bilder || []) {
        const e = zsEintrag({ name: b.name, klein: b.klein, herkunft: b.herkunft }, { jetzt }); if (!e || !druckBild(b.gross)) continue;
        await lager.setz(eintrag(e.id), { gross: b.gross, orig: b.orig || null }); l.folge.push(e); neu.push(e);
        if (b.summe) l.uebernommen.push(String(b.summe));
      }
      await schreib(l); return neu;
    },
    /** Merkt Prüfsummen, ohne ein Bild abzulegen. */
    async merke(summen) { const l = await lies(); l.uebernommen.push(...(summen || []).map(String)); await schreib(l); },
    /** Neue Reihenfolge: die Kennungen in der gewünschten Folge; was fehlt, bleibt dahinter in seiner alten Folge. */
    async ordnen(ids) {
      const l = await lies(), da = new Map(l.folge.map((e) => [e.id, e])), folge = [];
      for (const id of ids || []) if (da.has(id)) { folge.push(da.get(id)); da.delete(id); }
      l.folge = [...folge, ...da.values()]; await schreib(l); return l.folge;
    },
    /** Entfernt einen Eintrag. Zurück: { eintrag, bild, stelle } für „Rückgängig“ (zurueck) oder null. */
    async weg(id) {
      const l = await lies(), stelle = l.folge.findIndex((e) => e.id === id); if (stelle < 0) return null;
      const b = await lager.hol(eintrag(id)), [e] = l.folge.splice(stelle, 1);
      await lager.weg(eintrag(id)); await schreib(l); return { eintrag: e, bild: b, stelle };
    },
    /** Legt einen entfernten Eintrag an seine alte Stelle zurück. */
    async zurueck(x) {
      if (!x || !x.eintrag || !x.bild) return; const l = await lies(); if (l.folge.some((e) => e.id === x.eintrag.id)) return;
      await lager.setz(eintrag(x.eintrag.id), x.bild); l.folge.splice(Math.max(0, Math.min(l.folge.length, x.stelle)), 0, x.eintrag); await schreib(l);
    },
  };
}

/** Ein Bild zum Drucken oder als PDF (drucke() aus druck.mjs): eine Seite, das Bild so groß wie das Blatt, ohne Skript. */
export function zineDruck(bild, { titel = '', sprache = 'de' } = {}) {
  const b = druckBild(bild);
  const stil = '@page{size:auto;margin:0}\nhtml,body{margin:0;background:#fff}\nbody{display:flex;align-items:center;justify-content:center;min-height:100vh}\nimg{display:block;max-width:100vw;max-height:100vh;object-fit:contain}\n';
  return blatt(str(titel) || 'Food-Zine', sprache, DRUCK_RICHTLINIE, '', stil, b ? `<img src="${esc(b)}" alt="${esc(titel)}">` : '');
}
