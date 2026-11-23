// Küchen-Kern · Übernahme aus der alten App (localStorage). Nur LESEN, nichts löschen, nur die Schlüssel der eigenen Ausgabe.
// Mein Rezeptbuch: Endung 9m. Muttis Rezeptbuch: Endung 9. Beide liegen unter derselben Herkunft.
import { normalisiere, istInhalt } from '../modell/rezept.mjs';
import { leereKategorien } from '../modell/kategorien.mjs';

const SPR = ['de', 'en', 'ru', 'zh', 'es', 'fr', 'it', 'pt'];
function json(speicher, schluessel, sonst) { try { const t = speicher.getItem(schluessel); return t == null ? sonst : JSON.parse(t); } catch { return sonst; } }

/** speicher: etwas mit getItem(). endung: '9m' oder '9'. Gibt null zurück, wenn dort keine alte App war. */
export function ausAltemSpeicher(speicher, endung) {
  const roh = json(speicher, 'mrz' + endung, null);
  if (!Array.isArray(roh)) return null;
  const rezepte = roh.filter((r) => r && typeof r === 'object').map(normalisiere).filter(istInhalt);
  const kategorien = leereKategorien();
  const neu = json(speicher, 'mrzcatsneu' + endung, []), eigen = json(speicher, 'mrzcats' + endung, {});
  for (const c of Array.isArray(neu) ? neu : []) {
    if (!c || c.id == null) continue;
    const e = { id: String(c.id), symbol: 'karte' };
    for (const s of SPR) if (c[s]) e[s] = String(c[s]);
    if (!e.de) e.de = e.id;
    if (c.ico) e.emoji = String(c.ico);
    kategorien.eigene.push(e);
  }
  if (eigen && typeof eigen === 'object') for (const [id, v] of Object.entries(eigen)) {
    if (!v || typeof v !== 'object') continue;
    const e = {}; if (v.name && String(v.name).trim()) e.name = String(v.name).trim(); if (v.ico) e.emoji = String(v.ico);
    if (Object.keys(e).length) kategorien.namen[String(id)] = e;
  }
  const aus = json(speicher, 'mrzcatsaus' + endung, []), ord = json(speicher, 'mrzcatord' + endung, []);
  kategorien.ausgeblendet = Array.isArray(aus) ? aus.map(String) : [];
  kategorien.folge = Array.isArray(ord) ? ord.map(String) : [];
  const ordner = json(speicher, 'mfd' + endung, []);
  let sprache = null; try { sprache = speicher.getItem('mlang' + endung); } catch { /* ohne */ }
  return { rezepte, menu: (() => { const m = json(speicher, 'mms' + endung, []); return Array.isArray(m) ? m : []; })(),
    ordner: (Array.isArray(ordner) ? ordner : []).filter((o) => o && o.id != null).map((o) => ({ ...o, id: String(o.id) })), kategorien, sprache };
}
