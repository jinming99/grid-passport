# Grid Passport — Signed Disclosure Bundle Protocol · Normative Specification

**Version:** 1.0.0
**Last updated:** 2026-04-18
**Status:** current
**Companion rationale doc:** [`signed-bundle.md`](./signed-bundle.md) — read that for *why*; read this for *what*.

> This document is the normative specification. If an implementation disagrees with this document, the implementation is wrong. If this document disagrees with the rationale in `signed-bundle.md`, open an issue — they should never conflict, and resolution will update both.

---

## 1. Conformance language

MUST / MUST NOT / SHOULD / SHOULD NOT / MAY per [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) / [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174).

A **conforming signer** produces bundles that satisfy every MUST in §4.
A **conforming verifier** accepts every conforming bundle and rejects every bundle that violates any MUST.

---

## 2. Wire format

A bundle is a UTF-8 encoded JSON document. Top-level keys are, in any order on the wire, but always in JCS order when hashed:

| Key | Type | Value |
|---|---|---|
| `schema` | string | MUST equal `"grid-passport/bundle"`. |
| `version` | string | Semver. For this spec: `"1.0.0"`. Verifiers MUST reject unknown major. |
| `payload` | object | The signed payload (§3). |
| `signature` | object | The detached-but-embedded signature block (§5). |

Verifiers MUST ignore additional top-level keys introduced by future minor versions. They MUST NOT ignore additional keys inside `payload` — any unknown key inside `payload` is a protocol violation by the signer.

---

## 3. Payload schema

```jsonc
{
  "bundleId":      "bundle_<26-char-crockford-base32>",     // §3.1
  "caseId":        "<case-identifier>",                     // opaque to protocol
  "requestId":     "<request-identifier>",                  // opaque to protocol
  "issuedAt":      "2026-04-18T19:04:12Z",                  // RFC 3339, UTC
  "validUntil":    null,                                    // RFC 3339 or null
  "issuer":        { "publicKey": ..., "keyId": ..., "label": ... },  // §3.2
  "policyHash":    { "rego": "sha256:...", "runtime": "sha256:..." }, // §3.3
  "policyVersion": "<semver>",
  "projections":   { "applicant": {...}, "utility": {...}, "regulator": {...} },
  "auditChain":    [ <AuditEvent>, ... ]                    // §3.4
}
```

### 3.1 `bundleId`

MUST match the regex `^bundle_[0-9A-HJKMNP-TV-Z]{26}$` (Crockford base32, excluding I/L/O/U). The first 10 characters are a big-endian encoding of `floor(millis since epoch / 32)`; the last 16 are random. Chosen for sortability and uniqueness without a cryptographic RNG dependency on the bundleId itself.

### 3.2 `issuer`

```jsonc
{
  "publicKey": "<base64 of 32 bytes>",   // Ed25519 public key, base64 standard encoding with padding
  "keyId":     "<16 hex chars>",         // leading 16 hex chars of SHA-256(publicKey bytes)
  "label":     "<free-form UTF-8>"       // human-readable, verifiers MUST NOT trust it
}
```

The signer MUST set `keyId` to `SHA256(decodedPublicKey)[0..8].hex()`.
Verifiers MUST recompute `keyId` from the trusted public key and reject on mismatch.

### 3.3 `policyHash`

```jsonc
{
  "rego":    "sha256:<64 hex>",   // SHA-256 of grid-passport.rego file bytes (raw)
  "runtime": "sha256:<64 hex>"    // SHA-256 of JCS-canonicalized POLICY table
}
```

Both MUST be lowercase hex with the `sha256:` prefix. Verifiers do not automatically check either hash against any local source; they surface the pair to the caller for downstream binding.

### 3.4 `auditChain`

An ordered array of `AuditEvent` objects:

```jsonc
{
  "seq":           <integer ≥ 1>,
  "id":            "<opaque event identifier>",
  "timestamp":     "<RFC 3339 UTC>",
  "actor":         "<one of: interviewer|cartographer|notary|forecaster|referee|system>",
  "action":        "<free-form UTF-8>",
  "reasonCode":    "<one of: case_created|evidence_refreshed|sealed_raw_input|proof_generated|policy_evaluated|role_projection|scenario_override>",
  "artifactHash":  "<hex>",
  "policyVersion": "<semver>",
  "details":       { /* scalar map */ },
  "prevHash":      null  |  "sha256:<64 hex>"
}
```

**Chain integrity.** For the event at index `i`:
- `seq` MUST equal `i + 1`.
- If `i == 0`: `prevHash` MUST be `null`.
- If `i > 0`: `prevHash` MUST equal `"sha256:" + hex(SHA256(JCS(chain[i-1])))`.

Verifiers MUST enforce both conditions.

---

## 4. Signing procedure (MUST)

Given a payload object `P` and a 32-byte Ed25519 secret key `sk`:

1. Compute `P_canon = JCS(P)` per [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785).
2. Compute `P_bytes = UTF-8-encode(P_canon)`.
3. Compute `sig = Ed25519.Sign(sk, P_bytes)` per [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032).
4. Emit:
   ```json
   {
     "schema": "grid-passport/bundle",
     "version": "1.0.0",
     "payload": P,
     "signature": { "alg": "Ed25519", "value": base64_std(sig) }
   }
   ```

The signer MUST NOT:
- Sort, normalize, or modify `P` when placing it into the bundle. Only the canonicalized form is signed; the wire form is preserved as-is for readability.
- Emit a signature over anything other than `JCS(P)`.
- Use any signature algorithm other than Ed25519 for `version: 1.x.y`.

---

## 5. Verification procedure (MUST)

Given bundle bytes `B` and a trusted public key `tpk` (32 bytes):

```
1. Parse B as UTF-8 JSON → bundle. On parse error: reject.
2. If bundle.schema ≠ "grid-passport/bundle": reject.
3. If major(bundle.version) ≠ 1: reject.
4. If bundle.signature.alg ≠ "Ed25519": reject.
5. If bundle.signature.value is not valid base64 of 64 bytes: reject.
6. Compute canonical = UTF-8-encode(JCS(bundle.payload)).
7. Compute ok = Ed25519.Verify(tpk, canonical, base64_decode(bundle.signature.value)).
   If ok = false: reject with reason "signature invalid under trusted public key".
8. If base64_decode(bundle.payload.issuer.publicKey) ≠ tpk (constant-time):
   reject with reason "issuer.publicKey does not match trusted public key".
9. If hex(SHA256(tpk))[0..16] ≠ bundle.payload.issuer.keyId:
   reject with reason "issuer.keyId mismatch".
10. For each AuditEvent at index i in bundle.payload.auditChain:
      a. If event.seq ≠ i+1: reject.
      b. If i == 0 and event.prevHash ≠ null: reject.
      c. If i > 0 and event.prevHash ≠ "sha256:" + hex(SHA256(JCS(chain[i-1]))): reject.
11. Return ok.
```

Steps 2–5 are fast structural checks. Step 7 is the load-bearing cryptographic check. Steps 8–10 are integrity belt-and-braces.

Verifiers MAY surface `bundle.payload.policyHash` to the caller for downstream binding but MUST NOT block on its value.

---

## 6. Canonical test vectors

Every conforming implementation MUST pass the following vectors.

### 6.1 JCS conformance

The RFC 8785 author's vectors, bundled under `packages/core/test-vectors/rfc8785/{input,output}`:

| Vector | Tests |
|---|---|
| `arrays.json` | array preservation + number canonicalization |
| `french.json` | Latin diacritics, UTF-8 encoding |
| `structures.json` | nested object/array |
| `unicode.json` | basic Unicode strings |
| `values.json` | mixed scalar types |
| `weird.json` | UTF-16 code-unit sort order across BMP + supplementary planes (emoji surrogate pair) |

Run: `pnpm core:test`.

### 6.2 Sign/verify roundtrip

Given:
- Secret key `sk` (32 random bytes)
- `P = { "caseId": "vector-1", "bundleId": "bundle_00000000000000000000000000", "issuedAt": "2026-01-01T00:00:00Z", ... }` (see `packages/verifier/scripts/emit-fixture.ts` for the exact generator)

Then `verify(sign(P, sk).bundle, getPublicKey(sk)).ok === true`.

### 6.3 Tamper rejection

Given any valid bundle `B`:
- Changing any byte inside `B.payload` → verifier rejects with "signature invalid".
- Changing any byte inside `B.signature.value` → verifier rejects with "signature invalid".
- Changing `B.version` to `"2.0.0"` → verifier rejects with "unsupported major".
- Verifying against a public key other than the one that signed → verifier rejects.

Mechanically verified by `packages/verifier/src/index.test.ts` (10 cases) + `packages/verifier/src/fuzz.test.ts` (2000 random mutations).

### 6.4 Cross-implementation parity

The protocol has been validated three-way across TypeScript (`@noble/ed25519`), Rust (`ed25519-dalek`), and Python (`PyCA cryptography`):

| Signer ↓  / Verifier → | TS | Rust ‡ | Python |
|---|---|---|---|
| **TS** (`@grid-passport/core/bundle`) | ✔ | n/a † | ✔ |
| **Rust** (`gp-sign` binary, `ed25519-dalek`) | ✔ | n/a † | ✔ |
| **Python** | — § | — § | n/a † |

† Self-verification is exercised by each stack's own canary.
‡ A standalone Rust verifier is not currently shipped; the Rust path is exercised via the `gp-sign` signer being verified by the TS and Python verifiers — the signing primitive is the load-bearing half.
§ Python signing is not currently needed (no language is likely to *produce* bundles outside the applicant's desktop app), but the Python verifier is the proof of portability.

Run: `pnpm canary:roundtrip` (or `bash scripts/demo-bundle-roundtrip.sh`) — 10 stages, ~6 seconds.

### 6.5 Keychain round-trip (desktop path)

The Tauri desktop app stores the applicant's Ed25519 secret in the OS keychain via `keyring` (Rust). The full generate → persist → reload → sign → verify path is exercised by a Rust unit test in `apps/desktop/src-tauri/src/signer.rs::tests::mock_keyring_roundtrip` using `keyring::mock::default_credential_builder()`. The test uses the *exact* production code paths (`applicant_public_key` + `applicant_sign`) — the only substitution is the credential backend.

Run: `pnpm desktop:test`.

---

## 7. Conformance checklist for a new implementation

An implementation in language X is conforming if it:

- [ ] Implements RFC 8785 JCS and passes the six bundled test vectors (§6.1).
- [ ] Uses a standards-compliant Ed25519 library (RFC 8032).
- [ ] Uses a standards-compliant SHA-256 implementation (FIPS 180-4).
- [ ] Rejects bundles with unknown major version.
- [ ] Rejects bundles whose signature does not verify under the supplied public key.
- [ ] Rejects bundles whose `issuer.publicKey` does not match the supplied public key byte-for-byte (constant-time comparison).
- [ ] Rejects bundles whose `issuer.keyId` is not `SHA256(publicKey)[0..8].hex()`.
- [ ] Rejects bundles with a broken audit chain.
- [ ] Accepts bundles signed by the reference TypeScript signer for the three bundled case fixtures (Owl Compute, Lantern Cloud, Kraken Train).
- [ ] Rejects every tampered variant of those bundles.

The last two items are mechanically testable by running `pnpm --filter @grid-passport/verifier exec tsx scripts/emit-fixture.ts /tmp/fixture` and pointing the new verifier at the emitted files.

---

## 8. Versioning policy

- **Major bump** (e.g. 1.0.0 → 2.0.0): breaking change to the wire format, signature algorithm, or verification procedure. Verifiers that only know v1 MUST reject.
- **Minor bump** (e.g. 1.0.0 → 1.1.0): additive only. Examples: new optional top-level keys, new audit reason codes, new actor types. Verifiers MUST continue to accept.
- **Patch bump**: clarifications, non-normative text, typo fixes. No behavior change.

The `signature.alg` field is an extensibility point. A future version that introduces, for instance, composite post-quantum signing (§8 of the rationale doc) would bump to major 2 and accept `"Ed25519+ML-DSA-65"` — a v1 verifier presented with such a bundle rejects at step 4.

---

## 9. Reproducibility — exactly how to check every claim

Every assertion in this spec and in `signed-bundle.md` is backed by a runnable check. To reproduce from a fresh clone:

```bash
# 1. Install
pnpm install

# 2. Core conformance: RFC 8785 vectors
pnpm core:test
#   expect: 9/9 pass

# 3. Protocol integrity: targeted tamper matrix + fuzz
pnpm verifier:test
#   expect: 11/11 pass (10 targeted + 1 fuzz of 2000 iterations)

# 4. End-to-end sign → verify → tamper → reject, same language
pnpm canary:bundle
#   expect: 3 cases, all clear

# 5. Three-way parity: TS + Rust signers; TS + Python verifiers
pnpm canary:roundtrip
#   expect: "Roundtrip OK: TS ⇌ Rust ⇌ Python agree"

# 6. Desktop signing path: keychain generate/persist/reload/sign/verify
pnpm desktop:test
#   expect: signer::tests::mock_keyring_roundtrip ... ok

# 6. Everything else the repo exercises
pnpm typecheck
pnpm privacy:canary
pnpm desktop:typecheck
pnpm canary:desktop
```

Total wall-clock: ~30 seconds on a 2021 M1 Air. Every check either exits 0 (pass) or prints specific reasons for failure. There is no "it works on my machine" — if these fail, the spec is broken.

---

## 10. What this document is *not*

- It is not the design rationale. For *why* Ed25519 and not ECDSA, *why* embedded proof and not JWS, *why* hash chain and not Merkle tree — read [`signed-bundle.md`](./signed-bundle.md).
- It is not a threat model. That lives in `signed-bundle.md` §2.
- It is not a deployment guide. A future `signed-bundle-integration.md` will cover utility-side intake patterns once Dominion engagement starts.

---

## 11. Change log

- **1.0.0** (2026-04-18) — Initial publication. Wire format frozen. Six JCS vectors + sign/verify roundtrip + tamper matrix + cross-language parity all passing.
