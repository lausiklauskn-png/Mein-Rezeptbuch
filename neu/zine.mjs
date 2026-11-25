// Mein Rezeptbuch · Food-Zine: der Poster-Auftrag der alten App (Fluss A) und die Sammlung „Meine Food-Zine-Bilder“ (Kern: ausgabe/zine.mjs).
// Eine eigene Ansicht (`zine`), erreichbar am Rezept („Mehr“ und Bild-Blatt → Food-Zine, dann mit diesem Rezept) und im Bereich Kreativbuch.
// Oben die Einstellungen der alten App: Lieblingsrezept, Bild für die KI, Format, Extras, Trend-Knopf. Darunter das Auftragsfeld: es lässt
// sich ändern; eine eigene Änderung überschreibt die App nicht, sie bietet „Auftrag neu bauen“ an. Kopieren legt Auftrag und Bild in EINEN
// Eintrag der Zwischenablage; „Claude“ und „ChatGPT“ kopieren und öffnen den Chat in einem neuen Tab. Die App ruft dabei keine KI auf und
// braucht keinen Schlüssel – das Bild zeichnet die KI im Chat. Es kostet nichts, was der Chat nicht ohnehin kostet.
// Die Sammlung liegt im Speicher des Geräts (Kern: zineSammlung), nicht in der Sicherung: Bilder samt Original sind groß, und die
// Projekte des Kreativbuchs halten es genauso. Der Weg nach draußen ist „Als Buch“ (Blättern, PDF, HTML-Datei).
// Die Seiten, die bis Fassung 0.15 am Rezept lagen (`r.zine`), und die Beispiel-Sätze wandern einmal in die Sammlung, ohne Doppel.
// Die Hauptdatei (app.mjs) reicht ihre Werkzeuge herein (wie bei zusatz.mjs).
import { ZINE_FORMATE, ZINE_FORMAT_VORGABE, zineFormat, ZINE_EXTRAS, zinePoster, zineTrend, zineFotoHinweis, ZINE_CHAT, ZINE_PNG_KANTE,
  ZS_KANTE, ZS_KLEIN, ZS_GUETE, zsVerschiebe, zsDateienTeilen, ZS_DATEI_MAX, zineSammlung, zineAusRezepten, zineSaetzeBilder, zineDruck } from '../kern/ausgabe/zine.mjs';
import { ebBlaettern, ebPdf } from '../kern/ausgabe/eigenbuch.mjs';
import { buchGroesse, buchGroesseText } from '../kern/ausgabe/buch.mjs';
import { drucke } from '../kern/ausgabe/druck.mjs';
import { bildGroessen } from '../kern/oberflaeche/bild.mjs';
import { fuelle } from '../kern/oberflaeche/sprache.mjs';
import { bytesMitAnteil } from '../kern/oberflaeche/warten.mjs';

/** app: { L, spr, esc, ic, A, s, W, Z(), setzeZ(z), fenster, fensterZu, melde, sichern, zeichne, rezept(uid), zeig(r), geh(ansicht, extra),
 *         lager(), istInhalt, gruppen() → [{ titel, rezepte }], katInfo(r) → { id, name, symbol }, bildAusDatei(blob, kante, guete),
 *         frag(text), katalog(), ausgabe(), tresorAuto() } */
export function zine(app) {
  const { L, spr, esc, ic, A, W, fenster, fensterZu, melde } = app;
  const $ = (id) => document.getElementById(id);
  /* Der Stand der Ansicht. Wie in der alten App nur im Speicher der Seite (Format, Extras, Bild): ein neuer Auftrag beginnt bei der Vorgabe. */
  const Zs = { rid: '', bild: 'rezept', eigen: '', format: ZINE_FORMAT_VORGABE, extras: new Set(), text: '', hand: false, trend: false };
  let liste = [], geladen = null, offen = null, ziel = '', gezogen = 0;
  const SM = () => zineSammlung(app.lager());

  /* ── Namen der Formate und Extras (die Kennungen und Auftragstexte stehen im Kern) ── */
  const FORMAT = () => ({ poster: ['📄', L('Poster', 'Poster'), L('Querformat · Standard', 'Landscape · standard')], a4: ['📋', L('DIN A4', 'DIN A4'), L('Hochformat', 'Portrait')],
    insta: ['📱', L('Instagram', 'Instagram'), L('1:1 · Quadrat', '1:1 · square')], zeitung: ['📰', L('Zeitungsseite', 'Newspaper page'), L('Aufgeschlagene Doppelseite', 'Open double page')],
    karte: ['🎴', L('Rezeptkarte', 'Recipe card'), L('A5 · Kompakt', 'A5 · compact')], panorama: ['🖼️', L('Panorama', 'Panorama'), L('16:9 · Breitformat', '16:9 · widescreen')] });
  const EXTRA = () => ({ nutr: L('Nährwert-Infografik', 'Nutrition infographic'), steps: L('Step-by-Step Diagramm', 'Step-by-step diagram'), shop: L('Einkaufslisten-Block', 'Shopping list block'),
    retro: L('Vintage/Retro-Stil', 'Vintage/retro style'), qr: L('QR-Code Platzhalter', 'QR code placeholder') });

  /* ── Der Auftrag: aus den Einstellungen gebaut, solange niemand das Feld selbst geändert hat ── */
  const rz = () => (Zs.rid ? app.rezept(Zs.rid) : null);
  const bau = () => { if (Zs.trend) return zineTrend(spr()); const r = rz(); return r ? zinePoster(app.zeig(r), { format: Zs.format, extras: [...Zs.extras], sprache: spr(), kategorie: app.katInfo(r) }) : ''; };
  const aktuell = () => { if (!Zs.hand) Zs.text = bau(); return Zs.text; };
  /** Eine Einstellung hat sich geändert: der Trend-Auftrag gilt nicht mehr; ein eigener Text bleibt stehen. */
  const geaendert = () => { Zs.trend = false; frisch(); };

  /* ── Bild für die KI: aus dem Rezept (Vorgabe), ein eigenes (lange Kante 1200 px) oder keins. Das PNG für die Zwischenablage wird schon
        beim Wählen umgerechnet: beim Tipp auf „Claude“ öffnet sofort ein neuer Tab, eine Umrechnung erst dann käme zu spät. ── */
  const quelle = () => (Zs.bild === 'eigen' ? Zs.eigen : Zs.bild === 'rezept' ? rz()?.img || '' : '');
  const png = { von: '', blob: null, warte: null };
  function pngVorbereiten() {
    const q = Zs.trend ? '' : quelle(); if (q === png.von) return png.warte; png.von = q; png.blob = null; png.warte = null; if (!q) return null;
    png.warte = alsPng(q).then((b) => { if (png.von === q) png.blob = b; return b; }).catch(() => null);
    return png.warte;
  }
  async function alsPng(src) {
    const bmp = await createImageBitmap(await (await fetch(src)).blob()), f = Math.min(1, ZINE_PNG_KANTE / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * f)); c.height = Math.max(1, Math.round(bmp.height * f)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
    return new Promise((ja, nein) => c.toBlob((b) => (b ? ja(b) : nein(new Error('png'))), 'image/png'));
  }

  /* ── Die Ansicht ── */
  function bildHtml() {
    const q = quelle(), r = rz(), opt = (w, t) => `<button class="chip" role="radio" aria-checked="${Zs.bild === w}" data-a="zn-bild" data-w="${w}">${esc(t)}</button>`;
    const vor = q ? `<img class="zn-mini" src="${esc(q)}" alt="">${Zs.bild === 'eigen' ? `<button class="knopf" data-a="zn-eigen">${L('Anderes Bild …', 'Other picture …')}</button>` : ''}`
      : Zs.wahl ? `<span class="zn-leise">${L('Tippe unten in „Meine Food-Zine-Bilder“ auf ein Bild.', 'Tap a picture below in “My food zine pictures”.')}</span>`
      : Zs.bild === 'rezept' && r ? `<span class="zn-leise">${L('Dieses Rezept hat noch kein Bild.', 'This recipe has no picture yet.')}</span>` : '';
    return `<div class="laeden" role="radiogroup" aria-label="${esc(L('Bild für die KI', 'Picture for the AI'))}">${opt('rezept', L('📷 Bild aus Rezept', '📷 Picture from recipe'))}${opt('eigen', L('📎 Eigenes Bild', '📎 Own picture'))}${opt('ohne', L('Ohne Bild', 'No picture'))}</div>
     <div class="zn-vorschau" id="zn-vorschau">${vor}</div>`;
  }
  function rezeptWahl() {
    const g = app.gruppen();
    return `<select class="feld" id="zn-rezept" aria-label="${esc(L('Wähle ein Lieblingsrezept', 'Choose a favourite recipe'))}"><option value="">${esc(L('– Kein Lieblingsrezept –', '– No favourite recipe –'))}</option>${g.map((x) => `<optgroup label="${esc(x.titel)}">${x.rezepte.map((r) => `<option value="${esc(r.uid)}" ${r.uid === Zs.rid ? 'selected' : ''}>${esc(app.zeig(r).name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  }
  function auftragHtml() {
    const t = aktuell(), neu = Zs.hand && t !== bau();
    return `<textarea class="feld zn-auftrag" id="zn-auftrag" aria-label="${esc(L('Auftrag kopieren oder selber schreiben', 'Copy the request or write your own'))}" placeholder="${esc(L('Wähle ein Lieblingsrezept oder tippe auf die KI-Überraschung.', 'Choose a favourite recipe or tap the AI surprise.'))}">${esc(t)}</textarea>
     <div class="reihe zn-wege"><button class="knopf akz" data-a="zn-kopieren">${ic('kopieren')}${L('Kopieren', 'Copy')}</button><button class="knopf" data-a="zn-claude" title="${esc(L('Kopiert den Auftrag und öffnet Claude in einem neuen Tab', 'Copies the request and opens Claude in a new tab'))}">${ic('link')}Claude</button><button class="knopf" data-a="zn-chatgpt" title="${esc(L('Kopiert den Auftrag und öffnet ChatGPT in einem neuen Tab', 'Copies the request and opens ChatGPT in a new tab'))}">${ic('link')}ChatGPT</button>
      <button class="knopf" data-a="zn-neu" id="zn-neu" ${neu ? '' : 'hidden'} title="${esc(L('Verwirft deine Änderung im Feld und baut den Auftrag aus den Einstellungen', 'Discards your change in the field and builds the request from the settings'))}">${ic('pfeile')}${L('Auftrag neu bauen', 'Rebuild request')}</button></div>`;
  }
  function sammlungHtml() {
    const n = liste.length;
    return `<div class="gruppe zs ${Zs.wahl ? 'wahl' : ''}" id="zs" data-g="sammlung"><h3>${L('Meine Food-Zine-Bilder', 'My food zine pictures')} · <span id="zs-zahl">${n}</span></h3>
     ${Zs.wahl ? `<div class="zs-wahl-hin" id="zs-wahl-hin" role="status"><span>${L('Tippe auf ein Bild für die KI', 'Tap a picture for the AI')}</span><button class="chip" data-a="zs-wahl-aus">${L('Abbrechen', 'Cancel')}</button></div>` : ''}
     <div class="zs-gitter" id="zs-gitter">${liste.map((e) => `<div class="zs-kachel" role="button" tabindex="0" data-a="zs-gross" data-id="${esc(e.id)}" title="${esc(e.name)}"><img src="${esc(e.klein)}" alt="${esc(e.name)}" draggable="false"><button class="zs-x" data-a="zs-weg" data-id="${esc(e.id)}" aria-label="${esc(L('Entfernen', 'Remove'))}" title="${esc(L('Entfernen', 'Remove'))}">${ic('x')}</button></div>`).join('')}<button class="zs-kachel zs-dazu" data-a="zs-dazu" aria-label="${esc(L('Bilder hinzufügen', 'Add pictures'))}" title="${esc(fuelle(L('Bilder hinzufügen, bis {0} MB je Datei', 'Add pictures, up to {0} MB per file'), ZS_DATEI_MAX / 1048576))}">${ic('plus')}</button></div>
     <input type="file" id="zs-datei" accept="image/*" multiple hidden>
     ${n ? `<div class="reihe zs-buch" id="zs-buch"><span class="zn-leise">${L('Als Buch', 'As a book')}</span><button class="knopf" data-a="zs-blaettern">${ic('buch')}${L('Blättern', 'Leaf through')}</button><button class="knopf" data-a="zs-pdf">${ic('drucken')}PDF</button><button class="knopf" data-a="zs-html">${ic('laden')}HTML</button></div>` : ''}
     ${n > 1 ? `<p class="quelle">${L('Lange drücken oder mit der Maus ziehen ordnet die Bilder. Tippen zeigt ein Bild groß.', 'Long-press or drag with the mouse to order the pictures. Tap shows a picture large.')}</p>` : ''}</div>`;
  }
  function innen() {
    const F = FORMAT(), E = EXTRA();
    /* Am breiten Schirm zwei Spalten (Klaus 25.11.; nach der Breite der Ansicht, nicht des Fensters): links die Wahl, rechts Auftrag und Sammlung */
    return `<div class="zn-spalten"><div class="zn-links"><div class="gruppe" data-g="rezept"><h3>${L('Wähle ein Lieblingsrezept', 'Choose a favourite recipe')}</h3>${rezeptWahl()}</div>
     <div class="gruppe" data-g="bild"><h3>${L('Bild für die KI', 'Picture for the AI')}</h3>${bildHtml()}</div>
     <div class="gruppe" data-g="format"><h3>${L('Format wählen', 'Choose a format')}</h3><div class="zn-formate" role="radiogroup" aria-label="${esc(L('Format wählen', 'Choose a format'))}">${ZINE_FORMATE.map((id) => `<button class="zn-format" role="radio" aria-checked="${id === Zs.format}" data-a="zn-format" data-f="${id}" title="${esc(L('Beispiel groß: Maus darauf oder lange drücken', 'Example large: hover or long-press'))}"><img class="zn-bsp" src="./zine-beispiele/${id}-klein.webp?v=1" alt="" loading="lazy" decoding="async"><b>${esc(F[id][1])}</b><small>${esc(F[id][2])}</small></button>`).join('')}</div></div>
     <div class="gruppe" data-g="extras"><h3>${L('Extras (optional)', 'Extras (optional)')}</h3><div class="liste zn-extras">${ZINE_EXTRAS.map((id) => `<label class="zeile"><input type="checkbox" data-extra="${id}" ${Zs.extras.has(id) ? 'checked' : ''}><span>${esc(E[id])}</span></label>`).join('')}</div></div>
     <button class="knopf zn-trend" data-a="zn-trend">${L('🔥 KI-Überraschung: Trendrezepte entdecken!', '🔥 AI surprise: discover trend recipes!')}</button></div>
     <div class="zn-rechts"><div class="gruppe" data-g="auftrag"><h3>${L('Auftrag kopieren oder selber schreiben', 'Copy the request or write your own')}</h3>${auftragHtml()}</div>
     ${sammlungHtml()}</div></div>`;
  }
  /** Die Ansicht `zine` (app.mjs zeichnet sie). */
  function html() {
    if (!geladen) laden();
    pngVorbereiten();
    return `<div class="ueber"><h2 style="font-size:19px">${ic('zine')}${L('Food-Zine', 'Food zine')}</h2>${app.frag(L('Hier entsteht der Auftrag für ein Food-Zine-Poster: Rezept, Bild, Format und Extras wählen, den Auftrag kopieren und in Claude oder ChatGPT einfügen; das Bild zeichnet die KI im Chat. Die App sendet dabei nichts und braucht keinen Schlüssel. Das fertige Bild legst du unter „Meine Food-Zine-Bilder“ ab: dort bleibt es in diesem Gerät, lässt sich ordnen, drucken, als Rezeptbild setzen oder mit allen anderen als Buch ausgeben.', 'Here you build the request for a food zine poster: choose recipe, picture, format and extras, copy the request and paste it into Claude or ChatGPT; the AI draws the picture in the chat. The app sends nothing and needs no key. You keep the finished picture under “My food zine pictures”: it stays on this device and can be ordered, printed, set as a recipe picture or output with all the others as a book.'))}</div>
     <div class="zine-ansicht" id="zine-ansicht">${innen()}</div>`;
  }
  /** Nur die Ansicht neu zeichnen (das Feld bleibt, wo es war; die Seite springt nicht). */
  function frisch() { const z = $('zine-ansicht'); if (!z) return; const y = scrollY; z.innerHTML = innen(); pngVorbereiten(); scrollTo(0, y); }

  /* ── Einstieg ── */
  const auf = (zuSammlung = false) => { app.geh('zine', { uid: app.s.uid }); if (zuSammlung) requestAnimationFrame(() => $('zs')?.scrollIntoView({ block: 'start' })); };
  A.zine = () => { if (app.s.uid && app.rezept(app.s.uid)) { if (Zs.rid !== app.s.uid) { Zs.rid = app.s.uid; Zs.trend = false; } } fensterZu(); auf(); };   /* am Rezept: mit diesem Rezept */
  A['zine-auf'] = () => auf();
  A['kreativ-zine'] = () => auf(true);
  /* Klaus 25.11.: das eigene Bild für die KI kommt aus „Meine Food-Zine-Bilder“ (dort liegen beliebige Bilder). „Eigenes Bild“ schaltet die
     Sammlung in den Wahl-Modus und führt hin; ein Tipp auf ein Bild wählt es. Ist die Sammlung leer, öffnet es gleich die Dateiwahl: das neue
     Bild kommt in die Sammlung und ist gewählt. Bricht man ab, bleibt die vorige Wahl. Kein eigener Dateiweg nur für das KI-Bild. */
  const wahlAn = () => {
    if (!liste.length) { Zs.wahlNeu = true; $('zs-datei')?.click(); return; }
    Zs.wahl = true; frisch(); requestAnimationFrame(() => $('zs')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };
  A['zn-bild'] = (e) => { if (e.dataset.w === 'eigen' && !Zs.eigen) { wahlAn(); return; } Zs.bild = e.dataset.w; Zs.wahl = false; frisch(); };
  A['zn-eigen'] = () => wahlAn();
  A['zs-wahl-aus'] = () => { Zs.wahl = false; frisch(); };
  /** Ein Bild der Sammlung wird das Bild für die KI (das große, 1600 px; das PNG für die Zwischenablage wird wie bisher vorbereitet). */
  async function waehle(id) {
    const b = await SM().hol(id); if (!b) return;
    Zs.eigen = b.gross; Zs.eigenId = id; Zs.bild = 'eigen'; Zs.wahl = false; frisch(); $('zn-vorschau')?.scrollIntoView({ block: 'nearest' });
  }
  A['zn-format'] = (e) => { if (Date.now() - bspGross < 500) return; Zs.format = zineFormat(e.dataset.f); geaendert(); };
  /* R22 (Klaus 25.11., seine Bilder): ein Beispiel je Format. Klein in der Kachel (im Offline-Vorrat); groß erst, wenn man es ansieht:
     Maus darauf, Finger lange drücken (450 ms). Loslassen schließt; ein langer Druck wählt das Format nicht. */
  let bspUhr = null, bspGross = 0;
  const bspZeigen = (k) => { bspWeg(); const f = k.dataset.f, F = FORMAT()[f]; if (!F) return; const d = document.createElement('div'); d.id = 'zn-gross'; d.setAttribute('role', 'img'); d.setAttribute('aria-label', fuelle(L('Beispiel: {0}', 'Example: {0}'), F[1]));
    d.innerHTML = `<img src="./zine-beispiele/${f}-gross.webp?v=1" alt=""><span>${esc(F[1])} · ${esc(F[2])}</span>`; document.body.appendChild(d); };
  const bspWeg = () => document.getElementById('zn-gross')?.remove();
  document.addEventListener('pointerover', (ev) => { if (ev.pointerType !== 'mouse') return; const k = ev.target.closest?.('.zn-format'); if (k && !k.contains(ev.relatedTarget)) bspZeigen(k); });
  document.addEventListener('pointerout', (ev) => { if (ev.pointerType !== 'mouse') return; const k = ev.target.closest?.('.zn-format'); if (k && !k.contains(ev.relatedTarget)) bspWeg(); });
  document.addEventListener('pointerdown', (ev) => { if (ev.pointerType === 'mouse') return; const k = ev.target.closest?.('.zn-format'); if (!k) return; clearTimeout(bspUhr); bspUhr = setTimeout(() => { bspGross = Date.now(); bspZeigen(k); navigator.vibrate?.(10); }, 450); });
  const bspLos = (ev) => { if (ev.pointerType === 'mouse') return; clearTimeout(bspUhr); if (document.getElementById('zn-gross')) { bspGross = Date.now(); bspWeg(); } };
  document.addEventListener('pointerup', bspLos); document.addEventListener('pointercancel', bspLos);
  document.addEventListener('contextmenu', (ev) => { if (ev.target.closest?.('.zn-format')) ev.preventDefault(); });
  A['zn-trend'] = () => { Zs.trend = true; Zs.hand = false; frisch(); $('zn-auftrag')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  A['zn-neu'] = () => { Zs.hand = false; frisch(); };
  document.addEventListener('change', async (ev) => {
    const t = ev.target;
    if (t.id === 'zn-rezept') { Zs.rid = t.value; Zs.bild = Zs.bild === 'eigen' ? 'eigen' : 'rezept'; geaendert(); return; }
    if (t.dataset?.extra && t.closest?.('#zine-ansicht')) { if (t.checked) Zs.extras.add(t.dataset.extra); else Zs.extras.delete(t.dataset.extra); geaendert(); return; }
  });
  document.addEventListener('input', (ev) => {
    if (ev.target.id !== 'zn-auftrag') return;
    Zs.text = ev.target.value; Zs.hand = Zs.text !== bau();
    const k = $('zn-neu'); if (k) k.hidden = !Zs.hand;
  });

  /* ── Kopieren und in den Chat. Mit Bild: Auftrag samt Satz zum Foto und das PNG in EINEM Eintrag der Zwischenablage. ── */
  async function kopiere() {
    const feld = $('zn-auftrag'), t = feld ? feld.value : aktuell();
    if (!t.trim()) { melde(L('Wähle zuerst ein Lieblingsrezept.', 'Choose a favourite recipe first.')); return false; }
    const mitBild = !Zs.trend && !!quelle();
    if (mitBild && navigator.clipboard?.write && globalThis.ClipboardItem) {
      try {
        const b = png.blob || (await pngVorbereiten()); if (!b) throw new Error('png');
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([t + '\n\n' + zineFotoHinweis(spr())], { type: 'text/plain' }), 'image/png': b })]);
        melde(L('Text und Bild kopiert – im Chat einfach einfügen', 'Text and picture copied – just paste them in the chat')); return true;
      } catch { /* dieser Browser nimmt kein Bild: dann nur der Text, und das wird gesagt */ }
    }
    try {
      await navigator.clipboard.writeText(t);
      melde(mitBild ? L('Nur der Text ist kopiert – dieser Browser nimmt kein Bild in die Zwischenablage', 'Only the text is copied – this browser takes no picture into the clipboard') : L('Auftrag kopiert', 'Request copied'));
      return true;
    } catch { melde(L('Kopieren ging nicht', 'Copying failed')); return false; }
  }
  /* Erst kopieren (das Dokument hat noch den Fokus), dann im selben Tipp den Tab öffnen (sonst hält ihn der Browser auf). */
  const zumChat = (adresse) => { const k = kopiere(); window.open(adresse, '_blank', 'noopener'); return k; };
  A['zn-kopieren'] = () => kopiere();
  A['zn-claude'] = () => zumChat(ZINE_CHAT.claude);
  A['zn-chatgpt'] = () => zumChat(ZINE_CHAT.chatgpt);

  /* ── Die Sammlung ── */
  async function laden() { geladen = (async () => { try { liste = await SM().liste(); } catch { liste = []; } sammlungFrisch(); })(); return geladen; }
  const sammlungFrisch = () => { const z = $('zs'); if (z) z.outerHTML = sammlungHtml(); const k = document.querySelector('.kr-teil [data-a=kreativ-zine] small'); if (k) k.textContent = String(liste.length); };
  const anzahl = () => liste.length;
  A['zs-dazu'] = () => { Zs.wahlNeu = !!Zs.wahl; $('zs-datei')?.click(); };   /* „+“ im Wahl-Modus: hinzufügen und gleich wählen */
  document.addEventListener('change', async (ev) => {
    if (ev.target.id !== 'zs-datei') return;
    const alle = [...ev.target.files], waehlen = Zs.wahlNeu; Zs.wahlNeu = false; ev.target.value = ''; if (!alle.length) return;
    const { gut, zuGross } = zsDateienTeilen(alle.filter((d) => /^image\//.test(d.type))), fremd = alle.filter((d) => !/^image\//.test(d.type)).length; let kaputt = 0;
    const neue = [];
    await W.mit(L('Bilder werden verkleinert …', 'Reducing the pictures …'), async (w) => {
      for (let i = 0; i < gut.length; i++) {
        w.anteil(i / gut.length); const d = gut[i];
        try { const [gross, klein] = await bildGroessen(d, [ZS_KANTE, ZS_KLEIN], ZS_GUETE); neue.push({ name: d.name.replace(/\.[^.]+$/, ''), gross, klein, orig: /^image\/(jpeg|png|webp|gif)$/.test(d.type) ? d : null }); }
        catch { kaputt++; }
      }
    });
    let dazu = [];
    try { dazu = await SM().dazu(neue); } catch { melde(L('Speichern ist fehlgeschlagen.', 'Saving failed.')); return; }
    liste = await SM().liste(); sammlungFrisch();
    if (waehlen && dazu.length) await waehle(dazu[0].id ?? dazu[0]);
    melde([dazu.length === 1 ? L('+1 Bild', '+1 picture') : fuelle(L('+{0} Bilder', '+{0} pictures'), dazu.length), zuGross.length ? fuelle(L('{0} über {1} MB', '{0} over {1} MB'), zuGross.length, ZS_DATEI_MAX / 1048576) : '', kaputt + fremd ? fuelle(L('{0} nicht lesbar', '{0} unreadable'), kaputt + fremd) : ''].filter(Boolean).join(' · '));
  });
  /** Entfernen mit Rückgängig (aus der Kachel und aus der Großansicht). */
  async function weg(id) {
    const i = liste.findIndex((e) => e.id === id), voll = !!document.querySelector('.zs-voll');
    const x = await SM().weg(id); if (!x) return; liste = await SM().liste(); sammlungFrisch();
    if (voll) { const n = liste[Math.min(i, liste.length - 1)]; if (n) await gross(n.id); else A['zs-zu'](); }   /* Klaus 25.11.: weiter mit dem nächsten (oder dem vorigen, wenn es das letzte war) */
    melde(L('Bild entfernt', 'Picture removed'), L('Rückgängig', 'Undo'), async () => { await SM().zurueck(x); liste = await SM().liste(); sammlungFrisch(); });
  }
  A['zs-weg'] = (e) => weg(e.dataset.id);
  A['zs-weg-voll'] = () => offen && weg(offen.id);

  /* Großansicht: das Original (sonst das große Bild), darunter Drucken, Als Rezeptbild, Entfernen. */
  let objUrl = '';
  /* Großansicht mit Blättern (Klaus 25.11.): Pfeile links und rechts am Bildrand (am Anfang und Ende ausgeblendet, kein Ringlauf), Wischen,
     Pfeiltasten; der Zähler steht bei der Beschriftung. Drucken, Als Rezeptbild und Entfernen gelten dem gezeigten Bild. */
  A['zs-gross'] = async (e) => { if (Date.now() - gezogen < 400) return; if (Zs.wahl) { await waehle(e.dataset.id); return; } await gross(e.dataset.id); };   /* im Wahl-Modus wählt ein Tipp */
  async function gross(id) {
    const i = liste.findIndex((x) => x.id === id), ein = liste[i], b = ein && (await SM().hol(ein.id)); if (!b) return;
    if (objUrl) URL.revokeObjectURL(objUrl); objUrl = b.orig instanceof Blob ? URL.createObjectURL(b.orig) : '';
    offen = { ...ein, ...b };
    const pf = (d, ico, t, da) => `<button class="zs-pf ${d < 0 ? 'li' : 're'}" data-a="zs-schritt" data-d="${d}" aria-label="${esc(t)}" title="${esc(t)}" ${da ? '' : 'hidden'}>${ic(ico)}</button>`;
    $('fensterort').innerHTML = `<div class="vollbild zs-voll" data-a="zs-zu" role="dialog" aria-modal="true" aria-label="${esc(ein.name)}"><img src="${esc(objUrl || b.gross)}" alt="${esc(ein.name)}"><button class="voll-x" data-a="zs-zu" aria-label="${esc(L('Schließen', 'Close'))}">${ic('x')}</button>
      ${pf(-1, 'links', L('Voriges Bild', 'Previous picture'), i > 0)}${pf(1, 'rechts', L('Nächstes Bild', 'Next picture'), i < liste.length - 1)}
      <div class="zs-leiste" data-a="nichts"><b>${esc(ein.name)} <small class="zs-nr" id="zs-nr">${i + 1} / ${liste.length}</small></b><div class="reihe"><button class="knopf" data-a="zs-druck">${ic('drucken')}${L('Drucken / PDF', 'Print / PDF')}</button><button class="knopf" data-a="zs-rezeptbild">${ic('bild')}${L('Als Rezeptbild', 'As recipe picture')}</button><button class="knopf" data-a="zs-fuer-ki">${ic('funken')}${L('Für die KI verwenden', 'Use for the AI')}</button><button class="knopf rot" data-a="zs-weg-voll">${ic('muell')}${L('Entfernen', 'Remove')}</button></div></div></div>`;
  }
  const blaettern = (d) => { if (!offen || !document.querySelector('.zs-voll')) return; const n = liste[liste.findIndex((x) => x.id === offen.id) + d]; if (n) gross(n.id); };
  A['zs-schritt'] = (e) => blaettern(+e.dataset.d);
  A['zs-fuer-ki'] = async () => { if (!offen) return; const id = offen.id; A['zs-zu'](); await waehle(id); $('zn-vorschau')?.scrollIntoView({ block: 'center' }); melde(L('Bild für die KI gewählt', 'Picture for the AI chosen')); };
  document.addEventListener('keydown', (ev) => { if (!document.querySelector('.zs-voll') || document.querySelector('.fenster')) return; if (ev.key === 'ArrowRight') blaettern(1); else if (ev.key === 'ArrowLeft') blaettern(-1); });
  let wisch = null, gewischt = 0;
  document.addEventListener('touchstart', (ev) => { wisch = ev.target.closest?.('.zs-voll') && !ev.target.closest('button, .zs-leiste') ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY } : null; }, { passive: true });
  document.addEventListener('touchend', (ev) => { if (!wisch) return; const t = ev.changedTouches[0], dx = t.clientX - wisch.x, dy = t.clientY - wisch.y; wisch = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { gewischt = Date.now(); blaettern(dx < 0 ? 1 : -1); } }, { passive: true });
  A.nichts = () => {};
  A['zs-zu'] = () => { if (Date.now() - gewischt < 500) return; /* ein Wischen ist kein Tipp zum Schließen */ fensterZu(); if (objUrl) { URL.revokeObjectURL(objUrl); objUrl = ''; } };
  const alsDaten = (blob) => new Promise((ja, nein) => { const f = new FileReader(); f.onload = () => ja(f.result); f.onerror = () => nein(f.error); f.readAsDataURL(blob); });
  A['zs-druck'] = async () => {
    if (!offen) return; let bild = offen.gross;
    if (offen.orig instanceof Blob) { try { bild = await alsDaten(offen.orig); } catch { /* dann das große Bild */ } }
    drucke(zineDruck(bild, { titel: offen.name, sprache: spr() }), { sprache: spr() }).catch((f) => melde(f.message));
  };
  A['zs-rezeptbild'] = () => {
    if (!offen) return; ziel = offen.id;
    const rs = app.Z().rezepte.filter(app.istInhalt).map((r) => [r.uid, app.zeig(r).name]).sort((a, b) => a[1].localeCompare(b[1], spr()));
    if (!rs.length) { melde(L('Kein Rezept da', 'No recipe yet')); return; }
    fenster(`<h2>${L('Als Rezeptbild', 'As recipe picture')}</h2><img class="eb-vorschau" src="${esc(offen.klein)}" alt="${esc(offen.name)}">
     <select class="feld" id="zs-rezept" aria-label="${esc(L('Rezept', 'Recipe'))}" style="width:100%">${rs.map(([u, n]) => `<option value="${esc(u)}" ${u === Zs.rid ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
     <div class="reihe"><button class="knopf akz" data-a="zs-rezeptbild-los">${ic('haken')}${L('Setzen', 'Set')}</button><button class="knopf" data-a="fenster-zu">${L('Abbrechen', 'Cancel')}</button></div>`);
  };
  A['zs-rezeptbild-los'] = async () => {
    const uid = $('zs-rezept')?.value, b = await SM().hol(ziel), r = uid && app.rezept(uid); if (!b || !r) return;
    const vorher = app.Z().rezepte;
    app.setzeZ({ ...app.Z(), rezepte: vorher.map((x) => (x.uid === uid ? { ...x, img: b.gross, imgCrop: { x: 50, y: 50, scale: 1 } } : x)) }); app.sichern(); fensterZu(); app.zeichne();
    melde(fuelle(L('Rezeptbild · {0}', 'Recipe picture · {0}'), app.zeig(r).name), L('Rückgängig', 'Undo'), () => { app.setzeZ({ ...app.Z(), rezepte: vorher }); app.sichern(); app.zeichne(); });
  };

  /* Als Buch: die ganze Sammlung in ihrer Reihenfolge (Kern: eigenbuch.mjs). */
  async function buchBilder() { const aus = []; for (const e of liste) { const b = await SM().hol(e.id); if (b) aus.push({ name: e.name, klein: e.klein, gross: b.gross }); } return aus; }
  const buchOpt = () => ({ titel: L('Meine Food-Zine-Bilder', 'My food zine pictures'), sprache: spr() });
  A['zs-blaettern'] = async () => {
    const bilder = await W.mit(L('Buch wird gebaut …', 'Building the book …'), buchBilder);
    $('fensterort').innerHTML = `<div class="kb-vorschau" role="dialog" aria-modal="true" aria-label="${esc(L('Meine Food-Zine-Bilder', 'My food zine pictures'))}"><iframe id="zs-rahmen" sandbox="allow-scripts" title="${esc(L('Meine Food-Zine-Bilder', 'My food zine pictures'))}"></iframe><button class="voll-x" data-a="fenster-zu" aria-label="${esc(L('Schließen', 'Close'))}">${ic('x')}</button></div>`;
    $('zs-rahmen').srcdoc = ebBlaettern(bilder, buchOpt());
  };
  A['zs-pdf'] = async () => { const bilder = await buchBilder(); drucke(ebPdf(bilder, buchOpt()), { sprache: spr() }).catch((f) => melde(f.message)); };
  A['zs-html'] = async () => {
    const o = buchOpt(), html = ebBlaettern(await buchBilder(), o), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = o.titel.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-') + '.html';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    melde(fuelle(L('Buch gespeichert · {0}', 'Book saved · {0}'), buchGroesseText(buchGroesse(html), spr())));
  };

  /* ── Ordnen: Finger lange drücken (400 ms), Maus ziehen. Ein Strich zeigt das Ziel; losgelassen wird die neue Folge gespeichert. ── */
  let zg = null;
  const zielUnter = (x, y) => document.elementFromPoint(x, y)?.closest?.('.zs-kachel[data-id]') || null;
  const zgAn = () => { if (!zg || zg.an) return; zg.an = true; zg.el.classList.add('zieht'); navigator.vibrate?.(15); };
  document.addEventListener('pointerdown', (ev) => {
    const el = ev.target.closest?.('.zs-kachel[data-id]'); if (!el || ev.target.closest('.zs-x') || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    zg = { el, id: el.dataset.id, x: ev.clientX, y: ev.clientY, maus: ev.pointerType === 'mouse', an: false, ziel: null, uhr: ev.pointerType === 'mouse' ? null : setTimeout(zgAn, 400) };
  });
  document.addEventListener('pointermove', (ev) => {
    if (!zg) return; const weit = Math.hypot(ev.clientX - zg.x, ev.clientY - zg.y);
    if (!zg.an) { if (zg.maus && weit > 6) zgAn(); else if (!zg.maus && weit > 10) { clearTimeout(zg.uhr); zg = null; return; } else return; }   /* der Finger rollt die Seite, bevor der lange Druck greift */
    ev.preventDefault();
    zg.el.style.transform = `translate(${ev.clientX - zg.x}px,${ev.clientY - zg.y}px)`;
    const z = zielUnter(ev.clientX, ev.clientY); document.querySelectorAll('.zs-kachel.ziel').forEach((k) => k !== z && k.classList.remove('ziel'));
    if (z && z !== zg.el) { z.classList.add('ziel'); zg.ziel = z.dataset.id; } else zg.ziel = null;
  });
  const zgLos = async () => {
    if (!zg) return; const g = zg; zg = null; clearTimeout(g.uhr); if (!g.an) return;
    gezogen = Date.now(); g.el.classList.remove('zieht'); g.el.style.transform = ''; document.querySelectorAll('.zs-kachel.ziel').forEach((k) => k.classList.remove('ziel'));
    if (!g.ziel) return;
    const ids = liste.map((e) => e.id), von = ids.indexOf(g.id), nach = ids.indexOf(g.ziel); if (von < 0 || nach < 0) return;
    liste = zsVerschiebe(liste, von, nach); sammlungFrisch();
    try { await SM().ordnen(liste.map((e) => e.id)); } catch { melde(L('Speichern ist fehlgeschlagen.', 'Saving failed.')); }
  };
  document.addEventListener('pointerup', zgLos); document.addEventListener('pointercancel', () => { if (zg && !zg.an) { clearTimeout(zg.uhr); zg = null; } else zgLos(); });
  document.addEventListener('touchmove', (ev) => { if (zg?.an) ev.preventDefault(); }, { passive: false });   /* beim Ziehen rollt die Seite nicht mit */
  document.addEventListener('contextmenu', (ev) => { if (ev.target.closest?.('.zs-kachel')) ev.preventDefault(); });   /* der lange Druck öffnet kein Bildmenü */

  /* ── Einmal: die alten Seiten am Rezept (r.zine) wandern in die Sammlung. Doppeltes (gleiche Prüfsumme) und schon einmal
        Übernommenes kommt nicht noch einmal. Die Rezepte verlieren das Feld erst, wenn die Bilder sicher abgelegt sind. ── */
  const summe = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  async function uebernimm(bilder) {
    const sm = SM(), schon = await sm.uebernommen(), neue = [], gesehen = new Set();
    for (const b of bilder) {
      const s = await summe(b.gross); if (schon.has(s) || gesehen.has(s)) continue; gesehen.add(s);
      try { const [klein] = await bildGroessen(await (await fetch(b.gross)).blob(), [ZS_KLEIN], ZS_GUETE); neue.push({ ...b, klein, summe: s }); } catch { /* ein Bild, das sich nicht lesen lässt, bleibt draußen */ }
    }
    const dazu = neue.length ? await sm.dazu(neue) : [];
    liste = await sm.liste(); sammlungFrisch(); return { dazu: dazu.length, schonDa: bilder.length - neue.length };
  }
  let zieht = false;
  async function nachziehen() {
    if (zieht || !app.Z().rezepte.some((r) => r && 'zine' in r)) return; zieht = true;
    try {
      const e = zineAusRezepten(app.Z().rezepte), u = await uebernimm(e.bilder);
      const jetzt = zineAusRezepten(app.Z().rezepte);   /* inzwischen geändert? dann den neuesten Stand ohne das Feld */
      app.setzeZ({ ...app.Z(), rezepte: jetzt.rezepte }); app.sichern();
      if (u.dazu) melde(u.dazu === 1 ? L('1 Food-Zine-Seite liegt jetzt unter „Meine Food-Zine-Bilder“', '1 food zine page is now under “My food zine pictures”') : fuelle(L('{0} Food-Zine-Seiten liegen jetzt unter „Meine Food-Zine-Bilder“', '{0} food zine pages are now under “My food zine pictures”'), u.dazu));
    } catch { /* beim nächsten Speichern noch einmal; das Feld bleibt bis dahin am Rezept */ } finally { zieht = false; }
  }

  /* ── Beispiel-Sätze: das Paket „foodzine-beispiele“ der Ausgabe, auf Tippen geladen, Prüfsumme nachgerechnet; die Seiten kommen in die Sammlung. ── */
  const paket = () => app.katalog()?.pakete?.find((p) => p.art === 'foodzine' && (app.ausgabe().beispiele || []).includes(p.id));
  const beispielZeile = (zeile) => { const p = paket(); return p ? zeile('zine-beispiele', 'zine', L('Food-Zine-Beispiele laden', 'Load food zine examples'), fuelle(L('{0} Sätze, {1} MB', '{0} sets, {1} MB'), p.anzahl, (p.bytes / 1e6).toFixed(0))) : ''; };
  A['zine-beispiele'] = async () => {
    const p = paket(); if (!p) return;
    try {
      const roh = await W.mit(L('Food-Zine-Beispiele werden geladen …', 'Loading the food zine examples …'), async (w) => { const ant = await fetch('../beispiele/' + p.datei); if (!ant.ok) throw new Error(String(ant.status)); return bytesMitAnteil(ant, (a) => w.anteil(a)); });
      const sum = [...new Uint8Array(await crypto.subtle.digest('SHA-256', roh))].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (sum !== p.sha256) { melde(L('Food-Zine-Beispiele beschädigt, nicht eingelesen', 'Food zine examples damaged, not imported')); return; }
      const u = await W.mit(L('Food-Zine-Beispiele werden abgelegt …', 'Storing the food zine examples …'), () => uebernimm(zineSaetzeBilder(JSON.parse(new TextDecoder().decode(roh)))));
      melde([u.dazu === 1 ? L('+1 Food-Zine-Bild', '+1 food zine picture') : fuelle(L('+{0} Food-Zine-Bilder', '+{0} food zine pictures'), u.dazu), u.schonDa ? fuelle(L('{0} schon da', '{0} already there'), u.schonDa) : ''].filter(Boolean).join(' · '));
    } catch { melde(L('Food-Zine-Beispiele nicht geladen. Netz?', 'Food zine examples not loaded. Network?')); }
  };

  /* ── Zeile im Menü am Rezept und im Bild-Blatt ── */
  const stand = () => L('Poster-Auftrag für Claude oder ChatGPT', 'Poster request for Claude or ChatGPT');

  return { html, stand, anzahl, laden, nachziehen, beispielZeile };
}
