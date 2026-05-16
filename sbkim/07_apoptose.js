/*
 * SBKIM — Modul 07 — Apoptose
 *
 * Composes Modul 01 (Storage) and Modul 02 (Spore) into the second
 * protocol composition: signed self-death with legacy broadcast, foreign
 * legacy reception, and explicit TTL forgetting of silent siblings.
 * Modul 07 itself never computes a cosine, never embeds, never calls
 * SbkimAnastomose.handshake — it orchestrates around the legacy POST
 * endpoint /sbkim/legacy.
 *
 * Public surface (registered on window.SbkimApoptose):
 *   init() -> Promise<void>
 *   prepareSelfApoptose(reason) -> Promise<{ confirmationToken, expiresAt, recipientCount }>
 *   confirmSelfApoptose(token, reason) -> Promise<{ outcome, recipientsNotified, recipientsFailed }>
 *   receiveLegacy(incomingLegacy) -> Promise<LegacyResponse>          // wirft NIEMALS
 *   listLegacy() -> Promise<Array<{ fromNodeId, reason, receivedAt }>>
 *   forgetExpiredSiblings(maxAgeMs) -> Promise<Array<{ nodeId, lastSeen }>>
 *
 * Inoffiziell (Unterstrich-Präfix, nur für tests/manual_check.html):
 *   _invokeReceiveLegacyDirect(legacyMessage) -> alias auf receiveLegacy
 *   _buildSignedLegacyMessage(reason)         -> Build + Sign ohne Versand
 *   _addPseudoSibling({nodeId, domain, endpoint, pubKey, since})
 *                                              -> In-Memory-Override für die
 *                                                 Geschwister-Liste, ohne
 *                                                 IndexedDB anzufassen.
 *                                                 Per Convention nur Tests.
 *   _clearPseudoSiblings()                     -> Override leeren.
 *   _advanceTokenClock(ms)                     -> Test-Bridge für Token-Ablauf
 *                                                 (Token-expiresAt verschieben),
 *                                                 ohne 61 s Realzeit zu warten.
 *   _canonicalize / _base64urlEncode / _base64urlDecode
 *   _signEnvelope / _verifyEnvelope            -> Krypto-Helfer (Panel)
 *
 * Self-check: emits a console.info line on script load (synchronous,
 * before any call). Die irreversible Natur erscheint erst beim Aufruf
 * von prepareSelfApoptose als console.warn — nicht beim Skript-Laden.
 * See INTERFACES.md §1 Modul 07, §2 Vermächtnis, §3 (legacy: /sbkim/legacy)
 * und docs/components/07_apoptose.md für den verbindlichen Vertrag.
 *
 * Krypto-Pfad (canonicalize, base64url, sign, verify) ist bewusst aus
 * Modul 02 / 05 dupliziert — Single-File-PWA-Stil, keine geteilte
 * Library, kein Eingriff in 02/05. Wer das zusammenführen will, hebt
 * eine Pflege-Sitzung.
 */
(function (global) {
  "use strict";

  // ---- Konstanten (gespiegelt aus INTERFACES.md §0 / §3) ----

  var PROTOCOL_VERSION = "0.1";
  var QUERY_TIMEOUT_MS = 4000;
  var ENDPOINT_LEGACY = "/sbkim/legacy";
  var NONCE_BYTES = 16;
  var APOPTOSE_TOKEN_BYTES = 16;
  var APOPTOSE_TOKEN_TTL_MS = 60 * 1000;       // Modul-lokal, UI-Detail

  var SIBLINGS_STORE = "sbkim_siblings";
  var LOG_STORE = "sbkim_anastomosis_log";
  var INBOX_STORE = "sbkim_legacy_inbox";
  var HETERO_INBOX_STORE = "sbkim_hetero_inbox";
  var SPORE_STORE = "sbkim_spore";
  var KEYS_STORE = "sbkim_keys";
  var IDENTITY_KEY = "main";

  // Sequenz des Self-Apoptose-Cleanup — verbindlich aus Karte 07 §
  // Apoptose-Pfad Schritt 5 und INTERFACES.md §1 Modul 07 § Storage.
  // Identität (Keys) zuletzt: sie ist die letzte Bastion.
  // Bau-Sitzung 06 (2026-05-15) ergänzt sbkim_hetero_inbox additiv
  // zwischen sbkim_legacy_inbox und sbkim_spore (vor der Identitäts-
  // Schicht).
  var CLEANUP_ORDER = [
    SIBLINGS_STORE,
    LOG_STORE,
    INBOX_STORE,
    HETERO_INBOX_STORE,
    SPORE_STORE,
    KEYS_STORE,
  ];

  var LEGACY_REQUIRED_FIELDS = [
    "fromNodeId",
    "nonce",
    "protocolVersion",
    "reason",
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

  // ---- Dependency-Probes ----

  function getSubtle() {
    var c = global.crypto || (typeof crypto !== "undefined" ? crypto : null);
    if (!c || !c.subtle) {
      throw makeError(
        "ApoptoseDependenciesError",
        "WebCrypto (crypto.subtle) ist nicht verfügbar. Modul 07 braucht moderne Browser " +
          "(Chrome ≥ 113, Firefox ≥ 130, Safari ≥ 17). Kein Polyfill.",
      );
    }
    return c.subtle;
  }

  function probeDependencies() {
    var missing = [];
    if (!global.SbkimStorage) missing.push("SbkimStorage (Modul 01)");
    if (!global.SbkimSpore) missing.push("SbkimSpore (Modul 02)");
    if (missing.length > 0) {
      throw makeError(
        "ApoptoseDependenciesError",
        "Fehlende Modul-Abhängigkeiten: " + missing.join(", ") + ". " +
          "Lade 01_storage.js und 02_spore.js vor 07_apoptose.js.",
      );
    }
  }

  function getStorage() { return global.SbkimStorage; }
  function getSpore() { return global.SbkimSpore; }

  // ---- base64url ohne Padding (RFC 4648 §5, dupliziert aus Modul 02/05) ----

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

  // ---- Sign / Verify auf Envelope-Ebene ----

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

  function randomBytesB64(n) {
    var c = global.crypto || (typeof crypto !== "undefined" ? crypto : null);
    if (!c || !c.getRandomValues) {
      throw makeError("ApoptoseDependenciesError", "crypto.getRandomValues fehlt — Modul 07 braucht WebCrypto.");
    }
    var buf = new Uint8Array(n);
    c.getRandomValues(buf);
    return base64urlEncode(buf);
  }

  function majorVersion(v) {
    if (typeof v !== "string") return null;
    var dot = v.indexOf(".");
    return dot === -1 ? v : v.slice(0, dot);
  }

  function nowIso() { return new Date().toISOString(); }
  function nowMs() { return Date.now(); }

  // ---- Modul-Zustand ----

  var ready = false;
  var bridgeRegistered = false;
  var ownPrivateKeyCache = null;
  var pseudoSiblings = null;       // null oder Array<{nodeId,domain,endpoint,pubKey,since}> — Test-Bridge

  // Self-Apoptose-Token lebt im Closure (nicht in IndexedDB) — er soll
  // weder Browser-Refresh noch Cleanup-Reihenfolge überleben.
  var apoptoseToken = null;        // { token, reason, expiresAt:number }

  // ---- init() ----

  async function init() {
    probeDependencies();
    getSubtle();
    await getStorage().init();
    await getSpore().init();
    setupServiceWorkerBridge();
    ready = true;
    // Spec: keine TTL-Sweeps in init(). Kein setInterval, kein
    // Selbst-Sweep. Aufrufer muss forgetExpiredSiblings(maxAgeMs)
    // explizit triggern (Variante c).
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
        "NoIdentityError",
        "Keine Identität in sbkim_keys[\"main\"] — getOrCreateIdentity wurde nicht ausgeführt.",
      );
    }
    var subtle = getSubtle();
    var priv;
    try {
      priv = await subtle.importKey("jwk", stored.privateKey, { name: "Ed25519" }, true, ["sign"]);
    } catch (err) {
      throw makeError(
        "ApoptoseDependenciesError",
        "Privatschlüssel nicht importierbar: " + (err && err.message ? err.message : err),
        err,
      );
    }
    ownPrivateKeyCache = priv;
    return priv;
  }

  // ---- Service-Worker-Brücke (Variante A: Page-Hosted via MessageChannel) ----

  function setupServiceWorkerBridge() {
    if (bridgeRegistered) return;
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    try {
      navigator.serviceWorker.addEventListener("message", async function (event) {
        if (!event || !event.data || event.data.type !== "SBKIM_LEGACY_REQUEST") return;
        if (!event.ports || event.ports.length === 0) return;
        var port = event.ports[0];
        var response;
        try {
          response = await receiveLegacy(event.data.request);
        } catch (err) {
          // receiveLegacy wirft per Spec niemals. Verteidigt sicherheitshalber.
          response = { outcome: "rejected", reason: "Interner Fehler: " + (err && err.message ? err.message : err) };
        }
        try { port.postMessage(response); } catch (e2) { /* port already closed */ }
      });
      bridgeRegistered = true;
    } catch (err) {
      bridgeRegistered = false;
    }
  }

  // ---- Geschwister-Quelle (Storage oder Pseudo-Override für Tests) ----

  async function listSiblingsForBroadcast() {
    if (Array.isArray(pseudoSiblings)) {
      return pseudoSiblings.slice();
    }
    var rows = await getStorage().all(SIBLINGS_STORE);
    return rows.map(function (r) {
      return {
        nodeId: r.value.nodeId,
        domain: r.value.domain,
        endpoint: r.value.endpoint,
        pubKey: r.value.pubKey,
        since: r.value.since,
      };
    });
  }

  // ---- prepareSelfApoptose() ----

  async function prepareSelfApoptose(reason) {
    await ensureReady();
    if (typeof reason !== "string" || reason.length === 0) {
      throw makeError(
        "ApoptoseDependenciesError",
        "reason fehlt oder ist leer — bitte deutschen Klartext angeben, z.B. \"Domain stillgelegt\".",
      );
    }
    // Identität sicherstellen (wirft NoIdentityError, wenn keine da ist).
    await getSpore().getNodeId();

    var token = randomBytesB64(APOPTOSE_TOKEN_BYTES);
    var expiresAt = nowMs() + APOPTOSE_TOKEN_TTL_MS;
    apoptoseToken = { token: token, reason: reason, expiresAt: expiresAt };

    if (typeof console !== "undefined" && console.warn) {
      console.warn("SELF-APOPTOSE VORBEREITET — irreversibel, Token gültig 60s");
    }

    var siblings = await listSiblingsForBroadcast();
    return {
      confirmationToken: token,
      expiresAt: new Date(expiresAt).toISOString(),
      recipientCount: siblings.length,
    };
  }

  // ---- confirmSelfApoptose() — irreversibel ----

  async function confirmSelfApoptose(token, reason) {
    await ensureReady();

    if (!apoptoseToken) {
      throw makeError(
        "InvalidApoptoseTokenError",
        "Kein Apoptose-Token vorbereitet. prepareSelfApoptose(reason) zuerst aufrufen.",
      );
    }
    if (typeof token !== "string" || token !== apoptoseToken.token) {
      throw makeError(
        "InvalidApoptoseTokenError",
        "Apoptose-Token stimmt nicht. Bitte den aus prepareSelfApoptose zurückgegebenen confirmationToken nutzen.",
      );
    }
    if (nowMs() > apoptoseToken.expiresAt) {
      apoptoseToken = null;
      throw makeError(
        "InvalidApoptoseTokenError",
        "Apoptose-Token abgelaufen (60s). prepareSelfApoptose erneut aufrufen.",
      );
    }
    if (typeof reason !== "string" || reason !== apoptoseToken.reason) {
      throw makeError(
        "InvalidApoptoseTokenError",
        "reason weicht vom Token-Aufruf ab — confirmSelfApoptose verlangt identisches reason wie prepareSelfApoptose.",
      );
    }

    // Identität laden (wirft NoIdentityError, wenn schon weg).
    var spore = getSpore();
    var ownSpore;
    try {
      ownSpore = await spore.getOwnSpore();
    } catch (err) {
      // verifyForeignSpore-/getOwnSpore-Pfad sollte hier nicht werfen,
      // aber wir bleiben defensiv: keine Spore → schon ausgeführt.
      apoptoseToken = null;
      throw makeError(
        "ApoptoseAlreadyExecutedError",
        "Self-Apoptose bereits ausgeführt oder Identität fehlt: " + (err && err.message ? err.message : err),
        err,
      );
    }
    if (!ownSpore) {
      apoptoseToken = null;
      throw makeError(
        "ApoptoseAlreadyExecutedError",
        "Eigene Spore nicht vorhanden — Self-Apoptose wurde wahrscheinlich schon ausgeführt.",
      );
    }
    var ownNodeId = await spore.getNodeId();    // wirft NoIdentityError, wenn keys["main"] fehlt
    var privKey = await loadOwnPrivateKey();    // wirft NoIdentityError, wenn keys["main"] fehlt

    // Token wird mit Beginn der irreversiblen Operation verbraucht.
    apoptoseToken = null;

    // 1. LegacyMessage bauen und kanonisch signieren.
    var unsigned = {
      fromNodeId: ownNodeId,
      nonce: randomBytesB64(NONCE_BYTES),
      protocolVersion: PROTOCOL_VERSION,
      reason: reason,
      senderSpore: ownSpore,
      timestamp: nowIso(),
    };
    var sig = await signEnvelope(unsigned, privKey);
    var legacyMessage = canonicalize(Object.assign({}, unsigned, { signature: sig }));

    // 2. Versand parallel via Promise.allSettled.
    var siblings = await listSiblingsForBroadcast();
    var sends = siblings.map(function (sib) { return dispatchLegacyOnce(legacyMessage, sib); });
    var results = await Promise.allSettled(sends);

    var recipientsNotified = [];
    var recipientsFailed = [];
    for (var i = 0; i < results.length; i++) {
      var sib = siblings[i];
      var r = results[i];
      if (r.status === "fulfilled" && r.value && r.value.outcome === "accepted") {
        recipientsNotified.push(sib.nodeId);
      } else {
        var failReason;
        if (r.status === "rejected") {
          failReason = (r.reason && r.reason.message) ? r.reason.message : String(r.reason);
        } else if (r.value && typeof r.value.reason === "string") {
          failReason = r.value.reason;
        } else if (r.value && r.value.outcome) {
          failReason = "outcome=" + r.value.outcome;
        } else {
          failReason = "unbekannt";
        }
        recipientsFailed.push({ nodeId: sib.nodeId, reason: failReason });
      }
    }

    // 3. Lokaler Cleanup, sequenziell. Reihenfolge verbindlich:
    //    siblings → log → inbox → spore → keys → SbkimSpore.resetIdentityCache().
    //    sbkim_doku_meta bleibt unangetastet (Schreiber 00).
    var storage = getStorage();
    for (var k = 0; k < CLEANUP_ORDER.length; k++) {
      await storage.clear(CLEANUP_ORDER[k]);
    }

    // Caches im Modul-Closure invalidieren, sonst würde ein Folge-Aufruf
    // die alte Identität noch sehen.
    ownPrivateKeyCache = null;
    pseudoSiblings = null;

    // Modul 02 hält einen In-Memory-identityCache (Performance-Optimierung).
    // Wer sbkim_keys/sbkim_spore von außen leert, MUSS resetIdentityCache
    // aufrufen — sonst liefert SbkimSpore.getNodeId weiter die alte
    // Identität, und der nächste storage-direkte Lookup (z.B. ein erneuter
    // confirmSelfApoptose nach Re-Setup) findet keinen Key und wirft
    // NoIdentityError trotz "frischer" Identität-Erwartung.
    // Vertrag: INTERFACES.md §1 Modul 02 § Garantien für 05/06/07,
    // Modul 07 § Self-Apoptose-Cleanup-Reihenfolge Schritt 6.
    // Pflege-Sitzung 2026-05-15 (Klaus' Sichttest-Befund Modul 07 Test 6).
    if (typeof getSpore().resetIdentityCache === "function") {
      getSpore().resetIdentityCache();
    }

    return {
      outcome: "completed",
      recipientsNotified: recipientsNotified,
      recipientsFailed: recipientsFailed,
    };
  }

  // Schickt EINE LegacyMessage an EIN Geschwister, verifiziert die Response,
  // gibt {outcome:"accepted"} oder {outcome:"rejected", reason} zurück.
  // Wirft bei Timeout / Netz-Fehler — wird vom Promise.allSettled gefangen.
  async function dispatchLegacyOnce(legacyMessage, sibling) {
    if (!sibling || typeof sibling.endpoint !== "string") {
      return { outcome: "rejected", reason: "Geschwister ohne endpoint" };
    }
    var url = String(sibling.endpoint).replace(/\/$/, "") + ENDPOINT_LEGACY;
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, QUERY_TIMEOUT_MS);
    var response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(legacyMessage),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err && err.name === "AbortError") {
        throw makeError("LegacyTimeoutError", "Vermächtnis-POST > " + QUERY_TIMEOUT_MS + " ms abgebrochen: " + url, err);
      }
      throw makeError("LegacyNetworkError", "Netz-Fehler bei " + url + ": " + (err && err.message ? err.message : err), err);
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { outcome: "rejected", reason: "HTTP " + response.status + " " + response.statusText };
    }
    var json;
    try { json = await response.json(); }
    catch (err) {
      return { outcome: "rejected", reason: "Antwort kein gültiges JSON" };
    }

    if (!json || typeof json !== "object" || typeof json.outcome !== "string") {
      return { outcome: "rejected", reason: "Antwort ohne outcome-Feld" };
    }
    // Empfänger-Spore + Response-Signatur prüfen — analog Modul 05's consumeResponse.
    var spore = getSpore();
    var verifyReceiver = await spore.verifyForeignSpore(json.receiverSpore);
    if (!verifyReceiver.valid) {
      return { outcome: "rejected", reason: "receiverSpore ungültig: " + (verifyReceiver.reason || "?") };
    }
    var sigOk = await verifyEnvelope(json, json.receiverSpore.publicKey);
    if (!sigOk) {
      return { outcome: "rejected", reason: "Response-Signatur ungültig" };
    }
    if (json.outcome === "accepted") return { outcome: "accepted" };
    return { outcome: "rejected", reason: typeof json.reason === "string" ? json.reason : "(kein Grund mitgeschickt)" };
  }

  // ---- receiveLegacy() — wirft NIEMALS ----

  async function receiveLegacy(incomingLegacy) {
    try {
      await ensureReady();

      // 1. Form-Check (Pflichtfelder)
      var missing = checkLegacyFields(incomingLegacy);
      if (missing) {
        return await buildLegacyResponse({ outcome: "rejected", reason: "Form ungültig: " + missing }, incomingLegacy);
      }

      // 2. Sender-Spore verifizieren
      var verifySender = await getSpore().verifyForeignSpore(incomingLegacy.senderSpore);
      if (!verifySender.valid) {
        return await buildLegacyResponse(
          { outcome: "rejected", reason: verifySender.reason || "senderSpore ungültig" },
          incomingLegacy,
        );
      }

      // 3. Hauptversion (zusätzlich expliziter Check, vgl. §4)
      if (majorVersion(incomingLegacy.protocolVersion) !== majorVersion(PROTOCOL_VERSION)) {
        return await buildLegacyResponse(
          { outcome: "rejected", reason: "Inkompatible Hauptversion: " + incomingLegacy.protocolVersion },
          incomingLegacy,
        );
      }

      // 4. LegacyMessage-Signatur gegen senderSpore.publicKey
      var sigOk = await verifyEnvelope(incomingLegacy, incomingLegacy.senderSpore.publicKey);
      if (!sigOk) {
        return await buildLegacyResponse(
          { outcome: "rejected", reason: "Signatur ungültig" },
          incomingLegacy,
        );
      }

      // 5. Inbox-Schreib + Sibling-Löschen — Storage-Fehler werden
      //    eingefangen und als "interner Speicherfehler" gemeldet, NIE
      //    geworfen.
      var storage = getStorage();
      try {
        await storage.put(INBOX_STORE, incomingLegacy.fromNodeId, {
          fromNodeId: incomingLegacy.fromNodeId,
          reason: incomingLegacy.reason,
          signature: incomingLegacy.signature,
          receivedAt: nowIso(),
        });
        // Idempotent: falls fromNodeId gar kein Geschwister war, ist
        // del im Storage-Wrapper trotzdem ohne Fehler.
        await storage.del(SIBLINGS_STORE, incomingLegacy.fromNodeId);
      } catch (storageErr) {
        if (typeof console !== "undefined" && console.error) {
          console.error("MODUL 07 APOPTOSE: Storage-Fehler beim receiveLegacy-Schreib:", storageErr);
        }
        return await buildLegacyResponse(
          { outcome: "rejected", reason: "interner Speicherfehler" },
          incomingLegacy,
        );
      }

      // 6. Signierte accepted-Response
      return await buildLegacyResponse({ outcome: "accepted" }, incomingLegacy);
    } catch (err) {
      // Spec: receiveLegacy wirft niemals. Wenn doch (z.B. Build-Response
      // scheitert weil eigene Spore fehlt), schicken wir eine unsignierte
      // Notbremse — der Sender wird die unsignierte Variante über
      // verifyEnvelope ablehnen, und das ist richtig: bei totalem
      // Empfänger-Ausfall darf nichts „valide" antworten.
      try {
        return await buildLegacyResponse(
          { outcome: "rejected", reason: "Interner Fehler: " + (err && err.message ? err.message : err) },
          incomingLegacy || {},
        );
      } catch (err2) {
        return {
          fromNodeId: "",
          nonceEcho: (incomingLegacy && typeof incomingLegacy.nonce === "string") ? incomingLegacy.nonce : "",
          outcome: "rejected",
          protocolVersion: PROTOCOL_VERSION,
          reason: "Interner Fehler ohne Signatur: " + (err2 && err2.message ? err2.message : err2),
          timestamp: nowIso(),
          toNodeId: (incomingLegacy && typeof incomingLegacy.fromNodeId === "string") ? incomingLegacy.fromNodeId : "",
        };
      }
    }
  }

  function checkLegacyFields(legacy) {
    if (!legacy || typeof legacy !== "object") return "LegacyMessage ist kein Objekt";
    for (var i = 0; i < LEGACY_REQUIRED_FIELDS.length; i++) {
      var f = LEGACY_REQUIRED_FIELDS[i];
      if (legacy[f] === undefined || legacy[f] === null) return "Pflichtfeld fehlt: " + f;
    }
    if (typeof legacy.senderSpore !== "object") return "senderSpore kein Objekt";
    if (typeof legacy.reason !== "string" || legacy.reason.length === 0) return "reason leer";
    return null;
  }

  async function buildLegacyResponse(extra, incomingLegacy) {
    var spore = getSpore();
    var ownSpore = await spore.getOwnSpore();
    if (!ownSpore) {
      throw makeError(
        "ApoptoseDependenciesError",
        "Eigene Spore fehlt — LegacyResponse kann nicht signiert werden.",
      );
    }
    var privKey = await loadOwnPrivateKey();
    var ownNodeId = await spore.getNodeId();

    var unsigned = {
      fromNodeId: ownNodeId,
      nonceEcho: (incomingLegacy && typeof incomingLegacy.nonce === "string") ? incomingLegacy.nonce : "",
      outcome: extra.outcome,
      protocolVersion: PROTOCOL_VERSION,
      receiverSpore: ownSpore,
      timestamp: nowIso(),
      toNodeId: (incomingLegacy && typeof incomingLegacy.fromNodeId === "string") ? incomingLegacy.fromNodeId : "",
    };
    if (extra.reason !== undefined) unsigned.reason = extra.reason;

    var sig = await signEnvelope(unsigned, privKey);
    var signed = Object.assign({}, unsigned, { signature: sig });
    return canonicalize(signed);
  }

  // ---- listLegacy() ----

  async function listLegacy() {
    await ensureReady();
    var rows = await getStorage().all(INBOX_STORE);
    return rows.map(function (r) {
      return {
        fromNodeId: r.value.fromNodeId,
        reason: r.value.reason,
        receivedAt: r.value.receivedAt,
      };
    });
  }

  // ---- forgetExpiredSiblings(maxAgeMs) ----
  //
  // TTL-Sweep, explizit ausgelöst. Modul 07 macht NIE einen Sweep im
  // init() oder über setInterval.

  async function forgetExpiredSiblings(maxAgeMs) {
    if (typeof maxAgeMs !== "number" || !isFinite(maxAgeMs) || maxAgeMs <= 0) {
      throw makeError(
        "InvalidTtlError",
        "forgetExpiredSiblings braucht maxAgeMs > 0 (z.B. SIBLING_MAX_AGE_MS aus §0). Bekommen: " + maxAgeMs,
      );
    }
    await ensureReady();
    var storage = getStorage();
    var siblings = await storage.all(SIBLINGS_STORE);
    if (siblings.length === 0) return [];

    var logRows = await storage.all(LOG_STORE);
    // lastActivity pro peerId: höchstes ts mit outcome ∈ {"established","re-handshake"}.
    var lastActivityByPeer = Object.create(null);
    for (var i = 0; i < logRows.length; i++) {
      var entry = logRows[i] && logRows[i].value;
      if (!entry || typeof entry.peerId !== "string") continue;
      if (entry.outcome !== "established" && entry.outcome !== "re-handshake") continue;
      var ts = typeof entry.ts === "string" ? entry.ts : null;
      if (!ts) continue;
      if (!lastActivityByPeer[entry.peerId] || ts > lastActivityByPeer[entry.peerId]) {
        lastActivityByPeer[entry.peerId] = ts;
      }
    }

    var now = nowMs();
    var removed = [];
    for (var s = 0; s < siblings.length; s++) {
      var v = siblings[s] && siblings[s].value;
      if (!v || typeof v.nodeId !== "string") continue;
      var lastIso = lastActivityByPeer[v.nodeId] || v.since;
      if (typeof lastIso !== "string") continue;
      var lastMs = Date.parse(lastIso);
      if (!isFinite(lastMs)) continue;
      if (now - lastMs > maxAgeMs) {
        await storage.del(SIBLINGS_STORE, v.nodeId);
        removed.push({ nodeId: v.nodeId, lastSeen: lastIso });
      }
    }
    return removed;
  }

  // ---- Test-Brücken (Unterstrich-Präfix, inoffiziell) ----

  // Baut eine signierte LegacyMessage aus der lokalen Identität — wie
  // confirmSelfApoptose es täte, aber OHNE Versand und OHNE Cleanup.
  // Erlaubt dem Panel, Signatur-Manipulationen + Versions-Mismatch zu
  // testen.
  async function _buildSignedLegacyMessage(reason) {
    await ensureReady();
    if (typeof reason !== "string" || reason.length === 0) {
      throw makeError("ApoptoseDependenciesError", "reason fehlt oder ist leer.");
    }
    var spore = getSpore();
    var ownSpore = await spore.getOwnSpore();
    if (!ownSpore) {
      throw makeError("ApoptoseDependenciesError", "Eigene Spore fehlt — generateOwnSpore(meta) zuerst.");
    }
    var ownNodeId = await spore.getNodeId();
    var privKey = await loadOwnPrivateKey();
    var unsigned = {
      fromNodeId: ownNodeId,
      nonce: randomBytesB64(NONCE_BYTES),
      protocolVersion: PROTOCOL_VERSION,
      reason: reason,
      senderSpore: ownSpore,
      timestamp: nowIso(),
    };
    var sig = await signEnvelope(unsigned, privKey);
    return canonicalize(Object.assign({}, unsigned, { signature: sig }));
  }

  function _addPseudoSibling(sib) {
    if (!sib || typeof sib.nodeId !== "string" || typeof sib.endpoint !== "string") {
      throw makeError(
        "ApoptoseDependenciesError",
        "_addPseudoSibling erwartet {nodeId, domain, endpoint, pubKey, since}.",
      );
    }
    if (!Array.isArray(pseudoSiblings)) pseudoSiblings = [];
    pseudoSiblings.push({
      nodeId: sib.nodeId,
      domain: sib.domain || "",
      endpoint: sib.endpoint,
      pubKey: sib.pubKey || null,
      since: sib.since || nowIso(),
    });
  }

  function _clearPseudoSiblings() {
    pseudoSiblings = null;
  }

  // Test-Bridge: verschiebt die Token-Ablaufzeit, damit Panel-Test 7
  // (Token-Ablauf) den 61-Sekunden-Lauf nicht abwarten muss.
  function _advanceTokenClock(ms) {
    if (!apoptoseToken) return false;
    if (typeof ms !== "number" || !isFinite(ms)) {
      throw makeError("ApoptoseDependenciesError", "_advanceTokenClock erwartet eine endliche Zahl.");
    }
    apoptoseToken.expiresAt -= ms;
    return true;
  }

  // ---- public surface ----

  var SbkimApoptose = {
    init: init,
    prepareSelfApoptose: prepareSelfApoptose,
    confirmSelfApoptose: confirmSelfApoptose,
    receiveLegacy: receiveLegacy,
    listLegacy: listLegacy,
    forgetExpiredSiblings: forgetExpiredSiblings,

    // Test-Brücken
    _invokeReceiveLegacyDirect: receiveLegacy,
    _buildSignedLegacyMessage: _buildSignedLegacyMessage,
    _addPseudoSibling: _addPseudoSibling,
    _clearPseudoSiblings: _clearPseudoSiblings,
    _advanceTokenClock: _advanceTokenClock,
    _canonicalize: canonicalize,
    _base64urlEncode: base64urlEncode,
    _base64urlDecode: base64urlDecode,
    _signEnvelope: signEnvelope,
    _verifyEnvelope: verifyEnvelope,

    _meta: {
      protocolVersion: PROTOCOL_VERSION,
      queryTimeoutMs: QUERY_TIMEOUT_MS,
      endpointLegacy: ENDPOINT_LEGACY,
      apoptoseTokenTtlMs: APOPTOSE_TOKEN_TTL_MS,
      inboxStore: INBOX_STORE,
      siblingsStore: SIBLINGS_STORE,
      logStore: LOG_STORE,
      cleanupOrder: CLEANUP_ORDER.slice(),
      legacyRequiredFields: LEGACY_REQUIRED_FIELDS.slice(),
    },
  };

  global.SbkimApoptose = SbkimApoptose;

  // Self-check: synchronous on script load. Format uniform across SBKIM —
  // see INTERFACES.md §1 Modul 07. Die irreversible Natur erscheint erst
  // beim Aufruf von prepareSelfApoptose als console.warn — nicht hier.
  if (typeof console !== "undefined" && console.info) {
    console.info(
      "MODUL 07 APOPTOSE bereit, Funktionen: " +
        "init/prepareSelfApoptose/confirmSelfApoptose/receiveLegacy/listLegacy/forgetExpiredSiblings",
    );
  }
})(typeof window !== "undefined" ? window : globalThis);
