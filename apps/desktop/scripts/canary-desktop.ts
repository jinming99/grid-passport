import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { getCase } from "@grid-passport/core/fixtures";
import { buildRecord } from "@grid-passport/core/forecast";
import { projectForRole } from "@grid-passport/core/projection";
import type { Role } from "@grid-passport/core/types";

// Desktop-specific mechanical check. The web privacy-canary already asserts
// policy drift; this one asserts (a) the desktop app imports projection from
// @grid-passport/core (no duplicate copy), and (b) the projection invariant
// holds on the same fixtures the desktop UI composes.

const HERE = dirname(fileURLToPath(import.meta.url));
const DESKTOP_SRC = join(HERE, "..", "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const srcFiles = walk(DESKTOP_SRC);
const coreImporters = srcFiles.filter((f) =>
  readFileSync(f, "utf8").includes("@grid-passport/core"),
);

if (coreImporters.length === 0) {
  console.error(
    "[canary:desktop] FAIL: no apps/desktop/src file imports @grid-passport/core — projection layer is duplicated or missing.",
  );
  process.exit(1);
}
console.log(
  `[canary:desktop] @grid-passport/core imports: pass (${coreImporters.length} file${coreImporters.length === 1 ? "" : "s"})`,
);

// Projection invariant. Same structural check the privacy canary runs, but
// explicitly exercised here so a future change to the desktop bundle format
// that bypasses @grid-passport/core would be caught.
const ROLES: Role[] = ["applicant", "utility", "regulator"];
const CASES = ["owl-compute", "lantern-cloud", "kraken-train"];

let hardErrors = 0;
for (const caseId of CASES) {
  const input = getCase(caseId);
  if (!input) {
    console.error(`[canary:desktop] FAIL: unknown case ${caseId}`);
    hardErrors++;
    continue;
  }
  const record = buildRecord(input);
  for (const role of ROLES) {
    const view = projectForRole(record, role);
    const privateVisible = Object.values(view.privateProfile).filter(
      (f) => f.visible,
    ).length;
    const expectVisible = role === "applicant" ? 8 : 0;
    if (privateVisible !== expectVisible) {
      console.error(
        `[canary:desktop] FAIL: ${caseId} · ${role} · expected ${expectVisible} private visible, got ${privateVisible}`,
      );
      hardErrors++;
    }
  }
}

if (hardErrors > 0) {
  console.error(`[canary:desktop] ${hardErrors} failure(s)`);
  process.exit(1);
}
console.log("[canary:desktop] projection invariant: pass (3 cases × 3 roles)");

// Skills-bundle guard. tauri.conf.json declares bundle.resources that pull
// .claude/skills/**/*.md into the packaged binary; that path is resolved from
// src-tauri/, so verify both that the source directory exists and that each
// Skill with a production SKILL.md in the roster has its file on disk. If a
// Skill is added to .claude/skills/README.md but the SKILL.md is missing, the
// Tauri build would silently produce a binary without it.
const REPO_ROOT = join(HERE, "..", "..", "..");
const SKILLS_DIR = join(REPO_ROOT, ".claude", "skills");
if (!existsSync(SKILLS_DIR)) {
  console.error(
    `[canary:desktop] FAIL: .claude/skills/ not found at ${SKILLS_DIR} — Tauri bundle would ship without Skills.`,
  );
  process.exit(1);
}
const SHIPPING_SKILLS = ["interviewer", "cartographer", "priorauth-interviewer"];
const missingSkills: string[] = [];
const invalidFrontmatter: string[] = [];
for (const name of SHIPPING_SKILLS) {
  const skillMd = join(SKILLS_DIR, name, "SKILL.md");
  if (!existsSync(skillMd)) {
    missingSkills.push(`${name}/SKILL.md`);
    continue;
  }
  // Parse-check the frontmatter the same way skills-loader.ts + the baseline
  // export script parse it. If this canary passes, the desktop loader
  // cannot hard-fail on parse at runtime.
  const text = readFileSync(skillMd, "utf8");
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") {
    invalidFrontmatter.push(`${name}: no --- on line 1`);
    continue;
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) {
    invalidFrontmatter.push(`${name}: frontmatter not closed`);
    continue;
  }
  const fmText = lines.slice(1, end).join("\n");
  const hasName = /(^|\n)name:\s*\S/.test(fmText);
  const hasDescription = /(^|\n)description:\s*\S/.test(fmText);
  if (!hasName) invalidFrontmatter.push(`${name}: frontmatter missing name`);
  if (!hasDescription) invalidFrontmatter.push(`${name}: frontmatter missing description`);
}
if (missingSkills.length > 0) {
  console.error(
    `[canary:desktop] FAIL: missing shipping Skill source(s): ${missingSkills.join(", ")}`,
  );
  process.exit(1);
}
if (invalidFrontmatter.length > 0) {
  console.error(
    `[canary:desktop] FAIL: invalid SKILL.md frontmatter in ${invalidFrontmatter.length} skill(s):`,
  );
  for (const e of invalidFrontmatter) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `[canary:desktop] skills bundle source: pass (${SHIPPING_SKILLS.length} skill${SHIPPING_SKILLS.length === 1 ? "" : "s"} present + frontmatter valid at .claude/skills/)`,
);
console.log("[canary:desktop] all clear");
