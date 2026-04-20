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
    county: "Prince William",
    parcelId: "demo-parcel-001",
    displayName: "Owl Compute Campus — Prince William, VA",
  },
  requestedMW: 180,
  targetCOD: "2028-10-01",
  phases: 2,
  status: "draft",
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
  return {
    id: c.id,
    caseId: c.caseId,
    applicantOrg: c.applicantOrg,
    requestedMW: c.requestedMW,
    targetCOD: c.targetCOD,
    phases: c.phases,
    status: "draft",
    site: { ...c.site },
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
}

/**
 * Merge the Interviewer hand-off (validated) with a default empty
 * publicEvidence shell. The Interviewer is structurally forbidden from
 * writing this section — Cartographer owns it — so we synthesize the
 * shell here, AFTER validation has passed. Callers receiving the returned
 * CaseInput see a complete record ready for projection.
 */
function assembleCaseInput(handoff: CaseInput): CaseInput {
  return {
    ...handoff,
    publicEvidence: {
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
// ClaudeAgentSDKTransport — stub. Track 2.1-polish wires this up.
// ---------------------------------------------------------------------------

export class ClaudeAgentSDKInterviewerTransport
  implements InterviewerTransport
{
  readonly label = "claude-agent-sdk";

  async query(_req: InterviewerRequest): Promise<InterviewerResult> {
    return {
      kind: "transportError",
      message:
        "Claude Agent SDK transport not yet wired (Track 2.1-polish). " +
        "Running a Claude Code host session and routing webview IPC → " +
        "Rust subprocess → SDK is the planned path; the seam here accepts " +
        "the drop-in. Use FakeTransport for now.",
    };
  }
}

/**
 * Pick the right transport for the current runtime. v0 always returns the
 * Fake; `2.1-polish` will inspect `import.meta.env.VITE_INTERVIEWER_TRANSPORT`
 * (or an equivalent) to choose between Fake and Claude Agent SDK.
 */
export function defaultInterviewerTransport(): InterviewerTransport {
  // NOTE (Track 2.1-polish): gate on env/flag before flipping to SDK.
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
