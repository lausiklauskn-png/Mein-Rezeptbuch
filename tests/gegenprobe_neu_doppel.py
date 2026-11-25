# Gegenprobe zu tests/smoke_neu_doppel.mjs (R6 Doppelungen, Merkmale): je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss
# ROT werden, und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_doppel.py   (NUR_FALL=a,b · NUR_ANKER=1)
import subprocess, shutil, os, tempfile, sys
D='kern/modell/doppel.mjs'; APP='neu/app.mjs'
F=[('alkohol-trennt-nicht', "  if ((x === 'ohne') !== (y === 'ohne') && (x || y)) return true;\n", "", D, 'kein Doppel: Virgin Mojito'),
   ('merkmal-trennt-nicht', "  return merkmaleVon(a).join() !== merkmaleVon(b).join();", "  return false;", D, 'kein Doppel: Virgin Mojito'),
   ('bild-blind', "let d = 0; for (let i = 0;", "return Infinity; let d = 0; for (let i = 0;", D, 'genau drei Paare'),
   ('nur-name', "if ((nameGleich || name >= SCHWELLE.nameAehnlich) && (zut >= SCHWELLE.sicherZutaten || bild)) return", "if (nameGleich) return", D, 'genau drei Paare'),
   ('einlesen-prueft-nicht', "if (neuIds.length) { doppelPruefen(neuIds);", "if (neuIds.length) {", APP, 'genau drei Paare'),
   ('ganz-ohne-text', "if (wahl === 'text' || wahl === 'ganz') {", "if (wahl === 'text') {", D, '„Ganz das neue“'),
   ('ganz-ueberschreibt-kategorie', "const TEXT_FELDER = ['name',", "const TEXT_FELDER = ['cat', 'name',", D, '„Ganz das neue“'),
   ('vorgabe-loescht', "p.stufe === 'sicher' ? 'meins' : 'beide'", "'meins'", APP, 'genau drei Paare'),
   ('spaeter-loescht', "  zuTun = () => { dopp = null; };\n}", "  zuTun = () => { if (dopp) { const d = dopp; dopp = null; d.wahl = new Map(d.paare.map((p) => [p.neu, 'meins'])); dopp = d; setTimeout(doppelAnwenden, 0); } };\n}", APP, '„Später“ schließt, beide bleiben'),
   ('formular-ohne-hinweis', "    if (p) { f.doppel = p; zeichne();", "    if (false) { f.doppel = p; zeichne();", APP, 'ähnliches Rezept: ein Band im Formular'),
   ('formular-text-legt-an', "s.form = null; rezeptSetzen(zus);", "s.form = null; Z.rezepte = [...Z.rezepte, normalisiere({ ...roh })]; sichern();", APP, '„Nur den Text übernehmen“'),
   ('merkmal-speichert-nicht', "merkmalUmschalten(x, e.dataset.m), modified: new Date().toISOString() } : x)); sichern(); zeichne(); },", "merkmalUmschalten(x, e.dataset.m), modified: new Date().toISOString() } : x)); zeichne(); },", APP, 'ein Tipp setzt „laktosefrei“'),
   ('suche-ohne-merkmal', ", ...(r.tags || []), ...merkmalWorte(r, sprache)].join(' '));", ", ...(r.tags || [])].join(' '));", 'kern/modell/suche.mjs', 'die Wortsuche „vegan“ findet'),
   ('karte-ohne-merkmal', "<strong>${esc(r.name)}${merkZeichen(r0)}</strong>", "<strong>${esc(r.name)}</strong>", APP, 'die Karte in der Liste zeigt die Merkmale')]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; anders=0; tot=0
if os.environ.get('NUR_ANKER'):
    for name,a,b,f,erwartet in F:
        n=open(f,encoding='utf-8').read().count(a)
        if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for name,a,b,f,erwartet in F:
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gdoppel-')
    for d in ['neu','kern','icons','ausgaben','assets','sbkim']: shutil.copytree(d,W+'/'+d)
    os.makedirs(W+'/beispiele'); shutil.copy('beispiele/KATALOG.json', W+'/beispiele/KATALOG.json')
    s=open(W+'/'+f,encoding='utf-8').read()
    if s.count(a)!=1: print('==',name,'TOTER ANKER'); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_doppel.mjs'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    elif rote: anders+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d aus anderem Grund · %d tote Anker' % (gefangen,durch,anders,tot)); sys.exit(1 if durch or anders or tot else 0)
