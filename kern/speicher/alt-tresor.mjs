// Küchen-Kern · Tresor-Stände der alten App in den neuen Tresor legen. Die alte App hält ihren Tresor in einer eigenen
// IndexedDB (Speicher „kv“, Einträge { k, v }): unter `schluessel` die Liste der Stände (r/ms/fd als JSON-Text, ohne Bilder),
// unter `bilder` + Kennung die Bilder je Stand. Hier wird nur GELESEN; die alte Datenbank wird weder angelegt noch geändert.
import { MAX_AUTO, MAX_BENANNT } from './tresor.mjs';

const json = (t, sonst) => { try { const w = typeof t === 'string' ? JSON.parse(t) : t; return w == null ? sonst : w; } catch { return sonst; } };

/** Aus den rohen Einträgen der alten App werden Sicherungen in der Form, die `lies()` versteht.
 *  eintraege: die Liste aus der alten App; bilderVon(id) → { rezeptId: data-URL }. Unlesbare Einträge fallen heraus.
 *  Zurück, jüngste zuerst: [{ alt, art:'auto'|'benannt', name, ts, sicherung }]. */
export function ausAltemTresor(eintraege, bilderVon = () => ({})) {
  const aus = [];
  for (const e of Array.isArray(eintraege) ? eintraege : []) {
    if (!e || e.id == null) continue;
    const rezepte = json(e.r, null); if (!Array.isArray(rezepte)) continue;
    const ts = new Date(e.ts); if (Number.isNaN(ts.getTime())) continue;
    const b = bilderVon(String(e.id)) || {};
    aus.push({ alt: String(e.id), art: e.type === 'auto' ? 'auto' : 'benannt', name: String(e.name || '').trim(), ts: ts.toISOString(),
      sicherung: { version: 9, exported: ts.toISOString(), recipes: rezepte.filter((r) => r && typeof r === 'object').map((r) => (!r.img && r.id != null && b[r.id] ? { ...r, img: b[r.id] } : r)),
        menu: json(e.ms, []), folders: json(e.fd, []) } });
  }
  return aus.sort((x, y) => y.ts.localeCompare(x.ts));
}

const anfrage = (a) => new Promise((gut, schlecht) => { a.onsuccess = () => gut(a.result); a.onerror = () => schlecht(a.error); });
/** Liest den Tresor der alten App. ort: { db, schluessel, bilder }. Zurück wie ausAltemTresor; [] wenn es die alte Datenbank
 *  nicht gibt oder der Browser sie nicht hergibt. Öffnen würde eine fehlende Datenbank ANLEGEN – das wird abgebrochen. */
export async function leseAltenTresor(ort, idb = globalThis.indexedDB) {
  if (!ort || !ort.db || !idb) return [];
  let d = null;
  try {
    if (idb.databases) { const alle = await idb.databases(); if (!alle.some((x) => x.name === ort.db)) return []; }
    d = await new Promise((gut, schlecht) => { const a = idb.open(ort.db); let neu = false;
      a.onupgradeneeded = () => { neu = true; try { a.transaction.abort(); } catch { /* schon zu */ } };
      a.onsuccess = () => (neu ? (a.result.close(), gut(null)) : gut(a.result)); a.onerror = () => (neu ? gut(null) : schlecht(a.error)); a.onblocked = () => gut(null); });
    if (!d || !d.objectStoreNames.contains('kv')) return [];
    const lies = async (k) => { const z = await anfrage(d.transaction('kv').objectStore('kv').get(k)); return z ? z.v : null; };
    const liste = json(await lies(ort.schluessel), []), bilder = {};
    for (const e of Array.isArray(liste) ? liste : []) if (e && e.id != null) bilder[String(e.id)] = json(await lies(ort.bilder + e.id).catch(() => null), {}) || {};
    return ausAltemTresor(liste, (id) => bilder[id]);
  } catch { return []; } finally { try { d && d.close(); } catch { /* egal */ } }
}

/** Legt alte Stände in den neuen Tresor: mit ihrem Namen und ihrer Zeit, jüngste zuerst, und nur solange Platz ist –
 *  ein alter Stand verdrängt keinen neuen. Was schon übernommen ist (gleiche alte Kennung), kommt nicht doppelt.
 *  Zurück: { dazu, ausgelassen }. */
export async function alteStaendeInTresor(tr, staende) {
  const da = await tr.liste(), schon = new Set(da.map((x) => x.alt).filter(Boolean)), frei = { auto: MAX_AUTO - da.filter((x) => x.art === 'auto').length, benannt: MAX_BENANNT - da.filter((x) => x.art === 'benannt').length };
  let dazu = 0, ausgelassen = 0;
  for (const s of staende || []) {
    if (schon.has(s.alt)) continue;
    if (frei[s.art] <= 0) { ausgelassen++; continue; }
    await tr.ablegen(s.sicherung, s.art, s.name, { ts: s.ts, alt: s.alt }); frei[s.art]--; dazu++;
  }
  return { dazu, ausgelassen };
}
