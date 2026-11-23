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
