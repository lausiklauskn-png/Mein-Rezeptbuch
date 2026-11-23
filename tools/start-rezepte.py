#!/usr/bin/env python3
"""Startrezepte der neuen PWA: ein kleiner Auszug aus dem Beispielbuch, fest in der App (neu/start-rezepte.json).

Klaus 23.11.2026: „Man kann doch schon ein paar kleine Beispielrezepte mit reinnehmen. Man muss ja nicht erst fragen."
Die App legt sie nur beim allerersten Start hinein (als Beispiele markiert, mit einem Tipp entfernbar). Die Rezepte tragen
dieselbe uid wie im Beispielbuch; wer das ganze Buch später lädt, bekommt sie nicht doppelt.
Bilder: lange Kante 640 px, JPEG – damit die Datei klein bleibt (das Beispielbuch selbst hat 10 MB).

Aufruf:  python3 tools/start-rezepte.py     (schreibt neu/start-rezepte.json und nennt die Größe)
"""
import base64, io, json, pathlib
from PIL import Image

WURZEL = pathlib.Path(__file__).resolve().parent.parent
QUELLE = WURZEL / 'beispiele' / 'beispielbuch-mein-rezeptbuch.json'
ZIEL = WURZEL / 'neu' / 'start-rezepte.json'
NAMEN = ['Dragon Roll mit Avocado', 'Erdbeer-Joghurt-Torte', 'Frühlingskartoffelsuppe mit Spargel und Bärlauch', 'Muttis Gulasch von der Beinscheibe',
         'Bandnudeln mit Lachs', 'Linsen-Curry mit Kokosmilch', 'Gyoza (japanische gebratene Teigtaschen)', 'Pizza-Toast']
KANTE, GUETE = 640, 76

def klein(adresse):
    if not adresse or ',' not in adresse: return adresse
    bild = Image.open(io.BytesIO(base64.b64decode(adresse.split(',', 1)[1]))).convert('RGB')
    bild.thumbnail((KANTE, KANTE), Image.LANCZOS)
    aus = io.BytesIO(); bild.save(aus, 'JPEG', quality=GUETE, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(aus.getvalue()).decode('ascii')

buch = json.loads(QUELLE.read_text(encoding='utf-8'))
nach_name = {r['name']: r for r in buch['recipes']}
fehlt = [n for n in NAMEN if n not in nach_name]
if fehlt: raise SystemExit('Nicht im Beispielbuch: ' + ', '.join(fehlt))
rezepte = [{**nach_name[n], 'img': klein(nach_name[n].get('img'))} for n in NAMEN]
if any(not r.get('img') for r in rezepte): raise SystemExit('Ein Startrezept hat kein Bild.')
aus = {**buch, 'quelle': 'start-rezepte (Auszug aus dem Beispielbuch)', 'menu': [], 'folders': [], 'recipes': rezepte}
ZIEL.write_text(json.dumps(aus, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{ZIEL.relative_to(WURZEL)}: {len(rezepte)} Rezepte, {ZIEL.stat().st_size // 1024} KB')
