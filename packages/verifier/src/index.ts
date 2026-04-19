/**
 * @grid-passport/verifier — standalone disclosure-bundle verifier.
 *
 * Runtime deps: @noble/ed25519 only. All canonicalization, hashing, and
 * base64 primitives are inlined here so a utility engineer auditing
 * what-they-trust has a single file to read. Design rationale in
 * docs/design/signed-bundle.md §7.
 *
 * Conforms to Grid Passport disclosure bundle v1.0.0 spec.
 */

import * as ed from "@noble/ed25519";
import type {
  DisclosureBundle,
  BundlePayload,
  PolicyHash,
} from "@grid-passport/core/bundle";
import type { AuditEvent } from "@grid-passport/core/audit";

export const SUPPORTED_SCHEMA = "grid-passport/bundle";
export const SUPPORTED_MAJOR = 1;
export const SUPPORTED_ALG = "Ed25519";

export interface VerifyResult {
  ok: boolean;
  reasons: string[];
  payload?: BundlePayload;
  policyHash?: PolicyHash;
}

// --------------------------------------------------------------------
// Inlined primitives — kept local so the verifier's runtime trust
// surface is exactly @noble/ed25519 + this file.
// --------------------------------------------------------------------

function jcs(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      throw new Error("JCS: NaN/Infinity not permitted");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return (
      "[" +
      value
        .map((v) => (v === undefined || typeof v === "symbol" ? "null" : jcs(v)))
        .join(",") +
      "]"
    );
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined || typeof v === "symbol") continue;
      parts.push(JSON.stringify(k) + ":" + jcs(v));
    }
    return "{" + parts.join(",") + "}";
  }
  throw new Error(`JCS: unsupported type ${typeof value}`);
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(digest);
}

function hex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function base64Decode(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < out.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function constantTimeEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

async function sha256Hex(value: unknown): Promise<string> {
  const bytes =
    value instanceof Uint8Array
      ? value
      : new TextEncoder().encode(typeof value === "string" ? value : jcs(value));
  return hex(await sha256(bytes));
}

// --------------------------------------------------------------------
// Structural guards — cheap checks before the expensive signature verify
// --------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function structuralCheck(bundle: unknown): string | null {
  if (!isRecord(bundle)) return "bundle is not an object";
  if (bundle.schema !== SUPPORTED_SCHEMA) {
    return `unknown schema: ${JSON.stringify(bundle.schema)}`;
  }
  if (typeof bundle.version !== "string") return "version must be a string";
  const major = Number.parseInt(bundle.version.split(".")[0] ?? "", 10);
  if (major !== SUPPORTED_MAJOR) {
    return `unsupported bundle major version: ${bundle.version}`;
  }
  if (!isRecord(bundle.payload)) return "payload missing";
  if (!isRecord(bundle.signature)) return "signature missing";
  if (bundle.signature.alg !== SUPPORTED_ALG) {
    return `unsupported signature alg: ${JSON.stringify(bundle.signature.alg)}`;
  }
  if (typeof bundle.signature.value !== "string") {
    return "signature.value must be base64 string";
  }
  const p = bundle.payload as Record<string, unknown>;
  if (!isRecord(p.issuer)) return "payload.issuer missing";
  if (typeof (p.issuer as Record<string, unknown>).publicKey !== "string") {
    return "payload.issuer.publicKey missing";
  }
  if (typeof (p.issuer as Record<string, unknown>).keyId !== "string") {
    return "payload.issuer.keyId missing";
  }
  if (!isRecord(p.policyHash)) return "payload.policyHash missing";
  if (!Array.isArray(p.auditChain)) return "payload.auditChain missing";
  return null;
}

// --------------------------------------------------------------------
// Audit chain integrity
// --------------------------------------------------------------------

async function verifyAuditChain(chain: AuditEvent[]): Promise<string | null> {
  for (let i = 0; i < chain.length; i++) {
    const ev = chain[i];
    if (typeof ev.seq !== "number" || ev.seq !== i + 1) {
      return `audit chain: event index ${i} has seq=${ev.seq}, expected ${i + 1}`;
    }
    if (i === 0) {
      if (ev.prevHash !== null) {
        return `audit chain: first event prevHash must be null (got ${ev.prevHash})`;
      }
      continue;
    }
    const expected = `sha256:${await sha256Hex(chain[i - 1])}`;
    if (ev.prevHash !== expected) {
      return `audit chain: broken link at seq=${ev.seq} (expected ${expected}, got ${ev.prevHash})`;
    }
  }
  return null;
}

// --------------------------------------------------------------------
// Main verify function
// --------------------------------------------------------------------

export async function verifyBundle(
  bundleBytes: Uint8Array | string,
  trustedPublicKey: Uint8Array,
): Promise<VerifyResult> {
  const reasons: string[] = [];
  let parsed: unknown;
  try {
    const text =
      typeof bundleBytes === "string"
        ? bundleBytes
        : new TextDecoder().decode(bundleBytes);
    parsed = JSON.parse(text);
  } catch (err) {
    return { ok: false, reasons: [`bundle is not valid JSON: ${String(err)}`] };
  }

  const structural = structuralCheck(parsed);
  if (structural) return { ok: false, reasons: [structural] };

  const bundle = parsed as DisclosureBundle;
  const canonical = new TextEncoder().encode(jcs(bundle.payload));
  let signature: Uint8Array;
  try {
    signature = base64Decode(bundle.signature.value);
  } catch (err) {
    return {
      ok: false,
      reasons: [`signature.value is not base64: ${String(err)}`],
    };
  }

  // 1. Signature verification against the trusted (pinned) public key
  let sigOk = false;
  try {
    sigOk = await ed.verifyAsync(signature, canonical, trustedPublicKey);
  } catch (err) {
    reasons.push(`signature check threw: ${String(err)}`);
  }
  if (!sigOk) reasons.push("signature invalid under trusted public key");

  // 2. Issuer key in bundle must match the trusted key (defense in depth)
  try {
    const declaredKey = base64Decode(bundle.payload.issuer.publicKey);
    if (!constantTimeEq(declaredKey, trustedPublicKey)) {
      reasons.push("issuer.publicKey does not match trusted public key");
    }
  } catch (err) {
    reasons.push(`issuer.publicKey is not base64: ${String(err)}`);
  }

  // 3. keyId fingerprint binding
  const computedKeyId = (await sha256Hex(trustedPublicKey)).slice(0, 16);
  if (computedKeyId !== bundle.payload.issuer.keyId) {
    reasons.push(
      `issuer.keyId mismatch (expected ${computedKeyId}, got ${bundle.payload.issuer.keyId})`,
    );
  }

  // 4. Audit chain integrity
  const chainErr = await verifyAuditChain(bundle.payload.auditChain);
  if (chainErr) reasons.push(chainErr);

  return {
    ok: reasons.length === 0,
    reasons,
    payload: reasons.length === 0 ? bundle.payload : undefined,
    policyHash: bundle.payload.policyHash,
  };
}

// --------------------------------------------------------------------
// Exports for re-use
// --------------------------------------------------------------------

export { jcs, sha256Hex, base64Decode };
