import { useCallback, useEffect, useState } from "react";
import type { DisclosureBundle, ShedRequestPayload } from "@grid-passport/core/bundle";
import {
  buildAndSignShedRequest,
  exportShedRequest,
} from "../lib/shed-export";
import { utilityPublicKeyB64 } from "../lib/utility-signer";
import { HandoffCard } from "./HandoffCard";

/**
 * Dominion-side shed-request composer.
 *
 * Renders below the verified disclosure projection so the act flows
 * naturally: utility verifies Owl's bundle → composes a request →
 * signs + exports → handoff card with Dominion's pubkey + path so
 * Owl's binary can pin and verify.
 *
 * v0 scope: the form, the sign, the file export, the handoff card.
 * The "Owl receives + acks" half lives on the desktop side (separate
 * inbox component), not here.
 */

interface Props {
  /** caseId of the disclosure currently open (used as the recipient handle). */
  recipientCaseId: string;
  /** requestId of the original disclosure (links the shed-request back to a case). */
  recipientRequestId: string;
  /** Issuer label used to stamp the signed bundle (e.g., "Dominion Energy · Loudoun-North"). */
  issuerLabel?: string;
  /** Recipient applicant org, for display (read from disclosure bundle.issuer.label). */
  recipientLabel?: string;
}

type State =
  | { kind: "idle" }
  | { kind: "signing" }
  | {
      kind: "exported";
      path: string;
      pubkey: string;
      keyId: string;
      bundle: DisclosureBundle;
    }
  | { kind: "error"; message: string };

const DEFAULT_POCKET = "Loudoun-North";
const DEFAULT_TOTAL_SHED_MW = 200;
const DEFAULT_ALLOCATION_MW = 30;
const DEFAULT_NOTICE_MIN = 90;
const DEFAULT_CREDIT_USD = 1200;

// Default window: next Sunday 02:00 ET → 06:00 ET. Picked at module
// load so the form has plausible values without forcing the user to
// pick dates manually.
function defaultWindow(): { start: string; end: string } {
  const now = new Date();
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  const sunday = new Date(now);
  sunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  // 02:00 ET ≈ 06:00 UTC (assumes EDT). Demo doesn't need DST precision.
  sunday.setUTCHours(6, 0, 0, 0);
  const start = sunday.toISOString();
  const end = new Date(sunday.getTime() + 4 * 60 * 60 * 1000).toISOString();
  return { start, end };
}

export function ComposeShedRequest({
  recipientCaseId,
  recipientRequestId,
  issuerLabel = "Dominion Energy · Loudoun-North",
  recipientLabel = "applicant",
}: Props) {
  const win = defaultWindow();
  const [pocket, setPocket] = useState(DEFAULT_POCKET);
  const [totalShedMW, setTotalShedMW] = useState(DEFAULT_TOTAL_SHED_MW);
  const [allocationMW, setAllocationMW] = useState(DEFAULT_ALLOCATION_MW);
  const [noticeMin, setNoticeMin] = useState(DEFAULT_NOTICE_MIN);
  const [creditUsd, setCreditUsd] = useState(DEFAULT_CREDIT_USD);
  const [windowStart, setWindowStart] = useState(toLocalInputValue(win.start));
  const [windowEnd, setWindowEnd] = useState(toLocalInputValue(win.end));
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [pubkey, setPubkey] = useState<string>("");

  useEffect(() => {
    void utilityPublicKeyB64().then(setPubkey).catch(() => undefined);
  }, []);

  const onSign = useCallback(async () => {
    setState({ kind: "signing" });
    try {
      const startIso = fromLocalInputValue(windowStart);
      const endIso = fromLocalInputValue(windowEnd);
      if (!startIso || !endIso) {
        setState({ kind: "error", message: "window start/end must be valid datetimes" });
        return;
      }
      const sr: ShedRequestPayload = {
        pocket: pocket.trim() || DEFAULT_POCKET,
        windowStart: startIso,
        windowEnd: endIso,
        totalShedMW,
        recipientCaseId,
        recipientAllocationMW: allocationMW,
        noticeRequiredMin: noticeMin,
        creditUsd,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      const bundle = await buildAndSignShedRequest({
        caseId: recipientCaseId,
        requestId: recipientRequestId,
        issuerLabel,
        shedRequest: sr,
      });
      const result = await exportShedRequest(bundle);
      if (!result) {
        setState({ kind: "idle" });
        return;
      }
      setState({
        kind: "exported",
        path: result.path,
        pubkey: bundle.payload.issuer.publicKey,
        keyId: bundle.payload.issuer.keyId,
        bundle,
      });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  }, [
    pocket,
    totalShedMW,
    allocationMW,
    noticeMin,
    creditUsd,
    windowStart,
    windowEnd,
    notes,
    recipientCaseId,
    recipientRequestId,
    issuerLabel,
  ]);

  return (
    <section className="card" style={{ borderColor: "var(--amber, #f59e0b)" }}>
      <div className="card-title" style={{ color: "var(--amber, #f59e0b)" }}>
        compose shed request
      </div>
      <div className="card-body">
        <p style={{ marginTop: 0, color: "var(--ink-mute)" }}>
          Sign a demand-response request to <strong>{recipientLabel}</strong>.
          The bundle is sealed with this binary's pubkey ({pubkey ? `${pubkey.slice(0, 18)}…` : "loading…"}).
          Ship the file + pubkey to the applicant; their binary verifies, displays, and ack-signs.
        </p>

        <Grid>
          <Field label="pocket">
            <input
              type="text"
              value={pocket}
              onChange={(e) => setPocket(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="total shed (MW)">
            <input
              type="number"
              min={0}
              value={totalShedMW}
              onChange={(e) => setTotalShedMW(Number(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Field label="this DC's share (MW)">
            <input
              type="number"
              min={0}
              max={totalShedMW}
              value={allocationMW}
              onChange={(e) => setAllocationMW(Number(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Field label="notice required (min)">
            <input
              type="number"
              min={0}
              value={noticeMin}
              onChange={(e) => setNoticeMin(Number(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Field label="credit (USD)">
            <input
              type="number"
              min={0}
              value={creditUsd}
              onChange={(e) => setCreditUsd(Number(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Field label="window start (local)">
            <input
              type="datetime-local"
              value={windowStart}
              onChange={(e) => setWindowStart(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="window end (local)">
            <input
              type="datetime-local"
              value={windowEnd}
              onChange={(e) => setWindowEnd(e.target.value)}
              style={inputStyle}
            />
          </Field>
        </Grid>

        <Field label="notes (optional)">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='e.g. "pre-event coordination call at 13:00 Friday"'
            style={inputStyle}
          />
        </Field>

        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={onSign}
            disabled={state.kind === "signing"}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              padding: "8px 14px",
              background: "transparent",
              color: "var(--amber, #f59e0b)",
              border: "1px solid var(--amber, #f59e0b)",
              cursor: state.kind === "signing" ? "not-allowed" : "pointer",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {state.kind === "signing"
              ? "signing…"
              : "sign + export shed-request.json →"}
          </button>
          {state.kind === "error" ? (
            <span
              className="mono"
              style={{ color: "var(--rose, #fb7185)", fontSize: 11 }}
            >
              ✘ {state.message}
            </span>
          ) : null}
        </div>

        {state.kind === "exported" ? (
          <HandoffCard
            headline="shed-request signed and written"
            path={state.path}
            issuerPublicKey={state.pubkey}
            issuerKeyId={state.keyId}
            handoffLine="hand off to the applicant binary →"
            instructions={
              <>
                On the applicant's binary, paste the pubkey above into the{" "}
                <em>inbox · utility messages</em> panel and click{" "}
                <em>open shed-request.json →</em>. The applicant verifies the
                signature locally, sees the request as a card, and ack-signs
                in reply.
              </>
            }
          />
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "10px 14px",
        margin: "8px 0",
      }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "var(--mono)",
  fontSize: 11,
  background: "var(--bg)",
  color: "var(--ink)",
  border: "1px solid var(--border)",
  padding: 8,
  boxSizing: "border-box",
};

// ---------------------------------------------------------------------------
// Datetime helpers — `<input type="datetime-local">` produces "YYYY-MM-DDTHH:MM"
// without timezone. We assume local time and convert to ISO 8601 UTC.
// ---------------------------------------------------------------------------

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(local: string): string | null {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
