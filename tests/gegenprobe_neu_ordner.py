# Gegenprobe zu tests/smoke_neu_ordner.mjs (Ordner): je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen (Spalte "erwartet"). Aufruf: python3 -u tests/gegenprobe_neu_ordner.py
# NUR_FALL=<name> fährt einen Fall. Manche Fälle lassen die Probe an einem Wartepunkt abbrechen; das zählt als ROT.
import subprocess, shutil, os, tempfile, sys
F=[('ordner-frisst-kategorie', "? { ...r, folder: id ? String(id) : '' } : r));", "? { ...r, folder: id ? String(id) : '', cat: id ? '' : r.cat } : r));", 'kern/modell/ordner.mjs', 'ROT'),
   ('loeschen-nimmt-rezepte-mit', "  return { rezepte: r, ordner: (ordner || []).filter((o) => !gleich(o.id, id)), betroffen };", "  return { rezepte: (rezepte || []).filter((x) => !gleich(x.folder, id)), ordner: (ordner || []).filter((o) => !gleich(o.id, id)), betroffen };", 'kern/modell/ordner.mjs', 'das Rezept ist noch da'),
   ('leerer-ordner-in-leiste', "ordner = ordUebersicht(Z.rezepte, Z.ordner).filter((o) => o.anzahl > 0);", "ordner = ordUebersicht(Z.rezepte, Z.ordner);", 'neu/app.mjs', 'ein leerer Ordner steht dort nicht'),
   ('geister-ordner', "  return f && (ordner || []).some((o) => String(o.id) === f) ? f : '';", "  return f;", 'kern/modell/rezept.mjs', 'ROT'),
   ('werkzeuge-bleiben-offen', "  Object.assign(s, { ansicht, leisteAuf: false, rleiste: false, ...extra });", "  Object.assign(s, { ansicht, leisteAuf: false, ...extra });", 'neu/app.mjs', 'ROT')]
nur=os.environ.get('NUR_FALL'); gefangen=0; durch=0; tot=0
for name,a,b,f,erwartet in F:
    if nur and nur!=name: continue
    W=tempfile.mkdtemp(prefix='rb-go-')
    for d in ['neu','kern','beispiele','icons','ausgaben','sbkim','assets']: shutil.copytree(d,W+'/'+d)
    s=open(W+'/'+f,encoding='utf-8').read(); n=s.count(a)
    if n!=1: print('==',name,'TOTER ANKER',n); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_ordner.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
