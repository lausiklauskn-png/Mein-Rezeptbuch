// Küchen-Kern · Wochenplan. plan: { 'JJJJ-MM-TT': [uid, …] }
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const tagIso = iso;
/** Die sieben Tage (Mo–So) der Woche, in der `datum` liegt, plus Kalenderwoche nach ISO 8601. */
export function woche(datum) {
  const d = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate()); const wt = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wt);
  const tage = Array.from({ length: 7 }, (_, i) => { const t = new Date(d); t.setDate(d.getDate() + i); return t; });
  const do_ = new Date(tage[3]); const jan1 = new Date(do_.getFullYear(), 0, 1);
  return { tage, kw: Math.floor((Math.round((do_ - jan1) / 864e5) + ((jan1.getDay() + 6) % 7)) / 7) + 1 - (((jan1.getDay() + 6) % 7) > 3 ? 1 : 0) };
}
export function planen(plan, tag, uid) { const l = plan[tag] || []; return l.includes(uid) ? plan : { ...plan, [tag]: [...l, uid] }; }
export function entplanen(plan, tag, uid) { const l = (plan[tag] || []).filter((x) => x !== uid); const p = { ...plan }; if (l.length) p[tag] = l; else delete p[tag]; return p; }
/** Wochenplan der alten App (menu: [{rid, date}]) in die neue Form; Einträge ohne Rezept oder Datum fallen weg. */
export function ausAltemMenu(menu, rezepte) {
  let plan = {}; for (const m of menu || []) { const r = rezepte.find((x) => x.id === m.rid); if (r && /^\d{4}-\d{2}-\d{2}$/.test(m.date || '')) plan = planen(plan, m.date, r.uid); } return plan;
}
/* Portionen im Plan (R19, Event-Ordner): eine eigene Karte neben dem Plan, { 'JJJJ-MM-TT': { uid: zahl } }. Der Plan selbst
   bleibt { tag: [uid] }, damit ältere Fassungen (auch die APK 0.15.2) eine neue Sicherung weiter lesen; ohne Eintrag gilt die
   Portionenzahl des Rezepts. */
const ganz = (n) => { const z = Math.round(Number(n)); return Number.isFinite(z) && z > 0 ? Math.min(z, 999) : 0; };
/** Die Portionen eines Gerichts an einem Tag, oder 0 (dann gilt die Zahl des Rezepts). */
export const portionenIm = (portionen, tag, uid) => ganz(portionen?.[tag]?.[uid]);
/** Setzt die Portionen eines Gerichts an einem Tag; 0/leer nimmt den Eintrag heraus. Gibt eine neue Karte zurück. */
export function portionenSetzen(portionen, tag, uid, n) {
  const p = { ...(portionen || {}) }, t = { ...(p[tag] || {}) }, z = ganz(n);
  if (z) t[uid] = z; else delete t[uid];
  if (Object.keys(t).length) p[tag] = t; else delete p[tag];
  return p;
}
/** Nimmt ein Gericht aus dem Plan und seine Portionen mit. */
export const entplanenMit = (plan, portionen, tag, uid) => ({ plan: entplanen(plan, tag, uid), portionen: portionenSetzen(portionen, tag, uid, 0) });
/** Verschiebt ein Gericht samt Portionen von einem Tag auf einen anderen (steht es dort schon, bleibt es einmal da). */
export function verschiebe(plan, portionen, von, nach, uid) {
  if (von === nach || !(plan[von] || []).includes(uid)) return { plan, portionen };
  const n = portionenIm(portionen, von, uid), weg = entplanenMit(plan, portionen, von, uid);
  return { plan: planen(weg.plan, nach, uid), portionen: n ? portionenSetzen(weg.portionen, nach, uid, n) : weg.portionen };
}
/** Liest eine Portionen-Karte aus einer Sicherung: nur gültige Tage, Kennungen und Zahlen. */
export function portionenListe(p) {
  const aus = {}; if (!p || typeof p !== 'object') return aus;
  for (const [tag, t] of Object.entries(p)) { if (!/^\d{4}-\d{2}-\d{2}$/.test(tag) || !t || typeof t !== 'object') continue;
    for (const [uid, n] of Object.entries(t)) if (ganz(n)) (aus[tag] ||= {})[uid] = ganz(n); }
  return aus;
}
