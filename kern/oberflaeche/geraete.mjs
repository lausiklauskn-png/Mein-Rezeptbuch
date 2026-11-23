// Küchen-Kern · Gerätschaften: selbst gezeichnet im Stil der Symbole, fest in der App. Erkannt ohne KI aus dem Schritttext.
// Erweiterbar: eine Ausgabe hängt mit `erweitern()` eigene Geräte an (das Mixarium z. B. Shaker, Stößel, Barlöffel).
// „Shaker“ und „schütteln“ gehören NICHT zum Küchenmixer (Wunsch aus dem Mixarium): wer schüttelt, braucht einen Shaker,
// und den bringt die Ausgabe mit. Ein Gerät kann ein eigenes Raster mitbringen (`vb`, Vorgabe 0 0 256 256).
export const GERAETE = {
  schuessel: { de: 'Schüssel', en: 'Bowl', worte: ['schussel', 'schale', 'verruhr', 'vermeng', 'vermisch', 'unterheb'], svg: '<path class="duo" d="M32 112h192a96 96 0 0 1-192 0Z"/><path d="M32 112h192a96 96 0 0 1-192 0Z"/><path d="M20 112h216"/>' },
  schneebesen: { de: 'Schneebesen', en: 'Whisk', worte: ['schneebesen', 'aufschlag', 'steif schlag', 'verquirl', 'schaumig'], svg: '<path class="duo" d="M178 78C140 40 60 62 50 146c-6 58 62 80 110 34 44-42 34-84 18-102Z"/><path d="M178 78C140 40 60 62 50 146c-6 58 62 80 110 34 44-42 34-84 18-102Z"/><path d="M178 78c-40 6-86 52-94 104"/><path d="M178 78 228 28"/>' },
  messer: { de: 'Messer', en: 'Knife', worte: ['schneid', 'hack', 'wurfel', 'viertel', 'halbier', 'scheiben', 'streifen'], svg: '<path class="duo" d="M44 164 172 36c22 22 26 58 6 78l-70 50Z"/><path d="M44 164 172 36c22 22 26 58 6 78l-70 50Z"/><path d="M108 164 60 212a17 17 0 0 1-24-24l40-40"/>' },
  brett: { de: 'Brett', en: 'Board', worte: ['schneid', 'hack', 'wurfel'], svg: '<rect class="duo" x="20" y="72" width="216" height="128" rx="24"/><rect x="20" y="72" width="216" height="128" rx="24"/><circle cx="200" cy="106" r="9"/>' },
  topf: { de: 'Topf', en: 'Pot', worte: ['topf', 'koch', 'kochel', 'aufkoch', 'gar', 'bruhe', 'blanchier', 'dunst'], svg: '<path class="duo" d="M48 104h160v84a28 28 0 0 1-28 28H76a28 28 0 0 1-28-28Z"/><path d="M48 104h160v84a28 28 0 0 1-28 28H76a28 28 0 0 1-28-28Z"/><path d="M36 92h184"/><path d="M112 70h32"/><path d="M48 132H22M208 132h26"/>' },
  sieb: { de: 'Sieb', en: 'Sieve', worte: ['sieb', 'abgiess', 'abtropf', 'abspul', 'abseih'], svg: '<path class="duo" d="M28 100h152a76 76 0 0 1-152 0Z"/><path d="M28 100h152a76 76 0 0 1-152 0Z"/><path d="M180 100h56"/><path d="M76 130h.1M104 146h.1M132 130h.1M104 118h.1"/>' },
  pfanne: { de: 'Pfanne', en: 'Pan', worte: ['pfanne', 'brat', 'anbrat', 'rost', 'anschwitz'], svg: '<circle class="duo" cx="104" cy="140" r="72"/><circle cx="104" cy="140" r="72"/><path d="M168 106 238 68"/>' },
  ofen: { de: 'Ofen', en: 'Oven', worte: ['ofen', 'back', 'uberback', 'vorheiz', 'grad', '°c'], svg: '<rect class="duo" x="72" y="112" width="112" height="72" rx="8"/><rect x="32" y="40" width="192" height="180" rx="18"/><rect x="72" y="112" width="112" height="72" rx="8"/><path d="M72 74h.1M104 74h.1M184 74h-32"/>' },
  backform: { de: 'Backform', en: 'Baking tin', worte: ['springform', 'backform', 'auflaufform', 'kuchenform', 'formchen', 'blech'], svg: '<path class="duo" d="M36 116h184l-18 76H54Z"/><path d="M36 116h184l-18 76H54Z"/><path d="M22 116h212"/>' },
  mixer: { de: 'Mixer', en: 'Blender', worte: ['mixer', 'mixen', 'purier'], svg: '<path class="duo" d="M76 40h104l-16 120H92Z"/><path d="M76 40h104l-16 120H92Z"/><path d="M84 160h88l12 56H72Z"/><path d="M180 72h28v40h-22"/>' },
  reibe: { de: 'Reibe', en: 'Grater', worte: ['reib', 'raspel', 'hobel'], svg: '<path class="duo" d="M84 76h88l12 140H72Z"/><path d="M84 76h88l12 140H72Z"/><path d="M100 76V52a28 28 0 0 1 56 0v24"/><path d="M108 116h.1M148 116h.1M128 146h.1M108 176h.1M148 176h.1"/>' },
};
const falten = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
export function erweitern(mehr) { Object.assign(GERAETE, mehr); }
/** Kennungen der Geräte, die ein Text nahelegt, in fester Reihenfolge. */
export function erkenne(text) { const t = falten(text); return Object.keys(GERAETE).filter((k) => GERAETE[k].worte.some((w) => t.includes(w))); }
export function geraetSvg(k) { return `<svg viewBox="${GERAETE[k].vb || '0 0 256 256'}" aria-hidden="true">${GERAETE[k].svg}</svg>`; }
