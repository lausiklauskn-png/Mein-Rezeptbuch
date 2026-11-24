# Gegenprobe zu tests/smoke_neu_zine.mjs: je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_zine.py   (NUR_FALL=a,b · NUR_ANKER=1)
# Die Probe nimmt ihre Erwartungen aus dem Kern NEBEN sich (dem echten Baum); eine Sabotage im Kern der Kopie verschiebt sie nicht mit.
import subprocess, shutil, os, tempfile, sys
Z='neu/zine.mjs'
F=[('fenster-mit-erklaertext', '<div class="zine-seiten" id="zine">', '<p>Hier entstehen drei Magazin-Seiten zu deinem Rezept.</p><div class="zine-seiten" id="zine">', Z, 'kein Erklärtext auf dem Fenster'),
   ('kopieren-falsche-seite', "A['zine-kopieren'] = (e) => kopiere(+e.dataset.i, false);", "A['zine-kopieren'] = (e) => kopiere(0, false);", Z, 'kopieren legt den Auftrag der richtigen Seite in die Zwischenablage'),
   ('kopieren-stil-egal', "zineAuftraege(app.zeig(r), { stil: stil(), sprache: spr() })[i];", "zineAuftraege(app.zeig(r), { sprache: spr() })[i];", Z, 'ein anderer Stil ändert den Auftrag'),
   ('kopieren-stil-vergessen', "app.E().zineStil = zineStil(e.dataset.stil); sichern();", "app.E().zineStil = zineStil(e.dataset.stil);", Z, 'der Stil bleibt nach dem Neuladen gewählt'),
   ('kopieren-foto-fehlt', ", 'image/png': png })]);", " })]);", Z, 'er legt Bild UND Text zusammen in die Zwischenablage'),
   ('kopieren-verschweigt', "melde(mitFoto ? L('Nur der Auftrag kopiert – dieser Browser nimmt kein Bild', 'Only the request copied – this browser takes no picture') : L('Auftrag kopiert', 'Request copied'));", "melde(L('Auftrag kopiert', 'Request copied'));", Z, 'und die Meldung sagt es'),
   ('einsetzen-falsche-seite', "const zurueck = aendere(uid, (x) => setzeSeite(x, i, bild)); frisch();", "const zurueck = aendere(uid, (x) => setzeSeite(x, 0, bild)); frisch();", Z, 'das Bild liegt an Seite 2'),
   ('einsetzen-unverkleinert', "() => app.bildAusDatei(d)), hatte", "() => new Promise((ja) => { const fr = new FileReader(); fr.onload = () => ja(fr.result); fr.readAsDataURL(d); })), hatte", Z, 'es ist verkleinert wie jedes andere Bild'),
   ('erzeugen-ohne-schluesselfenster', "    if (!SK.openai) { warte = i; app.schluesselFenster('openai', 'zine-weiter'); return; }\n", "", Z, 'ohne OpenAI-Schlüssel kommt das Schlüssel-Fenster'),
   ('erzeugen-sendet-sofort', "  A['zine-weiter'] = () => {", "  { const fragt = A['zine-erzeugen']; A['zine-erzeugen'] = (e) => { fragt(e); if (SK.openai) A['zine-los'](e); }; }\n  A['zine-weiter'] = () => {", Z, 'gesendet ist noch nichts'),
   ('erzeugen-falsche-seite', "zineAuftraege(x, { stil: st, sprache })[i] });", "zineAuftraege(x, { stil: st, sprache })[0] });", Z, 'er trägt den Auftrag DIESER Seite'),
   ('erzeugen-quadratisch', "{ groesse: ZINE_GROESSE, auftrag:", "{ auftrag:", Z, 'das Bild wird im Hochformat bestellt'),
   ('erzeugen-ohne-halt', "    if (p.stellen.length) {\n", "    if (p.stellen.length < 0) {\n", Z, 'ein Befehl an eine KI im Rezept hält an'),
   ('erzeugen-ohne-sendet-doch', "      frei = w === 'a' ? p.sauber : da;", "      frei = da;", Z, '„Ohne senden“ schickt den Befehl nicht mit'),
   ('erzeugen-kreuz-sendet', "      if (!w) { zineFenster(uid); return; }\n", "", Z, 'das Kreuz bricht ab: nichts geht hinaus'),
   ('erzeugen-prueft-alles', "pruefeZineAuftrag(da, kiAnweisungen, i);", "pruefeZineAuftrag(da, kiAnweisungen);", Z, 'geht ohne Halt hinaus'),
   ('entfernen-nimmt-alles', "aendere(offen, (x) => entferneSeite(x, i));", "aendere(offen, (x) => entferneSeite(entferneSeite(entferneSeite(x, 0), 1), 2));", Z, 'nur diese Seite ist weg'),
   ('bildblatt-ohne-zine', "   ${zeile('zine', 'zine', L('Food-Zine', 'Food zine'), ZI.stand(r))}</div>", "</div>", 'neu/app.mjs', 'das Bild-Blatt führt mit einer Zeile samt Stand ins Food-Zine'),
   ('fenster-zeile-ungenau', "const hinaus = (i) => ['OpenAI', zineLiest(i, spr()), kosten()].join(' · ');", "const hinaus = (i) => ['OpenAI', zineLiest(0, spr()), kosten()].join(' · ');", Z, 'je Seite nennt der Knopf genau, was ihr Auftrag liest'),
   ('entfernen-ohne-zurueck', "return () => { app.setzeZ({ ...app.Z(), rezepte: vorher }); sichern(); frisch(); }; };", "return () => { frisch(); }; };", Z, '„Rückgängig“ bringt die Seite zurück'),
   ('galerie-zeigt-rezeptbilder', "const gez = zineF ? ZI.galerie() : mit.filter(", "const gez = !mit ? ZI.galerie() : mit.filter(", 'neu/app.mjs', 'er zeigt jede Zine-Seite als Kachel'),
   ('galerie-loescht-rezeptbild', "weg.get(r.uid).reduce((x, i) => entferneSeite(x, i), r) : r)) });", "{ ...weg.get(r.uid).reduce((x, i) => entferneSeite(x, i), r), img: '' } : r)) });", Z, 'gelöscht ist nur diese Seite'),
   ('sicherung-ohne-zine', "  const zine = zineFeld(r.zine); if (zine) r.zine = zine; else delete r.zine;", "  delete r.zine;", 'kern/modell/rezept.mjs', 'die Sicherung als Datei trägt die Seiten am Rezept'),
   ('sicherung-fremde-adresse', "(typeof v[i] === 'string' && /^data:image\\/(png|jpe?g|webp|gif);base64,/i.test(v[i]) ? v[i] : '')", "(typeof v[i] === 'string' ? v[i] : '')", 'kern/modell/rezept.mjs', 'eine fremde Adresse darin wird keine Seite'),
   ('beispiel-ohne-pruefsumme', "      if (sum !== p.sha256) { melde(L('Food-Zine-Beispiele beschädigt, nicht eingelesen', 'Food zine examples damaged, not imported')); return; }\n", "", Z, 'stimmt die Prüfsumme nicht, wird nichts eingelesen'),
   ('beispiel-ueberschreibt', "    if (zineAnzahl(r) || neu.has(r.uid)) { aus.schonDa++; continue; }\n", "", 'kern/ausgabe/zine.mjs', 'eigene Seiten werden nicht überschrieben'),
   ('beispiel-halber-satz', "    if (!seiten || !seiten.every(Boolean)) { aus.unvollstaendig++; continue; }", "    if (!seiten) { aus.unvollstaendig++; continue; }", 'kern/ausgabe/zine.mjs', 'ein halber Satz kommt nicht an'),
   ('sprache-auftrag-deutsch', "zineAuftraege(app.zeig(r), { stil: stil(), sprache: spr() })[i];", "zineAuftraege(app.zeig(r), { stil: stil(), sprache: 'de' })[i];", Z, 'der Auftrag verlangt englische Beschriftung')]
# Jeder Fall fährt nur seinen Abschnitt der Probe (NUR_TEIL); die Probe als Ganzes läuft vorher einmal ohne Sabotage.
TEILE={'fenster':'1','bildblatt':'5','kopieren':'2','einsetzen':'3','erzeugen':'4','entfernen':'5','galerie':'6','sicherung':'7','beispiel':'8','sprache':'9'}
def teil(name): return TEILE[name.split('-')[0]]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; tot=0
def anker(fall):
    name,a,b,f,erwartet=fall[:5]; paare=[(a,b,f)]+([(fall[5],fall[6],fall[7])] if len(fall)>5 else []); return name,f,erwartet,paare
if os.environ.get('NUR_ANKER'):
    for fall in F:
        name,f,erwartet,paare=anker(fall)
        for a,_,pf in paare:
            n=open(pf,encoding='utf-8').read().count(a)
            if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for fall in F:
    name,f,erwartet,paare=anker(fall)
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gzine-')
    for d in ['neu','kern','icons','ausgaben','assets','sbkim']: shutil.copytree(d,W+'/'+d)
    os.makedirs(W+'/beispiele'); shutil.copy('beispiele/KATALOG.json', W+'/beispiele/KATALOG.json')
    if any(open(W+'/'+pf,encoding='utf-8').read().count(a)!=1 for a,_,pf in paare): print('==',name,'TOTER ANKER'); tot+=1; shutil.rmtree(W); continue
    for a,b,pf in paare: s=open(W+'/'+pf,encoding='utf-8').read(); open(W+'/'+pf,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_zine.mjs'],env={**os.environ,'WURZEL':W,'NUR_TEIL':teil(name)},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d tote Anker' % (gefangen,durch,tot)); sys.exit(1 if durch or tot else 0)
