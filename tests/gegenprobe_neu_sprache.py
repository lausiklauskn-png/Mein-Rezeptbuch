# Gegenprobe zu tests/smoke_neu_sprache.mjs: je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_sprache.py   (NUR_FALL=a,b · NUR_ANKER=1)
import subprocess, shutil, os, tempfile, sys
F=[('sprache-fest-deutsch', "const spr = () => sprWahl(E.sprache);", "const spr = () => 'de';", 'neu/app.mjs', 'Gerät Englisch: die Seite sagt lang="en" und begrüßt auf Englisch'),
   ('ein-text-ohne-L', "aria-label=\"${L('Kopf einklappen', 'Collapse header')}\"", "aria-label=\"Kopf einklappen\"", 'neu/app.mjs', 'kein deutscher Rest in der englischen Oberfläche'),
   ('app-tabelle-nicht-geholt', ", new URL('./sprachen/' + code + '.mjs', import.meta.url).href]", "]", 'neu/app.mjs', 'beim Wechsel werden beide Tabellen geholt'),
   ('wahl-nicht-gespeichert', "'sprache-wahl': async (e) => { E.sprache = sprKennt(e.dataset.s) ? e.dataset.s : null; sichern(); fensterZu();", "'sprache-wahl': async (e) => { E.sprache = sprKennt(e.dataset.s) ? e.dataset.s : null; fensterZu();", 'neu/app.mjs', 'die Wahl steht bei den Einstellungen im Speicher'),
   ('uebersetzung-nicht-gezeigt', "const zeig = (r) => (r && s.original !== r.uid ? sicht(r, spr()) : r);", "const zeig = (r) => r;", 'neu/app.mjs', 'Name, Zutaten und Schritte stehen in der Übersetzung da'),
   ('alle-ueberspringt-nicht', "const uebOffen = (ziel) => Z.rezepte.filter((r) => istInhalt(r) && !hatUebersetzung(r, ziel));", "const uebOffen = (ziel) => Z.rezepte.filter((r) => istInhalt(r));", 'neu/app.mjs', 'die Zahl der Rezepte ohne diese Übersetzung und die geschätzten Kosten'),
   ('fehlschlag-haelt-auf', "if (f.schluesselAbgelehnt || f.keinSchluessel || f.status === 402 || f.status === 429) { halt = f.message; nicht = n - ok; break; }", "if (f) { halt = f.message; nicht = n - ok; break; }", 'neu/app.mjs', 'ein Fehlschlag hält den Rest nicht auf'),
   ('abbrechen-ohne-wirkung', "  zuTun = () => ab.abort();", "  zuTun = null;", 'neu/app.mjs', 'Abbrechen hört auf')]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; tot=0
if os.environ.get('NUR_ANKER'):
    for name,a,b,f,erwartet in F:
        n=open(f,encoding='utf-8').read().count(a)
        if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for name,a,b,f,erwartet in F:
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gs-')
    for d in ['neu','kern','icons','ausgaben','assets']: shutil.copytree(d,W+'/'+d)
    os.makedirs(W+'/beispiele'); shutil.copy('beispiele/KATALOG.json', W+'/beispiele/KATALOG.json')
    s=open(W+'/'+f,encoding='utf-8').read(); n=s.count(a)
    if n!=1: print('==',name,'TOTER ANKER',n); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_sprache.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=480); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (next((l for l in rote if erwartet in l), rote[0] if rote else '')[:170]))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
