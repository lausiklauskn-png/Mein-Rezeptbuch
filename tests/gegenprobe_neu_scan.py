# Gegenprobe zu tests/smoke_neu_scan.mjs: je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen (Spalte "erwartet"). Aufruf: python3 -u tests/gegenprobe_neu_scan.py
# NUR_FALL=<name> fährt einen Fall. Braucht wie die Probe den Klon von Workflow PDF.
import subprocess, shutil, os, tempfile, sys
F=[('original-foto', "return { art: 'bild', name, bilder: [b.netz], store: b.store,", "return { art: 'bild', name, bilder: [await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(datei); })], store: b.store,", 'kern/import/scan.mjs', 'Aufnahmedaten (Ort) gehen NICHT hinaus'),
   ('nicht-verkleinert', "const netz = bildAufDeckel(bild, 1200, 0.90), store", "const netz = bildAufDeckel(bild, 9000, 0.90), store", 'kern/ki/reinigung.mjs', 'geht verkleinert hinaus (1200 px)'),
   ('nicht-zugedeckt', "RE.zudecken(img, st, vp.scale); zu++;", "zu++;", 'kern/ki/reinigung.mjs', 'nichts mehr (zugedeckt'),
   ('kein-vermerk', "if (f.kiEntfernt?.length) vermerken(neu, f.kiEntfernt, 'scan');", "", 'neu/app.mjs', 'am Rezept steht der Vermerk'),
   ('abbrechen-sendet-weiter', "if (!(await rein.halt(d.name, v.liste))) { fehler.push([d.name, kiMeldung('abgebrochen', spr())]); break; }", "await rein.halt(d.name, v.liste);", 'neu/app.mjs', 'ROT'),
   ('stufe-falsch', "schnell: { modell: 'claude-haiku-5-5',", "schnell: { modell: 'claude-opus-5-5',", 'kern/ki/claude.mjs', 'Stufe schnell = Haiku 5.5'),
   ('bild-an-claude-bei-mistral', "inhalt = [{ type: 'text', text: gelesen }, { type: 'text', text: auftrag('text', kategorien) }];", "inhalt = [...v.bilder.map(bildBlock), { type: 'text', text: gelesen }, { type: 'text', text: auftrag('text', kategorien) }];", 'kern/import/scan.mjs', 'nur der gelesene TEXT'),
   ('senden-ohne-schluessel', "  if (!SK.anthropic) { schluesselFenster('anthropic', 'scan'); return; }", "", 'neu/app.mjs', 'ohne Anthropic-Schlüssel'),
   ('schluessel-kommt-zurueck', "async weg(a) { await lager.setz(eintrag(a), ''); },", "async weg(a) { await lager.weg(eintrag(a)); },", 'kern/ki/schluessel.mjs', 'ROT')]
nur=os.environ.get('NUR_FALL'); gefangen=0; durch=0; tot=0
for name,a,b,f,erwartet in F:
    if nur and nur!=name: continue
    W=tempfile.mkdtemp(prefix='rb-gs-')
    for d in ['neu','kern','beispiele','icons','ausgaben','sbkim','assets']: shutil.copytree(d,W+'/'+d)
    s=open(W+'/'+f,encoding='utf-8').read(); n=s.count(a)
    if n!=1: print('==',name,'TOTER ANKER',n); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_scan.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
