// Küchen-Kern · Rezept von einer Webseite. Übernommen aus der alten App (fetchWebRecipe, _parseJsonLdRecipe, _parseInstr,
// _bildAusSchema) – OHNE öffentliche Weiterleiter (allorigins, codetabs, wsrv): die Adresse geht an niemanden außer an die Seite selbst.
//  - holeSeite(adresse): direkter Abruf. In der App (natives HTTP) geht das immer; im Browser nur, wenn die Seite es erlaubt.
//    Scheitert er, trägt der Fehler `gesperrt: true`; die Oberfläche bietet dann „Seite öffnen, kopieren, hier einfügen“.
//  - rezeptAusHtml(html, adresse): liest die Rezeptdaten der Seite (schema.org als JSON-LD), ohne KI.
//  - seitenText(html): der sichtbare Text der Seite. Versteckte Teile (hidden, display:none, Schriftgröße 0 …) und Navigation
//    bleiben weg – was ein Mensch auf der Seite nicht sieht, soll auch keine KI lesen.
//  - ausEingefuegtem(text, adresse): eingefügter Seitenquelltext oder Seitentext → Rezept oder Text zum Aufteilen.
//  - mitKi(text, …): Claude sortiert den Seitentext ein (eigener Schlüssel, nur auf Knopfdruck).
import { zutatAusZeile, rezeptAusText } from './text.mjs';
import { auftrag } from './scan.mjs';
import { frageClaude, jsonAusAntwort } from '../ki/claude.mjs';
import { text, fuelle } from '../oberflaeche/sprache.mjs';

export const KI_TEXT_MAX = 24000;   // so viele Zeichen Seitentext gehen höchstens an die KI
const NAMEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', aacute: 'á', acirc: 'â', ccedil: 'ç', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', deg: '°', frac12: '½', frac14: '¼', frac34: '¾', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', euro: '€', times: '×', shy: '' };
/** Löst HTML-Zeichenfolgen auf (&amp; &#228; &#x27; &auml; …). */
export const entschluesseln = (t) => String(t ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (g, n) => { if (n[0] === '#') { const z = n[1] === 'x' || n[1] === 'X' ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10); return Number.isFinite(z) && z > 0 && z < 0x110000 ? String.fromCodePoint(z) : ''; } return Object.prototype.hasOwnProperty.call(NAMEN, n) ? NAMEN[n] : g; });
const sauber = (t) => entschluesseln(String(t ?? '').replace(/<(br|\/p|\/li|\/div|\/h[1-6])\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t\u00a0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();

/** Ist das eine Web-Adresse, die abgerufen werden darf? Nur http(s), kein Gerät im eigenen Netz. Zurück: die Adresse oder ''. */
export function webAdresse(roh) {
  let t = String(roh || '').trim(); if (!t) return '';
  const m = t.match(/https?:\/\/[^\s<>"']+/i); if (m) t = m[0]; else if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(t)) t = 'https://' + t; else return '';
  try { const u = new URL(t); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) return ''; return u.href; } catch { return ''; }
}

/** Holt den Quelltext einer Seite, direkt. Wirft mit Klartext; `gesperrt` heißt: der Browser durfte die Seite nicht lesen. */
export async function holeSeite(adresse, { hol = fetch, sprache = 'de', zeitMs = 15000 } = {}) {
  const u = webAdresse(adresse); if (!u) throw new Error(text(sprache, 'Das ist keine Web-Adresse.', 'This is not a web address.'));
  const ab = typeof AbortController === 'function' ? new AbortController() : null, uhr = ab ? setTimeout(() => ab.abort(), zeitMs) : null;
  let ant;
  try { ant = await hol(u, { redirect: 'follow', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ab ? ab.signal : undefined }); }
  catch (e) { const f = new Error(e && e.name === 'AbortError' ? text(sprache, 'Die Seite antwortet nicht.', 'The page does not answer.') : text(sprache, 'Der Browser darf diese Seite nicht direkt lesen.', 'The browser may not read this page directly.')); f.gesperrt = !(e && e.name === 'AbortError'); throw f; }
  finally { if (uhr) clearTimeout(uhr); }
  if (!ant.ok) throw new Error(fuelle(text(sprache, 'Die Seite antwortet mit einem Fehler (HTTP {0}).', 'The page answers with an error (HTTP {0}).'), ant.status));
  const html = await ant.text();
  if (html.length < 200) throw new Error(text(sprache, 'Die Seite hat keinen Inhalt geliefert.', 'The page returned no content.'));
  return html;
}

/* ---------- Rezeptdaten der Seite (schema.org, JSON-LD) ---------- */
function findeRezept(d, tiefe = 0) {
  if (!d || typeof d !== 'object' || tiefe > 6) return null;
  if (Array.isArray(d)) { for (const x of d) { const r = findeRezept(x, tiefe + 1); if (r) return r; } return null; }
  const t = d['@type']; if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return d;
  for (const k of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) { const r = findeRezept(d[k], tiefe + 1); if (r) return r; }
  return null;
}
export function jsonLdRezept(html) {
  for (const m of String(html || '').matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    let roh = m[1].trim().replace(/^<!--|-->$/g, '').replace(/^\/\/<!\[CDATA\[|\/\/\]\]>$/g, '').trim();
    try { const r = findeRezept(JSON.parse(roh)); if (r) return r; } catch { try { const r = findeRezept(JSON.parse(roh.replace(/[\u0000-\u001f]+/g, ' '))); if (r) return r; } catch { /* dieses Stück ist kein lesbares JSON */ } }
  }
  return null;
}
/** ISO-8601-Dauer („PT1H30M“, „P0DT45M“) → Minuten oder null. */
export function dauerMinuten(d) {
  const m = String(d || '').match(/^P(?:(\d+)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/i); if (!m || !/\d/.test(String(d))) return null;
  const z = (x) => (x ? parseFloat(String(x).replace(',', '.')) : 0), min = Math.round(z(m[1]) * 1440 + z(m[2]) * 60 + z(m[3]) + z(m[4]) / 60);
  return min > 0 ? min : null;
}
function schritteAus(instr) {
  const aus = [];
  const nimm = (x) => {
    if (!x) return;
    if (typeof x === 'string') { for (const t of sauber(x).split(/\n+/)) { const s = t.replace(/^(?:schritt\s*)?\d{1,2}[.):]\s+/i, '').trim(); if (s) aus.push(s); } return; }
    if (Array.isArray(x)) { x.forEach(nimm); return; }
    if (x['@type'] === 'HowToSection' || Array.isArray(x.itemListElement)) { nimm(x.itemListElement); return; }
    const t = sauber(x.text || x.name || ''); if (t) aus.push(t);
  };
  nimm(instr); return aus;
}
/** Die Bild-Adresse aus jeder schema.org-Form (Text, Liste, ImageObject, relativ); das breiteste zuerst. */
export function bildAdresse(img, basis) {
  const kand = []; const sammle = (x) => { if (!x) return; if (typeof x === 'string') { kand.push({ u: x, w: 0 }); return; } if (Array.isArray(x)) { x.forEach(sammle); return; } if (typeof x === 'object') { const u = x.url || x.contentUrl || x['@id']; if (typeof u === 'string') kand.push({ u, w: parseInt(x.width, 10) || 0 }); else sammle(u); } };
  sammle(img); kand.sort((a, b) => b.w - a.w);
  for (const k of kand) { try { const u = new URL(entschluesseln(k.u.trim()), basis || undefined).href; if (/^https?:/.test(u)) return u; } catch { /* keine Adresse */ } }
  return '';
}
const meta = (html, namen) => { for (const n of namen) { const m = String(html).match(new RegExp(`<(?:meta|link)\\b[^>]*(?:property|name|rel|itemprop)\\s*=\\s*["']${n}["'][^>]*>`, 'i')); const v = m && (m[0].match(/\b(?:content|href)\s*=\s*"([^"]*)"/i) || m[0].match(/\b(?:content|href)\s*=\s*'([^']*)'/i)); if (v && v[1]) return entschluesseln(v[1]); } return ''; };
/** Kategorie aus dem Hinweis der Seite raten: nur, wenn ein Kategoriename der Ausgabe darin vorkommt. Sonst ''. */
export function kategorieRaten(hinweis, kategorien = []) {
  const h = ' ' + String(Array.isArray(hinweis) ? hinweis.join(' ') : hinweis || '').toLowerCase() + ' ';
  for (const c of kategorien) { const n = String(c.name || '').toLowerCase().trim(); if (n.length >= 4 && h.includes(n)) return c.id; }
  return '';
}
/** Liest das Rezept aus dem Quelltext einer Seite, ohne KI. Zurück: Rezept (Form des Kerns, mit `bildAdresse`, `source`) oder null. */
export function rezeptAusHtml(html, adresse = '', { kategorien = [] } = {}) {
  const d = jsonLdRezept(html); if (!d) return null;
  const zut = (Array.isArray(d.recipeIngredient) ? d.recipeIngredient : Array.isArray(d.ingredients) ? d.ingredients : []).map((z) => sauber(z)).filter(Boolean);
  const schritte = schritteAus(d.recipeInstructions);
  const name = sauber(d.name || d.headline || '');
  if (!name && !zut.length && !schritte.length) return null;
  const ert = Array.isArray(d.recipeYield) ? d.recipeYield.join(' ') : d.recipeYield, p = parseInt(String(ert ?? '').match(/\d+/)?.[0] ?? '', 10);
  const zeit = dauerMinuten(d.totalTime) || ((dauerMinuten(d.prepTime) || 0) + (dauerMinuten(d.cookTime) || 0)) || null;
  const r = { name, servings: Number.isFinite(p) && p > 0 && p < 100 ? p : 4, ings: zut.map(zutatAusZeile), steps: schritte.map((txt) => ({ txt })), source: adresse || '', cat: kategorieRaten([d.recipeCategory, d.keywords, name].flat().filter(Boolean), kategorien),
    bildAdresse: bildAdresse(d.image, adresse) || bildAdresse(meta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'image_src']), adresse) };
  if (zeit) r.prepTime = zeit;
  return r;
}

/* ---------- Sichtbarer Text einer Seite ---------- */
const LEER = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'area', 'base', 'col', 'embed', 'track', 'wbr']);
const WEG = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head', 'nav', 'footer', 'aside', 'form', 'iframe', 'button', 'select', 'dialog', 'object', 'canvas']);
const BLOCK = new Set(['p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'ul', 'ol', 'table', 'header', 'main', 'blockquote', 'dt', 'dd', 'figcaption']);
const versteckt = (attr) => /(^|\s)hidden(\s|=|$)/i.test(attr) || /aria-hidden\s*=\s*["']?true/i.test(attr) || /style\s*=\s*["'][^"']*(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(px|pt|em|rem|%)?\s*(;|$|["'])|opacity\s*:\s*0(\.0+)?\s*(;|$))/i.test(attr);
/** Der sichtbare Text einer Seite: ohne Skripte, Navigation, Fußzeile und ohne versteckte Elemente. Zeilen bleiben Zeilen. */
export function seitenText(html) {
  const s = String(html || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<![^>]*>/g, ''); let aus = '', pos = 0, weg = null, tiefe = 0;
  for (const m of s.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g)) {
    const zu = m[1] === '/', tag = m[2].toLowerCase(), attr = m[3] || '';
    if (!weg) aus += s.slice(pos, m.index);
    pos = m.index + m[0].length;
    if (weg) { if (tag === weg) { if (zu) { if (tiefe === 0) weg = null; else tiefe--; } else if (!LEER.has(tag) && !/\/\s*$/.test(attr)) tiefe++; } continue; }
    if (!zu && !LEER.has(tag) && !/\/\s*$/.test(attr) && (WEG.has(tag) || versteckt(attr))) { weg = tag; tiefe = 0; continue; }
    if (tag === 'br' || BLOCK.has(tag)) aus += '\n';
  }
  if (!weg) aus += s.slice(pos);
  return entschluesseln(aus).replace(/[ \t\u00a0\r]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
const istHtml = (t) => /<\s*(html|body|div|script|p|meta|head|span|h1)\b/i.test(t);

/** Eingefügtes (Seitenquelltext oder kopierter Seitentext) → { rezept } (aus den Rezeptdaten der Seite) oder { text } (zum Aufteilen). */
export function ausEingefuegtem(roh, adresse = '', opt = {}) {
  const t = String(roh || '').trim(); if (!t) return { text: '' };
  if (istHtml(t)) { const r = rezeptAusHtml(t, adresse, opt); return r ? { rezept: r } : { text: seitenText(t) }; }
  return { text: t };
}
/** Seitentext ohne KI aufteilen (Überschriften „Zutaten“, „Zubereitung“ …). Zurück: Rezept oder null. */
export function ohneKi(seitentext, adresse = '') { const r = rezeptAusText(seitentext); if (!r || (!r.ings.length && !r.steps.length)) return null; return { ...r, servings: r.servings || 4, source: adresse || '' }; }

/** Was an die KI ginge: der gekürzte Seitentext und der Satz dazu. */
export function fuerKi(seitentext, sprache = 'de') {
  const t = String(seitentext || '').slice(0, KI_TEXT_MAX);
  return { text: t, gekuerzt: seitentext.length > t.length, satz: fuelle(text(sprache, 'Hinaus geht: der sichtbare Text der Seite ({0} Zeichen) an Anthropic (Claude).', 'Sent: the visible text of the page ({0} characters) to Anthropic (Claude).'), t.length) };
}
/** Claude sortiert den Seitentext in ein Rezept. Zurück: das Roh-Objekt wie beim Foto-Scan (→ rezeptAusScan). */
export async function mitKi(seitentext, { schluessel = '', stufe = 'schnell', kategorien = [], hol = fetch, sprache = 'de' } = {}) {
  const t = fuerKi(seitentext, sprache).text;
  if (!t.trim()) throw new Error(text(sprache, 'Die Seite enthält keinen lesbaren Text.', 'The page contains no readable text.'));
  return jsonAusAntwort(await frageClaude(schluessel, [{ type: 'text', text: t }, { type: 'text', text: auftrag('web', kategorien) }], { stufe, hol, sprache }), sprache);
}
/** Holt das Bild einer Seite als Blob, direkt. Im Browser erlauben das wenige Seiten; dann kommt null zurück (kein Fehler). */
export async function holeBild(adresse, { hol = fetch, zeitMs = 12000 } = {}) {
  if (!adresse) return null;
  const ab = typeof AbortController === 'function' ? new AbortController() : null, uhr = ab ? setTimeout(() => ab.abort(), zeitMs) : null;
  try { const a = await hol(adresse, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ab ? ab.signal : undefined }); if (!a.ok) return null; const b = await a.blob(); return b && /^image\//.test(b.type || '') && b.size > 500 ? b : null; } catch { return null; } finally { if (uhr) clearTimeout(uhr); }
}
