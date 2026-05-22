/*
 * SBKIM — Modul 04 — Match
 *
 * Skalarprodukt zweier L2-normalisierter Float32Array(384). Bei korrekt
 * normalisierten Eingaben aus Modul 03 ist das identisch zur Cosinus-
 * Aehnlichkeit. Reine Funktion, kein async, kein Zustand.
 *
 * Public surface (registered on window.SbkimMatch):
 *   match(queryVec, passageVec) -> number
 *   isAboveProviderThreshold(score) -> boolean
 *   matchDimensions(queryCap, queryNeeds, passageCap, passageNeeds) -> MatchDimensionsResult
 *   explainMatchLLM(matchResult, apiKey, options?) -> Promise<ExplainResult>
 *   PROVIDER_MIN_MATCH -> number   (0.80, gespiegelt aus INTERFACES.md §0)
 *   SCHICHT_MIN_MATCH -> number    (0.60, Bau 04.A, gespiegelt aus INTERFACES.md §0)
 *   DimensionsAllNullError -> ErrorFactory
 *   InvalidApiKeyError -> ErrorFactory       (Bau 04.B sync throw)
 *   InvalidMatchResultError -> ErrorFactory  (Bau 04.B sync throw)
 *
 * Self-check: emits a console.info line on script load (synchronous,
 * before any call). Modul 04 has no async load step. See INTERFACES.md
 * and docs/components/04_match.md for the binding spec.
 *
 * Bau 04.A `matchDimensions` synchron (2026-05-19): drei orthogonale
 * Schichten (fachlich / prozess / skalierung) gemäß Brief 03 / M04-
 * Erweiterung. In Stufe A sind die drei Schichten eine Heuristik über
 * demselben Embedding-Raum: alle drei ergeben denselben Lane-Cosinus
 * (siehe Karte 04 § Drei-Schichten-Modell „Aufteilung in drei
 * Schichten"). Die echte semantische Differenzierung passiert in
 * Stufe B via `explainMatchLLM` — eigene Folge-Sitzung Bau 04.B.
 * `BridgeProposal` (Brief 03 § Brücken-Feld-Spec) wird NUR von
 * Stufe B befüllt; Bau 04.A liefert `bruecke: null`.
 *
 * Bau 04.B `explainMatchLLM` (2026-05-20): Stufe-B-LLM-Pass gegen
 * Anthropic-API (`https://api.anthropic.com/v1/messages`, hartcodiert),
 * JSON-only-Output, strikte Schema-Validierung, fail-soft.
 * `apiKey` als opaque String vom Aufrufer (Identitäts-Container ist
 * Vision-Anker 5, NICHT Bestandteil dieser Bau-Sitzung). Zwei sync
 * Throws (InvalidApiKeyError + InvalidMatchResultError) als Aufrufer-
 * Validierung; danach alle Fehler-Pfade resolved mit
 * `ExplainResult{available:false, reason:"<deutsch>", fallbackScore:
 * matchResult.overall}` — Aufrufer fällt auf Stufe-A-Resultat zurück.
 * `candidateScope:"netz"` wird still auf `"lokal"` korrigiert
 * (Anti-Missbrauch-Klausel § 8; entfällt erst mit Anker 10/11/12).
 * Spec-Quelle Brief 03 (PR #98) + Karte 04 § Stufe-B-Vertrag.
 */
(function (global) {
  "use strict";

  var EMBEDDING_DIM = 384;
  var PROVIDER_MIN_MATCH = 0.80;
  // Bau 04.A (2026-05-19): pro-Dimension-Schwelle aus § 0 (Brief 03).
  // Eine Schicht unter SCHICHT_MIN_MATCH ist erlaubt (typischer
  // Brücken-Anlass); 2+ Schichten unter SCHICHT_MIN_MATCH triggern
  // Apoptose im Aufrufer (siehe Karte 04 § Schwellen-Vertrag).
  var SCHICHT_MIN_MATCH = 0.60;
  // Bau 04.A: Read-Anker für Tests + Doku-Kommentar im _meta-Block.
  var MATCH_DIMENSIONS_LANES = ["fachlich", "prozess", "skalierung"];

  function makeError(name, message, cause) {
    var e = new Error(message);
    e.name = name;
    if (cause !== undefined) e.cause = cause;
    return e;
  }

  // Bau 04.A: Factory für den synchronen Wurf, wenn alle vier
  // Vektoren null sind. Aufrufer hätte vor dem Aufruf prüfen müssen
  // (siehe Karte 04 § Fehlerverhalten).
  function DimensionsAllNullError(message) {
    return makeError("DimensionsAllNullError", message);
  }

  // Bau 04.B: sync Throws aus explainMatchLLM-Vor-Check.
  function InvalidApiKeyError(message) {
    return makeError("InvalidApiKeyError", message);
  }
  function InvalidMatchResultError(message) {
    return makeError("InvalidMatchResultError", message);
  }

  // Bau 04.B: modul-lokale Konstanten gespiegelt aus § 0 + Karte 04
  // § Stufe-B-Vertrag. Anthropic-API ist hartcodiert (kein Aufrufer-
  // Override; Endpoint-Wechsel wäre eigene Spec-Sitzung).
  var STUFE_B_DEFAULT_MODEL = "claude-sonnet-4";
  var STUFE_B_MAX_TOKENS = 1024;
  var ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
  var ANTHROPIC_API_VERSION = "2023-06-01";
  // Defensiv: Begrenzt LLM-Text-Output vor JSON-Parse (Memory-Schutz
  // bei API-Bugs / pathologischen Outputs).
  var LLM_MAX_OUTPUT_CHARS = 4096;
  var ALLOWED_CANDIDATE_SCOPES = ["lokal", "mailbox", "netz"];
  var ALLOWED_OVERRIDE_RECOMMENDATIONS = ["established", "established-with-bridge", "rejected"];
  var MAX_BEGRUENDUNG_LEN = 200;
  var MAX_ERKLAERUNG_LEN = 600;

  function describe(vec) {
    if (vec === null) return "null";
    if (vec === undefined) return "undefined";
    var ctor = vec && vec.constructor && vec.constructor.name;
    return ctor || typeof vec;
  }

  function assertVector(vec, paramName) {
    if (!(vec instanceof Float32Array)) {
      throw makeError(
        "InvalidVectorError",
        "Parameter '" + paramName + "' muss Float32Array sein, war: " + describe(vec) + ". " +
          "Modul 04 erwartet Vektoren von Modul 03 (Float32Array, Laenge " + EMBEDDING_DIM + ", L2-normalisiert).",
      );
    }
    if (vec.length !== EMBEDDING_DIM) {
      throw makeError(
        "ShapeMismatchError",
        "Parameter '" + paramName + "' hat Laenge " + vec.length + ", erwartet " + EMBEDDING_DIM + ". " +
          "Wahrscheinliche Ursache: Vektor aus anderer Modell-Version. Siehe INTERFACES.md §0 EMBEDDING_DIM.",
      );
    }
  }

  function match(queryVec, passageVec) {
    assertVector(queryVec, "queryVec");
    assertVector(passageVec, "passageVec");
    // Length equality is implied by both being EMBEDDING_DIM. We still
    // guard explicitly in case the constant ever drifts between modules.
    if (queryVec.length !== passageVec.length) {
      throw makeError(
        "ShapeMismatchError",
        "Vektor-Laengen unterscheiden sich: queryVec=" + queryVec.length + ", passageVec=" + passageVec.length + ".",
      );
    }
    var sum = 0;
    for (var i = 0; i < queryVec.length; i++) {
      sum += queryVec[i] * passageVec[i];
    }
    return sum;
  }

  function isAboveProviderThreshold(score) {
    return score >= PROVIDER_MIN_MATCH;
  }

  // Bau 04.A: null-safe wrapper um match(). Returns null, wenn eine
  // Seite null ist; sonst delegiert an match() mit voller Validierung
  // (InvalidVectorError / ShapeMismatchError werden hochgereicht).
  function cosineSafe(a, b) {
    if (a === null || b === null) return null;
    return match(a, b);
  }

  // Bau 04.A: matchDimensions — drei orthogonale Schichten + overall.
  // Berechnung gemäß Karte 04 § Drei-Schichten-Modell:
  //
  //   Lane 1 (queryCap × passageNeeds): A bietet → B sucht.
  //     Berechenbar wenn queryCap != null UND passageNeeds != null.
  //   Lane 2 (queryNeeds × passageCap): A sucht ← B bietet.
  //     Berechenbar wenn queryNeeds != null UND passageCap != null.
  //
  //   availableLanes = Anzahl berechenbarer Lanes ∈ {0, 1, 2}.
  //   Schicht-Score:
  //     beide Lanes berechenbar → Mittelwert der zwei Lane-Cosinus
  //     genau eine Lane → Single-Lane-Wert
  //     keine Lane → null
  //   In Stufe A sind alle drei Schichten (fachlich/prozess/
  //   skalierung) identisch dem Schicht-Score (Heuristik — die echte
  //   Differenzierung kommt in Stufe B / Bau 04.B via explainMatchLLM).
  //   overall = Mittelwert der nicht-null Schichten; in Stufe A also
  //   gleich dem Schicht-Score, weil alle drei identisch sind.
  //
  // Vor-Checks:
  //   alle vier null → DimensionsAllNullError SYNCHRON.
  //   eine Seite vollständig null (queryCap UND queryNeeds null ODER
  //     passageCap UND passageNeeds null) → Nur-Anbieter-Modus:
  //     alle Schichten null, availableLanes:0, kein Throw.
  function matchDimensions(queryCap, queryNeeds, passageCap, passageNeeds) {
    var qCapNull = queryCap === null;
    var qNeedsNull = queryNeeds === null;
    var pCapNull = passageCap === null;
    var pNeedsNull = passageNeeds === null;

    if (qCapNull && qNeedsNull && pCapNull && pNeedsNull) {
      throw DimensionsAllNullError(
        "matchDimensions: alle vier Vektoren null. Aufrufer haette vor dem Aufruf pruefen muessen " +
          "(siehe Karte 04 § Fehlerverhalten + § Drei-Schichten-Modell § Nur-Anbieter-Modus).",
      );
    }

    var qFullNull = qCapNull && qNeedsNull;
    var pFullNull = pCapNull && pNeedsNull;
    if (qFullNull || pFullNull) {
      // Nur-Anbieter-Modus: eine Seite hat gar keine Vektoren.
      // Aufrufer faellt auf match(domainVectorA, domainVectorB) zurueck.
      return {
        fachlich: null,
        prozess: null,
        skalierung: null,
        overall: null,
        availableLanes: 0,
        bruecke: null,
      };
    }

    // Lane-Berechnung. cosineSafe gibt null zurueck, wenn eine Seite null.
    var lane1 = cosineSafe(queryCap, passageNeeds);   // A bietet → B sucht
    var lane2 = cosineSafe(queryNeeds, passageCap);   // A sucht ← B bietet

    var lanes = [];
    if (lane1 !== null) lanes.push(lane1);
    if (lane2 !== null) lanes.push(lane2);
    var availableLanes = lanes.length;

    var schichtScore;
    if (availableLanes === 0) {
      schichtScore = null;
    } else if (availableLanes === 1) {
      schichtScore = lanes[0];
    } else {
      schichtScore = (lanes[0] + lanes[1]) / 2;
    }

    // Stufe-A-Heuristik: alle drei Schichten ergeben denselben
    // Lane-Cosinus (Karte 04 § Drei-Schichten-Modell § „Aufteilung in
    // drei Schichten"). Stufe B (Bau 04.B) liefert die echte
    // Differenzierung via LLM.
    var fachlich = schichtScore;
    var prozess = schichtScore;
    var skalierung = schichtScore;

    // overall = Mittelwert der nicht-null Schichten. Da in Stufe A alle
    // drei Schichten identisch sind, ist overall gleich dem
    // Schicht-Score (oder null, wenn keine Lane berechenbar war).
    var overall = schichtScore;

    return {
      fachlich: fachlich,
      prozess: prozess,
      skalierung: skalierung,
      overall: overall,
      availableLanes: availableLanes,
      bruecke: null,  // Stufe B (Bau 04.B) befüllt das via explainMatchLLM
    };
  }

  // ---- Bau 04.B: explainMatchLLM-Helper ----

  // Sync-Validierung des matchResult (MatchDimensionsResult-Form aus
  // Bau 04.A). Wirft InvalidMatchResultError mit konkreten Hinweis,
  // welches Feld fehlt/falsch ist. Aufrufer-Pflicht: matchResult aus
  // SbkimMatch.matchDimensions(...) ohne Veränderung durchreichen.
  function isNumberOrNull(v) {
    return v === null || (typeof v === "number" && isFinite(v));
  }
  function validateMatchResultShape(matchResult) {
    if (!matchResult || typeof matchResult !== "object" || Array.isArray(matchResult)) {
      throw InvalidMatchResultError(
        "matchResult muss ein Objekt sein (MatchDimensionsResult aus matchDimensions).",
      );
    }
    if (typeof matchResult.availableLanes !== "number" ||
        ![0, 1, 2].includes(matchResult.availableLanes)) {
      throw InvalidMatchResultError(
        "matchResult.availableLanes muss eine Zahl ∈ {0, 1, 2} sein.",
      );
    }
    var laneFields = ["fachlich", "prozess", "skalierung", "overall"];
    for (var i = 0; i < laneFields.length; i++) {
      var f = laneFields[i];
      if (!isNumberOrNull(matchResult[f])) {
        throw InvalidMatchResultError(
          "matchResult." + f + " muss Number oder null sein.",
        );
      }
    }
    // bruecke darf null sein oder ein BridgeProposal-Objekt
    // (Bau 04.A liefert immer null; Bau 04.B's eigener Output ist
    // kein matchResult-Input, sondern ExplainResult — daher hier
    // strikt: bruecke aus matchResult darf nur null sein).
    if (matchResult.bruecke !== null && (typeof matchResult.bruecke !== "object" || Array.isArray(matchResult.bruecke))) {
      throw InvalidMatchResultError(
        "matchResult.bruecke muss null oder ein BridgeProposal-Objekt sein.",
      );
    }
  }

  // Baut die User-Message für die Anthropic-API. Deutscher Prompt mit
  // den vier Schicht-Werten + overall, plus die strikten Anweisungen.
  // Schema-Block aus Karte 04 § Stufe-B-Vertrag wörtlich.
  function buildLlmPrompt(matchResult) {
    function fmt(v) { return v === null ? "null" : v.toFixed(4); }
    var lines = [];
    lines.push("Du bist Stufe B im SBKIM-Protokoll und sollst ein bidirektionales Match zwischen zwei Knoten erklären.");
    lines.push("");
    lines.push("Stufe-A-Resultat:");
    lines.push("- fachlich:   " + fmt(matchResult.fachlich));
    lines.push("- prozess:    " + fmt(matchResult.prozess));
    lines.push("- skalierung: " + fmt(matchResult.skalierung));
    lines.push("- overall:    " + fmt(matchResult.overall));
    lines.push("- availableLanes: " + matchResult.availableLanes);
    lines.push("");
    lines.push("Aufgabe: Differenziere die drei Schichten (fachlich/prozess/skalierung) inhaltlich. Stufe A");
    lines.push("liefert in jeder Schicht denselben Cosinus, weil Stufe A nur über demselben Embedding-Raum");
    lines.push("arbeitet. Du kannst die Schichten semantisch trennen.");
    lines.push("");
    lines.push("Wenn die Schichten zu unterschiedlich sind (z.B. fachlich hoch, prozess niedrig), schlage");
    lines.push("eine Brücke vor: was muss eine Persona zusätzlich bieten oder suchen, damit der Match passt?");
    lines.push("");
    lines.push("Antworte AUSSCHLIESSLICH mit JSON nach folgendem Schema. Kein Prosa-Text drumherum:");
    lines.push("{");
    lines.push("  \"schichten\": {");
    lines.push("    \"fachlich\":   { \"score\": <number in [-1,1]>, \"begruendung\": <string, max " + MAX_BEGRUENDUNG_LEN + " Zeichen> },");
    lines.push("    \"prozess\":    { \"score\": <number in [-1,1]>, \"begruendung\": <string, max " + MAX_BEGRUENDUNG_LEN + " Zeichen> },");
    lines.push("    \"skalierung\": { \"score\": <number in [-1,1]>, \"begruendung\": <string, max " + MAX_BEGRUENDUNG_LEN + " Zeichen> }");
    lines.push("  },");
    lines.push("  \"bruecke\": null | { \"needed\": <string>, \"lookingFor\": <string|null>, \"candidateScope\": \"lokal\"|\"mailbox\"|\"netz\" },");
    lines.push("  \"erklaerung\": <string, max " + MAX_ERKLAERUNG_LEN + " Zeichen>,");
    lines.push("  \"overrideRecommendation\": null | \"established\" | \"established-with-bridge\" | \"rejected\"");
    lines.push("}");
    return lines.join("\n");
  }

  // Sync-Validierung der LLM-Antwort gegen das Karte-04-Schema. Bei
  // Erfolg gibt {result: ExplainResult, reason: null} zurück; bei
  // Mismatch {result: null, reason: "konkreter Hinweis"}.
  // Korrigiert candidateScope:"netz" STILL auf "lokal" (Anti-
  // Missbrauch § 8; KEIN Throw, KEIN Logging — bewusst defensiv).
  function validateLlmResponseSchema(parsedJson, matchResult) {
    if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
      return { result: null, reason: "Antwort ist kein Objekt" };
    }
    var sch = parsedJson.schichten;
    if (!sch || typeof sch !== "object" || Array.isArray(sch)) {
      return { result: null, reason: "Feld 'schichten' fehlt oder ist kein Objekt" };
    }
    var lanes = ["fachlich", "prozess", "skalierung"];
    var normalizedSchichten = {};
    for (var i = 0; i < lanes.length; i++) {
      var lane = lanes[i];
      var laneObj = sch[lane];
      if (!laneObj || typeof laneObj !== "object" || Array.isArray(laneObj)) {
        return { result: null, reason: "schichten." + lane + " fehlt oder ist kein Objekt" };
      }
      var score = laneObj.score;
      if (typeof score !== "number" || !isFinite(score) || score < -1 || score > 1) {
        return { result: null, reason: "schichten." + lane + ".score nicht im Bereich [-1, 1]" };
      }
      var begruendung = laneObj.begruendung;
      if (typeof begruendung !== "string") {
        return { result: null, reason: "schichten." + lane + ".begruendung ist kein String" };
      }
      if (begruendung.length > MAX_BEGRUENDUNG_LEN) {
        return { result: null, reason: "schichten." + lane + ".begruendung > " + MAX_BEGRUENDUNG_LEN + " Zeichen" };
      }
      normalizedSchichten[lane] = { score: score, begruendung: begruendung };
    }

    // bruecke
    var bruecke = null;
    if (parsedJson.bruecke !== null && parsedJson.bruecke !== undefined) {
      var b = parsedJson.bruecke;
      if (typeof b !== "object" || Array.isArray(b)) {
        return { result: null, reason: "bruecke ist kein Objekt oder null" };
      }
      if (typeof b.needed !== "string" || b.needed.length === 0) {
        return { result: null, reason: "bruecke.needed muss nicht-leerer String sein" };
      }
      var lookingFor = b.lookingFor;
      if (lookingFor !== null && lookingFor !== undefined && typeof lookingFor !== "string") {
        return { result: null, reason: "bruecke.lookingFor muss null oder String sein" };
      }
      var candidateScope = b.candidateScope;
      if (typeof candidateScope !== "string" || ALLOWED_CANDIDATE_SCOPES.indexOf(candidateScope) === -1) {
        return { result: null, reason: "bruecke.candidateScope muss 'lokal'|'mailbox'|'netz' sein" };
      }
      // Anti-Missbrauch-Klausel § 8: 'netz' wird still auf 'lokal'
      // korrigiert. Entfällt erst mit Anker 10/11/12.
      if (candidateScope === "netz") {
        candidateScope = "lokal";
      }
      bruecke = {
        needed: b.needed,
        lookingFor: lookingFor === undefined ? null : lookingFor,
        candidateScope: candidateScope,
      };
    }

    // erklaerung
    if (typeof parsedJson.erklaerung !== "string") {
      return { result: null, reason: "erklaerung ist kein String" };
    }
    if (parsedJson.erklaerung.length > MAX_ERKLAERUNG_LEN) {
      return { result: null, reason: "erklaerung > " + MAX_ERKLAERUNG_LEN + " Zeichen" };
    }

    // overrideRecommendation
    var override = parsedJson.overrideRecommendation;
    if (override !== null && override !== undefined) {
      if (typeof override !== "string" || ALLOWED_OVERRIDE_RECOMMENDATIONS.indexOf(override) === -1) {
        return { result: null, reason: "overrideRecommendation muss null oder 'established'|'established-with-bridge'|'rejected' sein" };
      }
    } else {
      override = null;
    }

    return {
      result: {
        schichten: normalizedSchichten,
        bruecke: bruecke,
        erklaerung: parsedJson.erklaerung,
        overrideRecommendation: override,
      },
      reason: null,
    };
  }

  // Bau 04.B: explainMatchLLM — Stufe-B-LLM-Pass gegen Anthropic-API.
  // Fail-soft: nur zwei sync Throws (InvalidApiKeyError +
  // InvalidMatchResultError). Alle anderen Fehlerpfade resolved mit
  // ExplainResult{available:false, reason, fallbackScore}.
  async function explainMatchLLM(matchResult, apiKey, options) {
    // 1. Sync-Vor-Checks. KEIN Promise-Aufbau, vor Netz-Aufruf.
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw InvalidApiKeyError(
        "apiKey muss ein nicht-leerer String sein (Anthropic API-Key, opaque).",
      );
    }
    validateMatchResultShape(matchResult);

    // 2. Options-Defaults.
    var opts = options || {};
    var model = (typeof opts.model === "string" && opts.model.length > 0)
      ? opts.model
      : STUFE_B_DEFAULT_MODEL;
    var maxTokens = (typeof opts.maxTokens === "number" && opts.maxTokens > 0)
      ? opts.maxTokens
      : STUFE_B_MAX_TOKENS;
    var abortSignal = opts.abortSignal || null;

    var fallbackScore = matchResult.overall;

    function failSoft(reason) {
      return {
        available: false,
        reason: reason,
        fallbackScore: fallbackScore,
        model: model,
        tokensUsed: null,
      };
    }

    // 3. Prompt bauen.
    var prompt = buildLlmPrompt(matchResult);

    // 4. fetch() an Anthropic-API. AbortError NICHT abfangen, alle
    //    anderen Fehler fail-soft.
    var fetchOptions = {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    };
    if (abortSignal) fetchOptions.signal = abortSignal;

    var response;
    try {
      response = await fetch(ANTHROPIC_API_URL, fetchOptions);
    } catch (err) {
      // AbortError durchreichen (Standard-DOM-Verhalten).
      if (err && err.name === "AbortError") throw err;
      return failSoft("Netz nicht erreichbar (" + (err && err.message ? err.message : String(err)) + ")");
    }

    // 5. HTTP-Status. 429 sonder-getaggt für Rate-Limit-Hinweis.
    if (!response.ok) {
      if (response.status === 429) {
        return failSoft("API HTTP 429 (Rate-Limit) — Aufrufer-Drossel-Pflicht");
      }
      return failSoft("API HTTP " + response.status + " (" + (response.statusText || "?") + ")");
    }

    // 6. Body JSON parsen.
    var body;
    try {
      body = await response.json();
    } catch (err) {
      return failSoft("Antwort war kein valides JSON");
    }

    // 7. Anthropic-API-Form prüfen.
    if (!body || typeof body !== "object" ||
        !Array.isArray(body.content) || body.content.length === 0 ||
        typeof body.content[0].text !== "string") {
      return failSoft("Antwort entsprach nicht der Anthropic-API-Form");
    }

    // 8. LLM-Text auf LLM_MAX_OUTPUT_CHARS kürzen (Memory-Schutz).
    var llmText = body.content[0].text;
    if (llmText.length > LLM_MAX_OUTPUT_CHARS) {
      llmText = llmText.slice(0, LLM_MAX_OUTPUT_CHARS);
    }

    // 9. LLM-JSON parsen.
    var llmJson;
    try {
      llmJson = JSON.parse(llmText);
    } catch (err) {
      return failSoft("LLM-Output war kein valides JSON");
    }

    // 10. Schema-Validierung + Normalisierung (inkl. netz→lokal-Korrektur).
    var schemaCheck = validateLlmResponseSchema(llmJson, matchResult);
    if (schemaCheck.result === null) {
      return failSoft("Antwort entsprach nicht dem Schema: " + schemaCheck.reason);
    }

    // 11. tokensUsed aus response.usage.input_tokens + output_tokens.
    //     Fail-soft: null wenn API es nicht liefert.
    var tokensUsed = null;
    if (body.usage && typeof body.usage === "object") {
      var inT = body.usage.input_tokens;
      var outT = body.usage.output_tokens;
      if (typeof inT === "number" && typeof outT === "number" && isFinite(inT) && isFinite(outT)) {
        tokensUsed = inT + outT;
      }
    }

    // 12. Erfolg.
    return {
      available: true,
      schichten: schemaCheck.result.schichten,
      bruecke: schemaCheck.result.bruecke,
      erklaerung: schemaCheck.result.erklaerung,
      overrideRecommendation: schemaCheck.result.overrideRecommendation,
      fallbackScore: fallbackScore,
      model: model,
      tokensUsed: tokensUsed,
    };
  }

  var SbkimMatch = {
    match: match,
    isAboveProviderThreshold: isAboveProviderThreshold,
    matchDimensions: matchDimensions,
    explainMatchLLM: explainMatchLLM,
    PROVIDER_MIN_MATCH: PROVIDER_MIN_MATCH,
    SCHICHT_MIN_MATCH: SCHICHT_MIN_MATCH,
    DimensionsAllNullError: DimensionsAllNullError,
    InvalidApiKeyError: InvalidApiKeyError,
    InvalidMatchResultError: InvalidMatchResultError,
    _meta: {
      embeddingDim: EMBEDDING_DIM,
      providerMinMatch: PROVIDER_MIN_MATCH,
      schichtMinMatch: SCHICHT_MIN_MATCH,
      matchDimensionsLanes: MATCH_DIMENSIONS_LANES.slice(),
      stufeBDefaultModel: STUFE_B_DEFAULT_MODEL,
      stufeBMaxTokens: STUFE_B_MAX_TOKENS,
      anthropicApiUrl: ANTHROPIC_API_URL,
      anthropicApiVersion: ANTHROPIC_API_VERSION,
    },
  };

  global.SbkimMatch = SbkimMatch;

  // Self-check: emitted on script load (synchronous, no async load step).
  // Format is uniform across all SBKIM modules — see INTERFACES.md.
  // Bau 04.A erweitert die Funktions-Liste um matchDimensions; Schwellen-
  // Block nennt PROVIDER_MIN_MATCH und SCHICHT_MIN_MATCH.
  if (typeof console !== "undefined" && console.info) {
    console.info(
      "MODUL 04 MATCH bereit, Funktionen: match/isAboveProviderThreshold/matchDimensions/explainMatchLLM, " +
        "Schwellen: PROVIDER_MIN_MATCH=" + PROVIDER_MIN_MATCH +
        ", SCHICHT_MIN_MATCH=" + SCHICHT_MIN_MATCH,
    );
  }
})(typeof window !== "undefined" ? window : globalThis);
