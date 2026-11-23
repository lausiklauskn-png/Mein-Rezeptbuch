// Helfer für die Browser-Proben der neuen PWA.
// Die Einstellungen zeigen sechs eingeklappte Themen (Klaus 23.11.: keine langen Listen). Die Proben fragen die Zeilen darin;
// damit nicht jede Probe erst aufklappen muss, klappt `mitThemen` nach jedem Tipp auf „Einstellungen“ alle Themen auf.
// Das Einklappen selbst prüft `smoke_neu.mjs` eigens (Abschnitt „Einstellungen“).
export async function themenAuf(p) {
  await p.waitForSelector('.themen', { timeout: 10000 });
  for (let i = 0; i < 12 && (await p.locator('.gkopf[aria-expanded="false"]').count()); i++) await p.locator('.gkopf[aria-expanded="false"]').first().click();
}
export function mitThemen(p) {
  const tipp = p.click.bind(p);
  p.click = async (sel, opt) => { await tipp(sel, opt); if (typeof sel === 'string' && /data-zu=werkstatt/.test(sel)) await themenAuf(p); };
  return p;
}
