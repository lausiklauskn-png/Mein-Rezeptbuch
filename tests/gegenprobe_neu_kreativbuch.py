# Gegenprobe zu tests/smoke_neu_kreativbuch.mjs: je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_kreativbuch.py   (NUR_FALL=a,b · NUR_ANKER=1)
# Die Probe nimmt ihre Erwartungen aus dem Kern NEBEN sich (dem echten Baum); eine Sabotage im Kern der Kopie verschiebt sie nicht mit.
import subprocess, shutil, os, tempfile, sys
U='neu/kreativbuch.mjs'; K='kern/ausgabe/kreativbuch.mjs'
F=[('fenster-mit-erklaertext', '     <select class="feld" id="kb-wahl"', '     <p>Hier wird aus deinen Rezepten ein Buch.</p><select class="feld" id="kb-wahl"', U, 'kein Erklärtext auf dem Fenster'),
   ('fenster-knopf-ohne-kosten', " · ${esc(ko.preis)}</small>", "</small>", U, 'im Knopf steht kurz, was an wen geht und was es kostet'),
   ('fenster-zeile-fehlt', "ZU.buchThema(zeile, '#b07a4a', KB.zeile(zeile))", "ZU.buchThema(zeile, '#b07a4a')", 'neu/app.mjs', 'im Thema „Buch“ steht die Zeile „Kreativbuch“'),
   ('fenster-stand-falsch', "mit = liste.filter((r) => t[r.uid]).length", "mit = liste.length", U, 'oben steht, wie viele Rezepte schon Text haben'),
   ('fenster-390-quer', ".kb-wege .knopf small{font-size:11px;", ".kb-wege .knopf small{font-size:30px;", 'neu/app.css', 'am Handy (390 px) läuft nichts quer'),
   ('stil-eigen-vergessen', "const stilOpt = () => ({ stil: K().stil, eigen: K().eigen, sprache: spr() });", "const stilOpt = () => ({ stil: K().stil, sprache: spr() });", U, 'der eigene Text steht als Stil im Auftrag'),
   ('kopieren-stil-egal', "const t = kbSammelAuftrag(rs.map(app.zeig), { ...stilOpt(), kategorie: katName });", "const t = kbSammelAuftrag(rs.map(app.zeig), { sprache: spr(), kategorie: katName });", U, 'im gewählten Stil'),
   ('einsetzen-falscher-stil', "k.texte[uid] = { ...(k.texte[uid] || {}), [k.stil]: t };", "k.texte[uid] = { ...(k.texte[uid] || {}), auto: t };", U, 'im Stil des Auftrags'),
   ('einsetzen-zuordnung-stelle', "    let k = Number.isInteger(nr) && frei.has(nr)", "    let k = false && frei.has(nr)", K, 'jeder Text liegt am richtigen Rezept'),
   ('erzeugen-ohne-schluesselfenster', "    if (!SK.anthropic) { app.schluesselFenster('anthropic', 'kb-erzeugen'); return; }\n", "", U, 'ohne Anthropic-Schlüssel kommt das Schlüssel-Fenster'),
   ('erzeugen-ohne-kostenfenster', "    const rs = offen(); if (!rs.length) { melde(L('In dieser Auswahl ist kein Rezept', 'No recipe in this selection')); return; }\n", "    const rs = offen(); if (rs.length) { A['kb-start'](); return; }\n", U, 'vor dem Start steht ein Fenster mit Anzahl und Kosten'),
   ('kosten-falsch-gezaehlt', "const kosten = (rs) => kbKosten(rs.map(app.zeig),", "const kosten = (rs) => kbKosten(rs.slice(1).map(app.zeig),", U, 'vor dem Start steht ein Fenster mit Anzahl und Kosten'),
   ('lauf-falsches-rezept', "frageClaude(schluessel, kbAuftrag(r, {", "frageClaude(schluessel, kbAuftrag(liste[0], {", K, 'ein Aufruf je Rezept, jeder mit seinem Rezept'),
   ('lauf-ohne-sicher', "${stilZeile(stil, eigen)}${SICHER}\n\nRecipe:", "${stilZeile(stil, eigen)}\nRecipe:", K, 'jeder Auftrag trägt den Satz'),
   ('lauf-401-weiter', "aus.offen = liste.length - i - 1; break; }", "aus.offen = liste.length - i - 1; }", K, 'ein abgelehnter Schlüssel beendet den Lauf'),
   ('abbrechen-wirkungslos', "kategorie: (r) => kat.get(r.uid) || '', abbruch: () => stopp,", "kategorie: (r) => kat.get(r.uid) || '', abbruch: () => false,", U, 'nach dem laufenden Rezept geht nichts mehr hinaus'),
   ('abbrechen-stumm', "if (el) el.textContent = L('Hört nach diesem Rezept auf …', 'Stops after this recipe …');", "", U, 'nach „Abbrechen“ sagt die Zeile'),
   ('pruefung-ohne-halt', "    if (stellen.length) {\n", "    if (stellen.length < 0) {\n", U, 'ein Befehl an eine KI im Rezept hält an'),
   ('pruefung-ohne-sendet-doch', "      if (w === 'a') { liste = frei.map(", "      if (w === 'x') { liste = frei.map(", U, '„Ohne senden“ schickt den Befehl nicht mit'),
   ('pruefung-kreuz-sendet', "      if (!w) { kbFenster(); return; }\n", "", U, 'das Kreuz bricht ab'),
   ('pruefung-zutaten-ungeprueft', "if (await fund(t)) stellen.push({ teil: 'zutat', text: t }); else ings.push(z);", "ings.push(z);", K, 'ein Befehl an eine KI im Rezept hält an'),
   ('ausgabe-rahmen-mit-zugriff', 'sandbox="allow-scripts" title=', 'sandbox="allow-scripts allow-same-origin" title=', U, 'in einem Rahmen ohne Zugriff auf die App'),
   ('ausgabe-ohne-bild', 'bild ? `<div class="bild"><img src="${esc(bild)}" alt="${esc(name)}"></div>` : \'\',\n    x.intro', "'',\n    x.intro", K, 'das Rezeptbild steht auf der Seite seines Rezepts'),
   ('ausgabe-pdf-mit-skript', "return blatt(k.kopf, sp, DRUCK_RICHTLINIE, '', k.stil, k.rumpf.join('\\n'));", "return blatt(k.kopf, sp, DRUCK_RICHTLINIE, '', k.stil, [...k.rumpf, ...blaetterLeiste(sp)].join('\\n'));", K, 'PDF geht an den Druck des Browsers, ohne Skript'),
   ('ausgabe-texte-fehlen', "kasten('oeko', 'Ökologie und Saison', 'Ecology and season', x.eco)", "''", K, 'HTML speichert eine eigenständige Datei mit allen Texten'),
   ('sprache-zeile-deutsch', "zeile('kreativ', 'funken', L('Kreativbuch', 'Creative book')", "zeile('kreativ', 'funken', 'Kreativbuch'", U, 'auf Französisch kommt die Zeile aus der Tabelle'),
   ('handbuch-fehlt', "    L('„Kreativbuch“ unter „Buch“:", "    ('„Kreativbuch“ unter „Buch“:", 'neu/handbuch.mjs', 'das Handbuch erklärt das Kreativbuch')]
# Benannte Grenze: für „die Auswahl wird gespeichert“ steht kein Fall. Die Auswahl liegt in den Einstellungen (E), und jedes spätere
# sichern() der App schreibt sie mit; ein fehlendes sichern() an dieser einen Stelle kann die Probe nicht von seinem Dasein unterscheiden.
# Jeder Fall fährt nur seinen Abschnitt der Probe (NUR_TEIL); die Probe als Ganzes läuft vorher einmal ohne Sabotage.
TEILE={'fenster':'1','stil':'2','kopieren':'3','einsetzen':'3','erzeugen':'4','kosten':'4','lauf':'4','abbrechen':'5','pruefung':'6','ausgabe':'7','sprache':'8','handbuch':'8'}
def teil(name): return TEILE[name.split('-')[0]]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; tot=0
if os.environ.get('NUR_ANKER'):
    for name,a,_,f,_e in F:
        n=open(f,encoding='utf-8').read().count(a)
        if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for name,a,b,f,erwartet in F:
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gkb-')
    for d in ['neu','kern','icons','ausgaben','assets','sbkim']: shutil.copytree(d,W+'/'+d)
    os.makedirs(W+'/beispiele'); shutil.copy('beispiele/KATALOG.json', W+'/beispiele/KATALOG.json')
    if open(W+'/'+f,encoding='utf-8').read().count(a)!=1: print('==',name,'TOTER ANKER'); tot+=1; shutil.rmtree(W); continue
    s=open(W+'/'+f,encoding='utf-8').read(); open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_kreativbuch.mjs'],env={**os.environ,'WURZEL':W,'NUR_TEIL':teil(name)},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
