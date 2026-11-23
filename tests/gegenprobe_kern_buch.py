# Gegenprobe zu test/kern-buch.test.js (kern) und tests/smoke_kern_buch.mjs (browser): je Fall eine Sabotage in einer Wegwerf-Kopie;
# die Probe muss ROT werden, und die rote Zeile muss den Namen der Zusicherung tragen (kern: Name der Probe oder Text der Zusicherung).
# Aufruf: python3 -u tests/gegenprobe_kern_buch.py   (NUR_FALL=a,b · NUR_ANKER=1)
# Fälle mit „skript“ ändern das Skript des Blätterbuchs; dort wird die Prüfsumme in der Kopie nachgezogen – sonst liefe das Skript
# gar nicht, und jeder Fall wäre aus demselben falschen Grund rot.
import subprocess, shutil, os, tempfile, sys
B='kern/ausgabe/buch.mjs'; D='kern/ausgabe/druck.mjs'
F=[
 # ── Entschärfung ──
 ('esc-name-im-verzeichnis', '<a href="#r${e.nr}">${esc(e.name)}</a>', '<a href="#r${e.nr}">${e.name}</a>', B, 'kern', 'Sonderzeichen sind entschärft', 0),
 ('esc-kategorie-im-verzeichnis', '<li><span class="ik">${esc(g.name)}</span>\\n<ul>\\n${g.rezepte.map((e) => `<li><span class="in">', '<li><span class="ik">${g.name}</span>\\n<ul>\\n${g.rezepte.map((e) => `<li><span class="in">', B, 'kern', 'Sonderzeichen sind entschärft', 0),
 ('esc-titel-des-dokuments', '${kopf}<title>${esc(titel)}</title>', '${kopf}<title>${titel}</title>', B, 'kern', 'Sonderzeichen sind entschärft', 0),
 ('esc-untertitel', '<p class="unter">${esc(unter)}</p>', '<p class="unter">${unter}</p>', B, 'kern', 'Sonderzeichen sind entschärft', 0),
 ('esc-rezeptname', '`<${h}>${esc(name)}</${h}>`,', '`<${h}>${name}</${h}>`,', D, 'browser', 'ein Rezeptname mit <b> steht wörtlich da', 0),
 ('esc-zutat', '<td>${esc(z.name)}${z.note', '<td>${z.name}${z.note', D, 'browser', 'aus dem Rezepttext entsteht kein Element', 0),
 ('esc-name-im-blaetter-verzeichnis', '<span class="it">${esc(e.name)}</span>', '<span class="it">${e.name}</span>', B, 'browser', 'auch im Verzeichnis', 0),
 ('farbe-ungeprueft', "export const druckFarbe = (f) => (typeof f === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(f.trim()) ? f.trim() : DRUCK_FARBE);", "export const druckFarbe = (f) => (typeof f === 'string' ? f.trim() : DRUCK_FARBE);", D, 'kern', 'Sonderzeichen sind entschärft', 0),
 # ── Bilder ──
 ('bild-mit-fremder-adresse', "export const druckBild = (img) => (typeof img === 'string' && /^data:image\\/(?:jpeg|jpg|png|webp|gif|avif|bmp);base64,[A-Za-z0-9+/]+=*$/.test(img) ? img : '');", "export const druckBild = (img) => (typeof img === 'string' ? img : '');", D, 'kern', 'eine Adresse im Netz, javascript: oder SVG kommt nie ins Dokument', 0),
 ('ohne-bilder-pdf', 'mitBild: mitBildern, stufe: 3', 'mitBild: true, stufe: 3', B, 'kern', 'ohne Bilder kein <img>', 0),
 ('ohne-bilder-blaettern', 'mitBild: mitBildern, stufe: 2', 'mitBild: true, stufe: 2', B, 'kern', 'ohne Bilder kein <img>', 0),
 ('ohne-bilder-deckblatt', 'bilder = mitBildern ? deckBilder(b.gruppen) : [];', 'bilder = deckBilder(b.gruppen);', B, 'kern', 'ohne Bilder kein <img>', 0),
 ('ausschnitt-fuer-alle', 'if (t.ausschnitt) ausschnitte += `#r${e.nr} .bild img{${t.ausschnitt}}\\n`;', 'if (t.ausschnitt) ausschnitte += `.bild img{${t.ausschnitt}}\\n`;', B, 'kern', 'PDF: Deckblatt, Inhaltsverzeichnis', 0),
 # ── Gliederung ──
 ('leer-karten-im-buch', '.map(normalisiere).filter(istInhalt);', '.map(normalisiere);', B, 'kern', 'Gliederung: Kategorien in der übergebenen Reihenfolge', 0),
 ('unbekannte-kategorie-verschwindet', 'const k = katVonRezept(r); folge.get(folge.has(k) ? k : KAT_OHNE)', 'const k = katVonRezept(r); if (!folge.has(k)) continue; folge.get(folge.has(k) ? k : KAT_OHNE)', B, 'kern', 'Gliederung: Kategorien in der übergebenen Reihenfolge', 0),
 ('nicht-sortiert', "g.rezepte.sort((a, b) => a.name.localeCompare(b.name, ort, { sensitivity: 'base', numeric: true }) ||", 'g.rezepte.sort((a, b) => 0 ||', B, 'kern', 'Gliederung: Kategorien in der übergebenen Reihenfolge', 0),
 ('sortiert-ohne-sprache', "a.name.localeCompare(b.name, ort, { sensitivity: 'base', numeric: true })", '(a.name < b.name ? -1 : a.name > b.name ? 1 : 0)', B, 'kern', 'Sortierung in der Sprache', 0),
 ('name-im-verzeichnis-anders-als-auf-der-seite', 'name: sicht(r, sprache).name, rezept: r', 'name: sicht(r, ort).name, rezept: r', B, 'kern', 'Verzeichnis und Rezeptseite nennen denselben Namen', 0),
 ('uebersetzung-zaehlt-nicht', 'name: sicht(r, sprache).name, rezept: r', 'name: r.name, rezept: r', B, 'kern', 'Übersetzung zählt', 0),
 ('ordner-roh-gelesen', 'liste = imOrdner(liste, Array.isArray(ordner) ? ordner : [{ id: auswahl.ordner }], auswahl.ordner);', 'liste = liste.filter((r) => r.folder === String(auswahl.ordner));', B, 'kern', 'Auswahl nach uids, nach Kategorie, nach Ordner', 0),
 ('leere-auswahl-ist-alle', 'if (Array.isArray(auswahl)) {', 'if (Array.isArray(auswahl) && auswahl.length) {', B, 'kern', 'Auswahl nach uids, nach Kategorie, nach Ordner', 0),
 ('kennung-doppelt', 'if (id && !folge.has(id)) folge.set(id,', 'if (id) folge.set(id,', B, 'kern', 'jede Kennung einmal', 0),
 ('eimer-ohne-eigenen-namen', "if (!g.name) g.name = g.id === KAT_OHNE ? text(sprache, 'Ohne Kategorie', 'No category') : g.id;", "g.name = g.id === KAT_OHNE ? text(sprache, 'Ohne Kategorie', 'No category') : g.name || g.id;", B, 'kern', 'der Sammel-Eimer trägt seinen eigenen Namen', 0),
 # ── Dokumente ──
 ('leeres-buch-schweigt', "b.anzahl ? '' : `<p class=\"leer\">", "true ? '' : `<p class=\"leer\">", B, 'kern', 'leeres Buch: wirft nicht und sagt es', 0),
 ('portionen-fuer-alle', 'stufe: 3, portionen: portionen && portionen[e.uid] });', "stufe: 3, portionen: portionen && Object.values(portionen)[0] });", B, 'kern', 'Portionen je Rezept', 0),
 ('portionen-fehlen-im-blaetterbuch', 'kategorieName: g.name, portionen: portionen && portionen[e.uid] });', 'kategorieName: g.name });', B, 'kern', 'Portionen je Rezept', 0),
 ('seitenzahl-im-verzeichnis-falsch', '<span class="in">${e.nr + erste - 1}</span>', '<span class="in">${e.nr}</span>', B, 'kern', 'Blätterbuch: Deckblatt, Inhalt mit Seitenzahlen', 0),
 ('pruefsumme-veraltet', "var d=document,wurzel=d.documentElement,", "var d=document, wurzel=d.documentElement,", B, 'kern', 'die Richtlinie erlaubt genau dieses eine über seine Prüfsumme', 0),
 ('pruefsumme-veraltet-im-browser', "var d=document,wurzel=d.documentElement,", "var d=document, wurzel=d.documentElement,", B, 'browser', 'das Skript des Buchs läuft in der Datei', 0),
 ('skripte-frei', "script-src '${BLAETTER_PRUEFSUMME}'", "script-src 'unsafe-inline'", B, 'browser', 'die Richtlinie der Datei sperrt jedes andere Skript', 0),
 ('bilder-aus-dem-netz-erlaubt', "export const BLAETTER_RICHTLINIE = `default-src 'none'; img-src data:;", "export const BLAETTER_RICHTLINIE = `default-src 'none'; img-src data: https:;", B, 'browser', 'ein Bild mit Adresse im Netz sperrt die Richtlinie', 0),
 # ── Blättern (das Skript) ──
 ('zaehler-falsch', "fuelle(leiste.getAttribute('data-einzel'),[p[0]+1,n])", "fuelle(leiste.getAttribute('data-einzel'),[p[0],n])", B, 'browser', 'Start: das Deckblatt', 1),
 ('weiter-tot', "weiter.addEventListener('click',vor);", "", B, 'browser', '„Weiter“ zeigt Seite für Seite genau eine', 1),
 ('zurueck-tot', "zurueck.addEventListener('click',rueck);", "", B, 'browser', '„Zurück“ geht eine Seite zurück', 1),
 ('pfeile-vertauscht', "if(e.key==='ArrowRight')vor();else if(e.key==='ArrowLeft')rueck();", "if(e.key==='ArrowRight')rueck();else if(e.key==='ArrowLeft')vor();", B, 'browser', 'zweimal Pfeil rechts: Seite 3', 1),
 ('pos1-ende-tot', "else if(e.key==='Home')zeige(0);else if(e.key==='End')zeige(n-1);else return;", "else return;", B, 'browser', 'Pos1: das Deckblatt', 1),
 ('sprung-tot', "if(i<0)return;\ne.preventDefault();zeige(i);", "if(i<0)return;\ne.preventDefault();", B, 'browser', 'ein Tipp auf „Donauwelle“ landet auf der Seite mit diesem Rezept', 1),
 ('inhalt-knopf-tot', "zumInhalt.addEventListener('click',function(){var i=seiten.indexOf(buch.querySelector('.inhalt'));if(i>=0)zeige(i);});", "", B, 'browser', 'der Knopf „Inhalt“ zeigt das Verzeichnis', 1),
 ('wischen-tot', "if(dx<0)vor();else rueck();", "", B, 'browser', 'nach links wischen: die nächste Seite', 1),
 ('kurzer-wisch-blaettert', "if(Math.abs(dx)<60||Math.abs(dx)<2*Math.abs(dy))return;", "if(Math.abs(dx)<2*Math.abs(dy))return;", B, 'browser', 'ein kurzer Wisch blättert nicht', 1),
 ('immer-eine-seite', "function paar(i){if(!breit.matches||i===0)return[i];", "function paar(i){if(true)return[i];", B, 'browser', 'jeder Schritt zeigt zwei Seiten nebeneinander', 1),
 ('deckblatt-im-paar', "function paar(i){if(!breit.matches||i===0)return[i];var l=i%2?i:i-1;", "function paar(i){if(!breit.matches)return[i];var l=i%2?i-1:i;", B, 'browser', 'das Deckblatt steht allein in der Mitte', 1),
 ('adresse-merkt-nichts', "try{history.replaceState(null,'','#'+seiten[jetzt].id);}catch(e){}", "", B, 'browser', 'die Adresse merkt sich die Seite', 1),
 ('sprungmarke-tot', "window.addEventListener('hashchange',ausAdresse);", "", B, 'browser', 'eine Sprungmarke in der Adresse (#s3) schlägt diese Seite auf', 1),
 ('start-immer-vorn', "if(!ausAdresse())zeige(0);", "zeige(0);", B, 'browser', 'nach dem Neuladen steht dieselbe Seite da', 1),
 ('fokus-bleibt-liegen', "if(!a||a.disabled||!leiste.contains(a)){try{seiten[jetzt].focus({preventScroll:true});}catch(e){}}", "", B, 'browser', 'die offene Seite hat den Fokus', 1),
 ('seite-beginnt-nicht-oben', "if(auf&&!war)s.scrollTop=0;}", "}", B, 'browser', 'wer zurückblättert, beginnt die Seite wieder oben', 1),
 ('letzte-seite-mittig', "buch.classList.toggle('halb',doppel&&p.length===1&&p[0]>0);", "", B, 'browser', 'bei gerader Seitenzahl steht die letzte Seite allein auf der linken Hälfte', 1),
 ('weiter-nie-aus', "weiter.disabled=p[p.length-1]===n-1;", "", B, 'browser', 'auf der letzten Seite ist „Weiter“ aus', 1),
 # ── Blättern (der Stil) ──
 ('wort-laeuft-quer', '.seite{background:var(--blatt);overflow-wrap:anywhere}', '.seite{background:var(--blatt)}', B, 'browser', 'nirgends läuft etwas quer', 0),
 ('bild-zusammengedrueckt', '.seite>*{flex-shrink:0}\n', '', B, 'browser', 'behält das Bild seine Form', 0),
 ('kein-dunkel', '@media (prefers-color-scheme:dark){:root{', '@media (prefers-color-scheme:nie){:root{', B, 'browser', 'dunkel: dunkles Blatt, helle Schrift', 0),
 ('dunkel-ohne-helle-schrift', '--ft:color-mix(in srgb,var(--f) 45%,#fff);--tisch:#14110e;', '--tisch:#14110e;', B, 'browser', 'auch der Rezeptname ist zu lesen', 0),
 ('leiste-im-druck', '#leiste{display:none}\n.seite{break-before:page', '.seite{break-before:page', B, 'browser', 'im Druck sind alle Seiten da und die Leiste ist weg', 0),
 ('ohne-skript-verborgen', '.blaettern .seite{display:none;', '.seite{display:none;', B, 'browser', 'ohne Skript: alle Seiten untereinander', 0),
 ('ohne-skript-verborgen-im-text', '.blaettern .seite{display:none;', '.seite{display:none;', B, 'kern', 'Blätterbuch: Deckblatt, Inhalt mit Seitenzahlen', 0),
 ('ausschnitt-fehlt-im-blaetterbuch', 'if (t.ausschnitt) ausschnitte += `#s${nr} .bild img{${t.ausschnitt}}\\n`;', '', B, 'browser', 'der Bildausschnitt des Rezepts gilt für sein Bild', 0),
 # ── PDF-Buch (Seitenumbruch) ──
 ('rezept-ohne-neue-seite', '.rezept+.rezept{break-before:page;page-break-before:always}\n', '', B, 'browser', 'ein Rezept mehr in einer vorhandenen Kategorie ist genau eine Seite mehr', 0),
 ('kategorie-ohne-neue-seite', '.kapitel{break-before:page;page-break-before:always}\n', '', B, 'browser', 'genau Deckblatt + Inhalt + je Rezept eine Seite', 0),
 ('zwischentitel-fehlt', '<section class="kapitel" id="k${k + 1}">\\n<h2>${esc(g.name)}</h2>\\n', '<section class="kapitel" id="k${k + 1}">\\n', B, 'browser', 'je Kategorie ein Zwischentitel', 0),
 ('rezeptname-andere-groesse', "rezeptStil(3)}${BUCH_STIL}", "rezeptStil(2)}${BUCH_STIL}", B, 'browser', 'der Rezeptname ist so groß wie auf dem einzelnen Rezeptblatt', 0),
 ('anmutung-weicht-ab', "rezeptStil(3)}${BUCH_STIL}", "rezeptStil(2)}${BUCH_STIL}", B, 'kern', 'die Rezeptseite sieht aus wie das einzelne Rezeptblatt', 0),
]
PRUEFSUMME = """import { createHash } from 'node:crypto'; import { readFileSync, writeFileSync } from 'node:fs'; import { pathToFileURL } from 'node:url';
const p = process.argv[1], { BLAETTER_SKRIPT } = await import(pathToFileURL(p).href), s = readFileSync(p, 'utf8');
writeFileSync(p, s.replace(/export const BLAETTER_PRUEFSUMME = '[^']*';/, "export const BLAETTER_PRUEFSUMME = 'sha256-" + createHash('sha256').update(BLAETTER_SKRIPT, 'utf8').digest('base64') + "';"));"""
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; falsch=0; tot=0
if os.environ.get('NUR_ANKER'):
    for name,a,b,f,probe,erwartet,skript in F:
        n=open(f,encoding='utf-8').read().count(a)
        if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for name,a,b,f,probe,erwartet,skript in F:
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gb-')
    shutil.copytree('kern',W+'/kern'); os.makedirs(W+'/test'); shutil.copy('test/kern-buch.test.js',W+'/test/kern-buch.test.js'); shutil.copy('package.json',W+'/package.json')
    s=open(W+'/'+f,encoding='utf-8').read(); n=s.count(a)
    if n!=1: print('==',name,'TOTER ANKER',n); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    if skript: subprocess.run(['node','--input-type=module','-e',PRUEFSUMME,os.path.join(W,B)],check=True)
    try:
        if probe=='kern':   # rot ist die Zeile „not ok <Name der Probe>“ und der Text der Zusicherung (bei mehrzeiligen Meldungen die Zeile nach „error: |-“)
            r=subprocess.run(['node','--test','test/kern-buch.test.js'],cwd=W,capture_output=True,text=True,timeout=120); zl=r.stdout.splitlines()
            rote=[l.strip() for l in zl if l.startswith('not ok')]+[('error: '+zl[i+1].strip()) if l.strip()=='error: |-' else l.strip() for i,l in enumerate(zl) if l.strip().startswith('error:') and i+1<len(zl)]
        else: r=subprocess.run(['node','tests/smoke_kern_buch.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=300); aus=r.stdout; rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    except subprocess.TimeoutExpired: rote=['ROT: GESTOLPERT (Zeit)']
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    elif rote: falsch+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', len(rote), 'rot |', (next((l for l in rote if erwartet in l), rote[0])[:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d aus anderem Grund · %d tote Anker' % (gefangen,durch,falsch,tot)); sys.exit(1 if durch or falsch or tot else 0)
