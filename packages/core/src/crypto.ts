const encoder = new TextEncoder();

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS).
 *
 * Deterministic serialization for cryptographic hashing/signing. Keys sorted
 * by UTF-16 code unit (JS default string sort, which matches JCS §3.2.3);
 * numbers use ECMAScript's ToString abstract op via JSON.stringify (matches
 * JCS §3.2.2 via ES6 Number serialization); arrays preserve order; no
 * whitespace. See docs/design/signed-bundle.md §3.1 for rationale.
 *
 * Faithful to Samuel Erdtman's reference implementation of RFC 8785
 * (npm `canonicalize`, Apache-2.0). Inlined to keep the trust surface small:
 * verifiers depend only on @noble/ed25519 and JSON.stringify, no
 * third-party canonicalization lib.
 */
export function jcs(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") {
    if (Number.isNaN(value)) throw new Error("JCS: NaN is not permitted");
    if (!Number.isFinite(value)) throw new Error("JCS: Infinity is not permitted");
    return JSON.stringify(value);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map((v) =>
      v === undefined || typeof v === "symbol" ? "null" : jcs(v),
    );
    return `[${parts.join(",")}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof (obj as { toJSON?: () => unknown }).toJSON === "function") {
      return jcs((obj as { toJSON: () => unknown }).toJSON());
    }
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined || typeof v === "symbol") continue;
      parts.push(`${JSON.stringify(k)}:${jcs(v)}`);
    }
    return `{${parts.join(",")}}`;
  }
  throw new Error(`JCS: unsupported type ${typeof value}`);
}

export async function sha256Hex(value: unknown): Promise<string> {
  const bytes =
    value instanceof Uint8Array
      ? value
      : encoder.encode(typeof value === "string" ? value : jcs(value));
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buf);
  return bytesToHex(new Uint8Array(digest));
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("hex length must be even");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(binary, "binary").toString("base64");
}

export function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < out.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}
