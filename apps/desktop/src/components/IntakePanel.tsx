import { useCallback, useState, type KeyboardEvent } from "react";
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
  | { kind: "querying"; prompt: string }
  | { kind: "result"; prompt: string; result: InterviewerResult };

interface TranscriptTurn {
  id: string;
  prompt: string;
  result: InterviewerResult;
}

interface IntakePanelProps {
  /** Loaded Interviewer Skill (from `skills-loader.ts`). Null if skills
   * haven't loaded yet — we disable the submit button in that case. */
  skill: LoadedSkill | null;
  /** If skill loading failed, the underlying error message. Surfaces in
   * the panel so the user sees *why* skills are unavailable instead of a
   * silent "skills not loaded". Null when load is still in flight or
   * succeeded. */
  loadError?: string | null;
  /** Called when the transport+validator round-trip produces a CaseInput. */
  onAccept: (input: CaseInput) => void;
  /** Allow swapping the transport (canary + tests inject a FakeTransport
   * directly; production uses defaultInterviewerTransport). */
  transport?: InterviewerTransport;
  /** Auto-advance into the parent view on a validated CaseInput. Landing uses
   * manual mode so the parsed draft stays visible before the user continues. */
  acceptMode?: "auto" | "manual";
}

export function IntakePanel({
  skill,
  loadError,
  onAccept,
  transport,
  acceptMode = "auto",
}: IntakePanelProps) {
  const [text, setText] = useState("");
  const [state, setState] = useState<PanelState>({ kind: "idle" });
  const [history, setHistory] = useState<TranscriptTurn[]>([]);

  const onAsk = useCallback(async () => {
    if (!skill) return;
    const prompt = text.trim();
    if (prompt.length === 0) return;
    setState({ kind: "querying", prompt });
    const t = transport ?? defaultInterviewerTransport();
    let result: InterviewerResult;
    try {
      result = await t.query(makeRequest(prompt, skill, null));
    } catch (err) {
      result = {
        kind: "transportError",
        message: (err as Error).message || "unknown transport failure",
      };
    }
    const turn: TranscriptTurn = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt,
      result,
    };
    setHistory((prev) => [...prev, turn]);
    setState({ kind: "result", prompt, result });
    setText("");
    if (result.kind === "caseInput" && acceptMode === "auto") {
      onAccept(result.value);
    }
  }, [skill, text, transport, onAccept, acceptMode]);

  const disabled =
    !skill || state.kind === "querying" || text.trim().length === 0;

  const onTextKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !disabled) {
        event.preventDefault();
        void onAsk();
      }
    },
    [disabled, onAsk],
  );

  const skillLabel = skill
    ? `skill · ${skill.frontmatter.name ?? skill.slug}`
    : loadError
      ? "skills load failed"
      : "skills loading…";
  const transportLabel = (transport ?? defaultInterviewerTransport()).label;
  const threadStatus =
    state.kind === "querying"
      ? "waiting for interviewer…"
      : history.length === 0
        ? "ready for first prompt"
        : history.at(-1)?.result.kind === "clarify"
          ? "clarification requested"
          : history.at(-1)?.result.kind === "caseInput"
            ? "validated case ready"
            : history.at(-1)?.result.kind === "transportError" ||
                history.at(-1)?.result.kind === "validatorRejection"
              ? "response blocked"
              : "session updated";
  let manualAccept: (() => void) | undefined;
  if (
    acceptMode === "manual" &&
    state.kind === "result" &&
    state.result.kind === "caseInput"
  ) {
    const acceptedValue = state.result.value;
    manualAccept = () => onAccept(acceptedValue);
  }

  return (
    <section id="intake-fresh-start" className="intake-panel">
      <div className="intake-panel-head">
        <div className="intake-heading-block">
          <div className="intake-eyebrow">interviewer console</div>
          <div className="intake-heading">
            Shape the request through a back-and-forth before it becomes a case.
          </div>
        </div>
        <div
          className={`intake-status-pill ${
            skill ? "is-ready" : loadError ? "is-error" : "is-loading"
          }`}
        >
          {skillLabel}
        </div>
      </div>

      {!skill && loadError ? (
        <div className="intake-panel-alert">
          ✘ skills loader: {loadError}
          <div className="intake-panel-alert-tip">
            tip: this usually means the Tauri resource bundle is missing or
            stale. Stop the dev server and re-run <code>pnpm desktop:dev</code> from
            the repo root, then make sure you're using the Tauri window that
            opens (not just <code>http://localhost:1420</code> in a browser).
          </div>
        </div>
      ) : null}

      <div className="intake-console">
        <div className="intake-console-bar">
          <div className="intake-console-chrome">
            <span className="intake-console-dot dot-red" />
            <span className="intake-console-dot dot-amber" />
            <span className="intake-console-dot dot-lime" />
          </div>
          <div className="intake-console-title">
            intake://interviewer.local/session
          </div>
          <div className="intake-console-meta">{transportLabel}</div>
        </div>

        <div className="intake-console-screen">
          <div className="intake-console-screen-head">
            <div className="intake-console-screen-label">conversation</div>
            <div className="intake-thread-status">{threadStatus}</div>
          </div>
          {history.length === 0 && state.kind !== "querying" ? (
            <EmptyTranscript />
          ) : (
            <div className="intake-thread">
              {history.map((turn, index) => (
                <IntakeResult
                  key={turn.id}
                  prompt={turn.prompt}
                  result={turn.result}
                  onAccept={
                    index === history.length - 1 ? manualAccept : undefined
                  }
                />
              ))}
              {state.kind === "querying" ? (
                <PendingTurn prompt={state.prompt} />
              ) : null}
            </div>
          )}
        </div>

        <div className="intake-console-input">
          <div className="intake-console-prompt-row">
            <div className="intake-console-input-label">request input</div>
            <div className="intake-console-shortcut">
              Ctrl/⌘ + Enter to send
            </div>
          </div>

          <div
            className={`intake-console-editor ${
              text.trim().length === 0 ? "is-empty" : ""
            }`}
          >
            {text.trim().length === 0 ? (
              <div className="intake-console-editor-hint" aria-hidden="true">
                <span className="intake-console-userhost">
                  applicant@grid-passport
                </span>
                <span className="intake-console-path">:~/intake</span>
                <span className="intake-console-dollar">$</span>
                <span className="intake-console-editor-hint-caret" />
              </div>
            ) : null}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onTextKeyDown}
              rows={5}
              className="intake-textarea intake-console-textarea"
              placeholder=""
            />
          </div>

          <div className="intake-actions">
            <button
              type="button"
              className="chip chip-primary"
              onClick={onAsk}
              disabled={disabled}
            >
              {state.kind === "querying" ? "asking…" : "ask interviewer"}
            </button>
            <span className="intake-note">
              Ask naturally. The interviewer will either request missing facts
              or return a structured draft.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntakeResult({
  prompt,
  result,
  onAccept,
}: {
  prompt: string;
  result: InterviewerResult;
  onAccept?: () => void;
}) {
  return (
    <div className="intake-turn">
      <TranscriptBubble speaker="you" tone="user">
        <p>{prompt}</p>
      </TranscriptBubble>
      <InterviewerResponse result={result} onAccept={onAccept} />
    </div>
  );
}

function InterviewerResponse({
  result,
  onAccept,
}: {
  result: InterviewerResult;
  onAccept?: () => void;
}) {
  if (result.kind === "caseInput") {
    return (
      <TranscriptBubble
        speaker="interviewer"
        tone="success"
        badge="validated case ready"
      >
        <p>
          Validator passed. The request is structured and ready to move into
          the work view.
        </p>
        <div className="intake-result-grid">
          <ResultCell label="organization" value={result.value.applicantOrg} />
          <ResultCell
            label="load request"
            value={`${result.value.requestedMW} MW`}
          />
          <ResultCell
            label="site"
            value={`${result.value.site.county}, ${result.value.site.state}`}
          />
          <ResultCell label="target COD" value={result.value.targetCOD} />
        </div>
        {onAccept ? (
          <div className="intake-result-actions">
            <button
              type="button"
              className="chip chip-primary"
              onClick={onAccept}
            >
              continue to work view →
            </button>
          </div>
        ) : null}
      </TranscriptBubble>
    );
  }
  if (result.kind === "clarify") {
    return <ClarifyBubble text={result.question} />;
  }
  if (result.kind === "validatorRejection") {
    return (
      <TranscriptBubble
        speaker="validator"
        tone="error"
        badge="schema mismatch"
      >
        <p>Validator rejected the response. The structured hand-off broke the write-scope contract:</p>
        <ul style={{ margin: "6px 0 0 16px" }}>
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </TranscriptBubble>
    );
  }
  return (
    <TranscriptBubble speaker="transport" tone="error" badge="request failed">
      <p>Transport error: {result.message}</p>
    </TranscriptBubble>
  );
}

/**
 * Render the Interviewer's clarify response as a chat-style bubble — one
 * speaker label up top ("interviewer ·"), then formatted prose with
 * paragraph breaks and numbered/bulleted question lists rendered as
 * actual lists rather than a single wall of text. The model often emits
 * "(1) ... (2) ... (3) ..." inline; we split those into list items so
 * each question reads as its own line.
 */
function ClarifyBubble({ text }: { text: string }) {
  const blocks = parseClarifyBlocks(text);
  return (
    <TranscriptBubble
      speaker="interviewer"
      tone="warn"
      badge="needs more detail"
    >
      {blocks.map((b, i) =>
        b.kind === "para" ? (
          <p key={i}>{b.text}</p>
        ) : (
          <ol key={i}>
            {b.items.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ol>
        ),
      )}
    </TranscriptBubble>
  );
}

function EmptyTranscript() {
  return (
    <div className="intake-thread-empty">
      <div className="intake-thread-empty-title">session opened</div>
      <div className="intake-thread-empty-copy">
        Good first prompts usually mention the site, requested MW, target COD,
        and anything you already know about flexibility, storage, or backup
        generation.
      </div>
      <div className="intake-thread-empty-rail">
        <div className="intake-thread-empty-item">
          <span className="intake-thread-empty-item-label">site</span>
          county, state, parcel, or named campus
        </div>
        <div className="intake-thread-empty-item">
          <span className="intake-thread-empty-item-label">load</span>
          requested MW, phasing, and energization target
        </div>
        <div className="intake-thread-empty-item">
          <span className="intake-thread-empty-item-label">operations</span>
          deferrable share, storage, backup generation, or test windows
        </div>
      </div>
    </div>
  );
}

function PendingTurn({ prompt }: { prompt: string }) {
  return (
    <div className="intake-turn">
      <TranscriptBubble speaker="you" tone="user">
        <p>{prompt}</p>
      </TranscriptBubble>
      <div className="intake-pending-line">
        <span className="intake-console-userhost">interviewer@local</span>
        <span className="intake-console-path">:~/session</span>
        <span className="intake-console-dollar">$</span>
        reading your request
      </div>
    </div>
  );
}

function TranscriptBubble({
  speaker,
  tone,
  badge,
  children,
}: {
  speaker: string;
  tone: "user" | "warn" | "error" | "success";
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`intake-message intake-message-${tone}`}>
      <div className="intake-message-head">
        <div className="intake-message-speaker">{speaker}</div>
        {badge ? <div className="intake-message-badge">{badge}</div> : null}
      </div>
      <div className="intake-message-body">{children}</div>
    </div>
  );
}

function ResultCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="intake-result-cell">
      <div className="intake-result-label">{label}</div>
      <div className="intake-result-value">{value}</div>
    </div>
  );
}

type ClarifyBlock =
  | { kind: "para"; text: string }
  | { kind: "list"; items: string[] };

/**
 * Heuristic split of the model's clarify text into prose paragraphs and
 * numbered lists. Looks for the inline "(1) ... (2) ... (3) ..." pattern
 * the Interviewer Skill emits and lifts those into a list. Falls back to
 * paragraph breaks on `\n\n`.
 */
export function parseClarifyBlocks(raw: string): ClarifyBlock[] {
  const text = raw.trim();
  // Find the first "(1)" marker. Everything before it is intro prose;
  // everything after is the numbered list (split on subsequent "(N)").
  const firstMarker = text.search(/\(\s*1\s*\)/);
  if (firstMarker === -1) {
    // No numbered list — split paragraphs on blank lines.
    const paras = text
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
    return paras.map((p) => ({ kind: "para" as const, text: p }));
  }
  const intro = text.slice(0, firstMarker).trim();
  const listText = text.slice(firstMarker);
  // Split on "(N)" markers; keep the numbers out of the items themselves.
  const items = listText
    .split(/\(\s*\d+\s*\)\s*/)
    .map((s) => s.trim().replace(/[;.]\s*$/, ""))
    .filter(Boolean);
  const blocks: ClarifyBlock[] = [];
  if (intro) blocks.push({ kind: "para", text: intro });
  if (items.length > 0) blocks.push({ kind: "list", items });
  return blocks;
}
