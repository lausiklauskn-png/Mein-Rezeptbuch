// Küchen-Kern · Tresor: mehrere Sicherungen im Gerät, wie in der alten App (BACKUP VAULT).
// Bis zu 5 automatische (die älteste fällt heraus) und bis zu 10 benannte. Jede Sicherung liegt als eigener Eintrag,
// die Liste bleibt klein. Der Tresor schützt vor Versehen (falsch gelöscht, falsch eingelesen); gegen das Leeren des
// Browsers schützt nur die Sicherung als Datei.
export const MAX_AUTO = 5, MAX_BENANNT = 10;
const LISTE = 'tresor-liste', eintrag = (id) => 'tresor:' + id;

export function tresor(lager) {
  const liste = async () => (await lager.hol(LISTE)) || [];
  return {
    liste: async () => (await liste()).sort((a, b) => b.ts.localeCompare(a.ts)),
    /** art: 'auto' oder 'benannt'. sicherung: das Objekt aus sicherung.schreibe(). */
    async ablegen(sicherung, art = 'benannt', name = '') {
      const l = await liste(), ts = new Date().toISOString(), id = (art === 'auto' ? 'a-' : 'b-') + ts + '-' + Math.random().toString(36).slice(2, 6);
      const gleiche = l.filter((x) => x.art === art).sort((a, b) => a.ts.localeCompare(b.ts)), max = art === 'auto' ? MAX_AUTO : MAX_BENANNT;
      while (gleiche.length >= max) { const alt = gleiche.shift(); await lager.weg(eintrag(alt.id)); l.splice(l.findIndex((x) => x.id === alt.id), 1); }
      await lager.setz(eintrag(id), sicherung);
      l.push({ id, art, ts, name: name || (art === 'auto' ? 'Automatisch' : 'Sicherung'), anzahl: (sicherung.recipes || []).length });
      await lager.setz(LISTE, l); return id;
    },
    hol: (id) => lager.hol(eintrag(id)),
    async loeschen(id) { const l = await liste(); await lager.weg(eintrag(id)); await lager.setz(LISTE, l.filter((x) => x.id !== id)); },
  };
}
