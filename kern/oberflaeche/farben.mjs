// Küchen-Kern · Farbpaletten: Wasserfarben der Privaten Akte plus Hellbraun und Dunkelbraun (Klaus 23.11.).
export const FARBEN = {
  braun: { de: 'Hellbraun', k: ['#e9cfae', '#f1dfc6', '#f8eedf'], schrift: '#3b2614', akz: '#a9480c', fl: '#f6ece0' },
  dunkel: { de: 'Dunkelbraun', dunkel: true, k: ['#4a3424', '#3a2a1d', '#2b2016'], schrift: '#f4ece2', akz: '#f2a65e', fl: '#2b241d' },
  blau: { de: 'Wasserblau', k: ['#a9cff2', '#c9e2f7', '#dcedf5'], schrift: '#0b3154', akz: '#2f6ea8', fl: '#e4eef7' },
  gruen: { de: 'Wassergrün', k: ['#aee2cc', '#cdeede', '#e4f3d6'], schrift: '#0f4a43', akz: '#087f7a', fl: '#e4f1eb' },
  gelb: { de: 'Helles Gelb', k: ['#f7e3a0', '#fbeec4', '#fdf5dc'], schrift: '#5a4310', akz: '#916612', fl: '#f5efdc' },
  koralle: { de: 'Koralle', k: ['#f9c9ad', '#fbdcc8', '#fdebd9'], schrift: '#6b2a12', akz: '#c2562b', fl: '#f6e9e1' },
  see: { de: 'Seeblau', k: ['#a8dde0', '#c8ebec', '#e0f3f0'], schrift: '#0b3154', akz: '#0b6f7a', fl: '#e2f1f1' },
  flieder: { de: 'Flieder', k: ['#cfc4f0', '#e0d8f6', '#eee9fa'], schrift: '#35215f', akz: '#6a45a8', fl: '#ece7f8' },
  kraeftig: { de: 'Kräftig', k: ['#0b3154', '#164f7d', '#087f7a'], schrift: '#ffffff', akz: '#0b3154', fl: '#dfeaf3', ink: '#14273a' },
};
export const TOENE = { geraet: 'Wie das Gerät', hell: 'Hell', dunkel: 'Dunkel' };
/** true, wenn die Palette mit diesem Ton dunkel gezeigt wird. ton: 'geraet' | 'hell' | 'dunkel'. Dunkelbraun ist immer dunkel. */
export function istDunkel(name, ton = 'geraet') {
  if ((FARBEN[name] || FARBEN.braun).dunkel) return true;
  return ton === 'dunkel' || (ton === 'geraet' && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);
}
/** Setzt die Palette als CSS-Variablen auf ein Element (meist <html>). Dunkel gilt für JEDE Farbe und mischt Grund, Flächen,
 *  Linien, Knöpfe und Kopf aus der Palettenfarbe (Abgleich Mixarium Runde 3, Klaus 23.11.). */
export function farbeSetzen(el, name, ton = 'geraet') {
  const f = FARBEN[name] || FARBEN.braun, s = el.style, ink = f.ink || f.schrift, d = istDunkel(name, ton), m = (p, auf) => `color-mix(in srgb,${f.akz} ${p}%,${auf})`;
  const v = f.dunkel
    ? { '--bg': '#17130f', '--fl': '#221c16', '--fl2': f.fl, '--ink': '#f4ece2', '--mut': '#b9ab9b', '--akz-ink': '#231507', '--duo': '#7a4a1d', '--line': 'rgba(255,230,200,.12)', '--glas': 'rgba(0,0,0,.22)',
        '--vl': `linear-gradient(120deg,color-mix(in srgb,${f.akz} 55%,#17130f),#1d1611)`, '--vl-schrift': '#f4ece2', '--vl-rand': `color-mix(in srgb,${f.akz} 40%,transparent)`,
        '--k1': f.k[0], '--k2': f.k[1], '--k3': f.k[2], '--kopf-schrift': f.schrift, '--akz': f.akz }
    : d
    ? { '--bg': m(15, '#05080e'), '--fl': m(27, '#0a0e17'), '--fl2': m(38, '#0c111c'), '--ink': '#eef1fa', '--mut': m(16, '#c6cee2'), '--akz-ink': '#0a0e17', '--duo': m(60, '#0a0e17'), '--line': m(55, 'rgba(255,255,255,.14)'), '--glas': 'rgba(0,0,0,.22)',
        '--vl': `linear-gradient(120deg,${m(62, '#0a0e17')},${m(30, '#0a0e17')})`, '--vl-schrift': '#eef1fa', '--vl-rand': m(70, 'rgba(255,255,255,.2)'),
        '--k1': m(70, '#0a0e17'), '--k2': m(52, '#0a0e17'), '--k3': m(36, '#0a0e17'), '--kopf-schrift': '#eef1fa', '--akz': m(38, '#ffffff') }
    : { '--bg': `color-mix(in srgb,${f.k[2]} 40%,#fbfbfa)`, '--fl': '#ffffff', '--fl2': f.fl, '--ink': ink, '--mut': `color-mix(in srgb,${ink} 74%,#ffffff)`, '--akz-ink': '#ffffff', '--duo': f.k[0], '--line': `color-mix(in srgb,${ink} 13%,transparent)`, '--glas': 'rgba(255,255,255,.72)',
        '--vl': `linear-gradient(120deg,color-mix(in srgb,${f.k[0]} 60%,#fff),color-mix(in srgb,${f.k[2]} 60%,#fff))`, '--vl-schrift': ink, '--vl-rand': `color-mix(in srgb,${f.akz} 28%,transparent)`,
        '--k1': f.k[0], '--k2': f.k[1], '--k3': f.k[2], '--kopf-schrift': f.schrift, '--akz': f.akz };
  for (const [k, w] of Object.entries(v)) s.setProperty(k, w);
  el.dataset.hell = d ? 'dunkel' : 'hell'; s.colorScheme = d ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', d && !f.dunkel ? '#0a0e17' : f.k[1]);
}
