/**
 * Interviewer transport seam.
 *
 * Sits between the free-form user prose in the intake UI and a validated
 * `CaseInput` flowing into React state. Every emission is gated by the
 * pure `validateInterviewerOutput` from `@grid-passport/agents/interviewer/
 * validator` — no path from the LLM response to app state skips it.
 *
 * Track 2.1 (sprint 2026-04-20). This module lands the interface + a
 * `FakeTransport` that produces deterministic CaseInputs for demo + canary
 * use. The real Claude Agent SDK wiring lands as Track 2.1-polish — the
 * seam is designed so swapping it in is a drop-in replacement, not a
 * rewrite.
 *
 * Design notes:
 *   - Webview-safe: imports only `@grid-passport/core/types` (types only) and
 *     `@grid-passport/agents/interviewer/validator` (browser-safe pure
 *     function). No `node:*`, no fixtures, no Claude Code session detection
 *     at this layer.
 *   - Result is a tagged union, not a throw, so callers (IntakePanel, canary)
 *     can branch on `kind` without try/catch discipline.
 *   - The Transport's `label` is exposed so the desktop UI can stamp the
 *     provenance ("intake via · fake transport") and the canary can assert
 *     which one ran.
 *   - The "clarify" path is defined but the FakeTransport never produces it;
 *     the real SDK transport will when the model emits a follow-up question
 *     instead of a structured CaseInput.
 */
import type { CaseInput } from "@grid-passport/core/types";
import {
  InterviewerContractViolation,
  validateInterviewerOutput,
} from "@grid-passport/agents/interviewer/validator";
import type { LoadedSkill } from "./skills-loader";

export interface InterviewerRequest {
  /** Free-form prose from the applicant. */
  userText: string;
  /** Loaded Interviewer Skill source (SKILL.md + REFERENCE.md + examples). */
  skill: LoadedSkill;
  /**
   * Prior partial CaseInput to refine. v0 FakeTransport ignores this; a
   * real SDK transport would thread it into the prompt so the model can
   * fill gaps rather than start over.
   */
  prior?: CaseInput | null;
}

export type InterviewerResult =
  | { kind: "caseInput"; value: CaseInput }
  | { kind: "clarify"; question: string }
  | {
      kind: "validatorRejection";
      reasons: string[];
      raw: unknown;
    }
  | { kind: "transportError"; message: string };

export interface InterviewerTransport {
  readonly label: string;
  query(req: InterviewerRequest): Promise<InterviewerResult>;
}

// ---------------------------------------------------------------------------
// Canned Interviewer-shaped CaseInputs for the FakeTransport.
//
// Hardcoded here (not imported from @grid-passport/core/fixtures) because the
// utility-binary write-scope pattern says surfaces that only need derived/
// projected data should not link to the applicant-side fixture source. The
// desktop app does need full CaseInput values (it's the applicant tool), so
// the rule is softer here — but the FakeTransport is a demo/test affordance,
// not the place to grow a fixture dependency. Kept shape-compatible with
// @grid-passport/core/src/fixtures/owl-compute.ts.
// ---------------------------------------------------------------------------

const FAKE_OWL: CaseInput = {
  id: "req_fake_owl_001",
  caseId: "owl-compute",
  applicantOrg: "Owl Compute",
  site: {
    state: "VA",
    county: "Loudoun",
    parcelId: "demo-loudoun-001",
    displayName: "Owl Compute Campus — Loudoun, VA",
  },
  requestedMW: 180,
  targetCOD: "2027-09-01",
  phases: 2,
  status: "draft",
  customerContact: {
    name: "Sarah Chen",
    email: "sarah.chen@owlcompute.example",
  },
  loadType: "data_center",
  connectionVoltageKV: 230,
  netMetered: false,
  privateProfile: {
    flexPercent: 22,
    redundancyShiftPercent: 12,
    backupGenHours: 6,
    backupGenMW: 140,
    bessMW: 11,
    bessHours: 4,
    internalScheduleConfidence: 0.68,
    workloadMix: { training: 0.55, inference: 0.45 },
  },
  publicEvidence: {
    floodRisk: "low",
    permitRisk: "low",
    zoningRisk: "low",
    siteControlEvidence: false,
    sourceRefs: [],
    notes: [],
  },
  policyVersion: "grid-passport-policy@0.1.0",
};

/**
 * Build an Interviewer-scope hand-off from a seed CaseInput (identity +
 * operational + sensitive; NO publicEvidence; NO derivedProof; status forced
 * to "draft"). Validator accepts this shape; `assembleCaseInput` below then
 * adds a default empty `publicEvidence` shell so the desktop pipeline has
 * a structurally-complete CaseInput to project over. Cartographer later
 * overwrites the empty shell with real evidence.
 */
function toInterviewerHandoff(c: CaseInput): Record<string, unknown> {
  const handoff: Record<string, unknown> = {
    id: c.id,
    caseId: c.caseId,
    applicantOrg: c.applicantOrg,
    requestedMW: c.requestedMW,
    targetCOD: c.targetCOD,
    phases: c.phases,
    status: "draft",
    site: { ...c.site },
    customerContact: { ...c.customerContact },
    loadType: c.loadType,
    connectionVoltageKV: c.connectionVoltageKV,
    netMetered: c.netMetered,
    privateProfile: {
      flexPercent: c.privateProfile.flexPercent,
      redundancyShiftPercent: c.privateProfile.redundancyShiftPercent,
      backupGenHours: c.privateProfile.backupGenHours,
      backupGenMW: c.privateProfile.backupGenMW,
      bessMW: c.privateProfile.bessMW,
      bessHours: c.privateProfile.bessHours,
      internalScheduleConfidence:
        c.privateProfile.internalScheduleConfidence,
      workloadMix: { ...c.privateProfile.workloadMix },
    },
    policyVersion: c.policyVersion,
  };
  if (c.nettedGenerationStation !== undefined) {
    handoff.nettedGenerationStation = c.nettedGenerationStation;
  }
  return handoff;
}

/**
 * Merge the Interviewer hand-off (validated) with a default empty
 * publicEvidence shell + sentinel defaults for any baseline-filing
 * fields the chat hasn't gathered yet.
 *
 * Two reasons defaults live here, after validation, not in the validator:
 *   1. Cartographer owns publicEvidence; the Interviewer is structurally
 *      forbidden from writing it, so the shell has to be synthesized.
 *   2. The new baseline fields (customerContact, loadType, voltage,
 *      netMetered) land progressively in Round 2 of the chat. A model
 *      that hands off mid-flow may legitimately not have them yet —
 *      validator passes, transport fills sentinels, the work view shows
 *      "(pending)" so the applicant sees what's still owed.
 *
 * Callers receiving the returned CaseInput see a structurally complete
 * record ready for projection.
 */
function assembleCaseInput(handoff: Partial<CaseInput> & Pick<CaseInput, "applicantOrg" | "site" | "requestedMW" | "targetCOD" | "phases" | "status" | "privateProfile">): CaseInput {
  return {
    id: handoff.id ?? "",
    caseId: handoff.caseId ?? "",
    applicantOrg: handoff.applicantOrg,
    site: handoff.site,
    requestedMW: handoff.requestedMW,
    targetCOD: handoff.targetCOD,
    phases: handoff.phases,
    status: handoff.status,
    privateProfile: handoff.privateProfile,
    policyVersion: handoff.policyVersion ?? "grid-passport-policy@0.1.0",
    customerContact: handoff.customerContact ?? { name: "", email: "" },
    loadType: handoff.loadType ?? "data_center",
    connectionVoltageKV: handoff.connectionVoltageKV ?? 0,
    netMetered: handoff.netMetered ?? false,
    nettedGenerationStation: handoff.nettedGenerationStation,
    publicEvidence: handoff.publicEvidence ?? {
      floodRisk: "low",
      permitRisk: "low",
      zoningRisk: "low",
      siteControlEvidence: false,
      sourceRefs: [],
      notes: [],
    },
  };
}

// ---------------------------------------------------------------------------
// FakeTransport — deterministic, browser-safe, no network.
//
// Always returns the Owl canned handoff with the user's prose logged
// (unused). The real value is: the full `query → validator → caseInput`
// pipeline is exercised end-to-end, in the webview, without any LLM call.
// ---------------------------------------------------------------------------

export class FakeInterviewerTransport implements InterviewerTransport {
  readonly label = "fake";

  async query(req: InterviewerRequest): Promise<InterviewerResult> {
    // Intentionally trivial. Future: branch on req.userText to return
    // different canned CaseInputs for lantern / kraken walks. Not needed
    // for v0 — one working case-study path is enough to prove the seam.
    void req.skill;
    void req.prior;
    if (!req.userText.trim()) {
      return {
        kind: "clarify",
        question:
          "Could you share the requested MW, county, target COD year, and a rough flexibility estimate so I can draft an intake?",
      };
    }
    const candidate = toInterviewerHandoff(FAKE_OWL);
    try {
      const handoff = validateInterviewerOutput(candidate);
      const value = assembleCaseInput(handoff);
      return { kind: "caseInput", value };
    } catch (err) {
      if (err instanceof InterviewerContractViolation) {
        return {
          kind: "validatorRejection",
          reasons: [err.message],
          raw: candidate,
        };
      }
      return {
        kind: "transportError",
        message: `unexpected: ${(err as Error).message}`,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// ClaudeAgentSDKTransport — Track 2.1b.
//
// Webview invokes a Rust Tauri command (`interviewer_query`) that shells
// out to `claude -p --output-format json --system-prompt <skill>` carrying
// the parent Claude Code session's OAuth env. No API-key UX in the
// webview. The Rust handler returns the model's raw text; we parse,
// branch on clarify-shape vs CaseInput-shape, and gate every CaseInput
// through `validateInterviewerOutput`.
//
// Tauri import is dynamic so that Node-side tooling (canary, tests) can
// still `import { ClaudeAgentSDKInterviewerTransport }` without pulling
// `@tauri-apps/api/core` into a browser-absent runtime.
// ---------------------------------------------------------------------------

export class ClaudeAgentSDKInterviewerTransport
  implements InterviewerTransport
{
  readonly label = "claude-agent-sdk";

  async query(req: InterviewerRequest): Promise<InterviewerResult> {
    let invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    try {
      const tauri = await import("@tauri-apps/api/core");
      invoke = tauri.invoke;
    } catch (err) {
      return {
        kind: "transportError",
        message:
          `Tauri IPC unavailable — this transport requires the Tauri webview runtime. ` +
          `(${(err as Error).message ?? String(err)})`,
      };
    }

    const skillSource = combineSkillSource(req.skill);

    let raw: string;
    try {
      const out = await invoke("interviewer_query", {
        transcript: req.userText,
        skillSource,
      });
      if (typeof out !== "string") {
        return {
          kind: "transportError",
          message: `expected string from interviewer_query, got ${typeof out}`,
        };
      }
      raw = out;
    } catch (err) {
      return {
        kind: "transportError",
        message: `claude-agent-sdk: ${(err as Error).message ?? String(err)}`,
      };
    }

    const candidate = extractFirstJsonObject(raw);
    if (candidate === null) {
      return {
        kind: "transportError",
        message: `Claude response did not contain a JSON object. Raw (truncated): ${raw.slice(0, 400)}`,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate);
    } catch (err) {
      return {
        kind: "transportError",
        message: `failed to parse JSON from claude response: ${(err as Error).message}`,
      };
    }

    // Clarify-shape detection. Tolerant of two shapes the model emits:
    //   1. `{ "clarify": "<question>" }` — what the Rust prompt requests
    //   2. `{ "type": "clarify", "question": "<question>", ... }` — what
    //      the Interviewer Skill's own intake convention produces (the
    //      Skill's rules take precedence over the Rust-prompt format
    //      hint, which is the intended design)
    const clarifyText = detectClarify(parsed);
    if (clarifyText !== null) {
      return { kind: "clarify", question: clarifyText };
    }

    try {
      const handoff = validateInterviewerOutput(parsed);
      const value = assembleCaseInput(handoff);
      return { kind: "caseInput", value };
    } catch (err) {
      if (err instanceof InterviewerContractViolation) {
        return {
          kind: "validatorRejection",
          reasons: [err.message],
          raw: parsed,
        };
      }
      return {
        kind: "transportError",
        message: `unexpected: ${(err as Error).message}`,
      };
    }
  }
}

/**
 * Detect the two clarify shapes the model is observed to emit. Returns
 * the question text, or null if the value isn't a clarify response.
 */
function detectClarify(parsed: unknown): string | null {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  // Shape 1: { clarify: "<q>" }
  if (typeof o.clarify === "string") return o.clarify;
  // Shape 2: { type: "clarify", question: "<q>" } — the SKILL.md's own intake
  // convention uses this with an optional `field` pointer.
  if (o.type === "clarify" && typeof o.question === "string") {
    return o.question;
  }
  return null;
}

/**
 * Concatenate a LoadedSkill into a single system prompt string:
 * SKILL.md body + reference files + examples, each separated by a
 * horizontal rule. The Claude Code CLI accepts ~32KB of system prompt
 * without issue; the Interviewer skill weighs ~11KB so this is safe.
 */
function combineSkillSource(skill: LoadedSkill): string {
  const parts: string[] = [skill.skillMdBody];
  for (const ref of skill.references) {
    parts.push(`# ${ref.filename}\n\n${ref.body}`);
  }
  for (const ex of skill.examples) {
    parts.push(`# Example — ${ex.filename}\n\n${ex.body}`);
  }
  return parts.join("\n\n---\n\n");
}

/**
 * Extract the first complete JSON object from a text blob. Tolerates
 * markdown fences (```json ... ```) and surrounding prose. Returns null
 * if no `{` is present or braces don't balance.
 */
export function extractFirstJsonObject(text: string): string | null {
  let s = text.replace(/^\s*```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "");
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Pick the right transport for the current runtime.
 *
 * Selection order:
 *   1. `VITE_INTERVIEWER_TRANSPORT=fake` forces Fake (useful for dev +
 *      demo recording without LLM spend).
 *   2. `VITE_INTERVIEWER_TRANSPORT=sdk` forces the Claude Agent SDK
 *      transport (errors cleanly if Tauri IPC is unavailable).
 *   3. Auto-detect: Tauri runtime (`window.__TAURI_INTERNALS__` present)
 *      → SDK, else → Fake.
 *
 * Canary + Node-side tooling get Fake by default (no window, no Tauri).
 * Desktop webview gets SDK and, when `claude` CLI is unreachable, surfaces
 * a clear transportError the IntakePanel renders verbatim.
 */
export function defaultInterviewerTransport(): InterviewerTransport {
  const flag = (
    import.meta as unknown as {
      env?: Record<string, string | undefined>;
    }
  ).env?.VITE_INTERVIEWER_TRANSPORT;
  if (flag === "fake") return new FakeInterviewerTransport();
  if (flag === "sdk") return new ClaudeAgentSDKInterviewerTransport();
  if (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window
  ) {
    return new ClaudeAgentSDKInterviewerTransport();
  }
  return new FakeInterviewerTransport();
}

// Small helper so the canary + UI can share a canned "good" request without
// duplicating the loaded-skill shape. Tests pass a LoadedSkill they built
// locally; the userText is whatever drives the branch.
export function makeRequest(
  userText: string,
  skill: LoadedSkill,
  prior?: CaseInput | null,
): InterviewerRequest {
  return { userText, skill, prior: prior ?? null };
}
