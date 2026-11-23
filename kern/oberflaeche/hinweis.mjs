// Küchen-Kern · Hinweis-Blasen (Tooltips). ÜBERNOMMEN aus beiden alten Apps (das „Floating-Tooltip“ #_qtip, seit 2026-07-24
// das EINZIGE Tooltip-System dort – ein zweites hatte doppelte Blasen gezeigt): jedes Element mit `title` (oder `data-hinweis`)
// zeigt nach 450 ms eine kleine Blase darüber, am Rand nicht abgeschnitten; am Finger beim Antippen für 1,8 s; Scrollen oder
// Klicken blendet sie aus. Ausschaltbar (alt: Barrierefreiheit → Tooltips, Vorgabe an).
// Neu gegenüber alt: beim ersten Zeigen wandert `title` nach `data-hinweis`. So erscheint am Monitor nicht zusätzlich die
// Blase des Browsers – wieder kein doppelter Tooltip. Ein Element, das inzwischen neu gezeichnet wurde, bekommt keine Blase.
// Ebenfalls neu: ein reiner Symbol-Knopf (kein sichtbarer Text) zeigt sein `aria-label` – dafür muss niemand jeden Knopf
// zweimal beschriften.
const NAME = 'data-hinweis';
let eingerichtet = null;
/** Richtet die Blasen für ein Dokument einmal ein. aus(): true, wenn der Nutzer sie ausgeschaltet hat. */
export function hinweiseEinrichten(doc = document, { aus = () => false, verzoegerung = 450, tippDauer = 1800 } = {}) {
  if (eingerichtet) { eingerichtet.aus = aus; return eingerichtet; }
  const w = doc.defaultView;
  let blase = null, zeigUhr = null, wegUhr = null;
  const holen = () => { if (!blase || !blase.isConnected) { blase = doc.createElement('div'); blase.id = 'hinweis-blase'; blase.setAttribute('role', 'tooltip');
    blase.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;max-width:220px;padding:5px 10px;border-radius:8px;background:rgba(20,24,34,.9);color:#fff;font:600 12.5px/1.35 system-ui,sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.28);opacity:0;transition:opacity .13s;display:none';
    doc.body.appendChild(blase); } return blase; };
  const text = (el) => { if (!el.hasAttribute('title') && !el.hasAttribute(NAME)) return el.textContent.trim() ? '' : el.getAttribute('aria-label') || ''; if (el.hasAttribute('title')) { const t = el.getAttribute('title'); el.removeAttribute('title'); if (t) el.setAttribute(NAME, t); } return el.getAttribute(NAME) || ''; };
  const weg = () => { clearTimeout(zeigUhr); zeigUhr = null; if (!blase) return; blase.style.opacity = '0'; clearTimeout(wegUhr); wegUhr = w.setTimeout(() => { if (blase) blase.style.display = 'none'; }, 140); };
  const zeig = (el) => {
    if (h.aus()) return; const t = text(el); if (!t) return;
    clearTimeout(zeigUhr); clearTimeout(wegUhr);
    zeigUhr = w.setTimeout(() => {
      if (!el.isConnected) return;
      const b = holen(); b.textContent = t; b.style.display = 'block';
      const r = el.getBoundingClientRect(), bw = b.offsetWidth, bh = b.offsetHeight;
      let links = r.left + r.width / 2 - bw / 2, oben = r.top - bh - 7;
      if (oben < 4) oben = r.bottom + 7; if (links < 4) links = 4; if (links + bw > w.innerWidth - 4) links = w.innerWidth - bw - 4;
      b.style.left = links + 'px'; b.style.top = oben + 'px'; b.style.opacity = '1';
    }, verzoegerung);
  };
  const SEL = `[title],[${NAME}],button[aria-label],[role=button][aria-label]`;
  const ziel = (e) => { const el = e.target && e.target.closest && e.target.closest(SEL); return el && text(el) ? el : null; };
  doc.addEventListener('mouseover', (e) => { const el = ziel(e); if (el) zeig(el); });
  doc.addEventListener('mouseout', (e) => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(SEL)) weg(); });
  doc.addEventListener('touchstart', (e) => { const el = ziel(e); if (el) { zeig(el); w.setTimeout(weg, tippDauer); } }, { passive: true });
  doc.addEventListener('mousedown', weg); doc.addEventListener('scroll', weg, true);
  const h = { aus, weg }; eingerichtet = h; return h;
}
