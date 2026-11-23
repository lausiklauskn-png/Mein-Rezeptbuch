# Gegenprobe zu test/kern-sprachen.test.js: je Fall eine Sabotage in einer Wegwerf-Kopie von kern/; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_kern_sprachen.py   (NUR_FALL=a,b · NUR_ANKER=1)
import subprocess, shutil, os, tempfile, sys
F=[('eintrag-fehlt', "  'Zubereitung': 'Préparation',\n", "", 'kern/sprachen/fr.mjs', 'Tabelle fr: kein Schlüssel des Kerns fehlt'),
   ('eintrag-ueberzaehlig', "export default {\n", "export default {\n  'Diesen Text gibt es im Kern nicht': 'No existe',\n", 'kern/sprachen/es.mjs', 'Tabelle es: kein Schlüssel ist überzählig'),
   ('platzhalter-weg', "  '{0} Portionen': 'Порций: {0}',", "  '{0} Portionen': 'Порции',", 'kern/sprachen/ru.mjs', 'Tabelle ru: dieselben Platzhalter'),
   ('leerer-wert', "  'Liste': 'Lista',", "  'Liste': ' ',", 'kern/sprachen/it.mjs', 'Tabelle it: kein leerer Wert'),
   ('unuebersetzt', "  'Einzelheiten': 'Detalhes',", "  'Einzelheiten': 'Einzelheiten',", 'kern/sprachen/pt.mjs', 'Tabelle pt: kein Wert gleicht dem deutschen Schlüssel'),
   ('name-weg', "'Anthropic 提示：余额不足。'", "'提示：余额不足。'", 'kern/sprachen/zh.mjs', 'Tabelle zh: Namen und Einheiten bleiben stehen'),
   ('gerades-anfuehrungszeichen', "  'Einzelheiten': 'Détails',", "  'Einzelheiten': 'Détails \"tous\"',", 'kern/sprachen/fr.mjs', 'Tabelle fr: kein < > und kein gerades Anführungszeichen'),
   ('rand-weg', "  ' und ': ' y ',", "  ' und ': 'y',", 'kern/sprachen/es.mjs', 'Tabelle es: Leerzeichen am Rand'),
   ('kein-modul', "export default {\n", "const tabelle = {\n", 'kern/sprachen/it.mjs', 'Tabelle it: gültiges ES-Modul'),
   ('modul-kaputt', "  'Liste': 'Список',\n", "  'Liste': 'Список'\n", 'kern/sprachen/ru.mjs', 'Tabelle ru: gültiges ES-Modul'),
   ('neuer-text-im-kern', "text(sprache, 'Es wurde kein Bild übergeben.', 'No picture was given.')", "text(sprache, 'Es wurde kein Foto übergeben.', 'No photo was given.')", 'kern/ki/ocr.mjs', 'Tabelle es: kein Schlüssel des Kerns fehlt'),
   ('aufruf-nicht-lesbar', "text(sprache, 'Texterkennung fehlgeschlagen', 'Text recognition failed')", "text(sprache, ...['Texterkennung fehlgeschlagen', 'Text recognition failed'])", 'kern/ki/ocr.mjs', 'jeder text()-Aufruf im Kern ist lesbar'),
   ('neue-tabelle-ungeklaert', "export const HALT_JA = ['Ohne ihn senden', 'Send without it'],", "export const HALT_NEIN = ['Doch nicht', 'Rather not'], HALT_JA = ['Ohne ihn senden', 'Send without it'],", 'kern/ki/reinigung.mjs', 'keine oberste Tabelle bleibt ungeklärt'),
   ('aussen-vergessen', "  'ki/reinigung.mjs': ['HALT_JA', 'HALT_TITEL'],", "  'ki/reinigung.mjs': ['HALT_TITEL'],", 'kern/sprachen/schluessel.mjs', 'keine oberste Tabelle bleibt ungeklärt'),
   ('huellen-nicht-gelesen', "if (!huellen.has(f.name)) { huellen.set(", "if (false) { huellen.set(", 'kern/sprachen/schluessel.mjs', 'jede Form, in der ein Paar im Kern steht, wird gelesen'),
   ('farbname-an-der-tabelle-vorbei', "return text(sprache, f.de, f.en); };", "return sprache === 'de' ? f.de : f.en; };", 'kern/oberflaeche/farben.mjs', 'die Texte kommen bei den Funktionen des Kerns an'),
   ('tabelle-wird-nicht-gefragt', "const t = TAB[code]; return (t && Object.prototype.hasOwnProperty.call(t, de) ? t[de] : null) ?? en ?? de;", "return en ?? de;", 'kern/oberflaeche/sprache.mjs', 'liefert nach ladeTabelle() den Eintrag')]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; tot=0
if os.environ.get('NUR_ANKER'):
    for name,a,b,f,erwartet in F:
        n=open(f,encoding='utf-8').read().count(a)
        if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for name,a,b,f,erwartet in F:
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-ks-'); shutil.copytree('kern',W+'/kern')
    s=open(W+'/'+f,encoding='utf-8').read(); n=s.count(a)
    if n!=1: print('==',name,'TOTER ANKER',n); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: aus=subprocess.run(['node','--test','test/kern-sprachen.test.js'],env={**os.environ,'WURZEL':W},capture_output=True,text=True,timeout=120).stdout
    except subprocess.TimeoutExpired: aus='not ok 0 - GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if l.startswith('not ok')]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', next((l for l in rote if erwartet in l), rote[0] if rote else '')[:130], '| rote Zeilen:', len(rote))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
