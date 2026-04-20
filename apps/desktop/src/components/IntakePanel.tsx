import { useCallback, useState } from "react";
import type { CaseInput } from "@grid-passport/core/types";
import type { LoadedSkill } from "../lib/skills-loader";
import {
  defaultInterviewerTransport,
  makeRequest,
  type InterviewerResult,
  type InterviewerTransport,
} from "../lib/interviewer-transport";

/**
 * Intake panel — free-form prose → Interviewer → validated CaseInput.
 *
 * Track 2.1 of sprint 2026-04-20. The transport seam is pluggable;
 * `defaultInterviewerTransport()` returns `FakeTransport` in v0. When
 * 2.1-polish wires the real Claude Agent SDK path, this component doesn't
 * change — only the transport factory does.
 *
 * Every accepted CaseInput has passed
 * `validateInterviewerOutput` from `@grid-passport/agents/interviewer/
 * validator` at the transport layer. That's the research-thesis §3.2
 * write-scope contract: no path from model output to React state skips
 * the structural check.
 */

type PanelState =
  | { kind: "idle" }
  | { kind: "querying" }
  | { kind: "result"; result: InterviewerResult };

interface IntakePanelProps {
  /** Loaded Interviewer Skill (from `skills-loader.ts`). Null if skills
   * haven't loaded yet — we disable the submit button in that case. */
  skill: LoadedSkill | null;
  /** Called when the transport+validator round-trip produces a CaseInput. */
  onAccept: (input: CaseInput) => void;
  /** Allow swapping the transport (canary + tests inject a FakeTransport
   * directly; production uses defaultInterviewerTransport). */
  transport?: InterviewerTransport;
}

export function IntakePanel({
  skill,
  onAccept,
  transport,
}: IntakePanelProps) {
  const [text, setText] = useState("");
  const [state, setState] = useState<PanelState>({ kind: "idle" });

  const onAsk = useCallback(async () => {
    if (!skill) return;
    setState({ kind: "querying" });
    const t = transport ?? defaultInterviewerTransport();
    const result = await t.query(makeRequest(text, skill, null));
    setState({ kind: "result", result });
    if (result.kind === "caseInput") {
      onAccept(result.value);
    }
  }, [skill, text, transport, onAccept]);

  const disabled =
    !skill || state.kind === "querying" || text.trim().length === 0;

  return (
    <section
      className="intake-panel"
      style={{
        border: "1px solid var(--border)",
        background: "var(--panel-soft, #0f0f0f)",
        padding: 14,
        marginTop: 12,
      }}
    >
      <div
        className="intake-title"
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--sky)",
          marginBottom: 10,
        }}
      >
        intake · interviewer
        {skill ? (
          <span
            style={{ color: "var(--ink-mute, #525252)", marginLeft: 10 }}
          >
            · skill: {skill.frontmatter.name ?? skill.slug}
          </span>
        ) : (
          <span
            style={{ color: "var(--ink-mute, #525252)", marginLeft: 10 }}
          >
            · skills not loaded
          </span>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder='Describe the request in your own words — "180MW at Prince William County, target 2028, about 20% deferrable workload…"'
        style={{
          width: "100%",
          fontFamily: "var(--sans)",
          fontSize: 12,
          background: "var(--bg)",
          color: "var(--ink)",
          border: "1px solid var(--border)",
          padding: 10,
          resize: "vertical",
        }}
      />

      <div
        style={{
          marginTop: 8,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          className="chip chip-primary"
          onClick={onAsk}
          disabled={disabled}
        >
          {state.kind === "querying" ? "asking…" : "ask interviewer"}
        </button>
        <span
          className="mono"
          style={{ color: "var(--ink-mute, #525252)", fontSize: 11 }}
        >
          transport · {(transport ?? defaultInterviewerTransport()).label}
        </span>
      </div>

      {state.kind === "result" ? (
        <IntakeResult result={state.result} />
      ) : null}
    </section>
  );
}

function IntakeResult({ result }: { result: InterviewerResult }) {
  const common = {
    marginTop: 10,
    padding: 10,
    border: "1px solid var(--border)",
    fontFamily: "var(--mono)",
    fontSize: 11,
  } as const;
  if (result.kind === "caseInput") {
    return (
      <div
        style={{
          ...common,
          borderColor: "var(--lime, #a3e635)",
          color: "var(--lime, #a3e635)",
        }}
      >
        ✔ validator passed · {result.value.applicantOrg} · {result.value.requestedMW} MW ·{" "}
        {result.value.site.county}, {result.value.site.state} · status{" "}
        {result.value.status} · merged into work view
      </div>
    );
  }
  if (result.kind === "clarify") {
    return (
      <div
        style={{
          ...common,
          borderColor: "var(--amber, #f59e0b)",
          color: "var(--amber, #f59e0b)",
        }}
      >
        ? interviewer needs more: {result.question}
      </div>
    );
  }
  if (result.kind === "validatorRejection") {
    return (
      <div
        style={{
          ...common,
          borderColor: "var(--rose, #fb7185)",
          color: "var(--rose, #fb7185)",
        }}
      >
        ✘ validator rejected — write-scope contract violated:
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
        ...common,
        borderColor: "var(--rose, #fb7185)",
        color: "var(--rose, #fb7185)",
      }}
    >
      ✘ transport error: {result.message}
    </div>
  );
}
