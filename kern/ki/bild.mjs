// Küchen-Kern · KI-Bild für ein Rezept. Übernommen aus der alten App (EINE Naht für jeden Bild-Aufruf, 2026-09-11):
//  - OpenAI /v1/images/generations mit eigenem Schlüssel; OHNE response_format (wird nicht mehr angenommen).
//  - Zwei Modelle nacheinander (dall-e-3, dann gpt-image-1); ein 400/404 heißt „dieses Modell passt nicht“, dann das nächste.
//  - Das Bild landet immer als data:-URL im Rezept. Eine fremde Adresse verfällt und wäre offline tot.
//  - Gratis-Foto über Pollinations, ohne Schlüssel: der Rezeptname geht an diesen Dienst.
export const BILD_MODELLE = [{ model: 'dall-e-3' }, { model: 'gpt-image-1' }];
export const KOSTEN_TEXT = 'etwa 4 Cent je Bild, Abrechnung direkt bei OpenAI';

export function bildAuftrag(rezept) {
  const name = rezept.name || 'dish';
  const zut = (rezept.ings || []).slice(0, 5).map((z) => z.name).filter(Boolean).join(', ');
  const hin = (rezept.steps || []).slice(0, 2).map((s) => (s.txt || '').slice(0, 80)).filter(Boolean).join('; ');
  return `Food photography: a beautifully plated "${name}"${zut ? ', featuring ' + zut : ''}${hin ? '. Preparation: ' + hin : ''}. Natural light, appetizing, rustic wooden or marble surface, no text, no labels.`;
}
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
export async function kiBild(schluessel, rezept, { groesse = '1024x1024', hol = fetch } = {}) {
  if (!schluessel) throw new Error('Kein OpenAI-Schlüssel');
  let letzter = null;
  for (const v of BILD_MODELLE) { try { return await einVersuch(schluessel, bildAuftrag(rezept), v, groesse, hol); } catch (f) { letzter = f; if (!f.andresModell) break; } }
  if (letzter?.status === 401) throw new Error('Der OpenAI-Schlüssel wurde abgelehnt. Bitte prüfen.');
  if (letzter?.status === 429) throw new Error('OpenAI meldet: Limit erreicht oder kein Guthaben.');
  throw letzter || new Error('Kein Bild erhalten');
}
/** Gratis-Foto ohne Schlüssel (Pollinations). */
export async function gratisBild(rezept, { hol = fetch, saat = Date.now() } = {}) {
  const auftrag = encodeURIComponent(rezept.name + ', food photography, professional, appetizing, natural lighting, close-up, restaurant quality');
  const ant = await hol('https://image.pollinations.ai/prompt/' + auftrag + '?width=768&height=576&model=flux&nologo=true&seed=' + saat);
  if (!ant.ok) throw new Error('Der Gratis-Dienst antwortet nicht (HTTP ' + ant.status + ').');
  return alsDataUrl(await ant.blob());
}
