// Küchen-Kern · KI-Bild für ein Rezept. Übernommen aus der alten App (EINE Naht für jeden Bild-Aufruf, 2026-09-11):
//  - OpenAI /v1/images/generations mit eigenem Schlüssel; OHNE response_format (wird nicht mehr angenommen).
//  - Zwei Modelle nacheinander (dall-e-3, dann gpt-image-1); ein 400/404 heißt „dieses Modell passt nicht“, dann das nächste.
//  - Das Bild landet immer als data:-URL im Rezept. Eine fremde Adresse verfällt und wäre offline tot.
//  - Gratis-Foto über Pollinations, ohne Schlüssel: der Rezeptname geht an diesen Dienst.
export const BILD_MODELLE = [{ model: 'dall-e-3' }, { model: 'gpt-image-1' }];
export const KOSTEN = { de: 'etwa 4 Cent je Bild, Abrechnung direkt bei OpenAI', en: 'about 4 cents per picture, billed directly by OpenAI' };
export const KOSTEN_TEXT = KOSTEN.de;

// Je Ausgabe ein eigener Auftrag (Wunsch aus dem Mixarium, 23.11.2026): ein Getränk ist kein „angerichteter Teller“.
// `art` wählt den Auftrag; eine Ausgabe kann ihn mit der Option `auftrag` (Funktion rezept → Text) auch ganz ersetzen.
const teile = (rezept) => ({
  zut: (rezept.ings || []).slice(0, 5).map((z) => z.name).filter(Boolean).join(', '),
  hin: (rezept.steps || []).slice(0, 2).map((s) => (s.txt || '').slice(0, 80)).filter(Boolean).join('; '),
});
export const BILD_ARTEN = {
  essen: {
    auftrag(rezept) { const { zut, hin } = teile(rezept); return `Food photography: a beautifully plated "${rezept.name || 'dish'}"${zut ? ', featuring ' + zut : ''}${hin ? '. Preparation: ' + hin : ''}. Natural light, appetizing, rustic wooden or marble surface, no text, no labels.`; },
    gratis: ', food photography, professional, appetizing, natural lighting, close-up, restaurant quality',
  },
  getraenk: {
    auftrag(rezept) { const { zut, hin } = teile(rezept); return `Drink photography: a freshly served "${rezept.name || 'drink'}" in a fitting glass${zut ? ', made with ' + zut : ''}${hin ? '. Preparation: ' + hin : ''}. Garnish as appropriate, natural light, bar counter or light surface, no text, no labels, no people.`; },
    gratis: ', drink photography, served in a fitting glass, garnish, professional, natural lighting, close-up, bar counter',
  },
};
export function bildAuftrag(rezept, art = 'essen') { return (BILD_ARTEN[art] || BILD_ARTEN.essen).auftrag(rezept); }
const alsDataUrl = (blob) => new Promise((ja, nein) => { const fr = new FileReader(); fr.onload = () => ja(fr.result); fr.onerror = () => nein(new Error('Bild konnte nicht gelesen werden')); fr.readAsDataURL(blob); });

async function einVersuch(schluessel, auftrag, variante, groesse, hol) {
  const ant = await hol('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + schluessel }, body: JSON.stringify({ model: variante.model, prompt: auftrag, n: 1, size: groesse }) });
  if (!ant.ok) { const e = await ant.json().catch(() => ({})); const f = new Error(e.error?.message || 'HTTP ' + ant.status); f.status = ant.status; f.andresModell = ant.status === 400 || ant.status === 404; throw f; }
  const eintrag = (await ant.json()).data?.[0] || {};
  if (eintrag.b64_json) return 'data:image/png;base64,' + eintrag.b64_json;
  if (eintrag.url) { const bild = await hol(eintrag.url); if (!bild.ok) throw new Error('Bild-Adresse nicht abrufbar (HTTP ' + bild.status + ')'); return alsDataUrl(await bild.blob()); }
  throw new Error('Kein Bild erhalten');
}
/** Erzeugt ein Bild und gibt es als data:-URL zurück. Wirft einen Fehler mit Klartext (401 = Schlüssel, 429 = Guthaben/Limit). */
export async function kiBild(schluessel, rezept, { groesse = '1024x1024', hol = fetch, art = 'essen', auftrag = null } = {}) {
  if (!schluessel) throw new Error('Kein OpenAI-Schlüssel');
  let letzter = null; const text = auftrag ? auftrag(rezept) : bildAuftrag(rezept, art);
  for (const v of BILD_MODELLE) { try { return await einVersuch(schluessel, text, v, groesse, hol); } catch (f) { letzter = f; if (!f.andresModell) break; } }
  if (letzter?.status === 401) throw new Error('Der OpenAI-Schlüssel wurde abgelehnt. Bitte prüfen.');
  if (letzter?.status === 429) throw new Error('OpenAI meldet: Limit erreicht oder kein Guthaben.');
  throw letzter || new Error('Kein Bild erhalten');
}
/** Gratis-Foto ohne Schlüssel (Pollinations). */
export async function gratisBild(rezept, { hol = fetch, saat = Date.now(), art = 'essen' } = {}) {
  const auftrag = encodeURIComponent(rezept.name + (BILD_ARTEN[art] || BILD_ARTEN.essen).gratis);
  const ant = await hol('https://image.pollinations.ai/prompt/' + auftrag + '?width=768&height=576&model=flux&nologo=true&seed=' + saat);
  if (!ant.ok) throw new Error('Der Gratis-Dienst antwortet nicht (HTTP ' + ant.status + ').');
  return alsDataUrl(await ant.blob());
}
