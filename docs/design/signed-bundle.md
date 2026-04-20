# Grid Passport — Signed Disclosure Bundle Protocol

**Status:** design — gate for implementation of roadmap item #6
**Last updated:** 2026-04-18
**Owners:** Ming Jin (design + implementation)
**Counterparty:** Dominion Energy (future; see §9)

> This is the engineering spec for the on-wire format, signing method, and verification algorithm for a Grid Passport disclosure bundle. It also serves as defense material: every non-obvious choice is justified against alternatives, with citations.

---

## 1. Purpose

A **disclosure bundle** is the artifact an applicant exports from the Grid Passport desktop app and hands to a utility (or regulator). It contains:

1. The **role-projected views** of the applicant's request (what the utility sees / what the regulator sees).
2. A **policy hash** binding the projection to the governing visibility rules.
3. A **tamper-evident audit chain** of the events that produced the bundle.
4. A **digital signature** from the applicant's identity key.

The bundle is the point at which Grid Passport's privacy claim becomes *portable*: once it leaves the applicant's machine, anyone with the applicant's public key can independently verify the chain of custody without re-running projection, without trusting our web demo, and without network access.

This document specifies the format and the signing/verification algorithms, and justifies the cryptographic choices.

### 1.1 What a bundle is *not*

- It is **not** a re-attestation by Grid Passport as a trusted third party. We are not a CA. The bundle carries the applicant's signature, not ours.
- It is **not** a privacy mechanism in itself. Privacy lives in the projection layer (§`docs/privacy-claim.md`). The bundle is about *integrity* and *non-repudiation* of the projected outputs.
- It is **not** an anti-replay or freshness mechanism. It carries an `issuedAt` timestamp but no nonce; the utility's intake process is responsible for rejecting stale bundles.

---

## 2. Threat model

We design against a concrete, non-exotic threat set. Each threat maps to a specific bundle field.

| Threat | Attacker capability | Mitigated by |
|---|---|---|
| **T1. Projection tampering.** Someone edits `bundle.projections.utility.privateProfile` to sneak a raw private value past the verifier. | Any party that can touch the bundle file in transit (mail client, shared drive, Dominion intake clerk). | Ed25519 signature over the canonicalized payload. |
| **T2. Substitution attack.** Attacker replaces the bundle with a different applicant's bundle (their own, or a stolen one) and forwards it. | Same as T1. | Public key in bundle header; utility verifies against the key on file for that applicant. |
| **T3. Policy hash forgery.** Attacker mutates the `policyHash` field to claim the bundle was produced under a permissive policy it was not. | Same as T1. | Policy hash is inside the signed payload; signature verification catches this. |
| **T4. Audit chain truncation / insertion.** Attacker removes an embarrassing event ("counterfactual scenario · baseline 68%") or inserts a fake one. | Same as T1. | Hash-chain: each event carries `prevHash` of the previous event; any edit to any event invalidates every hash downstream. Entire chain is inside the signed payload. |
| **T5. Canonicalization mismatch.** Two parties producing "the same" bundle compute different signatures because JSON is not deterministic (key order, whitespace, number encoding). Verifier cannot decide whether a mismatch is tampering or normal drift. | Honest producers with buggy serializers. | RFC 8785 (JCS) canonicalization before hashing. |
| **T6. Signing-key theft.** Attacker exfiltrates the applicant's private key and forges bundles. | Compromise of the applicant's laptop. | Key stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service) rather than a flat file. Out of scope for cryptographic protocol; mitigated by platform. |

**Out of scope.** We do not defend against coerced signing (applicant is forced to produce a false bundle), against the applicant colluding with the utility to backdate a bundle, or against post-quantum adversaries. Post-quantum migration is noted in §8.

---

## 3. Design decisions

Each decision is stated in the form **[D-n] <decision>**, followed by rationale, alternatives considered, and rejection reasons.

### 3.1 [D-1] Canonicalization: RFC 8785 (JCS)

**Decision.** Before hashing or signing any JSON payload, canonicalize using RFC 8785 JSON Canonicalization Scheme (JCS).

**Rationale.** A digital signature is a function of bytes, not of objects. Two honest producers serializing the same object graph can produce different byte streams (different key orders, whitespace, Unicode escape conventions, number representations), and the resulting signatures will not match. This is not a hypothetical: it is the leading cause of interoperability bugs in every JSON-signing protocol ever deployed. JCS specifies a unique serialization: keys sorted lexicographically, no whitespace, ECMAScript-compliant number serialization, strict Unicode normalization, restricted to I-JSON ([RFC 8785 §1](https://www.rfc-editor.org/rfc/rfc8785)). It is an IETF standards-track specification with conformance test vectors.

**Alternatives considered.**

- **JSON Web Signature (JWS, RFC 7515).** Rejected. JWS base64url-encodes the payload inside the signature envelope, which means the signed bundle is no longer human-readable JSON — a verifier must decode it. Our demo moment depends on a utility engineer being able to open the bundle in a text editor and *see* what was signed. JWS is also over-specified for our case (JOSE header parameters we don't need, `alg` negotiation we don't need — we have one algorithm).
- **CBOR Object Signing (COSE, RFC 8152).** Rejected. COSE is optimized for resource-constrained IoT environments and trades readability for byte efficiency. We're shipping bundles over email and intake portals, not through 6LoWPAN. No reason to lose human-readability of the signed document.
- **Dead Simple Signing Envelope (DSSE), used by Sigstore.** Rejected for the same reason as JWS — wraps the payload in base64. DSSE is the right choice when the payload is a binary artifact (container image, ML model) where readability is already gone; it is the wrong choice when the payload is a structured JSON document the recipient is going to inspect.
- **Ad-hoc ordering ("just sort keys and stringify").** Rejected. This is what everyone tries first and what everyone regrets. Sort-and-stringify fails on: nested objects (do you sort recursively?), floating-point numbers (`1.0` vs `1` vs `1e0`), Unicode normalization (NFC vs NFD), and integer representation (`1` vs `1.0` when the value came from a JSON parser that widened). JCS fixes every one of these.
- **No canonicalization (sign whatever bytes get written).** Rejected. Makes bundles not cross-verifiable; a Python verifier and a TypeScript verifier would never agree.

**Library.** `canonicalize` (npm) — MIT, JCS-compliant, zero dependencies. Python parity via `rfc8785` (PyPI) if/when FastAPI worker is brought back onto the hot path. Both pass RFC 8785 test vectors.

**Why this matters for the demo.** "A utility engineer in 2031 can verify this bundle with `openssl` and 20 lines of Python, without depending on us." That claim is true only because JCS is a standard the engineer can read in an afternoon, not a proprietary serialization.

### 3.2 [D-2] Signature scheme: Ed25519

**Decision.** The applicant signs the canonicalized payload with Ed25519 (EdDSA over Curve25519), per RFC 8032.

**Rationale.**

- **Deterministic.** Ed25519 does not require a per-signature random nonce. ECDSA does, and when nonce generation is weak, the private key leaks (CVE-2013-2207 in Sony's PS3 code signing, CVE-2022-0530 in Java's ECDSA, etc.). This class of failure does not exist in Ed25519.
- **Side-channel resistant.** Ed25519's reference implementations use constant-time scalar multiplication. ECDSA implementations require active effort to avoid timing leaks.
- **Small.** 32-byte public keys, 64-byte signatures. The entire signed bundle fits in a single screen of text. ECDSA P-256 uses 65-byte uncompressed public keys and ~72-byte DER-encoded signatures. Modest difference, but the aesthetic matters.
- **Fast.** Signing and verification both ~20× faster than RSA-2048, ~2–4× faster than ECDSA P-256, in pure JS implementations.
- **Community consensus.** "For new systems: EdDSA > ECDSA or RSASSA-PSS" ([Soatok, 2022](https://soatok.blog/2022/05/19/guidance-for-choosing-an-elliptic-curve-signature-algorithm-in-2022/)); "move everyone to Ed25519, phase out ssh-rsa" (OpenSSH). The 2025 digital-signatures guidance (onlinehashcrack) reaches the same conclusion.

**Alternatives considered.**

- **ECDSA P-256.** Rejected for new deployment. Acceptable only when FIPS 140-3 / CNSA compliance is required (it isn't — this is a privately-held commercial disclosure protocol, not a government system), or when TLS CA support is needed (it isn't — we are not issuing TLS certificates). Ed25519 dominates P-256 on every axis that matters to us.
- **RSA-2048 / RSA-PSS.** Rejected. 256-byte signatures, slow key generation, and requires careful padding choice (PKCS#1 v1.5 is obsolete; PSS is correct but no longer the default in many libraries). No upside.
- **secp256k1 (Bitcoin curve).** Rejected. Similar performance to Ed25519 but no standards body endorses it for general signing, and the key-leak-on-bad-nonce failure mode is identical to P-256.
- **Post-quantum: ML-DSA (Dilithium).** Deferred. See §8.

**Library.** `@noble/ed25519` (npm, by Paul Miller). Rationale:

- Audited by Cure53 in Feb 2022 (v1 of the library); the current v2 rewrite is cross-tested against `@noble/curves`, which was audited by Cure53 in September 2024 with funding from OpenSats ([noble-curves/audit](https://github.com/paulmillr/noble-curves/tree/main/audit)).
- 5 KB bundled, zero runtime dependencies, tight supply-chain posture (dependencies pinned, `npm-diff` gated).
- Used by wallets, signing tooling, and the Ethereum ecosystem at scale — lots of adversarial eyes.
- Pure JS, runs identically in Node, browsers, and the Tauri webview.

**Why this matters for the demo.** The applicant signs without ever seeing a nonce generator, an RNG configuration, or a padding scheme. Ed25519 is "the library that refuses to let you misuse it." That aligns with our local-first trust story: the applicant is not a cryptographer, and we do not ask them to be one.

### 3.3 [D-3] Proof model: embedded JSON with inline signature

**Decision.** The bundle is a plain JSON document with a top-level `signature` field containing the base64-encoded signature. The signed payload is the entire document with the `signature` field removed and the result JCS-canonicalized.

**Rationale.** This matches the "embedded proof" pattern from W3C Verifiable Credentials Data Integrity ([VC Data Integrity 1.1 WD](https://w3c.github.io/vc-data-integrity/)): the credential *is* the signed object, and the proof lives inside it. The alternative (enveloping proof, as in JWS or DSSE) wraps the credential in an outer signature envelope and obscures the payload.

For a disclosure bundle that a human operator will read, the embedded model wins:

- The utility engineer `cat`s the file and sees the projections they're about to ingest.
- Verification is "strip the signature, canonicalize, hash, verify" — three steps, no decoding.
- Diffs between bundles are legible in version control.

**Alternatives considered.**

- **JWS compact serialization** (`header.payload.signature` base64url triplet). Rejected per D-1.
- **Detached JWS** (signature in a separate file or header, payload stays plain). Rejected — doubles the number of artifacts to transmit, adds a failure mode where payload and signature get separated.
- **X.509 detached signature (PKCS#7).** Rejected — way too much PKI for a two-party protocol.

### 3.4 [D-4] Key identity: long-lived Ed25519 keypair in OS keychain

**Decision.** Each applicant has one long-lived Ed25519 keypair, generated on first bundle export and stored in the platform-native secure store (macOS Keychain / Windows Credential Manager / Linux Secret Service) via a Tauri plugin. The public key is embedded in every bundle header (`issuer.publicKey`); the private key never leaves the keychain.

**Key identity model.**

- `issuer.publicKey`: base64-encoded Ed25519 public key (32 bytes → 44 chars).
- `issuer.keyId`: SHA-256 fingerprint of the public key, truncated to 16 hex chars. Used for quick "is this the key we expected?" lookups in intake systems.
- `issuer.label`: human-readable string the applicant sets once (e.g., `"Loudoun County LLC — Site A"`). Carried for operator convenience; verifiers do not trust it.

**Out-of-band trust bootstrap.** When onboarding with Dominion (or any utility counterparty), the applicant shares their `keyId` once — over a channel the utility already trusts (DocuSign onboarding packet, phone call with fingerprint readback, in-person meeting). The utility pins that `keyId` against the applicant's account record. Every subsequent bundle is verified against the pinned key. **This is the same trust bootstrap as SSH `known_hosts`.** It is boring, works, and does not require anyone to run a CA.

**Alternatives considered.**

- **(a) Per-bundle ephemeral key, public key embedded in bundle.** Rejected. Verifier can only check integrity (the bundle was not edited after signing), not provenance (who signed it). Degrades the bundle from "a commitment from Loudoun LLC" to "a JSON blob with a tautological signature."
- **(c) Full PKI with X.509 certificate chain.** Rejected for v0. Requires a CA (who?), a certificate issuance flow (annual renewal paperwork?), revocation (CRL or OCSP infra). Too heavy for a two-party protocol. C2PA ([spec.c2pa.org](https://spec.c2pa.org/specifications/specifications/2.3/specs/C2PA_Specification.html)) uses X.509 and is a cautionary tale: the PKI added months of spec work without adding trust the applicants couldn't already get via direct key exchange.
- **Keyless (Sigstore model).** Rejected. Sigstore's keyless signing relies on OIDC identity providers (GitHub, Google) and a public transparency log (Rekor). Neither is appropriate for confidential grid-interconnection data — the transparency log publishes *that a signing happened* even if not the content, which itself leaks.
- **Flat file on disk (`~/.grid-passport/key.pem`).** Rejected. OS keychain gives us (a) hardware-backed storage where the platform supports it (macOS Secure Enclave on Apple Silicon, Windows TPM-backed credentials), (b) per-user isolation even on multi-user machines, (c) no accidental inclusion in Time Machine / iCloud Drive / Dropbox backups.

**Library.** `tauri-plugin-keyring` (Huakun Shen, wraps the Rust [`keyring`](https://crates.io/crates/keyring) crate). Mature, cross-platform, well-audited by adjacent use (npm/yarn credential storage, cargo login). Alternative: [`tauri-plugin-secure-storage`](https://github.com/ThatzOkay/tauri-plugin-secure-storage). Pick whichever has the cleanest API in first implementation pass.

### 3.5 [D-5] Audit chain: hash-chain over SHA-256, embedded in signed payload

**Decision.** The bundle carries an ordered array of `AuditEvent` records. Each event includes a `prevHash` field whose value is the SHA-256 (WebCrypto) of the canonicalized prior event. The first event has `prevHash: null`. The entire array is inside the signed payload, so any edit to any event invalidates the bundle signature.

**Schema.** See §4. The existing `AuditEvent` shape in `packages/core/src/audit.ts` adds one field (`prevHash: string | null`); no semantic changes.

**Rationale.** Hash chain is the right structure for our scale: a typical bundle has 5–8 events; 10⁶ events is decades away. Merkle trees are the right answer for transparency logs with billions of entries, where you need logarithmic inclusion proofs — but the cost is that events are not locally verifiable without the full tree, and the data structure is more complex to serialize and re-hash. Academic work confirms this trade-off ([Crosby & Wallach, USENIX 2009](https://static.usenix.org/event/sec09/tech/full_papers/crosby.pdf)): hash chains are optimal for small logs and suboptimal at scale; Merkle trees are the reverse. We are in the small-log regime, and plan to stay there — a single bundle corresponds to a single applicant-utility coordination event, not a running ledger.

**Alternatives considered.**

- **Merkle tree with root in bundle.** Rejected. Adds spec surface (leaf ordering, internal node hashing, proof format for inclusion) with zero benefit at 5–8 events.
- **Blockchain anchor (anchor the root in Ethereum / Bitcoin).** Rejected. Adds external dependency and public visibility of signing-rate metadata to a protocol whose whole point is confidentiality.
- **No chain — signed array of events.** Rejected. Allows an attacker who re-signs (e.g., a rogue co-signer in a future multi-sig extension) to truncate or reorder events without detection by structural checks alone. The chain makes the invariant "events were produced in this order, and the chain is complete" check-able without trusting the signer.

**Implementation.** The existing `audit.ts` uses `node:crypto` (sync `createHash`). The Tauri webview bundles this awkwardly — Vite ends up polyfilling Node crypto for the browser. We migrate to WebCrypto's `crypto.subtle.digest('SHA-256', ...)` which is native in Node 20+ (`globalThis.crypto`), modern browsers, and the webview alike. The API is async, so `buildAuditTrail` becomes `async`; its single caller in the route handler already lives in an async context.

### 3.6 [D-6] Policy hash: dual-binding (Rego + runtime TS)

**Decision.** The bundle's `policyHash` is an object, not a single string: `{ rego: "sha256:...", runtime: "sha256:..." }`. `rego` is the SHA-256 of `packages/policy/grid-passport.rego` (bytes, no canonicalization — it's a text file). `runtime` is the SHA-256 of the JCS-canonicalized `POLICY` table exported from `packages/core/src/policy.ts`.

**Rationale.** The privacy canary already enforces that the Rego file and the TypeScript `POLICY` table don't drift. But a verifier three years from now can't run our canary — they need to check the binding themselves. Dual-binding lets a verifier independently recompute both hashes from the Rego source (if shipped) and from a Grid Passport release tarball, and catch any mid-lifecycle substitution.

**Alternatives considered.**

- **Single hash of Rego only.** Rejected. Rego is the source of truth for *policy*, but the runtime is what actually enforced visibility on the projections the verifier is looking at. If a rogue build ships a TS mirror that disagrees with the Rego, a Rego-only hash would not catch it.
- **Single hash of runtime table only.** Rejected. Verifier can't recompute it without installing Grid Passport and running our export script. Rego is the portable, inspectable source.
- **Hash of both, concatenated.** Rejected. Opaque: if the check fails, the verifier can't tell whether Rego or runtime is the delta. Two fields keep the failure localized.

### 3.7 [D-7] Schema versioning: explicit `schema` + `version` fields, semver

**Decision.** Every bundle carries `schema: "grid-passport/bundle"` and `version: "1.0.0"`. Future breaking changes increment the major; additive changes increment the minor. Verifiers refuse bundles with an unknown major.

**Rationale.** Protocols that skip versioning from day one pay for it forever. Cost is one string literal, so pay now.

**Alternatives considered.**

- **Implicit versioning (infer from field presence).** Rejected — brittle, harder to write conformance tests against.
- **JSON Schema `$schema` pointer to a URL.** Deferred. We'll add it when the schema is published publicly (after open-source — roadmap #2). For now the string identifier is enough.

### 3.8 [D-8] Library choices

| Concern | Library | Notes |
|---|---|---|
| JCS canonicalization | `canonicalize` (npm) | MIT, zero deps, RFC 8785 conformance |
| Ed25519 sign/verify | `@noble/ed25519` (npm) | Audited family (Cure53); 5 KB; zero deps |
| SHA-256 | `globalThis.crypto.subtle.digest` | Native Node 20+ / browsers / webview; no dependency |
| OS keychain (desktop) | `tauri-plugin-keyring` | Wraps Rust `keyring` crate |
| Python parity (optional) | `rfc8785` (PyPI), `cryptography` (PyCA) | If FastAPI worker is re-activated |

No custom crypto. No rolled-our-own anything. Every primitive is standard-compliant and independently audited.

---

## 4. Bundle schema (v1.0.0)

Formal TypeScript interface in `packages/core/src/bundle.ts` (to be created during implementation). Here in prose for the design record.

```jsonc
{
  "schema": "grid-passport/bundle",
  "version": "1.0.0",
  "payload": {
    "bundleId": "bundle_01HV...",           // ULID; unique per export
    "caseId": "owl-compute",
    "requestId": "req_owl_20260318",
    "issuedAt": "2026-04-18T19:04:12Z",     // RFC 3339
    "validUntil": null,                     // RFC 3339 or null (no expiry in v1)

    "issuer": {
      "publicKey": "<base64-32-bytes>",     // Ed25519 public key
      "keyId": "<16-hex-chars>",            // SHA-256(publicKey)[0:16]
      "label": "Loudoun County LLC — Site A"
    },

    "policyHash": {
      "rego": "sha256:<64-hex>",            // hash of grid-passport.rego bytes
      "runtime": "sha256:<64-hex>"          // hash of JCS(POLICY table)
    },
    "policyVersion": "0.1.0",               // semver from packages/core/src/policy.ts

    "projections": {
      "applicant": { /* ProjectedView */ },  // present only in self-review exports
      "utility":   { /* ProjectedView */ },
      "regulator": { /* ProjectedView */ }
    },

    "auditChain": [
      {
        "seq": 1,
        "id": "audit_owl-compute_001",
        "timestamp": "2026-03-18T14:12:00Z",
        "actor": "interviewer",
        "action": "Structured intake submitted · 180 MW · Loudoun, VA",
        "reasonCode": "case_created",
        "artifactHash": "<16-hex>",
        "policyVersion": "0.1.0",
        "details": { /* scalar map */ },
        "prevHash": null                    // first event in chain
      },
      {
        "seq": 2,
        /* ... */
        "prevHash": "sha256:<64-hex>"       // SHA-256(JCS(event[0]))
      }
      /* ... */
    ]
  },
  "signature": {
    "alg": "Ed25519",
    "value": "<base64-64-bytes>"            // Ed25519 signature over JCS(payload)
  }
}
```

**Notes on shape.**

- Everything that needs integrity coverage lives under `payload`. The top-level object has exactly three keys: `schema`, `version`, `payload`, `signature`. The first two are unsigned on purpose — a verifier needs to know what it's reading before it verifies.
- Canonicalization applies to `payload` only. Not to the top-level wrapper. This makes the algorithm exactly: *signature = Sign(privkey, JCS(payload))*.
- `auditChain` is an array; `prevHash` links each event to its predecessor. `prevHash` is null only for `seq=1`. This is a chain, not a tree.

---

## 5. Algorithms

### 5.1 Sign

```
Input:  payload (object), privateKey (32 bytes)
Output: bundle (object with embedded signature)

1. canonical_bytes := JCS(payload)                        // RFC 8785
2. signature       := Ed25519.sign(privateKey, canonical_bytes)  // RFC 8032
3. return {
     schema:    "grid-passport/bundle",
     version:   "1.0.0",
     payload:   payload,
     signature: { alg: "Ed25519", value: base64(signature) }
   }
```

### 5.2 Verify

```
Input:  bundle (object), trustedPublicKey (32 bytes)
Output: { ok: boolean, reasons: string[] }

1. Reject unknown schema:
     bundle.schema !== "grid-passport/bundle" → fail

2. Reject unknown major version:
     major(bundle.version) !== 1 → fail

3. Reject missing signature:
     bundle.signature.alg !== "Ed25519" → fail
     bundle.signature.value not base64 → fail

4. Reconstruct signed bytes:
     canonical_bytes := JCS(bundle.payload)

5. Verify signature:
     Ed25519.verify(trustedPublicKey, canonical_bytes, base64Decode(bundle.signature.value))
     false → fail "signature invalid"

6. Verify issuer key matches trusted key:
     base64Decode(bundle.payload.issuer.publicKey) !== trustedPublicKey → fail
     // Defense in depth: even if the signature verifies under trustedPublicKey,
     // we reject if the bundle advertises a different issuer.

7. Recompute keyId:
     computed_keyId := hex(SHA256(trustedPublicKey))[0:16]
     computed_keyId !== bundle.payload.issuer.keyId → fail

8. Verify audit chain integrity:
     for i in 0 .. len(auditChain) - 1:
       if i == 0:
         require auditChain[i].prevHash == null
       else:
         expected := "sha256:" + hex(SHA256(JCS(auditChain[i-1])))
         require auditChain[i].prevHash == expected
     any failure → fail "audit chain broken at seq=N"

9. return { ok: true, reasons: [] }
```

The policy-hash fields (`payload.policyHash.rego`, `payload.policyHash.runtime`) are carried for downstream binding but **not verified automatically**. The verifier library returns them in the result so the caller can compare against known-good hashes for their environment. This keeps the verifier pure (no file-system access, no version registry) while preserving the binding.

### 5.3 Properties

- **Integrity.** Any mutation of any byte inside `payload` invalidates step 5. (Including: reorder a single event in `auditChain`, flip a bit in a projection, change `policyVersion`.)
- **Authenticity.** Step 5 passes only if the signature was produced by the holder of the private key corresponding to `trustedPublicKey`. Assuming Ed25519 security (128-bit classical), this requires either the private key or a classical forgery that has never been publicly demonstrated.
- **Non-repudiation.** Given the private key was held exclusively by the applicant (§3.4 T6), the applicant cannot plausibly deny producing the bundle.
- **Cross-verifiability.** The algorithm is specified by reference to RFC 7519-family open standards. Any conforming JCS library + any conforming Ed25519 library + any SHA-256 library can implement the verifier in ~200 LoC.

---

## 6. Deferred decisions

Recorded here so they don't get re-litigated as "we never thought about X."

| Item | Deferred because | When to revisit |
|---|---|---|
| **Revocation.** If the applicant's private key is compromised, how do we invalidate past bundles? | v1 has no revocation mechanism. Applicant rotates to a new key, shares new `keyId` with utility out-of-band, prior bundles remain technically valid under the old key. | When a utility partner asks for a compromise response story — likely in the Dominion intake design conversation. |
| **Expiry.** `validUntil` is in the schema but always `null` in v1. | No utility has asked for it yet; adds state to the verifier ("what is `now`?") without obvious value for a static disclosure. | When intake portals want to enforce "bundle must be ≤ 30 days old." Trivial to enable (verifier checks `now < validUntil`). |
| **Multi-signature** (applicant + Interviewer attestation, or applicant + Notary). | v1 has a single `signature` field. The schema already allows extension to an array (bump to v1.1 additive). | When we ship the Notary or Interviewer Skill and want to capture "this field was transcribed by Interviewer, attested by the applicant." Natural Phase 5+ work. |
| **Post-quantum signatures** (ML-DSA / Falcon). | No standard library in JS ecosystem has gotten stable; perf is 10–100× worse; no counterparty is asking. | When NIST PQC suite is in FIPS 140-3 and `@noble/post-quantum` (or similar) ships a stable release. W3C VC Data Integrity is already adding a PQ cryptosuite for its April 2026 charter. |
| **Hardware-backed signing** (Secure Enclave / TPM direct). | OS keychain (§3.4) already stores keys in hardware-backed slots where the platform exposes them. Direct Secure Enclave use would require Rust code in `src-tauri/` that calls the CryptoKit/CryptoAPI. | When a utility requires FIPS-validated signing; before any government-side regulator engagement. |
| **Transparency log** (Rekor-style public audit of signings). | Breaks the confidentiality model (see §3.4 rejection of keyless). | Probably never in this form. A *private* transparency log per utility-applicant pair could be a #11 extension. |

---

## 7. What the verifier is

A standalone TypeScript package `packages/verifier/` with:

- One function: `verifyBundle(bytes: Uint8Array | string, trustedPublicKey: Uint8Array): Promise<VerifyResult>`.
- Zero framework dependencies (no React, no Next, no Tauri). Runs in Node, the browser, Deno, Bun.
- Runtime deps: `canonicalize`, `@noble/ed25519`. That's it.
- A thin CLI wrapper (`grid-passport-verify <bundle.json> <pubkey.txt>`) for operator use.
- Target: 300 LoC including types, tests, and CLI.

**Why a separate package (not a method on `@grid-passport/core`)?** Because the verifier is the thing a skeptical utility audits before trusting us. It has to be small, dependency-free, and inspectable in an afternoon. Shipping it as part of `@grid-passport/core` buries it in 5,000 lines of projection/forecast/audit code. A separate package is a *commitment device* to keep it small.

---

## 8. Post-quantum readiness note

Ed25519 is not post-quantum secure. A sufficiently large quantum computer running Shor's algorithm recovers the private key from the public key. None exist today; conservative estimates put "CRQC" (cryptographically-relevant quantum computer) at 2035–2040 for 256-bit ECC.

Our migration path when PQ is required:

1. The `signature.alg` field already allows negotiation. Add `"Ed25519+ML-DSA-65"` as a composite scheme (per [draft-ietf-lamps](https://datatracker.ietf.org/doc/html/draft-ietf-lamps-pq-composite-sigs)): signature is the concatenation of Ed25519 and ML-DSA signatures, and a verifier requires both to validate.
2. Composite mode is a safety net: even if ML-DSA is broken post-deployment, Ed25519 still holds; if a quantum computer breaks Ed25519, ML-DSA still holds.
3. Schema version bumps to 2.0.0.

This is not work for today. It is documented now so that anyone asking "what about PQ?" has an answer besides "shrug."

---

## 9. The Dominion seam

Three of the above decisions ([D-4] key identity, [D-6] policy hash, the deferred revocation/expiry items) have points that benefit from co-design with the first utility counterparty. Those points are:

- **Onboarding handshake.** How exactly does the applicant share their `keyId` with Dominion? Is it part of an existing onboarding form? A physical document? An email to a known intake address? (Pure process, no crypto.)
- **Intake validation.** Does Dominion's intake system run our verifier library, or re-implement verification in their existing stack? Either is fine; the answer changes who carries the maintenance burden for the verifier.
- **Pinning strategy.** Does Dominion pin one `keyId` per applicant company, or per-project? The first is simpler (SSH model); the second is more granular but requires key-rotation tooling.
- **Rejection response.** When a bundle fails verification, what does the intake system tell the applicant? "Rejected — signature invalid" is useless; "Rejected — keyId does not match the one we have on file for Loudoun LLC; please re-run onboarding" is actionable.

None of these change the protocol. All of them change the *integration contract* the protocol is embedded in. Take them to the first Dominion meeting as agenda items rather than trying to decide them alone now.

---

## 10. Demo defense — anticipated questions

Material for research-narrative Q&A and any demo-day interrogation.

**Q1. "Why not just use JWT? Everyone uses JWT."**
A. JWTs are for API authentication — claims about "who is making this request right now." Our artifact is a *document* that gets read, filed, and re-verified years later. JSON Web Signature's base64url payload would force every verifier to decode before reading; W3C chose the same embedded-proof model for Verifiable Credentials for exactly this reason. We followed their lead.

**Q2. "Ed25519 over P-256? NIST standardized P-256."**
A. NIST standardized Ed25519 too — FIPS 186-5 (2023) added EdDSA. We don't face FIPS 140-3 module compliance (we're not a government system or TLS CA), so we optimize for the technical merits: Ed25519 is deterministic (no nonce leak failure mode), side-channel safer, faster, smaller. If a regulator partner later requires FIPS 140-3, we add P-256 as a second alg under `signature.alg` negotiation; the protocol allows it.

**Q3. "What happens if the applicant's laptop is stolen?"**
A. The private key was in the OS keychain, which on modern hardware is backed by the Secure Enclave (Apple Silicon) or TPM (Windows/Linux). The attacker needs to unlock the laptop *and* authorize keychain access — that's two factors. If they succeed, the applicant rotates: generates a new keypair, notifies the utility out-of-band (same channel as initial onboarding), the utility updates the pinned `keyId`. Bundles signed by the old key before rotation are still technically valid, which matters for a utility that already consumed them — this is the same revocation-lag problem as SSH keys and we handle it the same way (manual, explicit rotation on the utility side).

**Q4. "What stops me from swapping a private value in `projections.utility` and re-signing?"**
A. You don't have the private key. The signature proves the payload hasn't been modified since it left the machine that holds the private key. If the applicant colludes with a utility to sneak a private value into a projection, that's outside our threat model — we defend against in-transit tampering and forgery, not against the endpoints themselves. The privacy mechanism inside the projection layer handles the applicant-side case: the projection function is pure, produced by code an auditor can read, and its output for a given role does not depend on the applicant's intent to leak.

**Q5. "Why a hash chain instead of a Merkle tree? Merkle trees are more modern."**
A. Merkle trees are the right answer for transparency logs at scale (Certificate Transparency, Sigstore's Rekor). They give O(log n) inclusion proofs at the cost of data-structure complexity. Our bundles have 5–8 audit events; a hash chain fits in a stanza of JSON and a verifier can eyeball it. At 10⁶ events we'd switch; we won't have 10⁶ events, because each bundle is one coordination event, not a ledger.

**Q6. "Who signed the `policyHash`?"**
A. The applicant did — the hash is inside `payload`, covered by the same signature that covers the projections. The hash itself is over Grid Passport's policy source, so the applicant is effectively signing "I produced this disclosure *under* this version of the policy." A verifier who recomputes the hash from the Grid Passport release they have on file gets to check that the applicant wasn't running a rogue build.

**Q7. "Is the bundle personally identifiable?"**
A. The `issuer` block identifies the applicant (by public key + label). The projections contain no raw private fields by construction (the privacy canary enforces this, and the audit chain is inside the signed payload so the enforcement is also locked in). So: yes, the bundle identifies the applicant; no, it does not carry their private data in clear. This is the correct trade-off for a non-anonymous disclosure protocol — anonymity would break the utility's intake process.

**Q8. "Could this work for regulator submissions, not just utility?"**
A. Yes, and the protocol doesn't change. The regulator gets the same bundle, verifies with the same public key, and reads `projections.regulator` instead of `projections.utility`. The role-conditional projection is already handled inside `payload`. What *does* change is the legal-process side (chain of custody for regulatory proceedings), which is adjacent to the cryptographic protocol and depends on the jurisdiction.

**Q9. "What library are you actually trusting?"**
A. Three, total: `canonicalize` (RFC 8785 implementation, 200 LoC of spec-mechanical work), `@noble/ed25519` (Cure53-audited family, 5 KB, zero deps, maintained by Paul Miller — one of the most respected cryptography engineers in the JS ecosystem), and `crypto.subtle.digest` (a W3C standard implemented by every JS runtime's vendor team). The verifier package itself has exactly these three runtime dependencies. No wrappers, no "crypto framework" abstractions.

**Q10. "Why should Dominion trust a protocol you designed in a week?"**
A. They shouldn't trust us — they should trust the primitives. Every choice in this document is either (a) an IETF standards-track specification with external test vectors, (b) a W3C recommendation, or (c) a library whose correctness can be verified against those specifications. Our contribution is the *composition* — how the primitives fit together to match the disclosure workflow — and that composition is readable in §4 and §5 in under a page. That's the audit surface.

---

## 11. References

IETF / W3C standards:
- [RFC 8785 — JSON Canonicalization Scheme (JCS)](https://www.rfc-editor.org/rfc/rfc8785)
- [RFC 8032 — Edwards-Curve Digital Signature Algorithm (EdDSA)](https://www.rfc-editor.org/rfc/rfc8032)
- [RFC 7515 — JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515) (alternative, rejected per §3.1)
- [W3C Verifiable Credentials Data Integrity 1.1](https://w3c.github.io/vc-data-integrity/) (embedded-proof model reference, §3.3)
- [FIPS 186-5](https://csrc.nist.gov/pubs/fips/186-5/final) (NIST EdDSA standardization, cited in Q2)

Research / guidance:
- [Crosby & Wallach, USENIX Security 2009 — *Efficient Data Structures for Tamper-Evident Logging*](https://static.usenix.org/event/sec09/tech/full_papers/crosby.pdf)
- [Soatok (2022), *Guidance for Choosing an Elliptic Curve Signature Algorithm*](https://soatok.blog/2022/05/19/guidance-for-choosing-an-elliptic-curve-signature-algorithm-in-2022/)
- [Digital Signatures 2025: ECDSA vs EdDSA](https://www.onlinehashcrack.com/guides/cryptography-algorithms/digital-signatures-2025-ecdsa-vs-eddsa.php)

Libraries:
- [`canonicalize`](https://www.npmjs.com/package/canonicalize) — npm, JCS
- [`@noble/ed25519`](https://www.npmjs.com/package/@noble/ed25519) — npm, Ed25519 ([audits in noble-curves](https://github.com/paulmillr/noble-curves/tree/main/audit))
- [`tauri-plugin-keyring`](https://github.com/HuakunShen/tauri-plugin-keyring) — wraps Rust [`keyring`](https://crates.io/crates/keyring)

Related systems (referenced as comparable prior art):
- [C2PA Content Credentials](https://spec.c2pa.org/specifications/specifications/2.3/specs/C2PA_Specification.html) — claim-generator + signed manifest pattern
- [Sigstore bundle format](https://docs.sigstore.dev/about/bundle/) / [in-toto attestations](https://in-toto.io/) — DSSE envelope pattern

---

## 12. Open items for implementation

Tracked as tasks in the current session:

1. Swap `packages/core/src/audit.ts` from `node:crypto` to WebCrypto (async `subtle.digest`). Add `prevHash` field.
2. Create `packages/core/src/bundle.ts` with the v1 schema, signing function, hash utilities.
3. Create `packages/verifier/` package. Zero framework deps.
4. Create `apps/desktop/src-tauri/src/keyring.rs` binding to `tauri-plugin-keyring`. Expose `get_or_create_keypair()` command.
5. Wire the desktop "Export bundle" button to the signer.
6. Vitest suite — tamper cases enumerated in §2.
7. `pnpm bundle:canary` — end-to-end sign → verify ok → tamper one byte → verify fails.
8. Update roadmap + handoff.

When all eight are done, the protocol is landed in v1.0.0.
