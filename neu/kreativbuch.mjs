// Mein Rezeptbuch · Kreativbuch: aus den gewählten Rezepten ein gestaltetes Buch (Kern: ausgabe/kreativbuch.mjs).
// Fenster aus dem Bereich Kreativbuch: Rezepte einzeln an- und abwählen (wie Schritt 1 der alten App: Liste mit Häkchen, gruppiert nach
// Kategorie und Ordner, Vorgabe alle; die Schnellwahl setzt die Häkchen für alle, eine Kategorie oder einen Ordner), Stil als Chips, dann
// die Texte schreiben lassen – mit dem eigenen Anthropic-Schlüssel (vorher ein Fenster mit Anzahl und Kosten, der Lauf ist abbrechbar) oder
// ohne Schlüssel: der Auftrag steht in einem Feld zum Ändern („Auftrag neu bauen“ nach einer eigenen Änderung), „Kopieren“, „Claude“ und
// „ChatGPT“ (kopieren und den Chat in einem neuen Tab öffnen), dann die Antwort einsetzen. Danach: Blättern (in der App), PDF, HTML-Datei.
// Gemerkt werden die ABgewählten Rezepte (E.kreativ.ab): ein neues Rezept ist von selbst gewählt. Die Texte liegen in den Einstellungen
// dieses Geräts (E.kreativ.texte[uid][stil]); jeder Stil hat seine eigenen. Das Rezeptbild steht auf der ersten Seite jedes Rezepts.
// Teil 2: „Aus Bildern“ macht aus eigenen Fotos und PDF-Seiten ein Buch (im Gerät verkleinert, nichts geht an eine KI); jedes Bild
// lässt sich als Rezeptbild an ein Rezept hängen. „Projekte“ legt ein angefangenes Kreativbuch (Auswahl, Stil, Texte, Bilder) im
// Speicher des Geräts ab, öffnet und löscht es (mit Rückgängig) und tauscht es als .kreativbuch-Datei (das Format der alten App).
// Projekte stehen nicht in der Sicherung: in der alten App waren sie eigene Dateien, und bis zu 30 Bilder je Projekt machten jede
// Sicherung um Megabytes schwerer; der Weg nach draußen ist die Datei je Projekt.
// Die Hauptdatei (app.mjs) reicht ihre Werkzeuge herein (wie bei zusatz.mjs und zine.mjs).
import { KB_STILE, kbStil, kbStilName, kbKosten, kbSammelAuftrag, kbAntwortLesen, pruefeKbAuftrag, kbLauf, kreativBlaettern, kreativPdf, kbRezepte, KB_EIGEN_MAX } from '../kern/ausgabe/kreativbuch.mjs';
import { ZINE_CHAT } from '../kern/ausgabe/zine.mjs';
import { buchGroesse, buchGroesseText } from '../kern/ausgabe/buch.mjs';
import { drucke } from '../kern/ausgabe/druck.mjs';
import { kiAnweisungen } from '../kern/pruefung/datei.mjs';
import { fuelle } from '../kern/oberflaeche/sprache.mjs';
import { EB_MAX, EB_KANTE, EB_KLEIN, EB_GUETE, EB_DATEI_MAX, EB_ENDUNG, ebDazu, ebVerschiebe, ebDateienTeilen, ebBlaettern, ebPdf, kbProjekt, kbProjekte, kbProjektDatei, kbProjektAusDatei, kbAbgewaehlt } from '../kern/ausgabe/eigenbuch.mjs';
import { bildGroessen } from '../kern/oberflaeche/bild.mjs';
import { pdfjsLaden } from '../kern/ki/reinigung.mjs';
import { istPdf, istBild } from '../kern/import/scan.mjs';

/** app: { L, spr, esc, ic, A, W, SK, Z(), setzeZ(z), E(), lager(), fenster, fensterZu, beiZu(f), melde, sichern, zeichne, zeig(r), istInhalt, katNamen() → Map,
 *         katVon(r), gruppen() → [{ titel, rezepte }], schluesselFenster(a, danach), wahl(titel, html, a, b), stellenHtml(stellen), ausgabe() } */
export function kreativbuch(app) {
  const { L, spr, esc, ic, A, W, SK, fenster, fensterZu, melde, sichern } = app;
  const $ = (id) => document.getElementById(id);
  /* Teil 2: die Bilder des eigenen Buchs (im Speicher der Seite, bis ein Projekt sie ablegt), das gewählte Bild, das geöffnete Projekt. */
  let bilder = [], gew = -1, projOffen = { id: '', name: '' }, ziehVon = -1, rbZiel = -1;
  /** Der Stand in den Einstellungen dieses Geräts: Stil, eigener Stil, Auswahl, Texte je Rezept und Stil, die Reihenfolge des letzten Kopier-Auftrags. */
  const K = () => { const E = app.E(); const k = E.kreativ && typeof E.kreativ === 'object' ? E.kreativ : (E.kreativ = {}); k.stil = kbStil(k.stil); k.texte ||= {}; k.kopiert ||= []; k.wahl ??= ''; k.eigen ??= ''; k.ab = kbAbgewaehlt(k.ab);
    if (k.wahl) { k.ab = abAusWahl(k.wahl); k.wahl = ''; }   /* bis 0.15: eine Kategorie oder ein Ordner als Auswahl → einmal in Häkchen umgerechnet */
    return k; };
  const kategorien = () => [...app.katNamen()].map(([id, name]) => ({ id, name }));
  const auswahl = (w) => (!w ? null : w.startsWith('k:') ? { kat: w.slice(2) } : { ordner: w.slice(2) });
  const alle = () => app.Z().rezepte.filter(app.istInhalt);
  /** Die Rezepte einer Schnellwahl (alle, eine Kategorie k:…, ein Ordner o:…) – in der Folge des Buchs. */
  const vonWahl = (w) => kbRezepte(app.Z().rezepte, { kategorien: kategorien(), auswahl: auswahl(w), ordner: app.Z().ordner, sprache: spr() });
  /** Abgewählt ist, was nicht zur Schnellwahl gehört. */
  function abAusWahl(w) { const drin = new Set(vonWahl(w).map((r) => r.uid)); return alle().filter((r) => !drin.has(r.uid)).map((r) => r.uid); }
  const opt = () => ({ kategorien: kategorien(), auswahl: null, ordner: app.Z().ordner, sprache: spr() });
  const katName = (r) => app.katNamen().get(app.katVon(r)) || '';
  /** Die gewählten Rezepte (für Buch und Ausgaben): alle ohne die abgewählten. */
  const gewaehlt = () => { const ab = new Set(K().ab); return app.Z().rezepte.filter((r) => !ab.has(r.uid)); };
  const imBuch = () => kbRezepte(gewaehlt(), opt());
  /* Der Auftrag des Kopier-Wegs: aus Auswahl und Stil gebaut, solange niemand das Feld selbst geändert hat. */
  const kbAuf = { text: '', hand: false };
  const bauAuftrag = () => { const rs = offen(); return rs.length ? kbSammelAuftrag(rs.map(app.zeig), { ...stilOpt(), kategorie: katName }) : ''; };
  const auftrag = () => { if (!kbAuf.hand) kbAuf.text = bauAuftrag(); return kbAuf.text; };
  /** Texte des gewählten Stils für das Buch: { uid: {…} }. */
  const texte = () => { const k = K(), aus = {}; for (const [uid, je] of Object.entries(k.texte)) if (je && je[k.stil]) aus[uid] = je[k.stil]; return aus; };
  /** Was zu schreiben ist: die Rezepte der Auswahl ohne Text in diesem Stil; haben alle einen, alle (neu schreiben). */
  const offen = () => { const rs = imBuch(), t = texte(), o = rs.filter((r) => !t[r.uid]); return o.length ? o : rs; };
  const stilOpt = () => ({ stil: K().stil, eigen: K().eigen, sprache: spr() });
  const kosten = (rs) => kbKosten(rs.map(app.zeig), { ...stilOpt(), kategorie: katName });
  const legeAb = (uid, t) => { const k = K(); k.texte[uid] = { ...(k.texte[uid] || {}), [k.stil]: t }; };

  /* ── Das Fenster: Auswahl, Stil, die zwei Wege, und sobald es Texte gibt die drei Ausgaben. Kein Erklärtext; die Knöpfe sagen im Hinweis, was sie tun. ── */
  /** Die Schnellwahl zeigt, ob die Häkchen genau „alle“, eine Kategorie oder einen Ordner treffen; sonst „Eigene Auswahl“. */
  function schnellwahl(rs, gew) {
    const z = app.Z(), namen = app.katNamen(), zahl = new Map(), ab = new Set(K().ab);
    for (const x of rs) { const id = app.katVon(x); zahl.set(id, (zahl.get(id) || 0) + 1); }
    const gleich = (w) => { const drin = new Set(vonWahl(w).map((r) => r.uid)); return rs.every((r) => drin.has(r.uid) === !ab.has(r.uid)); };
    const opts = [['alle', `${L('Alle Rezepte', 'All recipes')} · ${rs.length}`], ...[...namen].filter(([id]) => zahl.get(id)).map(([id, name]) => ['k:' + id, `${name} · ${zahl.get(id)}`]), ...z.ordner.map((x) => ['o:' + x.id, x.name])];
    const an = !ab.size ? 'alle' : (opts.find(([w]) => w !== 'alle' && gleich(w)) || [''])[0];
    return `<select class="feld" id="kb-wahl" aria-label="${esc(L('Schnellwahl', 'Quick selection'))}">${an ? '' : `<option value="" selected>${esc(fuelle(L('Eigene Auswahl · {0}', 'Own selection · {0}'), gew))}</option>`}${opts.map(([w, t]) => `<option value="${esc(w)}" ${w === an ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  }
  /** Die Liste mit Häkchen, gruppiert nach Kategorie, Ordner und „Sonstiges“ (wie Schritt 1 der alten App). */
  function hakenListe() {
    const ab = new Set(K().ab);
    return app.gruppen().map((g) => `<div class="kb-grp">${esc(g.titel)}</div>${g.rezepte.map((r) => `<button class="kb-r" role="checkbox" aria-checked="${!ab.has(r.uid)}" data-a="kb-haken" data-uid="${esc(r.uid)}"><i class="kb-cb">${ab.has(r.uid) ? '' : ic('haken')}</i><span>${esc(app.zeig(r).name)}</span></button>`).join('')}`).join('');
  }
  function kbFenster() {
    const k = K(), rs = alle(), gew = rs.filter((r) => !new Set(k.ab).has(r.uid)).length;
    const liste = imBuch(), t = texte(), mit = liste.filter((r) => t[r.uid]).length, o = offen(), ko = kosten(o), auf = auftrag(), neu = kbAuf.hand && auf !== bauAuftrag();
    const f = document.querySelector('.fenster'), alt = $('kb-liste') ? { f: f?.scrollTop || 0, l: $('kb-liste').scrollTop } : null;
    fenster(`<h2 class="imp-kopf">${ic('funken')}<span>${L('Kreativbuch', 'Creative book')}</span><small class="kb-stand" id="kb-stand">${esc(fuelle(L('{0} von {1} mit Text', '{0} of {1} with text'), mit, liste.length))}</small></h2>
     ${schnellwahl(rs, gew)}
     <div class="reihe kb-wahlzeile"><button class="knopf" data-a="kb-alle">${gew === rs.length && rs.length ? L('Alle abwählen', 'Deselect all') : L('Alle wählen', 'Select all')}</button><small class="kb-zahl" id="kb-zahl">${esc(fuelle(L('{0} / {1} gewählt', '{0} / {1} selected'), gew, rs.length))}</small></div>
     <div class="kb-liste" id="kb-liste" role="group" aria-label="${esc(L('Rezepte im Buch', 'Recipes in the book'))}">${hakenListe()}</div>
     <div class="laeden kb-stile" id="kb-stile" role="radiogroup" aria-label="${esc(L('Stil', 'Style'))}">${Object.keys(KB_STILE).map((id) => `<button class="chip" role="radio" aria-checked="${id === k.stil}" data-a="kb-stil" data-stil="${esc(id)}"><i class="kb-punkt" style="background:${KB_STILE[id].deck}"></i>${esc(kbStilName(id, spr()))}</button>`).join('')}</div>
     ${k.stil === 'eigen' ? `<input class="feld" id="kb-eigen" maxlength="${KB_EIGEN_MAX}" value="${esc(k.eigen)}" placeholder="${esc(L('Wie soll es klingen?', 'How should it sound?'))}" aria-label="${esc(L('Eigener Stil', 'Own style'))}" style="width:100%;margin-bottom:10px">` : ''}
     <div class="reihe kb-wege"><button class="knopf akz" data-a="kb-erzeugen" ${liste.length ? '' : 'disabled'} title="${esc(L('Texte schreiben lassen', 'Have the texts written') + ': Anthropic · ' + L('Name, Kategorie, Zutaten, Schritte', 'name, category, ingredients, steps') + ' · ' + ko.text)}">${ic('funken')}<span>${L('Mit Schlüssel', 'With key')}</span><small>Anthropic · ${esc(L('Rezepttext', 'Recipe text'))} · ${esc(ko.preis)}</small></button>
      <button class="knopf" data-a="kb-einsetzen" title="${esc(L('Die Antwort aus dem Chat einsetzen', 'Insert the answer from the chat'))}">${ic('datei')}${L('Antwort einsetzen', 'Insert answer')}</button></div>
     <h3 class="kb-unter">${L('Auftrag kopieren oder selber schreiben', 'Copy the request or write your own')}</h3>
     <textarea class="feld kb-auftrag" id="kb-auftrag" aria-label="${esc(L('Auftrag kopieren oder selber schreiben', 'Copy the request or write your own'))}">${esc(auf)}</textarea>
     <div class="reihe kb-chat"><button class="knopf" data-a="kb-kopieren" ${liste.length ? '' : 'disabled'} title="${esc(L('Auftrag für einen Chat kopieren, ohne Schlüssel', 'Copy the request for a chat, without a key'))}">${ic('kopieren')}${L('Kopieren', 'Copy')}</button><button class="knopf" data-a="kb-claude" ${liste.length ? '' : 'disabled'} title="${esc(L('Kopiert den Auftrag und öffnet Claude in einem neuen Tab', 'Copies the request and opens Claude in a new tab'))}">${ic('link')}Claude</button><button class="knopf" data-a="kb-chatgpt" ${liste.length ? '' : 'disabled'} title="${esc(L('Kopiert den Auftrag und öffnet ChatGPT in einem neuen Tab', 'Copies the request and opens ChatGPT in a new tab'))}">${ic('link')}ChatGPT</button>
      <button class="knopf" data-a="kb-neu" id="kb-neu" ${neu ? '' : 'hidden'} title="${esc(L('Verwirft deine Änderung im Feld und baut den Auftrag aus den Einstellungen', 'Discards your change in the field and builds the request from the settings'))}">${ic('pfeile')}${L('Auftrag neu bauen', 'Rebuild request')}</button></div>
     <div class="reihe kb-mehr"><button class="knopf" data-a="eb-auf" title="${esc(L('Eigenes Kreativbuch aus Fotos oder PDF-Seiten', 'Own creative book from photos or PDF pages'))}">${ic('bild')}${L('Aus Bildern', 'From pictures')}${bilder.length ? ` · ${bilder.length}` : ''}</button><button class="knopf" data-a="kbp-auf" title="${esc(L('Speichern und weitermachen', 'Save and continue later'))}">${ic('ordner')}${L('Projekte', 'Projects')}</button></div>
     ${mit ? `<div class="reihe kb-fertig" id="kb-fertig"><button class="knopf" data-a="kb-blaettern">${ic('buch')}${L('Blättern', 'Leaf through')}</button><button class="knopf" data-a="kb-pdf">${ic('drucken')}PDF</button><button class="knopf" data-a="kb-html">${ic('laden')}HTML</button></div>` : ''}
     <div class="reihe"><button class="knopf" data-a="fenster-zu">${L('Schließen', 'Close')}</button></div>`);
    if (alt) { const nf = document.querySelector('.fenster'); if (nf) nf.scrollTop = alt.f; if ($('kb-liste')) $('kb-liste').scrollTop = alt.l; }   /* ein Häkchen springt nicht nach oben */
  }
  A.kreativ = () => kbFenster();
  A['kb-haken'] = (e) => { const k = K(), u = e.dataset.uid, ab = new Set(k.ab); if (ab.has(u)) ab.delete(u); else ab.add(u); k.ab = [...ab]; sichern(); kbFenster(); };
  A['kb-alle'] = () => { const k = K(), rs = alle(); k.ab = k.ab.length || !rs.length ? [] : rs.map((r) => r.uid); sichern(); kbFenster(); };
  A['kb-neu'] = () => { kbAuf.hand = false; kbFenster(); };
  A['kb-auf'] = () => kbFenster();
  A['kb-stil'] = (e) => { merkEigen(); K().stil = kbStil(e.dataset.stil); sichern(); kbFenster(); };
  const merkEigen = () => { const f = $('kb-eigen'); if (f) { K().eigen = f.value.slice(0, KB_EIGEN_MAX); sichern(); } };
  document.addEventListener('change', (ev) => { if (ev.target.id === 'kb-wahl') { merkEigen(); const w = ev.target.value; if (w) { K().ab = w === 'alle' ? [] : abAusWahl(w); sichern(); } kbFenster(); } else if (ev.target.id === 'kb-eigen') merkEigen(); });
  /* Das Auftragsfeld folgt dem eigenen Stil beim Tippen (ohne neu zu zeichnen: der nächste Tipp darf nicht ins Leere gehen); eine eigene Änderung im Feld bleibt. */
  document.addEventListener('input', (ev) => {
    if (ev.target.id === 'kb-eigen') { K().eigen = ev.target.value.slice(0, KB_EIGEN_MAX); sichern(); const f = $('kb-auftrag'); if (f && !kbAuf.hand) f.value = auftrag(); }
    else if (ev.target.id === 'kb-auftrag') { kbAuf.text = ev.target.value; kbAuf.hand = kbAuf.text !== bauAuftrag(); const k = $('kb-neu'); if (k) k.hidden = !kbAuf.hand; }
  });

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
  async function kopiere() {
    merkEigen();
    const rs = offen(); if (!rs.length) return false;
    const t = $('kb-auftrag')?.value ?? auftrag(); if (!t.trim()) return false;
    try { await navigator.clipboard.writeText(t); K().kopiert = rs.map((r) => r.uid); sichern(); melde(fuelle(L('Auftrag kopiert · {0} Rezepte', 'Request copied · {0} recipes'), rs.length)); return true; }
    catch { melde(L('Kopieren ging nicht', 'Copying failed')); return false; }
  }
  A['kb-kopieren'] = () => kopiere();
  /* Erst kopieren, dann im selben Tipp den Chat in einem neuen Tab öffnen (kein Schlüssel, kein Aufruf der App). */
  const zumChat = (adresse) => { const k = kopiere(); window.open(adresse, '_blank', 'noopener'); return k; };
  A['kb-claude'] = () => zumChat(ZINE_CHAT.claude);
  A['kb-chatgpt'] = () => zumChat(ZINE_CHAT.chatgpt);
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
    $('kb-rahmen').srcdoc = kreativBlaettern(gewaehlt(), buchOpt());
  };
  A['kb-pdf'] = () => { fensterZu(); drucke(kreativPdf(gewaehlt(), buchOpt()), { sprache: spr() }).catch((f) => melde(f.message)); };
  A['kb-html'] = () => {
    const o = buchOpt(), html = kreativBlaettern(gewaehlt(), o), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = (o.titel + ' ' + L('Kreativbuch', 'Creative book')).replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-') + '.html';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    melde(fuelle(L('Kreativbuch gespeichert · {0}', 'Creative book saved · {0}'), buchGroesseText(buchGroesse(html), spr())));
  };

  /* ── Aus Bildern: eigene Fotos und PDF-Seiten, im Gerät verkleinert (lange Kante 1600 px fürs Buch, 320 px Vorschau), höchstens 30,
        je Datei höchstens 15 MB (die Grenzen der alten App). Antippen wählt ein Bild; darunter verschieben, als Rezeptbild, entfernen.
        Mit der Maus lässt sich ein Bild auch ziehen. ── */
  const rund = (a, sym, titel, kl = '') => `<button class="rund ${kl}" data-a="${a}" aria-label="${esc(titel)}" title="${esc(titel)}">${ic(sym)}</button>`;
  function ebFenster() {
    if (gew >= bilder.length) gew = -1;
    const n = bilder.length;
    fenster(`<h2 class="imp-kopf">${ic('bild')}<span>${L('Aus Bildern', 'From pictures')}</span><small class="kb-stand" id="eb-stand">${n} / ${EB_MAX}</small></h2>
     <div class="eb-gitter" id="eb-gitter">${bilder.map((b, i) => `<button class="eb-kachel" draggable="true" data-a="eb-wahl" data-i="${i}" aria-pressed="${i === gew}" title="${esc(b.name)}"><img src="${esc(b.klein)}" alt="${esc(b.name)}"></button>`).join('')}${n < EB_MAX ? `<button class="eb-kachel eb-dazu" data-a="eb-dazu" aria-label="${esc(L('Bilder hinzufügen', 'Add pictures'))}" title="${esc(fuelle(L('Fotos oder PDF, bis {0} MB je Datei', 'Photos or PDF, up to {0} MB per file'), EB_DATEI_MAX / 1048576))}">${ic('plus')}</button>` : ''}</div>
     <input type="file" id="eb-datei" accept="image/*,application/pdf,.pdf" multiple hidden>
     ${gew >= 0 ? `<div class="reihe eb-werk" id="eb-werk">${rund('eb-links', 'links', L('Nach vorn', 'Move forward'))}${rund('eb-rechts', 'rechts', L('Nach hinten', 'Move back'))}${rund('eb-rezeptbild', 'bild', L('Als Rezeptbild', 'As recipe picture'))}${rund('eb-weg', 'muell', L('Entfernen', 'Remove'), 'rot')}</div>` : ''}
     ${n ? `<div class="reihe kb-fertig" id="eb-fertig"><button class="knopf" data-a="eb-blaettern">${ic('buch')}${L('Blättern', 'Leaf through')}</button><button class="knopf" data-a="eb-pdf">${ic('drucken')}PDF</button><button class="knopf" data-a="eb-html">${ic('laden')}HTML</button></div>` : ''}
     <div class="reihe"><button class="knopf" data-a="kb-auf">${L('Zurück', 'Back')}</button></div>`);
  }
  A['eb-auf'] = () => { merkEigen(); ebFenster(); };
  A['eb-dazu'] = () => $('eb-datei')?.click();
  A['eb-wahl'] = (e) => { const i = +e.dataset.i; gew = gew === i ? -1 : i; ebFenster(); };
  const schiebe = (d) => { if (gew < 0) return; const z = Math.max(0, Math.min(bilder.length - 1, gew + d)); bilder = ebVerschiebe(bilder, gew, z); gew = z; ebFenster(); };
  A['eb-links'] = () => schiebe(-1);
  A['eb-rechts'] = () => schiebe(1);
  A['eb-weg'] = () => { if (gew < 0) return; const vorher = bilder, i = gew; bilder = bilder.filter((_, j) => j !== i); gew = -1; ebFenster(); melde(L('Bild entfernt', 'Picture removed'), L('Rückgängig', 'Undo'), () => { bilder = vorher; if ($('eb-gitter')) ebFenster(); }); };
  document.addEventListener('dragstart', (ev) => { const t = ev.target.closest?.('.eb-kachel[data-i]'); if (t) { ziehVon = +t.dataset.i; ev.dataTransfer?.setData('text/plain', String(ziehVon)); } });
  document.addEventListener('dragover', (ev) => { if (ziehVon >= 0 && ev.target.closest?.('.eb-kachel[data-i]')) ev.preventDefault(); });
  document.addEventListener('drop', (ev) => { const t = ev.target.closest?.('.eb-kachel[data-i]'); if (ziehVon < 0 || !t) return; ev.preventDefault(); const nach = +t.dataset.i; if (nach !== ziehVon) { bilder = ebVerschiebe(bilder, ziehVon, nach); gew = nach; } ziehVon = -1; ebFenster(); });
  document.addEventListener('dragend', () => { ziehVon = -1; });

  /** Die Seiten eines PDF als Bilder, höchstens `frei` Stück (pdf.js aus dem Vorrat der Reinigung; nichts geht hinaus). */
  async function pdfBilder(d, frei) {
    const P = await pdfjsLaden(), pdf = await P.getDocument({ data: new Uint8Array(await d.arrayBuffer()), isEvalSupported: false }).promise, aus = [], basis = d.name.replace(/\.pdf$/i, '');
    try {
      for (let i = 1; i <= pdf.numPages && aus.length < frei; i++) {
        const seite = await pdf.getPage(i), v1 = seite.getViewport({ scale: 1 }), vp = seite.getViewport({ scale: Math.min(4, EB_KANTE / Math.max(v1.width, v1.height)) });
        const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        await seite.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        const [gross, klein] = await bildGroessen(c, [EB_KANTE, EB_KLEIN], EB_GUETE);
        aus.push({ name: pdf.numPages > 1 ? fuelle(L('{0} S. {1}', '{0} p. {1}'), basis, i) : d.name, gross, klein });
      }
    } finally { pdf.destroy?.(); }
    return aus;
  }
  document.addEventListener('change', async (ev) => {
    if (ev.target.id !== 'eb-datei') return;
    const alle = [...ev.target.files]; ev.target.value = ''; if (!alle.length) return;
    const { gut, zuGross } = ebDateienTeilen(alle.filter((d) => istBild(d) || istPdf(d))), fremd = alle.filter((d) => !istBild(d) && !istPdf(d)).length;
    let neue = [], kaputt = 0, keinPlatz = 0;
    await W.mit(L('Bilder werden verkleinert …', 'Reducing the pictures …'), async (w) => {
      for (let i = 0; i < gut.length; i++) {
        const frei = EB_MAX - bilder.length - neue.length; if (frei <= 0) { keinPlatz += gut.length - i; break; }
        w.anteil(i / gut.length);
        try { const d = gut[i]; if (istPdf(d)) neue.push(...await pdfBilder(d, frei)); else { const [gross, klein] = await bildGroessen(d, [EB_KANTE, EB_KLEIN], EB_GUETE); neue.push({ name: d.name, gross, klein }); } }
        catch { kaputt++; }
      }
    });
    const e = ebDazu(bilder, neue); bilder = e.liste; keinPlatz += e.uebrig;
    if ($('eb-gitter')) ebFenster();
    melde([e.dazu === 1 ? L('+1 Bild', '+1 picture') : fuelle(L('+{0} Bilder', '+{0} pictures'), e.dazu), zuGross.length ? fuelle(L('{0} über {1} MB', '{0} over {1} MB'), zuGross.length, EB_DATEI_MAX / 1048576) : '',
      keinPlatz ? fuelle(L('{0} ohne Platz (höchstens {1})', '{0} without room (at most {1})'), keinPlatz, EB_MAX) : '', kaputt + fremd ? fuelle(L('{0} nicht lesbar', '{0} unreadable'), kaputt + fremd) : ''].filter(Boolean).join(' · '));
  });

  /* ── Ein Bild als Rezeptbild (wie „Als Rezeptbild speichern“ der alten App): das Buch-Bild ersetzt das Bild des Rezepts, Ausschnitt zurück auf die Mitte. ── */
  A['eb-rezeptbild'] = () => {
    if (gew < 0) return; rbZiel = gew;
    const rs = app.Z().rezepte.filter(app.istInhalt).map((r) => [r.uid, app.zeig(r).name]).sort((a, b) => a[1].localeCompare(b[1], spr()));
    if (!rs.length) { melde(L('Kein Rezept da', 'No recipe yet')); return; }
    fenster(`<h2>${L('Als Rezeptbild', 'As recipe picture')}</h2><img class="eb-vorschau" src="${esc(bilder[rbZiel].klein)}" alt="${esc(bilder[rbZiel].name)}">
     <select class="feld" id="eb-rezept" aria-label="${esc(L('Rezept', 'Recipe'))}" style="width:100%">${rs.map(([u, n]) => `<option value="${esc(u)}">${esc(n)}</option>`).join('')}</select>
     <div class="reihe"><button class="knopf akz" data-a="eb-rezeptbild-los">${ic('haken')}${L('Setzen', 'Set')}</button><button class="knopf" data-a="eb-auf">${L('Abbrechen', 'Cancel')}</button></div>`);
  };
  A['eb-rezeptbild-los'] = () => {
    const uid = $('eb-rezept')?.value, b = bilder[rbZiel], r = uid && app.Z().rezepte.find((x) => x.uid === uid); if (!b || !r) return;
    const vorher = app.Z().rezepte;
    app.setzeZ({ ...app.Z(), rezepte: vorher.map((x) => (x.uid === uid ? { ...x, img: b.gross, imgCrop: { x: 50, y: 50, scale: 1 } } : x)) }); sichern(); app.zeichne(); ebFenster();
    melde(fuelle(L('Rezeptbild · {0}', 'Recipe picture · {0}'), app.zeig(r).name), L('Rückgängig', 'Undo'), () => { app.setzeZ({ ...app.Z(), rezepte: vorher }); sichern(); app.zeichne(); });
  };

  /* ── Das Buch aus Bildern: Blättern in der App, PDF, HTML (wie beim Kreativbuch). ── */
  const ebOpt = () => ({ titel: projOffen.name || L('Kreativbuch', 'Creative book'), sprache: spr() });
  A['eb-blaettern'] = () => {
    $('fensterort').innerHTML = `<div class="kb-vorschau" role="dialog" aria-modal="true" aria-label="${esc(L('Aus Bildern', 'From pictures'))}"><iframe id="kb-rahmen" title="${esc(L('Aus Bildern', 'From pictures'))}" sandbox="allow-scripts"></iframe><button class="voll-x" data-a="eb-auf" aria-label="${esc(L('Schließen', 'Close'))}">${ic('x')}</button></div>`;
    $('kb-rahmen').srcdoc = ebBlaettern(bilder, ebOpt());
  };
  A['eb-pdf'] = () => { fensterZu(); drucke(ebPdf(bilder, ebOpt()), { sprache: spr() }).catch((f) => melde(f.message)); };
  const dateiName = (n, endung) => (n.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-') || 'Kreativbuch') + endung;
  const gibDatei = (inhalt, typ, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([inhalt], { type: typ })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
  A['eb-html'] = () => { const o = ebOpt(), html = ebBlaettern(bilder, o); gibDatei(html, 'text/html', dateiName(o.titel, '.html')); melde(fuelle(L('Kreativbuch gespeichert · {0}', 'Creative book saved · {0}'), buchGroesseText(buchGroesse(html), spr()))); };

  /* ── Projekte: im Speicher des Geräts (Liste plus je Projekt ein Eintrag, wie der Tresor). Gespeichert wird, was gerade offen ist:
        Auswahl, Stil, eigener Stil, die Texte der Rezepte in der Auswahl (alle Stile) und die eigenen Bilder. Speichern unter dem Namen des
        geöffneten Projekts ersetzt es; ein anderer Name legt ein neues an. ── */
  const PJ = () => kbProjekte(app.lager());
  const datum = (iso) => new Date(iso).toLocaleDateString(spr(), { day: 'numeric', month: 'numeric', year: 'numeric' });
  const zahlText = (x) => [x.bilder ? (x.bilder === 1 ? L('1 Bild', '1 picture') : fuelle(L('{0} Bilder', '{0} pictures'), x.bilder)) : '', x.texte ? (x.texte === 1 ? L('1 Text', '1 text') : fuelle(L('{0} Texte', '{0} texts'), x.texte)) : ''].filter(Boolean).join(' · ');
  async function kbpFenster() {
    merkEigen();
    const l = await PJ().liste(), name = projOffen.name || fuelle(L('Kreativbuch {0}', 'Creative book {0}'), datum(new Date().toISOString()));
    fenster(`<h2 class="imp-kopf">${ic('ordner')}<span>${L('Projekte', 'Projects')}</span><small class="kb-stand">${l.length}</small></h2>
     <div class="reihe kbp-neu"><input class="feld" id="kbp-name" maxlength="120" value="${esc(name)}" aria-label="${esc(L('Name des Projekts', 'Name of the project'))}"><button class="knopf akz" data-a="kbp-speichern" title="${esc(L('Auswahl, Stil, Texte und Bilder in diesem Gerät ablegen', 'Keep selection, style, texts and pictures on this device'))}">${ic('haken')}${L('Speichern', 'Save')}</button></div>
     <div class="kbp-liste" id="kbp-liste">${l.map((x) => `<div class="kbp-zeile" data-id="${esc(x.id)}"><button class="kbp-auf" data-a="kbp-oeffnen" data-id="${esc(x.id)}" title="${esc(L('Öffnen', 'Open'))}"><b>${esc(x.name || '–')}</b><small>${esc([datum(x.stand), zahlText(x)].filter(Boolean).join(' · '))}</small></button>
       <button class="rund" data-a="kbp-datei" data-id="${esc(x.id)}" aria-label="${esc(L('Als Datei speichern', 'Save as a file'))}" title="${esc(L('Als Datei speichern', 'Save as a file'))}">${ic('laden')}</button><button class="rund rot" data-a="kbp-weg" data-id="${esc(x.id)}" aria-label="${esc(L('Löschen', 'Delete'))}" title="${esc(L('Löschen', 'Delete'))}">${ic('muell')}</button></div>`).join('')}</div>
     <input type="file" id="kbp-datei-ein" accept="${EB_ENDUNG},application/json" hidden>
     <div class="reihe"><button class="knopf" data-a="kbp-laden" title="${esc(L('Eine .kreativbuch-Datei einlesen', 'Read a .kreativbuch file'))}">${ic('datei')}${L('Datei laden', 'Load file')}</button><button class="knopf" data-a="kb-auf">${L('Zurück', 'Back')}</button></div>`);
  }
  const kbpFrisch = async () => { if ($('kbp-liste')) await kbpFenster(); };   /* erst neu zeichnen, dann melden: sonst steht die Meldung vor der Liste */
  A['kbp-auf'] = () => kbpFenster();
  A['kbp-speichern'] = async () => {
    const k = K(), name = ($('kbp-name')?.value || '').trim() || L('Kreativbuch', 'Creative book'), texte = {};
    for (const r of imBuch()) if (k.texte[r.uid]) texte[r.uid] = k.texte[r.uid];
    if (!bilder.length && !Object.keys(texte).length) { melde(L('Noch nichts zu speichern', 'Nothing to save yet')); return; }
    try {
      const p = await W.mit(L('Projekt wird gespeichert …', 'Saving the project …'), () => PJ().ablegen(kbProjekt({ id: projOffen.id && name === projOffen.name ? projOffen.id : '', name, wahl: '', ab: k.ab, stil: k.stil, eigen: k.eigen, texte, bilder })));
      const ersetzt = p.id === projOffen.id; projOffen = { id: p.id, name: p.name }; await kbpFenster();
      melde(fuelle(ersetzt ? L('Ersetzt · {0}', 'Replaced · {0}') : L('Gespeichert · {0}', 'Saved · {0}'), p.name));
    } catch { melde(L('Speichern ist fehlgeschlagen.', 'Saving failed.')); }
  };
  A['kbp-oeffnen'] = async (e) => {
    const p = await PJ().hol(e.dataset.id); if (!p) { kbpFrisch(); return; }
    const k = K(), da = (w) => !w || (w.startsWith('k:') ? app.katNamen().has(w.slice(2)) : app.Z().ordner.some((o) => String(o.id) === w.slice(2)));
    k.ab = p.wahl && da(p.wahl) ? abAusWahl(p.wahl) : p.ab; k.wahl = ''; k.stil = p.stil; k.eigen = p.eigen;   /* ein älteres Projekt mit Kategorie oder Ordner: in Häkchen umgerechnet; eine, die es hier nicht gibt: alle Rezepte */
    for (const [uid, je] of Object.entries(p.texte)) k.texte[uid] = { ...(k.texte[uid] || {}), ...je };
    bilder = p.bilder; gew = -1; projOffen = { id: p.id, name: p.name }; sichern();
    kbFenster(); melde(fuelle(L('Geöffnet · {0}', 'Opened · {0}'), p.name));
  };
  A['kbp-weg'] = async (e) => {
    const p = await PJ().loeschen(e.dataset.id); if (!p) { kbpFrisch(); return; }
    if (projOffen.id === p.id) projOffen = { id: '', name: '' };
    await kbpFrisch(); melde(fuelle(L('„{0}“ gelöscht', '“{0}” deleted'), p.name), L('Rückgängig', 'Undo'), async () => { await PJ().ablegen(p); kbpFrisch(); });
  };
  A['kbp-datei'] = async (e) => { const p = await PJ().hol(e.dataset.id); if (!p) return; gibDatei(kbProjektDatei(p), 'application/json', dateiName(p.name, EB_ENDUNG)); melde(L('Als Datei gespeichert', 'Saved as a file')); };
  A['kbp-laden'] = () => $('kbp-datei-ein')?.click();
  document.addEventListener('change', async (ev) => {
    if (ev.target.id !== 'kbp-datei-ein') return;
    const d = ev.target.files[0]; ev.target.value = ''; if (!d) return;
    try { const p = kbProjektAusDatei(await d.text(), { sprache: spr(), name: d.name.replace(/\.[^.]+$/, '') }); await PJ().ablegen(p); await kbpFrisch(); melde(fuelle(L('+1 Projekt · {0}', '+1 project · {0}'), p.name)); }
    catch (f) { melde(f.message || L('Die Datei konnte nicht gelesen werden.', 'The file could not be read.')); }
  });

  /** Die Zeile im Thema „Buch“ der Einstellungen. */
  const zeileHtml = (zeile) => zeile('kreativ', 'funken', L('Kreativbuch', 'Creative book'), kbStilName(K().stil, spr()));
  return { zeile: zeileHtml, fenster: kbFenster };
}
