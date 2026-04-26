import {
  bytesToBase64,
  localSigner,
  type BundleSigner,
} from "@grid-passport/core/bundle";

function randomSecret32(): Uint8Array {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * In-browser Ed25519 signer for the applicant binary.
 *
 * Originally the desktop bundle signer routed through Tauri IPC into a
 * Rust handler that stored the private key in the OS keychain (see
 * `signer.ts` and `src-tauri/src/signer.rs`). That path is still
 * present in the Rust source for production deployments but is *not*
 * the active signer in dev — Tauri config changes cause the binary
 * signature to rotate, which invalidates the keychain ACL on macOS and
 * surfaces as repeated "enter your password" prompts that don't unlock
 * the existing entry.
 *
 * For the demo we use the same pattern the utility binary uses
 * (`apps/utility/src/lib/utility-signer.ts`): generate a key in JS,
 * persist to localStorage so the same pubkey survives reloads. No
 * keychain involvement, no Rust IPC, no password prompt. The signed
 * bundles still verify the same way on the utility side; only the
 * key-storage substrate changed.
 */

const STORAGE_KEY = "grid-passport.applicant.signer.secret-b64";

let cached: { signer: BundleSigner; publicKeyB64: string } | null = null;

function getSecretFromStorage(): Uint8Array | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    if (bytes.length !== 32) return null;
    return bytes;
  } catch {
    return null;
  }
}

function setSecretInStorage(secret: Uint8Array): void {
  try {
    const b64 = btoa(String.fromCharCode(...secret));
    window.localStorage.setItem(STORAGE_KEY, b64);
  } catch {
    // ignore
  }
}

export async function applicantSigner(): Promise<BundleSigner> {
  if (cached) return cached.signer;

  const existing = getSecretFromStorage();
  let secret: Uint8Array;
  if (existing) {
    secret = existing;
  } else {
    secret = randomSecret32();
    setSecretInStorage(secret);
  }

  const signer = await localSigner(secret);
  cached = {
    signer,
    publicKeyB64: bytesToBase64(signer.publicKey),
  };
  return signer;
}

export async function applicantPublicKeyB64(): Promise<string> {
  if (cached) return cached.publicKeyB64;
  await applicantSigner();
  return cached!.publicKeyB64;
}

export function clearApplicantKey(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  cached = null;
}
