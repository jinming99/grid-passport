/**
 * Pure Explainer-narration validator (browser-safe).
 *
 * The Explainer reads a `ProjectedView` + `Role` and emits prose. By
 * construction, it is never handed raw `CaseInput.privateProfile` — the
 * projection layer already stripped sealed values before the narration
 * started. This validator is the empirical counter-check that the Skill
 * didn't invent or pull in a sealed value from somewhere else: given the
 * narration text + the case's raw private literals, it asserts no raw
 * literal appears for non-applicant roles.
 *
 * Track 2.2 of sprint 2026-04-20. Pure + browser-safe so the Tauri webview
 * can import it (`@grid-passport/agents/explainer/validator`) and gate
 * every narration emission before it reaches React state, in parallel to
 * how the Interviewer validator gates CaseInput emissions.
 *
 * Checks:
 *   - narration is a non-empty string
 *   - `role` is one of applicant / utility / regulator
 *   - for non-applicant roles: no literal from `forbiddenLiterals` appears
 *     verbatim in the narration text (caller picks which literals to
 *     enforce — the validator is a string-contains gate, not a semantic
 *     one; distinguishing false-positive-prone integers from distinctive
 *     floats is the caller's responsibility)
 *
 * The read-scope contract is enforced upstream by the projection + by the
 * Skill's trust-constraint checklist; this validator is the empirical
 * tripwire. For applicant narrations, no leak check fires — the applicant
 * authored the data and may legitimately read it back.
 */

export type ExplainerRole = "applicant" | "utility" | "regulator";

export class ExplainerContractViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExplainerContractViolation";
  }
}

export interface NarrationInput {
  narration: string;
  role: string;
  /**
   * Raw private-profile literals (as strings) that MUST NOT appear in the
   * narration for non-applicant roles. Caller picks the set — e.g., the
   * Owl fixture's caller passes `["0.68", "0.55", "0.45", "140"]`,
   * skipping bare small integers like "4" or "11" that legitimately
   * appear in derived bands or audit-event counts. Applicant narrations
   * ignore this list (the applicant authored the data).
   */
  forbiddenLiterals: string[];
}

export interface LeakReport {
  literal: string;
  /** ~60 chars of narration around the leak, for debugging. */
  context: string;
}

export interface ValidationResult {
  ok: boolean;
  leaks: LeakReport[];
}

const ROLES: readonly ExplainerRole[] = [
  "applicant",
  "utility",
  "regulator",
] as const;

function isRole(v: string): v is ExplainerRole {
  return (ROLES as readonly string[]).includes(v);
}

/**
 * Validate an Explainer narration. Throws `ExplainerContractViolation` on
 * the first structural violation (empty narration, unknown role). Returns
 * a `{ok, leaks}` result for the leak-scan so callers can report every
 * leak at once rather than unwinding them one at a time.
 */
export function validateNarration(input: NarrationInput): ValidationResult {
  if (typeof input.narration !== "string" || input.narration.trim().length === 0) {
    throw new ExplainerContractViolation(
      "narration must be a non-empty string",
    );
  }
  if (!isRole(input.role)) {
    throw new ExplainerContractViolation(
      `unknown role "${input.role}"; Grid Passport defines three projections: ${ROLES.join(" / ")}`,
    );
  }

  // Applicant sees all own data; no leak check.
  if (input.role === "applicant") {
    return { ok: true, leaks: [] };
  }

  const leaks: LeakReport[] = [];
  for (const lit of input.forbiddenLiterals) {
    if (lit.length === 0) continue; // empty string would match everywhere
    const idx = input.narration.indexOf(lit);
    if (idx < 0) continue;
    const start = Math.max(0, idx - 30);
    const end = Math.min(input.narration.length, idx + lit.length + 30);
    leaks.push({
      literal: lit,
      context: input.narration.slice(start, end),
    });
  }
  return { ok: leaks.length === 0, leaks };
}

/**
 * Convenience wrapper that throws on a leak. Use when the caller wants the
 * "valid-or-halt" surface that mirrors `validateInterviewerOutput`. Returns
 * the original narration string on success so callers can chain through
 * state.
 */
export function validateNarrationOrThrow(input: NarrationInput): string {
  const result = validateNarration(input);
  if (!result.ok) {
    const summary = result.leaks
      .map((l) => `"${l.literal}" in "${l.context}"`)
      .join("; ");
    throw new ExplainerContractViolation(
      `raw private literal(s) leaked into ${input.role} narration: ${summary}`,
    );
  }
  return input.narration;
}
