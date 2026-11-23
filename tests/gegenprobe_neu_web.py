# Gegenprobe zu tests/smoke_neu_web.mjs (Web-Import): je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen (Spalte "erwartet"). Aufruf: python3 -u tests/gegenprobe_neu_web.py
# NUR_FALL=<name> fährt einen Fall. Manche Fälle lassen die Probe an einem Wartepunkt abbrechen; das zählt als ROT.
import subprocess, shutil, os, tempfile, sys
F=[('weiterleiter', "try { ant = await hol(u, { redirect: 'follow',", "try { ant = await hol('https://api.allorigins.win/raw?url=' + encodeURIComponent(u), { redirect: 'follow',", 'kern/import/web.mjs', 'ROT'),
   ('verstecktes-geht-mit', "(WEG.has(tag) || versteckt(attr))) { weg = tag;", "(WEG.has(tag))) { weg = tag;", 'kern/import/web.mjs', 'ROT'),
   ('kein-halt', "const stellen = await kiAnweisungen(fuerKi(w.seitentext, spr()).text);", "const stellen = []; await kiAnweisungen(fuerKi(w.seitentext, spr()).text);", 'neu/app.mjs', 'ROT'),
   ('quelle-fehlt', " if (f.neu && f.source) neu.source = f.source;", "", 'neu/app.mjs', 'ROT'),
   ('ki-ohne-knopf', "  w.seitentext = e.text; w.stand = 'ohneDaten'; neuFenster('web');", "  w.seitentext = e.text; w.stand = 'ohneDaten'; neuFenster('web'); webMitKi();", 'neu/app.mjs', 'ROT')]
nur=os.environ.get('NUR_FALL'); gefangen=0; durch=0; tot=0
for name,a,b,f,erwartet in F:
    if nur and nur!=name: continue
    W=tempfile.mkdtemp(prefix='rb-gw-')
    for d in ['neu','kern','beispiele','icons','ausgaben','sbkim','assets']: shutil.copytree(d,W+'/'+d)
    s=open(W+'/'+f,encoding='utf-8').read(); n=s.count(a)
    if n!=1: print('==',name,'TOTER ANKER',n); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_web.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
