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

// ---------------------------------------------------------------------------
// Interviewer transport pipeline (Track 2.1).
//
// Exercises the free-form-prose → FakeTransport → validator → CaseInput path
// end-to-end in Node. Mirrors the webview's runtime shape without actually
// mounting React. If the validator contract ever regresses or the transport
// seam breaks, the gate fires here instead of waiting for manual UI testing.
// ---------------------------------------------------------------------------

import {
  ClaudeAgentSDKInterviewerTransport,
  FakeInterviewerTransport,
  defaultInterviewerTransport,
  extractFirstJsonObject,
  makeRequest,
} from "../src/lib/interviewer-transport.ts";

const minimalSkill = {
  slug: "interviewer",
  frontmatter: {
    name: "gridpassport-interviewer",
    description: "canary stub — mirrors the shipped Skill frontmatter shape",
  },
  skillMdBody: "",
  references: [],
  examples: [],
};

const fake = new FakeInterviewerTransport();

// Happy path: prose → caseInput, passes validator.
const happy = await fake.query(
  makeRequest("180MW at Prince William, target 2028, ~22% deferrable", minimalSkill),
);
if (happy.kind !== "caseInput") {
  console.error(
    `[canary:desktop] FAIL: FakeTransport happy-path returned ${happy.kind}; expected caseInput`,
  );
  if (happy.kind === "validatorRejection") {
    for (const r of happy.reasons) console.error(`  - ${r}`);
  } else if (happy.kind === "transportError") {
    console.error(`  - ${happy.message}`);
  }
  process.exit(1);
}
if (happy.value.status !== "draft") {
  console.error(
    `[canary:desktop] FAIL: Interviewer hand-off status must be 'draft' (got '${happy.value.status}')`,
  );
  process.exit(1);
}
if (happy.value.publicEvidence.sourceRefs.length !== 0) {
  console.error(
    `[canary:desktop] FAIL: Interviewer hand-off must ship with empty publicEvidence.sourceRefs (Cartographer's scope)`,
  );
  process.exit(1);
}
console.log(
  `[canary:desktop] interviewer transport (happy): pass (FakeTransport → validator → CaseInput; ${happy.value.applicantOrg}, ${happy.value.requestedMW} MW)`,
);

// Clarify path: empty prose → clarify question, never reaches state.
const clarify = await fake.query(makeRequest("   ", minimalSkill));
if (clarify.kind !== "clarify") {
  console.error(
    `[canary:desktop] FAIL: FakeTransport clarify-path expected 'clarify', got '${clarify.kind}'`,
  );
  process.exit(1);
}
console.log(
  `[canary:desktop] interviewer transport (clarify): pass (empty prose → clarify; no state write)`,
);

// SDK transport without Tauri runtime: must surface a clean transportError
// (not throw). This guards the defensive dynamic-import path in
// ClaudeAgentSDKInterviewerTransport.query().
const sdk = new ClaudeAgentSDKInterviewerTransport();
const sdkResult = await sdk.query(
  makeRequest("should fail cleanly outside Tauri", minimalSkill),
);
if (sdkResult.kind !== "transportError") {
  console.error(
    `[canary:desktop] FAIL: SDK transport in Node expected 'transportError', got '${sdkResult.kind}'`,
  );
  process.exit(1);
}
console.log(
  `[canary:desktop] interviewer transport (sdk outside Tauri): pass (graceful transportError, no throw)`,
);

// Auto-detect: defaultInterviewerTransport() must return Fake in Node (no
// window / no Tauri globals). If this flips to SDK by accident, canary +
// any Node-side test that relies on the factory would hit the LLM path
// unintentionally.
const auto = defaultInterviewerTransport();
if (auto.label !== "fake") {
  console.error(
    `[canary:desktop] FAIL: defaultInterviewerTransport() in Node expected 'fake', got '${auto.label}'`,
  );
  process.exit(1);
}
console.log(
  `[canary:desktop] interviewer transport (factory): pass (Node auto-detects Fake; desktop runtime selects SDK via __TAURI_INTERNALS__)`,
);

// Tolerant JSON extraction: markdown fences must be stripped; the first
// balanced {...} must be returned. This is the parser that takes a raw
// claude CLI response (which often wraps JSON in ```json fences despite
// the "no prose" instruction) and hands clean JSON to the validator.
const fenced = "```json\n{\n  \"clarify\": \"hi\"\n}\n```";
const unfenced = extractFirstJsonObject(fenced);
if (unfenced !== '{\n  "clarify": "hi"\n}') {
  console.error(
    `[canary:desktop] FAIL: extractFirstJsonObject didn't strip fences; got: ${JSON.stringify(unfenced)}`,
  );
  process.exit(1);
}
const prose = 'Some prose before. {"a":1,"b":{"c":2}} and after.';
if (extractFirstJsonObject(prose) !== '{"a":1,"b":{"c":2}}') {
  console.error(`[canary:desktop] FAIL: extractFirstJsonObject prose-wrapping`);
  process.exit(1);
}
if (extractFirstJsonObject("no json here, just words") !== null) {
  console.error(`[canary:desktop] FAIL: extractFirstJsonObject should return null for no-JSON input`);
  process.exit(1);
}
console.log(
  `[canary:desktop] interviewer transport (json extraction): pass (fences stripped · prose-wrapped extracted · no-json returns null)`,
);

console.log("[canary:desktop] all clear");
