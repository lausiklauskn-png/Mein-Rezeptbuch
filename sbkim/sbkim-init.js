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
      // ribbonText graviert den App-Namen ins Wappen-Band (sonst bleibt es leer;
      // kein Auto-Slug — Regel Skill „status-leiste-siegel"). So sieht das Siegel
      // aus wie Sages (nur mit eigenem Namen im Band).
      ribbonText: "Mein Rezeptbuch",
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
