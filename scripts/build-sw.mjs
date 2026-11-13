#!/usr/bin/env node
// Regenerates the offline precache list + version in sw.js.
// Run after adding/changing site files:  node scripts/build-sw.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = /\.(html|css|js|webp|svg|webmanifest)$/;
const SKIP = new Set([".git", "node_modules", "scripts"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : EXT.test(name) && name !== "sw.js" ? ["/" + path.relative(root, p).split(path.sep).join("/")] : [];
  });
}

const files = ["/", ...walk(root).sort()];
const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 12);
const sw = readFileSync(path.join(root, "sw.js"), "utf8")
  .replace(/const VERSION = "[^"]*";/, `const VERSION = "wh-${stamp}";`)
  .replace(/const PRECACHE = \[[\s\S]*?\];/, `const PRECACHE = [\n${files.map((f) => `  "${f}",`).join("\n")}\n];`);
writeFileSync(path.join(root, "sw.js"), sw);
console.log(`sw.js: ${files.length} files, version wh-${stamp}`);
