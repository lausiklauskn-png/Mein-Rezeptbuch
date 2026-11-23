// Küchen-Kern · Spracheingabe (Diktat) für Textfelder. Im Browser über die eingebaute Spracherkennung (Web Speech).
// Aus Modul 21 der alten App (sbkim/21_spracheingabe.js) übernommen: die Sprachliste, die Fehlertexte, die Schrift-Kontrolle
// für den stillen Fehlschlag, die Rechts-nach-links-Auskunft und der Grundsatz „nie werfen, das Textfeld bleibt nutzbar“.
// Neu im Kern (Modul 21 hat das nicht): Dauer-Diktat mit Wiederanlauf, Zwischenergebnisse, Satzzeichen-Befehle,
// Großschreibung nach Satzende, Schreiben an der Schreibmarke.
// Zwei Hälften: oben die Textlogik (läuft ohne Browser, in Node prüfbar), unten die Erkennung. Die Erkennung kommt als
// Option herein (`Erkennung`): eine Probe übergibt eine nachgestellte, Android-App und Windows-App später ihre eigene.
// Hinweis für die Datenschutzerklärung: Chrome schickt den Ton zur Erkennung an Google; ohne Netz geht es dort nicht.
import { text, fuelle } from './sprache.mjs';

/* ---------- Sprachen ---------- */
/** Die Sprachen, in denen gesprochen werden kann: die zwölf aus Modul 21, dazu Portugiesisch und Chinesisch (Sprachen der App).
 *  Ein Angebot, keine Zusage: der Browser hat keine abfragbare Liste; ob er eine Sprache kann, zeigt erst der Versuch. */
export const SPRECH_SPRACHEN = [['de-DE', 'Deutsch'], ['en-US', 'English'], ['ru-RU', 'Русский'], ['ar-SA', 'العربية'], ['tr-TR', 'Türkçe'], ['pl-PL', 'Polski'], ['uk-UA', 'Українська'],
  ['fr-FR', 'Français'], ['es-ES', 'Español'], ['it-IT', 'Italiano'], ['ps-AF', 'پښتو'], ['fa-IR', 'دری / فارسی'], ['pt-PT', 'Português'], ['zh-CN', '中文']];
const kuerzel = (code) => String(code ?? '').trim().split(/[-_]/)[0].toLowerCase();
const codeVon = (kurz) => (SPRECH_SPRACHEN.find(([c]) => kuerzel(c) === kurz) || [])[0];
/** Der angezeigte Name zu einem Code ('ar-SA' → 'العربية'); unbekannt: der Code selbst. */
export const sprechName = (code) => (SPRECH_SPRACHEN.find(([c]) => c === code) || SPRECH_SPRACHEN.find(([c]) => kuerzel(c) === kuerzel(code)) || [])[1] || String(code ?? '');

/** Aus der App-Sprache ('de', 'en' …) wird der Code für die Erkennung ('de-DE'). Ein voller Code bleibt ('de-AT'), eine Sprache
 *  außerhalb der Liste auch ('ja'). Ohne Angabe gilt die Geräte-Sprache, wenn die Liste sie kennt, sonst Deutsch. */
export function sprachCode(appSprache, nav = globalThis.navigator) {
  const s = String(appSprache ?? '').trim().replace(/_/g, '-'), voll = /^([a-z]{2,3})-([a-z0-9-]+)$/i.exec(s);
  if (voll) return voll[1].toLowerCase() + '-' + (voll[2].length === 2 ? voll[2].toUpperCase() : voll[2]);
  if (/^[a-z]{2,3}$/i.test(s)) return codeVon(s.toLowerCase()) || s.toLowerCase();
  for (const l of [...((nav && nav.languages) || []), nav && nav.language].filter(Boolean)) { const c = codeVon(kuerzel(l)); if (c) return c; }
  return SPRECH_SPRACHEN[0][0];
}
/** Liest ein Feld in dieser Sprache von rechts nach links? Dann setzt diktiere() `dir="auto"` (der Browser entscheidet am Inhalt). */
export const rechtsNachLinks = (code) => ['ar', 'he', 'fa', 'ur', 'ps'].includes(kuerzel(code));

/* ---------- Satzzeichen-Befehle ---------- */
/* Gesprochenes Wort → Zeichen. Paschtu fehlt mit Absicht: die Wörter sind nicht belegt, und ein geratener Befehl wäre schlimmer als keiner.
   Englisch „dash“ fehlt auch: im Mixarium ist ein Dash eine Menge. Klammern und Striche gibt es nur auf Deutsch und Englisch. */
const BEFEHLE = {
  de: { ',': ['Komma'], '.': ['Punkt'], '?': ['Fragezeichen'], '!': ['Ausrufezeichen', 'Ausrufungszeichen'], ':': ['Doppelpunkt'], ';': ['Semikolon', 'Strichpunkt'], '\n': ['neue Zeile', 'nächste Zeile', 'Zeilenumbruch'], '\n\n': ['neuer Absatz', 'nächster Absatz'], '-': ['Bindestrich'], '–': ['Gedankenstrich'], '(': ['Klammer auf'], ')': ['Klammer zu'] },
  en: { ',': ['comma'], '.': ['period', 'full stop'], '?': ['question mark'], '!': ['exclamation mark', 'exclamation point'], ':': ['colon'], ';': ['semicolon'], '\n': ['new line', 'next line'], '\n\n': ['new paragraph'], '-': ['hyphen'], '(': ['open bracket', 'open parenthesis'], ')': ['close bracket', 'close parenthesis'] },
  fr: { ',': ['virgule'], '.': ['point'], '?': ["point d'interrogation"], '!': ["point d'exclamation"], ':': ['deux points', 'deux-points'], ';': ['point-virgule', 'point virgule'], '\n': ['nouvelle ligne', 'à la ligne'], '\n\n': ['nouveau paragraphe'] },
  es: { ',': ['coma'], '.': ['punto', 'punto y seguido'], '.\n': ['punto y aparte'], '?': ['signo de interrogación', 'cierra interrogación'], '¿': ['abre interrogación'], '!': ['signo de exclamación', 'cierra exclamación'], '¡': ['abre exclamación'], ':': ['dos puntos'], ';': ['punto y coma'], '\n': ['nueva línea'], '\n\n': ['nuevo párrafo'] },
  it: { ',': ['virgola'], '.': ['punto'], '?': ['punto interrogativo', 'punto di domanda'], '!': ['punto esclamativo'], ':': ['due punti'], ';': ['punto e virgola'], '\n': ['nuova riga', 'a capo'], '\n\n': ['nuovo paragrafo'] },
  pt: { ',': ['vírgula'], '.': ['ponto', 'ponto final'], '?': ['ponto de interrogação'], '!': ['ponto de exclamação'], ':': ['dois pontos'], ';': ['ponto e vírgula'], '\n': ['nova linha'], '\n\n': ['novo parágrafo'] },
  ru: { ',': ['запятая'], '.': ['точка'], '?': ['вопросительный знак'], '!': ['восклицательный знак'], ':': ['двоеточие'], ';': ['точка с запятой'], '\n': ['новая строка', 'с новой строки'], '\n\n': ['новый абзац'] },
  uk: { ',': ['кома'], '.': ['крапка'], '?': ['знак питання'], '!': ['знак оклику'], ':': ['двокрапка'], ';': ['крапка з комою'], '\n': ['новий рядок'], '\n\n': ['новий абзац'] },
  pl: { ',': ['przecinek'], '.': ['kropka'], '?': ['znak zapytania', 'pytajnik'], '!': ['wykrzyknik'], ':': ['dwukropek'], ';': ['średnik'], '\n': ['nowa linia', 'nowy wiersz'], '\n\n': ['nowy akapit'] },
  tr: { ',': ['virgül'], '.': ['nokta'], '?': ['soru işareti'], '!': ['ünlem işareti', 'ünlem'], ':': ['iki nokta', 'İki nokta'], ';': ['noktalı virgül'], '\n': ['yeni satır'], '\n\n': ['yeni paragraf'] },
  ar: { '،': ['فاصلة'], '.': ['نقطة'], '؟': ['علامة استفهام'], '!': ['علامة تعجب'], ':': ['نقطتان'], '؛': ['فاصلة منقوطة'], '\n': ['سطر جديد'], '\n\n': ['فقرة جديدة'] },
  fa: { '،': ['ویرگول'], '.': ['نقطه'], '؟': ['علامت سؤال', 'علامت سوال'], '!': ['علامت تعجب'], ':': ['دو نقطه', 'دونقطه'], '؛': ['نقطه ویرگول', 'نقطه\u200cویرگول'], '\n': ['خط جدید', 'سطر جدید'], '\n\n': ['پاراگراف جدید'] },
  zh: { '，': ['逗号'], '。': ['句号'], '？': ['问号'], '！': ['感叹号', '惊叹号'], '：': ['冒号'], '；': ['分号'], '\n': ['换行'], '\n\n': ['新段落', '另起一段'] },
};
/* „auf den Punkt gegart“, „à point“, „a punto de nieve“: nach diesen Wörtern ist das Punkt-Wort ein Hauptwort, kein Befehl.
   In der Liste stehen nur Wörter, die keinen Satz beenden („ein“ fehlt mit Absicht: „Rühre das Mehl ein Punkt“). */
const KEIN_PUNKT_NACH = { de: ['den', 'der', 'dem', 'einen', 'einem', 'zum', 'diesen', 'diesem', 'dieser', 'jeden', 'jeder'], en: ['a', 'the', 'this', 'that', 'each', 'every'], fr: ['à', 'au', 'le', 'un', 'ce'],
  es: ['a', 'al', 'el', 'un', 'su', 'en'], it: ['il', 'al', 'un', 'a', 'in'], pt: ['ao', 'o', 'um', 'em', 'no'] };
const OHNE_LEER = new Set(['zh']);                                                    /* Sprachen, die Wörter nicht mit Leerzeichen trennen */
const KOMMA_ZAHL = new Set(['de', 'fr', 'es', 'it', 'pt', 'ru', 'uk', 'pl', 'tr']);  /* „eins Komma fünf“ ist dort eine Zahl: 1,5 */
const ANHANG = ',.;:!?)]}…،؛؟，。；：！？';   /* hängt sich an das Wort davor */
const OEFFNEND = '([{¿¡„«';                /* das Wort danach hängt sich an */
const SATZENDE = '.!?…؟。！？';
const HAENGT = ANHANG + '\n-';

/** Die Sprachen mit Satzzeichen-Befehlen und die Befehle einer Sprache als [gesprochen, Zeichen] (für eine Hilfe „Was kann ich sagen?“). */
export const BEFEHL_SPRACHEN = Object.keys(BEFEHLE);
export const befehlsListe = (sprache = 'de') => Object.entries(BEFEHLE[kuerzel(sprache)] || {}).flatMap(([z, worte]) => worte.map((w) => [w, z]));

const glatt = (s) => String(s ?? '').replace(/[ \t\u00a0]+/g, ' ').replace(/^ | $/g, '');
const schluessel = (w) => String(w).toLowerCase().replace(/’/g, "'").replace(/[ \t\u00a0]+/g, ' ');
const letztesWort = (s) => (String(s).trim().split(/\s+/).pop() || '').toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
const muster = {};
/* Ein Suchmuster je Sprache, der längste Befehl zuerst („point d'interrogation“ vor „point“). Nur ganze Wörter; Chinesisch hat keine Wortgrenzen.
   Ohne Lookbehind gebaut, damit auch ältere Safari die Datei lesen. */
function befehlsMuster(kurz) {
  if (kurz in muster) return muster[kurz];
  if (!BEFEHLE[kurz]) return (muster[kurz] = null);
  const paare = befehlsListe(kurz).sort((a, b) => b[0].length - a[0].length);
  const quelle = paare.map(([w]) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]").replace(/ /g, '[ \\t\\u00a0]+')).join('|');
  return (muster[kurz] = { re: new RegExp(OHNE_LEER.has(kurz) ? `()(${quelle})` : `(^|[^\\p{L}\\p{N}])(${quelle})(?![\\p{L}\\p{N}])`, 'giu'), zeichen: new Map(paare.map(([w, z]) => [schluessel(w), z])) });
}
function erstesGross(s, kurz) {
  const m = /^([„«"'(\[¿¡]*)(\p{Ll})/u.exec(s); if (!m) return s;
  let g; try { g = m[2].toLocaleUpperCase(kurz || undefined); } catch { g = m[2].toUpperCase(); }
  return m[1] + g + s.slice(m[0].length);
}

/** Gesprochene Satzzeichen werden Zeichen: „Mehl sieben Komma Eier trennen Punkt neue Zeile“ → „Mehl sieben, Eier trennen.\n“.
 *  Satzzeichen hängen sich an das Wort davor; nach einem Satzende und nach einem Zeilenwechsel geht es groß weiter (`gross`).
 *  `zeilen: false` lässt Zeilenwechsel weg (einzeilige Felder). Eine Sprache ohne Befehle gibt den Text nur geglättet zurück. */
export function befehleAnwenden(gesprochen, sprache = 'de', { gross = true, zeilen = true } = {}) {
  const roh = String(gesprochen ?? ''), kurz = kuerzel(sprache), m = befehlsMuster(kurz), eng = OHNE_LEER.has(kurz), nenn = KEIN_PUNKT_NACH[kurz];
  let aus = '', dicht = false, hoch = false, ziffer = false;
  const wort = (s) => { s = glatt(s); if (!s) return; if (hoch) s = erstesGross(s, kurz);
    if (aus && !dicht && !eng && !/\s$/.test(aus) && !(ziffer && /^\d/.test(s))) aus += ' ';
    aus += s; dicht = hoch = ziffer = false; };
  const zeichen = (z) => { if (!zeilen) z = z.replace(/\n+/g, ''); if (!z) return;
    const erst = z[0], letzt = z[z.length - 1];
    if (HAENGT.includes(erst)) aus = aus.replace(/[ \t]+$/, ''); else if (aus && !eng && !/\s$/.test(aus)) aus += ' ';
    ziffer = z === ',' && KOMMA_ZAHL.has(kurz) && /\d$/.test(aus);
    aus += z; dicht = letzt === '-' || OEFFNEND.includes(letzt);
    hoch = gross && (SATZENDE.includes(letzt) || letzt === '\n' || (hoch && OEFFNEND.includes(letzt))); };
  let i = 0;
  if (m) { m.re.lastIndex = 0; for (let t; (t = m.re.exec(roh)); ) {
    const vorher = t.index + t[1].length, z = m.zeichen.get(schluessel(t[2]));
    if (z == null || (z[0] === '.' && nenn && nenn.includes(letztesWort(roh.slice(0, vorher))))) continue;
    wort(roh.slice(i, vorher)); zeichen(z); i = m.re.lastIndex; } }
  wort(roh.slice(i));
  return aus;
}

/** Groß anfangen, wenn davor nichts steht oder ein Satz zu Ende ist („Hallo.“ + „wie geht es“ → „Wie geht es“). */
export function satzGross(stueck, davor = '', sprache = 'de') {
  const s = String(stueck ?? ''), v = String(davor ?? '').replace(/[ \t\u00a0]+$/, '');
  return !v || SATZENDE.includes(v[v.length - 1]) || v.endsWith('\n') ? erstesGross(s, kuerzel(sprache)) : s;
}

const grenzen = (w, start, ende) => { const n = w.length, zahl = (x, sonst) => (Number.isFinite(x) ? Math.max(0, Math.min(n, Math.trunc(x))) : sonst), a = zahl(start, n), b = zahl(ende, a); return a <= b ? [a, b] : [b, a]; };
/** Setzt `neuerText` an die Schreibmarke: ersetzt den Bereich [start, ende) des Feldwerts. Ohne Marke ans Ende.
 *  Zurück: { wert, marke } – der neue Feldwert und die Schreibmarke hinter dem Eingefügten. Reiner Text, keine Abstände. */
export function einfuegen(feldWert, start, ende, neuerText) {
  const w = String(feldWert ?? ''), [a, b] = grenzen(w, start, ende), t = String(neuerText ?? '');
  return { wert: w.slice(0, a) + t + w.slice(b), marke: a + t.length };
}

/** Ein gesprochenes Stück kommt an die Stelle [start, ende): Befehle angewandt, groß nach Satzende, mit einem Leerzeichen zum Text
 *  davor und dahinter, wo eines fehlt. Zurück: { wert, marke, von, bis }; [von, bis) ist der Bereich, den das Stück jetzt belegt
 *  (ein Zwischenergebnis wird dort durch das nächste ersetzt). */
export function setzeEin(feldWert, start, ende, gesprochen, sprache = 'de', { befehle = true, gross = true, zeilen = true } = {}) {
  const w = String(feldWert ?? ''), kurz = kuerzel(sprache), eng = OHNE_LEER.has(kurz); let [a, b] = grenzen(w, start, ende);
  let t = befehle ? befehleAnwenden(gesprochen, kurz, { gross, zeilen }) : glatt(gesprochen);
  if (!t) return { wert: w.slice(0, a) + w.slice(b), marke: a, von: a, bis: a };
  if (HAENGT.includes(t[0])) while (a > 0 && (w[a - 1] === ' ' || w[a - 1] === '\t')) a--;   /* ein Satzzeichen nimmt die Leerzeichen davor mit */
  const davor = w.slice(0, a), danach = w.slice(b);
  if (gross) t = satzGross(t, davor, kurz);
  const vorn = !eng && davor && !/[\s(\[{¿¡„«-]$/.test(davor) && !HAENGT.includes(t[0]) ? ' ' : '';
  const hinten = !eng && /^[\p{L}\p{N}]/u.test(danach) && !/[\s(\[{¿¡„«-]$/.test(t) ? ' ' : '';
  return { wert: davor + vorn + t + hinten + danach, marke: a + vorn.length + t.length, von: a, bis: a + vorn.length + t.length + hinten.length };
}

/* ---------- Fehler im Klartext (Modul 21: speechErrorHint, scriptMismatchHint) ---------- */
const TEXTE = {
  erlaubnis: ['Mikrofon-Zugriff nicht erlaubt. Du kannst stattdessen tippen.', 'Microphone access is not allowed. You can type instead.'],
  stille: ['Nichts erkannt. Bitte noch einmal sprechen oder tippen.', 'Nothing recognised. Please speak again or type.'],
  mikrofon: ['Kein Mikrofon gefunden. Du kannst stattdessen tippen.', 'No microphone found. You can type instead.'],
  abbruch: ['Spracheingabe abgebrochen.', 'Voice input cancelled.'],
  netz: ['Netz nicht erreichbar. Spracheingabe gerade nicht möglich, bitte tippen.', 'No network. Voice input is not possible right now, please type.'],
  sprache: ['Diese Sprache kann die Spracherkennung dieses Browsers nicht. Du kannst tippen.', 'The speech recognition of this browser does not know this language. You can type.'],
  fehlt: ['Die Spracherkennung gibt es in diesem Browser nicht. Bitte tippen.', 'This browser has no speech recognition. Please type.'],
  unbekannt: ['Spracheingabe gerade nicht möglich. Du kannst tippen.', 'Voice input is not possible right now. You can type.'],
};
/** Ordnet einen Fehler ein: 'erlaubnis' | 'stille' | 'mikrofon' | 'abbruch' | 'netz' | 'sprache' | 'fehlt' | 'unbekannt'.
 *  Nimmt das Fehler-Ereignis der Erkennung ({ error }), einen geworfenen Fehler ({ name, message }) oder das Kennwort selbst. */
export function fehlerArt(fehler) {
  const istText = typeof fehler === 'string', name = istText ? fehler : String((fehler && (fehler.error || fehler.name)) || ''), wort = istText ? fehler : String((fehler && fehler.message) || '');
  if (Object.prototype.hasOwnProperty.call(TEXTE, name)) return name;
  if (name === 'not-allowed' || name === 'service-not-allowed' || name === 'NotAllowedError') return 'erlaubnis';
  if (name === 'no-speech') return 'stille';
  if (name === 'audio-capture' || name === 'NotFoundError') return 'mikrofon';
  if (name === 'aborted' || name === 'AbortError') return 'abbruch';
  if (name === 'language-not-supported') return 'sprache';
  if (name === 'network') return 'netz';
  if (name === 'InvalidStateError') return 'unbekannt';
  if (/denied|permission/i.test(wort)) return 'erlaubnis';
  return /network|fetch|ENOTFOUND/i.test(wort) ? 'netz' : 'unbekannt';
}
/** Der Fehler als ruhiger Satz in der Sprache der Oberfläche. Wirft nie. */
export function fehlerText(fehler, sprache = 'de') { const [de, en] = TEXTE[fehlerArt(fehler)]; return text(kuerzel(sprache) || 'de', de, en); }

const SCHRIFT = { ar: [/[\u0600-\u06ff]/, 'arabischer', 'Arabic'], fa: [/[\u0600-\u06ff]/, 'arabischer', 'Arabic'], ps: [/[\u0600-\u06ff]/, 'arabischer', 'Arabic'],
  ru: [/[\u0400-\u04ff]/, 'kyrillischer', 'Cyrillic'], uk: [/[\u0400-\u04ff]/, 'kyrillischer', 'Cyrillic'], zh: [/[\u3400-\u9fff]/, 'chinesischer', 'Chinese'] };
/** Der stille Fehlschlag: der Browser meldet keinen Fehler, hat aber eine andere Sprache gehört (Paschtu kam als „Salaam“ in
 *  lateinischen Buchstaben zurück). Ein Satz, wenn die Schrift nicht zur Sprache passt; sonst null. Unter vier Zeichen kein Urteil. */
export function schriftHinweis(gehoert, sprache, oberflaeche = 'de') {
  const s = SCHRIFT[kuerzel(sprache)], t = String(gehoert ?? '').trim(), o = kuerzel(oberflaeche) || 'de';
  if (!s || t.length < 4 || s[0].test(t)) return null;
  return fuelle(text(o, 'Der Browser hat vermutlich nicht in {0} gehört: Der Text steht nicht in {1} Schrift. Du kannst ihn stehen lassen oder tippen.', 'The browser probably did not listen in {0}: the text is not in {1} script. You can leave it or type.'), sprechName(sprache), text(o, s[1], s[2]));
}

/* ---------- Die Erkennung (Browser) ---------- */
const erkennung = () => globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
const istAndroid = (nav = globalThis.navigator) => /Android/i.test(String((nav && nav.userAgent) || ''));
const hatFokus = (feld) => { const d = feld.ownerDocument || globalThis.document; return !!d && d.activeElement === feld; };
const STILLE_RUNDEN = 6;   /* so viele Läufe ohne ein Wort in Folge, dann geht das Mikrofon von selbst aus */
let laufend = null;        /* höchstens ein Diktat zur selben Zeit */

/** Geht Spracheingabe hier? (Ob der Browser die gewählte Sprache kann, zeigt erst der Versuch.) */
export const diktatMoeglich = (Erkennung = erkennung()) => typeof Erkennung === 'function';
/** Läuft gerade ein Diktat (in dieses Feld)? */
export const diktatLaeuft = (feld) => !!laufend && laufend.laeuft() && (!feld || laufend.feld === feld);

/** Startet das Diktat in ein <input> oder <textarea>. Geschrieben wird an der Schreibmarke (eine Auswahl wird ersetzt); ein Feld,
 *  das noch nie angefasst wurde, bekommt den Text ans Ende. Jede Änderung löst ein `input`-Ereignis aus. Wirft nie.
 *  wahl: sprache ('de' | 'de-DE' …; leer = Gerät) · meldungen (Sprache der Fehlertexte; Vorgabe wie sprache)
 *        dauer (true: läuft weiter, bis stopp() oder langes Schweigen; false: ein Satz. Vorgabe: im <textarea> an, im <input> aus)
 *        zwischen (Zwischenergebnisse zeigen) · befehle (Satzzeichen-Befehle) · gross (Großschreibung)
 *        wo ('marke' | 'ende') · durchgehend (continuous; Vorgabe: auf Android aus, dort trägt der Wiederanlauf) · stilleRunden
 *        beiStand(an) – hört zu / hört nicht mehr zu · beiFehler(satz, art) – Klartext und Kennwort (siehe fehlerArt; 'schrift' = Hinweis)
 *        Erkennung – die Klasse der Erkennung (Vorgabe: SpeechRecognition des Browsers)
 *  Zurück: { feld, stopp(), abbrechen(), laeuft() }. stopp() lässt das letzte Ergebnis noch ankommen, abbrechen() nicht. */
export function diktiere(feld, wahl = {}) {
  const einzeilig = !!feld && String(feld.tagName || '').toUpperCase() === 'INPUT';   /* ein <input> hat keine Zeilen und bekommt einen Satz, kein Dauer-Diktat */
  const { sprache = 'de', meldungen, dauer = !einzeilig, zwischen = true, befehle = true, gross = true, wo = 'marke', android = istAndroid(), durchgehend = !android,
    stilleRunden = STILLE_RUNDEN, beiStand = () => {}, beiFehler = () => {}, Erkennung = erkennung() } = wahl;
  const code = sprachCode(sprache), kurz = kuerzel(code), spr = meldungen || kurz, eng = OHNE_LEER.has(kurz);
  const sag = (art, satz) => { try { beiFehler(satz ?? fehlerText(art, spr), art); } catch { /* ein Fehler im Rückruf beendet das Diktat nicht */ } };
  if (laufend) laufend.abbrechen();
  if (!feld || typeof Erkennung !== 'function') { if (feld) sag('fehlt'); return { feld, stopp() {}, abbrechen() {}, laeuft: () => false }; }

  const opt = { befehle, gross, zeilen: !einzeilig };
  const wert = () => String(feld.value ?? '');
  const auswahl = () => { try { const a = feld.selectionStart, b = feld.selectionEnd; return typeof a === 'number' && typeof b === 'number' ? [a, b] : null; } catch { return null; } };
  /* zustand: 'an' → 'endet' (stopp: das letzte Ergebnis darf noch kommen) → 'aus'. [von, bis) ist das offene Zwischenergebnis im Feld. */
  let zustand = 'an', lauf = null, festBis = 0, hatte = false, leer = 0, von = null, bis = null, offenText = '', geschrieben = wert(), eigene = null, taub = false, standAus = false, schriftDa = false;

  const standMelden = (an) => { if (!an) { if (standAus) return; standAus = true; } try { beiStand(an); } catch { /* wie oben */ } };
  /* taub: das Feld nimmt die gesetzte Marke nicht an; dann zählt die eigene. */
  const markeSetzen = (m) => { eigene = m; try { if (typeof feld.setSelectionRange === 'function') feld.setSelectionRange(m, m); } catch { /* Feldarten ohne Schreibmarke (E-Mail, Zahl) */ }
    const a = auswahl(); taub = !!a && (a[0] !== m || a[1] !== m); };
  /* Wo es weitergeht: an der Schreibmarke des Feldes. Kennt das Feld keine, hinter dem zuletzt Geschriebenen; wurde dazwischen getippt, am Ende. */
  const anker = () => (!taub && auswahl()) || (eigene != null && wert() === geschrieben ? [eigene, eigene] : [wert().length, wert().length]);

  function schreibe(gesprochen, fertig) {
    if (feld.isConnected === false) { schluss(); return; }                         /* das Feld ist nicht mehr auf der Seite: Mikrofon aus */
    const w = wert(), meins = von != null && w.slice(von, bis) === offenText;
    if (!meins) [von, bis] = anker();                                              /* kein offenes Stück, oder jemand hat es überschrieben */
    const s = setzeEin(w, von, bis, gesprochen, kurz, opt);
    if (!meins && s.von === s.bis) { von = bis = null; offenText = ''; return; }   /* nichts zu schreiben: eine Auswahl im Feld bleibt stehen */
    if (s.wert !== w) feld.value = s.wert;
    geschrieben = wert(); markeSetzen(s.marke);
    /* Wächst der Text am Ende über das Feld hinaus, folgt die Ansicht (der Browser rollt nur beim Tippen von selbst). Mitten im Text bleibt sie stehen. */
    if (s.marke >= geschrieben.length) try { if (einzeilig) feld.scrollLeft = feld.scrollWidth; else feld.scrollTop = feld.scrollHeight; } catch { /* ohne Rollen geht es auch */ }
    if (fertig) { von = bis = null; offenText = ''; } else { von = s.von; bis = s.bis; offenText = geschrieben.slice(von, bis); }
    if (s.wert !== w && typeof feld.dispatchEvent === 'function' && typeof Event === 'function') feld.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function ergebnis(ev) {
    const liste = (ev && ev.results) || [], kette = (a, b) => (a && b && !eng ? a + ' ' + b : a + b); let fest = '', offen = '';
    for (let i = festBis; i < liste.length; i++) {
      const r = liste[i], t = (r && r[0] && r[0].transcript) || '';
      /* Android-Chrome meldet Zwischenergebnisse als fertig, aber mit Sicherheit 0: die gelten als Zwischenergebnis. */
      if (r && r.isFinal && !offen && !(android && r[0] && r[0].confidence === 0)) { fest = kette(fest, t); festBis = i + 1; } else offen = kette(offen, t);
    }
    if (glatt(fest) || glatt(offen)) hatte = true;
    if (glatt(fest)) { schreibe(fest, true); if (!schriftDa) { const h = schriftHinweis(fest, code, spr); if (h) { schriftDa = true; sag('schrift', h); } } }
    if (zustand !== 'aus' && (glatt(offen) || (von != null && bis > von))) schreibe(offen, false);
  }
  function fehlerDa(ev) {
    const art = fehlerArt(ev);
    if (art === 'stille' && dauer) return;      /* Schweigen ist im Dauer-Diktat kein Fehler: die Runde zählt in laufEnde() */
    sag(art);
    if (art !== 'stille') schluss();            /* kein Wiederanlauf gegen eine Sperre, ohne Mikrofon oder ohne Netz */
  }
  function laufEnde() {
    lauf = null; von = bis = null; offenText = '';   /* ein offenes Zwischenergebnis bleibt als Text stehen */
    if (zustand !== 'an' || !dauer || feld.isConnected === false) { schluss(); return; }
    leer = hatte ? 0 : leer + 1;
    if (leer >= stilleRunden) { sag('stille'); schluss(); return; }
    starte();                                        /* Wiederanlauf: der Browser beendet jeden Lauf von selbst (Pause, Zeitgrenze) */
  }
  function starte() {
    hatte = false; festBis = 0;
    try {
      const e = new Erkennung(); lauf = e;
      e.lang = code; e.continuous = !!(dauer && durchgehend); e.interimResults = !!zwischen; e.maxAlternatives = 1;
      e.onresult = (ev) => { if (lauf !== e || zustand === 'aus') return; try { ergebnis(ev); } catch (f) { sag(fehlerArt(f)); schluss(); } };
      e.onerror = (ev) => { if (lauf === e && zustand === 'an') fehlerDa(ev); };
      e.onend = () => { if (lauf === e) laufEnde(); };
      e.start();
    } catch (f) { sag(fehlerArt(f)); schluss(); }
  }
  function schluss() {
    if (zustand === 'aus') return;
    const e = lauf; lauf = null; zustand = 'aus'; if (laufend === sitzung) laufend = null;
    if (e) try { if (typeof e.abort === 'function') e.abort(); else e.stop(); } catch { /* schon aus */ }
    standMelden(false);
  }
  function stopp() {
    if (zustand !== 'an') return;
    zustand = 'endet'; standMelden(false);
    if (!lauf) { schluss(); return; }
    try { lauf.stop(); } catch { schluss(); }
  }
  const sitzung = { feld, stopp, abbrechen: schluss, laeuft: () => zustand === 'an' };

  /* Startstelle. Ein Feld, das nie den Fokus hatte, meldet die Marke 0/0: gemeint ist dann das Ende, nicht der Anfang.
     Grenze: wer die Marke bewusst ganz an den Anfang setzt und dann den Knopf tippt (Fokus weg vom Feld), landet auch am Ende. */
  { const n = geschrieben.length, m = auswahl();
    if (wo === 'ende' || !m || (m[0] === 0 && m[1] === 0 && n && !hatFokus(feld))) markeSetzen(n); else eigene = Math.max(m[0], m[1]); }
  try { if (rechtsNachLinks(code) && typeof feld.getAttribute === 'function' && !feld.getAttribute('dir')) feld.setAttribute('dir', 'auto'); } catch { /* ohne Richtung geht es auch */ }
  laufend = sitzung; standMelden(true); starte();
  return sitzung;
}

/** Der Umschalter für einen Mikrofon-Knopf (wie bisher): startet das Diktat für das Feld; läuft es dort schon, hört es auf;
 *  läuft es in einem anderen Feld, wechselt es. `stand(an)` meldet, ob zugehört wird. `wahl` wie bei diktiere() (z. B. beiFehler). */
export function diktat(feld, sprache = 'de-DE', stand = () => {}, wahl = {}) {
  if (laufend && laufend.laeuft()) { const war = laufend.feld; laufend.stopp(); if (war === feld) return null; }
  if (!feld || !diktatMoeglich(wahl.Erkennung)) return null;
  return diktiere(feld, { ...wahl, sprache, beiStand: stand });
}
/** Beendet das laufende Diktat (das letzte Ergebnis kommt noch an, solange das Feld auf der Seite steht). */
export function diktatAus() { if (laufend) laufend.stopp(); }
