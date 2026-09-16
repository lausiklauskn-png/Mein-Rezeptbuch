#!/usr/bin/env bash
# Gegenprobe zu tests/smoke_kategorien.mjs. Jeder eingebaute Fehler MUSS die
# Probe umwerfen — UND die rote Zeile muss den Namen der gemeinten Zusicherung
# tragen. „Rot" allein genuegt nicht.
#
# ⚠ Laeuft in einer WEGWERF-KOPIE. Eine liegengebliebene Sabotage im echten
#   Baum sieht danach wie ein Baufehler aus.
# ⚠ Anders als in Mixarium liegt hier ein BAU-SCHRITT dazwischen: die QC-Datei
#   wird sabotiert, dann `python3 build.py`. Ohne den Bau misst man die alte
#   index.html — und jeder Fall waere „nicht gefangen".
set -u
QUELLE="$(cd "$(dirname "$0")/.." && pwd)"
KOPIE="$(mktemp -d)/buch"
mkdir -p "$KOPIE"; cp -a "$QUELLE/." "$KOPIE/" 2>/dev/null
rm -rf "$KOPIE/node_modules"; ln -s "$QUELLE/node_modules" "$KOPIE/node_modules"
cd "$KOPIE" || exit 2
# ⚠ Ablagen INNERHALB der Wegwerf-Kopie. Feste /tmp-Namen teilen sich
#   zwei Laeufe nebeneinander — sie ueberschreiben einander die
#   Quelldatei, und jeder Fall danach ist „rot aus falschem Grund".
SICH="$KOPIE/../_sich.html"; ANKERFEHL="$KOPIE/../_ankerfehl"
DATEI="$(ls QC_*.html | head -1)"
echo "Kopie: $KOPIE · Quelldatei: $DATEI"

gefangen=0; durch=0; falsch=0; tot=0
lauf(){ python3 build.py >/dev/null 2>&1; node tests/smoke_kategorien.mjs 2>&1; }

if lauf | grep -qE "^[0-9]+ grün · 0 ROT$"; then echo "Ausgangslage gruen"; else
  echo "ABBRUCH: schon ohne Eingriff rot."; lauf | tail -4; exit 2; fi

fall(){
  cp "$DATEI" "$SICH"
  ANKERFEHL="$ANKERFEHL" python3 - "$3" <<'PY'
import io,os,sys,glob
p=glob.glob('QC_*.html')[0]
s=io.open(p,encoding='utf-8').read()
alt,neu=sys.argv[1].split('@@@')
if s.count(alt)!=1:
    # ⚠ DER PFAD KOMMT AUS DER UMGEBUNG, nicht aus einer Zeichenkette im
    #   ZITIERTEN Heredoc. Hier stand '"$ANKERFEHL"' — in einem <<'PY' wird
    #   NICHTS ersetzt, also entstand eine Datei, die WOERTLICH so hiess, und
    #   die Pruefung darauf traf nie zu. Folge: ein TOTER ANKER meldete sich
    #   als „NICHT GEFANGEN" — also als blinder Waechter. Gemessen am
    #   2026-09-16 an zwei Faellen, deren Zeile ich selbst verschoben hatte.
    #   Die beiden Ausgaenge verlangen das Gegenteil voneinander: „bau einen
    #   Waechter" gegen „zieh den Fall nach".
    io.open(os.environ['ANKERFEHL'],'w').write('1'); sys.exit(0)
io.open(p,'w',encoding='utf-8').write(s.replace(alt,neu,1))
PY
  if [ -f "$ANKERFEHL" ]; then rm -f "$ANKERFEHL"
    echo "  ⊘ ANKER NICHT GEFUNDEN — $1"; tot=$((tot+1)); cp "$SICH" "$DATEI"; return; fi
  AUS="$(lauf)"
  cp "$SICH" "$DATEI"
  if echo "$AUS" | grep -qE "^[0-9]+ grün · 0 ROT$"; then
    echo "  ✗ NICHT GEFANGEN — $1"; durch=$((durch+1))
  elif echo "$AUS" | grep "✗ ROT" | grep -q "$2"; then
    echo "  ✓ gefangen — $1"; gefangen=$((gefangen+1))
  else
    echo "  ⚠ ROT AUS FALSCHEM GRUND — $1"; echo "$AUS" | grep "✗ ROT" | head -2 | sed 's/^/      /'
    falsch=$((falsch+1))
  fi
}

echo "── Gegenprobe Kategorien ──"

fall "catsFremd findet nichts mehr" "sushi" \
'  return out;
}
function catsAlle(){@@@  return [];
}
function catsAlle(){'

fall "der eigene Name wird ignoriert" "Japanisch" \
"function katBeschriftung(c){if(!c)return'';const e=CATS_EIGEN[c.id];if(e&&e.name)return e.name;@@@function katBeschriftung(c){if(!c)return'';const e=null;if(e&&e.name)return e.name;"

fall "das eigene Symbol wird ignoriert" "Symbol steht davor" \
"function katSymbol(c){if(!c)return'📦';const e=CATS_EIGEN[c.id];if(e&&e.ico)return e.ico;@@@function katSymbol(c){if(!c)return'📦';const e=null;if(e&&e.ico)return e.ico;"

fall "gespeichert wird nicht" "Neuladen" \
"  CATS_EIGEN=neu;svCatsEigen();@@@  CATS_EIGEN=neu;"

fall "das Umbenennen aendert die KENNUNG mit" "Speicher-Weg bleibt r.cat" \
"    if(nm||ic){neu[id]={};if(nm)neu[id].name=nm;if(ic)neu[id].ico=ic;}@@@    if(nm||ic){neu[id]={};if(nm)neu[id].name=nm;if(ic)neu[id].ico=ic;R.forEach(r=>{if(r.cat===id)r.cat=nm||id;});}"

fall "die Alle-Ansicht laeuft wieder nur ueber CATS" "Maki-Rolle" \
"    for(const cat of catsAlle()){@@@    for(const cat of CATS.filter(c=>c.id!=='all')){"

fall "der Dialog listet die mitgebrachten nicht" "listet jede Kategorie" \
"  const liste=catsAlle();@@@  const liste=CATS.filter(c=>c.id!=='all');"

fall "die Herkunfts-Marke faellt weg" "gekennzeichnet" \
"      \${c.fremd?\`<span class=\"kat-fremd\">\${h(X.f)}</span>\`:''}@@@      \${''}"

fall "das Symbol-Feld oeffnet die Auswahl nicht" "Tipp aufs Symbol-Feld" \
'onclick="katEmojiOeffnen(this)"@@@onclick="void 0"'

fall "das Raster wird wieder in die scrollende Liste gebaut" "AUSSERHALB der scrollenden Liste" \
'<div class="kat-list">${zeilen}</div>@@@<div class="kat-list">${zeilen}${katEmojiRaster()}</div><div hidden>'

fall "das Gitter wird wieder plattgedrueckt (kein eigener Scrollbereich)" "wirklich aufgeklappt" \
'.kat-emoji-gitter{display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:2px;@@@.kat-emoji-gitter{display:none;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:2px;'

fall "das Raster schiebt die Liste wieder (Layout bewegt sich beim Oeffnen)" "bewegt sich die angetippte Zeile NICHT" \
'.kat-emoji-raster{position:absolute;left:12px;right:12px;z-index:3;@@@.kat-emoji-raster{position:static;z-index:3;'

fall "das Raster deckt wieder die Knoepfe mit ab (toter Speichern-Knopf)" "verdeckt den Speichern-Knopf nicht" \
"      raster.style.bottom=Math.max(0,bb.bottom-lb.bottom)+'px';@@@      raster.style.bottom='0px';raster.style.top='0px';"

fall "die bearbeitete Zeile wird nicht mehr markiert" "bearbeitete Zeile ist markiert" \
"  if(zeile)zeile.classList.add('kat-row-aktiv');@@@  if(false)zeile.classList.add('kat-row-aktiv');"

fall "die Kopfzeile nennt die Zeile nicht mehr" "nennt sie beim Namen" \
"    kopf.textContent=wie?((X.fuer||'Symbol fuer')+' '+wie):(X.sym||'');@@@    kopf.textContent='';"

fall "die Marke bleibt nach dem Schliessen stehen" "gibt der Liste ihren Platz zurueck" \
"    if(box)box.classList.remove('emoji-auf');@@@    if(false)box.classList.remove('emoji-auf');"

fall "die Wahl schreibt nichts ins Feld" "schreibt es ins Feld" \
"    _katZiel.value=e;@@@    _katZiel.value=_katZiel.value;"

fall "das Raster bleibt nach der Wahl offen" "schliesst das Raster" \
"  katEmojiSchliessen();
}
function openKatUmbenennen(){@@@  _katZiel=null;
}
function openKatUmbenennen(){"

fall "der Vorrat schrumpft auf eine Handvoll" "bietet eine Auswahl an" \
'const KAT_EMOJIS = [@@@const KAT_EMOJIS = ["🍹","🍸","🥤"]; const _KAT_UNUSED = ['

fall "das Scrollen beim Oeffnen kommt zurueck" "verschiebt die Liste nicht" \
"  raster.hidden=false;
}@@@  raster.scrollIntoView({block:'nearest'});
  raster.hidden=false;
}"

fall "eine Familien-Kennung faellt aus den eigenen Kategorien" "decken die ganze Familie ab" \
"const KAT_FAMILIE=[@@@const KAT_FAMILIE=[{id:'zzz_nicht_eigen',ico:'📦',de:'x',en:'x',ru:'x',zh:'x',es:'x',fr:'x',it:'x',pt:'x'},"

fall "ein Name wird erfunden, wo das Woerterbuch schweigt" "keinen erfundenen Namen" \
"      out.push({id:id,ico:'📦',de:id,col:'#7a5840',fremd:true,unbekannt:true});@@@      out.push({id:id,ico:'🍹',de:'Erfunden',col:'#7a5840',fremd:true,unbekannt:true});"

fall "ein Rezept ohne Kategorie faellt wieder durch" "zaehlt BEIDE" \
"  if(!id)return KAT_OHNE;@@@  if(!id)return '';"

fall "ein toter Ordner gilt wieder als Zuhause" "zaehlt BEIDE" \
"    return da?id:KAT_OHNE;@@@    return id;"

fall "der Sammel-Reiter steht auch ohne Heimatlose da" "OHNE Heimatlose gibt es den Reiter nicht" \
"  if(ohne>0){@@@  if(ohne>=0){"

fall "die Alle-Ansicht fragt wieder das rohe Feld" "zeichnet das Rezept ohne Kategorie" \
"      const grp=R.filter(r=>katVonRezept(r)===cat.id&&!r.blank&&r.name&&r.name.trim());if(!grp.length)continue;@@@      const grp=R.filter(r=>r.cat===cat.id&&!r.blank&&r.name&&r.name.trim());if(!grp.length)continue;"

fall "die Getraenke-Symbole verschwinden wieder" "eigene Getraenke-Symbole" \
'"🍶","🍼","🚰","⚗️","🫧","🍋‍🟩",@@@'

# ── Die Ordner-Ansicht zaehlt wieder anders als die Leiste (Klaus 2026-09-16) ──
fall "der Ordner-Baum fragt wieder das rohe Feld" "Leiste = Baum" \
"      recipes:R.filter(r=>!r.folder&&katVonRezept(r)===c.id&&r.name),@@@      recipes:R.filter(r=>!r.folder&&r.cat===c.id&&r.name),"

fall "ein Ordner-Rezept ohne r.folder faellt im Baum wieder heraus" "faellt nirgends heraus" \
"      recipes:R.filter(r=>(r.folder===String(f.id)||r.cat==='fld_'+f.id)&&r.name)}))@@@      recipes:R.filter(r=>r.folder===String(f.id)&&r.name)}))"

# ── Ordner und Kategorie sind zwei Sachen (Klaus 2026-09-16) ──
fall "ein Ordner-Umzug frisst die Kategorie wieder auf" "laesst die Kategorie stehen" \
"  r.folder=String(fid);
  if(typeof r.cat==='string'&&r.cat.indexOf('fld_')===0)r.cat='';@@@  r.folder=String(fid);
  r.cat='fld_'+String(fid);"

fall "der Umzug setzt den Ordner gar nicht mehr" "setzt den Ordner wirklich" \
"  if(!r)return;
  r.folder=String(fid);@@@  if(!r)return;"

fall "eine Altbestands-Kennung wird wieder mitgeschleppt" "nicht mitgeschleppt" \
"  if(typeof r.cat==='string'&&r.cat.indexOf('fld_')===0)r.cat='';
}@@@}"

fall "ein Rezept steht im Ordner-Baum wieder zweimal" "zweimal" \
"      recipes:R.filter(r=>!r.folder&&katVonRezept(r)===c.id&&r.name),@@@      recipes:R.filter(r=>katVonRezept(r)===c.id&&r.name),"

fall "die Zeile im Ordner fragt wieder das rohe Feld" "Ohne-Kategorie statt" \
'            <div style="font-size:.92rem">${catIco(katVonRezept(r))}</div>@@@            <div style="font-size:.92rem">${catIco(r.cat)}</div>'

fall "das Abzeichen zaehlt die Ordner-Rezepte doppelt" "Gruppen mit Inhalt" \
"  const fldCats=catsAlle().filter(c=>R.some(r=>!r.folder&&katVonRezept(r)===c.id&&r.name)).length;@@@  const fldCats=catsAlle().filter(c=>R.some(r=>katVonRezept(r)===c.id&&r.name)).length;"

fall "ein geloeschter Ordner raet wieder Fleisch" "erfindet keine Kategorie" \
"    if(r.cat===('fld_'+String(fid)))r.cat='';
    r.folder='';}});@@@    r.cat='fleisch';
    r.folder='';}});"

fall "der Ordner ueberstimmt die Kategorie in der Anlage-Maske wieder" "trotzdem seine Kategorie" \
"  const catId=document.getElementById('newCat').value||'fleisch';@@@  const catId=folder?('fld_'+folder):(document.getElementById('newCat').value||'fleisch');"

# ── Der Import nimmt einer Kategorie nicht ihr Zuhause (Klaus 2026-09-16) ──
fall "der Import verwandelt die Kategorie wieder in eine Ordner-Kennung" "laesst die Kategorie stehen" \
"    if(typeof ziel==='string'&&ziel.indexOf('fld_')===0){r.folder=ziel.slice(4);return;}@@@    if(typeof ziel==='string'&&ziel.indexOf('fld_')===0){r.cat=ziel;return;}"

fall "der Import setzt den Ordner gar nicht" "setzt den Ordner wirklich" \
"    if(typeof ziel==='string'&&ziel.indexOf('fld_')===0){r.folder=ziel.slice(4);return;}@@@    if(typeof ziel==='string'&&ziel.indexOf('fld_')===0){return;}"

fall "eine fremde Kennung wird wieder zu Fleisch" "ueberlebt die Normalisierung" \
"    if(typeof r.cat!=='string')r.cat='';});@@@    if(typeof r.cat!=='string')r.cat='';if(r.cat&&!validCats.has(r.cat)&&!String(r.cat).startsWith('fld_'))r.cat='fleisch';});"

# ⚠ Ein <select> OHNE `selected` waehlt den ERSTEN Eintrag — `selected` bloss
#   zu entfernen aendert nichts, was der Waechter sieht. Die Reihenfolge wird
#   getauscht, so wie sie vor dem 2026-09-16 wirklich stand.
fall "die Vorauswahl im Dialog steht wieder auf Ordner" "vorausgewaehlt" \
'<option value="__behalten__" selected>🏷 als eigene Kategorie behalten „${h(cat)}"</option><option value="__folder__">@@@<option value="__folder__" selected>'

fall "die Kategorie-Zeile verschweigt die in Ordnern wieder" "nennt die, die in Ordnern liegen" \
'${g.imOrdner?` · +${g.imOrdner} ${T('"'"'fldInOrdnern'"'"')||'"'"'in Ordnern'"'"'}`:'"'"''"'"'}@@@'

# ── Ein Text-Schluessel, den es nicht gibt (Klaus 2026-09-16: „+6 fldInOrdnern") ──
fall "ein benutzter Schluessel fehlt in LANGS" "sind in LANGS.de vorhanden" \
"fldInOrdnern:'in Ordnern',@@@"

fall "die Ordner-Zeile zeigt wieder den Schluesselnamen" "mit einem Wort, nicht mit dem Schluesselnamen" \
"fldInOrdnern:'in Ordnern',@@@fldInOrdnern:'fldInOrdnern',"

fall "der Schluessel-Sammler findet gar nichts" "Sammler findet ueberhaupt Schluessel" \
"function T(k){return(LANGS[CL]||LANGS.de)[k]||k;}@@@function T_(k){return(LANGS[CL]||LANGS.de)[k]||k;}function T(k){return T_(k);}"

echo
echo "$gefangen gefangen · $durch durchgerutscht · $falsch aus falschem Grund · $tot tote Anker"
cd /; rm -rf "$(dirname "$KOPIE")"
[ "$durch" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
