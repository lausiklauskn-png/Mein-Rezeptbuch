// Proben: Spracheingabe (kern/oberflaeche/diktat.mjs). Kein Mikrofon, kein Netz: die Erkennung ist nachgestellt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRECH_SPRACHEN, BEFEHL_SPRACHEN, befehlsListe, sprachCode, sprechName, rechtsNachLinks, befehleAnwenden, satzGross, einfuegen, setzeEin,
  fehlerArt, fehlerText, schriftHinweis, diktatMoeglich, diktatLaeuft, diktiere, diktat, diktatAus } from '../kern/oberflaeche/diktat.mjs';
import { SPRACHEN } from '../kern/oberflaeche/sprache.mjs';

/* Eine nachgestellte Erkennung: merkt sich jede gebaute Instanz; die Probe spielt Ergebnis, Fehler und Ende selbst ein.
   ergebnis(...teile): jedes Teil ist [text, fertig, sicherheit] – die ganze Liste des Laufs, wie der Browser sie liefert. */
function nachgestellt({ startWirft = null } = {}) {
  const alle = [];
  class Erkennung {
    constructor() { alle.push(this); this.gestartet = 0; this.gestoppt = 0; this.abgebrochen = 0; }
    start() { if (startWirft) throw startWirft; this.gestartet++; }
    stop() { this.gestoppt++; }
    abort() { this.abgebrochen++; }
    ergebnis(...teile) { this.onresult({ resultIndex: 0, results: teile.map(([t, fertig, sicher]) => Object.assign([{ transcript: t, confidence: sicher ?? (fertig ? 0.9 : 0) }], { isFinal: !!fertig })) }); }
    fehler(code) { this.onerror({ error: code }); }
    ende() { this.onend(); }
  }
  return { Erkennung, alle, letzte: () => alle[alle.length - 1] };
}
/* Ein nachgestelltes Textfeld mit Schreibmarke; sammelt die ausgelösten Ereignisse. */
function feldMit(wert = '', a = 0, b = a, mehr = {}) {
  return { tagName: 'TEXTAREA', value: wert, selectionStart: a, selectionEnd: b, ereignisse: [], setSelectionRange(x, y) { this.selectionStart = x; this.selectionEnd = y; }, dispatchEvent(e) { this.ereignisse.push(e.type); return true; }, ...mehr };
}

/* ---------- Textlogik ---------- */
test('Satzzeichen-Befehle Deutsch: Komma, Punkt, Frage, Ausruf, Doppelpunkt, Strichpunkt, Zeile, Absatz, Bindestrich, Klammern', () => {
  assert.equal(befehleAnwenden('Mehl sieben Komma Eier trennen Punkt', 'de'), 'Mehl sieben, Eier trennen.');
  assert.equal(befehleAnwenden('wirklich Fragezeichen ja Ausrufezeichen', 'de'), 'wirklich? Ja!');
  assert.equal(befehleAnwenden('Zutaten Doppelpunkt Mehl Semikolon Zucker Strichpunkt Salz', 'de'), 'Zutaten: Mehl; Zucker; Salz');
  assert.equal(befehleAnwenden('200 g Mehl neue Zeile 3 Eier neuer Absatz alles verrühren', 'de'), '200 g Mehl\n3 Eier\n\nAlles verrühren');
  assert.equal(befehleAnwenden('Butter Bindestrich Milch Klammer auf kalt Klammer zu Gedankenstrich fertig', 'de'), 'Butter-Milch (kalt) – fertig');
  assert.equal(befehleAnwenden('KOMMA', 'de'), ',', 'Groß- und Kleinschreibung des Befehls ist gleich'); assert.equal(befehleAnwenden('neue   Zeile', 'de'), '\n');
  assert.equal(befehleAnwenden('Kommando Punktlandung Bindestriche', 'de'), 'Kommando Punktlandung Bindestriche', 'nur ganze Wörter sind Befehle');
  assert.equal(befehleAnwenden('  viel   Platz  ', 'de'), 'viel Platz'); assert.equal(befehleAnwenden('', 'de'), ''); assert.equal(befehleAnwenden(null, 'de-DE'), '');
  assert.equal(befehleAnwenden('Mehl Komma Zucker', 'de-DE'), 'Mehl, Zucker', 'auch mit vollem Sprachcode');
});
test('Satzzeichen-Befehle je Sprache: jede Sprache mit Befehlen ist geprüft, die acht Sprachen der App sind dabei', () => {
  const JE = {
    de: ['eins Komma zwei Punkt drei Fragezeichen neue Zeile vier', 'eins, zwei. Drei?\nVier'],
    en: ['one comma two full stop three question mark new line four', 'one, two. Three?\nFour'],
    fr: ["pomme virgule poire point trois point d'interrogation nouvelle ligne quatre", 'pomme, poire. Trois?\nQuatre'],
    es: ['uno coma dos punto tres signo de interrogación nueva línea cuatro', 'uno, dos. Tres?\nCuatro'],
    it: ['uno virgola due punto tre punto interrogativo nuova riga quattro', 'uno, due. Tre?\nQuattro'],
    pt: ['maçã vírgula dois ponto três ponto de interrogação nova linha quatro', 'maçã, dois. Três?\nQuatro'],
    ru: ['один запятая два точка три вопросительный знак новая строка четыре', 'один, два. Три?\nЧетыре'],
    uk: ['один кома два крапка три знак питання новий рядок чотири', 'один, два. Три?\nЧотири'],
    pl: ['jeden przecinek dwa kropka trzy znak zapytania nowa linia cztery', 'jeden, dwa. Trzy?\nCztery'],
    tr: ['elma virgül armut nokta üç soru işareti yeni satır dört', 'elma, armut. Üç?\nDört'],
    ar: ['واحد فاصلة اثنان نقطة ثلاثة علامة استفهام سطر جديد أربعة', 'واحد، اثنان. ثلاثة؟\nأربعة'],
    fa: ['سیب ویرگول گلابی نقطه سه علامت سؤال خط جدید چهار', 'سیب، گلابی. سه؟\nچهار'],
    zh: ['一逗号二句号三问号换行四', '一，二。三？\n四'],
  };
  assert.deepEqual(Object.keys(JE).sort(), [...BEFEHL_SPRACHEN].sort(), 'keine Sprache mit Befehlen bleibt ungeprüft');
  for (const [s, [gesprochen, soll]] of Object.entries(JE)) assert.equal(befehleAnwenden(gesprochen, s), soll, s);
  for (const [c] of SPRACHEN) assert.ok(BEFEHL_SPRACHEN.includes(c), 'Sprache der App mit Befehlen: ' + c);
  for (const s of BEFEHL_SPRACHEN) { const z = new Set(befehlsListe(s).map(([, zeichen]) => zeichen)); assert.ok(z.has('\n') && z.has('\n\n') && z.size >= 8, s + ': acht Befehle, mit Zeile und Absatz'); }
  assert.deepEqual(befehlsListe('de').find(([w]) => w === 'Komma'), ['Komma', ',']); assert.deepEqual(befehlsListe('xx'), []);
});
test('Der längste Befehl gewinnt; Apostroph gerade oder typografisch; spanische Frage- und Ausrufezeichen', () => {
  assert.equal(befehleAnwenden("ça va point d'interrogation", 'fr'), 'ça va?');
  assert.equal(befehleAnwenden('ça va point d’exclamation', 'fr'), 'ça va!');
  assert.equal(befehleAnwenden('liste deux points farine point-virgule sucre', 'fr'), 'liste: farine; sucre');
  assert.equal(befehleAnwenden('lista punto y coma otra', 'es'), 'lista; otra'); assert.equal(befehleAnwenden('fin punto y aparte otra', 'es'), 'fin.\nOtra');
  assert.equal(befehleAnwenden('abre interrogación cómo estás cierra interrogación', 'es'), '¿cómo estás?');
  assert.equal(befehleAnwenden('lista ponto e vírgula outra', 'pt'), 'lista; outra'); assert.equal(befehleAnwenden('lista punto e virgola altra', 'it'), 'lista; altra');
  assert.equal(befehleAnwenden('список точка с запятой дальше', 'ru'), 'список; дальше'); assert.equal(befehleAnwenden('список крапка з комою далі', 'uk'), 'список; далі');
  assert.equal(befehleAnwenden('liste noktalı virgül sonra', 'tr'), 'liste; sonra'); assert.equal(befehleAnwenden('malzemeler iki nokta un', 'tr'), 'malzemeler: un'); assert.equal(befehleAnwenden('İki nokta', 'tr'), ':');
  assert.equal(befehleAnwenden('فهرست دو نقطه آرد نقطه ویرگول شکر', 'fa'), 'فهرست: آرد؛ شکر');
});
test('Der Punkt als Hauptwort bleibt stehen („auf den Punkt“, „à point“, „a punto de nieve“); der Befehl danach gilt', () => {
  assert.equal(befehleAnwenden('das Steak auf den Punkt garen Punkt', 'de'), 'das Steak auf den Punkt garen.');
  assert.equal(befehleAnwenden('Rühre das Mehl ein Punkt', 'de'), 'Rühre das Mehl ein.', '„ein“ kann einen Satz beenden: der Befehl gilt');
  assert.equal(befehleAnwenden('cuit à point point', 'fr'), 'cuit à point.'); assert.equal(befehleAnwenden('claras a punto de nieve punto', 'es'), 'claras a punto de nieve.');
  assert.equal(befehleAnwenden('claras em ponto de neve ponto final', 'pt'), 'claras em ponto de neve.'); assert.equal(befehleAnwenden('cotto al punto giusto punto', 'it'), 'cotto al punto giusto.');
  assert.equal(befehleAnwenden('rest for a period of ten minutes period', 'en'), 'rest for a period of ten minutes.');
  assert.equal(befehleAnwenden('add a dash of bitters', 'en'), 'add a dash of bitters', 'ein Dash ist eine Menge, kein Strich');
});
test('Befehle gelten je Sprache; eine Sprache ohne Befehle (Paschtu) gibt den Text nur geglättet zurück', () => {
  assert.ok(!BEFEHL_SPRACHEN.includes('ps')); assert.equal(befehleAnwenden('  salaam   komma punkt ', 'ps-AF'), 'salaam komma punkt');
  assert.equal(befehleAnwenden('hello comma period', 'de'), 'hello comma period'); assert.equal(befehleAnwenden('Hallo Komma Punkt', 'en'), 'Hallo Komma Punkt');
  assert.equal(befehleAnwenden('hallo komma', 'xx'), 'hallo komma'); assert.equal(befehleAnwenden('hallo komma', ''), 'hallo komma');
});
test('Dezimalkomma: „1 Komma 5“ ist eine Zahl, „Mehl Komma 3 Eier“ eine Aufzählung; auf Englisch bleibt es eine Aufzählung', () => {
  assert.equal(befehleAnwenden('1 Komma 5 Liter Milch', 'de'), '1,5 Liter Milch'); assert.equal(befehleAnwenden('Mehl Komma 3 Eier', 'de'), 'Mehl, 3 Eier');
  assert.equal(befehleAnwenden('2 virgule 5 litres', 'fr'), '2,5 litres'); assert.equal(befehleAnwenden('2 comma 3', 'en'), '2, 3');
});
test('Einzeiliges Feld: Zeilenwechsel entfallen, das Satzzeichen bleibt', () => {
  assert.equal(befehleAnwenden('Mehl neue Zeile Zucker Punkt neuer Absatz', 'de', { zeilen: false }), 'Mehl Zucker.');
  assert.equal(befehleAnwenden('fin punto y aparte otra', 'es', { zeilen: false }), 'fin. Otra');
});
test('Großschreibung nach Satzende: im Stück, über Stücke hinweg, nach neuer Zeile, am Feldanfang; nicht nach Komma', () => {
  assert.equal(befehleAnwenden('hallo Punkt wie geht es Fragezeichen gut Ausrufezeichen danke', 'de'), 'hallo. Wie geht es? Gut! Danke');
  assert.equal(befehleAnwenden('hallo Komma wie geht es Doppelpunkt gut', 'de'), 'hallo, wie geht es: gut');
  assert.equal(befehleAnwenden('hallo Punkt wie geht es', 'de', { gross: false }), 'hallo. wie geht es');
  assert.equal(befehleAnwenden('fertig Punkt 3 eier', 'de'), 'fertig. 3 eier', 'eine Ziffer bleibt, das Wort dahinter auch');
  assert.equal(satzGross('wie geht es', 'Hallo.'), 'Wie geht es'); assert.equal(satzGross('wie geht es', 'Hallo?  '), 'Wie geht es'); assert.equal(satzGross('eine Prise', 'Mehl\n'), 'Eine Prise');
  assert.equal(satzGross('mehl', ''), 'Mehl', 'am Feldanfang'); assert.equal(satzGross('und dann', 'Mehl sieben'), 'und dann', 'mitten im Satz klein'); assert.equal(satzGross('und dann', 'Mehl sieben,'), 'und dann');
  assert.equal(satzGross('„hallo“', ''), '„Hallo“'); assert.equal(satzGross('¿cómo estás?', '', 'es'), '¿Cómo estás?'); assert.equal(satzGross('3 eier', ''), '3 eier'); assert.equal(satzGross('Mehl', ''), 'Mehl');
  assert.equal(satzGross('iki yumurta', '', 'tr'), 'İki yumurta', 'türkisches i'); assert.equal(satzGross('ılık su', '', 'tr-TR'), 'Ilık su'); assert.equal(satzGross('كيف الحال', '', 'ar'), 'كيف الحال');
});
test('Einfügen an der Schreibmarke: in der Mitte, statt einer Auswahl, ohne Marke am Ende; Grenzen werden geklemmt', () => {
  assert.deepEqual(einfuegen('Hallo Welt', 6, 6, 'schöne '), { wert: 'Hallo schöne Welt', marke: 13 });
  assert.deepEqual(einfuegen('Hallo Welt', 6, 10, 'Küche'), { wert: 'Hallo Küche', marke: 11 }, 'eine Auswahl wird ersetzt');
  assert.deepEqual(einfuegen('Hallo', null, null, '!'), { wert: 'Hallo!', marke: 6 }, 'ohne Marke ans Ende'); assert.deepEqual(einfuegen('Hallo', undefined, undefined, '!'), { wert: 'Hallo!', marke: 6 });
  assert.deepEqual(einfuegen('Hallo', 99, 99, '!'), { wert: 'Hallo!', marke: 6 }); assert.deepEqual(einfuegen('Hallo', -3, 2, 'A'), { wert: 'Allo', marke: 1 });
  assert.deepEqual(einfuegen('Hallo', 4, 1, 'e'), { wert: 'Heo', marke: 2 }, 'vertauschte Grenzen'); assert.deepEqual(einfuegen('Hallo', 2, undefined, 'x'), { wert: 'Haxllo', marke: 3 });
  assert.deepEqual(einfuegen('', 0, 0, 'x'), { wert: 'x', marke: 1 }); assert.deepEqual(einfuegen(null, 0, 0, null), { wert: '', marke: 0 });
});
test('Ein Stück einsetzen: Abstand davor und dahinter, Satzzeichen ohne Lücke, groß nach Satzende, Chinesisch ohne Leerzeichen', () => {
  assert.deepEqual(setzeEin('Hallo Welt', 6, 6, 'schöne', 'de'), { wert: 'Hallo schöne Welt', marke: 12, von: 6, bis: 13 });
  assert.equal(setzeEin('Hallo', 5, 5, 'du', 'de').wert, 'Hallo du'); assert.equal(setzeEin('Hallo ', 6, 6, 'du', 'de').wert, 'Hallo du', 'kein doppeltes Leerzeichen');
  assert.deepEqual(setzeEin('Hallo ', 6, 6, 'Komma wie geht es', 'de'), { wert: 'Hallo, wie geht es', marke: 18, von: 5, bis: 18 }, 'das Komma nimmt das Leerzeichen davor mit');
  assert.equal(setzeEin('Hallo.', 6, 6, 'wie geht es', 'de').wert, 'Hallo. Wie geht es'); assert.equal(setzeEin('', 0, 0, 'mehl sieben', 'de').wert, 'Mehl sieben');
  assert.equal(setzeEin('Mehl', 4, 4, 'neue Zeile zucker', 'de').wert, 'Mehl\nZucker'); assert.equal(setzeEin('Mehl\n', 5, 5, 'zucker', 'de').wert, 'Mehl\nZucker');
  assert.equal(setzeEin('Butter', 6, 6, 'Bindestrich Milch', 'de').wert, 'Butter-Milch'); assert.equal(setzeEin('(', 1, 1, 'kalt', 'de').wert, '(kalt');
  assert.equal(setzeEin('Hallo Welt', 0, 5, 'tschüss', 'de').wert, 'Tschüss Welt', 'eine Auswahl wird ersetzt');
  assert.equal(setzeEin('你好', 2, 2, '今天很好句号', 'zh').wert, '你好今天很好。');
  assert.equal(setzeEin('Mehl', 4, 4, 'Komma Punkt', 'de', { befehle: false }).wert, 'Mehl Komma Punkt'); assert.equal(setzeEin('Mehl.', 5, 5, 'dann', 'de', { gross: false }).wert, 'Mehl. dann');
  assert.equal(setzeEin('Mehl', 4, 4, 'neue Zeile Zucker', 'de', { zeilen: false }).wert, 'Mehl Zucker');
  assert.deepEqual(setzeEin('Hallo Welt', 5, 5, '   ', 'de'), { wert: 'Hallo Welt', marke: 5, von: 5, bis: 5 }, 'nichts gesprochen: nichts geändert');
});
test('Sprachcode: aus der App-Sprache wird BCP-47; ein voller Code bleibt; ohne Angabe die Geräte-Sprache, sonst Deutsch', () => {
  assert.equal(sprachCode('de'), 'de-DE'); assert.equal(sprachCode('en'), 'en-US'); assert.equal(sprachCode('pt'), 'pt-PT'); assert.equal(sprachCode('zh'), 'zh-CN'); assert.equal(sprachCode('RU'), 'ru-RU');
  assert.equal(sprachCode('de-DE'), 'de-DE'); assert.equal(sprachCode('de_at'), 'de-AT'); assert.equal(sprachCode('pt-BR'), 'pt-BR'); assert.equal(sprachCode('ja'), 'ja', 'außerhalb der Liste: bleibt');
  assert.equal(sprachCode('', { languages: ['fr-CA', 'en'] }), 'fr-FR'); assert.equal(sprachCode(null, { language: 'it' }), 'it-IT');
  assert.equal(sprachCode('', { languages: ['ja-JP'] }), 'de-DE', 'kennt die Liste die Geräte-Sprache nicht: der erste Eintrag'); assert.equal(sprachCode(undefined, {}), 'de-DE'); assert.equal(sprachCode('quatsch!', {}), 'de-DE');
  for (const [c] of SPRACHEN) assert.match(sprachCode(c), new RegExp('^' + c + '-[A-Z]{2}$'), 'Sprache der App: ' + c);
  assert.equal(SPRECH_SPRACHEN.length, 14); assert.equal(SPRECH_SPRACHEN[0][0], 'de-DE'); assert.equal(new Set(SPRECH_SPRACHEN.map(([c]) => c)).size, 14);
  assert.equal(sprechName('ar-SA'), 'العربية'); assert.equal(sprechName('ru'), 'Русский'); assert.equal(sprechName('xx-XX'), 'xx-XX');
  assert.ok(rechtsNachLinks('ar-SA') && rechtsNachLinks('fa') && rechtsNachLinks('ps-AF')); assert.ok(!rechtsNachLinks('de-DE') && !rechtsNachLinks('ru') && !rechtsNachLinks(''));
});
test('Fehler im Klartext: keine Erlaubnis, kein Mikrofon, kein Netz, Stille, Abbruch, Sprache; deutsch und englisch; wirft nie', () => {
  for (const f of [{ error: 'not-allowed' }, { error: 'service-not-allowed' }, { name: 'NotAllowedError' }, { message: 'Permission denied' }, 'not-allowed']) assert.equal(fehlerArt(f), 'erlaubnis');
  assert.equal(fehlerArt({ error: 'no-speech' }), 'stille'); assert.equal(fehlerArt({ error: 'audio-capture' }), 'mikrofon'); assert.equal(fehlerArt({ name: 'NotFoundError' }), 'mikrofon');
  assert.equal(fehlerArt({ error: 'aborted' }), 'abbruch'); assert.equal(fehlerArt({ name: 'AbortError' }), 'abbruch'); assert.equal(fehlerArt({ error: 'language-not-supported' }), 'sprache');
  assert.equal(fehlerArt({ error: 'network' }), 'netz'); assert.equal(fehlerArt(new TypeError('Failed to fetch')), 'netz');
  assert.equal(fehlerArt({ name: 'InvalidStateError', message: "Failed to execute 'start' on 'SpeechRecognition': recognition has already started." }), 'unbekannt', '„Failed“ allein ist kein Netzfehler');
  for (const f of [null, undefined, {}, 'irgendwas', { error: 'bad-grammar' }]) assert.equal(fehlerArt(f), 'unbekannt');
  assert.equal(fehlerText({ error: 'not-allowed' }), 'Mikrofon-Zugriff nicht erlaubt. Du kannst stattdessen tippen.'); assert.equal(fehlerText({ error: 'not-allowed' }, 'en'), 'Microphone access is not allowed. You can type instead.');
  assert.match(fehlerText({ error: 'audio-capture' }), /Kein Mikrofon gefunden/); assert.match(fehlerText({ error: 'network' }), /Netz nicht erreichbar/); assert.match(fehlerText({ error: 'no-speech' }), /Nichts erkannt/);
  assert.match(fehlerText({ error: 'aborted' }, 'de-DE'), /abgebrochen/); assert.match(fehlerText('fehlt', 'en'), /no speech recognition/); assert.equal(fehlerText(null, 'fr'), 'Voice input is not possible right now. You can type.', 'ohne Tabelle Englisch');
  for (const art of ['erlaubnis', 'stille', 'mikrofon', 'abbruch', 'netz', 'sprache', 'fehlt', 'unbekannt']) { assert.equal(fehlerArt(art), art); assert.ok(fehlerText(art, 'de').length > 10 && fehlerText(art, 'en').length > 10 && fehlerText(art, 'de') !== fehlerText(art, 'en'), art); }
});
test('Schrift-Kontrolle: der stille Fehlschlag (andere Sprache gehört, kein Fehler gemeldet) wird gesagt', () => {
  assert.match(schriftHinweis('Salaam', 'ps-AF'), /پښتو.*arabischer Schrift/); assert.match(schriftHinweis('Zdravstvuyte', 'ru', 'en'), /Русский.*Cyrillic script/); assert.match(schriftHinweis('ni hao ma', 'zh-CN'), /中文.*chinesischer/);
  assert.equal(schriftHinweis('سلام عليكم', 'ar-SA'), null); assert.equal(schriftHinweis('Здравствуйте', 'ru-RU'), null); assert.equal(schriftHinweis('今天很好', 'zh'), null);
  assert.equal(schriftHinweis('Sal', 'ps'), null, 'unter vier Zeichen kein Urteil'); assert.equal(schriftHinweis('Hallo Welt', 'de-DE'), null, 'lateinische Sprachen werden nicht geprüft'); assert.equal(schriftHinweis(null, 'ar'), null);
});

/* ---------- Ablauf mit nachgestellter Erkennung ---------- */
test('Ablauf: Zwischenergebnisse ersetzen sich, das Endergebnis bleibt; jede Änderung löst „input“ aus', () => {
  const n = nachgestellt(), f = feldMit(''), stand = [];
  const d = diktiere(f, { sprache: 'de', Erkennung: n.Erkennung, beiStand: (an) => stand.push(an) }), e = n.letzte();
  assert.equal(n.alle.length, 1); assert.equal(e.gestartet, 1); assert.equal(e.lang, 'de-DE'); assert.equal(e.interimResults, true); assert.equal(e.continuous, true);
  assert.deepEqual(stand, [true], 'hört zu'); assert.ok(d.laeuft() && diktatLaeuft() && diktatLaeuft(f) && !diktatLaeuft(feldMit('')));
  e.ergebnis(['mehl', false]); assert.equal(f.value, 'Mehl');
  e.ergebnis(['mehl sieben', false]); assert.equal(f.value, 'Mehl sieben', 'ersetzt, nicht angehängt');
  e.ergebnis(['Mehl sieben Komma', true]); assert.equal(f.value, 'Mehl sieben,');
  e.ergebnis(['Mehl sieben Komma', true], [' eier', false]); assert.equal(f.value, 'Mehl sieben, eier', 'das Endergebnis steht nicht doppelt da');
  e.ergebnis(['Mehl sieben Komma', true], [' Eier trennen Punkt', true]); assert.equal(f.value, 'Mehl sieben, Eier trennen.');
  e.ergebnis(['Mehl sieben Komma', true], [' Eier trennen Punkt', true]); assert.equal(f.value, 'Mehl sieben, Eier trennen.', 'dieselbe Liste noch einmal ändert nichts');
  assert.equal(f.selectionStart, f.value.length, 'die Schreibmarke steht hinter dem Text'); assert.deepEqual(f.ereignisse, ['input', 'input', 'input', 'input', 'input']);
  d.abbrechen();
});
test('Ablauf: geschrieben wird an der Schreibmarke, eine Auswahl wird ersetzt, ein nie angefasstes Feld bekommt den Text ans Ende', () => {
  const n = nachgestellt(), mitte = feldMit('Hallo Welt', 6);
  diktiere(mitte, { Erkennung: n.Erkennung }); let e = n.letzte();
  e.ergebnis(['schöne', false]); assert.equal(mitte.value, 'Hallo schöne Welt');
  e.ergebnis(['schöne neue', true]); assert.equal(mitte.value, 'Hallo schöne neue Welt'); assert.equal(mitte.selectionStart, 17);
  e.ergebnis(['schöne neue', true], ['große', true]); assert.equal(mitte.value, 'Hallo schöne neue große Welt', 'das nächste Stück schließt an der Marke an');

  const wahl = feldMit('Hallo Welt', 6, 10); diktiere(wahl, { Erkennung: n.Erkennung }); n.letzte().ergebnis(['Küche', true]); assert.equal(wahl.value, 'Hallo Küche');
  const nie = feldMit('200 g Mehl', 0, 0); diktiere(nie, { Erkennung: n.Erkennung }); assert.equal(nie.selectionStart, 10, 'die Marke springt ans Ende'); n.letzte().ergebnis(['neue Zeile 3 Eier', true]); assert.equal(nie.value, '200 g Mehl\n3 Eier');
  const vorn = feldMit('Welt', 0, 0); vorn.ownerDocument = { activeElement: vorn }; diktiere(vorn, { Erkennung: n.Erkennung }); n.letzte().ergebnis(['hallo', true]); assert.equal(vorn.value, 'Hallo Welt', 'hat das Feld den Fokus, gilt die Marke am Anfang');
  const ende = feldMit('Hallo Welt', 3); diktiere(ende, { Erkennung: n.Erkennung, wo: 'ende' }); n.letzte().ergebnis(['und du', true]); assert.equal(ende.value, 'Hallo Welt und du');
  diktatAus();
});
test('Ablauf: Felder ohne Schreibmarke, einzeilige Felder, volle Felder (die Ansicht folgt am Ende)', () => {
  const n = nachgestellt(), ohne = { tagName: 'INPUT', value: 'a', ereignisse: [], dispatchEvent(e) { this.ereignisse.push(e.type); return true; } };
  diktiere(ohne, { Erkennung: n.Erkennung }); let e = n.letzte(); e.ergebnis(['b', true]); e.ergebnis(['b', true], ['c', true]); assert.equal(ohne.value, 'a b c', 'ohne Marke hinter dem zuletzt Geschriebenen');
  const taub = feldMit('', 0, 0, { setSelectionRange() {} }); diktiere(taub, { Erkennung: n.Erkennung }); e = n.letzte(); e.ergebnis(['eins', true]); e.ergebnis(['eins', true], ['zwei', true]); assert.equal(taub.value, 'Eins zwei', 'nimmt das Feld die Marke nicht an, zählt die eigene');
  const zeile = feldMit('', 0, 0, { tagName: 'INPUT' }); diktiere(zeile, { Erkennung: n.Erkennung }); n.letzte().ergebnis(['Milch neue Zeile Eier Komma Mehl', true]); assert.equal(zeile.value, 'Milch Eier, Mehl', 'ein <input> hat keine Zeilen');
  const voll = feldMit('Zeile 1\nZeile 2', 15, 15, { scrollTop: 0, scrollHeight: 400 }); diktiere(voll, { Erkennung: n.Erkennung }); n.letzte().ergebnis(['neue Zeile unten', true]); assert.equal(voll.scrollTop, 400, 'wächst der Text am Ende, folgt die Ansicht');
  const oben = feldMit('Zeile 1\nZeile 2', 7, 7, { scrollTop: 60, scrollHeight: 400 }); diktiere(oben, { Erkennung: n.Erkennung }); n.letzte().ergebnis(['mitten hinein', true]); assert.equal(oben.scrollTop, 60, 'mitten im Text bleibt die Ansicht stehen'); assert.equal(oben.value, 'Zeile 1 mitten hinein\nZeile 2');
  const schmal = feldMit('', 0, 0, { tagName: 'INPUT', scrollLeft: 0, scrollWidth: 900, scrollTop: 0, scrollHeight: 30 }); diktiere(schmal, { Erkennung: n.Erkennung }); n.letzte().ergebnis(['ein langer Satz', true]); assert.equal(schmal.scrollLeft, 900); assert.equal(schmal.scrollTop, 0);
  const roh = feldMit(''); diktiere(roh, { Erkennung: n.Erkennung, befehle: false, gross: false, zwischen: false }); e = n.letzte(); assert.equal(e.interimResults, false); e.ergebnis(['mehl Komma zucker', true]); assert.equal(roh.value, 'mehl Komma zucker');
  diktatAus();
});
test('Fehler „not-allowed“ → Klartext, hört nicht mehr zu, kein Wiederanlauf; ebenso ohne Netz, ohne Mikrofon und wenn start() wirft', () => {
  for (const [code, art, satz] of [['not-allowed', 'erlaubnis', 'Mikrofon-Zugriff nicht erlaubt. Du kannst stattdessen tippen.'], ['network', 'netz', 'Netz nicht erreichbar. Spracheingabe gerade nicht möglich, bitte tippen.'], ['audio-capture', 'mikrofon', 'Kein Mikrofon gefunden. Du kannst stattdessen tippen.'], ['aborted', 'abbruch', 'Spracheingabe abgebrochen.']]) {
    const n = nachgestellt(), stand = [], fehler = [];
    const d = diktiere(feldMit(''), { Erkennung: n.Erkennung, beiStand: (an) => stand.push(an), beiFehler: (s, a) => fehler.push([s, a]) }), e = n.letzte();
    e.fehler(code); e.ende();
    assert.deepEqual(fehler, [[satz, art]], code); assert.deepEqual(stand, [true, false], code); assert.equal(n.alle.length, 1, code + ': kein Wiederanlauf'); assert.ok(!d.laeuft() && !diktatLaeuft());
  }
  const n = nachgestellt(), fehler = [];
  diktiere(feldMit(''), { sprache: 'en', Erkennung: n.Erkennung, beiFehler: (s) => fehler.push(s) }); n.letzte().fehler('not-allowed');
  diktiere(feldMit(''), { sprache: 'it', meldungen: 'de', Erkennung: n.Erkennung, beiFehler: (s) => fehler.push(s) }); assert.equal(n.letzte().lang, 'it-IT'); n.letzte().fehler('not-allowed');
  assert.deepEqual(fehler, ['Microphone access is not allowed. You can type instead.', 'Mikrofon-Zugriff nicht erlaubt. Du kannst stattdessen tippen.'], 'Sprache der Meldung: wie das Diktat, oder eigens gewählt');
  const w = nachgestellt({ startWirft: Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }) }), stand = [], arten = [];
  const d = diktiere(feldMit(''), { Erkennung: w.Erkennung, beiStand: (an) => stand.push(an), beiFehler: (s, a) => arten.push(a) });
  assert.deepEqual(arten, ['erlaubnis']); assert.deepEqual(stand, [true, false]); assert.equal(d.laeuft(), false);
});
test('stopp() beendet: die Erkennung hält an, das letzte Ergebnis kommt noch an, danach nichts mehr und kein Wiederanlauf', () => {
  const n = nachgestellt(), f = feldMit(''), stand = [];
  const d = diktiere(f, { Erkennung: n.Erkennung, beiStand: (an) => stand.push(an) }), e = n.letzte();
  e.ergebnis(['eier trennen', false]); d.stopp();
  assert.equal(e.gestoppt, 1); assert.equal(e.abgebrochen, 0); assert.deepEqual(stand, [true, false]); assert.ok(!d.laeuft() && !diktatLaeuft(f));
  e.ergebnis(['Eier trennen Punkt', true]); assert.equal(f.value, 'Eier trennen.', 'das letzte Ergebnis kommt noch an');
  e.fehler('aborted'); e.ende(); assert.equal(n.alle.length, 1, 'kein Wiederanlauf nach stopp()');
  e.ergebnis(['Eier trennen Punkt', true], ['zu spät', true]); assert.equal(f.value, 'Eier trennen.', 'nach dem Ende schreibt der Lauf nicht mehr');
  d.stopp(); d.abbrechen(); assert.equal(e.gestoppt, 1); assert.deepEqual(stand, [true, false], 'nur einmal gemeldet');

  const g = feldMit(''), hart = diktiere(g, { Erkennung: n.Erkennung }), e2 = n.letzte();
  e2.ergebnis(['halb', false]); hart.abbrechen(); assert.equal(e2.abgebrochen, 1); e2.ergebnis(['halb fertig', true]); e2.ende();
  assert.equal(g.value, 'Halb', 'abbrechen() nimmt nichts mehr an; was dasteht, bleibt'); assert.equal(n.alle.length, 2);
});
test('Dauer-Diktat: Wiederanlauf nach onend mit neuer Erkennung, der Text schließt an; nach stopp() kein Wiederanlauf', () => {
  const n = nachgestellt(), f = feldMit(''), stand = [], fehler = [];
  const d = diktiere(f, { sprache: 'de', Erkennung: n.Erkennung, beiStand: (an) => stand.push(an), beiFehler: (s, a) => fehler.push(a) }), e1 = n.letzte();
  e1.ergebnis(['Mehl sieben Punkt', true]); e1.ende();
  const e2 = n.letzte(); assert.equal(n.alle.length, 2, 'ein neuer Lauf'); assert.notEqual(e2, e1); assert.equal(e2.gestartet, 1); assert.equal(e2.lang, 'de-DE'); assert.deepEqual(stand, [true], 'bleibt an, kein Flackern');
  e2.ergebnis(['eier trennen', true]); assert.equal(f.value, 'Mehl sieben. Eier trennen');
  e1.ergebnis(['Mehl sieben Punkt', true], ['Nachzügler', true]); assert.equal(f.value, 'Mehl sieben. Eier trennen', 'ein alter Lauf schreibt nicht mehr');
  e2.fehler('no-speech'); e2.ende(); assert.equal(n.alle.length, 3, 'Schweigen ist im Dauer-Diktat kein Fehler'); assert.deepEqual(fehler, []);
  n.letzte().ergebnis(['und rühren', false]); n.letzte().ende(); assert.equal(f.value, 'Mehl sieben. Eier trennen und rühren', 'ein offenes Zwischenergebnis bleibt als Text stehen'); assert.equal(n.alle.length, 4);
  n.letzte().ergebnis(['Punkt', true]); assert.equal(f.value, 'Mehl sieben. Eier trennen und rühren.');
  d.stopp(); n.letzte().ende(); assert.equal(n.alle.length, 4, 'nach stopp() kein Wiederanlauf'); assert.deepEqual(stand, [true, false]);
});
test('Dauer-Diktat: nach mehreren Läufen ohne ein Wort geht das Mikrofon von selbst aus; ein Wort zählt wieder von vorn', () => {
  const n = nachgestellt(), stand = [], fehler = [];
  diktiere(feldMit(''), { Erkennung: n.Erkennung, stilleRunden: 3, beiStand: (an) => stand.push(an), beiFehler: (s, a) => fehler.push([s, a]) });
  n.letzte().ende(); n.letzte().ende(); assert.equal(n.alle.length, 3); assert.deepEqual(stand, [true]);
  n.letzte().ergebnis(['doch noch', true]); n.letzte().ende(); assert.equal(n.alle.length, 4, 'ein Wort setzt die Zählung zurück');
  n.letzte().ende(); n.letzte().ende(); assert.equal(n.alle.length, 6); assert.deepEqual(stand, [true]);
  n.letzte().fehler('no-speech'); n.letzte().ende(); assert.equal(n.alle.length, 6, 'dritter Lauf ohne Wort: Schluss');
  assert.deepEqual(stand, [true, false]); assert.deepEqual(fehler, [['Nichts erkannt. Bitte noch einmal sprechen oder tippen.', 'stille']]);
  const vorgabe = nachgestellt(); diktiere(feldMit(''), { Erkennung: vorgabe.Erkennung }); for (let i = 0; i < 20; i++) vorgabe.letzte().ende(); assert.equal(vorgabe.alle.length, 6, 'ohne Angabe sechs Läufe');
});
test('Ein Satz statt Dauer (dauer: false, Vorgabe im einzeiligen Feld): kein Wiederanlauf; Stille wird gesagt', () => {
  const n = nachgestellt(), f = feldMit(''), stand = [], fehler = [];
  diktiere(f, { Erkennung: n.Erkennung, dauer: false, beiStand: (an) => stand.push(an), beiFehler: (s, a) => fehler.push(a) }); const e = n.letzte();
  assert.equal(e.continuous, false); e.ergebnis(['kartoffelsuppe', true]); e.ende();
  assert.equal(f.value, 'Kartoffelsuppe'); assert.equal(n.alle.length, 1); assert.deepEqual(stand, [true, false]); assert.deepEqual(fehler, []);
  diktiere(feldMit(''), { Erkennung: n.Erkennung, dauer: false, beiFehler: (s, a) => fehler.push(a) }); n.letzte().fehler('no-speech'); n.letzte().ende(); assert.deepEqual(fehler, ['stille']); assert.equal(n.alle.length, 2);
  const m = nachgestellt(), such = feldMit('', 0, 0, { tagName: 'INPUT' }), st = [];
  diktiere(such, { Erkennung: m.Erkennung, beiStand: (an) => st.push(an) }); assert.equal(m.letzte().continuous, false, 'ein <input> bekommt ohne Angabe einen Satz');
  m.letzte().ergebnis(['kartoffelsuppe', true]); m.letzte().ende(); assert.equal(such.value, 'Kartoffelsuppe'); assert.equal(m.alle.length, 1); assert.deepEqual(st, [true, false]);
  diktiere(such, { Erkennung: m.Erkennung, dauer: true }); assert.equal(m.letzte().continuous, true); m.letzte().ende(); assert.equal(m.alle.length, 3, 'mit dauer: true läuft es auch dort weiter'); diktatAus();
});
test('Android: Läufe nicht durchgehend (der Wiederanlauf trägt); „fertig“ mit Sicherheit 0 ist dort ein Zwischenergebnis', () => {
  const n = nachgestellt(), f = feldMit('');
  diktiere(f, { Erkennung: n.Erkennung, android: true }); const e = n.letzte(); assert.equal(e.continuous, false);
  e.ergebnis(['hallo', true, 0]); assert.equal(f.value, 'Hallo'); e.ergebnis(['hallo welt', true, 0]); assert.equal(f.value, 'Hallo welt', 'ersetzt, nicht „Hallo Hallo welt“');
  e.ergebnis(['Hallo Welt', true, 0.8]); assert.equal(f.value, 'Hallo Welt'); e.ende(); assert.equal(n.alle.length, 2, 'Wiederanlauf');
  n.letzte().ergebnis(['wie geht es', true, 0.7]); assert.equal(f.value, 'Hallo Welt wie geht es');
  const g = feldMit(''); diktiere(g, { Erkennung: n.Erkennung, android: false }); const e2 = n.letzte(); assert.equal(e2.continuous, true);
  e2.ergebnis(['eins', true, 0]); e2.ergebnis(['eins', true, 0], ['zwei', true, 0]); assert.equal(g.value, 'Eins zwei', 'sonst gilt „fertig“ als fertig');
  diktiere(feldMit(''), { Erkennung: n.Erkennung, durchgehend: false }); assert.equal(n.letzte().continuous, false);
  diktiere(feldMit(''), { Erkennung: n.Erkennung, android: true, durchgehend: true }); assert.equal(n.letzte().continuous, true, 'die ausdrückliche Wahl gilt');
  diktatAus();
});
test('Tippt jemand dazwischen, geht es an der neuen Schreibmarke weiter; steht das Feld nicht mehr auf der Seite, endet das Diktat', () => {
  const n = nachgestellt(), f = feldMit(''), stand = [];
  diktiere(f, { Erkennung: n.Erkennung, beiStand: (an) => stand.push(an) }); const e = n.letzte();
  e.ergebnis(['Mehl sieben', true]); f.value = 'Zuerst: Mehl sieben'; f.setSelectionRange(8, 8);
  e.ergebnis(['Mehl sieben', true], ['gut', true]); assert.equal(f.value, 'Zuerst: gut Mehl sieben');
  e.ergebnis(['Mehl sieben', true], ['gut', true], ['und', false]); assert.equal(f.value, 'Zuerst: gut und Mehl sieben');
  f.value = 'Neu'; f.setSelectionRange(3, 3);   /* das offene Stück ist überschrieben */
  e.ergebnis(['Mehl sieben', true], ['gut', true], ['und dann', true]); assert.equal(f.value, 'Neu und dann', 'das überschriebene Stück wird nicht gesucht, es geht an der Marke weiter');
  f.isConnected = false; e.ergebnis(['Mehl sieben', true], ['gut', true], ['und dann', true], ['ins Leere', true]);
  assert.equal(f.value, 'Neu und dann'); assert.deepEqual(stand, [true, false]); assert.equal(e.abgebrochen, 1); e.ende(); assert.equal(n.alle.length, 1);
  const g = feldMit(''); diktiere(g, { Erkennung: n.Erkennung }); g.isConnected = false; n.letzte().ende(); assert.equal(n.alle.length, 2, 'auch der Wiederanlauf fragt, ob das Feld noch da ist'); assert.equal(diktatLaeuft(), false);
});
test('Auswahl im Feld bleibt stehen, solange nichts zu schreiben ist; leeres Zwischenergebnis nimmt das offene Stück zurück', () => {
  const n = nachgestellt(), f = feldMit('Hallo Welt', 0, 5, { tagName: 'INPUT' });
  diktiere(f, { Erkennung: n.Erkennung }); const e = n.letzte();
  e.ergebnis(['neue Zeile', false]); assert.equal(f.value, 'Hallo Welt', 'im einzeiligen Feld ergibt der Befehl nichts: die Auswahl bleibt');
  e.ergebnis(['tschüss', false]); assert.equal(f.value, 'Tschüss Welt'); e.ergebnis(['', false]); assert.equal(f.value, ' Welt', 'das Zwischenergebnis ist zurückgenommen');
  diktatAus();
});
test('Nur ein Diktat zur selben Zeit; rechts-nach-links-Sprachen bekommen dir="auto"; der Schrift-Hinweis kommt einmal', () => {
  const n = nachgestellt(), sa = [], hinweise = [];
  const a = diktiere(feldMit(''), { Erkennung: n.Erkennung, beiStand: (an) => sa.push(an) }), ea = n.letzte();
  const attr = {}, rtl = feldMit('', 0, 0, { getAttribute: (k) => attr[k] ?? null, setAttribute: (k, v) => { attr[k] = v; } });
  diktiere(rtl, { sprache: 'ps-AF', meldungen: 'de', Erkennung: n.Erkennung, beiFehler: (s, art) => hinweise.push([art, s]) }); const eb = n.letzte();
  assert.ok(!a.laeuft()); assert.deepEqual(sa, [true, false]); assert.equal(ea.abgebrochen, 1, 'das erste Diktat ist abgebrochen'); assert.equal(eb.lang, 'ps-AF'); assert.equal(attr.dir, 'auto');
  eb.ergebnis(['Salaam aleikum', true]); eb.ergebnis(['Salaam aleikum', true], ['tsenga yee', true]);
  assert.equal(hinweise.length, 1, 'einmal je Diktat'); assert.equal(hinweise[0][0], 'schrift'); assert.match(hinweise[0][1], /پښتو/); assert.equal(rtl.value, 'Salaam aleikum tsenga yee', 'der Text bleibt stehen');
  const fest = { dir: 'ltr' }; diktiere(feldMit('', 0, 0, { getAttribute: (k) => fest[k] ?? null, setAttribute: (k, v) => { fest[k] = v; } }), { sprache: 'ar', Erkennung: n.Erkennung }); assert.equal(fest.dir, 'ltr', 'eine gesetzte Richtung bleibt');
  const lat = {}; diktiere(feldMit('', 0, 0, { getAttribute: (k) => lat[k] ?? null, setAttribute: (k, v) => { lat[k] = v; } }), { sprache: 'de', Erkennung: n.Erkennung }); assert.equal(lat.dir, undefined);
  diktatAus();
});
test('Ohne Erkennung und mit werfenden Rückrufen: nie ein Wurf, das Feld bleibt nutzbar', () => {
  const fehler = [], f = feldMit('bleibt');
  const d = diktiere(f, { Erkennung: null, beiFehler: (s, a) => fehler.push([s, a]) });
  assert.deepEqual(fehler, [['Die Spracherkennung gibt es in diesem Browser nicht. Bitte tippen.', 'fehlt']]); assert.equal(d.laeuft(), false); d.stopp(); d.abbrechen(); assert.equal(f.value, 'bleibt');
  assert.equal(diktiere(null, { Erkennung: nachgestellt().Erkennung }).laeuft(), false); assert.equal(diktiere(f).laeuft(), false, 'in Node gibt es keine Erkennung');
  const n = nachgestellt(), g = feldMit('');
  const w = diktiere(g, { Erkennung: n.Erkennung, beiStand: () => { throw new Error('Rückruf kaputt'); }, beiFehler: () => { throw new Error('Rückruf kaputt'); } });
  n.letzte().ergebnis(['geht trotzdem', true]); assert.equal(g.value, 'Geht trotzdem'); n.letzte().fehler('network'); assert.equal(w.laeuft(), false);
  class Kaputt { constructor() { throw new Error('kein Bau'); } }
  const arten = []; assert.equal(diktiere(feldMit(''), { Erkennung: Kaputt, beiFehler: (s, a) => arten.push(a) }).laeuft(), false); assert.deepEqual(arten, ['unbekannt']);
});
test('Bisherige Aufrufe der App: diktatMoeglich(), diktat(feld, sprache, stand) als Umschalter, diktatAus()', () => {
  const n = nachgestellt(), a = feldMit(''), b = feldMit(''), sa = [], sb = [];
  assert.equal(diktatMoeglich(), false, 'in Node gibt es keine Erkennung'); assert.equal(diktatMoeglich(null), false); assert.equal(diktatMoeglich(n.Erkennung), true);
  assert.equal(diktat(a, 'de-DE', (an) => sa.push(an), { Erkennung: null }), null); assert.deepEqual(sa, [], 'ohne Erkennung still, wie bisher');
  globalThis.webkitSpeechRecognition = n.Erkennung;
  try {
    assert.equal(diktatMoeglich(), true);
    diktat(a, 'de-DE', (an) => sa.push(an)); const e1 = n.letzte();   /* genau so ruft die App heute */
    assert.deepEqual(sa, [true]); assert.equal(e1.lang, 'de-DE'); assert.equal(e1.interimResults, true); assert.equal(e1.gestartet, 1);
    e1.ergebnis(['mehl', false]); e1.ergebnis(['Mehl und Zucker', true]); assert.equal(a.value, 'Mehl und Zucker'); assert.ok(a.ereignisse.length >= 2);
    diktat(a, 'de-DE', (an) => sa.push(an)); assert.deepEqual(sa, [true, false], 'zweiter Tipp im selben Feld: aus'); assert.equal(e1.gestoppt, 1); assert.equal(n.alle.length, 1);
    diktat(a, 'de-DE', (an) => sa.push(an)); assert.equal(n.alle.length, 2, 'dritter Tipp: wieder an'); assert.deepEqual(sa, [true, false, true]);
    n.letzte().ergebnis(['Komma dazu Eier', true]); assert.equal(a.value, 'Mehl und Zucker, dazu Eier', 'schließt hinter dem Vorhandenen an');
    diktat(b, 'de-DE', (an) => sb.push(an)); assert.deepEqual(sa, [true, false, true, false], 'anderes Feld: das erste hört auf'); assert.deepEqual(sb, [true]); assert.equal(n.alle.length, 3); assert.ok(diktatLaeuft(b) && !diktatLaeuft(a));
    diktatAus(); assert.deepEqual(sb, [true, false]); assert.equal(n.letzte().gestoppt, 1); diktatAus(); assert.deepEqual(sb, [true, false]); assert.equal(diktatLaeuft(), false);
  } finally { delete globalThis.webkitSpeechRecognition; n.letzte().ende(); }
  globalThis.SpeechRecognition = n.Erkennung;
  try { assert.equal(diktatMoeglich(), true); const d = diktiere(feldMit('')); assert.ok(d.laeuft(), 'ohne Angabe die Erkennung des Browsers'); d.abbrechen(); } finally { delete globalThis.SpeechRecognition; }
  assert.equal(diktat(null, 'de-DE'), null); assert.equal(diktatMoeglich(), false);
});
