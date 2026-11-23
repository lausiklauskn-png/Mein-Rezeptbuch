# Gegenprobe zu tests/smoke_neu_zusatz.mjs: je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_zusatz.py   (NUR_FALL=a,b · NUR_ANKER=1)
import subprocess, shutil, os, tempfile, sys
F=[('alter-stand-doppelt', "    if (schon.has(s.alt)) continue;", "", 'kern/speicher/alt-tresor.mjs', 'kein alter Stand doppelt'),
   ('alte-zeit-verloren', "await tr.ablegen(s.sicherung, s.art, s.name, { ts: s.ts, alt: s.alt });", "await tr.ablegen(s.sicherung, s.art, s.name, { alt: s.alt });", 'kern/speicher/alt-tresor.mjs', 'mit ihrem Namen, ihrer alten Zeit'),
   ('alte-bilder-fehlen', "(!r.img && r.id != null && b[r.id] ? { ...r, img: b[r.id] } : r)", "(r)", 'kern/speicher/alt-tresor.mjs', 'das Bild hängt wieder an seinem Rezept'),
   ('alte-db-angelegt', "      a.onupgradeneeded = () => { neu = true; try { a.transaction.abort(); } catch { /* schon zu */ } };", "      a.onupgradeneeded = () => { neu = true; };", 'kern/speicher/alt-tresor.mjs', 'wird ihre Datenbank nicht angelegt', "    if (idb.databases) { const alle = await idb.databases(); if (!alle.some((x) => x.name === ort.db)) return []; }\n", ""),
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
   ('plan-falsche-woche', "const tage = app.planTage(), ab = tagIso(tage[0]),", "const tage = app.planTage(), ab = tagIso(tage[1]),", 'neu/zusatz.mjs', 'trägt den Vorschlag in die gezeigte Woche ein')]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; tot=0
def anker(fall):
    name,a,b,f,erwartet=fall[:5]; paare=[(a,b)]+([(fall[5],fall[6])] if len(fall)>5 else []); return name,f,erwartet,paare
if os.environ.get('NUR_ANKER'):
    for fall in F:
        name,f,erwartet,paare=anker(fall); s=open(f,encoding='utf-8').read()
        for a,_ in paare:
            if s.count(a)!=1: print('==',name,'TOTER ANKER',s.count(a)); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for fall in F:
    name,f,erwartet,paare=anker(fall)
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gz-')
    for d in ['neu','kern','icons','ausgaben','assets','sbkim']: shutil.copytree(d,W+'/'+d)
    os.makedirs(W+'/beispiele'); shutil.copy('beispiele/KATALOG.json', W+'/beispiele/KATALOG.json')
    s=open(W+'/'+f,encoding='utf-8').read()
    if any(s.count(a)!=1 for a,_ in paare): print('==',name,'TOTER ANKER'); tot+=1; shutil.rmtree(W); continue
    for a,b in paare: s=s.replace(a,b)
    open(W+'/'+f,'w',encoding='utf-8').write(s)
    try: r=subprocess.run(['node','tests/smoke_neu_zusatz.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
