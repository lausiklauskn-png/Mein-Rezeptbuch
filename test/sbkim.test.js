/*
 * SBKIM-Briefkasten — additive Tests (node --test, keine npm-Abhängigkeiten).
 * Prüft NUR die Briefkasten-Infrastruktur (Sporen, SIGNAL, Cosinus) — rührt den
 * App-Kern nicht an. Echte Krypto über scripts/verify_foreign_spore.mjs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { verifyForeignSpore } from "../scripts/verify_foreign_spore.mjs";

const SBKIM = new URL("../sbkim/", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, SBKIM), "utf8"));

// L2-Cosinus — byte-gleich zur Browser-Logik (sbkimCosine) im index.html.
function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return null;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return null;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

test("eigene Spore ist kryptografisch VALID (Ed25519, id==SHA256(pub), 384-dim)", () => {
  const spore = load("spore.json");
  const r = verifyForeignSpore(spore);
  assert.equal(r.valid, true, `spore.json invalid: ${r.reason}`);
  assert.equal(spore.domainVector.length, 384);
  assert.equal(spore.embeddingModel, "Xenova/multilingual-e5-small");
});

test("alle Nachbar-Inboxen sind reziprok geprüfte VALID-Sporen", () => {
  const inboxes = readdirSync(new URL(".", SBKIM)).filter((f) => f.endsWith("_inbox.json"));
  assert.ok(inboxes.length >= 5, `mindestens 5 Inboxen erwartet, gefunden: ${inboxes.length}`);
  for (const f of inboxes) {
    const r = verifyForeignSpore(load(f));
    assert.equal(r.valid, true, `${f} invalid: ${r.reason}`);
  }
});

test("SIGNAL.json hat die Pflichtfelder (node, seq, ack, mailboxes, forNodes, history)", () => {
  const sig = load("SIGNAL.json");
  assert.equal(sig.node, "Mein-Rezeptbuch");
  assert.equal(typeof sig.seq, "number");
  assert.ok(sig.seq >= 1);
  for (const k of ["ack", "mailboxes"]) assert.equal(typeof sig[k], "object");
  assert.ok(Array.isArray(sig.forNodes));
  assert.ok(Array.isArray(sig.history));
});

test("Live-Cosinus eigener ⟷ Nachbar-Vektor ist eine endliche Zahl in [-1,1]", () => {
  const self = load("spore.json").domainVector;
  for (const f of ["tresor_inbox.json", "sage_inbox.json", "point_inbox.json", "jason_inbox.json", "mixarium_inbox.json"]) {
    const c = cosine(self, load(f).domainVector);
    assert.ok(Number.isFinite(c) && c >= -1 && c <= 1, `${f}: cos=${c}`);
  }
});

test("Cosinus mit sich selbst ist 1 (Sanity der Match-Rechnung)", () => {
  const self = load("spore.json").domainVector;
  assert.ok(Math.abs(cosine(self, self) - 1) < 1e-9);
});

test("zu jeder *_inbox.json gibt es einen *_inbox.verify.md-Vermerk (§11.3)", () => {
  const all = readdirSync(new URL(".", SBKIM));
  const inboxes = all.filter((f) => f.endsWith("_inbox.json"));
  for (const f of inboxes) {
    const verify = f.replace(/\.json$/, ".verify.md");
    assert.ok(all.includes(verify), `fehlt: ${verify}`);
  }
});

// Drift-Guard fuer den Kontroll-Versuchs-Messhelfer (2026-07-15).
// Der Helfer zeigt in seinem UI zwei Selbst-Test-Erwartungswerte
// ("Erwartet OHNE Zusatz ≈ Toolpoint 0.796054, Sage 0.792393"). Genau diese
// Konstante ist letzte Sitzung veraltet gewesen (0.824068 gg. Sage v0.1). Dieser
// Test rechnet die Anker-Vektoren des Helfers (VEC_TP/VEC_SAGE) gegen unsere
// eigene Spore und stellt sicher, dass die im Text genannten Werte weiterhin
// reproduzierbar sind — reine Vektor-Rechnung, KEIN Modell noetig. So kann der
// Selbst-Test des Helfers nie wieder stumm aus dem Tritt geraten.
test("Messhelfer-Anker reproduzieren die angezeigten Selbst-Test-Werte (Kontroll-Versuch)", () => {
  const helper = readFileSync(new URL("messung-netz-zugehoerigkeit.html", SBKIM), "utf8");
  const arr = (name) => {
    const m = helper.match(new RegExp("var " + name + "=\\[([^\\]]+)\\]"));
    assert.ok(m, `Anker ${name} nicht im Messhelfer gefunden`);
    return m[1].split(",").map(Number);
  };
  const VEC_TP = arr("VEC_TP");
  const VEC_SAGE = arr("VEC_SAGE");
  assert.equal(VEC_TP.length, 384);
  assert.equal(VEC_SAGE.length, 384);

  // Erwartungswerte aus dem UI-Text des Helfers parsen (bleibt so in Sync mit dem,
  // was der Helfer selbst behauptet — kein separater Zahlen-Duplikat-Pflegepunkt).
  const exp = helper.match(/Toolpoint <b>([0-9.]+)<\/b>[\s\S]*?Sage <b>([0-9.]+)<\/b>/);
  assert.ok(exp, "Selbst-Test-Erwartungswerte (Toolpoint/Sage) nicht im Helfer-Text gefunden");
  const expTP = Number(exp[1]);
  const expSage = Number(exp[2]);

  const self = load("spore.json").domainVector;
  const cTP = cosine(self, VEC_TP);
  const cSage = cosine(self, VEC_SAGE);
  assert.ok(Math.abs(cTP - expTP) < 1e-5, `Toolpoint-Anker driftet: erwartet ${expTP}, gemessen ${cTP}`);
  assert.ok(Math.abs(cSage - expSage) < 1e-5, `Sage-Anker driftet: erwartet ${expSage}, gemessen ${cSage}`);

  // VEC_SAGE muss Sages committete (v0.2) Spore sein — sonst misst der Helfer gegen
  // einen falschen Nachbar-Vektor. (VEC_TP darf bewusst != point_inbox sein: Points
  // Adress-Wand, kanonische v0.1 vs. veroeffentlichte v0.2 — siehe NETZ-STAND.)
  const sage = load("sage_inbox.json").domainVector;
  assert.ok(Math.abs(cosine(VEC_SAGE, sage) - 1) < 1e-6, "VEC_SAGE != Sages committete Spore (sage_inbox.json)");
});
