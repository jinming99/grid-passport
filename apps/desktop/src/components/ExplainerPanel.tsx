import { useCallback, useState } from "react";
import type { CaseInput, Role } from "@grid-passport/core/types";
import type { ProjectedView } from "@grid-passport/core/projection";
import type { LoadedSkill } from "../lib/skills-loader";
import {
  defaultExplainerTransport,
  forbiddenLiteralsFor,
  type ExplainerResult,
  type ExplainerTransport,
} from "../lib/explainer-transport";

/**
 * Explainer panel — renders a role-conditioned narration of a
 * `ProjectedView`, validated against the raw CaseInput's forbidden
 * literals before it hits the DOM. Track 2.2-polish.
 *
 * The panel is content-agnostic about the transport (Fake or real SDK).
 * `defaultExplainerTransport()` picks at runtime. The validator gates
 * every emission: a non-applicant narration that leaks a raw private
 * value surfaces as `validatorRejection` with actionable text, not as
 * quietly-rendered prose.
 */

type PanelState =
  | { kind: "idle" }
  | { kind: "querying" }
  | { kind: "result"; result: ExplainerResult };

interface ExplainerPanelProps {
  view: ProjectedView;
  role: Role;
  caseInput: CaseInput;
  skill: LoadedSkill | null;
  transport?: ExplainerTransport;
}

export function ExplainerPanel({
  view,
  role,
  caseInput,
  skill,
  transport,
}: ExplainerPanelProps) {
  const [state, setState] = useState<PanelState>({ kind: "idle" });

  const onAsk = useCallback(async () => {
    if (!skill) return;
    setState({ kind: "querying" });
    const t = transport ?? defaultExplainerTransport();
    const result = await t.query({
      view,
      role,
      skill,
      forbiddenLiterals: forbiddenLiteralsFor(caseInput),
    });
    setState({ kind: "result", result });
  }, [skill, transport, view, role, caseInput]);

  const disabled = !skill || state.kind === "querying";

  return (
    <section
      className="explainer-panel"
      style={{
        border: "1px solid var(--border)",
        background: "var(--panel-soft, #0f0f0f)",
        padding: 12,
        marginTop: 10,
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--sky)",
          marginBottom: 8,
        }}
      >
        <span>explainer · {role}</span>
        {!skill ? (
          <span style={{ color: "var(--ink-mute, #525252)" }}>
            skill not loaded
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className="chip"
        onClick={onAsk}
        disabled={disabled}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          padding: "6px 10px",
          background: "transparent",
          color: "var(--ink)",
          border: "1px solid var(--border)",
          cursor: disabled ? "not-allowed" : "pointer",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {state.kind === "querying" ? "narrating…" : `narrate ${role} view`}
      </button>

      {state.kind === "result" ? (
        <ExplainerResultView result={state.result} />
      ) : null}
    </section>
  );
}

function ExplainerResultView({ result }: { result: ExplainerResult }) {
  if (result.kind === "narration") {
    return (
      <div
        style={{
          marginTop: 8,
          padding: 10,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          whiteSpace: "pre-wrap",
          color: "var(--ink-dim, #a3a3a3)",
          lineHeight: 1.5,
        }}
      >
        {result.text}
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--ink-mute, #525252)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          validator · ok · transport · {result.transport}
        </div>
      </div>
    );
  }
  if (result.kind === "validatorRejection") {
    return (
      <div
        style={{
          marginTop: 8,
          padding: 10,
          border: "1px solid var(--rose, #fb7185)",
          color: "var(--rose, #fb7185)",
          fontFamily: "var(--mono)",
          fontSize: 11,
        }}
      >
        ✘ validator rejected — read-scope contract violated:
        <ul style={{ margin: "6px 0 0 16px" }}>
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div
      style={{
        marginTop: 8,
        padding: 10,
        border: "1px solid var(--rose, #fb7185)",
        color: "var(--rose, #fb7185)",
        fontFamily: "var(--mono)",
        fontSize: 11,
      }}
    >
      ✘ transport error: {result.message}
    </div>
  );
}
