// Headless-Smoke für A5 (Bau 22f-Rollout) — Multi-Query im NATIVEN Suchfeld
// von Mein Rezeptbuch (Funktion `semRun`, Gratis-Pfad). Run:
//   node tests/smoke_a5_suchfeld_multiquery.mjs
//
// Beweist die Kette expandQuerySimple(term,{synonyms:SEM_SYN}) →
// queryLocalMulti(vars,k,{hybrid:true}) im SUCHFELD und nutzt dabei die
// TATSÄCHLICH AUSGELIEFERTE Synonym-Karte SEM_SYN aus index.html (via build.py
// aus der QC gebaut) — mini Drift-Guard der Verdrahtung. Der 0.80-Cosinus-Boden
// (Modul 05 Andock-Riegel) bleibt unberührt; der Gewinn ist INKLUSION über den
// lexikalischen BM25-Pfad (Cross-Phrasing-Rettung).

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

// SEM_SYN aus der GEBAUTEN index.html extrahieren (build.py aus der QC).
const html = readFileSync(resolve(repoRoot, "index.html"), "utf8");
const a = html.indexOf("const SEM_SYN=");
if (a < 0) { console.error("FAIL: SEM_SYN nicht in index.html gefunden"); process.exit(1); }
const end = html.indexOf("};", a) + 2;
const SEM_SYN = new Function(html.slice(a, end) + " return SEM_SYN;")();

// Rezept-Korpus: das gesuchte Rezept trägt „kuchen" im text, aber NICHT das
// Query-Token „torte". passageVec = e1 (orthogonal zum Query e0 → Cosinus 0).
// Nur die Multi-Query-Variante „kuchen" kann es über BM25 aufnehmen.
const CORPUS = [
  { label: "Sonntags-Klassiker", text: "saftiger kuchen mit äpfeln, zimt, streusel", passageVec: unit(1), anchorId: "mr-1" },
  { label: "Wespen-freier Tisch", text: "hausmittel gegen wespen am gedeckten tisch", passageVec: unit(1), anchorId: "mr-2" },
];

let ok = 0, fail = 0;
function check(name, cond) { if (cond) { ok++; console.log("  ✓ " + name); } else { fail++; console.log("  ✗ " + name); } }

async function run() {
  console.log("Probe 0 — ausgelieferte SEM_SYN-Karte");
  check("SEM_SYN ist Objekt mit Einträgen", SEM_SYN && typeof SEM_SYN === "object" && Object.keys(SEM_SYN).length > 0);
  check("torte → kuchen verdrahtet", Array.isArray(SEM_SYN.torte) && SEM_SYN.torte.includes("kuchen"));

  console.log("\nProbe 1 — expandQuerySimple mit SEM_SYN fächert auf");
  const vars = M.expandQuerySimple("torte", { synonyms: SEM_SYN });
  check("Original zuerst", vars[0] === "torte");
  check("Variante 'kuchen' erzeugt", vars.includes("kuchen"));

  console.log("\nProbe 2 — Single-Query verpasst den Cross-Phrasing-Treffer");
  const single = await M.queryLocal("torte", 5, { corpus: CORPUS, hybrid: true });
  const singleIds = new Set(single.map((h) => h.anchorId));
  check("Single-Query 'torte' findet 'kuchen'-Rezept NICHT (Cosinus 0, kein Token)", !singleIds.has("mr-1"));

  console.log("\nProbe 3 — Multi-Query (Suchfeld-Verdrahtung) nimmt es AUF");
  const multi = await M.queryLocalMulti(vars, 5, { corpus: CORPUS, hybrid: true });
  const multiIds = new Set(multi.map((h) => h.anchorId));
  check("Multi-Query nimmt 'kuchen'-Rezept über BM25-Variante auf", multiIds.has("mr-1"));
  check("Ergebnis ist Array (fail-soft, kein Wurf)", Array.isArray(multi));

  console.log("\nProbe 4 — Off-Topic bleibt draußen");
  check("Wespen-Passage NICHT im Multi-Query-Ergebnis", !multiIds.has("mr-2"));

  console.log("\n" + (fail === 0 ? "ALLE GRÜN" : "ROT") + " — " + ok + " ok, " + fail + " fail");
  process.exit(fail === 0 ? 0 : 1);
}
run().catch((e) => { console.error("WURF:", e); process.exit(1); });
