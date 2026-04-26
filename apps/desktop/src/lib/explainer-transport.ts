/**
 * Explainer transport seam. Mirrors interviewer-transport.ts: pluggable
 * Transport interface + `FakeExplainerTransport` (deterministic, offline
 * default for Node/canary) + `ClaudeAgentSDKExplainerTransport` (real,
 * invokes the Rust `explainer_query` command which shells out to
 * `claude -p` carrying the parent Claude Code session's OAuth auth).
 *
 * Track 2.2-polish of sprint 2026-04-20. Every narration emission is
 * gated by `validateNarration` from `@grid-passport/agents/explainer/
 * validator` before it reaches React state — the §3.4 read-scope
 * contract check from the research thesis, empirically enforced.
 *
 * Webview-safe: Tauri import is dynamic (canary can instantiate the SDK
 * transport without pulling `@tauri-apps/api/core` into a non-browser
 * runtime).
 */
import type { CaseInput, Role } from "@grid-passport/core/types";
import type { ProjectedView } from "@grid-passport/core/projection";
import {
  ExplainerContractViolation,
  validateNarration,
  type ExplainerRole,
  type NarrationInput,
} from "@grid-passport/agents/explainer/validator";
import type { LoadedSkill } from "./skills-loader";

export interface ExplainerRequest {
  view: ProjectedView;
  role: Role;
  skill: LoadedSkill;
  /**
   * CaseInput.privateProfile is the ground truth for forbidden literals.
   * The caller (ExplainerPanel + App) has access because desktop is the
   * applicant's machine — the Explainer itself never touches CaseInput,
   * only the projected view. The `forbiddenLiterals` list is derived
   * here and passed to the validator post-narration.
   */
  forbiddenLiterals: string[];
}

export type ExplainerResult =
  | { kind: "narration"; text: string; transport: string }
  | { kind: "validatorRejection"; reasons: string[]; raw: string }
  | { kind: "transportError"; message: string };

export interface ExplainerTransport {
  readonly label: string;
  query(req: ExplainerRequest): Promise<ExplainerResult>;
}

// ---------------------------------------------------------------------------
// Canned narrations for FakeExplainerTransport. One per role × the Owl case.
// Hardcoded so the Node canary can exercise the full pipeline without an
// LLM. Production (Tauri runtime) uses the SDK transport by default.
// ---------------------------------------------------------------------------

const FAKE_APPLICANT_NARRATION = `Your Owl Compute campus at 180 MW in Prince William County, VA is queued for a target commercial operation date of 2028-10-01 across two phases. Your internal schedule confidence, your 22% flexibility commit, and your redundancy-shift commit fold into the forecaster; the published energization band is Q3 2028 – Q2 2029 with a firmness score of 60 on the quantized scale. Your BESS and backup generation place you in Class B on the flexibility passport with a 36–72 MW band over the 2–4 h duration tier, and your site-readiness class lands at yellow.

Downstream, the utility's projection will receive the derived proofs but never your raw inputs behind them — eight private fields are kept confidential by the projection under grid-passport-policy@0.1.0. The regulator receives the same derived proofs plus the audit chain and policy evaluation hash.`;

const FAKE_UTILITY_NARRATION = `The applicant (Owl Compute) has filed a 180 MW interconnection request in Prince William County, VA, with a target commercial operation date of 2028-10-01 across two phases. The forecaster places the energization band at Q3 2028 – Q2 2029 and reports a firmness score of 60 on the quantized scale, with a yellow site-readiness class. The flexibility passport lands in Class B with a 36–72 MW band over the 2–4 h duration tier, and the expected-peak band is 108–144 MW.

Raw flex commit, redundancy shift, backup-generation nameplate, BESS nameplate, schedule confidence, and workload mix are out of scope for this projection — the utility is operating against derived proofs, not applicant self-reports. Cost-exposure class is medium. The signed disclosure bundle's payload commits every released value above to the applicant's Ed25519 key under policy grid-passport-policy@0.1.0.`;

const FAKE_REGULATOR_NARRATION = `Policy grid-passport-policy@0.1.0 was applied to project this case (Owl Compute, 180 MW, Prince William County, VA, target commercial operation 2028-10-01 across two phases) for regulator review. Of 25 classified fields, 17 are visible in this view and 8 are redacted per release policy — the privateProfile bucket is fully sealed with the reason "applicant-owned sensitive self-report, released only as derived proof." Seven derived proofs (firmness score, expected-peak band, flexibility passport, site-readiness class, energization band, cost-exposure class, top blockers list) are released in full.

The projection is a pure function of the CaseInput plus the policy; the audit chain is prevHash-linked, SHA-256, and records intake, public-evidence refresh, sealing ceremony, proof generation, policy evaluation, and role projection. The signed disclosure bundle's payload is JCS-canonicalized (RFC 8785) and signed with an Ed25519 key; third-party verification is available via @grid-passport/verifier.`;

export class FakeExplainerTransport implements ExplainerTransport {
  readonly label = "fake";

  async query(req: ExplainerRequest): Promise<ExplainerResult> {
    void req.skill;
    void req.view;
    const canned =
      req.role === "applicant"
        ? FAKE_APPLICANT_NARRATION
        : req.role === "utility"
          ? FAKE_UTILITY_NARRATION
          : FAKE_REGULATOR_NARRATION;
    return runValidator(canned, req.role, req.forbiddenLiterals, this.label);
  }
}

export class ClaudeAgentSDKExplainerTransport implements ExplainerTransport {
  readonly label = "claude-agent-sdk";

  async query(req: ExplainerRequest): Promise<ExplainerResult> {
    let invoke: (
      cmd: string,
      args?: Record<string, unknown>,
    ) => Promise<unknown>;
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
      const out = await invoke("explainer_query", {
        projectedView: JSON.stringify(req.view),
        role: req.role,
        skillSource,
      });
      if (typeof out !== "string") {
        return {
          kind: "transportError",
          message: `expected string from explainer_query, got ${typeof out}`,
        };
      }
      raw = out.trim();
    } catch (err) {
      return {
        kind: "transportError",
        message: `claude-agent-sdk: ${(err as Error).message ?? String(err)}`,
      };
    }

    return runValidator(raw, req.role, req.forbiddenLiterals, this.label);
  }
}

function runValidator(
  narration: string,
  role: Role,
  forbiddenLiterals: string[],
  transport: string,
): ExplainerResult {
  const input: NarrationInput = {
    narration,
    role: role as ExplainerRole,
    forbiddenLiterals,
  };
  try {
    const result = validateNarration(input);
    if (!result.ok) {
      return {
        kind: "validatorRejection",
        reasons: result.leaks.map(
          (l) =>
            `raw private literal "${l.literal}" appears in ${role} narration (context: …${l.context}…)`,
        ),
        raw: narration,
      };
    }
    return { kind: "narration", text: narration, transport };
  } catch (err) {
    if (err instanceof ExplainerContractViolation) {
      return {
        kind: "validatorRejection",
        reasons: [err.message],
        raw: narration,
      };
    }
    return {
      kind: "transportError",
      message: `unexpected: ${(err as Error).message}`,
    };
  }
}

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
 * Derive the forbidden-literal list for a given CaseInput. Distinctive
 * private values that should never appear verbatim in a non-applicant
 * narration. Bare small integers are omitted because they legitimately
 * appear in derived bands or audit-event counts; floats and large ints
 * are distinctive enough to catch real leaks. Mirrors the helper in
 * `packages/agents/explainer/scripts/validate_narration.ts`.
 */
export function forbiddenLiteralsFor(c: CaseInput): string[] {
  const p = c.privateProfile;
  return [
    p.internalScheduleConfidence.toString(),
    p.workloadMix.training.toString(),
    p.workloadMix.inference.toString(),
    p.backupGenMW.toString(),
  ];
}

export function defaultExplainerTransport(): ExplainerTransport {
  const flag = (
    import.meta as unknown as {
      env?: Record<string, string | undefined>;
    }
  ).env?.VITE_EXPLAINER_TRANSPORT;
  if (flag === "fake") return new FakeExplainerTransport();
  if (flag === "sdk") return new ClaudeAgentSDKExplainerTransport();
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return new ClaudeAgentSDKExplainerTransport();
  }
  return new FakeExplainerTransport();
}
