// Headless-Smoke für den A1/A4-Rollout in den Cross-Knoten-Antwort-Pfad von
// Mein Rezeptbuch (Rollout aus Sage Modul 22, 2026-07-02). Run:
//   node tests/smoke_rollout_a1a4.mjs
//
// Rezeptbuchs Modul 04 stand auf Bau 04.A (KEIN queryLocal) — der op:"query"-
// Empfänger (sbkim/15_membran.js) rief ein fehlendes queryLocal → antwortete
// immer „module-04c-not-available". Dieser Rollout synchronisiert Modul 04
// byte-1:1 aus Sage (queryLocal + BM25 + queryLocalMulti + expandQuerySimple)
// UND verdrahtet den Empfänger auf den INKLUSIONS-Pfad (queryWithInclusion:
// A4 Synonym-Auffächerung → A1 Hybrid-Multi-Suche, fail-soft).
//
// Dieser Test lädt Rezeptbuchs AUSGELIEFERTES Modul 04 und beweist die exakte
// API-Kette, die der Empfänger verkettet — CROSS-PHRASING-RETTUNG bei
// orthogonalem Cosinus. Der 0.80-Cosinus-Boden (PROVIDER_MIN_MATCH =
// Andock-Riegel Modul 05) bleibt unberührt; der Gewinn ist INKLUSION.
//
// HINWEIS (ehrlich, wartet auf Klaus/Folge-Bau): der Empfänger braucht zusätzlich
// einen registrierten Rezept-KORPUS (SbkimMatch.setLocalCorpus), den sbkim-init.js
// noch NICHT anlegt — und der Rezept-Zugriff über window.R ist eine offene
// Verdrahtungs-Lücke (siehe PULS 2026-07-02). Bis dahin antwortet der Empfänger
// fail-soft mit leerer Liste (statt „nicht verfügbar"). Dieser Test beweist die
// MODUL-Fähigkeit, nicht die Live-Korpus-Fütterung.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

globalThis.window = globalThis;

const DIM = 384;
function unit(i) { const v = new Float32Array(DIM); v[i] = 1; return v; }
globalThis.SbkimEmbedding = {
  embedQuery: async () => unit(0),
  embedPassage: async () => unit(1),
  embedPassageBatch: async (texts) => texts.map(() => unit(1)),
};

const src = readFileSync(resolve(repoRoot, "sbkim/04_match.js"), "utf8");
new Function("global", "window", "globalThis", "console", src)(
  globalThis, globalThis, globalThis, console,
);
const M = globalThis.SbkimMatch;

// Spiegelbild der Synonym-Karte aus sbkim/15_membran.js (MR_QUERY_SYNONYMS).
const MR_QUERY_SYNONYMS = {
  "torte": ["kuchen"], "kuchen": ["torte", "gebäck"], "gebäck": ["kuchen"],
  "plätzchen": ["keks"], "keks": ["plätzchen", "plaetzchen"],
  "vorspeise": ["appetizer"], "hauptgericht": ["hauptspeise"],
  "beilage": ["side"], "nachtisch": ["dessert"], "dessert": ["nachtisch", "nachspeise"],
  "suppe": ["eintopf"], "eintopf": ["suppe"],
  "vegetarisch": ["fleischlos"], "fleischlos": ["vegetarisch"],
  "getränk": ["drink"], "drink": ["getränk", "getraenk"],
};

// Rezept-Korpus in der {label, passageVec, text, anchorId}-Form.
const CORPUS = [
  { label: "Omas Apfelkuchen", text: "kuchen mit äpfeln, zimt, mürbeteig, backen", passageVec: unit(1), anchorId: "mr-1" },
  { label: "Grüner Salat", text: "salat mit gurke, tomate, dressing, frisch", passageVec: unit(1), anchorId: "mr-2" },
];

async function queryWithInclusion(match, text, k) {
  if (typeof match.queryLocalMulti === "function" &&
      typeof match.expandQuerySimple === "function") {
    try {
      const variants = match.expandQuerySimple(text, { synonyms: MR_QUERY_SYNONYMS });
      return await match.queryLocalMulti(variants, k, { corpus: CORPUS, hybrid: true });
    } catch (_e) { /* fail-soft */ }
  }
  try { return await match.queryLocal(text, k, { corpus: CORPUS, hybrid: true }); }
  catch (_e) { /* fail-soft */ }
  return await match.queryLocal(text, k, { corpus: CORPUS });
}

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  ✓ " + msg); }
  else { fail++; console.log("  ✗ " + msg); }
}

console.log("Rezeptbuch A1/A4-Rollout-Smoke — Cross-Knoten-Antwort-Inklusion\n");

console.log("Probe 0 — Modul 04 (byte-1:1 aus Sage) trägt jetzt A1/A4 (war 04.A ohne queryLocal)");
ok(typeof M.queryLocal === "function", "queryLocal jetzt vorhanden (Vertrags-Bug behoben)");
ok(typeof M.queryLocalMulti === "function", "queryLocalMulti vorhanden (A4)");
ok(typeof M.expandQuerySimple === "function", "expandQuerySimple vorhanden (A4)");
ok(typeof M.bm25Scores === "function", "bm25Scores vorhanden (A1)");
ok(M.PROVIDER_MIN_MATCH === 0.80, "PROVIDER_MIN_MATCH === 0.80 (Riegel unberührt)");

console.log("\nProbe 1 — A4 Synonym-Auffächerung");
const variants = M.expandQuerySimple("torte", { synonyms: MR_QUERY_SYNONYMS });
ok(variants.includes("torte"), "Original 'torte' bleibt Variante");
ok(variants.includes("kuchen"), "Variante 'kuchen' ergänzt");

console.log("\nKontrolle — Einzel-queryLocal('torte', hybrid) ohne A4");
const single = await M.queryLocal("torte", 5, { corpus: CORPUS, hybrid: true });
ok(single.length === 0, "kein Token 'torte' im text + Cosinus 0 → keine Rettung");

console.log("\nProbe 2 — queryWithInclusion (A4 → A1) rettet das Rezept");
const rescued = await queryWithInclusion(M, "torte", 5);
ok(rescued.length >= 1, "mindestens ein Treffer über den BM25-Varianten-Pfad");
ok(rescued.some(r => r.label === "Omas Apfelkuchen"),
   "der 'kuchen'-Treffer erscheint (Cross-Phrasing-Rettung)");
ok(!rescued.some(r => r.label === "Grüner Salat"),
   "der unverwandte Eintrag bleibt draußen");

console.log("\nProbe 3 — fail-soft bei fremder Frage");
const none = await queryWithInclusion(M, "quantencomputer", 5);
ok(Array.isArray(none) && none.length === 0, "Array, kein Treffer, kein Wurf");

console.log("\nProbe 4 — Bestands-Korpus ohne text-Feld bleibt gültig");
const legacyCorpus = [{ label: "Käsekuchen", passageVec: unit(1), anchorId: "mr-3" }];
const legacy = await M.queryLocal("käsekuchen", 5, { corpus: legacyCorpus, hybrid: true });
ok(legacy.some(r => r.label === "Käsekuchen"),
   "ohne text trifft BM25 über das label (Rückwärts-Kompatibilität)");

console.log(`\n${fail === 0 ? "ALLE GRÜN" : "FEHLER"} — ${pass} ok, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
