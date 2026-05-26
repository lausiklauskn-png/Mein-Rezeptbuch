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

    info("Init-Kette abgeschlossen (dbSuffix=" + DB_SUFFIX + ").");
    info("Spore manuell erzeugen mit __sbkimErzeugeSpore() in der DevTools-Konsole.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runInitChain, { once: true });
  } else {
    runInitChain();
  }
})();

window.__sbkimErzeugeSpore = async function () {
  console.info("Lade Embedding-Modell (~30 MB einmalig, dann gecacht)...");
  await SbkimEmbedding.init();

  var stammCategories = ["Vorspeisen", "Suppen", "Fleisch", "Fisch", "Vegetarisch", "Kuchen", "Desserts"];
  var guestCategories = ["Getränke", "Smoothies & Shakes", "Mocktails", "Alkfr. Cocktails", "Limonaden", "Tees & Kaffees", "Cocktails", "Bowlen", "Sirup & Basis", "Knabbereien", "Fingerfood"];
  var domainKeywords = ["Rezept", "Kochen", "Essen", "Hauptgang", "Beilage", "Backen", "Saucen"];
  var allText = stammCategories.concat(guestCategories).concat(domainKeywords).join(", ");

  var vec = await SbkimEmbedding.embedPassage(allText);
  console.info("Domain-Vektor erzeugt: " + vec.length + " Floats");

  var spore = await SbkimSpore.generateOwnSpore({
    domain: "lausiklauskn-png.github.io",
    endpoint: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/",
    nodeType: "hybrid",
    nodeName: "Rezeptbuch Klaus",
    domainDescription: "Klaus Rezeptbuch - Hausgemachte Kochrezepte vom Hefeteig bis zur Sauce, plus Begleitgetränke und Knabbereien als Ueberraschungs-Plus.",
    domainKeywords: domainKeywords,
    domainVector: Array.from(vec),
    stammCategories: stammCategories,
    guestCategories: guestCategories,
  });

  console.info("Spore erzeugt, nodeId =", spore.id);
  console.info("Signatur-Länge =", spore.signature.length);
  console.info("Spore-JSON in DevTools kopieren mit: copy(JSON.stringify(await SbkimSpore.getOwnSpore(), null, 2))");
  return spore;
};
