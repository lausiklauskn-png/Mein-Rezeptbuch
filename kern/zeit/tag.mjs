// Küchen-Kern · Tag und Uhrzeit aus einem Notiztext („morgen“, „am Freitag“, „am 15. November um halb drei“).
// Herkunft: Meine Familienakte (Klaus), lib/family-memory.ts `erinnerungAusText` und `erinnerungsTitel` (Stand 18.11.2026),
// nach JavaScript übertragen. Ortszeit des Geräts. Nichts wird ohne Bestätigung angelegt: die App zeigt den Vorschlag, der Mensch
// übernimmt ihn. Neu fürs Rezeptbuch: Wörter eines Essensplans („essen“, „kochen“, „backen“, „gibt es“) zählen beim Wochentag
// allein und bei „heute“ wie ein Erinnerungswunsch („Freitag gibt es Fisch“); `wunsch` bleibt der Erinnerungswunsch selbst.

const WOCHENTAGE = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
const MONATE = { januar: 1, jänner: 1, jan: 1, februar: 2, feb: 2, märz: 3, maerz: 3, mär: 3, april: 4, apr: 4, mai: 5, juni: 6, jun: 6, juli: 7, jul: 7, august: 8, aug: 8, september: 9, sept: 9, sep: 9, oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12 };
const MONAT_MUSTER = Object.keys(MONATE).sort((a, b) => b.length - a.length).map((m) => `${m}\\.?`).join('|');
/* Ausgeschriebene Tage („ersten“ … „einunddreißigsten“), wie die Spracherkennung sie manchmal liefert. */
const EINER = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const ORDINAL = { erst: 1, zweit: 2, dritt: 3, viert: 4, fünft: 5, sechst: 6, siebt: 7, siebent: 7, acht: 8, neunt: 9, zehnt: 10, elft: 11, zwölft: 12, dreizehnt: 13, vierzehnt: 14, fünfzehnt: 15, sechzehnt: 16, siebzehnt: 17, achtzehnt: 18, neunzehnt: 19, zwanzigst: 20, dreißigst: 30, dreissigst: 30 };
for (let e = 1; e <= 9; e++) ORDINAL[`${EINER[e]}undzwanzigst`] = 20 + e;
ORDINAL.einunddreißigst = 31; ORDINAL.einunddreissigst = 31;
const ORDINAL_MUSTER = `(?:${Object.keys(ORDINAL).sort((a, b) => b.length - a.length).join('|')})(?:e[nrsm]?|e)?`;
const ZAHLWORT = ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
function tagZahl(w) {
  if (/^\d+$/.test(w)) return Number(w);
  const stamm = w.toLowerCase().replace(/(?:en|er|es|em|e)$/, '');
  return ORDINAL[stamm] ?? NaN;
}
const zwei = (n) => String(n).padStart(2, '0');
/** 'JJJJ-MM-TT' in Ortszeit. */
export const ortsDatum = (d) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
const ERINNERUNG = /(erinner|nicht vergessen|denk\w*\s+(?:mich\s+)?(?:da|d)?ran|wecke? mich)/i;
const ESSENSPLAN = /(?<![\p{L}])(?:essen|kochen|backen|grillen|gibt(?:'s|s| es))(?![\p{L}])/iu;

/**
 * Tag und Uhrzeit aus dem Text. Zurück: { wunsch, tag: 'JJJJ-MM-TT', zeit: 'HH:MM' | null } oder null.
 * wunsch: der Text bittet um eine Erinnerung („erinnere mich“, „nicht vergessen“, „denk dran“).
 * Ohne Wunsch und ohne Essensplan zählt nur ein Tag in der Zukunft (eine Notiz über heute ist kein Plan).
 */
export function tagAusText(text, jetzt = new Date()) {
  text = String(text || '');
  const wunsch = ERINNERUNG.test(text), zaehlt = wunsch || ESSENSPLAN.test(text);
  const zeit = text.match(/\bum\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?\b/i) || text.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*uhr\b/i);
  let h = zeit ? Number(zeit[1]) : NaN, m = zeit && zeit[2] ? Number(zeit[2]) : 0;
  /* „um halb drei“: halb N = eine halbe Stunde vor N. Gesprochen ist fast immer der Tag gemeint, darum gilt eine Stunde vor 7 als Nachmittag. */
  const halbUhr = text.match(/\bum\s+halb\s+(\d{1,2}|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\b/i);
  if (halbUhr) {
    const n = /^\d+$/.test(halbUhr[1]) ? Number(halbUhr[1]) : ZAHLWORT.indexOf(halbUhr[1].toLowerCase()) + 1;
    if (n >= 1 && n <= 24) { h = n === 1 ? 12 : n - 1; if (h < 7) h += 12; m = 30; }
  }
  const uhr = (zeit || halbUhr) && h >= 0 && h <= 23 && m <= 59 ? `${zwei(h)}:${zwei(m)}` : null;
  const heute = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  const plus = (n) => new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + n);
  /* „in 5 Stunden“, „in 30 Minuten“, „in 3 Tagen“, „in einer Woche“ */
  const zahl = (w) => (/^\d+$/.test(w) ? Number(w) : { einer: 1, einem: 1, eine: 1, ein: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, halben: 0.5, halbe: 0.5 }[w.toLowerCase()] ?? NaN);
  const halb = /\bin\s+(?:einer\s+)?halben\s+stunde\b/i.test(text);
  const rel = halb ? ['', '30', 'minuten'] : text.match(/\bin\s+(\d+|einer|einem|eine|ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|halben|halbe)\s+(minuten?|min|stunden?|std|tag(?:en)?|wochen?)\b/i);
  if (rel && Number.isFinite(zahl(rel[1]))) {
    const n = zahl(rel[1]), e = rel[2].toLowerCase();
    const ab = new Date(jetzt.getTime() + (e.startsWith('min') ? n * 60000 : e.startsWith('st') ? n * 3600000 : e.startsWith('tag') ? n * 86400000 : n * 7 * 86400000));
    const genau = e.startsWith('min') || e.startsWith('st');
    return { wunsch, tag: ortsDatum(ab), zeit: genau ? `${zwei(ab.getHours())}:${zwei(ab.getMinutes())}` : uhr };
  }
  let tag = null;
  /* Gesprochene Daten: „am 15. November“, „am fünfzehnten November“, „15.11“ (ohne zweiten Punkt), „am zwanzigsten“. „um 10.30 Uhr“ ist eine Zeit. */
  const setze = (t, mon, jahr) => {
    let d = new Date(jahr ?? heute.getFullYear(), mon - 1, t);
    if (jahr === undefined && d < heute) d = new Date(heute.getFullYear() + 1, mon - 1, t);
    if (d.getMonth() === mon - 1 && d.getDate() === t) tag = ortsDatum(d);
  };
  const monat = text.match(new RegExp(`(?<![\\p{L}\\d])(\\d{1,2}|${ORDINAL_MUSTER})\\.?\\s+(${MONAT_MUSTER})(?![\\p{L}])(?:\\s+(20\\d{2}))?`, 'iu'));
  const dt = text.match(/(?<!\bum\s{0,2})(?<![\d.:])(\d{1,2})\.\s?(\d{1,2})(?:\.\s?(20\d{2})(?!\d)|\.(\d{2})(?![\d.:])|\.)?(?![\d:])(?!\s*uhr)/i);
  if (monat) setze(tagZahl(monat[1]), MONATE[monat[2].toLowerCase().replace(/\.$/, '')], monat[3] ? Number(monat[3]) : undefined);
  else if (dt) setze(Number(dt[1]), Number(dt[2]), dt[3] ? Number(dt[3]) : dt[4] ? 2000 + Number(dt[4]) : undefined);
  if (!tag) {   /* „am zwanzigsten“ / „am 20.“ ohne Monat: dieser Monat, sonst der nächste */
    const nur = text.match(new RegExp(`\\bam\\s+(\\d{1,2}\\.|${ORDINAL_MUSTER})(?![\\p{L}\\d])`, 'iu'));
    if (nur) {
      const t = tagZahl(nur[1].replace(/\.$/, ''));
      let d = new Date(heute.getFullYear(), heute.getMonth(), t);
      if (d < heute) d = new Date(heute.getFullYear(), heute.getMonth() + 1, t);
      if (t >= 1 && t <= 31 && d.getDate() === t) tag = ortsDatum(d);
    }
  }
  if (!tag && /(?<![a-zäöüß])übermorgen\b/i.test(text)) tag = ortsDatum(plus(2));
  else if (!tag && /(?<![a-zäöüß])morgen\b/i.test(text)) tag = ortsDatum(plus(1));
  else if (!tag && /\bheute\b/i.test(text)) tag = ortsDatum(heute);
  /* „am nächsten Tag“, „am folgenden Tag“, „tags darauf“: der Tag nach heute. */
  if (!tag && /\b(?:nächsten|folgenden|darauffolgenden)\s+tag\b|\btags?\s+darauf\b/i.test(text)) tag = ortsDatum(plus(1));
  if (!tag) {   /* mit „am/nächsten/kommenden“ immer; der Wochentag allein nur bei einem Wunsch oder Essensplan */
    const w = WOCHENTAGE.findIndex((n) => new RegExp(`\\b(?:am|nächsten|kommenden)\\s+${n}\\b`, 'i').test(text) || (zaehlt && new RegExp(`(?<![\\p{L}])${n}(?![\\p{L}])`, 'iu').test(text)));
    if (w >= 0) tag = ortsDatum(plus(((w - heute.getDay() + 7) % 7) || 7));
  }
  const heuteIso = ortsDatum(heute);
  if (!zaehlt && (!tag || tag <= heuteIso)) return null;   // ohne Wunsch nur ein Tag in der Zukunft
  if (!wunsch && !tag) return null;                        // ein Essensplan ohne Tag ist keiner
  if (!tag) {   /* nur Uhrzeit oder gar nichts: heute, wenn die Uhrzeit noch kommt, sonst morgen */
    const spaeter = uhr && h * 60 + m > jetzt.getHours() * 60 + jetzt.getMinutes();
    tag = ortsDatum(uhr && !spaeter ? plus(1) : heute);
  }
  return { wunsch, tag, zeit: uhr };
}

/** Kurzer Titel: „Erinnere mich morgen um 9 Uhr, Kürbis kaufen“ → „Kürbis kaufen“. Ohne „erinnere mich“ bleibt die erste Zeile. */
export function titelAusText(text, max = 120) {
  const roh = String(text || '').trim().split('\n')[0].trim();
  const ohne = roh.replace(/^(?:bitte\s+)?(?:erinnere?|erinner)\s+mich\s*/i, '');
  if (ohne === roh) return roh.slice(0, max);
  const t = ohne
    .replace(new RegExp(`^(?:(?:heute|morgen|übermorgen|am\\s+\\S+(?:\\s+(?:${MONAT_MUSTER})(?:\\s+20\\d{2})?)?|(?:${WOCHENTAGE.join('|')})|(?:${MONAT_MUSTER})(?:\\s+20\\d{2})?|in\\s+(?:einer\\s+)?\\S+\\s+\\S+|um\\s+halb\\s+\\S+|um\\s*\\d{1,2}(?:[:.]\\d{2})?\\s*(?:uhr)?|noch\\s+(?:ein)?mal|nochmal)[\\s,]*)+`, 'iu'), '')
    .replace(/^(?:daran,?\s*|an\s+)?(?:dass\s+)?(?:ich\s+)?(?:noch\s+)?/i, '').replace(/[.!]+$/, '').trim();
  return (t || roh).slice(0, max);
}
