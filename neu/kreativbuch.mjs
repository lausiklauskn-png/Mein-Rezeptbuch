// Mein Rezeptbuch · Kreativbuch: aus allen Rezepten, einer Kategorie oder einem Ordner ein gestaltetes Buch (Kern: ausgabe/kreativbuch.mjs).
// Fenster aus den Einstellungen (Buch → Kreativbuch): Auswahl, Stil als Chips, dann die Texte schreiben lassen – mit dem eigenen
// Anthropic-Schlüssel (vorher ein Fenster mit Anzahl und Kosten, der Lauf ist abbrechbar) oder ohne Schlüssel: den Auftrag kopieren,
// in einen Chat geben, die Antwort einsetzen. Danach: Blättern (in der App), PDF, HTML-Datei. Die Texte liegen in den Einstellungen
// dieses Geräts (E.kreativ.texte[uid][stil]); jeder Stil hat seine eigenen. Das Rezeptbild steht auf der ersten Seite jedes Rezepts.
// Die Hauptdatei (app.mjs) reicht ihre Werkzeuge herein (wie bei zusatz.mjs und zine.mjs).
import { KB_STILE, kbStil, kbStilName, kbKosten, kbSammelAuftrag, kbAntwortLesen, pruefeKbAuftrag, kbLauf, kreativBlaettern, kreativPdf, kbRezepte, KB_EIGEN_MAX } from '../kern/ausgabe/kreativbuch.mjs';
import { buchGroesse, buchGroesseText } from '../kern/ausgabe/buch.mjs';
import { drucke } from '../kern/ausgabe/druck.mjs';
import { kiAnweisungen } from '../kern/pruefung/datei.mjs';
import { fuelle } from '../kern/oberflaeche/sprache.mjs';

/** app: { L, spr, esc, ic, A, SK, Z(), E(), fenster, fensterZu, beiZu(f), melde, sichern, zeig(r), istInhalt, katNamen() → Map, katVon(r),
 *         schluesselFenster(a, danach), wahl(titel, html, a, b), stellenHtml(stellen), ausgabe() } */
export function kreativbuch(app) {
  const { L, spr, esc, ic, A, SK, fenster, fensterZu, melde, sichern } = app;
  const $ = (id) => document.getElementById(id);
  /** Der Stand in den Einstellungen dieses Geräts: Stil, eigener Stil, Auswahl, Texte je Rezept und Stil, die Reihenfolge des letzten Kopier-Auftrags. */
  const K = () => { const E = app.E(); const k = E.kreativ && typeof E.kreativ === 'object' ? E.kreativ : (E.kreativ = {}); k.stil = kbStil(k.stil); k.texte ||= {}; k.kopiert ||= []; k.wahl ??= ''; k.eigen ??= ''; return k; };
  const kategorien = () => [...app.katNamen()].map(([id, name]) => ({ id, name }));
  const auswahl = (w = K().wahl) => (!w ? null : w.startsWith('k:') ? { kat: w.slice(2) } : { ordner: w.slice(2) });
  const opt = () => ({ kategorien: kategorien(), auswahl: auswahl(), ordner: app.Z().ordner, sprache: spr() });
  const katName = (r) => app.katNamen().get(app.katVon(r)) || '';
  const imBuch = () => kbRezepte(app.Z().rezepte, opt());
  /** Texte des gewählten Stils für das Buch: { uid: {…} }. */
  const texte = () => { const k = K(), aus = {}; for (const [uid, je] of Object.entries(k.texte)) if (je && je[k.stil]) aus[uid] = je[k.stil]; return aus; };
  /** Was zu schreiben ist: die Rezepte der Auswahl ohne Text in diesem Stil; haben alle einen, alle (neu schreiben). */
  const offen = () => { const rs = imBuch(), t = texte(), o = rs.filter((r) => !t[r.uid]); return o.length ? o : rs; };
  const stilOpt = () => ({ stil: K().stil, eigen: K().eigen, sprache: spr() });
  const kosten = (rs) => kbKosten(rs.map(app.zeig), { ...stilOpt(), kategorie: katName });
  const legeAb = (uid, t) => { const k = K(); k.texte[uid] = { ...(k.texte[uid] || {}), [k.stil]: t }; };

  /* ── Das Fenster: Auswahl, Stil, die zwei Wege, und sobald es Texte gibt die drei Ausgaben. Kein Erklärtext; die Knöpfe sagen im Hinweis, was sie tun. ── */
  function kbFenster() {
    const k = K(), z = app.Z(), rs = z.rezepte.filter(app.istInhalt), namen = app.katNamen(), zahl = new Map();
    for (const x of rs) { const id = app.katVon(x); zahl.set(id, (zahl.get(id) || 0) + 1); }
    const liste = imBuch(), t = texte(), mit = liste.filter((r) => t[r.uid]).length, o = offen(), ko = kosten(o);
    fenster(`<h2 class="imp-kopf">${ic('funken')}<span>${L('Kreativbuch', 'Creative book')}</span><small class="kb-stand" id="kb-stand">${esc(fuelle(L('{0} von {1} mit Text', '{0} of {1} with text'), mit, liste.length))}</small></h2>
     <select class="feld" id="kb-wahl" aria-label="${esc(L('Auswahl', 'Selection'))}" style="width:100%"><option value="">${esc(L('Alle Rezepte', 'All recipes'))} · ${rs.length}</option>
      ${[...namen].filter(([id]) => zahl.get(id)).map(([id, name]) => `<option value="k:${esc(id)}" ${k.wahl === 'k:' + id ? 'selected' : ''}>${esc(name)} · ${zahl.get(id)}</option>`).join('')}${z.ordner.map((x) => `<option value="o:${esc(x.id)}" ${k.wahl === 'o:' + x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
     <div class="laeden kb-stile" id="kb-stile" role="radiogroup" aria-label="${esc(L('Stil', 'Style'))}">${Object.keys(KB_STILE).map((id) => `<button class="chip" role="radio" aria-checked="${id === k.stil}" data-a="kb-stil" data-stil="${esc(id)}"><i class="kb-punkt" style="background:${KB_STILE[id].deck}"></i>${esc(kbStilName(id, spr()))}</button>`).join('')}</div>
     ${k.stil === 'eigen' ? `<input class="feld" id="kb-eigen" maxlength="${KB_EIGEN_MAX}" value="${esc(k.eigen)}" placeholder="${esc(L('Wie soll es klingen?', 'How should it sound?'))}" aria-label="${esc(L('Eigener Stil', 'Own style'))}" style="width:100%;margin-bottom:10px">` : ''}
     <div class="reihe kb-wege"><button class="knopf akz" data-a="kb-erzeugen" ${liste.length ? '' : 'disabled'} title="${esc(L('Texte schreiben lassen', 'Have the texts written') + ': Anthropic · ' + L('Name, Kategorie, Zutaten, Schritte', 'name, category, ingredients, steps') + ' · ' + ko.text)}">${ic('funken')}<span>${L('Mit Schlüssel', 'With key')}</span><small>Anthropic · ${esc(L('Rezepttext', 'Recipe text'))} · ${esc(ko.preis)}</small></button>
      <button class="knopf" data-a="kb-kopieren" ${liste.length ? '' : 'disabled'} title="${esc(L('Auftrag für einen Chat kopieren, ohne Schlüssel', 'Copy the request for a chat, without a key'))}">${ic('kopieren')}${L('Auftrag kopieren', 'Copy request')}</button>
      <button class="knopf" data-a="kb-einsetzen" title="${esc(L('Die Antwort aus dem Chat einsetzen', 'Insert the answer from the chat'))}">${ic('datei')}${L('Antwort einsetzen', 'Insert answer')}</button></div>
     ${mit ? `<div class="reihe kb-fertig" id="kb-fertig"><button class="knopf" data-a="kb-blaettern">${ic('buch')}${L('Blättern', 'Leaf through')}</button><button class="knopf" data-a="kb-pdf">${ic('drucken')}PDF</button><button class="knopf" data-a="kb-html">${ic('laden')}HTML</button></div>` : ''}
     <div class="reihe"><button class="knopf" data-a="fenster-zu">${L('Schließen', 'Close')}</button></div>`);
  }
  A.kreativ = () => kbFenster();
  A['kb-auf'] = () => kbFenster();
  A['kb-stil'] = (e) => { merkEigen(); K().stil = kbStil(e.dataset.stil); sichern(); kbFenster(); };
  const merkEigen = () => { const f = $('kb-eigen'); if (f) { K().eigen = f.value.slice(0, KB_EIGEN_MAX); sichern(); } };
  document.addEventListener('change', (ev) => { if (ev.target.id === 'kb-wahl') { merkEigen(); K().wahl = ev.target.value; sichern(); kbFenster(); } else if (ev.target.id === 'kb-eigen') merkEigen(); });

  /* ── Mit Schlüssel: erst ein Fenster mit Anzahl und Kosten, dann die Prüfung (Befehl an eine KI → zeigen und entscheiden), dann der Lauf. ── */
  A['kb-erzeugen'] = () => {
    merkEigen();
    if (!SK.anthropic) { app.schluesselFenster('anthropic', 'kb-erzeugen'); return; }
    const rs = offen(); if (!rs.length) { melde(L('In dieser Auswahl ist kein Rezept', 'No recipe in this selection')); return; }
    fenster(`<h2>${L('Kreativbuch', 'Creative book')} · ${esc(kbStilName(K().stil, spr()))}</h2><p class="eine" id="kb-kosten">${esc(kosten(rs).text)}</p>
      <div class="reihe"><button class="knopf akz" data-a="kb-start">${ic('funken')}${L('Texte schreiben', 'Write texts')}</button><button class="knopf" data-a="kb-auf">${L('Abbrechen', 'Cancel')}</button></div>`);
  };
  A['kb-start'] = async () => {
    const rs = offen(), frei = [], kat = new Map(), stellen = [], sauber = new Map();
    for (const r of rs) { const da = app.zeig(r), p = await pruefeKbAuftrag(da, kiAnweisungen, katName(r)); frei.push(da); kat.set(r.uid, katName(r)); if (p.stellen.length) { stellen.push(...p.stellen); sauber.set(r.uid, p); } }
    let liste = frei;
    if (stellen.length) {
      const w = await app.wahl(L('Befehl an eine KI im Auftrag', 'Instruction to an AI in the request'), app.stellenHtml(stellen), L('Ohne senden', 'Send without'), L('Mit senden', 'Send with'));
      if (!w) { kbFenster(); return; }
      if (w === 'a') { liste = frei.map((r) => (sauber.has(r.uid) ? sauber.get(r.uid).sauber : r)); for (const [uid, p] of sauber) kat.set(uid, p.kategorie); }
    }
    let stopp = false;
    fenster(`<h2>${L('Kreativbuch', 'Creative book')}</h2><p class="eine" id="kb-lauf" role="status">…</p><div class="fortschritt"><i id="kb-balken"></i></div><div class="reihe"><button class="knopf" data-a="kb-stopp">${L('Abbrechen', 'Cancel')}</button></div>`);
    A['kb-stopp'] = () => { stopp = true; const el = $('kb-lauf'); if (el) el.textContent = L('Hört nach diesem Rezept auf …', 'Stops after this recipe …'); };
    app.beiZu(() => { stopp = true; });   /* Fenster zu = aufhören nach dem laufenden Rezept */
    const e = await kbLauf(liste, { schluessel: SK.anthropic, ...stilOpt(), kategorie: (r) => kat.get(r.uid) || '', abbruch: () => stopp,
      fortschritt: (i, n, r) => { const el = $('kb-lauf'), b = $('kb-balken'); if (el && !stopp) el.textContent = fuelle(L('{0} von {1} · {2}', '{0} of {1} · {2}'), i + 1, n, r.name); if (b) b.style.width = Math.round((i / n) * 100) + '%'; },
      je: (r, t) => { legeAb(r.uid, t); sichern(); } });
    if ($('kb-lauf')) app.beiZu(null);
    kbFenster();
    const teile = [e.fertig === 1 ? L('+1 Text', '+1 text') : fuelle(L('+{0} Texte', '+{0} texts'), e.fertig)];
    if (e.fehler.length) teile.push(fuelle(L('{0} Fehler', '{0} failed'), e.fehler.length));
    if (e.offen) teile.push(fuelle(L('{0} offen', '{0} open'), e.offen));
    melde(e.grund === 'schluessel' || e.grund === 'limit' ? e.fehler[e.fehler.length - 1].text : teile.join(' · '));
    return e;
  };

  /* ── Ohne Schlüssel: EIN Auftrag für alle offenen Rezepte in die Zwischenablage; die Reihenfolge wird gemerkt, damit die Antwort zugeordnet werden kann. ── */
  A['kb-kopieren'] = async () => {
    merkEigen();
    const rs = offen(); if (!rs.length) return;
    const t = kbSammelAuftrag(rs.map(app.zeig), { ...stilOpt(), kategorie: katName });
    try { await navigator.clipboard.writeText(t); K().kopiert = rs.map((r) => r.uid); sichern(); melde(fuelle(L('Auftrag kopiert · {0} Rezepte', 'Request copied · {0} recipes'), rs.length)); }
    catch { melde(L('Kopieren ging nicht', 'Copying failed')); }
  };
  A['kb-einsetzen'] = () => fenster(`<h2>${L('Antwort einsetzen', 'Insert answer')}</h2><textarea class="feld" id="kb-antwort" aria-label="${esc(L('Antwort aus dem Chat', 'Answer from the chat'))}" style="width:100%"></textarea>
    <div class="reihe"><button class="knopf akz" data-a="kb-einsetzen-los">${ic('haken')}${L('Einsetzen', 'Insert')}</button><button class="knopf" data-a="kb-auf">${L('Abbrechen', 'Cancel')}</button></div>`);
  A['kb-einsetzen-los'] = () => {
    const roh = $('kb-antwort')?.value || '', da = new Map(app.Z().rezepte.map((r) => [r.uid, r]));
    const rs = K().kopiert.map((u) => da.get(u)).filter(Boolean);
    try {
      const e = kbAntwortLesen(roh, rs.length ? rs : offen(), spr());
      for (const [uid, t] of Object.entries(e.texte)) legeAb(uid, t);
      sichern(); kbFenster();
      melde([e.zugeordnet === 1 ? L('+1 Text', '+1 text') : fuelle(L('+{0} Texte', '+{0} texts'), e.zugeordnet), e.ohne ? fuelle(L('{0} nicht zugeordnet', '{0} not matched'), e.ohne) : ''].filter(Boolean).join(' · '));
    } catch (f) { melde(f.message); }
  };

  /* ── Ausgaben: Blättern in der App (ein Rahmen ohne Zugriff auf die App), PDF über den Druck des Browsers, HTML als Datei. ── */
  const buchOpt = () => ({ ...opt(), texte: texte(), stil: K().stil, titel: app.ausgabe().titel });
  A['kb-blaettern'] = () => {
    $('fensterort').innerHTML = `<div class="kb-vorschau" role="dialog" aria-modal="true" aria-label="${esc(L('Kreativbuch', 'Creative book'))}"><iframe id="kb-rahmen" sandbox="allow-scripts" title="${esc(L('Kreativbuch', 'Creative book'))}"></iframe><button class="voll-x" data-a="kb-auf" aria-label="${esc(L('Schließen', 'Close'))}">${ic('x')}</button></div>`;
    $('kb-rahmen').srcdoc = kreativBlaettern(app.Z().rezepte, buchOpt());
  };
  A['kb-pdf'] = () => { fensterZu(); drucke(kreativPdf(app.Z().rezepte, buchOpt()), { sprache: spr() }).catch((f) => melde(f.message)); };
  A['kb-html'] = () => {
    const o = buchOpt(), html = kreativBlaettern(app.Z().rezepte, o), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = (o.titel + ' ' + L('Kreativbuch', 'Creative book')).replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-') + '.html';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    melde(fuelle(L('Kreativbuch gespeichert · {0}', 'Creative book saved · {0}'), buchGroesseText(buchGroesse(html), spr())));
  };

  /** Die Zeile im Thema „Buch“ der Einstellungen. */
  const zeileHtml = (zeile) => zeile('kreativ', 'funken', L('Kreativbuch', 'Creative book'), kbStilName(K().stil, spr()));
  return { zeile: zeileHtml, fenster: kbFenster };
}
