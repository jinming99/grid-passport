import { useCallback, useState } from "react";
import type { ShedRequestPayload } from "@grid-passport/core/bundle";
import type { VerifyResult } from "@grid-passport/verifier";
import { loadAndVerifyUtilityMessage } from "../lib/utility-message-loader";

/**
 * Owl-side inbox for utility coordination messages.
 *
 * Mirrors the utility binary's `App.tsx` open-bundle flow:
 *   1. Applicant pastes the utility's pinned pubkey
 *   2. Click "open" → file picker → select shed-request.json
 *   3. Verify locally; if signature checks out and issuer matches the
 *      pinned key, render the request as a card
 *
 * v0 scope: receive + display a `shed_request` bundle. The ack-sign half
 * (closing the loop with a signed acknowledgment back to Dominion) is
 * the next iteration.
 */

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "loaded";
      path: string;
      verify: VerifyResult;
    }
  | { kind: "error"; message: string };

export function UtilityInbox() {
  const [pubKeyInput, setPubKeyInput] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const onOpen = useCallback(async () => {
    setState({ kind: "loading" });
    const result = await loadAndVerifyUtilityMessage(pubKeyInput);
    if (result.kind === "cancelled") {
      setState({ kind: "idle" });
      return;
    }
    if (result.kind === "error") {
      setState({ kind: "error", message: result.message });
      return;
    }
    setState({ kind: "loaded", path: result.path, verify: result.verify });
  }, [pubKeyInput]);

  const canOpen = pubKeyInput.trim().length > 0 && state.kind !== "loading";

  return (
    <section
      className="utility-inbox"
      style={{
        margin: "12px 0",
        padding: 14,
        border: "1px solid var(--border)",
        borderLeft: "2px solid var(--amber, #f59e0b)",
        background: "var(--panel-soft, #0f0f0f)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--amber, #f59e0b)",
          marginBottom: 10,
        }}
      >
        inbox · utility messages
        <span
          style={{
            color: "var(--ink-mute, #525252)",
            marginLeft: 10,
            textTransform: "none",
            letterSpacing: "0.04em",
          }}
        >
          · paste utility pubkey, open signed shed-request
        </span>
      </div>

      <label
        style={{
          display: "block",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 6,
        }}
      >
        utility public key (base64, 32-byte Ed25519)
      </label>
      <input
        type="text"
        value={pubKeyInput}
        onChange={(e) => setPubKeyInput(e.target.value)}
        placeholder="paste Dominion pubkey from utility binary's handoff card…"
        style={{
          width: "100%",
          fontFamily: "var(--mono)",
          fontSize: 11,
          background: "var(--bg)",
          color: "var(--ink)",
          border: "1px solid var(--border)",
          padding: 10,
          boxSizing: "border-box",
        }}
      />

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          onClick={onOpen}
          disabled={!canOpen}
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            padding: "8px 14px",
            background: "transparent",
            color: "var(--amber, #f59e0b)",
            border: "1px solid var(--amber, #f59e0b)",
            cursor: canOpen ? "pointer" : "not-allowed",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {state.kind === "loading" ? "verifying…" : "open shed-request.json →"}
        </button>
      </div>

      {state.kind === "error" ? (
        <div
          style={{
            marginTop: 10,
            padding: 8,
            border: "1px solid var(--rose, #fb7185)",
            color: "var(--rose, #fb7185)",
            fontFamily: "var(--mono)",
            fontSize: 11,
          }}
        >
          ✘ {state.message}
        </div>
      ) : null}

      {state.kind === "loaded" ? (
        <ShedRequestView path={state.path} verify={state.verify} />
      ) : null}
    </section>
  );
}

function ShedRequestView({
  path,
  verify,
}: {
  path: string;
  verify: VerifyResult;
}) {
  if (!verify.ok || !verify.payload) {
    return (
      <div
        style={{
          marginTop: 10,
          padding: 10,
          border: "1px solid var(--rose, #fb7185)",
          color: "var(--rose, #fb7185)",
          fontFamily: "var(--mono)",
          fontSize: 11,
        }}
      >
        ✘ rejected ·{" "}
        <span style={{ color: "var(--ink-mute)" }} title={path}>
          source · {path}
        </span>
        <ul style={{ margin: "8px 0 0 18px" }}>
          {verify.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    );
  }

  const p = verify.payload;
  const kind = p.kind ?? "disclosure";
  const sr = p.shedRequest;

  if (kind !== "shed_request" || !sr) {
    return (
      <div
        style={{
          marginTop: 10,
          padding: 10,
          border: "1px solid var(--amber, #f59e0b)",
          color: "var(--amber, #f59e0b)",
          fontFamily: "var(--mono)",
          fontSize: 11,
        }}
      >
        bundle verified, but kind is "{kind}" — expected "shed_request" in the inbox.
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid var(--lime, #a3e635)",
        background: "rgba(163, 230, 53, 0.04)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        lineHeight: 1.6,
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--lime, #a3e635)",
          marginBottom: 8,
        }}
      >
        shed request · signed ✓
        <span
          style={{
            color: "var(--ink-mute, #888)",
            marginLeft: 10,
            textTransform: "none",
            letterSpacing: "0.04em",
          }}
        >
          · from {p.issuer.label || "utility"} · keyId {p.issuer.keyId}
        </span>
      </div>

      <Row label="pocket" value={sr.pocket} />
      <Row
        label="window"
        value={`${fmtDate(sr.windowStart)} → ${fmtDate(sr.windowEnd)}`}
      />
      <Row label="total ask" value={`${sr.totalShedMW} MW (across pocket)`} />
      <Row
        label="your share"
        value={`${sr.recipientAllocationMW} MW`}
        highlight
      />
      <Row label="notice" value={`${sr.noticeRequiredMin} min`} />
      <Row label="credit" value={`$${sr.creditUsd.toLocaleString()}`} />
      {sr.notes ? <Row label="notes" value={sr.notes} /> : null}

      <div
        style={{
          marginTop: 10,
          color: "var(--ink-mute)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
        title={path}
      >
        source · {path}
      </div>

      <div
        style={{
          marginTop: 10,
          fontFamily: "var(--sans)",
          fontSize: 11.5,
          color: "var(--ink-mute, #888)",
          lineHeight: 1.55,
        }}
      >
        Acknowledge or decline by replying with a signed{" "}
        <code className="mono">acknowledgment</code> bundle. (Ack-sign UI is
        the next iteration; for now this card is the receive-and-verify
        endpoint.)
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span style={{ color: "var(--ink-mute)", minWidth: 90 }}>{label}</span>
      <span style={{ color: highlight ? "var(--lime, #a3e635)" : "var(--ink)" }}>
        {value}
      </span>
    </div>
  );
}

function fmtDate(iso: string): string {
  return iso.replace(/T(\d{2}:\d{2}):\d{2}(\.\d+)?Z$/, " $1Z");
}

// Re-export for callers that want to render a ShedRequest card from a raw payload (not yet used).
export type { ShedRequestPayload };
