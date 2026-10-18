/*
 * Manifest-id — hängt die Probe tests/smoke_manifest_id.mjs in `npm test` ein.
 * Chrome rechnet `id` vom Ursprung aus; "./index.html" machte Mein Rezeptbuch und
 * Muttis Rezeptbuch zu EINER App (Klaus 2026-10-18, chrome://webapks).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("Manifest-id ergibt eine eigene Kennung im Ordner der App", () => {
  const probe = fileURLToPath(new URL("../tests/smoke_manifest_id.mjs", import.meta.url));
  const r = spawnSync(process.execPath, [probe], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^\d+ grün · 0 ROT$/m);
});
