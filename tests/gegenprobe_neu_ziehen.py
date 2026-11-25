# Gegenprobe zu tests/smoke_neu_ziehen.mjs (R5 Ziehen und Wischen): je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss
# ROT werden, und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_ziehen.py   (NUR_FALL=a,b · NUR_ANKER=1)
# Benannte Grenze: für „eine Bewegung vor dem Langdruck bricht ab“ steht kein Fall. Chrome schickt bei einem Rollen selbst pointercancel;
# ohne die 8-px-Prüfung ändert sich dort nichts Sichtbares (nachgestellt 25.11.). Die Prüfung bleibt für Browser, die das nicht tun.
import subprocess, shutil, os, tempfile, sys
D='kern/modell/doppel.mjs'; APP='neu/app.mjs'
F=[('kein-langdruck', "else kz.uhr = setTimeout(kzAn, 350);", "else kz.uhr = null;", APP, 'Apfelkuchen steht hinter der Cremetorte'),
   ('klick-nach-zug', "  rezept: (e) => { if (Date.now() - kzGezogen < 400) return; E.zuletzt", "  rezept: (e) => { E.zuletzt", APP, 'das Rezept geht nicht auf'),
   ('nach-falsch', "  const neu = [...rest.slice(0, i), r, ...rest.slice(i)];", "  const neu = [r, ...rest];", 'kern/modell/rezept.mjs', 'Apfelkuchen steht hinter der Cremetorte'),
   ('gruppen-gemischt', "if (kzGruppe(k) !== kz.gruppe) return;", "", APP, 'Gulasch auf eine Backen-Karte'),
   ('foto-kein-ziel', "if (f && f.dataset.kat !== 'alle') {", "if (false) {", APP, 'Dinkelbrötchen liegt jetzt unter'),
   ('ordner-als-kategorie', "if (k.startsWith('ordner:')) baumAblegen([b.uid], 'ord', k.slice(7)); else", "", APP, 'auf den Event-Ordner'),
   ('ohne-rueckgaengig', "melde(L('Reihenfolge geändert', 'Order changed'), L('Rückgängig', 'Undo'), () => { Z.rezepte = vorher; sichern(); zeichne(); });", "melde(L('Reihenfolge geändert', 'Order changed'));", APP, 'Rückgängig stellt'),
   ('marken-bleiben', "b.el.classList.remove('kz-zieht'); kzMarkenWeg();", "b.el.classList.remove('kz-zieht');", APP, 'lässt keinen Strich stehen'),
   ('wisch-falsch-herum', "const ziel = WISCH_FOLGE[i + (dx < 0 ? 1 : -1)];", "const ziel = WISCH_FOLGE[i + (dx < 0 ? -1 : 1)];", APP, 'nach links wischen'),
   ('wisch-ohne-schwelle', "if (Math.abs(dx) < 55 ||", "if (Math.abs(dx) < 5 ||", APP, 'ein kurzer Wisch'),
   ('wisch-auf-leiste', " || rolltQuer(t)) return;\n  sw = {", ") return;\n  sw = {", APP, 'waagerecht rollenden Kategorie-Leiste'),
   ('wisch-im-rezept', "const jetzt = ['rezept', 'kochen', 'form'].includes(s.ansicht) ? null : ", "const jetzt = ['kochen', 'form'].includes(s.ansicht) ? null : s.ansicht === 'rezept' ? 'start' : ", APP, 'im offenen Rezept')]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; anders=0; tot=0
if os.environ.get('NUR_ANKER'):
    for name,a,b,f,erwartet in F:
        n=open(f,encoding='utf-8').read().count(a)
        if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for name,a,b,f,erwartet in F:
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gziehen-')
    for d in ['neu','kern','icons','ausgaben','assets','sbkim']: shutil.copytree(d,W+'/'+d)
    os.makedirs(W+'/beispiele'); shutil.copy('beispiele/KATALOG.json', W+'/beispiele/KATALOG.json')
    s=open(W+'/'+f,encoding='utf-8').read()
    if s.count(a)!=1: print('==',name,'TOTER ANKER'); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_ziehen.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    elif rote: anders+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d aus anderem Grund · %d tote Anker' % (gefangen,durch,anders,tot)); sys.exit(1 if durch or anders or tot else 0)
