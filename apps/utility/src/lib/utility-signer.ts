import * as ed from "@noble/ed25519";
import {
  bytesToBase64,
  localSigner,
  type BundleSigner,
} from "@grid-passport/core/bundle";

/**
 * Utility-side signer for outbound coordination messages.
 *
 * For Act 3 the utility binary needs to *sign* shed-request bundles
 * (utility → applicant). Until now, the utility was verify-only.
 *
 * This module deliberately does NOT touch the structural privacy
 * property: the utility's signing key is independent of the applicant's
 * key, and the only thing the utility ever signs are utility-composed
 * facts (pocket name, MW ask, window, allocation, credit). It cannot
 * sign anything about the applicant's privateProfile because it has no
 * source of those values — that import path stays forbidden under
 * `pnpm canary:utility` (gate 15).
 *
 * Key handling for v0:
 *   - generated in-memory at first use, persisted to localStorage so
 *     the same browser session sees a stable pubkey (the demo's "this
 *     binary's identity")
 *   - Re-keying on demand via clearKey()
 *
 * Production would land the private key in the OS keychain (mirrors
 * how the desktop signer works via Tauri IPC). v0 keeps it simple.
 */

const STORAGE_KEY = "grid-passport.utility.signer.secret-b64";

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
    // localStorage unavailable (private mode, SSR) — fine; key is still
    // valid for this session, just not persisted across reloads.
  }
}

export async function utilitySigner(): Promise<BundleSigner> {
  if (cached) return cached.signer;

  let secret = getSecretFromStorage();
  if (!secret) {
    secret = ed.utils.randomSecretKey();
    setSecretInStorage(secret);
  }

  const signer = await localSigner(secret);
  cached = {
    signer,
    publicKeyB64: bytesToBase64(signer.publicKey),
  };
  return signer;
}

export async function utilityPublicKeyB64(): Promise<string> {
  if (cached) return cached.publicKeyB64;
  await utilitySigner();
  return cached!.publicKeyB64;
}

export function clearUtilityKey(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  cached = null;
}
