# Gegenprobe zu tests/smoke_neu_menue.mjs: je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_menue.py   (NUR_FALL=a,b · NUR_ANKER=1)
import subprocess, shutil, os, tempfile, sys
F=[('ki-ohne-schluessel', "  if (!SK.anthropic) { schluesselFenster('anthropic', 'rmenue'); return; }", "", 'neu/app.mjs', 'ohne Anthropic-Schlüssel kommt das Schlüssel-Fenster'),
   ('recht-uebernimmt-alles', "rechtschreibungAnwenden(r, e.aenderungen.filter((_, i) => wahl.includes(i)))", "rechtschreibungAnwenden(r, e.aenderungen)", 'neu/app.mjs', 'übernommen ist, was angehakt war'),
   ('teil-link-nicht-gelesen', "const geteiltesRezept = /^#share=/.test(location.hash) ? location.href : '';", "const geteiltesRezept = '';", 'neu/app.mjs', 'der geteilte Link wird beim Start gelesen'),
   ('einheit-wird-gespeichert', "  einheiten: () => { const f = ['', 'us', 'metrisch']; E.einheiten = f[(f.indexOf(E.einheiten || '') + 1) % f.length]; sichern();", "  einheiten: () => { const f = ['', 'us', 'metrisch']; E.einheiten = f[(f.indexOf(E.einheiten || '') + 1) % f.length]; if (E.einheiten) Z.rezepte = Z.rezepte.map((x) => rezeptIn(x, E.einheiten)); sichern();", 'neu/app.mjs', 'gespeichert bleibt das Rezept, wie es notiert ist'),
   ('naehr-mit-schritten', "Ingredients: ${(r.ings || []).map(zutatZeile).filter(Boolean).join(', ')}.", "Ingredients: ${(r.ings || []).map(zutatZeile).filter(Boolean).join(', ')}. Steps: ${(r.steps || []).map((s) => s.txt).join(' ')}.", 'kern/ki/helfer.mjs', 'Name und Zutaten, keine Schritte'),
   ('ki-zeile-ohne-auskunft', "<small>${esc(kiKurz(was))}</small></span><i class=\"ki-marke\">", "<small></small></span><i class=\"ki-marke\">", 'neu/app.mjs', 'eine KI-Zeile sagt in der Zeile, was an wen hinausgeht')]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; tot=0
if os.environ.get('NUR_ANKER'):
    for name,a,b,f,erwartet in F:
        n=open(f,encoding='utf-8').read().count(a)
        if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for name,a,b,f,erwartet in F:
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gm-')
    for d in ['neu','kern','icons','ausgaben','assets']: shutil.copytree(d,W+'/'+d)
    os.makedirs(W+'/beispiele'); shutil.copy('beispiele/KATALOG.json', W+'/beispiele/KATALOG.json')
    s=open(W+'/'+f,encoding='utf-8').read(); n=s.count(a)
    if n!=1: print('==',name,'TOTER ANKER',n); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_menue.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
