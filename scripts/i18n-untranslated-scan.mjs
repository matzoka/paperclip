#!/usr/bin/env node
/**
 * Heuristic inventory of likely-untranslated, user-facing strings in `ui/src`.
 *
 * This is NOT a static analyzer (no AST, no JSX parser) — it is a set of
 * regexes over each source line, chosen to be cheap and good enough to find
 * candidates for i18n work (MATZ-11 / doc/I18N-JA.md §8). It is meant for a
 * human (or agent) triaging what to translate next, not as a CI gate: it
 * exits 0 regardless of findings.
 *
 * Known false positives / limitations (see doc/I18N-JA.md for the full
 * policy this feeds into):
 * - JSX text-node detection only looks at `>text<` on a single line, so text
 *   split across lines or wrapped in `{...}` expressions is missed.
 * - It does not know whether a string is actually rendered to a user vs. a
 *   non-UI string (log message, test fixture, internal id) that happens to
 *   look like prose — read the surrounding code before translating a hit.
 * - Attribute detection only covers `placeholder` / `aria-label` / `title`
 *   as literal string attributes; template-interpolated or computed
 *   attribute values are not inspected.
 * - A line containing `t(` is skipped entirely on the assumption it is
 *   already using the translation helper, even though `t("key", {
 *   defaultValue: "..." })` calls are themselves legitimate English source
 *   text, not a miss.
 * - Non-English source text (already translated some other way) is not
 *   distinguished from English; everything alphabetic counts as a candidate.
 *
 * Usage: node scripts/i18n-untranslated-scan.mjs [--json] [dir...]
 * Defaults to scanning `ui/src`. `--json` prints a machine-readable report
 * instead of the human summary.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".turbo", "coverage"]);
const SOURCE_EXTENSIONS = new Set([".tsx", ".ts"]);
const SKIP_FILE_PATTERN = /\.(test|spec|stories)\.[tj]sx?$/;
const SKIP_PATHS = [path.join("ui", "src", "i18n")];

const ATTRIBUTES = ["placeholder", "aria-label", "title"];
const ATTRIBUTE_PATTERN = new RegExp(
  `\\b(${ATTRIBUTES.join("|")})\\s*=\\s*(["'])([^"'{}\\n]+)\\2`,
  "g",
);
const JSX_TEXT_PATTERN = />([^<>{}\n]+)</g;
const HAS_LETTERS = /[A-Za-z]/;
const LOOKS_LIKE_PROSE = /[A-Za-z].*[A-Za-z]/; // at least two letters, so single-letter units (e.g. `>x<`) don't count
const ALREADY_TRANSLATED_LINE = /\bt\(|useTranslation\(/;

function isSkippedPath(absPath) {
  const relPath = path.relative(repoRoot, absPath);
  return SKIP_PATHS.some((skip) => relPath === skip || relPath.startsWith(`${skip}${path.sep}`));
}

function walk(dir, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (isSkippedPath(full)) continue;
      walk(full, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;
    if (SKIP_FILE_PATTERN.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (isSkippedPath(full)) continue;
    files.push(full);
  }
  return files;
}

function scanFile(absPath) {
  const relPath = path.relative(repoRoot, absPath);
  const lines = readFileSync(absPath, "utf8").split("\n");
  const hits = [];

  lines.forEach((line, index) => {
    if (ALREADY_TRANSLATED_LINE.test(line)) return;

    for (const match of line.matchAll(ATTRIBUTE_PATTERN)) {
      const [, attribute, , value] = match;
      if (!HAS_LETTERS.test(value)) continue;
      hits.push({ file: relPath, line: index + 1, kind: `attribute:${attribute}`, text: value.trim() });
    }

    for (const match of line.matchAll(JSX_TEXT_PATTERN)) {
      const text = match[1].trim();
      if (!text || !LOOKS_LIKE_PROSE.test(text)) continue;
      hits.push({ file: relPath, line: index + 1, kind: "jsx-text", text });
    }
  });

  return hits;
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const targets = args.filter((arg) => arg !== "--json");
  const roots = (targets.length > 0 ? targets : ["ui/src"]).map((target) => path.resolve(repoRoot, target));

  const files = roots.flatMap((root) => (statSync(root).isDirectory() ? walk(root, []) : [root]));
  const hits = files.flatMap(scanFile);

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ total: hits.length, hits }, null, 2)}\n`);
    return;
  }

  const byFile = new Map();
  for (const hit of hits) {
    if (!byFile.has(hit.file)) byFile.set(hit.file, []);
    byFile.get(hit.file).push(hit);
  }

  const sortedFiles = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [file, fileHits] of sortedFiles) {
    console.log(`${file} (${fileHits.length})`);
    for (const hit of fileHits.slice(0, 5)) {
      console.log(`  ${hit.line}: [${hit.kind}] ${hit.text.slice(0, 80)}`);
    }
    if (fileHits.length > 5) console.log(`  ... and ${fileHits.length - 5} more`);
  }

  console.log("");
  console.log(`${hits.length} candidate string(s) across ${byFile.size} file(s).`);
  console.log("This is a heuristic inventory, not a complete or authoritative list — see the header comment in this script.");
}

main();
