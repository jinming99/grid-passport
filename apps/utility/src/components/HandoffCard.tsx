import { useCallback, useState } from "react";

/**
 * HandoffCard — the canonical "your bundle was signed, here's what to do next"
 * card. Shown after any successful sign-and-export: the disclosure flow on
 * Owl's side (Act 2), the shed-request flow on Dominion's side (Act 3), and
 * any future signed-message flow.
 *
 * Three pieces a counterparty needs to verify the signed file in their own
 * binary:
 *   1. the file path (so they can find it),
 *   2. the issuer public key (to paste into their pinning input),
 *   3. the keyId fingerprint (visual confirmation that the same key
 *      landed at both ends).
 *
 * All three are inline-copyable. Wording is parameterized so the same
 * component can describe different signed kinds + counterparty binaries.
 *
 * Note: this file is duplicated byte-for-byte in apps/utility/src/components
 * because the two Tauri apps don't share a workspace UI package. Keep the
 * two copies in lockstep — drift breaks the visual symmetry the demo's
 * "key-was-signed" pattern depends on.
 */

export interface HandoffCardProps {
  /** Headline tag, e.g., "bundle written" or "shed-request signed and written". */
  headline: string;
  /** Path of the file that was just written. */
  path: string;
  /** Base64 issuer public key. */
  issuerPublicKey: string;
  /** keyId fingerprint (first 16 hex chars of sha256(pubkey)). */
  issuerKeyId: string;
  /** Right-arrow line, e.g., "hand off to the utility binary →". */
  handoffLine: string;
  /** Instructions paragraph (sans-serif). */
  instructions: React.ReactNode;
}

export function HandoffCard({
  headline,
  path,
  issuerPublicKey,
  issuerKeyId,
  handoffLine,
  instructions,
}: HandoffCardProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard blocked — leave the value selectable instead.
    }
  }, []);

  return (
    <div
      className="status-line status-ok"
      style={{
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        padding: 12,
        border: "1px solid var(--lime, #a3e635)",
        background: "rgba(163, 230, 53, 0.04)",
      }}
    >
      <div style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
        ✔ {headline} ·{" "}
        <span
          className="mono"
          style={{ color: "var(--ink)" }}
          title={path}
        >
          {path}
        </span>
        <button
          type="button"
          className="chip"
          style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px" }}
          onClick={() => copy("path", path)}
        >
          {copied === "path" ? "copied ✓" : "copy path"}
        </button>
      </div>

      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          color: "var(--ink-mute, #888)",
          letterSpacing: "0.06em",
          marginTop: 4,
        }}
      >
        {handoffLine}
      </div>

      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <span style={{ color: "var(--ink-mute)", minWidth: 84 }}>pubkey</span>
        <code
          style={{
            flex: 1,
            wordBreak: "break-all",
            background: "var(--bg)",
            color: "var(--ink)",
            padding: "4px 8px",
            border: "1px solid var(--border)",
          }}
        >
          {issuerPublicKey}
        </code>
        <button
          type="button"
          className="chip chip-primary"
          style={{ fontSize: 10, padding: "3px 10px" }}
          onClick={() => copy("pubkey", issuerPublicKey)}
        >
          {copied === "pubkey" ? "copied ✓" : "copy"}
        </button>
      </div>

      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "var(--ink-mute)", minWidth: 84 }}>keyId</span>
        <code style={{ color: "var(--ink)" }}>{issuerKeyId}</code>
        <span style={{ color: "var(--ink-mute, #525252)" }}>
          (visual fingerprint — should match the counterparty after verify)
        </span>
      </div>

      <div
        style={{
          fontFamily: "var(--sans)",
          fontSize: 11.5,
          color: "var(--ink-mute, #888)",
          marginTop: 4,
          lineHeight: 1.55,
        }}
      >
        {instructions}
      </div>
    </div>
  );
}
