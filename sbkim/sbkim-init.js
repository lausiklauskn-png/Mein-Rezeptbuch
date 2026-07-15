// sbkim-init.js — Rezeptbuch Klaus
// Endknoten-Init-Kette nach Karte 09 § Schritt 4 + 9a + 10 + 11.
// Reihenfolge analog Sage-Init: 01 → 02 → (03 lazy) → 05 → 06 → 07 → 08 →
// 00. Service-Worker läuft separat über ./app-sw.js (Variante 3b,
// importScripts("./sbkim-sw-v3.js")).
//
// Fail-soft pro Modul: ein fehlschlagender init() bricht die Kette NICHT —
// console.warn, App-PWA bleibt benutzbar. Volle Andockbarkeit setzt aber
// alle init()s grün voraus.
//
// Spore-Generierung manuell via window.__sbkimErzeugeSpore() in DevTools-
// Konsole — die getOrCreateIdentity-/setActiveIdentity-Wege folgen in
// einer eigenen Multi-Persona-UI-Pflege-Sitzung (Brief 99 § Vision-Anker 5).

(function () {
  "use strict";

  var DB_SUFFIX = "rezeptbuch";
  var INIT_FLAG = "__sbkimRezeptbuchInitDone";

  function warn(modul, err) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "SBKIM-Init: " + modul + " fehlgeschlagen — App bleibt nutzbar, " +
          "aber SBKIM-Pfad ist degradiert. " +
          (err && err.message ? err.message : err),
      );
    }
  }

  function info(msg) {
    if (typeof console !== "undefined" && console.info) {
      console.info("SBKIM-Init: " + msg);
    }
  }

  async function initModule(name, fn) {
    if (typeof fn !== "function") {
      warn(name, new Error(name + " nicht auf window — script-Tag fehlt?"));
      return false;
    }
    try {
      await fn();
      return true;
    } catch (err) {
      warn(name, err);
      return false;
    }
  }

  async function runInitChain() {
    if (window[INIT_FLAG]) return;
    window[INIT_FLAG] = true;

    // 01 Storage — Pflicht-Erstes, alle anderen Module hängen daran.
    var storageOk = await initModule("SbkimStorage", function () {
      return window.SbkimStorage && window.SbkimStorage.init({ dbSuffix: DB_SUFFIX });
    });
    if (!storageOk) {
      warn("SBKIM-Init", new Error("Modul 01 Storage nicht initialisiert — Folge-Module übersprungen."));
      return;
    }

    // 17 Floating-Widget — Endknoten-Standard-Render-Schicht (Karte 09
    // Schritt 12). MUSS VOR Modul 15/16 init laufen, damit die Proxy-
    // Spans #lamp-fremd + #sbkim-siegel-badge im DOM sind, bevor Modul
    // 15/16 ihre Click-Handler attachen. Module 15+16 sind im
    // Rezeptbuch-Endknoten aktuell zurückgebaut — das Widget bleibt
    // trotzdem als Vier-Slot-Live-Status-Dashboard sichtbar (LEBT/
    // VERKEHR/FREMD/SIEGEL).
    await initModule("SbkimWidget", function () {
      return window.SbkimWidget && window.SbkimWidget.init({
        allowedOrigins: ["https://lausiklauskn-png.github.io"],
        repoUrl:        "https://github.com/lausiklauskn-png/Mein-Rezeptbuch",
      });
    });

    await SbkimMembrane.init({
      allowedOrigins: ["https://lausiklauskn-png.github.io"],
    });
    SbkimSiegel.init({
      badgeSelector: "#sbkim-siegel-badge",
      repoUrl: "https://github.com/lausiklauskn-png/Mein-Rezeptbuch",
    });

    // 18 Tool-PWA Sub (a) Vorab — Andock-Wizard. Wird vom Bronze-SIEGEL-
    // Klick (Modul 16 Sub (e) Hook) geöffnet, NICHT von selbst.
    await SbkimToolPwa.init({
      endpoint:        "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/",
      domain:          "rezeptbuch",
      domainKeywords:  ["Rezept", "Kochen", "Essen", "Hauptgang", "Beilage", "Backen", "Saucen"],
      stammCategories: ["Vorspeisen", "Suppen", "Fleisch", "Fisch", "Vegetarisch", "Kuchen", "Desserts"],
      guestCategories: ["Getränke", "Smoothies & Shakes", "Mocktails", "Alkfr. Cocktails", "Limonaden", "Tees & Kaffees", "Cocktails", "Bowlen", "Sirup & Basis", "Knabbereien", "Fingerfood"],
      repoUrl:         "https://github.com/lausiklauskn-png/Mein-Rezeptbuch",
    });

    // Query-über-Relais (Korpus-Provider, 2026-07-02): Korpus-Quelle für
    // SbkimMatch.queryLocal, damit Rezeptbuch auf eine eingehende Frage übers
    // Relais mit bedeutungs-sortierten Treffern aus seinem AKTUELLEN Inhalt
    // antwortet (die echten Rezepte aus window.R — jetzt live via Getter).
    // Lazy: erst beim ersten queryLocal wird embeddet (Modul 03, ~30 MB
    // einmalig). Fail-soft: ohne Rezepte/Embedding → leere Liste (kein Throw).
    // KEIN PII — nur Rezept-Namen/Zutaten/Kategorie (öffentlicher Inhalt).
    // A1: text-Feld (roher Passage-Text) → BM25 trifft Zutaten/Geschmack.
    if (window.SbkimMatch && typeof SbkimMatch.setLocalCorpus === "function") {
      SbkimMatch.setLocalCorpus(async function buildRezeptbuchQueryCorpus() {
        try {
          if (!window.SbkimEmbedding) return [];
          await SbkimEmbedding.init();
          var R = Array.isArray(window.R) ? window.R : [];
          var recipes = R.filter(function (r) {
            return r && !r.blank && r.name && String(r.name).trim().length > 0;
          });
          if (recipes.length > 80) recipes = recipes.slice(0, 80); // Deckel gegen Embedding-Kosten
          var corpus = [];
          for (var i = 0; i < recipes.length; i++) {
            var r = recipes[i];
            var ingNames = Array.isArray(r.ings)
              ? r.ings.map(function (x) { return (x && (x.name || x.origName)) ? (x.name || x.origName) : ""; }).filter(Boolean)
              : [];
            var flavors = Array.isArray(r.flavors) ? r.flavors : [];
            var parts = [String(r.name)].concat(flavors).concat(ingNames);
            if (r.cat && typeof catName === "function") { try { parts.push(String(catName(r.cat))); } catch (e2) {} }
            var passage = parts.filter(Boolean).join(", ");
            var raw = await SbkimEmbedding.embedPassage(passage);
            var vec = (raw instanceof Float32Array) ? raw : new Float32Array(raw);
            corpus.push({
              label: String(r.name),
              passageVec: vec,
              text: passage,
              anchorId: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/",
            });
          }
          console.info("[MR-SBKIM] queryLocal-Korpus aus " + corpus.length + " Rezepten gebaut (Frage→Antwort übers Relais).");
          return corpus;
        } catch (e) {
          console.warn("[MR-SBKIM] queryLocal-Korpus-Bau übersprungen (fail-soft):", e);
          return [];
        }
      });
    }

    // 02 Spore — Identitäts-Schicht. KEIN getOrCreateIdentity hier; das
    // läuft manuell via __sbkimErzeugeSpore() (DevTools) — Spore-Generierung
    // ist eine bewusste Klaus-Geste, nicht ein Boot-Schritt.
    await initModule("SbkimSpore", function () {
      return window.SbkimSpore && window.SbkimSpore.init();
    });

    // 03 Embedding bewusst NICHT — lazy, ~30 MB Modell-Download erst beim
    // ersten embedPassage()-Aufruf (in __sbkimErzeugeSpore).

    // 05 Anastomose — SW-Message-Listener + BroadcastChannel-Bridge.
    await initModule("SbkimAnastomose", function () {
      return window.SbkimAnastomose && window.SbkimAnastomose.init();
    });

    // 06 Heterokaryose.
    await initModule("SbkimHeterokaryose", function () {
      return window.SbkimHeterokaryose && window.SbkimHeterokaryose.init();
    });

    // 07 Apoptose — Vermächtnis-Empfang.
    await initModule("SbkimApoptose", function () {
      return window.SbkimApoptose && window.SbkimApoptose.init();
    });

    // 08 UI-Demo — Outbox-Pflege.
    await initModule("SbkimUiDemo", function () {
      return window.SbkimUiDemo && window.SbkimUiDemo.init();
    });

    // 00 Doku-Fenster zuletzt — liest die anderen Module als optionale
    // Quellen. Rezeptbuch hat aktuell kein eindeutig ID-versehenes Such-
    // Symbol; Modul 00 läuft fail-soft (MutationObserver-Re-Try gibt nach
    // 10 s auf). Eine eigene Pflege-Sitzung kann später ein #sbkim-doku-
    // Trigger ergänzen.
    await initModule("SbkimDoku", function () {
      return window.SbkimDoku && window.SbkimDoku.init({
        searchIconSelector: "#sbkim-doku-trigger",
      });
    });

    // Auto-Lauschen am Nostr-Relais (Stufe 2, 2026-06-27): Empfangsmodus MIT
    // Antwortrecht — der Knoten lauscht selbsttätig am Relais
    // wss://relay.family-projekt.de auf eingehende Handshakes und ANTWORTET nur;
    // er initiiert NIE von sich aus (kein Crawler). Fail-soft + nicht-blockierend:
    // ohne Relais-Client (Modul 05b, type=module) oder bei Netz-Fehler passiert
    // nichts. Kurz warten, bis das deferred 05b-Modul window.SbkimNostrRelay gesetzt hat.
    (async function () {
      for (var i = 0; i < 25 && !window.SbkimNostrRelay; i++) {
        await new Promise(function (r) { setTimeout(r, 80); });
      }
      if (window.SbkimAnastomose &&
          typeof window.SbkimAnastomose.listenNostr === "function" &&
          window.SbkimNostrRelay) {
        try {
          window.SbkimAnastomose.listenNostr()
            .then(function () {
              info("Auto-Lauschen aktiv (Empfangsmodus mit Antwortrecht).");
              // Sichtbar im Floating-Widget (Modul 17): VERKEHR-Lampe ruhig grün.
              try { window.dispatchEvent(new CustomEvent("sbkim:nostr-listening", { detail: { active: true } })); } catch (e) {}
            })
            .catch(function (e) { info("Auto-Lauschen übersprungen: " + (e && e.message || e)); });
        } catch (e) { info("Auto-Lauschen übersprungen: " + (e && e.message || e)); }
      }
    })();

    info("Init-Kette abgeschlossen (dbSuffix=" + DB_SUFFIX + ").");
    info("Spore manuell erzeugen mit __sbkimErzeugeSpore() in der DevTools-Konsole.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runInitChain, { once: true });
  } else {
    runInitChain();
  }
})();

// Reicher Default-Beschreibungstext des Rezeptbuch-Knotens. EINE Quelle der
// Wahrheit — sowohl die DevTools-Funktion __sbkimErzeugeSpore() als auch das
// Semantik-Textfeld im Siegel (SBKIM_SEMANTIK_CONFIG.defaultDomainDescription)
// befüllen sich daraus vor. Ab Bau 2026-06-07 ist DIESER Text (bzw. der vom
// Nutzer eingegebene) der Embedding-Eingang — nicht mehr die Kategorie-
// Stichwort-Liste.
var SBKIM_REZEPTBUCH_DESCRIPTION =
  "Klaus' Rezeptbuch ist ein Endknoten im SBKIM-Mycel für hausgemachte " +
  "Kochrezepte — von Vorspeisen, Suppen, Fleisch, Fisch und vegetarischen " +
  "Gerichten über Kuchen und Desserts bis zu Saucen und Beilagen, vom " +
  "Hefeteig bis zur fertigen Sauce. Dazu passende Begleitgetränke (Limonaden, " +
  "Tees, Mocktails, alkoholfreie Cocktails) und kleine Knabbereien als " +
  "Überraschungs-Plus. Zugleich ein wandelbarer Rezept-Baukasten: nicht auf " +
  "ein Thema festgelegt — lade ein neues Rezept-Paket herein, benenne " +
  "Kategorien um, und aus dem Kochbuch wird deine eigene Bar (Backstube, " +
  "Grill-Buch, Frühstücksbar, Salatbar, Pasta-Werkstatt). Jedes Rezept ist " +
  "Zutaten plus Schritte — bis hin zu den Zutaten eines Chemiebaukastens. " +
  "Teil des SBKIM-Knotennetzes rund um Sage-Protokoll und SB-KIMTool-Point, " +
  "semantisch verbunden mit verwandten Knoten wie dem Cocktail-Knoten Mixarium.";

// DevTools-Fallback: Spore manuell erzeugen. Ab Bau 2026-06-07 ist der
// optionale `description`-Parameter (Default: reicher Rezeptbuch-Text) der
// Embedding-Eingang — gleiche Logik wie das Semantik-Textfeld im Siegel.
window.__sbkimErzeugeSpore = async function (description) {
  console.info("Lade Embedding-Modell (~30 MB einmalig, dann gecacht)...");
  await SbkimEmbedding.init();

  var stammCategories = ["Vorspeisen", "Suppen", "Fleisch", "Fisch", "Vegetarisch", "Kuchen", "Desserts"];
  var guestCategories = ["Getränke", "Smoothies & Shakes", "Mocktails", "Alkfr. Cocktails", "Limonaden", "Tees & Kaffees", "Cocktails", "Bowlen", "Sirup & Basis", "Knabbereien", "Fingerfood"];
  var domainKeywords = ["Rezept", "Kochen", "Essen", "Hauptgang", "Beilage", "Backen", "Saucen"];
  var explicitDescription = (typeof description === "string" && description.trim().length > 0);
  var beschreibung = explicitDescription ? description.trim() : SBKIM_REZEPTBUCH_DESCRIPTION;

  // Inhalts-treuer domainVector (2026-06-28): wenn echte Rezepte vorhanden sind
  // UND der Nutzer keine eigene Beschreibung erzwingt, entscheidet der INHALT
  // (Rezept-Name + Kategorie) statt der Selbstbeschreibung. sampleContent liefert
  // NUR unkritische Labels (Rezept-Namen/Kategorien) — kein PII. Fail-soft: kein
  // Inhalt / Fehler / explizite Beschreibung → Beschreibungs-Vektor (Hülle).
  function sampleContent() {
    var out = [];
    try {
      var arr = (typeof window !== "undefined" && Array.isArray(window.R)) ? window.R : [];
      for (var i = 0; i < arr.length && out.length < 32; i++) {
        var r = arr[i];
        if (!r || r.blank) continue;
        var name = (typeof r.name === "string") ? r.name.trim() : "";
        var cat = (typeof r.cat === "string") ? r.cat.trim() : "";
        var t = (cat + " " + name).trim();
        if (t.length) out.push(t);
      }
    } catch (e) { /* fail-soft */ }
    return out;
  }

  var vec = null;
  var source = "description";
  if (!explicitDescription && typeof SbkimEmbedding.embedContentVector === "function") {
    var samples = sampleContent();
    if (samples.length) {
      try {
        var res = await SbkimEmbedding.embedContentVector(samples);
        if (res && res.vector) { vec = res.vector; source = "content"; }
        console.info("Inhalts-Vektor aus " + samples.length + " Rezepten erzeugt.");
      } catch (e) { console.warn("embedContentVector — Fallback auf Beschreibung:", e); }
    }
  }
  if (!vec) {
    vec = await SbkimEmbedding.embedPassage(beschreibung);
    source = "description";
    console.info("Beschreibungs-Vektor erzeugt (kein/leerer Inhalt oder eigene Beschreibung).");
  }
  console.info("Domain-Vektor erzeugt: " + vec.length + " Floats, Quelle: " + source);

  var spore = await SbkimSpore.generateOwnSpore({
    domain: "lausiklauskn-png.github.io",
    endpoint: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/",
    nodeType: "hybrid",
    nodeName: "Rezeptbuch Klaus",
    domainDescription: beschreibung,
    domainKeywords: domainKeywords,
    domainVector: Array.from(vec),
    embeddingSource: source,
    embeddingVersion: 1,
    stammCategories: stammCategories,
    guestCategories: guestCategories,
  });

  console.info("Spore erzeugt, nodeId =", spore.id);
  console.info("Signatur-Länge =", spore.signature.length);
  console.info("Spore-JSON in DevTools kopieren mit: copy(JSON.stringify(await SbkimSpore.getOwnSpore(), null, 2))");
  return spore;
};

// ============================================================================
// SIEGEL-NEUGESTALTUNG — host-seitige Injektion (Bau 2026-06-07)
// ----------------------------------------------------------------------------
// Spiegelt Sages host-seitiges Muster (injectIdentityLinkIntoSiegel +
// watchForSiegelModal + buildSchutzInfoBlock + buildSemantikBlock +
// openSchutzModal). Modul 16 bleibt reines, netzweit geteiltes Render-Modul;
// alles Knoten-Spezifische lebt hier im Host. Sobald Modul 16 sein Modal
// (#sbkim-siegel-modal) ins DOM hängt, injizieren wir oben:
//   1. 🔑-Knopf „Eigene Identität & Spore erzeugen / verwalten →"
//      (Rezeptbuch hat keinen separaten Wizard — der Knopf springt zum
//       Semantik-Textfeld darunter, dem eigentlichen Erzeugen/Neu-Signieren).
//   2. 🛡 Vertrauens-/Schutz-Block + Link auf die Erklär-Seite (In-Page-Overlay
//      auf sicherheit.html, kein neuer Tab).
//   3. ✍ Semantik-Beschreibungs-Textfeld: Text → Modul 03 Embedding
//      (e5-small, 384-dim, L2) → domainVector → Modul 02 generateOwnSpore
//      (re-sign mit vorhandenem Schlüssel, gleiche nodeId). KEINE neue Krypto.
(function () {
  "use strict";

  var SBKIM_SEMANTIK_CONFIG = {
    domain: "lausiklauskn-png.github.io",
    endpoint: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/",
    nodeType: "hybrid",
    nodeName: "Rezeptbuch Klaus",
    domainKeywords: ["Rezept", "Kochen", "Essen", "Hauptgang", "Beilage", "Backen", "Saucen"],
    stammCategories: ["Vorspeisen", "Suppen", "Fleisch", "Fisch", "Vegetarisch", "Kuchen", "Desserts"],
    guestCategories: ["Getränke", "Smoothies & Shakes", "Mocktails", "Alkfr. Cocktails", "Limonaden", "Tees & Kaffees", "Cocktails", "Bowlen", "Sirup & Basis", "Knabbereien", "Fingerfood"],
    // Eine Quelle der Wahrheit (oben definiert; auch DevTools-Fallback nutzt ihn).
    defaultDomainDescription: SBKIM_REZEPTBUCH_DESCRIPTION,
    placeholder: "Beschreibe deine App neu oder kopiere die Beschreibung / README hier hinein.",
    hint: "Je konkreter, desto besser findet dich das Mycel. Beschreibe in eigenen Worten: was die App/Seite ist, wofür man sie nutzt, welche Themen/Stichworte sie abdeckt, für wen sie gedacht ist. Ein gut gefüllter Absatz (ca. 3–8 Sätze) ist ideal — gern auch die README hineinkopieren, sie beschreibt das Projekt meist am treffendsten. Vermeide reine Schlagwort-Listen ohne Kontext.",
    // Skin (Rezeptbuch-Gold) — passt zum gold/navy Siegel-Modal.
    skin: { accent: "rgba(168,132,30,0.55)", accentBg: "rgba(168,132,30,0.10)", ink: "#f2e9cf" },
  };

  var doc = document;

  function downloadJson(name, obj) {
    try {
      var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement("a");
      a.href = url;
      a.download = name;
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    } catch (_e) { /* fail-soft */ }
  }

  // ---- 🔑-Knopf: springt zum Semantik-Textfeld (das eigentliche Erzeugen) ----
  function focusSemantikInput(modal) {
    var ta = modal.querySelector("[data-rez-semantik-input]");
    if (!ta) return;
    try { ta.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (_e) { ta.scrollIntoView(); }
    setTimeout(function () { try { ta.focus(); } catch (_e2) {} }, 200);
  }

  // ---- 🛡 Schutz-/Vertrauens-Block ----
  function buildSchutzInfoBlock() {
    var wrap = doc.createElement("div");
    wrap.setAttribute("data-rez-schutz-block", "");
    wrap.style.cssText = "margin:0 0 1rem;padding:0.7rem 0.9rem;background:rgba(244,196,48,0.07);border:1px solid rgba(244,196,48,0.32);border-radius:8px;";
    var head = doc.createElement("div");
    head.textContent = "🛡 Was bedeutet dieses Siegel — und wie bist du geschützt?";
    head.style.cssText = "font-weight:600;font-size:0.84rem;margin:0 0 0.35rem;color:#f4d57a;";
    var body = doc.createElement("p");
    body.textContent = "Das Siegel ist selbst-ausgestellt: der Knoten prüft sich beim Start selbst und legt alles offen. Es bewegt nur Daten, nie Programme — und läuft im Browser-Sandkasten. Kurz: prüf mich nach, hier ist alles offen.";
    body.style.cssText = "margin:0 0 0.5rem;font-size:0.8rem;line-height:1.5;color:rgba(245,245,255,0.82);";
    var link = doc.createElement("button");
    link.type = "button";
    link.setAttribute("data-rez-schutz-open", "");
    link.textContent = "Ausführlich erklärt → So funktioniert das Mycel & wie du geschützt bist";
    link.style.cssText = "display:inline-block;padding:0;background:none;border:none;font:inherit;font-size:0.82rem;color:#f4c430;text-decoration:underline;cursor:pointer;text-align:left;";
    link.addEventListener("click", openSchutzModal);
    wrap.appendChild(head);
    wrap.appendChild(body);
    wrap.appendChild(link);
    return wrap;
  }

  // ---- Erklär-Seite als In-Page-Overlay (iframe auf sicherheit.html) ----
  // Kein neuer Tab. ✕ / Backdrop / Esc schließen. z-index über dem Siegel-Modal.
  function openSchutzModal() {
    var existing = doc.getElementById("rez-schutz-modal");
    if (existing) { existing.style.display = "grid"; return; }
    var modal = doc.createElement("div");
    modal.id = "rez-schutz-modal";
    modal.style.cssText = "position:fixed;inset:0;z-index:100001;display:grid;place-items:center;padding:1.1rem;";
    var backdrop = doc.createElement("div");
    backdrop.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);";
    backdrop.addEventListener("click", closeSchutzModal);
    var card = doc.createElement("div");
    card.style.cssText = "position:relative;z-index:1;width:min(820px,96vw);height:min(88vh,100%);background:#070710;border:1px solid rgba(244,196,48,0.32);border-radius:16px;overflow:hidden;box-shadow:0 28px 60px rgba(0,0,0,0.7);display:flex;flex-direction:column;";
    var bar = doc.createElement("div");
    bar.style.cssText = "display:flex;justify-content:flex-end;padding:0.45rem;flex:0 0 auto;border-bottom:1px solid rgba(255,255,255,0.08);";
    var close = doc.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Schließen");
    close.textContent = "✕";
    close.style.cssText = "width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);color:#f0f0ff;font-size:1.1rem;line-height:1;cursor:pointer;";
    close.addEventListener("click", closeSchutzModal);
    var frame = doc.createElement("iframe");
    frame.src = "sicherheit.html";
    frame.title = "So funktioniert das Mycel & wie du geschützt bist";
    frame.style.cssText = "flex:1 1 auto;width:100%;border:0;background:#070710;";
    bar.appendChild(close);
    card.appendChild(bar);
    card.appendChild(frame);
    modal.appendChild(backdrop);
    modal.appendChild(card);
    doc.body.appendChild(modal);
    if (!window.__rezSchutzEsc) {
      window.__rezSchutzEsc = function (e) { if (e.key === "Escape") closeSchutzModal(); };
      doc.addEventListener("keydown", window.__rezSchutzEsc);
    }
  }
  function closeSchutzModal() {
    var m = doc.getElementById("rez-schutz-modal");
    if (m) m.style.display = "none";
  }

  // ---- ✍ Semantik-Beschreibungs-Textfeld ----
  function autoGrowSemantik(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.max(ta.scrollHeight, 120) + "px";
  }

  function prefillSemantik(ta) {
    var fallback = SBKIM_SEMANTIK_CONFIG.defaultDomainDescription;
    function apply(v) { if (!ta.value) { ta.value = v || fallback; autoGrowSemantik(ta); } }
    try {
      if (window.SbkimSpore && typeof window.SbkimSpore.getOwnSpore === "function") {
        window.SbkimSpore.getOwnSpore()
          .then(function (sp) { apply(sp && typeof sp.domainDescription === "string" && sp.domainDescription.length ? sp.domainDescription : fallback); })
          .catch(function () { apply(fallback); });
      } else { apply(fallback); }
    } catch (_e) { apply(fallback); }
  }

  function buildSemantikBlock() {
    var C = SBKIM_SEMANTIK_CONFIG;
    var wrap = doc.createElement("div");
    wrap.setAttribute("data-rez-semantik-block", "");
    wrap.style.cssText = "margin:0 0 1rem;padding:0.8rem 0.9rem;background:" + C.skin.accentBg + ";border:1px solid " + C.skin.accent + ";border-radius:8px;";

    var label = doc.createElement("div");
    label.textContent = "✍ Semantische Beschreibung — macht deinen Domain-Vektor treffender";
    label.style.cssText = "font-weight:600;font-size:0.84rem;margin:0 0 0.5rem;color:" + C.skin.ink + ";";

    var ta = doc.createElement("textarea");
    ta.setAttribute("data-rez-semantik-input", "");
    ta.placeholder = C.placeholder;
    ta.rows = 4;
    ta.style.cssText = "width:100%;box-sizing:border-box;min-height:120px;resize:vertical;overflow:hidden;font:inherit;font-size:0.84rem;line-height:1.5;color:" + C.skin.ink + ";background:rgba(0,0,0,0.35);border:1px solid " + C.skin.accent + ";border-radius:6px;padding:0.6rem 0.7rem;";
    ta.addEventListener("input", function () { autoGrowSemantik(ta); });

    var hint = doc.createElement("p");
    hint.textContent = C.hint;
    hint.style.cssText = "margin:0.5rem 0 0.7rem;font-size:0.78rem;line-height:1.5;color:rgba(245,245,255,0.7);";

    var btn = doc.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-rez-semantik-btn", "");
    btn.textContent = "Beschreibung übernehmen → Vektor & Spore neu signieren";
    btn.style.cssText = "display:block;width:100%;padding:0.55rem 0.9rem;background:" + C.skin.accent + ";border:1px solid " + C.skin.accent + ";border-radius:7px;color:#1a1407;font:inherit;font-size:0.84rem;font-weight:600;cursor:pointer;";

    var out = doc.createElement("pre");
    out.setAttribute("data-rez-semantik-out", "");
    out.style.cssText = "margin:0.7rem 0 0;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,'SFMono-Regular',Menlo,monospace;font-size:0.76rem;line-height:1.5;color:rgba(245,245,255,0.78);";

    btn.addEventListener("click", function () { reSignWithDescription(ta.value, out, btn); });

    wrap.appendChild(label);
    wrap.appendChild(ta);
    wrap.appendChild(hint);
    wrap.appendChild(btn);
    wrap.appendChild(out);

    prefillSemantik(ta);
    return wrap;
  }

  // Voller Pfad: Beschreibung → Modul 03 Embedding → domainVector → Modul 02
  // generateOwnSpore (re-sign mit vorhandenem Schlüssel, gleiche nodeId).
  async function reSignWithDescription(description, outEl, btn) {
    var C = SBKIM_SEMANTIK_CONFIG;
    function set(t) { outEl.textContent = t; }
    description = (description || "").trim();
    if (description.length < 12) {
      set("Bitte eine etwas ausführlichere Beschreibung eingeben (mindestens ein Satz).");
      return;
    }
    if (!window.SbkimEmbedding || !window.SbkimSpore) {
      set("Module 02/03 (SbkimSpore/SbkimEmbedding) nicht geladen — Sichttest-Setup prüfen.");
      return;
    }
    btn.disabled = true;
    var onProg = function (ev) {
      var d = ev && ev.detail;
      if (!d) return;
      if (d.status === "progress" && typeof d.progress === "number" && isFinite(d.progress)) {
        var pct = Math.max(0, Math.min(100, Math.round(d.progress)));
        var file = d.file ? String(d.file).split("/").pop() : "Modell";
        var bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
        set("Embedding-Modell lädt … " + bar + " " + pct + " %  (" + file + ", ~30 MB einmalig)");
      }
    };
    window.addEventListener("sbkim:embedding-progress", onProg);
    try {
      set("Stelle Identität sicher (vorhandener Schlüssel → gleiche nodeId) …");
      await window.SbkimSpore.getOrCreateIdentity();
      set("Lade Modul 03 (Embedding-Modell, ~30 MB einmalig) …");
      await window.SbkimEmbedding.init();
      set("Erzeuge Domain-Vektor (384 floats) aus deiner Beschreibung …");
      var vec = await window.SbkimEmbedding.embedPassage(description);
      var arr = Array.from(vec);
      var l2 = Math.sqrt(arr.reduce(function (a, x) { return a + x * x; }, 0));
      set("Signiere Spore mit neuem Domain-Vektor …");
      var spore = await window.SbkimSpore.generateOwnSpore({
        domain: C.domain,
        endpoint: C.endpoint,
        nodeType: C.nodeType,
        nodeName: C.nodeName,
        domainDescription: description,
        domainKeywords: C.domainKeywords,
        domainVector: arr,
        embeddingSource: "description",
        embeddingVersion: 1,
        stammCategories: C.stammCategories,
        guestCategories: C.guestCategories,
      });
      window.removeEventListener("sbkim:embedding-progress", onProg);
      downloadJson("spore.json", spore);
      set("✔ Spore neu signiert + heruntergeladen — nodeId " + spore.id + " (unverändert), Vektor 384-dim, L2=" + l2.toFixed(4) + ". Committe sie nach sbkim/spore.json.");
      btn.disabled = false;
    } catch (err) {
      window.removeEventListener("sbkim:embedding-progress", onProg);
      set("Fehler: " + (err && err.message ? err.message : err));
      btn.disabled = false;
    }
  }

  // ---- Injektion ins Siegel-Modal ----
  function injectIdentityLinkIntoSiegel(modal) {
    if (!modal || modal.querySelector("[data-rez-identity-link]")) return;
    var panel = modal.querySelector('[role="dialog"]') || modal.firstElementChild || modal;
    if (!panel) return;

    var link = doc.createElement("button");
    link.setAttribute("data-rez-identity-link", "");
    link.type = "button";
    link.textContent = "🔑 Eigene Identität & Spore erzeugen / verwalten →";
    link.style.cssText = "display:block;width:100%;margin:0 0 1rem;padding:0.6rem 0.9rem;background:rgba(168,132,30,0.16);border:1px solid rgba(168,132,30,0.55);border-radius:8px;color:#f2e9cf;font:inherit;font-size:0.86rem;cursor:pointer;text-align:left;";
    link.addEventListener("click", function () { focusSemantikInput(modal); });

    var schutz = buildSchutzInfoBlock();
    var semantik = buildSemantikBlock();

    var anchor = panel.querySelector("[data-siegel-bronze-hinweis]") || panel.querySelector("[data-siegel-date]");
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(link, anchor.nextSibling);
      anchor.parentNode.insertBefore(schutz, link.nextSibling);
      anchor.parentNode.insertBefore(semantik, schutz.nextSibling);
    } else {
      panel.appendChild(link);
      panel.appendChild(schutz);
      panel.appendChild(semantik);
    }
  }

  function watchForSiegelModal() {
    var existing = doc.getElementById("sbkim-siegel-modal");
    if (existing) injectIdentityLinkIntoSiegel(existing);
    if (typeof MutationObserver !== "function" || !doc.body) return;
    try {
      var obs = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (!node || node.nodeType !== 1) continue;
            if (node.id === "sbkim-siegel-modal") injectIdentityLinkIntoSiegel(node);
            else if (node.querySelector) {
              var inner = node.querySelector("#sbkim-siegel-modal");
              if (inner) injectIdentityLinkIntoSiegel(inner);
            }
          }
        }
      });
      obs.observe(doc.body, { childList: true, subtree: true });
    } catch (_e) { /* fail-soft */ }
  }

  if (doc.body) watchForSiegelModal();
  else doc.addEventListener("DOMContentLoaded", watchForSiegelModal);
})();

// ── Modul 23 Rendezvous — öffentlicher Floating-Knopf „🌐 Mit dem Netz
// verbinden" (Klaus 2026-06-28: sofort öffentlich, eigener kleiner Knopf).
// UNABHÄNGIG von der Andock-Kette gemountet (soll immer erscheinen). Mechanik
// = geteiltes Modul 23 (SbkimRendezvous), nutzt den vorhandenen Stack lazy;
// createIdentity reicht den vorhandenen Spore-Erzeuger __sbkimErzeugeSpore
// durch (erzeugt bei Bedarf die lebende Spore mit Rezeptbuch-Domäne).
// Verfassungstreu: nutzer-ausgelöst, kein Auto-Connect. Fail-soft.
(function () {
  "use strict";
  function mountRendezvous() {
    // Modus A (Identitäts-Hygiene, Skill „saubere-netz-anmeldung"): eigene
    // Schublade `sbkim_rezeptbuch` + stabile Identität sanft/idempotent/lokal
    // sicherstellen (KEIN Auto-Anmelden, Empfangsmodus). dbSuffix ins Modul 23,
    // damit Modus B (🧹 Aufräumen) NUR den geteilten Alt-Topf `sbkim` löscht.
    if (window.SbkimRendezvous && typeof window.SbkimRendezvous.init === "function") {
      try {
        window.SbkimRendezvous.init({
          nodeName: "Mein Rezeptbuch",
          dbSuffix: "rezeptbuch",
          createIdentity: function () { return window.__sbkimErzeugeSpore(); },
          ensureIdentity: true,
        });
      } catch (e) { if (window.console && console.warn) console.warn("[MR-SBKIM] Rendezvous (Modus A) übersprungen:", e); }
    }
    if (!window.SbkimRendezvousUI) return;
    try {
      window.SbkimRendezvousUI.init({
        nodeName: "Mein Rezeptbuch",
        dbSuffix: "rezeptbuch",
        corner: "bl",
        createIdentity: function () { return window.__sbkimErzeugeSpore(); },
      });
      if (window.console && console.info) console.info("[MR-SBKIM] Rendezvous-UI gemountet (öffentlicher 🌐-Knopf, Modus A aktiv).");
    } catch (e) { if (window.console && console.warn) console.warn("[MR-SBKIM] Rendezvous-UI übersprungen:", e); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountRendezvous);
  else mountRendezvous();
})();

// ── Sicherheits-Netz: Modul-17-Widget nie außerhalb des Sichtfelds stranden
// lassen (Klaus 2026-07-05). Modul 17 stellt seine per localStorage gemerkte
// Position beim Start ungeprüft wieder her. Wechselt das Fenster-/Bildschirm-
// maß (Tablet ↔ DeX, Drehung), kann eine früher gemerkte Position außerhalb
// des sichtbaren Bereichs liegen — dann bleibt das Siegel-Widget unsichtbar,
// obwohl es gemountet und „sichtbar" ist. Dieser App-seitige Wächter rührt das
// geteilte Modul 17 NICHT an; er holt das Widget nur in die Standard-Ecke unten
// rechts zurück und verwirft die verwaiste Position, wenn es aus dem Viewport
// fällt. Fail-soft, No-Op solange das Widget sichtbar ist.
(function () {
  "use strict";
  var ID = "sbkim-widget";
  function positionKey() {
    try {
      return (window.SbkimWidget && window.SbkimWidget._meta &&
        window.SbkimWidget._meta.lsKeyPosition) || null;
    } catch (e) { return null; }
  }
  function clampIntoView() {
    var w = document.getElementById(ID);
    if (!w) return;
    var r = w.getBoundingClientRect();
    if (!r || (r.width === 0 && r.height === 0)) return; // noch nicht gerendert
    var vw = window.innerWidth || document.documentElement.clientWidth || 0;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var M = 24; // mindestens so viele px müssen sichtbar bleiben
    var offscreen = (r.right <= M || r.left >= vw - M || r.bottom <= M || r.top >= vh - M);
    if (!offscreen) return;
    var k = positionKey();
    if (k) { try { localStorage.removeItem(k); } catch (e) {} }
    w.style.top = ""; w.style.left = "";
    w.style.right = "16px"; w.style.bottom = "16px";
    if (window.console && console.info) {
      console.info("[MR-SBKIM] Siegel-Widget war außerhalb des Sichtfelds — in die Standard-Ecke zurückgeholt.");
    }
  }
  var tries = 0;
  (function waitForWidget() {
    if (document.getElementById(ID)) { clampIntoView(); return; }
    if (tries++ < 60) setTimeout(waitForWidget, 100);
  })();
  window.addEventListener("resize", clampIntoView);
  window.addEventListener("orientationchange", clampIntoView);
})();
