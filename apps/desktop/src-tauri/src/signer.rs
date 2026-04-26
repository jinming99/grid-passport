//! Applicant identity signer.
//!
//! The applicant's 32-byte Ed25519 secret key is stored in the platform
//! secure store (macOS Keychain / Windows Credential Manager / Linux
//! Secret Service) via the `keyring` crate. Only the public key and
//! signatures ever cross the Tauri IPC boundary into JS — the secret key
//! never leaves Rust.
//!
//! See docs/design/signed-bundle.md §3.4 for the design rationale.
//! Threat model coverage: T6 (signing-key theft) mitigation.

use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;
use ed25519_dalek::{Signer, SigningKey, VerifyingKey};
use keyring::Entry;
use rand::rngs::OsRng;
use rand::RngCore;
use std::sync::OnceLock;

const KEYRING_SERVICE: &str = "grid-passport";
const KEYRING_USER: &str = "applicant-ed25519-v1";
const SECRET_LEN: usize = 32;

// Cache the Entry across calls. On macOS/Windows/Linux this is slightly
// more efficient (one keychain handle instead of one per sign operation)
// and, critically, it lets the unit test in the `tests` module below
// drive the `keyring::mock` backend across multiple calls — the mock
// backend stores state per-Entry-instance, so a fresh Entry each call
// would defeat the test.
static ENTRY: OnceLock<Entry> = OnceLock::new();

fn entry() -> Result<&'static Entry, String> {
    if let Some(e) = ENTRY.get() {
        return Ok(e);
    }
    let built =
        Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| format!("keyring entry init failed: {e}"))?;
    // set() can lose the race with another thread; if so, read the winner.
    let _ = ENTRY.set(built);
    Ok(ENTRY.get().expect("ENTRY set above"))
}

fn load_signing_key() -> Result<SigningKey, String> {
    let ent = entry()?;
    match ent.get_password() {
        Ok(b64) => {
            let bytes = BASE64
                .decode(b64.trim())
                .map_err(|e| format!("keyring payload not base64: {e}"))?;
            if bytes.len() != SECRET_LEN {
                return Err(format!(
                    "keyring payload is {} bytes; expected {}",
                    bytes.len(),
                    SECRET_LEN
                ));
            }
            let mut arr = [0u8; SECRET_LEN];
            arr.copy_from_slice(&bytes);
            Ok(SigningKey::from_bytes(&arr))
        }
        Err(keyring::Error::NoEntry) => {
            let mut secret = [0u8; SECRET_LEN];
            OsRng.fill_bytes(&mut secret);
            let b64 = BASE64.encode(secret);
            ent.set_password(&b64)
                .map_err(|e| format!("keyring write failed: {e}"))?;
            Ok(SigningKey::from_bytes(&secret))
        }
        Err(e) => Err(format!("keyring read failed: {e}")),
    }
}

/// Return the applicant's 32-byte Ed25519 public key, base64-encoded.
/// On first call, generates a fresh keypair and persists the secret in
/// the OS keychain.
#[tauri::command]
pub fn applicant_public_key() -> Result<String, String> {
    let signing = load_signing_key()?;
    let verifying: VerifyingKey = signing.verifying_key();
    Ok(BASE64.encode(verifying.to_bytes()))
}

/// Sign an opaque message with the applicant's Ed25519 key. The message
/// is whatever the caller canonicalizes (for disclosure bundles, this is
/// `TextEncoder().encode(jcs(payload))` from `@grid-passport/core/bundle`).
/// Returns a base64-encoded 64-byte Ed25519 signature.
#[tauri::command]
pub fn applicant_sign(message: Vec<u8>) -> Result<String, String> {
    let signing = load_signing_key()?;
    let sig = signing.sign(&message);
    Ok(BASE64.encode(sig.to_bytes()))
}

#[cfg(test)]
mod tests {
    //! Unit test for the keychain read/write round-trip.
    //!
    //! Uses the `keyring` crate's `mock` credential backend so the test
    //! does not touch the user's real OS keychain. Exercises the exact
    //! production code paths in `load_signing_key`, `applicant_public_key`,
    //! and `applicant_sign`. See docs/design/signed-bundle-spec.md §9.
    use super::*;
    use ed25519_dalek::{Signature, Verifier, VerifyingKey};
    use keyring::mock;
    use keyring::set_default_credential_builder;

    #[test]
    fn mock_keyring_roundtrip() {
        set_default_credential_builder(mock::default_credential_builder());

        let pub1 = applicant_public_key().expect("first public key call");
        let pub2 = applicant_public_key().expect("second public key call");
        assert_eq!(pub1, pub2, "subsequent calls must return the same key");

        let pub_bytes = BASE64.decode(&pub1).expect("pubkey b64");
        assert_eq!(pub_bytes.len(), 32);

        let message = b"Grid Passport keychain round-trip test";
        let sig_b64 = applicant_sign(message.to_vec()).expect("sign");
        let sig_bytes = BASE64.decode(&sig_b64).expect("sig b64");
        assert_eq!(sig_bytes.len(), 64);

        let mut pk_arr = [0u8; 32];
        pk_arr.copy_from_slice(&pub_bytes);
        let verifying = VerifyingKey::from_bytes(&pk_arr).expect("valid pubkey");

        let mut sig_arr = [0u8; 64];
        sig_arr.copy_from_slice(&sig_bytes);
        let signature = Signature::from_bytes(&sig_arr);

        verifying
            .verify(message, &signature)
            .expect("signature must verify under the returned public key");

        let mut bad = message.to_vec();
        bad[0] ^= 0x01;
        assert!(
            verifying.verify(&bad, &signature).is_err(),
            "mutated message must fail verification",
        );
    }
}
