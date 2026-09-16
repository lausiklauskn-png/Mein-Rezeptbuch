#!/usr/bin/env bash
# Gegenprobe zu tests/smoke_einstellungen_sprache.mjs.
#
# ⚠ SIE LÄUFT IN EINER WEGWERF-KOPIE — eine liegengebliebene Sabotage sieht im
#   echten Baum wie ein Baufehler aus.
# ⚠ SIE BAUT ZWISCHEN SABOTAGE UND MESSUNG NEU (`python3 build.py`). Ohne das
#   misst sie die alte index.html, und JEDER Fall wäre „nicht gefangen".
# ⚠ SIE URTEILT AN DER ROTEN ZEILE, nicht an „rot ja/nein" — ein Fall, der eine
#   FREMDE Zusicherung umwirft, hat seine eigene nicht gemessen.
# ⚠ UND DER AUSGANGSLAGEN-RIEGEL LIEST DIE GANZE SCHLUSSZEILE: „10 ROT" enthält
#   „0 ROT". Derselbe Fehler stand in der Nachbar-Gegenprobe.
set -u
WURZEL="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cp -a "$WURZEL/." "$TMP/kopie" 2>/dev/null
rm -rf "$TMP/kopie/node_modules"; ln -s "$WURZEL/node_modules" "$TMP/kopie/node_modules"
cd "$TMP/kopie" || exit 2
Q="$(ls QC_MeinRezb_*.html | head -1)"
P=tests/smoke_einstellungen_sprache.mjs
gefangen=0; durch=0; falsch=0; tot=0

python3 build.py >/dev/null 2>&1
if ! node "$P" 2>&1 | grep -qE "^[0-9]+ grün · 0 ROT$"; then
  echo "✗ ABBRUCH: die Probe ist schon OHNE Eingriff rot — kein Fall würde etwas messen."; exit 2
fi
echo "Ausgangslage grün."; echo

fall () {   # $1 Name  $2 Anker  $3 Ersatz  $4 erwartete rote Zeile
  local name="$1" anker="$2" ersatz="$3" trifft="$4"
  cp "$Q" "$Q.sicher"
  local erg
  erg=$(python3 - "$Q" "$anker" "$ersatz" <<'PYIN'
import sys
p,a,e = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p, encoding='utf-8').read()
if s.count(a) == 0: print("ANKER_FEHLT"); raise SystemExit
if s.count(a) > 1:  print("ANKER_MEHRFACH"); raise SystemExit
n = s.replace(a, e, 1)
if n == s: print("OHNE_WIRKUNG"); raise SystemExit
open(p, 'w', encoding='utf-8').write(n); print("GEAENDERT")
PYIN
)
  if [ "$erg" != "GEAENDERT" ]; then
    echo "⊘ TOTER ANKER ($erg): $name"; tot=$((tot+1)); mv "$Q.sicher" "$Q"; return
  fi
  python3 build.py >/dev/null 2>&1
  local aus rotz
  aus=$(node "$P" 2>&1)
  rotz=$(printf '%s\n' "$aus" | grep -m1 '^  ✗' || true)
  if [ -z "$rotz" ]; then
    echo "✗ NICHT GEFANGEN: $name"; durch=$((durch+1))
  elif printf '%s' "$rotz" | grep -q "$trifft"; then
    echo "✓ gefangen: $name"; gefangen=$((gefangen+1))
  else
    echo "⚠ ROT AUS FALSCHEM GRUND: $name"; echo "      $rotz"; falsch=$((falsch+1))
  fi
  mv "$Q.sicher" "$Q"; python3 build.py >/dev/null 2>&1
}

# 1 · Die Beschriftung verliert ihre id — genau Klaus' Befund, an einer Zeile nachgestellt.
fall "eine Beschriftung verliert ihre Kennung und bleibt deutsch" \
  '<div class="sett-lbl" id="sNetzLbl">Mit dem Netz verbinden</div>' \
  '<div class="sett-lbl">Mit dem Netz verbinden</div>' \
  "steht still"

# 2 · Die id steht da, aber niemand trägt sie in die Namensliste des Setzers ein.
#     Das ist die STILLE Hälfte des Fehlers: das Markup sieht richtig aus.
fall "die Kennung steht nicht in der Namensliste des Setzers" \
  "'sMistralLbl'," \
  "'sMistralLblFehlt'," \
  "steht still"

# 3 · Der Update-Satz fällt aus der Liste — er hat keine eigene Sabotage nötig,
#     seine Vorgabe steht im Markup und bliebe auf Englisch deutsch stehen.
fall "der Update-Satz fällt aus der Namensliste" \
  "'updateStatus'," \
  "'updateStatusFehlt'," \
  "steht still"

# 4 · Eine „Übersetzung", die keine ist.
fall "die englische Fassung wird wortgleich mit der deutschen" \
  "sToolsPinLbl:'Pinboard'" \
  "sToolsPinLbl:'Pinnwand'" \
  "wortgleich"

# 5 · Eine Sprache verliert einen Schlüssel — fail-soft heisst hier: still deutsch.
fall "ein Schlüssel fehlt in einer der acht Sprachen" \
  ",sNetzSub:'Accedere alla stanza condivisa e trovare altri nodi (senza server)'" \
  "" \
  "fehlt in it"

# 6 · Die Gegenrichtung: der Weg zurück nach Deutsch.
fall "der Setzer überspringt Deutsch — die Oberfläche kommt nicht zurück" \
  "  ids.forEach(id=>{const el=document.getElementById(id);if(el&&L[id]!==undefined)el.textContent=L[id];});" \
  "  if(code!=='de')ids.forEach(id=>{const el=document.getElementById(id);if(el&&L[id]!==undefined)el.textContent=L[id];});" \
  "zurück auf"

# 7 · Die Zeile verschwindet ganz. ⚠ MEIN ERSTER ANLAUF NAHM NUR DIE KLAMMER
#     WEG — dann bleibt „Version 10.0 · Offline-fähig" deutsch stehen, und
#     Abschnitt 1 schlägt ZUERST zu. Rot war es beide Male; nur trug die rote
#     Zeile den Namen einer FREMDEN Zusicherung. Eine Sabotage muss treffen,
#     was der Wächter misst.
fall "die Zeile aus Klaus' Bild verschwindet ganz" \
  '<div class="sett-sub">Version 10.0 · <span id="sOfflineCap">Offline-fähig</span></div>' \
  '<div class="sett-sub"></div>' \
  "steht im Einstellungs-Bildschirm"

echo
echo "$gefangen gefangen · $durch durchgerutscht · $falsch aus falschem Grund · $tot tote Anker"
[ "$durch" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
