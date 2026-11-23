// Küchen-Kern · Rezept aus eingefügtem Text, ohne KI. Erkennt Überschriften („Zutaten“, „Zubereitung“), Portionen, Zeit,
// Mengen und Einheiten. Was nicht sicher zu erkennen ist, bleibt als Text stehen; nichts wird erfunden.
const EINHEITEN = 'g|kg|mg|ml|l|cl|dl|EL|TL|Prise|Prisen|Stück|Stk\\.?|Bund|Dose|Dosen|Pck\\.?|Päckchen|Packung|Zehe|Zehen|Scheibe|Scheiben|Blatt|Blätter|Tasse|Tassen|Becher|Glas|Stange|Stangen|Handvoll|Spritzer|Messerspitze|Msp\\.?|Würfel|Zweig|Zweige|Kopf|Tube|Flasche|fl\\.? ?oz|oz|Barlöffel|Dashes|Dash|Schuss|Beutel|Tropfen|cups|cup|tbsp|tsp|Dolden|Dolde';   // Bar- und US-Einheiten seit Kern 0.15 (Mixarium)
const MENGE = '[\\d.,\\/½¼¾⅓⅔⅛]+(?:\\s*(?:-|–|bis)\\s*[\\d.,\\/½¼¾⅓⅔⅛]+)?(?:\\s+[\\d\\/½¼¾⅓⅔⅛]+)?';
const ZUTAT = new RegExp(`^(${MENGE})\\s*(?:(${EINHEITEN})\\b\\.?\\s+)?(.+)$`, 'i');

/** „500 g Kartoffeln (mehlig)“ → {amt:'500', unit:'g', name:'Kartoffeln', note:'mehlig'} · „Salz“ → nur Name */
export function zutatAusZeile(zeile) {
  const t = String(zeile || '').replace(/^[\s•*·–-]+/, '').trim();
  const m = t.match(ZUTAT);
  if (!m || !/[A-Za-zÄÖÜäöüß]/.test(m[3])) return { amt: '', unit: '', name: t, note: '' };
  const nn = m[3].match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return { amt: m[1].trim(), unit: m[2] || '', name: (nn ? nn[1] : m[3]).trim(), note: nn ? nn[2].trim() : '' };
}
export const zutatZeile = (z) => [z.amt, z.unit, z.name].filter(Boolean).join(' ') + (z.note ? ` (${z.note})` : '');

const KOPF_ZUTATEN = /^(zutaten|ingredients|das brauchst du|du brauchst|einkaufsliste)\b.*$/i;
const KOPF_SCHRITTE = /^(zubereitung|anleitung|schritte|so geht'?s|so wird'?s gemacht|und so geht'?s|instructions|method|directions)\b.*$/i;
const istZutat = (z) => { const t = z.replace(/^[\s•*·–-]+/, ''); return ZUTAT.test(t) && t.length < 70 && !/[.!?]$/.test(t); };

/** Text → { name, servings, prepTime, ings:[…], steps:[{txt}], sicher: true|false } — `sicher` ist false, wenn ohne Überschriften geraten wurde. */
export function rezeptAusText(text) {
  const zeilen = String(text || '').replace(/\r/g, '').split('\n').map((z) => z.trim());
  const voll = zeilen.filter(Boolean);
  if (!voll.length) return null;
  const aus = { name: voll[0].replace(/^#+\s*/, '').replace(/[:：]\s*$/, ''), ings: [], steps: [], sicher: true };
  const alles = voll.join(' ');
  const p = alles.match(/(?:für|ergibt|portionen?:?)\s*(\d{1,2})\s*(?:personen|portionen|stück|stücke)?/i) || alles.match(/(\d{1,2})\s*(?:personen|portionen)/i);
  if (p) aus.servings = +p[1];
  const zeit = alles.match(/(?:zubereitungszeit|arbeitszeit|gesamtzeit|dauer|zeit):?\s*(?:ca\.?\s*)?(\d{1,3})\s*(?:min|minuten)/i);
  if (zeit) aus.prepTime = +zeit[1];
  const iZ = zeilen.findIndex((z) => KOPF_ZUTATEN.test(z)), iS = zeilen.findIndex((z) => KOPF_SCHRITTE.test(z));
  let zut = [], sch = [];
  if (iZ >= 0 && iS > iZ) { zut = zeilen.slice(iZ + 1, iS); sch = zeilen.slice(iS + 1); }
  else if (iS >= 0 && iZ > iS) { sch = zeilen.slice(iS + 1, iZ); zut = zeilen.slice(iZ + 1); }
  else if (iZ >= 0) { const rest = zeilen.slice(iZ + 1); let n = rest.findIndex((z, i) => z && !istZutat(z) && i > 0 && rest.slice(i).every((y) => !y || !istZutat(y))); if (n < 0) n = rest.length; zut = rest.slice(0, n); sch = rest.slice(n); }
  else { aus.sicher = false; const rest = zeilen.slice(zeilen.indexOf(voll[0]) + 1); let n = 0; while (n < rest.length && (!rest[n] || istZutat(rest[n]))) n++; zut = rest.slice(0, n); sch = rest.slice(n); }
  aus.ings = zut.filter((z) => z && !/^für\s+(die|den|das)\b.*:$/i.test(z) && !/^(für\s+)?\d{1,2}\s*(personen|portionen)\b/i.test(z)).map(zutatAusZeile).filter((z) => z.name);
  // Schritte: nummerierte Zeilen oder Absätze
  const block = []; let akt = '';
  for (const z of sch) { const num = z.match(/^(?:schritt\s*)?(\d{1,2})[.):]\s+(.*)$/i);
    if (num) { if (akt) block.push(akt); akt = num[2]; } else if (!z) { if (akt) block.push(akt); akt = ''; } else akt = akt ? akt + ' ' + z : z; }
  if (akt) block.push(akt);
  aus.steps = block.filter((t) => !/^(guten appetit|viel spaß)/i.test(t)).map((txt) => ({ txt }));
  return aus;
}
