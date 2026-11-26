#!/usr/bin/env python3
"""Startrezepte der neuen PWA und das alkoholfreie Geschenkbuch (Klaus 26.11.2026).

Klaus 23.11.2026: „Man kann doch schon ein paar kleine Beispielrezepte mit reinnehmen. Man muss ja nicht erst fragen."
Klaus 26.11.2026: „die App erst laden und dann … die Rezepte nachziehen … die Bilder erst in einer schlechteren Version"
und „die würde ich gerne verschenken, so wie sie sind, damit das Rezeptbuch etwas bunter dasteht".

Quelle: beispiele/rezeptbuch-2026-11-26.json (Klaus' bereinigtes Buch). Die Rezeptbuch-Ausgabe erlaubt keinen Alkohol
(ausgaben/rezeptbuch/ausgabe.json, alkoholErlaubt: false); alkoholische Getränke bleiben deshalb draußen (die gehören ins Mixarium).

Schreibt:
  beispiele/rezeptbuch-geschenk.json   das alkoholfreie Buch mit vollen Bildern (Katalog-Paket „Beispielbuch laden")
  neu/start-rezepte.json               dieselben Rezepte mit winzigem Vorschaubild (48 px) und `bildNach`
  neu/start-bilder/<uid>.webp          die vollen Bilder; die App holt sie nach dem Start im Hintergrund nach

Aufruf:  python3 tools/start-rezepte.py
"""
import base64, hashlib, io, json, pathlib, re
from PIL import Image

WURZEL = pathlib.Path(__file__).resolve().parent.parent
QUELLE = WURZEL / 'beispiele' / 'rezeptbuch-2026-11-26.json'
BUCH = WURZEL / 'beispiele' / 'rezeptbuch-geschenk.json'
ZIEL = WURZEL / 'neu' / 'start-rezepte.json'
BILDER = WURZEL / 'neu' / 'start-bilder'
GETRAENKE = {'drk', 'smooth', 'mock', 'afckt', 'limo', 'tee', 'ckt', 'bowle'}
ALKOHOL = re.compile(r'\b(rum|wodka|vodka|gin|whisk(e)?y|tequila|likör|likoer|sekt|prosecco|champagner|wein|bier|amaretto|baileys|kahl[uú]a|schnaps|brandy|cognac|liqueur|wine|beer)\b', re.I)
VORSCHAU = 48

def alkoholisch(r):
    if r.get('cat') not in GETRAENKE: return False
    if r.get('alcohol'): return True
    return any(ALKOHOL.search(z.get('name', '')) and not re.search(r'alkoholfrei|ginger beer|ingwer', z.get('name', ''), re.I) for z in r.get('ings', []))

def bild(adresse):
    return Image.open(io.BytesIO(base64.b64decode(adresse.split(',', 1)[1]))).convert('RGB')

def webp(im, guete):
    aus = io.BytesIO(); im.save(aus, 'WEBP', quality=guete, method=6); return aus.getvalue()

buch = json.loads(QUELLE.read_text(encoding='utf-8'))
rezepte = [r for r in buch['recipes'] if not alkoholisch(r)]
draussen = [r['name'] for r in buch['recipes'] if alkoholisch(r)]
if any(not (r.get('img') or '').startswith('data:image/') for r in rezepte): raise SystemExit('Ein Rezept hat kein eingebettetes Bild.')
geschenk = {**buch, 'quelle': 'Klaus\' Rezeptbuch 26.11.2026, alkoholfrei', 'menu': [], 'folders': [], 'notizen': [], 'recipes': rezepte}
BUCH.write_text(json.dumps(geschenk, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

BILDER.mkdir(exist_ok=True)
for alt in BILDER.glob('*.webp'): alt.unlink()
start = []
for r in rezepte:
    im = bild(r['img'])
    if r['img'].startswith('data:image/webp') and max(im.size) <= 1600: voll = base64.b64decode(r['img'].split(',', 1)[1])
    else: im.thumbnail((1600, 1600), Image.LANCZOS); voll = webp(im, 86)
    datei = re.sub(r'[^A-Za-z0-9_-]', '_', r['uid']) + '.webp'
    (BILDER / datei).write_bytes(voll)
    klein = im.copy(); klein.thumbnail((VORSCHAU, VORSCHAU), Image.LANCZOS)
    start.append({**r, 'img': 'data:image/webp;base64,' + base64.b64encode(webp(klein, 50)).decode('ascii'), 'bildNach': 'start-bilder/' + datei})
ZIEL.write_text(json.dumps({**geschenk, 'quelle': 'start-rezepte (Auszug aus dem Geschenkbuch, Bilder kommen nach)', 'recipes': start}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

# Katalog: Paket für „Beispielbuch laden"
kat_pfad = WURZEL / 'beispiele' / 'KATALOG.json'
kat = json.loads(kat_pfad.read_text(encoding='utf-8'))
roh = BUCH.read_bytes()
paket = {'id': 'rezeptbuch-geschenk', 'titel': f'Geschenkbuch: {len(rezepte)} Rezepte', 'datei': BUCH.name, 'art': 'rezepte', 'alkohol': False,
         'anzahl': len(rezepte), 'bytes': len(roh), 'sha256': hashlib.sha256(roh).hexdigest(), 'fuer': ['rezeptbuch', 'muttis']}
kat['pakete'] = [p for p in kat['pakete'] if p['id'] != paket['id']]; kat['pakete'].insert(0, paket)
kat_pfad.write_text(json.dumps(kat, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

groesse = sum(f.stat().st_size for f in BILDER.glob('*.webp'))
print(f'{len(rezepte)} Rezepte (draußen, mit Alkohol: {", ".join(draussen)})')
print(f'{ZIEL.relative_to(WURZEL)}: {ZIEL.stat().st_size // 1024} KB · {BILDER.relative_to(WURZEL)}: {len(list(BILDER.glob("*.webp")))} Bilder, {groesse // 1024} KB · {BUCH.name}: {len(roh) // 1024} KB')
