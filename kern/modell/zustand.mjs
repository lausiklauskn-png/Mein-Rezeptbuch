// Küchen-Kern · Zustand der App: Rezepte, Wochenplan, Ordner, Kategorien. Alles, was in die Sicherung gehört.
import { leereKategorien } from './kategorien.mjs';
export const leererZustand = () => ({ rezepte: [], menu: [], ordner: [], kategorien: leereKategorien() });
