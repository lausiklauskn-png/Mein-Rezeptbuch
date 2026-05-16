/*
 * SBKIM — Modul 05 — Anastomose
 *
 * Composes Modul 01 (Storage), Modul 02 (Spore) and Modul 04 (Match)
 * into a single protocol step: the bidirectional handshake. Modul 05
 * itself never computes a cosine, never verifies a spore signature on
 * its own, never touches IndexedDB directly — it orchestrates.
 *
 * Public surface (registered on window.SbkimAnastomose):
 *   init() -> Promise<void>
 *   handshake(targetSpore, ownDomainVector) -> Promise<HandshakeResult>
 *   receiveHandshake(request) -> Promise<HandshakeResponse>
 *   listSiblings() -> Promise<Array<{nodeId, domain, since, pubKey}>>
 *   forgetSibling(nodeId) -> Promise<void>
 *
 * Inoffiziell (Unterstrich-Präfix, nur für tests/manual_check.html):
 *   _invokeDirect(request)            -> alias auf receiveHandshake
 *   _setOwnDomainVector(vec|null)     -> setzt Empfänger-Vektor-Override
 *                                        (umgeht das domainVector-Feld
 *                                        in der eigenen Spore)
 *   _buildSignedRequest(...)          -> Test-Brücke für In-Memory-Peer
 *   _verifyResponseSignature(...)     -> Test-Brücke für Bidirektion
 *   _canonicalize / _base64urlEncode  -> Krypto-Helfer (Panel)
 *   _base64urlDecode
 *
 * Self-check: emits a console.info line on script load (synchronous,
 * before any call). See INTERFACES.md §1 Modul 05 + §2 „Anfrage (Query)"
 * und docs/components/05_anastomose.md für den verbindlichen Vertrag.
 *
 * Krypto-Pfad (canonicalize, base64url, sign, verify) ist bewusst aus
 * Modul 02 dupliziert — Single-File-PWA-Stil, keine geteilte Library.
 * Wer das stört, hebt es in eine Pflege-Sitzung.
 */
(function (global) {
  "use strict";

  // ---- Konstanten (gespiegelt aus INTERFACES.md §0 / §3) ----

  var PROTOCOL_VERSION = "0.1";
  var QUERY_TIMEOUT_MS = 4000;
  var ENDPOINT_ANASTOMOSIS = "/sbkim/anastomosis";
  var EMBEDDING_DIM = 384;
  var NONCE_BYTES = 16;

  var SIBLINGS_STORE = "sbkim_siblings";
  var LOG_STORE = "sbkim_anastomosis_log";
  var KEYS_STORE = "sbkim_keys";
  var IDENTITY_KEY = "main";

  var REQUEST_REQUIRED_FIELDS = [
    "fromNodeId",
    "nonce",
    "protocolVersion",
    "senderSpore",
    "signature",
    "timestamp",
  ];

  // ---- Fehler-Erzeugung ----

  function makeError(name, message, cause) {
    var e = new Error(message);
    e.name = name;
    if (cause !== undefined) e.cause = cause;
    return e;
  }

  // ---- Dependency-Probes (init wirft, wenn ein Stück fehlt) ----

  function getSubtle() {
    var c = global.crypto || (typeof crypto !== "undefined" ? crypto : null);
    if (!c || !c.subtle) {
      throw makeError(
        "AnastomoseDependenciesError",
        "WebCrypto (crypto.subtle) ist nicht verfügbar. Modul 05 braucht moderne Browser " +
          "(Chrome ≥ 113, Firefox ≥ 130, Safari ≥ 17). Kein Polyfill.",
      );
    }
    return c.subtle;
  }

  function probeDependencies() {
    var missing = [];
    if (!global.SbkimStorage) missing.push("SbkimStorage (Modul 01)");
    if (!global.SbkimSpore) missing.push("SbkimSpore (Modul 02)");
    if (!global.SbkimMatch) missing.push("SbkimMatch (Modul 04)");
    if (missing.length > 0) {
      throw makeError(
        "AnastomoseDependenciesError",
        "Fehlende Modul-Abhängigkeiten: " + missing.join(", ") + ". " +
          "Lade 01_storage.js, 02_spore.js und 04_match.js vor 05_anastomose.js.",
      );
    }
  }

  function getStorage() { return global.SbkimStorage; }
  function getSpore() { return global.SbkimSpore; }
  function getMatch() { return global.SbkimMatch; }

  // ---- base64url ohne Padding (RFC 4648 §5, dupliziert aus Modul 02) ----

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

  // Recursive lexicographic key sort. Returns a new object, never mutates.
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

  function canonicalJsonBytesWithoutSignature(envelopeLike) {
    var unsigned = {};
    var keys = Object.keys(envelopeLike);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === "signature") continue;
      unsigned[keys[i]] = envelopeLike[keys[i]];
    }
    return utf8Encode(JSON.stringify(canonicalize(unsigned)));
  }

  // ---- Sign / Verify auf Envelope-Ebene (Request UND Response) ----

  async function signEnvelope(unsigned, privateKey) {
    var bytes = utf8Encode(JSON.stringify(canonicalize(unsigned)));
    var sigBuf = await getSubtle().sign({ name: "Ed25519" }, privateKey, bytes);
    return base64urlEncode(sigBuf);
  }

  async function verifyEnvelope(envelope, publicKeyJwk) {
    if (!envelope || typeof envelope.signature !== "string") return false;
    var subtle = getSubtle();
    var pub;
    try {
      pub = await subtle.importKey("jwk", publicKeyJwk, { name: "Ed25519" }, true, ["verify"]);
    } catch (err) {
      return false;
    }
    var sigBytes;
    try {
      sigBytes = base64urlDecode(envelope.signature);
    } catch (err) {
      return false;
    }
    var bytes = canonicalJsonBytesWithoutSignature(envelope);
    try {
      return await subtle.verify({ name: "Ed25519" }, pub, sigBytes, bytes);
    } catch (err) {
      return false;
    }
  }

  // ---- Helfer ----

  function randomNonceB64() {
    var c = global.crypto || (typeof crypto !== "undefined" ? crypto : null);
    if (!c || !c.getRandomValues) {
      throw makeError("AnastomoseDependenciesError", "crypto.getRandomValues fehlt — Modul 05 braucht WebCrypto.");
    }
    var buf = new Uint8Array(NONCE_BYTES);
    c.getRandomValues(buf);
    return base64urlEncode(buf);
  }

  function majorVersion(v) {
    if (typeof v !== "string") return null;
    var dot = v.indexOf(".");
    return dot === -1 ? v : v.slice(0, dot);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  // ---- Modul-Zustand ----

  var ready = false;
  var ownPrivateKeyCache = null;       // CryptoKey, re-importiert aus sbkim_keys["main"].privateKey (JWK)
  var ownDomainVectorOverride = null;  // Float32Array, nur Tests
  var bridgeRegistered = false;

  // Re-entry-friendly log key: ein Counter pro Millisekunde, damit
  // zwei schnell nacheinander geschriebene Log-Zeilen einander nicht
  // überschreiben (passiert sonst bei Re-Handshake in derselben ms).
  var lastLogTs = "";
  var logSubCounter = 0;

  function nextLogKey() {
    var ts = nowIso();
    var key;
    if (ts === lastLogTs) {
      logSubCounter += 1;
      key = ts + "+" + logSubCounter;
    } else {
      lastLogTs = ts;
      logSubCounter = 0;
      key = ts;
    }
    return { key: key, ts: ts };
  }

  // ---- init() ----

  async function init() {
    probeDependencies();
    getSubtle();
    await getStorage().init();
    await getSpore().init();
    // Identität sicherstellen — sonst kann Modul 05 später nicht signieren.
    // Modul 02 ist beim ersten Aufruf lazy.
    await getSpore().getOrCreateIdentity();
    setupServiceWorkerBridge();
    ready = true;
  }

  async function ensureReady() {
    if (!ready) await init();
  }

  async function loadOwnPrivateKey() {
    if (ownPrivateKeyCache) return ownPrivateKeyCache;
    var storage = getStorage();
    var stored = await storage.get(KEYS_STORE, IDENTITY_KEY);
    if (!stored || !stored.privateKey) {
      throw makeError(
        "AnastomoseDependenciesError",
        "Keine Identität in sbkim_keys[\"main\"] — getOrCreateIdentity wurde nicht ausgeführt.",
      );
    }
    var subtle = getSubtle();
    var priv;
    try {
      priv = await subtle.importKey("jwk", stored.privateKey, { name: "Ed25519" }, true, ["sign"]);
    } catch (err) {
      throw makeError(
        "AnastomoseDependenciesError",
        "Privatschlüssel nicht importierbar: " + (err && err.message ? err.message : err),
        err,
      );
    }
    ownPrivateKeyCache = priv;
    return priv;
  }

  async function loadOwnDomainVector() {
    if (ownDomainVectorOverride) return ownDomainVectorOverride;
    var ownSpore = await getSpore().getOwnSpore();
    if (!ownSpore || !Array.isArray(ownSpore.domainVector)) return null;
    if (ownSpore.domainVector.length !== EMBEDDING_DIM) return null;
    return new Float32Array(ownSpore.domainVector);
  }

  // ---- Service-Worker-Brücke (Variante A: Page-Hosted via MessageChannel) ----
  //
  // Wenn ein Service-Worker einen POST /sbkim/anastomosis abfängt
  // (siehe src/sbkim-sw.js), schickt er ihn via postMessage an die
  // Page. Hier registriert sich Modul 05 als Empfänger. Im Test ohne
  // SW (file://, headless) tut der Listener nichts — die Test-Brücke
  // _invokeDirect ruft receiveHandshake direkt auf.

  function setupServiceWorkerBridge() {
    if (bridgeRegistered) return;
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    try {
      navigator.serviceWorker.addEventListener("message", async function (event) {
        if (!event || !event.data || event.data.type !== "SBKIM_ANASTOMOSIS_REQUEST") return;
        if (!event.ports || event.ports.length === 0) return;
        var port = event.ports[0];
        var response;
        try {
          response = await receiveHandshake(event.data.request);
        } catch (err) {
          // receiveHandshake wirft per Spec niemals. Verteidigt sicherheitshalber.
          response = { outcome: "rejected", reason: "Interner Fehler: " + (err && err.message ? err.message : err) };
        }
        try { port.postMessage(response); } catch (e2) { /* port already closed */ }
      });
      bridgeRegistered = true;
    } catch (err) {
      // Im headless-Test ggf. nicht verfügbar — kein Throw, kein Log-Spam.
      bridgeRegistered = false;
    }
  }

  // ---- Storage-Helfer ----

  async function upsertSibling(entry) {
    var storage = getStorage();
    var existing = await storage.get(SIBLINGS_STORE, entry.nodeId);
    if (existing) {
      // Reentry-Idempotenz: since bleibt eingefroren, kein Überschreiben.
      return true;
    }
    await storage.put(SIBLINGS_STORE, entry.nodeId, {
      nodeId: entry.nodeId,
      domain: entry.domain,
      endpoint: entry.endpoint,
      pubKey: entry.pubKey,
      since: entry.since,
    });
    return false;
  }

  async function logEntry(peerId, outcome) {
    var storage = getStorage();
    var k = nextLogKey();
    await storage.put(LOG_STORE, k.key, {
      ts: k.ts,
      peerId: peerId,
      outcome: outcome,
    });
  }

  // ---- handshake() ----

  async function handshake(targetSpore, ownDomainVector) {
    await ensureReady();
    var spore = getSpore();
    var match = getMatch();

    if (!(ownDomainVector instanceof Float32Array) || ownDomainVector.length !== EMBEDDING_DIM) {
      throw makeError(
        "AnastomoseDependenciesError",
        "ownDomainVector muss Float32Array(" + EMBEDDING_DIM + ") sein — Aufruf von handshake.",
      );
    }

    // 1. Spore-Verify (Signatur, id-Konsistenz, Hauptversion in 02 mit drin)
    var verifyTarget = await spore.verifyForeignSpore(targetSpore);
    if (!verifyTarget.valid) {
      throw makeError(
        "InvalidPeerSporeError",
        "Empfänger-Spore ungültig: " + verifyTarget.reason,
        verifyTarget.reason,
      );
    }

    // 2. Hauptversion (zusätzlicher expliziter Check, vgl. §4)
    if (majorVersion(targetSpore.protocolVersion) !== majorVersion(PROTOCOL_VERSION)) {
      throw makeError(
        "ProtocolVersionMismatchError",
        "Inkompatible Hauptversion: target=" + targetSpore.protocolVersion +
          ", lokal=" + PROTOCOL_VERSION + ".",
      );
    }

    // 3. Lokaler Vor-Check (nur wenn targetSpore.domainVector da ist)
    var preScore = null;
    if (Array.isArray(targetSpore.domainVector) && targetSpore.domainVector.length === EMBEDDING_DIM) {
      var peerVec = new Float32Array(targetSpore.domainVector);
      preScore = match.match(ownDomainVector, peerVec);
      if (!match.isAboveProviderThreshold(preScore)) {
        await logEntry(targetSpore.id, "abgelehnt: lokal");
        return { outcome: "rejected-local", score: preScore };
      }
    }

    // 4. eigene Spore + privateKey laden
    var ownSpore = await spore.getOwnSpore();
    if (!ownSpore) {
      throw makeError(
        "AnastomoseDependenciesError",
        "Eigene Spore noch nicht erzeugt — SbkimSpore.generateOwnSpore(meta) zuerst.",
      );
    }
    var privKey = await loadOwnPrivateKey();
    var ownNodeId = await spore.getNodeId();

    // 5. HandshakeRequest bauen
    var unsigned = {
      domainVector: Array.from(ownDomainVector),
      fromNodeId: ownNodeId,
      nonce: randomNonceB64(),
      protocolVersion: PROTOCOL_VERSION,
      senderSpore: ownSpore,
      timestamp: nowIso(),
      toNodeId: targetSpore.id,
    };
    var sig = await signEnvelope(unsigned, privKey);
    var signedUnsorted = {};
    var unsignedKeys = Object.keys(unsigned);
    for (var i = 0; i < unsignedKeys.length; i++) signedUnsorted[unsignedKeys[i]] = unsigned[unsignedKeys[i]];
    signedUnsorted.signature = sig;
    var request = canonicalize(signedUnsorted);

    // 6. POST mit Abort-Timeout
    var url = String(targetSpore.endpoint).replace(/\/$/, "") + ENDPOINT_ANASTOMOSIS;
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, QUERY_TIMEOUT_MS);
    var response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err && err.name === "AbortError") {
        await logEntry(targetSpore.id, "timeout");
        throw makeError(
          "HandshakeTimeoutError",
          "Anfrage an " + url + " > " + QUERY_TIMEOUT_MS + " ms abgebrochen.",
          err,
        );
      }
      throw makeError(
        "HandshakeNetworkError",
        "Netz-Fehler bei " + url + ": " + (err && err.message ? err.message : err),
        err,
      );
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw makeError(
        "HandshakeNetworkError",
        "HTTP " + response.status + " " + response.statusText + " bei " + url + ".",
      );
    }

    var responseJson;
    try {
      responseJson = await response.json();
    } catch (err) {
      throw makeError(
        "HandshakeNetworkError",
        "Antwort kein gültiges JSON: " + (err && err.message ? err.message : err),
        err,
      );
    }
    return await consumeResponse(targetSpore, responseJson, preScore);
  }

  async function consumeResponse(targetSpore, responseJson, preScore) {
    var spore = getSpore();
    if (!responseJson || typeof responseJson !== "object") {
      throw makeError("HandshakeNetworkError", "Antwort ist kein Objekt.");
    }
    if (typeof responseJson.outcome !== "string") {
      throw makeError("HandshakeNetworkError", "Antwort ohne outcome-Feld.");
    }

    // receiverSpore prüfen
    var verifyReceiver = await spore.verifyForeignSpore(responseJson.receiverSpore);
    if (!verifyReceiver.valid) {
      await logEntry(targetSpore.id, "abgelehnt: invalid-peer");
      throw makeError(
        "InvalidPeerSporeError",
        "receiverSpore ungültig: " + verifyReceiver.reason,
        verifyReceiver.reason,
      );
    }

    // Response-Signatur prüfen
    var sigOk = await verifyEnvelope(responseJson, responseJson.receiverSpore.publicKey);
    if (!sigOk) {
      await logEntry(targetSpore.id, "abgelehnt: invalid-peer");
      throw makeError(
        "HandshakeSignatureInvalidError",
        "Response-Signatur gegen receiverSpore.publicKey ungültig.",
      );
    }

    if (responseJson.outcome === "established") {
      await upsertSibling({
        nodeId: responseJson.receiverSpore.id,
        domain: responseJson.receiverSpore.domain,
        endpoint: responseJson.receiverSpore.endpoint,
        pubKey: responseJson.receiverSpore.publicKey,
        since: nowIso(),
      });
      await logEntry(responseJson.receiverSpore.id, "established");
      return {
        outcome: "established",
        peerNodeId: responseJson.receiverSpore.id,
        peerDomain: responseJson.receiverSpore.domain,
        score: typeof responseJson.score === "number" ? responseJson.score : preScore,
      };
    }

    // outcome:"rejected" oder anderer Wert — als rejected behandeln
    await logEntry(targetSpore.id, "abgelehnt: peer");
    var result = {
      outcome: "rejected",
      reason: typeof responseJson.reason === "string" ? responseJson.reason : "(kein Grund mitgeschickt)",
    };
    if (typeof responseJson.score === "number") result.score = responseJson.score;
    return result;
  }

  // ---- receiveHandshake() ---- (wirft NIEMALS)

  async function receiveHandshake(request) {
    try {
      await ensureReady();
      var spore = getSpore();
      var match = getMatch();

      // 1. Form-Check
      var missing = checkRequestFields(request);
      if (missing) {
        return await buildResponse({ outcome: "rejected", reason: "Form ungültig: " + missing }, request);
      }

      // 2. Sender-Spore
      var verifySender = await spore.verifyForeignSpore(request.senderSpore);
      if (!verifySender.valid) {
        return await buildResponse({ outcome: "rejected", reason: verifySender.reason || "senderSpore ungültig" }, request);
      }

      // 3. Hauptversion (Spec macht diesen Schritt zusätzlich explizit)
      if (majorVersion(request.protocolVersion) !== majorVersion(PROTOCOL_VERSION)) {
        return await buildResponse({
          outcome: "rejected",
          reason: "Inkompatible Hauptversion: " + request.protocolVersion,
        }, request);
      }

      // 4. Request-Signatur
      var sigOk = await verifyEnvelope(request, request.senderSpore.publicKey);
      if (!sigOk) {
        return await buildResponse({ outcome: "rejected", reason: "Request-Signatur ungültig" }, request);
      }

      // 5. toNodeId (optional)
      var myNodeId = await spore.getNodeId();
      if (typeof request.toNodeId === "string" && request.toNodeId.length > 0) {
        if (request.toNodeId !== myNodeId) {
          return await buildResponse({ outcome: "rejected", reason: "toNodeId stimmt nicht zum Empfänger" }, request);
        }
      }

      // 6. domainVector (request oder senderSpore)
      var peerVec = pickPeerDomainVector(request);
      if (!peerVec) {
        return await buildResponse({ outcome: "rejected", reason: "kein domainVector verfügbar" }, request);
      }
      var ownVec = await loadOwnDomainVector();
      if (!ownVec) {
        return await buildResponse({ outcome: "rejected", reason: "kein domainVector verfügbar (lokal)" }, request);
      }

      // 7. Match
      var score = match.match(ownVec, peerVec);
      if (!match.isAboveProviderThreshold(score)) {
        await logEntry(request.senderSpore.id, "abgelehnt: score");
        return await buildResponse({ outcome: "rejected", reason: "score unterhalb Schwelle", score: score }, request);
      }

      // 8. sibling speichern (Reentry idempotent)
      var reentered = await upsertSibling({
        nodeId: request.senderSpore.id,
        domain: request.senderSpore.domain,
        endpoint: request.senderSpore.endpoint,
        pubKey: request.senderSpore.publicKey,
        since: nowIso(),
      });
      await logEntry(request.senderSpore.id, reentered ? "re-handshake" : "established");

      // 9. Antwort signieren
      return await buildResponse({ outcome: "established", score: score }, request);
    } catch (err) {
      // Spec: receiveHandshake wirft niemals. Wenn doch (z.B. Storage-Crash),
      // versuchen wir eine signierte Rejection zu bauen — wenn auch das
      // scheitert, schicken wir eine unsignierte Notbremse. Der Sender wird
      // die unsignierte Variante über verifyEnvelope ablehnen — das ist
      // korrekt: bei totalem Empfänger-Ausfall darf nichts „valide"
      // antworten.
      try {
        return await buildResponse({
          outcome: "rejected",
          reason: "Interner Fehler: " + (err && err.message ? err.message : err),
        }, request || {});
      } catch (err2) {
        return {
          fromNodeId: "",
          nonceEcho: (request && typeof request.nonce === "string") ? request.nonce : "",
          outcome: "rejected",
          protocolVersion: PROTOCOL_VERSION,
          reason: "Interner Fehler ohne Signatur: " + (err2 && err2.message ? err2.message : err2),
          timestamp: nowIso(),
          toNodeId: (request && typeof request.fromNodeId === "string") ? request.fromNodeId : "",
        };
      }
    }
  }

  function checkRequestFields(req) {
    if (!req || typeof req !== "object") return "Request ist kein Objekt";
    for (var i = 0; i < REQUEST_REQUIRED_FIELDS.length; i++) {
      var f = REQUEST_REQUIRED_FIELDS[i];
      if (req[f] === undefined || req[f] === null) return "Pflichtfeld fehlt: " + f;
    }
    if (typeof req.senderSpore !== "object") return "senderSpore kein Objekt";
    return null;
  }

  function pickPeerDomainVector(request) {
    if (Array.isArray(request.domainVector) && request.domainVector.length === EMBEDDING_DIM) {
      return new Float32Array(request.domainVector);
    }
    if (request.senderSpore && Array.isArray(request.senderSpore.domainVector) &&
        request.senderSpore.domainVector.length === EMBEDDING_DIM) {
      return new Float32Array(request.senderSpore.domainVector);
    }
    return null;
  }

  async function buildResponse(extra, request) {
    var spore = getSpore();
    var ownSpore = await spore.getOwnSpore();
    if (!ownSpore) {
      throw makeError(
        "AnastomoseDependenciesError",
        "Eigene Spore fehlt — Antwort kann nicht signiert werden.",
      );
    }
    var privKey = await loadOwnPrivateKey();
    var ownNodeId = await spore.getNodeId();

    var unsigned = {
      fromNodeId: ownNodeId,
      nonceEcho: (request && typeof request.nonce === "string") ? request.nonce : "",
      outcome: extra.outcome,
      protocolVersion: PROTOCOL_VERSION,
      receiverSpore: ownSpore,
      timestamp: nowIso(),
      toNodeId: (request && typeof request.fromNodeId === "string") ? request.fromNodeId : "",
    };
    if (extra.reason !== undefined) unsigned.reason = extra.reason;
    if (extra.score !== undefined) unsigned.score = extra.score;

    var sig = await signEnvelope(unsigned, privKey);
    var signed = {};
    var keys = Object.keys(unsigned);
    for (var i = 0; i < keys.length; i++) signed[keys[i]] = unsigned[keys[i]];
    signed.signature = sig;
    return canonicalize(signed);
  }

  // ---- listSiblings / forgetSibling ----

  async function listSiblings() {
    await ensureReady();
    var rows = await getStorage().all(SIBLINGS_STORE);
    return rows.map(function (r) {
      return {
        nodeId: r.value.nodeId,
        domain: r.value.domain,
        since: r.value.since,
        pubKey: r.value.pubKey,
      };
    });
  }

  async function forgetSibling(nodeId) {
    await ensureReady();
    var storage = getStorage();
    var existing = await storage.get(SIBLINGS_STORE, nodeId);
    if (existing === undefined) return; // idempotent
    await storage.del(SIBLINGS_STORE, nodeId);
  }

  // ---- Test-Brücken (Unterstrich-Präfix, inoffiziell) ----

  // Baut einen signierten HandshakeRequest mit einem extern beigesteuerten
  // CryptoKey + Spore. Erlaubt dem Panel, einen In-Memory-Pseudo-Knoten als
  // Sender zu simulieren, ohne in Modul 02's Singleton einzugreifen.
  async function _buildSignedRequest(senderPrivateKey, senderSpore, senderDomainVector, toNodeId) {
    if (!senderPrivateKey || typeof senderPrivateKey !== "object") {
      throw makeError("AnastomoseDependenciesError", "senderPrivateKey (CryptoKey) fehlt.");
    }
    if (!senderSpore || typeof senderSpore !== "object" || typeof senderSpore.id !== "string") {
      throw makeError("AnastomoseDependenciesError", "senderSpore (mit id) fehlt.");
    }
    var unsigned = {
      domainVector: senderDomainVector instanceof Float32Array
        ? Array.from(senderDomainVector)
        : Array.isArray(senderDomainVector) ? senderDomainVector.slice() : undefined,
      fromNodeId: senderSpore.id,
      nonce: randomNonceB64(),
      protocolVersion: PROTOCOL_VERSION,
      senderSpore: senderSpore,
      timestamp: nowIso(),
      toNodeId: typeof toNodeId === "string" ? toNodeId : undefined,
    };
    // undefined-Keys entfernen (canonicalize würde sie sonst als undefined drinlassen
    // — JSON.stringify entfernt sie zwar, aber sauberer ist's explizit)
    if (unsigned.domainVector === undefined) delete unsigned.domainVector;
    if (unsigned.toNodeId === undefined) delete unsigned.toNodeId;

    var sig = await signEnvelope(unsigned, senderPrivateKey);
    var signed = {};
    var ks = Object.keys(unsigned);
    for (var i = 0; i < ks.length; i++) signed[ks[i]] = unsigned[ks[i]];
    signed.signature = sig;
    return canonicalize(signed);
  }

  async function _verifyResponseSignature(response, receiverPublicKeyJwk) {
    return await verifyEnvelope(response, receiverPublicKeyJwk);
  }

  function _setOwnDomainVector(vec) {
    if (vec === null || vec === undefined) {
      ownDomainVectorOverride = null;
      return;
    }
    if (!(vec instanceof Float32Array) || vec.length !== EMBEDDING_DIM) {
      throw makeError(
        "AnastomoseDependenciesError",
        "_setOwnDomainVector erwartet Float32Array(" + EMBEDDING_DIM + ").",
      );
    }
    ownDomainVectorOverride = vec;
  }

  // ---- public surface ----

  var SbkimAnastomose = {
    init: init,
    handshake: handshake,
    receiveHandshake: receiveHandshake,
    listSiblings: listSiblings,
    forgetSibling: forgetSibling,

    // Test-Brücken
    _invokeDirect: receiveHandshake,
    _buildSignedRequest: _buildSignedRequest,
    _verifyResponseSignature: _verifyResponseSignature,
    _setOwnDomainVector: _setOwnDomainVector,
    _canonicalize: canonicalize,
    _base64urlEncode: base64urlEncode,
    _base64urlDecode: base64urlDecode,
    _signEnvelope: signEnvelope,
    _verifyEnvelope: verifyEnvelope,

    _meta: {
      protocolVersion: PROTOCOL_VERSION,
      queryTimeoutMs: QUERY_TIMEOUT_MS,
      endpointAnastomosis: ENDPOINT_ANASTOMOSIS,
      embeddingDim: EMBEDDING_DIM,
      siblingsStore: SIBLINGS_STORE,
      logStore: LOG_STORE,
      requestRequiredFields: REQUEST_REQUIRED_FIELDS.slice(),
    },
  };

  global.SbkimAnastomose = SbkimAnastomose;

  // Self-check: synchronous on script load. Format uniform across SBKIM —
  // see INTERFACES.md §1 Modul 05.
  if (typeof console !== "undefined" && console.info) {
    console.info(
      "MODUL 05 ANASTOMOSE bereit, Funktionen: " +
        "init/handshake/receiveHandshake/listSiblings/forgetSibling",
    );
  }
})(typeof window !== "undefined" ? window : globalThis);
