/*
 * SBKIM — Modul 01 — Storage
 *
 * IndexedDB wrapper for all sbkim_* stores. Promise-based API, no
 * callbacks. Database name: "sbkim", current version: 3 (additive
 * migrations: v=2 Bau-Sitzung 06 added `sbkim_hetero_inbox`,
 * v=3 Pflege Bau 06.1 added `sbkim_hetero_outbox` — Spec-Sitzung 08
 * specified the store; Pflege Bau 06.1 follows up the code anmelden).
 *
 * Public surface (registered on window.SbkimStorage):
 *   init() -> Promise<void>
 *   getStore(name) -> StoreHandle   (sync; throws UnknownStoreError)
 *   get(name, key) -> Promise<any | undefined>
 *   put(name, key, value) -> Promise<void>
 *   del(name, key) -> Promise<void>
 *   all(name) -> Promise<Array<{key, value}>>
 *   clear(name) -> Promise<void>
 *
 * Self-check: emits a console.info line on script load. See INTERFACES.md
 * and docs/components/01_storage.md for the binding spec.
 */
(function (global) {
  "use strict";

  var DB_NAME = "sbkim";
  var DB_VERSION = 3;
  var SBKIM_STORE_PREFIX = "sbkim_";

  // Stores, die der initiale Migration-Pfad (v=1) anlegt.
  var STORES_V1 = [
    "sbkim_keys",
    "sbkim_spore",
    "sbkim_siblings",
    "sbkim_anastomosis_log",
    "sbkim_legacy_inbox",
    "sbkim_doku_meta",
  ];

  // Stores, die in v=2 additiv hinzukommen (Bau-Sitzung 06).
  var STORES_V2 = [
    "sbkim_hetero_inbox",
  ];

  // Stores, die in v=3 additiv hinzukommen (Spec-Sitzung 08 spezifiziert,
  // Pflege Bau 06.1 meldet den Store im Code an — Modul 08 ist Schreiber,
  // Modul 06 ist Leser über den Outbox-Lese-Pfad).
  var STORES_V3 = [
    "sbkim_hetero_outbox",
  ];

  var KNOWN_STORES = STORES_V1.concat(STORES_V2).concat(STORES_V3);

  function makeError(name, message, cause) {
    var e = new Error(message);
    e.name = name;
    if (cause !== undefined) e.cause = cause;
    return e;
  }

  function assertKnownStore(storeName) {
    if (KNOWN_STORES.indexOf(storeName) === -1) {
      throw makeError(
        "UnknownStoreError",
        "Unbekannter Store: '" + storeName + "'. Erlaubt sind: " + KNOWN_STORES.join(", ") + ".",
      );
    }
  }

  function applyMigration(db, version) {
    if (version === 1) {
      for (var i = 0; i < STORES_V1.length; i++) {
        var name = STORES_V1[i];
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
      return;
    }
    if (version === 2) {
      // Bau-Sitzung 06: sbkim_hetero_inbox additiv.
      // Schlüssel-Form: "<peerNodeId>|<ts>" (Komposit, Drift-Spur).
      for (var j = 0; j < STORES_V2.length; j++) {
        var name2 = STORES_V2[j];
        if (!db.objectStoreNames.contains(name2)) {
          db.createObjectStore(name2);
        }
      }
      return;
    }
    if (version === 3) {
      // Pflege Bau 06.1 (2026-05-15): sbkim_hetero_outbox additiv.
      // Schlüssel-Form: `label` (string ≤ 64 Zeichen).
      // Schreiber: Modul 08 (UI-Demo). Leser: Modul 06 (Heterokaryose).
      for (var k = 0; k < STORES_V3.length; k++) {
        var name3 = STORES_V3[k];
        if (!db.objectStoreNames.contains(name3)) {
          db.createObjectStore(name3);
        }
      }
      return;
    }
    // Future migrations: branch on `version` and add stores additively.
    // Never deleteObjectStore here without an explicit spec update.
  }

  var dbPromise = null;

  function init() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined" || indexedDB === null) {
        reject(makeError(
          "StorageUnavailableError",
          "IndexedDB ist in dieser Umgebung nicht verfuegbar (Privatmodus / blockiert).",
        ));
        return;
      }
      var req;
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (err) {
        reject(makeError(
          "StorageOpenError",
          "IndexedDB.open() warf synchron: " + (err && err.message),
          err,
        ));
        return;
      }
      req.onupgradeneeded = function (ev) {
        var db = req.result;
        var oldV = ev.oldVersion || 0;
        var newV = ev.newVersion || DB_VERSION;
        for (var v = oldV + 1; v <= newV; v++) {
          applyMigration(db, v);
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        var err = req.error;
        reject(makeError(
          "StorageOpenError",
          "IndexedDB-Open scheiterte: " + (err && err.message),
          err,
        ));
      };
      req.onblocked = function () {
        reject(makeError(
          "StorageOpenError",
          "IndexedDB-Open blockiert (andere Tabs der App offen?).",
        ));
      };
    });
    return dbPromise;
  }

  function wrapRequest(req, opLabel) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () {
        var err = req.error;
        var name = (err && err.name) || "StorageOpenError";
        if (name === "QuotaExceededError") {
          reject(makeError(
            "QuotaExceededError",
            "Speicher-Quota ueberschritten bei " + opLabel + ".",
            err,
          ));
        } else if (name === "DataCloneError") {
          reject(makeError(
            "DataCloneError",
            "Wert nicht strukturiert klonbar bei " + opLabel + ".",
            err,
          ));
        } else {
          reject(makeError(
            "StorageOpenError",
            opLabel + " scheiterte: " + (err && err.message),
            err,
          ));
        }
      };
    });
  }

  function get(storeName, key) {
    assertKnownStore(storeName);
    return init().then(function (db) {
      var tx = db.transaction(storeName, "readonly");
      var store = tx.objectStore(storeName);
      return wrapRequest(store.get(key), "get(" + storeName + ", " + key + ")");
    });
  }

  function put(storeName, key, value) {
    assertKnownStore(storeName);
    return init().then(function (db) {
      var tx = db.transaction(storeName, "readwrite");
      var store = tx.objectStore(storeName);
      var req;
      try {
        req = store.put(value, key);
      } catch (err) {
        if (err && err.name === "DataCloneError") {
          return Promise.reject(makeError(
            "DataCloneError",
            "Wert nicht strukturiert klonbar bei put(" + storeName + ", " + key + ").",
            err,
          ));
        }
        return Promise.reject(makeError(
          "StorageOpenError",
          "put(" + storeName + ", " + key + ") warf synchron: " + (err && err.message),
          err,
        ));
      }
      return wrapRequest(req, "put(" + storeName + ", " + key + ")").then(function () { /* void */ });
    });
  }

  function del(storeName, key) {
    assertKnownStore(storeName);
    return init().then(function (db) {
      var tx = db.transaction(storeName, "readwrite");
      var store = tx.objectStore(storeName);
      return wrapRequest(store.delete(key), "del(" + storeName + ", " + key + ")").then(function () { /* void */ });
    });
  }

  function all(storeName) {
    assertKnownStore(storeName);
    return init().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, "readonly");
        var store = tx.objectStore(storeName);
        var results = [];
        var cursorReq = store.openCursor();
        cursorReq.onsuccess = function () {
          var cursor = cursorReq.result;
          if (cursor) {
            results.push({ key: cursor.key, value: cursor.value });
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        cursorReq.onerror = function () {
          var err = cursorReq.error;
          reject(makeError(
            "StorageOpenError",
            "all(" + storeName + ") scheiterte: " + (err && err.message),
            err,
          ));
        };
      });
    });
  }

  function clear(storeName) {
    assertKnownStore(storeName);
    return init().then(function (db) {
      var tx = db.transaction(storeName, "readwrite");
      var store = tx.objectStore(storeName);
      return wrapRequest(store.clear(), "clear(" + storeName + ")").then(function () { /* void */ });
    });
  }

  function getStore(storeName) {
    assertKnownStore(storeName);
    return {
      get: function (key) { return get(storeName, key); },
      put: function (key, value) { return put(storeName, key, value); },
      del: function (key) { return del(storeName, key); },
      all: function () { return all(storeName); },
      clear: function () { return clear(storeName); },
    };
  }

  var SbkimStorage = {
    init: init,
    getStore: getStore,
    get: get,
    put: put,
    del: del,
    all: all,
    clear: clear,
    _meta: {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      storePrefix: SBKIM_STORE_PREFIX,
      knownStores: KNOWN_STORES.slice(),
    },
  };

  global.SbkimStorage = SbkimStorage;

  // Self-check: emitted on script load (synchronous, before init()).
  // Format is uniform across all SBKIM modules — see INTERFACES.md.
  if (typeof console !== "undefined" && console.info) {
    console.info("MODUL 01 STORAGE bereit, Funktionen: init/getStore/get/put/del/all/clear");
  }
})(typeof window !== "undefined" ? window : globalThis);
