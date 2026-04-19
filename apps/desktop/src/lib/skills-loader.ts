/**
 * Desktop-app Skills loader.
 *
 * At build time, `tauri.conf.json`'s `bundle.resources` copies the project's
 * `.claude/skills/**` into the packaged binary's resource directory. At
 * runtime, this module resolves that path via Tauri's resource-path API
 * and reads the shipped Skill files into a `LoadedSkill[]` that the Claude
 * Agent SDK integration consumes.
 *
 * The SDK wiring itself (LLM transport, streaming, tool-invocation plumbing)
 * is out of scope for this module. This module's one job is to produce a
 * structurally-valid `LoadedSkill[]` from the bundled resources directory,
 * so whichever SDK path we use downstream has a clean input.
 *
 * Design notes:
 *   - Runs in the Tauri webview (React/TS frontend). Uses the Tauri
 *     plugin-fs API to read bundled resources.
 *   - The Skills list is hardcoded in SHIPPING_SKILLS, mirroring the same
 *     list in canary-desktop.ts + packages/agents/scripts/*.ts. Keep these
 *     three locations in sync when a Skill ships.
 *   - Gracefully degrades if a Skill is missing a file (REFERENCE.md,
 *     SOURCES.md, examples/ — all optional per spec). Missing SKILL.md is
 *     a hard error: that's how the Skill is defined.
 */

import { resolveResource } from "@tauri-apps/api/path";
import { readTextFile, readDir, exists } from "@tauri-apps/plugin-fs";

export interface SkillFrontmatter {
  name: string;
  description: string;
  when_to_use?: string;
  [key: string]: string | undefined;
}

export interface LoadedExample {
  filename: string;
  body: string;
}

export interface LoadedReference {
  filename: string;
  body: string;
}

export interface LoadedSkill {
  slug: string; // directory name under .claude/skills/ (e.g., "interviewer")
  frontmatter: SkillFrontmatter;
  skillMdBody: string; // SKILL.md body with frontmatter stripped
  references: LoadedReference[]; // REFERENCE.md, SOURCES.md, ROLE_VOICES.md, etc.
  examples: LoadedExample[]; // examples/*.md, sorted lexicographically
}

export class SkillLoadError extends Error {
  constructor(
    readonly slug: string,
    message: string,
  ) {
    super(`[skills-loader] ${slug}: ${message}`);
    this.name = "SkillLoadError";
  }
}

// Keep in sync with:
//   - apps/desktop/scripts/canary-desktop.ts SHIPPING_SKILLS
//   - packages/agents/scripts/{export_prompt_only,compute_metrics}.ts
//   - .claude/skills/README.md roster
export const SHIPPING_SKILLS = [
  "interviewer",
  "cartographer",
  "priorauth-interviewer",
] as const;

/**
 * Parse a SKILL.md source into frontmatter + body. Deliberately the same
 * parser shape as packages/agents/scripts/export_prompt_only.ts — so the
 * prompt-only baseline and the desktop runtime interpret the Skill
 * identically. (If we diverge, #14's comparison stops being fair.)
 */
export function parseSkillMd(text: string): {
  frontmatter: SkillFrontmatter;
  body: string;
} {
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
  if (endIdx === -1) {
    throw new Error("SKILL.md frontmatter has no closing ---");
  }
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
  if (!fm.name || !fm.description) {
    throw new Error(
      "SKILL.md frontmatter must define both 'name' and 'description' (per agentskills.io spec)",
    );
  }
  return {
    frontmatter: fm as SkillFrontmatter,
    body: lines.slice(endIdx + 1).join("\n").trimStart(),
  };
}

async function readOptional(path: string): Promise<string | null> {
  try {
    if (!(await exists(path))) return null;
    return await readTextFile(path);
  } catch {
    return null;
  }
}

/**
 * Resolve the packaged skills root to an absolute path. In dev (Tauri
 * webview with resource resolution), this points at src-tauri's resource
 * dir. At runtime in a packaged build, Tauri resolves it to the platform
 * resource location (macOS: Contents/Resources/, etc.).
 */
export async function resolveSkillsRoot(): Promise<string> {
  // The bundle.resources entry in tauri.conf.json maps
  // "../../../.claude/skills/**/*.md" to "skills/" inside the resource
  // root. So the skills directory is at "skills/" relative to the
  // resource root — resolveResource("skills") gives the correct path.
  return await resolveResource("skills");
}

async function loadOneSkill(
  rootPath: string,
  slug: string,
): Promise<LoadedSkill> {
  const skillDir = `${rootPath}/${slug}`;
  const skillMdPath = `${skillDir}/SKILL.md`;

  const skillMdRaw = await readOptional(skillMdPath);
  if (skillMdRaw === null) {
    throw new SkillLoadError(slug, `missing SKILL.md at ${skillMdPath}`);
  }
  let parsed: { frontmatter: SkillFrontmatter; body: string };
  try {
    parsed = parseSkillMd(skillMdRaw);
  } catch (err) {
    throw new SkillLoadError(slug, `SKILL.md parse failed: ${(err as Error).message}`);
  }

  // Bundled references: any .md at the Skill root other than SKILL.md.
  // Sorted for determinism (matches export_prompt_only.ts).
  const references: LoadedReference[] = [];
  let rootEntries: { name: string; isDirectory?: boolean; isFile?: boolean }[] = [];
  try {
    rootEntries = (await readDir(skillDir)).map((e) => ({
      name: e.name ?? "",
      isDirectory: e.isDirectory,
      isFile: e.isFile,
    }));
  } catch {
    rootEntries = [];
  }
  const refNames = rootEntries
    .filter((e) => (e.isFile ?? true) && e.name.endsWith(".md") && e.name !== "SKILL.md")
    .map((e) => e.name)
    .sort();
  for (const name of refNames) {
    const text = await readOptional(`${skillDir}/${name}`);
    if (text !== null) references.push({ filename: name, body: text });
  }

  // Examples: any .md under examples/, sorted.
  const examples: LoadedExample[] = [];
  const examplesDir = `${skillDir}/examples`;
  if (await exists(examplesDir)) {
    let exEntries: { name: string; isFile?: boolean }[] = [];
    try {
      exEntries = (await readDir(examplesDir)).map((e) => ({
        name: e.name ?? "",
        isFile: e.isFile,
      }));
    } catch {
      exEntries = [];
    }
    const exNames = exEntries
      .filter((e) => (e.isFile ?? true) && e.name.endsWith(".md"))
      .map((e) => e.name)
      .sort();
    for (const name of exNames) {
      const text = await readOptional(`${examplesDir}/${name}`);
      if (text !== null) examples.push({ filename: name, body: text });
    }
  }

  return {
    slug,
    frontmatter: parsed.frontmatter,
    skillMdBody: parsed.body,
    references,
    examples,
  };
}

/**
 * Load every shipping Skill from the packaged resources. Returns the full
 * list or throws SkillLoadError on the first hard failure (missing
 * SKILL.md, invalid frontmatter). Missing optional files (REFERENCE.md,
 * examples/) are tolerated.
 */
export async function loadAllSkills(): Promise<LoadedSkill[]> {
  const root = await resolveSkillsRoot();
  const skills: LoadedSkill[] = [];
  for (const slug of SHIPPING_SKILLS) {
    skills.push(await loadOneSkill(root, slug));
  }
  return skills;
}

/**
 * Summary useful for a desktop UI pane ("Skills loaded: interviewer ·
 * cartographer · priorauth-interviewer · 1,421 tokens upfront metadata").
 * Token count is chars/4 heuristic, matching packages/agents/scripts/
 * compute_metrics.ts so the desktop UI can display the same numbers that
 * appear on the research slide.
 */
export function summarizeLoaded(skills: LoadedSkill[]): {
  count: number;
  slugs: string[];
  upfrontMetadataChars: number;
  upfrontMetadataTokensEst: number;
} {
  const parts: string[] = [];
  for (const s of skills) {
    parts.push(s.frontmatter.name ?? s.slug);
    parts.push(s.frontmatter.description ?? "");
    if (s.frontmatter.when_to_use) parts.push(s.frontmatter.when_to_use);
  }
  const chars = parts.join("\n").length;
  return {
    count: skills.length,
    slugs: skills.map((s) => s.slug),
    upfrontMetadataChars: chars,
    upfrontMetadataTokensEst: Math.round(chars / 4),
  };
}
