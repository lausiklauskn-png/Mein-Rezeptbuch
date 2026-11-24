// Mein Rezeptbuch · Food-Zine: drei Magazin-Seiten zu einem Rezept (Kern: ausgabe/zine.mjs).
// Fenster am Rezept („Mehr“ → Food-Zine): je Seite den Auftrag kopieren (ohne Schlüssel), ein fertiges Bild einsetzen oder die Seite mit
// dem eigenen OpenAI-Schlüssel erzeugen. Der Stil gilt für alle drei Aufträge. Die Seiten liegen am Rezept (r.zine) und damit in Sicherung
// und Tresor. Galerie: Filter „Food-Zine“ im Bilder-Ordner. Beispiel-Sätze kommen aus dem Paket „foodzine-beispiele“.
// Die Hauptdatei (app.mjs) reicht ihre Werkzeuge herein und ruft die Stücke an wenigen, benannten Stellen (wie bei zusatz.mjs).
import { zineAuftraege, zineLiest, zineSeiten, zineAnzahl, setzeSeite, entferneSeite, seitenName, ZINE_STILE, zineStil, stilName, ZINE_SEITEN, ZINE_GROESSE, ZINE_KOSTEN, ZINE_FOTO_HINWEIS, pruefeZineAuftrag, zineGalerie, zineSaetzeEinlesen } from '../kern/ausgabe/zine.mjs';
import { kiBild } from '../kern/ki/bild.mjs';
import { kiAnweisungen } from '../kern/pruefung/datei.mjs';
import { fuelle, text as spText } from '../kern/oberflaeche/sprache.mjs';
import { bytesMitAnteil } from '../kern/oberflaeche/warten.mjs';

/** app: { L, spr, esc, ic, A, s, SK, W, Z(), setzeZ(z), E(), fenster, fensterZu, melde, sichern, zeichne, rezept(uid), zeig(r), schluesselFenster(a, danach),
 *         bildAusDatei(blob), fehlerText(f, sonst), wahl(titel, html, a, b), stellenHtml(stellen), tresorAuto(), katalog(), ausgabe() } */
export function zine(app) {
  const { L, spr, esc, ic, A, s, SK, W, fenster, fensterZu, melde, sichern, zeichne } = app;
  const WASSER = ['#e0695a', '#d39a2e', '#48a878'];   /* Wasserfarben der drei Platzfelder */
  const TRENNER = '#z';                               /* Kennung einer Seite in der Galerie: uid + '#z' + Nummer */
  let offen = null, ziel = -1, warte = -1;            /* Rezept des Fensters · Seite, für die eine Datei gewählt wird · Seite, die auf den Schlüssel wartet */
  const $ = (id) => document.getElementById(id);
  const stil = () => zineStil(app.E().zineStil);
  const kosten = () => spText(spr(), ZINE_KOSTEN.de, ZINE_KOSTEN.en);
  /* Was an wen geht und was es kostet: steht im Hinweis des Knopfs und noch einmal sichtbar vor dem Senden. Je Seite genau das, was ihr Auftrag liest. */
  const hinaus = (i) => ['OpenAI', zineLiest(i, spr()), kosten()].join(' · ');
  const auftrag = (r, i) => zineAuftraege(app.zeig(r), { stil: stil(), sprache: spr() })[i];   /* aus dem Text, der dasteht (auch eine Übersetzung) */
  /** Ändert ein Rezept und gibt zurück, was „Rückgängig“ tut. */
  const aendere = (uid, f) => { const vorher = app.Z().rezepte; app.setzeZ({ ...app.Z(), rezepte: vorher.map((x) => (x.uid === uid ? f(x) : x)) }); sichern(); return () => { app.setzeZ({ ...app.Z(), rezepte: vorher }); sichern(); frisch(); }; };
  const frisch = () => { zeichne(); if ($('zine')) zineFenster(offen); };

  /* ── Das Fenster: Stil als Chips, darunter die drei Seiten. Kein Erklärtext; jeder Knopf sagt im Hinweis, was er tut. ── */
  const rund = (a, i, sym, titel, kl = '') => `<button class="rund ${kl}" data-a="${a}" data-i="${i}" aria-label="${esc(titel)}" title="${esc(titel)}">${ic(sym)}</button>`;
  function seiteHtml(r, bild, i) {
    const n = seitenName(i, spr());
    return `<div class="zine-seite" data-i="${i}">${bild ? `<button class="zine-blatt" data-a="zine-gross" data-i="${i}" aria-label="${esc(fuelle(L('{0} groß ansehen', 'View {0} large'), n))}"><img src="${esc(bild)}" alt="${esc(n)}"></button>` : `<span class="zine-blatt leer" style="--kc:${WASSER[i % WASSER.length]}">${ic('zine')}</span>`}
     <div class="zine-rand"><b>${esc(n)}</b><div class="reihe zine-werk">${rund('zine-kopieren', i, 'kopieren', L('Auftrag kopieren', 'Copy request'))}${r.img ? rund('zine-beides', i, 'bild', L('Auftrag und Rezeptfoto kopieren', 'Copy request and recipe photo')) : ''}${rund('zine-einsetzen', i, 'kamera', bild ? L('Bild ersetzen', 'Replace picture') : L('Bild einsetzen', 'Insert picture'))}${rund('zine-erzeugen', i, 'funken', L('Erzeugen', 'Create') + ': ' + hinaus(i))}${bild ? rund('zine-weg', i, 'muell', L('Seite entfernen', 'Remove page'), 'rot') : ''}</div></div></div>`;
  }
  function zineFenster(uid) {
    const r = app.rezept(uid); if (!r) return;
    const st = stil();
    fenster(`<h2 class="imp-kopf">${ic('zine')}<span>${esc(app.zeig(r).name)}</span></h2>
     <div class="laeden" id="zine-stile" role="radiogroup" aria-label="${esc(L('Stil', 'Style'))}">${Object.keys(ZINE_STILE).map((id) => `<button class="chip" role="radio" aria-checked="${id === st}" data-a="zine-stil" data-stil="${esc(id)}">${esc(stilName(id, spr()))}</button>`).join('')}</div>
     <div class="zine-seiten" id="zine">${zineSeiten(r).map((bild, i) => seiteHtml(r, bild, i)).join('')}</div><input type="file" id="zine-datei" accept="image/*" hidden>
     <div class="reihe"><button class="knopf" data-a="fenster-zu">${L('Schließen', 'Close')}</button></div>`);
    offen = uid;
    if (r.img) pngVon(r.img).catch(() => {});   /* das Rezeptfoto für die Zwischenablage schon jetzt umrechnen: beim Tipp muss es fertig sein */
  }
  A.zine = () => zineFenster(s.uid);   /* aus dem Menü am Rezept und aus dem Bild-Blatt: beide gehören zum offenen Rezept */
  A['zine-auf'] = () => zineFenster(offen);
  A['zine-stil'] = (e) => { app.E().zineStil = zineStil(e.dataset.stil); sichern(); zineFenster(offen); };
  A['zine-gross'] = (e) => { const r = app.rezept(offen), i = +e.dataset.i, bild = r && zineSeiten(r)[i]; if (!bild) return; const n = app.zeig(r).name + ' · ' + seitenName(i, spr());
    $('fensterort').innerHTML = `<div class="vollbild" data-a="zine-auf" role="dialog" aria-modal="true" aria-label="${esc(n)}"><img src="${esc(bild)}" alt="${esc(n)}"><button class="voll-x" data-a="zine-auf" aria-label="${esc(L('Schließen', 'Close'))}">${ic('x')}</button><p>${esc(n)}</p></div>`; };

  /* ── Kopieren: der Auftrag der Seite, auf Wunsch mit dem Rezeptfoto als Vorlage im selben Eintrag der Zwischenablage. ── */
  /* Die Zwischenablage nimmt verlässlich nur PNG; jedes Bild geht deshalb über die Leinwand. Gemerkt wird nur das letzte. */
  const pngLager = { von: '', png: null };
  const pngVon = (src) => { if (pngLager.von !== src) { pngLager.von = src; pngLager.png = alsPng(src); } return pngLager.png; };
  async function alsPng(src) {
    const bmp = await createImageBitmap(await (await fetch(src)).blob()), f = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
    return new Promise((ja, nein) => c.toBlob((b) => (b ? ja(b) : nein(new Error('png'))), 'image/png'));
  }
  async function kopiere(i, mitFoto) {
    const r = app.rezept(offen); if (!r) return; const t = auftrag(r, i);
    if (mitFoto && r.img && navigator.clipboard?.write && globalThis.ClipboardItem) {
      try { const png = await pngVon(r.img); await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([t + '\n\n' + ZINE_FOTO_HINWEIS], { type: 'text/plain' }), 'image/png': png })]); melde(L('Auftrag und Foto kopiert', 'Request and photo copied')); return; } catch { /* dieser Browser nimmt kein Bild: dann nur der Auftrag, und das wird gesagt */ }
    }
    try { await navigator.clipboard.writeText(t); melde(mitFoto ? L('Nur der Auftrag kopiert – dieser Browser nimmt kein Bild', 'Only the request copied – this browser takes no picture') : L('Auftrag kopiert', 'Request copied')); }
    catch { melde(L('Kopieren ging nicht', 'Copying failed')); }
  }
  A['zine-kopieren'] = (e) => kopiere(+e.dataset.i, false);
  A['zine-beides'] = (e) => kopiere(+e.dataset.i, true);

  /* ── Bild einsetzen: eine Datei wählen; sie wird verkleinert wie jedes andere Bild (ohne Aufnahmedaten). ── */
  A['zine-einsetzen'] = (e) => { ziel = +e.dataset.i; $('zine-datei')?.click(); };
  document.addEventListener('change', async (ev) => {
    if (ev.target.id !== 'zine-datei') return;
    const d = ev.target.files[0], i = ziel, uid = offen; ev.target.value = ''; ziel = -1; if (!d || !(i >= 0) || !app.rezept(uid)) return;
    try {
      const bild = await W.mit(L('Foto wird aufbereitet …', 'Preparing the photo …'), () => app.bildAusDatei(d)), hatte = !!zineSeiten(app.rezept(uid))[i];
      const zurueck = aendere(uid, (x) => setzeSeite(x, i, bild)); frisch();
      melde(hatte ? L('Seite ersetzt', 'Page replaced') : L('Seite eingesetzt', 'Page inserted'), L('Rückgängig', 'Undo'), zurueck);
    } catch { melde(L('Das Bild konnte nicht gelesen werden.', 'The picture could not be read.')); }
  });
  A['zine-weg'] = (e) => { const i = +e.dataset.i, zurueck = aendere(offen, (x) => entferneSeite(x, i)); frisch(); melde(L('Seite entfernt', 'Page removed'), L('Rückgängig', 'Undo'), zurueck); };

  /* ── Erzeugen mit dem eigenen OpenAI-Schlüssel. Ohne Schlüssel erst das Schlüssel-Fenster, danach geht es hier weiter.
        Vor dem Senden steht in einer Zeile, was an wen geht und was es kostet (ein Tipp kostet Geld; ein Hinweis allein ist am Handy zu wenig).
        Steht im Auftrag ein Befehl an eine KI, wird die Stelle gezeigt und entschieden. ── */
  A['zine-erzeugen'] = (e) => {
    const i = +e.dataset.i; if (!app.rezept(offen) || !(i >= 0 && i < ZINE_SEITEN)) return;
    if (!SK.openai) { warte = i; app.schluesselFenster('openai', 'zine-weiter'); return; }
    fenster(`<h2>${esc(seitenName(i, spr()))}</h2><p id="zine-hinaus">${esc(hinaus(i))}</p><div class="reihe"><button class="knopf akz" data-a="zine-los" data-i="${i}">${ic('funken')}${L('Erzeugen', 'Create')}</button><button class="knopf" data-a="zine-auf">${L('Abbrechen', 'Cancel')}</button></div>`);
  };
  A['zine-weiter'] = () => { const i = warte; warte = -1; if (i >= 0) A['zine-erzeugen']({ dataset: { i } }); };
  A['zine-los'] = async (e) => {
    const i = +e.dataset.i, uid = offen, r = app.rezept(uid); if (!r) return;
    const da = app.zeig(r), p = await pruefeZineAuftrag(da, kiAnweisungen, i); let frei = da;   /* geprüft wird, was der Auftrag DIESER Seite liest */
    if (p.stellen.length) {
      const w = await app.wahl(L('Befehl an eine KI im Bildauftrag', 'Instruction to an AI in the picture request'), app.stellenHtml(p.stellen), L('Ohne senden', 'Send without'), L('Mit senden', 'Send with'));
      if (!w) { zineFenster(uid); return; }
      frei = w === 'a' ? p.sauber : da;
    } else fensterZu();
    const st = stil(), sprache = spr();
    try {
      const bild = await W.mit(L('Seite wird erzeugt (etwa 30 s) …', 'Creating the page (about 30 s) …'), async (w) => { const roh = await kiBild(SK.openai, frei, { groesse: ZINE_GROESSE, auftrag: (x) => zineAuftraege(x, { stil: st, sprache })[i] }); w.text(L('Bild wird gespeichert …', 'Saving the picture …')); return app.bildAusDatei(await (await fetch(roh)).blob()); });
      const zurueck = aendere(uid, (x) => setzeSeite(x, i, bild)); zeichne(); zineFenster(uid);
      melde(L('Seite erzeugt', 'Page created'), L('Rückgängig', 'Undo'), zurueck);
    } catch (f) { zineFenster(uid); melde(app.fehlerText(f, L('Es kam kein Bild zurück.', 'No picture came back.'))); }
  };

  /* ── Zeile im Menü am Rezept: sagt, wie viele Seiten schon da sind. ── */
  const stand = (r) => { const n = zineAnzahl(r); return n ? fuelle(L('{0} von {1} Seiten', '{0} of {1} pages'), n, ZINE_SEITEN) : ''; };

  /* ── Galerie (Bilder-Ordner, Filter „Food-Zine“): jede Seite eine Kachel mit Rezeptname und Seite. Löschen nimmt nur die Seite. ── */
  const galerie = () => zineGalerie(app.Z().rezepte).map((x) => ({ uid: x.uid + TRENNER + x.seite, img: x.bild, name: app.zeig(app.rezept(x.uid)).name, unter: seitenName(x.seite, spr()), hoch: true }));
  function galerieWeg(wahl) {
    const vorher = app.Z().rezepte, weg = new Map();
    for (const k of wahl) { const p = String(k).lastIndexOf(TRENNER); if (p < 0) continue; const uid = k.slice(0, p); weg.set(uid, [...(weg.get(uid) || []), +k.slice(p + TRENNER.length)]); }
    app.setzeZ({ ...app.Z(), rezepte: vorher.map((r) => (weg.has(r.uid) ? weg.get(r.uid).reduce((x, i) => entferneSeite(x, i), r) : r)) }); sichern(); zeichne();
    melde(fuelle(L('−{0} Seiten', '−{0} pages'), wahl.size), L('Rückgängig', 'Undo'), () => { app.setzeZ({ ...app.Z(), rezepte: vorher }); sichern(); zeichne(); });
  }

  /* ── Beispiel-Sätze: das Paket „foodzine-beispiele“ der Ausgabe, auf Tippen geladen, Prüfsumme nachgerechnet.
        Ein Satz kommt nur vollständig und nur an sein Rezept; fehlt das Rezept, wird das gesagt. ── */
  const paket = () => app.katalog()?.pakete?.find((p) => p.art === 'foodzine' && (app.ausgabe().beispiele || []).includes(p.id));
  const beispielZeile = (zeile) => { const p = paket(); return p ? zeile('zine-beispiele', 'zine', L('Food-Zine-Beispiele laden', 'Load food zine examples'), fuelle(L('{0} Sätze, {1} MB', '{0} sets, {1} MB'), p.anzahl, (p.bytes / 1e6).toFixed(0))) : ''; };
  A['zine-beispiele'] = async () => {
    const p = paket(); if (!p) return;
    try {
      const roh = await W.mit(L('Food-Zine-Beispiele werden geladen …', 'Loading the food zine examples …'), async (w) => { const ant = await fetch('../beispiele/' + p.datei); if (!ant.ok) throw new Error(String(ant.status)); return bytesMitAnteil(ant, (a) => w.anteil(a)); });
      const sum = [...new Uint8Array(await crypto.subtle.digest('SHA-256', roh))].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (sum !== p.sha256) { melde(L('Food-Zine-Beispiele beschädigt, nicht eingelesen', 'Food zine examples damaged, not imported')); return; }
      const vorher = app.Z().rezepte, e = zineSaetzeEinlesen(vorher, JSON.parse(new TextDecoder().decode(roh)));
      if (e.dazu) { app.tresorAuto(); app.setzeZ({ ...app.Z(), rezepte: e.rezepte }); sichern(); zeichne(); }
      melde([e.dazu === 1 ? L('+1 Food-Zine', '+1 food zine') : fuelle(L('+{0} Food-Zines', '+{0} food zines'), e.dazu), e.schonDa ? fuelle(L('{0} schon da', '{0} already there'), e.schonDa) : '', e.ohneRezept ? fuelle(L('{0} ohne Rezept', '{0} without a recipe'), e.ohneRezept) : ''].filter(Boolean).join(' · '),
        e.dazu ? L('Rückgängig', 'Undo') : '', () => { app.setzeZ({ ...app.Z(), rezepte: vorher }); sichern(); zeichne(); });
    } catch { melde(L('Food-Zine-Beispiele nicht geladen. Netz?', 'Food zine examples not loaded. Network?')); }
  };

  return { stand, galerie, galerieWeg, beispielZeile, fenster: zineFenster };
}
