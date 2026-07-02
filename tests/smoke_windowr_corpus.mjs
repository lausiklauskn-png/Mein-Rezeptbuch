// Headless-Smoke für den window.R-Fix + Rezept-Korpus-Provider (Folge-Bau
// 2026-07-02, Schritte 1+2). Run:
//   node tests/smoke_windowr_corpus.mjs
//
// Beweist zwei Dinge:
//  (1) Das LIVE-Getter-Muster (Object.defineProperty(window,'R',{get})) liefert
//      nach einem R=[]-Reassignment das AKTUELLE R — ein einmaliges window.R=R
//      wäre stale. Das ist der Kern des Fixes.
//  (2) Die Korpus-Bau-LOGIK (Spiegel des in sbkim-init.js ausgelieferten
//      buildRezeptbuchQueryCorpus) erzeugt die richtige {label,passageVec,text,
//      anchorId}-Form mit text-Feld (A1/BM25) + Deckel.
//
// HINWEIS (ehrlich): (2) ist ein Logik-Spiegel, KEIN Laden des App-Scripts. Die
// echte Live-Fütterung (window.R mit echten Rezepten + ~30 MB Embedding) prüft
// Klaus im Browser. node --check deckt die ausgelieferte Datei syntaktisch ab.

globalThis.window = globalThis;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log("  ✓ " + msg); } else { fail++; console.log("  ✗ " + msg); } }

console.log("Rezeptbuch window.R-Getter + Korpus-Logik-Smoke\n");

// ---- (1) Live-Getter überlebt Reassignment ----
console.log("Probe 1 — window.R Live-Getter (überlebt R=[]-Reassignment)");
(function appScopeSimulation() {
  let R = [];
  try { Object.defineProperty(window, "R", { get: function () { return R; }, configurable: true }); } catch (e) {}
  ok(Array.isArray(window.R) && window.R.length === 0, "window.R anfangs leeres Array");
  // App lädt Rezepte → reassigned R (wie beim echten Laden):
  R = [{ name: "Apfelkuchen", blank: false }, { name: "Salat", blank: false }];
  ok(window.R.length === 2, "window.R spiegelt NEUES R nach Reassignment (nicht stale)");
  ok(window.R[0].name === "Apfelkuchen", "window.R liefert die aktuellen Daten");
  // Nochmal leeren (wie Import-Reset):
  R = [];
  ok(window.R.length === 0, "window.R folgt auch dem Zurücksetzen");
})();

// ---- (2) Korpus-Bau-Logik (Spiegel von buildRezeptbuchQueryCorpus) ----
console.log("\nProbe 2 — Korpus-Bau-Logik (Form + text-Feld + Deckel + fail-soft)");
const DIM = 384;
const embedStub = {
  init: async () => {},
  embedPassage: async (t) => { const v = new Float32Array(DIM); v[0] = t.length % 7; return v; },
};
function catNameStub(id) { return id === "kuchen" ? "Kuchen" : id; }

async function buildCorpus(recipesArr, emb, catNameFn) {
  try {
    if (!emb) return [];
    await emb.init();
    var R = Array.isArray(recipesArr) ? recipesArr : [];
    var recipes = R.filter(function (r) { return r && !r.blank && r.name && String(r.name).trim().length > 0; });
    if (recipes.length > 80) recipes = recipes.slice(0, 80);
    var corpus = [];
    for (var i = 0; i < recipes.length; i++) {
      var r = recipes[i];
      var ingNames = Array.isArray(r.ings) ? r.ings.map(function (x) { return (x && (x.name || x.origName)) ? (x.name || x.origName) : ""; }).filter(Boolean) : [];
      var flavors = Array.isArray(r.flavors) ? r.flavors : [];
      var parts = [String(r.name)].concat(flavors).concat(ingNames);
      if (r.cat && typeof catNameFn === "function") { try { parts.push(String(catNameFn(r.cat))); } catch (e2) {} }
      var passage = parts.filter(Boolean).join(", ");
      var raw = await emb.embedPassage(passage);
      var vec = (raw instanceof Float32Array) ? raw : new Float32Array(raw);
      corpus.push({ label: String(r.name), passageVec: vec, text: passage, anchorId: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/" });
    }
    return corpus;
  } catch (e) { return []; }
}

const recipes = [
  { name: "Omas Apfelkuchen", cat: "kuchen", flavors: ["süß"], ings: [{ name: "Äpfel" }, { name: "Zimt" }], blank: false },
  { name: "", blank: false },            // leerer Name → raus
  { name: "Platzhalter", blank: true },   // blank → raus
];
const corpus = await buildCorpus(recipes, embedStub, catNameStub);
ok(corpus.length === 1, "nur gültige Rezepte (leer/blank rausgefiltert)");
ok(corpus[0].label === "Omas Apfelkuchen", "label = Rezeptname");
ok(corpus[0].text.includes("Äpfel") && corpus[0].text.includes("Zimt"), "text trägt Zutaten (A1/BM25)");
ok(corpus[0].text.includes("Kuchen"), "text trägt Kategorie-Namen (catName)");
ok(corpus[0].passageVec instanceof Float32Array && corpus[0].passageVec.length === DIM, "passageVec ist Float32Array(384)");
ok(corpus[0].anchorId.includes("Mein-Rezeptbuch"), "anchorId zeigt auf den Endknoten");

console.log("\nProbe 3 — fail-soft");
ok((await buildCorpus([], embedStub, catNameStub)).length === 0, "leere Rezepte → leerer Korpus");
ok((await buildCorpus(recipes, null, catNameStub)).length === 0, "kein Embedding → leerer Korpus (kein Wurf)");
const many = Array.from({ length: 120 }, (_, i) => ({ name: "R" + i, blank: false }));
ok((await buildCorpus(many, embedStub, catNameStub)).length === 80, "Deckel bei 80 greift");

console.log(`\n${fail === 0 ? "ALLE GRÜN" : "FEHLER"} — ${pass} ok, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
