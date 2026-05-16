/*
 * SBKIM — Modul 02 — Spore
 *
 * Singleton Ed25519 identity per PWA. Generates / persists the keypair
 * via window.SbkimStorage (key "main" in sbkim_keys), derives the
 * node_id as base64url(sha256(rawPublicKey)) without padding, builds
 * and signs the spore JSON, verifies foreign spores. No multi-identity,
 * no polyfill, no direct IndexedDB access.
 *
 * Public surface (registered on window.SbkimSpore):
 *   init() -> Promise<void>
 *   getOrCreateIdentity() -> Promise<{ nodeId, publicKeyJwk }>
 *   getNodeId() -> Promise<string>
 *   getPublicKeyJwk() -> Promise<JsonWebKey>
 *   generateOwnSpore(meta) -> Promise<SporeJson>
 *   getOwnSpore() -> Promise<SporeJson | null>
 *   verifyForeignSpore(spore) -> Promise<{ valid, reason? }>
 *
 * Self-check: emits a console.info line on script load (synchronous,
 * before any call). Key generation is lazy and happens on the first
 * getOrCreateIdentity() call. See INTERFACES.md and
 * docs/components/02_spore.md for the binding spec.
 */
(function (global) {
  "use strict";

  var PROTOCOL_VERSION = "0.1";
  var EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
  var IDENTITY_KEY = "main";
  var KEYS_STORE = "sbkim_keys";
  var SPORE_STORE = "sbkim_spore";
  var VALID_NODE_TYPES = ["provider", "seeker", "hybrid"];
  var REQUIRED_SPORE_FIELDS = [
    "createdAt",
    "domain",
    "embeddingModel",
    "endpoint",
    "id",
    "nodeType",
    "protocolVersion",
    "publicKey",
    "signature",
  ];

  function makeError(name, message, cause) {
    var e = new Error(message);
    e.name = name;
    if (cause !== undefined) e.cause = cause;
    return e;
  }

  function getSubtle() {
    var c = global.crypto || (typeof crypto !== "undefined" ? crypto : null);
    if (!c || !c.subtle) {
      throw makeError(
        "CryptoUnavailableError",
        "WebCrypto (crypto.subtle) ist nicht verfügbar. Modul 02 braucht moderne Browser " +
          "(Chrome ≥ 113, Firefox ≥ 130, Safari ≥ 17). Kein Polyfill.",
      );
    }
    return c.subtle;
  }

  function getStorage() {
    if (!global.SbkimStorage) {
      throw makeError(
        "StorageUnavailableError",
        "window.SbkimStorage nicht geladen. Modul 02 persistiert ausschließlich über Modul 01 — " +
          "lade src/modules/01_storage.js vor 02_spore.js.",
      );
    }
    return global.SbkimStorage;
  }

  // base64url ohne Padding (RFC 4648 §5).
  function base64urlEncode(bytes) {
    var bin = "";
    var view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (var i = 0; i < view.length; i++) bin += String.fromCharCode(view[i]);
    var b64 = (global.btoa || btoa)(bin);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64urlDecode(str) {
    var pad = str.length % 4 === 0 ? "" : "====".slice(str.length % 4);
    var b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
    var bin = (global.atob || atob)(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function utf8Encode(str) {
    return new TextEncoder().encode(str);
  }

  // Recursive lexicographic key sort. Returns a new object so the
  // caller's input is never mutated.
  function canonicalize(value) {
    if (value === null) return null;
    if (Array.isArray(value)) return value.map(canonicalize);
    if (typeof value === "object") {
      var keys = Object.keys(value).sort();
      var out = {};
      for (var i = 0; i < keys.length; i++) out[keys[i]] = canonicalize(value[keys[i]]);
      return out;
    }
    return value;
  }

  function canonicalJsonBytes(obj) {
    return utf8Encode(JSON.stringify(canonicalize(obj)));
  }

  // node_id = base64url(sha256(rawPublicKey)) without padding.
  // The same derivation is what foreign nodes use to verify
  // spore.id against spore.publicKey — see verifyForeignSpore.
  async function deriveNodeIdFromPublicKey(publicKey) {
    var subtle = getSubtle();
    var raw = await subtle.exportKey("raw", publicKey);
    var hash = await subtle.digest("SHA-256", raw);
    return base64urlEncode(hash);
  }

  async function deriveNodeIdFromJwk(publicJwk) {
    var subtle = getSubtle();
    var pub = await subtle.importKey(
      "jwk",
      publicJwk,
      { name: "Ed25519" },
      true,
      ["verify"],
    );
    return await deriveNodeIdFromPublicKey(pub);
  }

  // ---- module state (lazy) ----

  var ready = false;
  var identityCache = null; // { nodeId, publicKeyJwk, privateKey, publicKey }

  async function init() {
    // Probe WebCrypto and storage but do not generate keys.
    getSubtle();
    var storage = getStorage();
    await storage.init();
    ready = true;
  }

  async function ensureReady() {
    if (!ready) await init();
  }

  async function loadIdentity() {
    if (identityCache) return identityCache;
    await ensureReady();
    var storage = getStorage();
    var subtle = getSubtle();
    var stored = await storage.get(KEYS_STORE, IDENTITY_KEY);
    if (!stored) return null;

    // Re-import the persisted JWKs so the actual sign/verify keys are
    // CryptoKey instances again. JWK survives structured clone, the
    // bound CryptoKey itself does not.
    var privateKey = await subtle.importKey(
      "jwk",
      stored.privateKey,
      { name: "Ed25519" },
      true,
      ["sign"],
    );
    var publicKey = await subtle.importKey(
      "jwk",
      stored.publicKey,
      { name: "Ed25519" },
      true,
      ["verify"],
    );
    var nodeId = await deriveNodeIdFromPublicKey(publicKey);
    identityCache = {
      nodeId: nodeId,
      publicKeyJwk: stored.publicKey,
      privateKey: privateKey,
      publicKey: publicKey,
    };
    return identityCache;
  }

  async function getOrCreateIdentity() {
    var existing = await loadIdentity();
    if (existing) {
      return { nodeId: existing.nodeId, publicKeyJwk: existing.publicKeyJwk };
    }

    var subtle = getSubtle();
    var keyPair;
    try {
      keyPair = await subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    } catch (err) {
      throw makeError(
        "CryptoUnavailableError",
        "Ed25519-Schlüsselerzeugung fehlgeschlagen: " + (err && err.message ? err.message : err) +
          ". Modul 02 braucht moderne WebCrypto-Unterstützung. Kein Polyfill.",
        err,
      );
    }

    var privateKeyJwk = await subtle.exportKey("jwk", keyPair.privateKey);
    var publicKeyJwk = await subtle.exportKey("jwk", keyPair.publicKey);
    var nodeId = await deriveNodeIdFromPublicKey(keyPair.publicKey);

    var storage = getStorage();
    await storage.put(KEYS_STORE, IDENTITY_KEY, {
      keyId: nodeId,
      privateKey: privateKeyJwk,
      publicKey: publicKeyJwk,
    });

    identityCache = {
      nodeId: nodeId,
      publicKeyJwk: publicKeyJwk,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
    };
    return { nodeId: nodeId, publicKeyJwk: publicKeyJwk };
  }

  async function getNodeId() {
    var id = await loadIdentity();
    if (!id) {
      throw makeError(
        "NoIdentityError",
        "Es existiert noch keine Identität. Erst getOrCreateIdentity() aufrufen.",
      );
    }
    return id.nodeId;
  }

  async function getPublicKeyJwk() {
    var id = await loadIdentity();
    if (!id) {
      throw makeError(
        "NoIdentityError",
        "Es existiert noch keine Identität. Erst getOrCreateIdentity() aufrufen.",
      );
    }
    return id.publicKeyJwk;
  }

  function validateSporeMeta(meta) {
    var missing = [];
    if (!meta || typeof meta !== "object") {
      throw makeError("InvalidSporeMetaError", "meta-Objekt fehlt oder ist kein Objekt.");
    }
    if (typeof meta.domain !== "string" || meta.domain.length === 0) missing.push("domain");
    if (typeof meta.endpoint !== "string" || meta.endpoint.length === 0) missing.push("endpoint");
    if (typeof meta.nodeType !== "string") missing.push("nodeType");
    if (missing.length > 0) {
      throw makeError(
        "InvalidSporeMetaError",
        "Pflichtfelder fehlen oder leer: " + missing.join(", ") + ".",
      );
    }
    if (VALID_NODE_TYPES.indexOf(meta.nodeType) === -1) {
      throw makeError(
        "InvalidSporeMetaError",
        "nodeType '" + meta.nodeType + "' ungültig. Erlaubt: " + VALID_NODE_TYPES.join(", ") + ".",
      );
    }
  }

  async function generateOwnSpore(meta) {
    validateSporeMeta(meta);
    var identity = await loadIdentity();
    if (!identity) {
      identity = await loadIdentityAfterCreate();
    }

    var unsigned = {
      createdAt: new Date().toISOString(),
      domain: meta.domain,
      embeddingModel: typeof meta.embeddingModel === "string" ? meta.embeddingModel : EMBEDDING_MODEL,
      endpoint: meta.endpoint,
      id: identity.nodeId,
      nodeType: meta.nodeType,
      protocolVersion: typeof meta.protocolVersion === "string" ? meta.protocolVersion : PROTOCOL_VERSION,
      publicKey: identity.publicKeyJwk,
    };
    if (typeof meta.nodeName === "string") unsigned.nodeName = meta.nodeName;
    if (typeof meta.domainDescription === "string") unsigned.domainDescription = meta.domainDescription;
    if (Array.isArray(meta.domainKeywords)) unsigned.domainKeywords = meta.domainKeywords.slice();
    if (Array.isArray(meta.domainVector)) unsigned.domainVector = meta.domainVector.slice();
    if (Array.isArray(meta.stammCategories)) unsigned.stammCategories = meta.stammCategories.slice();
    if (Array.isArray(meta.guestCategories)) unsigned.guestCategories = meta.guestCategories.slice();
    if (meta.endpointPaths && typeof meta.endpointPaths === "object") {
      unsigned.endpointPaths = meta.endpointPaths;
    }

    var subtle = getSubtle();
    var bytes = canonicalJsonBytes(unsigned);
    var sigBuf = await subtle.sign({ name: "Ed25519" }, identity.privateKey, bytes);
    var signature = base64urlEncode(sigBuf);

    var spore = canonicalize(unsigned);
    spore.signature = signature;
    spore = canonicalize(spore);

    var storage = getStorage();
    await storage.put(SPORE_STORE, IDENTITY_KEY, {
      nodeId: identity.nodeId,
      sporeJson: spore,
      signature: signature,
    });
    return spore;
  }

  // Helper used by generateOwnSpore: ensures an identity exists,
  // returns the cache entry. Avoids two storage round-trips when the
  // caller did not run getOrCreateIdentity first.
  async function loadIdentityAfterCreate() {
    await getOrCreateIdentity();
    return await loadIdentity();
  }

  async function getOwnSpore() {
    await ensureReady();
    var storage = getStorage();
    var stored = await storage.get(SPORE_STORE, IDENTITY_KEY);
    if (!stored) return null;
    return stored.sporeJson || null;
  }

  function checkRequiredFields(spore) {
    for (var i = 0; i < REQUIRED_SPORE_FIELDS.length; i++) {
      var f = REQUIRED_SPORE_FIELDS[i];
      if (spore[f] === undefined || spore[f] === null) return f;
    }
    return null;
  }

  function majorVersion(v) {
    if (typeof v !== "string") return null;
    var dot = v.indexOf(".");
    return dot === -1 ? v : v.slice(0, dot);
  }

  async function verifyForeignSpore(spore) {
    try {
      if (!spore || typeof spore !== "object") {
        return { valid: false, reason: "Spore ist kein Objekt." };
      }
      var missing = checkRequiredFields(spore);
      if (missing) return { valid: false, reason: "Pflichtfeld fehlt: " + missing };

      var ourMajor = majorVersion(PROTOCOL_VERSION);
      var theirMajor = majorVersion(spore.protocolVersion);
      if (ourMajor !== theirMajor) {
        return {
          valid: false,
          reason: "Inkompatible Hauptversion: " + spore.protocolVersion + " (wir: " + PROTOCOL_VERSION + ")",
        };
      }

      if (VALID_NODE_TYPES.indexOf(spore.nodeType) === -1) {
        return { valid: false, reason: "nodeType ungültig: " + spore.nodeType };
      }

      var derivedId;
      try {
        derivedId = await deriveNodeIdFromJwk(spore.publicKey);
      } catch (err) {
        return { valid: false, reason: "publicKey nicht importierbar: " + (err && err.message ? err.message : err) };
      }
      if (derivedId !== spore.id) {
        return { valid: false, reason: "nodeId stimmt nicht zum Public Key" };
      }

      var subtle = getSubtle();
      var pub = await subtle.importKey("jwk", spore.publicKey, { name: "Ed25519" }, true, ["verify"]);

      var unsigned = {};
      var keys = Object.keys(spore);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i] === "signature") continue;
        unsigned[keys[i]] = spore[keys[i]];
      }
      var bytes = canonicalJsonBytes(unsigned);

      var sigBytes;
      try {
        sigBytes = base64urlDecode(spore.signature);
      } catch (err) {
        return { valid: false, reason: "Signatur nicht dekodierbar (kein base64url)" };
      }

      var ok = await subtle.verify({ name: "Ed25519" }, pub, sigBytes, bytes);
      if (!ok) return { valid: false, reason: "Signatur ungültig" };
      return { valid: true };
    } catch (err) {
      return { valid: false, reason: "Verifikationsfehler: " + (err && err.message ? err.message : err) };
    }
  }

  // Sync, idempotent. Leert den In-Memory-identityCache, ohne den
  // Storage anzufassen. Pflicht-Aufruf für Module, die sbkim_keys/
  // sbkim_spore von außen leeren (z.B. Modul 07 confirmSelfApoptose).
  // Ohne diesen Aufruf liefert getNodeId/getPublicKeyJwk weiter die
  // alte Identität aus dem Cache, trotz leerem Storage.
  // Pflege-Sitzung 2026-05-15 (Klaus' Sichttest-Befund Modul 07
  // Test 6: getNodeId_wirft_NoIdentityError war false trotz
  // stores_alle_leer:true).
  function resetIdentityCache() {
    identityCache = null;
  }

  var SbkimSpore = {
    init: init,
    getOrCreateIdentity: getOrCreateIdentity,
    getNodeId: getNodeId,
    getPublicKeyJwk: getPublicKeyJwk,
    generateOwnSpore: generateOwnSpore,
    getOwnSpore: getOwnSpore,
    verifyForeignSpore: verifyForeignSpore,
    resetIdentityCache: resetIdentityCache,
    _meta: {
      protocolVersion: PROTOCOL_VERSION,
      identityKey: IDENTITY_KEY,
      keysStore: KEYS_STORE,
      sporeStore: SPORE_STORE,
      requiredSporeFields: REQUIRED_SPORE_FIELDS.slice(),
    },
  };

  global.SbkimSpore = SbkimSpore;

  // Self-check: emitted on script load (synchronous, no async load step).
  // Format is uniform across all SBKIM modules — see INTERFACES.md.
  if (typeof console !== "undefined" && console.info) {
    console.info(
      "MODUL 02 SPORE bereit, Funktionen: " +
        "init/getOrCreateIdentity/getNodeId/getPublicKeyJwk/generateOwnSpore/getOwnSpore/verifyForeignSpore/resetIdentityCache",
    );
  }
})(typeof window !== "undefined" ? window : globalThis);
