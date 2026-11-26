# Gegenprobe zu tests/smoke_neu_ansicht.mjs § 5 (Vor und Zurück im Vollbild, Klaus 26.11.): je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss
# ROT werden, und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_blaettern.py   (NUR_FALL=a,b · NUR_ANKER=1)
import subprocess, shutil, os, tempfile, sys
APP='neu/app.mjs'
F=[('blatt-alle', "  if (s.kat === 'alle') return alleKategorien(", "  if (true) return alleKategorien(", APP, 'nur diese Kategorie'),
   ('blatt-ohne-tasten', "&& blaettern(ev.key === 'ArrowRight' ? 1 : -1)) ev.preventDefault(); });", "&& false) ev.preventDefault(); });", APP, 'Pfeil und Taste'),
   ('blatt-ohne-wischen', "Math.abs(dx) > 2 * Math.abs(dy)) blaettern(dx < 0 ? 1 : -1); }, { passive: true });", "Math.abs(dx) > 2 * Math.abs(dy)) {} }, { passive: true });", APP, 'nach links wischen'),
   ('blatt-immer', "(bildOffen() || (s.nurDies && ['rezept', 'start', 'baum'].includes(s.ansicht)", "(bildOffen() || (['rezept', 'start', 'baum'].includes(s.ansicht)", APP, 'ohne Vollbild'),
   ('blatt-handy-pfeile', "  if (!breit() || !(imBild || blaetternAn())) return '';", "  if (!(imBild || blaetternAn())) return '';", APP, 'am Handy keine Pfeile'),
   ('bild-bleibt-stehen', "  if (bild) $('fensterort').innerHTML = vollbildHtml(zeig(n));", "", APP, 'Vollbild des Bildes')]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; anders=0; tot=0
if os.environ.get('NUR_ANKER'):
    for name,a,b,f,erwartet in F:
        n=open(f,encoding='utf-8').read().count(a)
        if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for name,a,b,f,erwartet in F:
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gblatt-')
    for d in ['neu','kern','icons','ausgaben','assets','sbkim']: shutil.copytree(d,W+'/'+d)
    shutil.copytree('beispiele', W+'/beispiele')   # das Beispielbuch füllt die Probe
    s=open(W+'/'+f,encoding='utf-8').read()
    if s.count(a)!=1: print('==',name,'TOTER ANKER'); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_ansicht.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    elif rote: anders+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d aus anderem Grund · %d tote Anker' % (gefangen,durch,anders,tot)); sys.exit(1 if durch or anders or tot else 0)
