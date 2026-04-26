import * as ed from "@noble/ed25519";
import {
  base64ToBytes,
  bytesToBase64,
  jcs,
  sha256Hex,
} from "./crypto";
import type { AuditEvent } from "./audit";
import type { ProjectedView } from "./projection";
import type { Role } from "./types";

/**
 * Grid Passport disclosure bundle v1.
 *
 * Produced by the applicant's desktop app; verified by any counterparty
 * holding the applicant's pinned public key. See
 * docs/design/signed-bundle.md for the full specification.
 */

export const BUNDLE_SCHEMA = "grid-passport/bundle" as const;
export const BUNDLE_VERSION = "1.0.0" as const;
export const SIGNATURE_ALG = "Ed25519" as const;

/**
 * Bundle kinds.
 *
 *  - "disclosure"     — applicant → utility. Carries projections + audit
 *                       chain. The Act 2 export. (Default for v1.0.0
 *                       bundles that omit `kind`, for backward compat.)
 *  - "shed_request"   — utility → applicant. A signed demand-response
 *                       request. No projections (utility never holds raw
 *                       privateProfile); just the request fields.
 *  - "acknowledgment" — applicant → utility. References the shed-request
 *                       by bundleId, captures accept/decline + committed
 *                       MW. Closes the loop.
 */
export type BundleKind = "disclosure" | "shed_request" | "acknowledgment";

export interface ShedRequestPayload {
  pocket: string;            // e.g. "Loudoun-North"
  windowStart: string;       // ISO 8601
  windowEnd: string;         // ISO 8601
  totalShedMW: number;       // utility's full ask across the pocket
  recipientCaseId: string;   // which DC this allocation lands on
  recipientAllocationMW: number;
  noticeRequiredMin: number;
  creditUsd: number;
  notes?: string;
}

export interface AcknowledgmentPayload {
  shedRequestBundleId: string;   // the bundleId being ack'd
  shedRequestHash: string;       // sha256 of JCS(shed-request payload), keeps the link tamper-evident
  accepted: boolean;             // true = will deliver; false = decline
  committedMW: number;           // typically === recipientAllocationMW; can be lower if accepted-with-reduction (v0: equal or zero)
  notes?: string;
}

export interface BundleIssuer {
  publicKey: string;    // base64 of 32-byte Ed25519 public key
  keyId: string;        // first 16 hex chars of SHA-256(publicKey bytes)
  label: string;        // human label, e.g. "Loudoun County LLC — Site A"
}

export interface PolicyHash {
  rego: string;         // "sha256:<64-hex>" — hash of grid-passport.rego bytes
  runtime: string;      // "sha256:<64-hex>" — hash of JCS(POLICY table)
}

export interface BundlePayload {
  bundleId: string;
  caseId: string;
  requestId: string;
  issuedAt: string;
  validUntil: string | null;
  issuer: BundleIssuer;
  policyHash: PolicyHash;
  policyVersion: string;
  projections: Record<Role, ProjectedView>;
  auditChain: AuditEvent[];
  // Bundle kind discriminator — added in v1.1 of the bundle spec to
  // support utility→applicant `shed_request` and applicant→utility
  // `acknowledgment` flows alongside the original applicant→utility
  // `disclosure` flow. Optional for backward compat: bundles that omit
  // `kind` are treated as `disclosure` and verify identically.
  kind?: BundleKind;
  shedRequest?: ShedRequestPayload;
  acknowledgment?: AcknowledgmentPayload;
}

export interface BundleSignature {
  alg: typeof SIGNATURE_ALG;
  value: string;        // base64 of 64-byte Ed25519 signature over JCS(payload)
}

export interface DisclosureBundle {
  schema: typeof BUNDLE_SCHEMA;
  version: typeof BUNDLE_VERSION;
  payload: BundlePayload;
  signature: BundleSignature;
}

// --------------------------------------------------------------------
// Key identity helpers
// --------------------------------------------------------------------

export async function keyIdFromPublicKey(publicKey: Uint8Array): Promise<string> {
  return (await sha256Hex(publicKey)).slice(0, 16);
}

// --------------------------------------------------------------------
// Signer — used by the desktop app (or anything else with access to a
// private key). Real deployments hold the private key in the OS keychain
// and pass only bytes through Tauri IPC; this function signs whatever
// bytes it is given.
// --------------------------------------------------------------------

/**
 * Inject-a-signer interface so the desktop integration (which signs via
 * Tauri IPC → Rust keyring crate → OS keychain) doesn't have to surface
 * the raw private key in JS. Pure-TS callers can pass a `secretKey`
 * directly via `localSigner`.
 */
export interface BundleSigner {
  publicKey: Uint8Array;
  sign(message: Uint8Array): Promise<Uint8Array>;
}

/** Build a signer from a 32-byte Ed25519 secret key. */
export async function localSigner(secretKey: Uint8Array): Promise<BundleSigner> {
  const publicKey = await ed.getPublicKeyAsync(secretKey);
  return {
    publicKey,
    sign: (msg: Uint8Array) => ed.signAsync(msg, secretKey),
  };
}

// --------------------------------------------------------------------
// Build + sign
// --------------------------------------------------------------------

export interface BuildBundleInput {
  bundleId: string;
  caseId: string;
  requestId: string;
  issuedAt?: string;               // defaults to now
  validUntil?: string | null;
  issuerLabel: string;
  policyHash: PolicyHash;
  policyVersion: string;
  // For `kind: "disclosure"` (the original applicant→utility path), both
  // are required and carry the case projection + audit chain. For
  // `kind: "shed_request"` and `kind: "acknowledgment"` (utility-side and
  // applicant-side coordination messages), neither is meaningful — the
  // utility never holds raw projections, and the message itself is the
  // payload. signBundle defaults both to empty values when absent.
  projections?: Record<Role, ProjectedView>;
  auditChain?: AuditEvent[];
  kind?: BundleKind;
  shedRequest?: ShedRequestPayload;
  acknowledgment?: AcknowledgmentPayload;
}

export async function signBundle(
  input: BuildBundleInput,
  signer: BundleSigner,
): Promise<DisclosureBundle> {
  const publicKey = signer.publicKey;
  const keyId = await keyIdFromPublicKey(publicKey);

  const payload: BundlePayload = {
    bundleId: input.bundleId,
    caseId: input.caseId,
    requestId: input.requestId,
    issuedAt: input.issuedAt ?? new Date().toISOString(),
    validUntil: input.validUntil ?? null,
    issuer: {
      publicKey: bytesToBase64(publicKey),
      keyId,
      label: input.issuerLabel,
    },
    policyHash: input.policyHash,
    policyVersion: input.policyVersion,
    projections: input.projections ?? ({} as Record<Role, ProjectedView>),
    auditChain: input.auditChain ?? [],
    ...(input.kind !== undefined ? { kind: input.kind } : {}),
    ...(input.shedRequest !== undefined ? { shedRequest: input.shedRequest } : {}),
    ...(input.acknowledgment !== undefined ? { acknowledgment: input.acknowledgment } : {}),
  };

  const canonical = new TextEncoder().encode(jcs(payload));
  const signature = await signer.sign(canonical);
  if (signature.length !== 64) {
    throw new Error(
      `signer returned ${signature.length}-byte signature; expected 64 for Ed25519`,
    );
  }

  return {
    schema: BUNDLE_SCHEMA,
    version: BUNDLE_VERSION,
    payload,
    signature: {
      alg: SIGNATURE_ALG,
      value: bytesToBase64(signature),
    },
  };
}

/**
 * Compute the canonical hash of a payload — used by acknowledgments to
 * tamper-evidently reference the shed-request they're acking. Output is
 * `"sha256:<64-hex>"` to match the rest of the spec's hash format.
 */
export async function payloadHash<T>(payload: T): Promise<string> {
  return `sha256:${await sha256Hex(jcs(payload))}`;
}

// --------------------------------------------------------------------
// Bundle ID — ULID-style monotonic identifier (Crockford base32,
// 10 time chars + 16 random chars). We don't need strict ULID spec
// conformance, but we want sortability and uniqueness without a
// heavyweight dep.
// --------------------------------------------------------------------

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newBundleId(now: number = Date.now()): string {
  let t = now;
  let timePart = "";
  for (let i = 0; i < 10; i++) {
    timePart = CROCKFORD[t % 32] + timePart;
    t = Math.floor(t / 32);
  }
  const rand = new Uint8Array(16);
  globalThis.crypto.getRandomValues(rand);
  let randPart = "";
  for (let i = 0; i < 16; i++) randPart += CROCKFORD[rand[i] % 32];
  return `bundle_${timePart}${randPart}`;
}

// --------------------------------------------------------------------
// Re-exports useful to verifier / consumers
// --------------------------------------------------------------------

export { base64ToBytes, bytesToBase64, jcs, sha256Hex };
