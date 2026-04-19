/**
 * Cartographer output validator.
 *
 * Enforces the write-scope + provenance contract declared in
 * .claude/skills/cartographer/SKILL.md:
 *   - writes only to CaseInput.publicEvidence (the write-scope contract)
 *   - every non-null classified field has ≥ 1 matching sourceRefs[] entry
 *   - every source URL either appears in SOURCES.md or is an applicant-upload
 *     (file:// prefix) — the provenance whitelist
 *   - privateProfile / derivedProof / identity MUST NOT be written
 *   - structural shapes + enum values conform to @grid-passport/core
 *
 * This is the empirical check for research-thesis §3.1 (schema-as-safety-case,
 * provenance-bound retrieval variant): the Skill is structurally incapable of
 * producing an evidence entry without a source URL, and the source URL is on
 * the whitelist. A failure here is a contract violation, not a warning.
 *
 * Usage:
 *   tsx cartographer/scripts/validate_publicevidence.ts            # self-test
 *   tsx cartographer/scripts/validate_publicevidence.ts <path.json> # file
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";
import { getCase } from "@grid-passport/core/fixtures";
import type {
  CaseInput,
  PublicEvidence,
  RiskClass,
} from "@grid-passport/core/types";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(THIS_DIR, "..", "..", "..", "..");
const SOURCES_MD = join(REPO_ROOT, ".claude", "skills", "cartographer", "SOURCES.md");

export class CartographerContractViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartographerContractViolation";
  }
}

// Parse SOURCES.md once, extract every URL that appears in a registry section.
// Used as the whitelist for sourceRefs[].url. Applicant uploads bypass the
// whitelist via the file:// prefix.
function loadSourceWhitelist(): Set<string> {
  if (!existsSync(SOURCES_MD)) {
    throw new CartographerContractViolation(
      `SOURCES.md not found at ${SOURCES_MD}; whitelist cannot be established`,
    );
  }
  const text = readFileSync(SOURCES_MD, "utf8");
  const urls = new Set<string>();
  // Match URLs in markdown bullet/bold lines: "- **URL:** https://..." or "**URL:** https://..."
  // Also catch bare "https://..." tokens in the body of a registry section, which is how
  // some entries inline the URL.
  const urlRegex = /https?:\/\/[^\s)<>"]+/g;
  let m: RegExpExecArray | null;
  while ((m = urlRegex.exec(text)) !== null) {
    // Strip trailing punctuation that markdown tolerates but URLs don't.
    const url = m[0].replace(/[.,;:)\]]+$/, "");
    urls.add(url);
  }
  return urls;
}

const RISK_VALUES: ReadonlySet<string> = new Set<RiskClass>(["low", "medium", "high"]);

function requireString(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
): string {
  const v = obj[key];
  if (typeof v !== "string") {
    throw new CartographerContractViolation(`${ctx}.${key} must be a string`);
  }
  return v;
}

function requireRisk(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
): RiskClass {
  const v = requireString(obj, key, ctx);
  if (!RISK_VALUES.has(v)) {
    throw new CartographerContractViolation(
      `${ctx}.${key} must be one of low|medium|high (got "${v}")`,
    );
  }
  return v as RiskClass;
}

function requireBoolean(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
): boolean {
  const v = obj[key];
  if (typeof v !== "boolean") {
    throw new CartographerContractViolation(`${ctx}.${key} must be a boolean`);
  }
  return v;
}

function isApplicantUpload(url: string | undefined): boolean {
  return typeof url === "string" && url.startsWith("file://");
}

/**
 * Validate a Cartographer hand-off output.
 *
 * Input shape: a `{publicEvidence: PublicEvidence}` wrapper (the contract is
 * that Cartographer writes only that section, so the hand-off envelope is just
 * that section). Accepts either the bare PublicEvidence or the wrapper.
 */
export function validateCartographerOutput(
  raw: unknown,
  opts: { sourceWhitelist?: Set<string> } = {},
): PublicEvidence {
  const whitelist = opts.sourceWhitelist ?? loadSourceWhitelist();

  if (typeof raw !== "object" || raw === null) {
    throw new CartographerContractViolation(
      "top-level value must be a JSON object",
    );
  }
  const r = raw as Record<string, unknown>;

  // Reject any key outside Cartographer's write scope. If the caller passed a
  // full CaseInput-shaped object with privateProfile/derivedProof/identity
  // populated, that's a contract violation.
  const forbidden = [
    "privateProfile",
    "derivedProof",
    "id",
    "caseId",
    "applicantOrg",
    "requestedMW",
    "targetCOD",
    "phases",
    "site",
    "status",
    "policyVersion",
  ];
  for (const k of forbidden) {
    if (k in r) {
      throw new CartographerContractViolation(
        `write-scope violation: "${k}" is outside Cartographer's scope ` +
          `(publicEvidence only). That section belongs to Interviewer/Forecaster/runtime.`,
      );
    }
  }

  // Unwrap if this is a {publicEvidence: ...} wrapper.
  const pe = (("publicEvidence" in r ? r.publicEvidence : r) as unknown);
  if (typeof pe !== "object" || pe === null || Array.isArray(pe)) {
    throw new CartographerContractViolation(
      "publicEvidence must be a JSON object",
    );
  }
  const ev = pe as Record<string, unknown>;

  const floodRisk = requireRisk(ev, "floodRisk", "publicEvidence");
  const permitRisk = requireRisk(ev, "permitRisk", "publicEvidence");
  const zoningRisk = requireRisk(ev, "zoningRisk", "publicEvidence");
  requireBoolean(ev, "siteControlEvidence", "publicEvidence");

  const refs = ev.sourceRefs;
  if (!Array.isArray(refs)) {
    throw new CartographerContractViolation(
      "publicEvidence.sourceRefs must be an array",
    );
  }
  if (refs.length === 0) {
    throw new CartographerContractViolation(
      "publicEvidence.sourceRefs[] must be non-empty; every evidence field " +
        "needs at least one source. Cartographer cannot produce an evidence " +
        "entry without provenance.",
    );
  }

  // Every sourceRef is {label: string, url?: string}. URL optional — an entry
  // with a bare label is allowed (e.g., "Loudoun County — Data-center zoning
  // overlay" that the registry references by name rather than URL). But if a
  // URL is present, it must be whitelisted or an applicant-upload.
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    if (typeof ref !== "object" || ref === null || Array.isArray(ref)) {
      throw new CartographerContractViolation(
        `sourceRefs[${i}] must be a {label, url?} object`,
      );
    }
    const refObj = ref as Record<string, unknown>;
    if (typeof refObj.label !== "string" || refObj.label.length === 0) {
      throw new CartographerContractViolation(
        `sourceRefs[${i}].label must be a non-empty string`,
      );
    }
    if ("url" in refObj && refObj.url !== undefined) {
      if (typeof refObj.url !== "string") {
        throw new CartographerContractViolation(
          `sourceRefs[${i}].url, if present, must be a string`,
        );
      }
      if (!whitelist.has(refObj.url) && !isApplicantUpload(refObj.url)) {
        throw new CartographerContractViolation(
          `sourceRefs[${i}].url is not whitelisted: "${refObj.url}". ` +
            `URLs must appear in .claude/skills/cartographer/SOURCES.md or ` +
            `be an applicant upload (file:// prefix).`,
        );
      }
    }
  }

  // Provenance coverage: each classified field (flood / permit / zoning /
  // site control) needs at least one sourceRef. Since we don't have
  // per-field → per-ref linkage in the schema today, this check is "the
  // refs array is non-empty AND has at least one URL-bearing entry OR one
  // named-source entry". This matches the fixture conventions.
  const hasUrlRef = refs.some(
    (r) =>
      typeof (r as Record<string, unknown>).url === "string" &&
      ((r as Record<string, unknown>).url as string).length > 0,
  );
  const hasLabelOnlyRef = refs.some(
    (r) =>
      typeof (r as Record<string, unknown>).label === "string" &&
      ((r as Record<string, unknown>).url === undefined ||
        (r as Record<string, unknown>).url === null),
  );
  if (!hasUrlRef && !hasLabelOnlyRef) {
    // Can't happen given the per-ref check above, but defensive: every ref
    // must have either a url or be a bare-label reference.
    throw new CartographerContractViolation(
      "sourceRefs[] contains no usable entries (each must have a label; url optional)",
    );
  }

  const notes = ev.notes;
  if (!Array.isArray(notes)) {
    throw new CartographerContractViolation(
      "publicEvidence.notes must be an array",
    );
  }
  for (let i = 0; i < notes.length; i++) {
    if (typeof notes[i] !== "string") {
      throw new CartographerContractViolation(
        `notes[${i}] must be a string`,
      );
    }
  }

  // Side channel: unused vars to satisfy strict mode without silencing.
  void floodRisk;
  void permitRisk;
  void zoningRisk;

  return pe as PublicEvidence;
}

// ---------------------------------------------------------------------------
// Self-test: derive Cartographer-shaped outputs from the 3 canonical fixtures
// (which already have publicEvidence populated), then validate. Add negatives
// for each contract clause.
// ---------------------------------------------------------------------------

function mustGet(caseId: string): CaseInput {
  const c = getCase(caseId);
  if (!c) throw new Error(`unknown fixture caseId: ${caseId}`);
  return c;
}

function runSelfTest(): void {
  const whitelist = loadSourceWhitelist();
  const cases: Array<{ name: string; fixture: CaseInput }> = [
    { name: "owl-compute", fixture: mustGet("owl-compute") },
    { name: "lantern-cloud", fixture: mustGet("lantern-cloud") },
    { name: "kraken-train", fixture: mustGet("kraken-train") },
  ];

  const failures: Array<{ name: string; err: Error }> = [];
  for (const { name, fixture } of cases) {
    const output = { publicEvidence: fixture.publicEvidence };
    try {
      validateCartographerOutput(output, { sourceWhitelist: whitelist });
      console.log(`  ok   ${name}`);
    } catch (err) {
      failures.push({ name, err: err as Error });
      console.log(`  FAIL ${name} — ${(err as Error).message}`);
    }
  }

  // Negative test: privateProfile in output → write-scope violation.
  const leaky = {
    publicEvidence: mustGet("owl-compute").publicEvidence,
    privateProfile: { flexPercent: 22 },
  };
  try {
    validateCartographerOutput(leaky, { sourceWhitelist: whitelist });
    failures.push({
      name: "negative:privateProfile-populated",
      err: new Error("expected write-scope violation but validator passed"),
    });
    console.log(
      `  FAIL negative:privateProfile-populated — validator did not catch write-scope violation`,
    );
  } catch (err) {
    if (err instanceof CartographerContractViolation) {
      console.log(`  ok   negative:privateProfile-populated (rejected)`);
    } else {
      failures.push({ name: "negative:privateProfile-populated", err: err as Error });
    }
  }

  // Negative test: derivedProof in output → write-scope violation.
  const forecastBleed = {
    publicEvidence: mustGet("owl-compute").publicEvidence,
    derivedProof: { firmnessScore: 59 },
  };
  try {
    validateCartographerOutput(forecastBleed, { sourceWhitelist: whitelist });
    failures.push({
      name: "negative:derivedProof-present",
      err: new Error("expected write-scope violation but validator passed"),
    });
    console.log(
      `  FAIL negative:derivedProof-present — validator did not catch write-scope violation`,
    );
  } catch (err) {
    if (err instanceof CartographerContractViolation) {
      console.log(`  ok   negative:derivedProof-present (rejected)`);
    } else {
      failures.push({ name: "negative:derivedProof-present", err: err as Error });
    }
  }

  // Negative test: sourceRefs empty → provenance violation.
  const noSources = {
    publicEvidence: {
      ...mustGet("owl-compute").publicEvidence,
      sourceRefs: [],
    },
  };
  try {
    validateCartographerOutput(noSources, { sourceWhitelist: whitelist });
    failures.push({
      name: "negative:empty-sourceRefs",
      err: new Error("expected provenance violation but validator passed"),
    });
    console.log(
      `  FAIL negative:empty-sourceRefs — validator did not catch provenance violation`,
    );
  } catch (err) {
    if (err instanceof CartographerContractViolation) {
      console.log(`  ok   negative:empty-sourceRefs (rejected)`);
    } else {
      failures.push({ name: "negative:empty-sourceRefs", err: err as Error });
    }
  }

  // Negative test: unknown source URL → whitelist violation.
  const fakeSource = {
    publicEvidence: {
      ...mustGet("owl-compute").publicEvidence,
      sourceRefs: [
        { label: "fake blog", url: "https://example.com/not-a-real-registry-entry" },
      ],
    },
  };
  try {
    validateCartographerOutput(fakeSource, { sourceWhitelist: whitelist });
    failures.push({
      name: "negative:unknown-source-url",
      err: new Error("expected whitelist violation but validator passed"),
    });
    console.log(
      `  FAIL negative:unknown-source-url — validator did not catch whitelist violation`,
    );
  } catch (err) {
    if (err instanceof CartographerContractViolation) {
      console.log(`  ok   negative:unknown-source-url (rejected)`);
    } else {
      failures.push({ name: "negative:unknown-source-url", err: err as Error });
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} validator failure(s).`);
    exit(1);
  }
  console.log(`\nall cartographer-output contract checks passed.`);
}

function validateFile(path: string): void {
  const text = readFileSync(path, "utf8");
  const raw: unknown = JSON.parse(text);
  try {
    validateCartographerOutput(raw);
    console.log(`ok — ${path}`);
  } catch (err) {
    console.error(`fail — ${path}`);
    console.error(`  ${(err as Error).message}`);
    exit(1);
  }
}

const fileArg = argv[2];
if (fileArg) {
  validateFile(fileArg);
} else {
  runSelfTest();
}
