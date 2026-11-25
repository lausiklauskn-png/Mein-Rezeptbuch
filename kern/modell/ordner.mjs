// Küchen-Kern · Ordner: frei benannte Sammlungen neben den Kategorien („Weihnachten“, „Für Gäste“).
// Familien-Regel der alten Apps (2026-09-16): ein Ordner frisst die Kategorie nicht. Ein Rezept liegt in höchstens einem
// Ordner (r.folder) und behält seine Kategorie (r.cat). Ein Ordner, den es nicht gibt, ist kein Ordner (ordnerVonRezept).
// Ein Ordner hat { id, name, ico }; die Kennung bleibt beim Umbenennen. Alle Funktionen geben neue Listen zurück.
import { istInhalt, ordnerVonRezept, katVonRezept } from './rezept.mjs';
import { planen, portionenSetzen, entplanenMit, verschiebe } from './plan.mjs';

let zaehler = 0;
const gleich = (a, b) => String(a) === String(b);
export const ordnerName = (o) => String((o && o.name) || '').trim();
export const findeOrdner = (ordner, id) => (ordner || []).find((o) => gleich(o.id, id)) || null;

/** Legt einen Ordner an. Gibt es den Namen schon (ohne Groß/Klein), kommt dessen Kennung zurück und nichts ändert sich. */
export function anlegen(ordner, name, ico = '') {
  const n = String(name || '').trim(), liste = ordner || [];
  const da = n && liste.find((o) => ordnerName(o).toLowerCase() === n.toLowerCase());
  if (da) return { ordner: liste, id: String(da.id), neu: false };
  const id = String(Date.now()) + String(zaehler++ % 1000).padStart(3, '0');
  return { ordner: [...liste, { id, name: n, ...(ico ? { ico } : {}) }], id, neu: true };
}
export const umbenennen = (ordner, id, name) => (ordner || []).map((o) => (gleich(o.id, id) ? { ...o, name: String(name || '').trim() } : o));
export const zeichenSetzen = (ordner, id, ico) => (ordner || []).map((o) => { if (!gleich(o.id, id)) return o; const { ico: alt, ...rest } = o; return ico ? { ...rest, ico } : rest; });
/** Löscht den Ordner. Die Rezepte bleiben und behalten ihre Kategorie; sie verlieren nur den Ordner. */
export function loeschen(rezepte, ordner, id) {
  let betroffen = 0;
  const r = (rezepte || []).map((x) => (x && x.folder != null && x.folder !== '' && gleich(x.folder, id) ? (betroffen++, { ...x, folder: '' }) : x));
  return { rezepte: r, ordner: (ordner || []).filter((o) => !gleich(o.id, id)), betroffen };
}
/** Legt ein Rezept in einen Ordner (id) oder nimmt es heraus (id leer). Einen Ordner, den es nicht gibt, gibt es nicht: dann ändert sich nichts. */
export function legeIn(rezepte, ordner, uid, id) {
  if (id && !findeOrdner(ordner, id)) return rezepte;
  return (rezepte || []).map((r) => (r && r.uid === uid ? { ...r, folder: id ? String(id) : '' } : r));
}
/** Setzt den Ordner `id` vor `vorId` (oder ans Ende). */
export function umsortieren(ordner, id, vorId) {
  const liste = [...(ordner || [])], von = liste.findIndex((o) => gleich(o.id, id)); if (von < 0) return liste;
  const [o] = liste.splice(von, 1), nach = vorId == null ? -1 : liste.findIndex((x) => gleich(x.id, vorId));
  if (nach < 0) liste.push(o); else liste.splice(nach, 0, o);
  return liste;
}
/** Die Rezepte eines Ordners (nur Inhalt). */
export const imOrdner = (rezepte, ordner, id) => (rezepte || []).filter((r) => istInhalt(r) && ordnerVonRezept(r, ordner) === String(id));
/** Alle Ordner mit Anzahl und einem Bild aus dem Ordner (erstes Rezept mit Bild). */
export const uebersicht = (rezepte, ordner) => (ordner || []).map((o) => { const rs = imOrdner(rezepte, ordner, o.id); return { ...o, id: String(o.id), anzahl: rs.length, bild: (rs.find((r) => r.img) || {}).img || '' }; });
/** Rezepte, deren Ordner es nicht (mehr) gibt – sie stehen in keinem Ordner; die Zahl ist eine Auskunft. */
export const ohneOrdnerZiel = (rezepte, ordner) => (rezepte || []).filter((r) => istInhalt(r) && r.folder != null && String(r.folder) !== '' && !ordnerVonRezept(r, ordner)).length;

/* ── Event-Ordner (Klaus 25.11.2026, R19): ein Ordner für einen Anlass („Hochzeit von Jonas und Lisa“) trägt freiwillig ein
   Datum und eine Gästezahl: o.event = { datum: 'JJJJ-MM-TT', gaeste: n, kalender? }. Der Name des Ordners ist der Anlass.
   „In den Kalender übernehmen“ trägt alle Gerichte an dem Tag in den Wochenplan ein (in Gängen nach der Folge der Kategorien,
   Portionen = Gäste) und merkt sich, was übernommen ist (kalender: { datum, gaeste, gerichte: { uid: tag | null } }; null heißt
   „bekannt, bewusst nicht im Kalender“). Der Plan ist danach frei bearbeitbar, der Ordner bleibt Vorlage. Ändert sich der Ordner,
   sagt abgleich(), was neu ist, was fehlt, ob das Datum oder die Gäste sich geändert haben – entschieden wird von Hand.
   Mehrere Tage sind später ohne Umbau möglich: jedes Gericht merkt sich seinen eigenen Tag. ── */
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const gaesteZahl = (n) => { const z = Math.round(Number(n)); return Number.isFinite(z) && z > 0 ? Math.min(z, 999) : 0; };
/** Ein echtes Kalenderdatum 'JJJJ-MM-TT' oder ''. */
export const eventDatum = (d) => { const s = String(d || '').trim(); if (!ISO.test(s)) return ''; const t = new Date(s + 'T12:00'); return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === s ? s : ''; };
export const istEvent = (o) => !!(o && o.event && typeof o.event === 'object');
/** Macht einen Ordner zum Anlass oder ändert Datum/Gäste (Felder, die nicht genannt sind, bleiben). Leeres Datum = noch keins. */
export function eventSetzen(ordner, id, { datum, gaeste } = {}) {
  return (ordner || []).map((o) => { if (!gleich(o.id, id)) return o; const e = { ...(istEvent(o) ? o.event : {}) };
    if (datum !== undefined) { const d = eventDatum(datum); if (d) e.datum = d; else delete e.datum; }
    if (gaeste !== undefined) { const g = gaesteZahl(gaeste); if (g) e.gaeste = g; else delete e.gaeste; }
    return { ...o, event: e }; });
}
/** Der Ordner ist kein Anlass mehr. Was im Kalender steht, bleibt dort. */
export const eventWeg = (ordner, id) => (ordner || []).map((o) => { if (!gleich(o.id, id) || !istEvent(o)) return o; const { event, ...rest } = o; return rest; });
/** Die Gerichte eines Ordners in Gängen: [{ kat, rezepte }] in der Folge der Kategorien (katFolge: Kennungen, wie die App sie
 *  zeigt); Kategorien, die nicht in der Folge stehen, kommen danach. Innerhalb eines Gangs bleibt die Reihenfolge des Buchs. */
export function gaenge(rezepte, ordner, id, katFolge = []) {
  const rs = imOrdner(rezepte, ordner, id), folge = (katFolge || []).map(String), gr = new Map();
  for (const r of rs) { const k = katVonRezept(r); if (!gr.has(k)) gr.set(k, []); gr.get(k).push(r); }
  const rang = (k) => { const i = folge.indexOf(k); return i < 0 ? folge.length : i; };
  return [...gr].map(([kat, liste], i) => ({ kat, liste, i })).sort((a, b) => rang(a.kat) - rang(b.kat) || a.i - b.i).map(({ kat, liste }) => ({ kat, rezepte: liste }));
}
/** Trägt alle Gerichte des Anlasses an seinem Tag in den Plan ein (Gänge-Folge, Portionen = Gäste, wenn genannt).
 *  stand: { rezepte, ordner, plan, portionen }. Zurück: { plan, portionen, ordner, neu, schon } oder null ohne Datum/Gerichte. */
export function inKalender(stand, id, katFolge = []) {
  const o = findeOrdner(stand.ordner, id); if (!istEvent(o) || !eventDatum(o.event.datum)) return null;
  const tag = o.event.datum, g = gaesteZahl(o.event.gaeste), reihe = gaenge(stand.rezepte, stand.ordner, id, katFolge).flatMap((x) => x.rezepte);
  if (!reihe.length) return null;
  let plan = { ...(stand.plan || {}) }, portionen = stand.portionen || {}, neu = 0, schon = 0; const gerichte = {};
  for (const r of reihe) { if ((plan[tag] || []).includes(r.uid)) schon++; else { plan = planen(plan, tag, r.uid); neu++; }
    if (g) portionen = portionenSetzen(portionen, tag, r.uid, g); gerichte[r.uid] = tag; }
  const ordnerNeu = stand.ordner.map((x) => (gleich(x.id, id) ? { ...x, event: { ...x.event, kalender: { datum: tag, gaeste: g, gerichte } } } : x));
  return { plan, portionen, ordner: ordnerNeu, neu, schon };
}
/** Was sich am Anlass geändert hat, seit er im Kalender steht. Zurück: null (nie übernommen) oder
 *  { neu: [uid], fehlt: [uid], verschoben: [{ uid, von, nach }], gaeste: { von, nach } | null, offen } – entschieden wird von Hand. */
export function abgleich(stand, id) {
  const o = findeOrdner(stand.ordner, id); if (!istEvent(o) || !o.event.kalender) return null;
  const k = o.event.kalender, bekannt = k.gerichte || {}, drin = imOrdner(stand.rezepte, stand.ordner, id).map((r) => r.uid), da = new Set(drin);
  const gibt = new Set((stand.rezepte || []).filter(istInhalt).map((r) => r.uid)), tag = eventDatum(o.event.datum);
  const neu = drin.filter((u) => !(u in bekannt));
  const fehlt = Object.keys(bekannt).filter((u) => bekannt[u] && !da.has(u) && gibt.has(u));   /* ein gelöschtes Rezept ist keine Frage mehr */
  const verschoben = tag && k.datum && k.datum !== tag ? Object.entries(bekannt).filter(([u, t]) => t && t !== tag && da.has(u)).map(([uid, von]) => ({ uid, von, nach: tag })) : [];
  const gNeu = gaesteZahl(o.event.gaeste), gaeste = (k.gaeste || 0) !== gNeu && gNeu ? { von: k.gaeste || 0, nach: gNeu } : null;
  return { neu, fehlt, verschoben, gaeste, offen: !!(neu.length || fehlt.length || verschoben.length || gaeste) };
}
/** Wendet die Entscheidungen an. wahl: { neu: [uid] (in den Kalender), fehlt: [uid] (aus dem Kalender nehmen), verschieben, gaeste }
 *  (true = übernehmen). Alles, was gezeigt wurde, gilt danach als entschieden: abgleich() ist wieder still. */
export function abgleichAnwenden(stand, id, wahl = {}) {
  const o = findeOrdner(stand.ordner, id), a = abgleich(stand, id); if (!a) return null;
  const tag = eventDatum(o.event.datum), g = gaesteZahl(o.event.gaeste), gerichte = { ...(o.event.kalender.gerichte || {}) };
  let plan = { ...(stand.plan || {}) }, portionen = stand.portionen || {}, n = 0;
  const jaNeu = new Set(wahl.neu || []), jaWeg = new Set(wahl.fehlt || []);
  if (wahl.verschieben) for (const v of a.verschoben) { ({ plan, portionen } = verschiebe(plan, portionen, v.von, v.nach, v.uid)); gerichte[v.uid] = v.nach; n++; }
  else for (const v of a.verschoben) gerichte[v.uid] = v.von;   /* bleibt, wo es steht; das alte Datum ist gemerkt, gefragt wird nicht wieder */
  if (wahl.gaeste && a.gaeste) for (const [u, t] of Object.entries(gerichte)) if (t && (plan[t] || []).includes(u)) { portionen = portionenSetzen(portionen, t, u, a.gaeste.nach); n++; }
  for (const u of a.neu) { if (jaNeu.has(u) && tag) { plan = planen(plan, tag, u); if (g) portionen = portionenSetzen(portionen, tag, u, g); gerichte[u] = tag; n++; } else gerichte[u] = null; }
  for (const u of a.fehlt) { if (jaWeg.has(u)) { ({ plan, portionen } = entplanenMit(plan, portionen, gerichte[u], u)); n++; } delete gerichte[u]; }
  for (const u of Object.keys(gerichte)) if (!(stand.rezepte || []).some((r) => r.uid === u)) delete gerichte[u];
  const kalender = { datum: tag || o.event.kalender.datum, gaeste: a.gaeste ? a.gaeste.nach : o.event.kalender.gaeste || 0, gerichte };   /* auch bei „nein“ gilt die Frage als beantwortet */
  return { plan, portionen, ordner: stand.ordner.map((x) => (gleich(x.id, id) ? { ...x, event: { ...x.event, kalender } } : x)), geaendert: n };
}
/** Alle Gerichte des Anlasses auf die Einkaufsliste (posten: [{ uid, portionen }]): Portionen = Gäste (ohne Gästezahl die des Rezepts).
 *  Steht ein Gericht schon darauf, gilt danach die Zahl des Anlasses. Zurück: { posten, neu, angepasst }. */
export function eventEinkauf(posten, rezepte, ordner, id) {
  const o = findeOrdner(ordner, id), g = istEvent(o) ? gaesteZahl(o.event.gaeste) : 0; let liste = [...(posten || [])], neu = 0, angepasst = 0;
  for (const r of imOrdner(rezepte, ordner, id)) { const p = g || r.servings, i = liste.findIndex((x) => x.uid === r.uid);
    if (i < 0) { liste.push({ uid: r.uid, portionen: p }); neu++; } else if (liste[i].portionen !== p) { liste[i] = { ...liste[i], portionen: p }; angepasst++; } }
  return { posten: liste, neu, angepasst };
}
/** Ein Anlass aus einer Datei (fremde Hand): nur gültiges Datum, Gästezahl und gemerkte Tage bleiben. */
export function eventAusDatei(e) {
  if (!e || typeof e !== 'object') return undefined; const aus = {}, d = eventDatum(e.datum), g = gaesteZahl(e.gaeste);
  if (d) aus.datum = d; if (g) aus.gaeste = g;
  if (e.kalender && typeof e.kalender === 'object') { const gerichte = {};
    for (const [u, t] of Object.entries(e.kalender.gerichte || {})) if (t === null || eventDatum(t)) gerichte[String(u)] = t;
    aus.kalender = { ...(eventDatum(e.kalender.datum) ? { datum: eventDatum(e.kalender.datum) } : {}), gaeste: gaesteZahl(e.kalender.gaeste), gerichte }; }
  return aus;
}
