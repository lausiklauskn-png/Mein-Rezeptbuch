// Küchen-Kern · Kalenderdatei (.ics, RFC 5545) für eine Erinnerung im Kalender des Handys.
// Herkunft: Meine Familienakte (Klaus), lib/kalender.ts `icsFalten` und `icsDatei` (Stand 18.11.2026), nach JavaScript übertragen.
// Anders als dort: ein Eintrag nennt Tag und Uhrzeit in Ortszeit ('JJJJ-MM-TT', 'HH:MM'); ohne Uhrzeit wird er ein ganztägiger
// Termin mit Erinnerung um 9 Uhr an diesem Tag. Keine Absagen, keine Anbieter-Anmeldung. Echte Benachrichtigungen kann eine
// Web-App bei geschlossener App nicht geben; die Datei legt die Erinnerung in den Kalender des Geräts.

/** Text für ein Feld: \ ; , und Zeilenumbrüche maskiert. */
export const icsText = (wert) => String(wert ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
const icsZeit = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const datum = (tag) => tag.replace(/-/g, '');
const ortszeit = (tag, zeit) => { const [j, mo, t] = tag.split('-').map(Number), [h, mi] = zeit.split(':').map(Number); return new Date(j, mo - 1, t, h, mi); };
const naechster = (tag) => { const [j, mo, t] = tag.split('-').map(Number), d = new Date(j, mo - 1, t + 1); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };

/** Zeilen über 75 Oktette falten (Fortsetzung mit einem Leerzeichen), ohne UTF-8-Zeichen zu teilen. */
export function icsFalten(zeile) {
  const enc = new TextEncoder();
  if (enc.encode(zeile).length <= 75) return zeile;
  const teile = []; let aktuell = '', laenge = 0; const grenze = () => (teile.length ? 74 : 75);
  for (const zeichen of zeile) {
    const n = enc.encode(zeichen).length;
    if (laenge + n > grenze()) { teile.push(aktuell); aktuell = ''; laenge = 0; }
    aktuell += zeichen; laenge += n;
  }
  teile.push(aktuell);
  return teile.join('\r\n ');
}

/**
 * Eine Kalenderdatei. eintraege: [{ uid, titel, beschreibung?, tag:'JJJJ-MM-TT', zeit?:'HH:MM', dauer?: Minuten (60), vorher?: Minuten (30) }].
 * Mit Uhrzeit: Beginn und Ende in UTC, Erinnerung `vorher` Minuten davor. Ohne: ganztägig, Erinnerung um 9 Uhr an diesem Tag.
 * opt: { jetzt, name } – name steht als Kalendername (X-WR-CALNAME). Wirft bei einem Tag, der kein Tag ist.
 */
export function icsDatei(eintraege, { jetzt = new Date(), name = '' } = {}) {
  const stempel = icsZeit(jetzt.toISOString());
  const z = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kuechen-Kern//Notizbuch 1//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  if (name) z.push(`X-WR-CALNAME:${icsText(name)}`);
  for (const e of eintraege) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.tag || ''))) throw new Error('Kein gültiger Tag: ' + e.tag);
    const zeit = /^\d{2}:\d{2}$/.test(String(e.zeit || '')) ? e.zeit : '';
    z.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stempel}`);
    if (zeit) { const b = ortszeit(e.tag, zeit), ende = new Date(b.getTime() + (e.dauer || 60) * 60000); z.push(`DTSTART:${icsZeit(b.toISOString())}`, `DTEND:${icsZeit(ende.toISOString())}`); }
    else z.push(`DTSTART;VALUE=DATE:${datum(e.tag)}`, `DTEND;VALUE=DATE:${naechster(e.tag)}`);
    z.push(`SUMMARY:${icsText(e.titel)}`);
    if (e.beschreibung) z.push(`DESCRIPTION:${icsText(e.beschreibung)}`);
    z.push('CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.titel)}`, zeit ? `TRIGGER:-PT${e.vorher ?? 30}M` : 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
  }
  z.push('END:VCALENDAR');
  return z.map(icsFalten).join('\r\n') + '\r\n';
}
