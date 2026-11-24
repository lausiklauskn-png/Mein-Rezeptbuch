# Gegenprobe zu tests/smoke_neu_zusatz.mjs: je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_zusatz.py   (NUR_FALL=a,b · NUR_ANKER=1)
import subprocess, shutil, os, tempfile, sys
# Zwei Riegel decken einander (Merker in den Einstellungen + alte Kennung im Tresor): die Sabotage nimmt beide.
F=[('alter-stand-doppelt', "    if (schon.has(s.alt)) continue;", "", 'kern/speicher/alt-tresor.mjs', 'kein alter Stand doppelt', "E.altTresor = true; sichern();", "sichern();", 'neu/zusatz.mjs'),
   ('alte-zeit-verloren', "await tr.ablegen(s.sicherung, s.art, s.name, { ts: s.ts, alt: s.alt });", "await tr.ablegen(s.sicherung, s.art, s.name, { alt: s.alt });", 'kern/speicher/alt-tresor.mjs', 'mit ihrem Namen, ihrer alten Zeit'),
   ('alte-bilder-fehlen', "(!r.img && r.id != null && b[r.id] ? { ...r, img: b[r.id] } : r)", "(r)", 'kern/speicher/alt-tresor.mjs', 'das Bild hängt wieder an seinem Rezept'),
   ('alte-db-angelegt', "    a.onupgradeneeded = () => { neu = true; try { a.transaction.abort(); } catch { /* schon zu */ } };", "    a.onupgradeneeded = () => { neu = true; };", 'kern/speicher/alt-tresor.mjs', 'wird ihre Datenbank nicht angelegt', "  if (idb.databases) { const alle = await idb.databases(); if (!alle.some((x) => x.name === db)) return null; }\n", "", 'kern/speicher/alt-tresor.mjs'),
   ('richter-ohne-schluessel', "    if (!SK.anthropic) { app.schluesselFenster('anthropic', 'richter'); return; }", "", 'neu/zusatz.mjs', 'ohne Anthropic-Schlüssel kommt das Schlüssel-Fenster'),
   ('richter-sendet-falle', "if ((await pruefe(k.text)).length) urteile.push({ uid: k.uid, passt: null, warum: '', ausgeschlossen: 'ki-anweisung' }); else zumRichter.push(k);", "zumRichter.push(k);", 'kern/suche/richter.mjs', 'das Rezept mit dem Befehl an eine KI geht nicht hinaus'),
   ('richter-sendet-schritte', "zut && 'Zutaten: ' + kurz(zut, 300)]", "zut && 'Zutaten: ' + kurz(zut, 300), (r.steps || []).map((x) => x.txt).join(' ')]", 'kern/suche/richter.mjs', 'Schritte gehen nie hinaus'),
   ('richter-frage-ungeprueft', "  if ((await pruefe(String(anfrage))).length) return ohne('frage');", "", 'kern/suche/richter.mjs', 'steht in der Suchfrage ein Befehl an eine KI, geht nichts hinaus'),
   ('richter-ordnet-nicht', "const vorn = da ? sinn.filter((r) => !u(r) || u(r).passt !== false) : sinn, hinten = da ? sinn.filter((r) => u(r) && u(r).passt === false) : [];", "const vorn = sinn, hinten = [];", 'neu/zusatz.mjs', 'was nicht passt, steht eingeklappt'),
   ('bild-ohne-halt', "    if (!st.length) return r;", "    if (st.length >= 0) return r;", 'neu/zusatz.mjs', 'vor dem Senden hält die App an und zeigt die Stelle markiert'),
   ('bild-ohne-sendet-doch', "    return w === 'a' ? p.sauber : w === 'b' ? r : null;", "    return w === 'a' ? r : w === 'b' ? r : null;", 'neu/zusatz.mjs', '„Ohne senden“: der Auftrag geht ohne die Stelle hinaus'),
   ('bild-kreuz-sendet', "    return w === 'a' ? p.sauber : w === 'b' ? r : null;", "    return w === 'a' ? p.sauber : r;", 'neu/zusatz.mjs', 'das Kreuz bricht ab: nichts geht hinaus'),
   ('sammel-ohne-kosten', "<p class=\"eine\" id=\"sammel-kosten\">${esc(sammelKosten(n, spr()))}</p>", "<p class=\"eine\" id=\"sammel-kosten\"></p>", 'neu/zusatz.mjs', 'ein Fenster nennt vor dem Start Anzahl, Kosten und Empfänger'),
   ('sammel-sendet-falle', "    if (p.stellen.length) { aus.uebersprungen.push({ uid: r.uid, name: r.name, stellen: p.stellen }); continue; }", "", 'kern/ki/bild.mjs', 'das Rezept mit dem Befehl wurde übersprungen und ging nicht hinaus'),
   ('sammel-bricht-nicht-ab', "abbruch: () => stopp,", "abbruch: () => false,", 'neu/zusatz.mjs', '„Abbrechen“ hört nach dem laufenden Bild auf'),
   ('sammel-laeuft-nach-nein', "aus.grund = f.status === 401 ? 'schluessel' : 'limit'; aus.offen = liste.length - i - 1; break; }", "aus.grund = f.status === 401 ? 'schluessel' : 'limit'; aus.offen = liste.length - i - 1; }", 'kern/ki/bild.mjs', 'ein abgelehnter Schlüssel beendet den Lauf'),
   ('plan-ohne-ansehen', "      vorschlag = { v, ab };", "      vorschlag = { v, ab }; A['plan-ki-ja']();", 'neu/zusatz.mjs', 'vor „Übernehmen“ ist der Plan unverändert'),
   ('buch-auswahl-ignoriert', "      auswahl: !w ? null : w.startsWith('k:') ? { kat: w.slice(2) } : { ordner: w.slice(2) } };", "      auswahl: null };", 'neu/zusatz.mjs', 'eine Kategorie als Auswahl: nur ihre Rezepte stehen im Buch'),
   ('buch-immer-mit-bildern', "mitBildern: document.getElementById('buch-bilder').checked,", "mitBildern: true,", 'neu/zusatz.mjs', 'ohne Bilder ist kein Bild in der Datei'),
   ('buch-leer-nicht-gesagt', "    if (!n) { melde(L('In dieser Auswahl ist kein Rezept', 'No recipe in this selection')); return; }", "", 'neu/zusatz.mjs', 'eine leere Auswahl wird gesagt'),
   ('buch-titel-fest', "titel = document.getElementById('buch-titel').value.trim() || app.ausgabe().titel;", "titel = app.ausgabe().titel;", 'neu/zusatz.mjs', 'lädt eine eigenständige Datei mit dem Titel und allen Rezepten herunter'),
   ('teller-braucht-mistral', "  if (E.scan.anbieter === 'mistral' && !SK.mistral && !sc.teller) { schluesselFenster('mistral', 'scan'); return; }", "  if (E.scan.anbieter === 'mistral' && !SK.mistral) { schluesselFenster('mistral', 'scan'); return; }", 'neu/app.mjs', 'ein Aufruf an Claude mit dem Foto'),
   ('teller-wird-gelesen', "vomTeller: !!sc.teller, fortschritt", "vomTeller: false, fortschritt", 'neu/app.mjs', 'ein Aufruf an Claude mit dem Foto'),
   # Zwei Riegel decken einander (zurückgesetzt nach der Wahl UND beim Tipp auf „Kamera“): die Sabotage nimmt beide.
   ('teller-bleibt-haengen', "istBild(dateien[0]) }; s.tellerWahl = false;", "istBild(dateien[0]) };", 'neu/app.mjs', 'ein gewöhnliches Kamerafoto danach heißt wieder', "  'scan-kamera': () => { s.tellerWahl = false; $('datei-kamera').click(); },", "  'scan-kamera': () => { $('datei-kamera').click(); },", 'neu/app.mjs'),
   ('kontrast-setzt-nichts', "  if (kontrast) Object.assign(v, d", "  if (false) Object.assign(v, d", 'kern/oberflaeche/farben.mjs', 'Nebentext hat mindestens 7:1'),
   ('kontrast-vergisst', "farbeSetzen(document.documentElement, E.farbe, E.ton, { kontrast: !!E.kontrast }); E.schrift = schriftSetzen", "farbeSetzen(document.documentElement, E.farbe, E.ton); E.schrift = schriftSetzen", 'neu/app.mjs', 'nach dem Neuladen ist er noch an'),
   ('meldung-knopf-raus', ".toast button{flex:none}", "", 'neu/app.css', 'liegt „Rückgängig“ ganz in der Meldung', ".toast span{min-width:0;overflow:hidden;text-overflow:ellipsis}", "", 'neu/app.css'),
   ('muttis-nimmt-rezeptbuch', "(/^[a-z-]+$/.test(andere) ? fetch(", "(false ? fetch(", 'neu/app.mjs', 'neu/muttis.html öffnet „Muttis Rezeptbuch“'),
   ('handbuch-offen', "`<details><summary>${ic(i)}<span>${esc(titel)}</span></summary>", "`<details open><summary>${ic(i)}<span>${esc(titel)}</span></summary>", 'neu/zusatz.mjs', 'alle eingeklappt'),
   ('uebernahme-ohne-bilder', "Z = { rezepte: bilderAnhaengen(alt.rezepte, ab.bilder).rezepte, menu: alt.menu,", "Z = { rezepte: alt.rezepte, menu: alt.menu,", 'neu/app.mjs', 'erste Übernahme: die drei Rezepte der alten App sind da, jedes mit seinem Bild'),
   ('nachtrag-ohne-pruefung', "return !!a && (a.uid === r.uid || a.name === r.name); });", "return true; });", 'neu/app.mjs', 'ein Rezept mit anderem Namen unter derselben Nummer bekommt kein fremdes Bild'),
   ('schritt-notiz-verloren', "filter((t) => t.trim()), alt ? alt.steps : []),", "filter((t) => t.trim()), []),", 'neu/app.mjs', 'nur der Name geändert: die Notizen an den Schritten bleiben'),
   ('notiz-am-platz-statt-text', "const a = rest.find((y) => y.frei && String(y.x.txt).trim() === txt.trim());", "const a = null;", 'neu/app.mjs', 'die Notiz wandert mit ihrem Schritt'),
   ('stern-nimmt-nicht-zurueck', "stars: n === alt ? 0 : n } } : x)); sichern(); zeichne(); },", "stars: n } } : x)); sichern(); zeichne(); },", 'neu/app.mjs', 'derselbe Stern noch einmal nimmt die Bewertung zurück'),
   ('druck-mit-abgehaktem', "liste.filter((y) => y.gruppe === gid && !E_.haken[y.schluessel])) aus.push(", "liste.filter((y) => y.gruppe === gid)) aus.push(", 'neu/app.mjs', 'was abgehakt ist, steht nicht mehr im Druck'),
   ('plan-falsche-woche', "const tage = app.planTage(), ab = tagIso(tage[0]),", "const tage = app.planTage(), ab = tagIso(tage[1]),", 'neu/zusatz.mjs', 'trägt den Vorschlag in die gezeigte Woche ein')]
# Jeder Fall fährt nur seinen Abschnitt der Probe (NUR_TEIL); die Probe als Ganzes läuft vorher einmal ohne Sabotage.
TEILE={'alter':'1','alte':'1','richter':'2','bild':'3','sammel':'4','plan':'5','buch':'6','teller':'7','kontrast':'8','meldung':'8','handbuch':'8','muttis':'9','uebernahme':'10','nachtrag':'10','schritt':'10','notiz':'10','stern':'11','druck':'11'}
def teil(name): return TEILE[name.split('-')[0]]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; tot=0
def anker(fall):
    name,a,b,f,erwartet=fall[:5]; paare=[(a,b,f)]+([(fall[5],fall[6],fall[7])] if len(fall)>5 else []); return name,f,erwartet,paare
if os.environ.get('NUR_ANKER'):
    for fall in F:
        name,f,erwartet,paare=anker(fall)
        for a,_,pf in paare:
            n=open(pf,encoding='utf-8').read().count(a)
            if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for fall in F:
    name,f,erwartet,paare=anker(fall)
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gz-')
    for d in ['neu','kern','icons','ausgaben','assets','sbkim']: shutil.copytree(d,W+'/'+d)
    os.makedirs(W+'/beispiele'); shutil.copy('beispiele/KATALOG.json', W+'/beispiele/KATALOG.json')
    if any(open(W+'/'+pf,encoding='utf-8').read().count(a)!=1 for a,_,pf in paare): print('==',name,'TOTER ANKER'); tot+=1; shutil.rmtree(W); continue
    for a,b,pf in paare: s=open(W+'/'+pf,encoding='utf-8').read(); open(W+'/'+pf,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_zusatz.mjs'],env={**os.environ,'WURZEL':W,'NUR_TEIL':teil(name)},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
