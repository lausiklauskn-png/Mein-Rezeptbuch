# Gegenprobe zu tests/smoke_neu.mjs Abschnitt 9 (Klaus 25.11.: Zuordnen, Sicherung teilen, Foto über Pollinations).
# Je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden, und die rote Zeile muss den Namen der Zusicherung
# tragen (Spalte "erwartet"). Aufruf: python3 -u tests/gegenprobe_neu_vergleich.py · NUR_FALL=<name> fährt einen Fall.
import subprocess, shutil, os, tempfile, sys
F=[('kein-alle-knopf', "${n && ['ohne', 'unbekannt', 'fremd'].includes(c.art) ?", "${n && false ?", 'neu/app.mjs', 'tragen den Knopf „alle zuordnen“'),
   ('zuordnen-tut-nichts', "(n++, { ...r, cat: ziel })", "(n++, { ...r })", 'neu/app.mjs', 'die unbekannte Kategorie ist leer'),
   ('kein-hinweis', "return offen ? `<p class=\"hinweis\" id=\"kat-offen\">", "return false ? `<p class=\"hinweis\" id=\"kat-offen\">", 'neu/app.mjs', 'ein Hinweis nennt die Rezepte'),
   ('kein-teilen', "(navigator.canShare ? zeile('sicherung-teilen'", "(false ? zeile('sicherung-teilen'", 'neu/app.mjs', '„Sicherung teilen“ gibt die Sicherung'),
   ('ohne-schluessel-los', "if (!SK.pollinations) { schluesselFenster('pollinations', 'gratis:' + uid); return; }", "", 'neu/app.mjs', 'fragt die App zuerst nach dem Pollinations-Schlüssel'),
   ('schluessel-fehlt-im-abruf', "await gratisBild(frei, { schluessel: SK.pollinations })", "await gratisBild(frei)", 'neu/app.mjs', 'das Bild kommt von gen.pollinations.ai')]
nur=os.environ.get('NUR_FALL'); gefangen=0; durch=0; tot=0
for name,a,b,f,erwartet in F:
    if nur and nur!=name: continue
    W=tempfile.mkdtemp(prefix='rb-gv-')
    for d in ['neu','kern','beispiele','icons','ausgaben','sbkim','assets','tests']:
        if os.path.isdir(d): shutil.copytree(d,W+'/'+d)
    s=open(W+'/'+f,encoding='utf-8').read(); n=s.count(a)
    if n!=1: print('==',name,'TOTER ANKER',n); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu.mjs'],cwd=W,capture_output=True,text=True,timeout=600); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''), flush=True)
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
