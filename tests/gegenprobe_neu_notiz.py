# Gegenprobe zu tests/smoke_neu_notiz.mjs: je Fall eine Sabotage in einer Wegwerf-Kopie; die Probe muss ROT werden,
# und die rote Zeile muss den Namen der Zusicherung tragen. Aufruf: python3 -u tests/gegenprobe_neu_notiz.py   (NUR_FALL=a,b · NUR_ANKER=1)
# Je Fall: (Name, Anker, Ersatz, Datei, erwartete rote Zeile, Abschnitt der Probe).
import subprocess, shutil, os, tempfile, sys
NB='neu/notizbuch.mjs'; APP='neu/app.mjs'
F=[('kopf-ohne-knopf', "${NB.kopfKnopf()}<button class=\"rund akz\" data-a=\"neu\"", "<button class=\"rund akz\" data-a=\"neu\"", APP, 'im Kopf steht der Knopf „Notizbuch“', 1),
   ('fenster-mit-erklaertext', "<div class=\"nz-feld\">", "<p>Hier kannst du alles notieren, was dir unterwegs einfällt, und es später weiterverarbeiten.</p><div class=\"nz-feld\">", NB, 'kein Erklärtext auf dem Blatt', 1),
   ('foto-unverkleinert', "entwurf.fotos.push(await app.bildAusDatei(f, NOTIZ_KANTE));", "entwurf.fotos.push(await new Promise((ja) => { const fr = new FileReader(); fr.onload = () => ja(fr.result); fr.readAsDataURL(f); }));", NB, 'das Foto ist im Gerät verkleinert', 1),
   ('speichern-vergisst', "const setze = (l) => { app.setzeZ({ ...app.Z(), notizen: l }); sichern(); };", "const setze = (l) => { app.setzeZ({ ...app.Z(), notizen: l }); };", NB, 'der Haken legt die Notiz ab', 1),
   ('tag-ohne-bestaetigung', "neueNotiz({ text, fotos: entwurf.fotos, tag: entwurf.tag, zeit: entwurf.zeit });", "neueNotiz({ text, fotos: entwurf.fotos, tag: entwurf.tag || tagAusText(text)?.tag || '', zeit: entwurf.zeit });", NB, 'ohne Tipp auf den Vorschlag bekommt die Notiz keinen Tag', 2),
   ('tag-ohne-zeit', "A['nz-tag-ja'] = (e) => { entwurf.tag = e.dataset.tag; entwurf.zeit = e.dataset.zeit || '';", "A['nz-tag-ja'] = (e) => { entwurf.tag = e.dataset.tag; entwurf.zeit = '';", NB, 'ein Tipp übernimmt Tag und Uhrzeit', 2),
   ('ics-ohne-alarm', "'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.titel)}`, zeit ? `TRIGGER:-PT${e.vorher ?? 30}M` : 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');", "'END:VEVENT');", 'kern/ausgabe/ics.mjs', 'eine Erinnerung 30 Minuten vorher', 3),
   ('ics-ortszeit-als-utc', "z.push(`DTSTART:${icsZeit(b.toISOString())}`", "z.push(`DTSTART:${e.tag.replace(/-/g, '')}T${zeit.replace(':', '')}00Z`", 'kern/ausgabe/ics.mjs', 'Beginn (Ortszeit als UTC)', 3),
   ('ics-ganztag-falsch', "zeit ? `TRIGGER:-PT${e.vorher ?? 30}M` : 'TRIGGER:PT9H'", "`TRIGGER:-PT${e.vorher ?? 30}M`", 'kern/ausgabe/ics.mjs', 'ein ganztägiger Termin mit Erinnerung um 9 Uhr', 3),
   ('ics-ohne-falten', "  return z.map(icsFalten).join('\\r\\n') + '\\r\\n';", "  return z.join('\\r\\n') + '\\r\\n';", 'kern/ausgabe/ics.mjs', 'CRLF und gefaltete Zeilen', 3),
   ('lesen-sendet-sofort', "s.ausNotiz = n.id; s.tellerWahl = teller; app.scanGewaehlt([await fotoDatei(n)]); };", "s.ausNotiz = n.id; s.tellerWahl = teller; await app.scanGewaehlt([await fotoDatei(n)]); A['scan-senden'](); };", NB, 'gesendet ist noch nichts', 4),
   ('teller-wird-lesen', "A['nz-teller'] = (e) => scan(e, true);", "A['nz-teller'] = (e) => scan(e, false);", NB, 'b: „Vom Teller“ führt ins Scan-Blatt', 4),
   ('notiz-reist-nicht', "  if (ansicht === 'form' && s.ausNotiz && s.form?.neu) { s.form.notiz = s.ausNotiz; s.ausNotiz = null; }", "", APP, 'nach dem Speichern bietet die Meldung „Notiz abhaken“', 4),
   ('abhaken-macht-nichts', "L('Notiz abhaken', 'Tick off note'), () => erledigt(id, true)); return true;", "L('Notiz abhaken', 'Tick off note'), () => {}); return true;", NB, 'ein Tipp auf „Notiz abhaken“ hakt sie ab', 4),
   ('abhaken-sofort', "      setze(aendereNotiz(liste(), id, (x) => ({ ...x, rezept: uid })));", "      setze(aendereNotiz(liste(), id, (x) => ({ ...x, rezept: uid, erledigt: true })));", NB, 'abgehakt ist sie noch nicht', 4),
   ('aufteilen-ohne-auskunft', "z('nz-aufteilen', 'datei', L('Aufteilen', 'Split'), L('ohne KI', 'without AI'))", "z('nz-aufteilen', 'datei', L('Aufteilen', 'Split'), '')", NB, '„Aufteilen“ sagt, dass keine KI beteiligt ist', 5),
   ('idee-ohne-auskunft', "L('Rezept vorschlagen', 'Suggest a recipe'), 'Anthropic · ' + L('Notiztext', 'Note text'))", "L('Rezept vorschlagen', 'Suggest a recipe'), '')", NB, 'an „Rezept vorschlagen“ steht, was an wen geht', 5),
   ('idee-ohne-schluesselfenster', "    if (!SK.anthropic) { offenFuer = n.id; app.schluesselFenster('anthropic', 'nz-idee'); return; }\n", "", NB, 'ohne Schlüssel kommt das Schlüssel-Fenster', 5),
   ('idee-ohne-pruefung', "if (stellen.length && !(await app.befehlFrage(stellen))) { oeffnen(n.id); return; }", "", NB, 'ein Befehl an eine KI in der Notiz hält an', 5),
   ('idee-als-bloecke', "  const a = jsonAusAntwort(await frageClaude(typeof schluessel === 'object' ? schluessel.anthropic : schluessel, ideeAuftrag(t, kategorien, sprache),", "  const a = jsonAusAntwort(await frageClaude(typeof schluessel === 'object' ? schluessel.anthropic : schluessel, [{ type: 'text', text: ideeAuftrag(t, kategorien, sprache) }],", 'kern/import/idee.mjs', 'geht nur der Notiztext an Claude', 5),
   ('planen-ohne-einkauf', "einkauf: da ? ek : { ...ek, posten: [...ek.posten, { uid: r.uid, portionen: r.servings }] },", "einkauf: ek,", NB, 'd: seine Zutaten stehen auf der Einkaufsliste', 6),
   ('planen-falscher-tag', "plan: planen(vorher.plan || {}, n.tag, r.uid)", "plan: planen(vorher.plan || {}, tagIso(new Date()), r.uid)", NB, 'd: das Rezept steht an diesem Tag im Wochenplan', 6),
   ('planen-ohne-rueckgaengig', "L('Rückgängig', 'Undo'), () => { app.setzeZ(vorher); sichern(); frisch(); });\n  };", "L('Rückgängig', 'Undo'), () => {});\n  };", NB, '„Rückgängig“ nimmt Plan und Liste zurück', 6),
   ('start-ohne-hinweis', "  NB.beimStart();   /* heute fällige Notizen: eine Meldung beim Öffnen */\n", "", APP, 'beim Öffnen sagt eine Meldung', 7),
   ('faellig-mit-erledigtem', "filter((n) => !n.erledigt && n.tag && n.tag <= tagIso(jetzt));", "filter((n) => n.tag && n.tag <= tagIso(jetzt));", 'kern/modell/notiz.mjs', 'nur das Offene', 7),
   ('zahl-fehlt', "z = n ? `<span class=\"zahl nz-zahl\"", "z = 0 ? `<span class=\"zahl nz-zahl\"", NB, 'am Knopf im Kopf steht die Zahl', 7),
   ('haken-nicht-ans-ende', "const rang = (n) => (n.erledigt ? 2 : n.tag ? 0 : 1);", "const rang = (n) => (n.tag ? 0 : 1);", 'kern/modell/notiz.mjs', 'abgehakt: durchgestrichen und ans Ende', 8),
   ('loeschen-ohne-rueckgaengig', "notizTitel(n, spr(), 30)), L('Rückgängig', 'Undo'), () => { setze(vorher); frisch(); }); };", "notizTitel(n, spr(), 30)), L('Rückgängig', 'Undo'), () => {}); };", NB, '„Rückgängig“ holt sie zurück', 8),
   ('sicherung-ohne-notizen', ", plan: zustand.plan || null, notizen: notizListe(zustand.notizen) };", ", plan: zustand.plan || null };", 'kern/sicherung/sicherung.mjs', 'die Sicherung als Datei trägt die Notizen', 8),
   ('feld-zu-breit', ".nz-feld{display:flex;gap:8px;align-items:flex-end}", ".nz-feld{display:flex;gap:8px;align-items:flex-end;min-width:360px}", 'neu/app.css', 'bei 320 px: das Notizbuch läuft nicht quer', 9)]
nur=os.environ.get('NUR_FALL'); nur=nur.split(',') if nur else None; gefangen=0; durch=0; anders=0; tot=0
if os.environ.get('NUR_ANKER'):
    for name,a,b,f,erwartet,teil in F:
        n=open(f,encoding='utf-8').read().count(a)
        if n!=1: print('==',name,'TOTER ANKER',n); tot+=1
    print('%d Fälle, %d tote Anker' % (len(F),tot)); sys.exit(1 if tot else 0)
for name,a,b,f,erwartet,teil in F:
    if nur and name not in nur: continue
    W=tempfile.mkdtemp(prefix='rb-gnotiz-')
    for d in ['neu','kern','icons','ausgaben','assets','sbkim']: shutil.copytree(d,W+'/'+d)
    os.makedirs(W+'/beispiele'); shutil.copy('beispiele/KATALOG.json', W+'/beispiele/KATALOG.json')
    s=open(W+'/'+f,encoding='utf-8').read()
    if s.count(a)!=1: print('==',name,'TOTER ANKER'); tot+=1; shutil.rmtree(W); continue
    open(W+'/'+f,'w',encoding='utf-8').write(s.replace(a,b))
    try: r=subprocess.run(['node','tests/smoke_neu_notiz.mjs'],env={**os.environ,'WURZEL':W,'NUR_TEIL':str(teil)},capture_output=True,text=True,timeout=420); aus=r.stdout
    except subprocess.TimeoutExpired as e: aus=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or ''); aus+='\n  ✗ ROT: GESTOLPERT (Zeit)'
    rote=[l.strip() for l in aus.splitlines() if 'ROT:' in l]
    treffer=any(erwartet in l for l in rote)
    if treffer: gefangen+=1
    elif rote: anders+=1
    else: durch+=1
    print('==',name,'GEFANGEN' if treffer else ('NICHT GEFANGEN' if not rote else 'ROT AUS ANDEREM GRUND'), '|', (rote[0][:150] if rote else ''))
    shutil.rmtree(W)
print('\n%d gefangen · %d nicht · %d aus anderem Grund · %d tote Anker' % (gefangen,durch,anders,tot)); sys.exit(1 if durch or anders or tot else 0)
