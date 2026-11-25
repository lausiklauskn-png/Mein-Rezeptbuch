# Gegenprobe zu tests/smoke_neu_zinebsp.mjs (R22 Beispielbilder): je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss
# ROT werden, und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_zinebsp.py   (NUR_FALL=a,b · NUR_ANKER=1)
import subprocess, shutil, os, tempfile, sys
D='kern/modell/doppel.mjs'; APP='neu/app.mjs'
F=[('kein-bild', '<img class="zn-bsp" src="./zine-beispiele/${id}-klein.webp?v=1" alt="" loading="lazy" decoding="async">', '', 'neu/zine.mjs', 'jede der sechs Kacheln zeigt ihr Beispielbild'),
   ('gross-sofort', '<img class="zn-bsp" src="./zine-beispiele/${id}-klein.webp?v=1"', '<img class="zn-bsp" src="./zine-beispiele/${id}-gross.webp?v=1"', 'neu/zine.mjs', 'die großen Bilder sind noch nicht geladen'),
   ('ansehen-waehlt', "  A['zn-format'] = (e) => { if (Date.now() - bspGross < 500) return; Zs.format", "  A['zn-format'] = (e) => { Zs.format", 'neu/zine.mjs', 'das Ansehen wählt das Format nicht'),
   ('loslassen-bleibt', "if (document.getElementById('zn-gross')) { bspGross = Date.now(); bspWeg(); }", "if (document.getElementById('zn-gross')) { bspGross = Date.now(); }", 'neu/zine.mjs', 'loslassen schließt es'),
   ('kein-langdruck', "bspUhr = setTimeout(() => { bspGross = Date.now(); bspZeigen(k);", "bspUhr = setTimeout(() => { bspGross = Date.now();", 'neu/zine.mjs', 'lange drücken: das große'),
   ('nicht-offline', ' "./zine-beispiele/zeitung-klein.webp?v=1",', '', 'neu/sw.js', 'die kleinen Bilder liegen im Offline-Vorrat')]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; anders=0; tot=0
if os.environ.get('NUR_ANKER'):
    for name,a,b,f,erwartet in F:
        n=open(f,encoding='utf-8').read().count(a)
        if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for name,a,b,f,erwartet in F:
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gzinebsp-')
    for d in ['neu','kern','icons','ausgaben','assets','sbkim']: shutil.copytree(d,W+'/'+d)
    os.makedirs(W+'/beispiele'); shutil.copy('beispiele/KATALOG.json', W+'/beispiele/KATALOG.json')
    s=open(W+'/'+f,encoding='utf-8').read()
    if s.count(a)!=1: print('==',name,'TOTER ANKER'); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_zinebsp.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    elif rote: anders+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d aus anderem Grund · %d tote Anker' % (gefangen,durch,anders,tot)); sys.exit(1 if durch or anders or tot else 0)
