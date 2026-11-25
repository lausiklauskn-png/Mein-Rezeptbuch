// Küchen-Kern · Bedeutungssuche („Sinn-Suche“). Übernommen aus der alten App, nicht neu gebaut:
// die geprüften Bausteine Modul 03 (Embedding, multilingual-e5-small) und Modul 04 (Match: Hybrid aus Bedeutung und
// Wort, Multi-Query über Synonyme) werden byte-gleich aus sbkim/ geladen — NUR diese zwei, erst wenn die Sinn-Suche
// eingeschaltet wird, ohne Siegel, Widget, Spore oder Netz-Bausteine. Der Suchtext je Rezept ist derselbe wie bisher
// (Name, Geschmack, Zutaten, Kategorie). Der Deckel von 120 Rezepten ist weg; jeder Vektor wird je Rezept gemerkt.
// Benannte Grenze: das Modell lädt beim ersten Einschalten aus dem Netz (transformers.js und Modell-Datei).
import { merkmaleVon, merkmalName } from '../modell/doppel.mjs';
export const BAUSTEINE = ['03_embedding.js', '04_match.js'];
export const SYNONYME = {"torte":["kuchen"],"kuchen":["torte"],"cocktail":["drink"],"drink":["cocktail","getränk"],"getränk":["drink","getraenk"],"limo":["limonade"],"limonade":["limo"],"smoothie":["shake"],"shake":["smoothie"],"alkoholfrei":["mocktail"],"mocktail":["alkoholfrei"],"plätzchen":["keks"],"keks":["plätzchen","plaetzchen"],"kfz":["auto"],"auto":["kfz","wagen"],"wagen":["auto"],"notebook":["laptop"],"laptop":["notebook"],"handy":["smartphone"],"smartphone":["handy"],"arznei":["medikament"],"medikament":["arznei","arzneimittel"],"foto":["bild"],"bild":["foto"]};

let ladung = null;
const skript = (doc, src) => new Promise((gut, schlecht) => { const el = doc.createElement('script'); el.src = src; el.onload = () => gut(); el.onerror = () => schlecht(new Error('Baustein nicht geladen: ' + src)); doc.head.appendChild(el); });
/** Lädt Modul 03 und 04 nacheinander (einmal). basis: Ordner der sbkim-Bausteine, z. B. '../sbkim/'. */
export function ladeBausteine(basis, doc = document, w = window) {
  if (w.SbkimEmbedding && w.SbkimMatch) return Promise.resolve();
  if (!ladung) ladung = BAUSTEINE.reduce((p, b) => p.then(() => skript(doc, basis + b)), Promise.resolve()).catch((f) => { ladung = null; throw f; });
  return ladung;
}
/** Suchtext eines Rezepts, wie in der alten App. */
export function passage(r, katName = '') {
  return [String(r.name), ...(Array.isArray(r.flavors) ? r.flavors : []), ...(Array.isArray(r.ings) ? r.ings.map((z) => (z && (z.name || z.origName)) || '') : []), katName, ...merkmaleVon(r).flatMap((m) => [merkmalName(m, 'de'), merkmalName(m, 'en')])].filter(Boolean).join(', ');   // Merkmale nur, wo gesetzt: sonst bleibt der Text gleich und nichts wird neu eingelesen
}
const gemerkt = new Map();   // uid → { text, vec }
/** Baut den Korpus für alle Rezepte. Ein Rezept, dessen Suchtext sich nicht geändert hat, wird nicht neu eingebettet. */
export async function korpus(rezepte, katNameVon, { einbetten, fortschritt } = {}) {
  const aus = [], da = new Set();
  for (let i = 0; i < rezepte.length; i++) {
    const r = rezepte[i], text = passage(r, katNameVon(r)); da.add(r.uid);
    let g = gemerkt.get(r.uid);
    if (!g || g.text !== text) { let roh; try { roh = await einbetten(text); } catch { continue; } g = { text, vec: roh instanceof Float32Array ? roh : new Float32Array(roh) }; gemerkt.set(r.uid, g); fortschritt?.(i + 1, rezepte.length); }
    aus.push({ label: String(r.name), anchorId: String(r.uid), passageVec: g.vec, text });
  }
  for (const k of gemerkt.keys()) if (!da.has(k)) gemerkt.delete(k);
  return aus;
}
/** Sucht nach Bedeutung; gibt die uids in der Reihenfolge der Treffer zurück. match: window.SbkimMatch. */
export async function sucheBedeutung(match, anfrage, corpus, k = 12) {
  let fragen = [anfrage];
  if (typeof match.expandQuerySimple === 'function') { try { const v = match.expandQuerySimple(anfrage, { synonyms: SYNONYME }); if (Array.isArray(v) && v.length) fragen = v; } catch { /* eine Frage */ } }
  const treffer = typeof match.queryLocalMulti === 'function' ? await match.queryLocalMulti(fragen, k, { corpus, hybrid: true }) : await match.queryLocal(anfrage, k, { corpus, hybrid: true });
  return treffer.map((t) => t.anchorId).filter(Boolean);
}
