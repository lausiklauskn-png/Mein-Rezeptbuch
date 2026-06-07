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
