#!/usr/bin/env node
/*
 * SBKIM Netz-Wächter — vergleicht die Briefkästen (SIGNAL.json) der Peer-Knoten
 * gegen den eigenen Quittungs-Stand (ack) und meldet NUR, wenn es Neues gibt.
 *
 * Server-los-konform: EINE bewusste Leseanfrage pro Peer auf eine genannte
 * raw/main-URL. Kein Crawler, kein Schreiben ins fremde Repo. Läuft aus einer
 * GitHub Action (zeitgesteuert), kann aber auch lokal laufen:
 *     node .github/sbkim-watch.mjs
 *
 * Ausgabe:
 *   - Menschlesbar auf stdout.
 *   - Für die Action: schreibt has_news / summary nach $GITHUB_OUTPUT (falls gesetzt).
 *     Der Workflow öffnet/kommentiert daraufhin EIN GitHub-Issue (Label sbkim-watch),
 *     auch wenn niemand die Seite offen hat (Auto-Issue-Wächter, AUFTRAG SB-KIMTool-Point).
 *
 * KOPIERBAR für andere Knoten: nur den CONFIG-Block unten anpassen
 * (SELF + PEERS). Alles andere bleibt gleich.
 */

import { readFile } from "node:fs/promises";
import { appendFile } from "node:fs/promises";

/* ===================== CONFIG — pro Repo anpassen ===================== */
const SELF = "Mein-Rezeptbuch";
const SELF_SIGNAL = "sbkim/SIGNAL.json"; // Pfad im eigenen Repo
// Die jeweils ANDEREN Knoten (nicht man selbst) — Vollvernetzung (Bauplan §7).
// Name + raw/main-URL des Signals + Postfach (Hinweis-Link zum Lesen).
const PEERS = [
  {
    name: "Sage-Protokol",
    signal: "https://raw.githubusercontent.com/lausiklauskn-png/Sage-Protokol/main/sbkim/SIGNAL.json",
    mailbox: "https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/sbkim/AUSTAUSCH-Rezeptbuch.md",
  },
  {
    name: "SB-KIMTool-Point",
    signal: "https://raw.githubusercontent.com/lausiklauskn-png/SB-KIMTool-Point/main/sbkim/SIGNAL.json",
    mailbox: "https://github.com/lausiklauskn-png/SB-KIMTool-Point/blob/main/sbkim/AUSTAUSCH-Rezeptbuch.md",
  },
  {
    name: "Jasons-Tresor",
    signal: "https://raw.githubusercontent.com/lausiklauskn-png/Jasons-Tresor/main/sbkim/SIGNAL.json",
    mailbox: "https://github.com/lausiklauskn-png/Jasons-Tresor/blob/main/sbkim/AUSTAUSCH-Rezeptbuch.md",
  },
  {
    name: "Mein-Tresor",
    signal: "https://raw.githubusercontent.com/lausiklauskn-png/Mein-Tresor/main/sbkim/SIGNAL.json",
    mailbox: "https://github.com/lausiklauskn-png/Mein-Tresor/blob/main/sbkim/AUSTAUSCH-Rezeptbuch.md",
  },
  {
    name: "Mein-Mixarium",
    signal: "https://raw.githubusercontent.com/lausiklauskn-png/Mein-Mixarium/main/sbkim/SIGNAL.json",
    mailbox: "https://github.com/lausiklauskn-png/Mein-Mixarium/tree/main/sbkim",
  },
];
/* ===================================================================== */

async function readOwnAck() {
  try {
    const j = JSON.parse(await readFile(SELF_SIGNAL, "utf8"));
    return j.ack || {};
  } catch {
    return {};
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return { ok: false, status: res.status };
  try {
    return { ok: true, json: await res.json() };
  } catch {
    return { ok: false, status: "kein-json" };
  }
}

async function main() {
  const ack = await readOwnAck();
  const news = [];
  const notes = [];

  for (const peer of PEERS) {
    const r = await fetchJson(peer.signal);
    if (!r.ok) {
      // Peer hat (noch) kein SIGNAL.json — kein Alarm, nur Notiz.
      notes.push(`${peer.name}: kein SIGNAL.json (${r.status}) — Briefkasten-Regel §11.6 dort noch nicht aktiv.`);
      continue;
    }
    const seq = Number(r.json.seq);
    const acked = ack[peer.name] == null ? -1 : Number(ack[peer.name]);
    if (Number.isFinite(seq) && seq > acked) {
      news.push({
        name: peer.name,
        seq,
        acked: acked < 0 ? "—" : acked,
        headline: r.json.headline || "(keine headline)",
        lastBuild: r.json.lastBuild || "?",
        mailbox: peer.mailbox,
      });
    }
  }

  const hasNews = news.length > 0;

  console.log(`SBKIM Netz-Wächter · ${SELF} · ${new Date().toISOString()}`);
  console.log("");
  if (hasNews) {
    console.log(`🔔 NEUES im Netz (${news.length}):`);
    for (const n of news) {
      console.log(`  • ${n.name}: seq ${n.seq} (quittiert: ${n.acked}) — ${n.headline}`);
      console.log(`      Briefkasten: ${n.mailbox}`);
    }
  } else {
    console.log("✓ nichts Neues — alle Peers auf quittiertem Stand (keine Rückmeldung nötig).");
  }
  if (notes.length) {
    console.log("");
    console.log("Notizen:");
    for (const x of notes) console.log("  - " + x);
  }

  // Markdown-Zusammenfassung für ein Issue (nur bei Neuem).
  let summary = "";
  if (hasNews) {
    summary =
      `### 🔔 SBKIM-Netz: Neues für ${SELF}\n\n` +
      news.map(n =>
        `- **${n.name}** · seq ${n.seq} (zuletzt quittiert: ${n.acked}) · ${n.lastBuild}\n` +
        `  - ${n.headline}\n` +
        `  - Briefkasten lesen: ${n.mailbox}`
      ).join("\n") +
      `\n\n_Nächster Schritt: in einer Sitzung mit Andock-Bezug die Briefkästen lesen, ` +
      `handeln, und in \`${SELF_SIGNAL}\` den \`ack\` hochsetzen (INTERFACES §11.6)._`;
    if (notes.length) summary += `\n\n<sub>${notes.join(" · ")}</sub>`;
  }

  // GitHub-Action-Outputs
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `has_news=${hasNews}\n`);
    // mehrzeilige Ausgabe via Heredoc-Delimiter
    const delim = "SBKIM_EOF_" + Math.random().toString(36).slice(2);
    await appendFile(process.env.GITHUB_OUTPUT, `summary<<${delim}\n${summary}\n${delim}\n`);
  }

  process.exit(0);
}

main().catch((e) => { console.error("FEHLER:", e && e.stack ? e.stack : e); process.exit(1); });
