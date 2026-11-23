// Mein Rezeptbuch · Zusätze: was aus der alten App noch fehlte und für sich steht.
// KI-Richter der Suche · KI-Bilder für alle ohne Bild · Prüfung des Bildauftrags · Tresor-Stände der alten App · Wochenplan-Vorschlag · Buch.
// Die Hauptdatei (app.mjs) reicht ihre Werkzeuge herein und ruft die Stücke an wenigen, benannten Stellen; so bleibt sie lesbar.
import { richte, kandidat, richterHinaus, RICHTER_MAX } from '../kern/suche/richter.mjs';
import { pruefeBildAuftrag, sammelBilder, sammelKosten, ohneBild } from '../kern/ki/bild.mjs';
import { kiAnweisungen } from '../kern/pruefung/datei.mjs';
import { leseAltenTresor, alteStaendeInTresor } from '../kern/speicher/alt-tresor.mjs';
import { wochenplanVorschlag, vorschlagInPlan, wasGehtHinaus } from '../kern/ki/helfer.mjs';
import { fuelle, gebiet } from '../kern/oberflaeche/sprache.mjs';
import { tagIso } from '../kern/modell/plan.mjs';
import { buchInhalt, buchPdf, buchBlaettern, buchGroesse, buchGroesseText } from '../kern/ausgabe/buch.mjs';
import { drucke } from '../kern/ausgabe/druck.mjs';

/** app: { L, spr, esc, ic, A, s, SK, W, Z(), setzeZ(z), E(), fenster, fensterZu, beiZu(f), melde, sichern, zeichne, zeichneStart, rezept(uid),
 *         istInhalt, katNamen() → Map, katVon(r), schluesselFenster(a, danach), bildAusDatei(blob), tresorAuto(), tr(), ausgabe() } */
export function zusatz(app) {
  const { L, spr, esc, ic, A, s, SK, W, fenster, fensterZu, melde, sichern, zeichne } = app;
  const mitInhalt = () => app.Z().rezepte.filter(app.istInhalt);

  /* ── Eine Wahl mit zwei Antworten und „zu“: für Funde, bei denen der Mensch entscheidet (raus oder rein). ── */
  function wahl(titel, html, a, b) {
    return new Promise((fertig) => {
      let aus = null;
      A['wahl-a'] = () => { aus = 'a'; fensterZu(); }; A['wahl-b'] = () => { aus = 'b'; fensterZu(); };
      fenster(`<h2>${esc(titel)}</h2>${html}<div class="reihe"><button class="knopf akz" data-a="wahl-a">${esc(a)}</button><button class="knopf" data-a="wahl-b">${esc(b)}</button><button class="rund" data-a="fenster-zu" aria-label="${esc(L('Abbrechen', 'Cancel'))}" title="${esc(L('Abbrechen', 'Cancel'))}">${ic('x')}</button></div>`);
      app.beiZu(() => fertig(aus));
    });
  }
  const stellenHtml = (stellen) => `<ul class="ki-liste rot" data-ki-halt>${stellen.slice(0, 4).map((x) => `<li><mark>${esc(String(x.text || '').slice(0, 160))}</mark></li>`).join('')}</ul>`;

  /* ── KI-Richter der Suche: die Sinn-Suche schlägt vor, auf Knopfdruck urteilt Claude; Passendes rückt vor, der Rest klappt ein. ── */
  const ri = { fuer: '', urteile: new Map(), laeuft: false };
  /** Der Block „Nach Bedeutung“. sinn: die Treffer in der Reihenfolge der Sinn-Suche; karte(r) zeichnet eine Karte. */
  function sinnBlock(sinn, karte) {
    if (!sinn.length) return '';
    const f = s.frage.trim().toLowerCase(); if (ri.fuer !== f) { ri.fuer = f; ri.urteile = new Map(); }
    const u = (r) => ri.urteile.get(r.uid), da = ri.urteile.size > 0, n = Math.min(sinn.length, RICHTER_MAX);
    const vorn = da ? sinn.filter((r) => !u(r) || u(r).passt !== false) : sinn, hinten = da ? sinn.filter((r) => u(r) && u(r).passt === false) : [];
    vorn.sort((x, y) => (da ? (u(y) && u(y).passt === true ? 1 : 0) - (u(x) && u(x).passt === true ? 1 : 0) : 0));
    const knopf = da ? `<span class="chip ok" id="richter-fertig" title="${esc(L('Von der KI geprüft', 'Checked by the AI'))}">${ic('haken')}${esc(fuelle(L('{0} passen', '{0} fit'), sinn.filter((r) => u(r) && u(r).passt === true).length))}</span>`
      : `<button class="chip ki" data-a="richter" title="${esc(richterHinaus(n, spr()))}">${ic('funken')}${L('KI prüft', 'AI check')}<small>Anthropic · ${n}</small></button>`;
    return `<div class="ueber"><h2>${L('Nach Bedeutung', 'By meaning')}</h2><small>${sinn.length}</small>${knopf}</div><div class="gitter" id="sinn-treffer">${vorn.map(karte).join('')}</div>`
      + (hinten.length ? `<details class="mehr" id="sinn-rest"><summary>${ic('rechts', 'pf')}<span>${esc(fuelle(L('Passt weniger · {0}', 'Fits less · {0}'), hinten.length))}</span></summary><div class="gitter">${hinten.map(karte).join('')}</div></details>` : '');
  }
  A.richter = async () => {
    if (ri.laeuft) return;
    if (!SK.anthropic) { app.schluesselFenster('anthropic', 'richter'); return; }
    const frage = s.frage.trim(), sinn = app.sinnTreffer(); if (!frage || !sinn.length) return;
    ri.laeuft = true;
    try {
      const namen = app.katNamen();
      const e = await W.mit(L('KI prüft die Treffer …', 'AI is checking the hits …'), () => richte(SK.anthropic, frage, sinn.map((r) => kandidat(r, namen.get(app.katVon(r)) || '')), { sprache: spr() }));
      if (s.frage.trim() !== frage) return;   /* es wurde schon weitergetippt */
      if (!e.gefragt) { melde({ 'pruefliste-fehlt': L('Prüfliste fehlt – nichts gesendet', 'Check list missing – nothing sent'), frage: L('Befehl in der Suchfrage – nichts gesendet', 'Instruction in the query – nothing sent') }[e.grund] || L('Nichts zu prüfen', 'Nothing to check')); return; }
      ri.fuer = frage.toLowerCase(); ri.urteile = new Map(e.urteile.map((x) => [x.uid, x])); app.zeichneStart();
      const aus = e.urteile.filter((x) => x.ausgeschlossen).length;
      melde(fuelle(L('{0} von {1} passen', '{0} of {1} fit'), e.urteile.filter((x) => x.passt === true).length, e.urteile.length) + (aus ? ' · ' + fuelle(L('{0} nicht gesendet', '{0} not sent'), aus) : ''));
    } catch (f) { melde(f.message); } finally { ri.laeuft = false; }
  };

  /* ── Prüfung des Bildauftrags: steht in Name, Zutaten oder Schritten ein Befehl an eine KI, wird die Stelle gezeigt und entschieden. ── */
  /** Zurück: das Rezept, mit dem der Auftrag gebaut wird (wie es ist oder ohne die Stellen), oder null = nicht senden. */
  async function bildFreigabe(r, gratis = false) {
    const p = await pruefeBildAuftrag(r, kiAnweisungen), st = gratis ? p.stellen.filter((x) => x.teil === 'name') : p.stellen;   /* das Gratis-Foto bekommt nur den Namen */
    if (!st.length) return r;
    const w = await wahl(L('Befehl an eine KI im Bildauftrag', 'Instruction to an AI in the picture request'), stellenHtml(st), L('Ohne senden', 'Send without'), L('Mit senden', 'Send with'));
    return w === 'a' ? p.sauber : w === 'b' ? r : null;
  }

  /* ── Sammel-Weg: ein KI-Bild für jedes Rezept ohne Bild. Ein Fenster nennt Anzahl und Kosten; der Lauf ist abbrechbar. ── */
  const offeneBilder = () => ohneBild(mitInhalt());
  function sammelKnopf() {
    const n = offeneBilder().length;
    return n ? `<button class="knopf" data-a="sammel-bilder" title="${esc(L('Für jedes Rezept ohne Bild ein KI-Bild erzeugen', 'Create an AI picture for every recipe without one'))}">${ic('funken')}${esc(fuelle(L('KI-Bilder · {0}', 'AI pictures · {0}'), n))}</button>` : '';
  }
  A['sammel-bilder'] = () => {
    if (!SK.openai) { app.schluesselFenster('openai', 'sammel-bilder'); return; }
    const n = offeneBilder().length; if (!n) return;
    fenster(`<h2>${L('KI-Bilder', 'AI pictures')}</h2><p class="eine" id="sammel-kosten">${esc(sammelKosten(n, spr()))}</p><div class="reihe"><button class="knopf akz" data-a="sammel-start">${ic('funken')}${L('Erzeugen', 'Create')}</button><button class="knopf" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`);
  };
  A['sammel-start'] = async () => {
    let stopp = false; const n = offeneBilder().length;
    app.tresorAuto();
    fenster(`<h2>${L('KI-Bilder', 'AI pictures')}</h2><p class="eine" id="sammel-stand" role="status">…</p><div class="fortschritt"><i id="sammel-balken"></i></div><div class="reihe"><button class="knopf" data-a="sammel-stopp">${L('Abbrechen', 'Cancel')}</button></div>`);
    A['sammel-stopp'] = () => { stopp = true; const el = document.getElementById('sammel-stand'); if (el) el.textContent = L('Hört nach diesem Bild auf …', 'Stops after this picture …'); };
    app.beiZu(() => { stopp = true; });   /* Fenster zu = aufhören nach dem laufenden Bild */
    const e = await sammelBilder(mitInhalt(), { schluessel: SK.openai, pruefe: kiAnweisungen, abbruch: () => stopp,
      fortschritt: (i, alle, r) => { const el = document.getElementById('sammel-stand'), b = document.getElementById('sammel-balken'); if (el && !stopp) el.textContent = fuelle(L('{0} von {1} · {2}', '{0} of {1} · {2}'), i + 1, alle, r.name); if (b) b.style.width = Math.round((i / alle) * 100) + '%'; },
      je: async (r, roh) => { const img = await app.bildAusDatei(await (await fetch(roh)).blob()); const z = app.Z(); app.setzeZ({ ...z, rezepte: z.rezepte.map((x) => (x.uid === r.uid ? { ...x, img, imgCrop: { x: 50, y: 50, scale: 1 } } : x)) }); sichern(); } });
    if (document.getElementById('sammel-stand')) { app.beiZu(null); fensterZu(); }
    zeichne();
    const teile = [e.fertig === 1 ? L('+1 Bild', '+1 picture') : fuelle(L('+{0} Bilder', '+{0} pictures'), e.fertig)];
    if (e.uebersprungen.length) teile.push(fuelle(L('{0} mit Befehl übersprungen', '{0} with instruction skipped'), e.uebersprungen.length));
    if (e.fehler.length) teile.push(fuelle(L('{0} Fehler', '{0} failed'), e.fehler.length));
    if (e.offen) teile.push(fuelle(L('{0} offen', '{0} left'), e.offen));
    melde(e.grund === 'schluessel' || e.grund === 'limit' ? e.fehler[e.fehler.length - 1].text : teile.join(' · '));
    return { ...e, vorher: n };
  };

  /* ── Tresor-Stände der alten App: einmal lesen und mit Name und Zeit in den neuen Tresor legen. ── */
  async function altTresor() {
    const E = app.E(), sp = app.ausgabe().speicher || {}, tr = app.tr();
    const ort = sp.indexedDb && sp.endung ? { db: sp.indexedDb, schluessel: 'mrz' + sp.endung + '_bvault', bilder: 'mrz' + sp.endung + '_bvi_' } : null;   /* dort hält die alte App ihren Tresor */
    if (E.altTresor || !ort || !tr) return 0;
    const staende = await leseAltenTresor(ort); if (!staende.length) return 0;
    const e = await alteStaendeInTresor(tr, staende); E.altTresor = true; sichern();
    if (e.dazu) setTimeout(() => melde(fuelle(L('Tresor: +{0} Stände', 'Vault: +{0} states'), e.dazu)), 1200);
    return e.dazu;
  }

  /* ── Wochenplan-Vorschlag: Claude verteilt eigene Rezepte auf die gezeigte Woche; übernommen wird erst nach einem Blick darauf. ── */
  function planKnopf() {
    const rs = mitInhalt(); if (!rs.length) return '';
    return `<button class="knopf" data-a="plan-ki" title="${esc(wasGehtHinaus('wochenplan', rs, spr(), { kategorien: [...app.katNamen()] }))}">${ic('funken')}<span>${L('Vorschlag', 'Suggest')}</span><small>Anthropic · ${esc(fuelle(L('{0} Namen', '{0} names'), rs.length))}</small></button>`;
  }
  let vorschlag = null;
  A['plan-ki'] = async () => {
    if (!SK.anthropic) { app.schluesselFenster('anthropic', 'plan-ki'); return; }
    const tage = app.planTage(), ab = tagIso(tage[0]), rs = mitInhalt(), kategorien = [...app.katNamen()].map(([id, name]) => ({ id, name }));
    try {
      const v = await W.mit(L('Claude stellt einen Wochenplan zusammen …', 'Claude is putting a week plan together …'), () => wochenplanVorschlag(rs, { tage: 7, ab, kategorien, schluessel: SK.anthropic, sprache: spr() }));
      vorschlag = { v, ab };
      const tagName = (i) => tage[i].toLocaleDateString(gebiet(spr()), { weekday: 'short' });
      fenster(`<h2>${L('Vorschlag für die Woche', 'Suggestion for the week')}</h2><div class="liste plan-vorschlag" id="plan-vorschlag">${tage.map((_, i) => { const namen = v.filter((x) => x.tag === i).map((x) => app.rezept(x.uid)).filter(Boolean).map((r) => esc(r.name)); return namen.length ? `<div class="zeile"><b>${esc(tagName(i))}</b><span>${namen.join('<br>')}</span></div>` : ''; }).join('')}</div>
        <div class="reihe"><button class="knopf akz" data-a="plan-ki-ja">${ic('haken')}${L('Übernehmen', 'Use it')}</button><button class="knopf" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`);
    } catch (f) { melde(f.message); }
  };
  A['plan-ki-ja'] = () => {
    if (!vorschlag) return; const z = app.Z(), vorher = z.plan;
    app.setzeZ({ ...z, plan: vorschlagInPlan(z.plan, vorschlag.v, vorschlag.ab) }); const n = vorschlag.v.length; vorschlag = null; sichern(); fensterZu(); zeichne();
    melde(fuelle(L('+{0} im Plan', '+{0} in the plan'), n), L('Rückgängig', 'Undo'), () => { app.setzeZ({ ...app.Z(), plan: vorher }); sichern(); zeichne(); });
  };

  /* ── Buch: alle Rezepte, eine Kategorie oder ein Ordner als PDF zum Drucken oder als Datei zum Blättern (kern/ausgabe/buch.mjs). ── */
  /** Das Thema „Buch“ für die Einstellungen: [id, symbol, farbe, titel, hilfe, zeilen]. zeile: der Zeilen-Baustein der App. */
  function buchThema(zeile, farbe) {
    const n = mitInhalt().length;
    return ['buch', 'buch', farbe, L('Buch', 'Book'), '', zeile('buch', 'drucken', L('Als PDF drucken', 'Print as a PDF'), String(n), 'data-art="pdf"') + zeile('buch', 'buch', L('Zum Blättern', 'To leaf through'), L('Datei', 'file'), 'data-art="blaettern"')];
  }
  const buchOpt = () => {
    const z = app.Z(), w = document.getElementById('buch-wahl').value, titel = document.getElementById('buch-titel').value.trim() || app.ausgabe().titel;
    return { titel, kategorien: [...app.katNamen()].map(([id, name]) => ({ id, name })), ordner: z.ordner, sprache: spr(), mitBildern: document.getElementById('buch-bilder').checked,
      auswahl: !w ? null : w.startsWith('k:') ? { kat: w.slice(2) } : { ordner: w.slice(2) } };
  };
  A.buch = (e) => {
    const z = app.Z(), art = e.dataset.art === 'pdf' ? 'pdf' : 'blaettern', rs = mitInhalt(), namen = app.katNamen(), zahl = new Map();
    for (const x of rs) { const k = app.katVon(x); zahl.set(k, (zahl.get(k) || 0) + 1); }
    fenster(`<h2>${art === 'pdf' ? L('Buch als PDF', 'Book as a PDF') : L('Buch zum Blättern', 'Book to leaf through')}</h2>
      <input class="feld" id="buch-titel" value="${esc(app.ausgabe().titel)}" aria-label="${esc(L('Titel', 'Title'))}" style="width:100%">
      <select class="feld" id="buch-wahl" aria-label="${esc(L('Auswahl', 'Selection'))}" style="width:100%;margin-top:8px"><option value="">${esc(L('Alle Rezepte', 'All recipes'))} · ${rs.length}</option>
        ${[...namen].filter(([id]) => zahl.get(id)).map(([id, name]) => `<option value="k:${esc(id)}">${esc(name)} · ${zahl.get(id)}</option>`).join('')}${z.ordner.map((o) => `<option value="o:${esc(o.id)}">${esc(o.name)}</option>`).join('')}</select>
      <label class="haken-zeile"><input type="checkbox" id="buch-bilder" checked> ${L('mit Bildern', 'with pictures')}</label>
      <div class="reihe"><button class="knopf akz" data-a="buch-los" data-art="${art}">${ic(art === 'pdf' ? 'drucken' : 'laden')}${art === 'pdf' ? L('Drucken', 'Print') : L('Speichern', 'Save')}</button><button class="knopf" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`);
  };
  A['buch-los'] = async (e) => {
    const opt = buchOpt(), z = app.Z(), n = buchInhalt(z.rezepte, opt).anzahl;
    if (!n) { melde(L('In dieser Auswahl ist kein Rezept', 'No recipe in this selection')); return; }
    fensterZu();
    try {
      if (e.dataset.art === 'pdf') await W.mit(L('Buch wird gesetzt …', 'Setting the book …'), () => drucke(buchPdf(z.rezepte, opt), { sprache: spr() }));
      else { const html = await W.mit(L('Buch wird gesetzt …', 'Setting the book …'), async () => buchBlaettern(z.rezepte, opt));
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = opt.titel.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-') + '.html'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        melde(fuelle(L('Buch gespeichert · {0}', 'Book saved · {0}'), buchGroesseText(buchGroesse(html), spr()))); }
    } catch (f) { melde(f.message); }
  };

  return { sinnBlock, sammelKnopf, bildFreigabe, altTresor, planKnopf, buchThema, wahl, stellenHtml };
}
