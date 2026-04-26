/**
 * Generic Skill → prompt-only baseline derivation.
 *
 * Replaces the per-Skill export script; takes the Skill name as argv[2].
 * Produces `packages/agents/<name>/baselines/prompt-only.md` mechanically
 * from `.claude/skills/<name>/{SKILL.md, REFERENCE.md, SOURCES.md,
 * ROLE_VOICES.md, examples/*.md}` (whichever files exist).
 *
 * This is the fair-comparison machinery for the #14 Skill-vs-prompt eval
 * (research thesis §3.1 + §6b). Every edit to a Skill must regenerate the
 * baseline; a drift gate enforces it.
 *
 * Usage:
 *   tsx scripts/export_prompt_only.ts <skill-name>                # write baseline
 *   tsx scripts/export_prompt_only.ts <skill-name> --check        # fail on drift
 *   tsx scripts/export_prompt_only.ts --all                       # write all shipping Skills
 *   tsx scripts/export_prompt_only.ts --all --check               # check all
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";
import { createHash } from "node:crypto";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(THIS_DIR, "..");
const REPO_ROOT = join(PKG_ROOT, "..", "..");

// Shipping Skills — keep in sync with .claude/skills/README.md roster.
const SHIPPING_SKILLS = ["interviewer", "cartographer", "priorauth-interviewer", "explainer"];

// Per-Skill reference files beyond the optional REFERENCE.md. Any .md file in
// the Skill dir that isn't SKILL.md, REFERENCE.md, or inside examples/ is
// treated as a bundled reference (e.g., Cartographer's SOURCES.md,
// Explainer's future ROLE_VOICES.md).

interface ParsedSkill {
  frontmatter: Record<string, string>;
  body: string;
}

function parseSkillMd(text: string): ParsedSkill {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") {
    throw new Error("SKILL.md must start with YAML frontmatter (--- on line 1)");
  }
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) throw new Error("SKILL.md frontmatter has no closing ---");
  const fmLines = lines.slice(1, endIdx);
  const fm: Record<string, string> = {};
  let curKey: string | null = null;
  let curBlock: string[] = [];
  const flush = () => {
    if (curKey !== null) fm[curKey] = curBlock.join("\n").trim();
  };
  for (const line of fmLines) {
    const m = /^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/.exec(line);
    if (m && !line.startsWith(" ") && !line.startsWith("\t")) {
      flush();
      curKey = m[1];
      const rest = m[2];
      curBlock = rest === "|" || rest === ">" ? [] : [rest];
    } else if (curKey !== null) {
      curBlock.push(line.replace(/^\s+/, ""));
    }
  }
  flush();
  return { frontmatter: fm, body: lines.slice(endIdx + 1).join("\n").trimStart() };
}

function skillSourceHash(parts: string[]): string {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex").slice(0, 16);
}

function buildFlatPrompt(skillName: string): string {
  const skillDir = join(REPO_ROOT, ".claude", "skills", skillName);
  if (!existsSync(skillDir)) {
    throw new Error(`Skill directory not found: ${skillDir}`);
  }
  const skillPath = join(skillDir, "SKILL.md");
  const skillText = readFileSync(skillPath, "utf8");
  const { frontmatter, body } = parseSkillMd(skillText);

  // Collect bundled reference files (anything .md at the Skill root that
  // isn't SKILL.md). Sorted for determinism.
  const bundledRefs: Array<{ name: string; text: string }> = [];
  for (const f of readdirSync(skillDir).sort()) {
    if (
      f.endsWith(".md") &&
      f !== "SKILL.md" &&
      !existsSync(join(skillDir, "examples", f)) // never a directory; stays safe
    ) {
      bundledRefs.push({ name: f, text: readFileSync(join(skillDir, f), "utf8") });
    }
  }

  // Examples, also sorted.
  const examplesDir = join(skillDir, "examples");
  const exampleFiles: Array<{ name: string; text: string }> = [];
  if (existsSync(examplesDir)) {
    for (const f of readdirSync(examplesDir).sort()) {
      if (f.endsWith(".md")) {
        exampleFiles.push({ name: f, text: readFileSync(join(examplesDir, f), "utf8") });
      }
    }
  }

  const contentHash = skillSourceHash([
    skillText,
    ...bundledRefs.map((r) => r.text),
    ...exampleFiles.map((e) => e.text),
  ]);

  const header = `<!--
  AUTO-GENERATED — do not edit by hand.

  Prompt-only baseline for the ${frontmatter.name ?? skillName} Claude
  Agent Skill, derived mechanically from:
    - .claude/skills/${skillName}/SKILL.md
${bundledRefs.map((r) => `    - .claude/skills/${skillName}/${r.name}`).join("\n")}
${exampleFiles.map((e) => `    - .claude/skills/${skillName}/examples/${e.name}`).join("\n")}

  Purpose: #14 eval harness compares the Skill substrate against a
  flat-prompt substrate with IDENTICAL content. This file is that flat
  prompt. Any edit here without a corresponding edit to the Skill source
  is a contamination of the comparison. The 'pnpm agents:baseline:check'
  gate detects drift.

  See:
    docs/design/research-thesis.md §5, §6b (baseline methodology)
    docs/agents.md §7b (per-Skill baseline pattern)
    packages/agents/interviewer/baselines/README.md (case-study framing; applies
      to every Skill; read once, generalize to all)

  content-hash: ${contentHash}
  regenerate: pnpm --filter @grid-passport/agents baseline:${skillName}
-->

# ${frontmatter.name ?? skillName} — prompt-only baseline (derived from Skill source)

This system prompt is the **flat-prompt equivalent** of the \`${frontmatter.name ?? skillName}\` Claude Agent Skill. It is generated by concatenating the Skill's frontmatter, body, reference material, and worked examples into a single prose document. Use this prompt as the system message for a baseline LLM call; use the Skill (at \`.claude/skills/${skillName}/\`) as the comparison condition with the same inputs.

`;

  const descBlock = frontmatter.description
    ? `## Your role (from Skill description)\n\n${frontmatter.description}\n\n`
    : "";
  const whenBlock = frontmatter.when_to_use
    ? `### When to invoke this behavior\n\n${frontmatter.when_to_use}\n\n`
    : "";
  const bodyBlock = `## Instructions (from SKILL.md body)\n\n${body}\n\n`;
  const refsBlock = bundledRefs.length
    ? bundledRefs
        .map(
          (r) =>
            `---\n\n## ${basename(r.name, ".md")} (from ${r.name}, inlined)\n\n${r.text.trim()}\n\n`,
        )
        .join("")
    : "";
  const examplesBlock = exampleFiles.length
    ? `---\n\n## Worked examples (from examples/, inlined)\n\n${exampleFiles
        .map(
          (e) => `### ${basename(e.name, ".md")}\n\n${e.text.trim()}\n`,
        )
        .join("\n---\n\n")}`
    : "";

  return header + descBlock + whenBlock + bodyBlock + refsBlock + examplesBlock;
}

function baselineOutPath(skillName: string): string {
  return join(PKG_ROOT, skillName, "baselines", "prompt-only.md");
}

function processOne(skillName: string, check: boolean): boolean {
  const out = baselineOutPath(skillName);
  const generated = buildFlatPrompt(skillName);
  if (check) {
    if (!existsSync(out)) {
      console.error(
        `[baseline:check] missing ${out}; run 'pnpm agents:baseline' to generate`,
      );
      return false;
    }
    const committed = readFileSync(out, "utf8");
    if (committed !== generated) {
      console.error(
        `[baseline:check] DRIFT — ${basename(out)} (${skillName}) does not match Skill source.`,
      );
      console.error(
        `  Run 'pnpm --filter @grid-passport/agents baseline:${skillName}' and commit.`,
      );
      return false;
    }
    console.log(`[baseline:check] ok — ${skillName}`);
    return true;
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, generated);
  const lineCount = generated.split("\n").length;
  console.log(
    `[baseline] wrote ${out} · ${generated.length.toLocaleString()} bytes · ${lineCount.toLocaleString()} lines`,
  );
  return true;
}

function main(): void {
  const args = argv.slice(2);
  const check = args.includes("--check") || args.includes("check");
  const all = args.includes("--all") || args.includes("all");
  const named = args.filter((a) => !a.startsWith("-") && a !== "check");
  const skills = all || named.length === 0 ? SHIPPING_SKILLS : named;
  let okAll = true;
  for (const s of skills) {
    if (!processOne(s, check)) okAll = false;
  }
  if (!okAll) exit(1);
}

main();
