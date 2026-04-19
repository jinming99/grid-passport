"""Grid Passport disclosure-bundle verifier — Python reference implementation.

Proves the protocol is portable across language stacks. Consumes a bundle
signed by the TypeScript signer (apps/desktop or packages/core/src/bundle.ts)
and verifies it using only PyCA cryptography + stdlib.

Mirrors packages/verifier/src/index.ts. Any divergence between the two is a
spec bug. See docs/design/signed-bundle.md for design rationale and
docs/design/signed-bundle-spec.md for the normative algorithm.

Usage:
    python grid_passport_verifier.py <bundle.json> <pubkey.b64-or-hex>

Exits 0 on valid, 1 on invalid, 2 on malformed input.
"""
from __future__ import annotations

import base64
import hashlib
import json
import sys
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

SUPPORTED_SCHEMA = "grid-passport/bundle"
SUPPORTED_MAJOR = 1
SUPPORTED_ALG = "Ed25519"


# --------------------------------------------------------------------
# RFC 8785 JCS — faithful to the TS version in packages/core/src/crypto.ts
# --------------------------------------------------------------------

def jcs(value: Any) -> str:
    """RFC 8785 JSON Canonicalization Scheme."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        if isinstance(value, float) and (value != value or value in (float("inf"), float("-inf"))):
            raise ValueError("JCS: NaN/Infinity not permitted")
        # Python's json.dumps produces ES6-compatible number serialization
        # for the values we care about. For integer floats (1.0), JCS wants
        # just "1"; json.dumps gives "1.0". Normalize.
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return json.dumps(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return "[" + ",".join(jcs(v) for v in value) + "]"
    if isinstance(value, dict):
        # UTF-16 code unit sort — Python's default string comparison is by
        # Unicode code point, which for BMP matches UTF-16 code units. For
        # supplementary-plane characters (emoji etc), we need to encode to
        # UTF-16 and compare.
        def sort_key(k: str) -> tuple:
            return tuple(k.encode("utf-16-be"))
        keys = sorted(value.keys(), key=sort_key)
        parts = [json.dumps(k, ensure_ascii=False) + ":" + jcs(value[k]) for k in keys]
        return "{" + ",".join(parts) + "}"
    raise TypeError(f"JCS: unsupported type {type(value).__name__}")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def key_id(public_key_bytes: bytes) -> str:
    return sha256_hex(public_key_bytes)[:16]


# --------------------------------------------------------------------
# Verification
# --------------------------------------------------------------------

class VerifyResult:
    def __init__(self, ok: bool, reasons: list[str], payload: dict | None = None) -> None:
        self.ok = ok
        self.reasons = reasons
        self.payload = payload

    def __repr__(self) -> str:
        return f"VerifyResult(ok={self.ok}, reasons={self.reasons!r})"


def _structural_check(bundle: Any) -> str | None:
    if not isinstance(bundle, dict):
        return "bundle is not an object"
    if bundle.get("schema") != SUPPORTED_SCHEMA:
        return f"unknown schema: {bundle.get('schema')!r}"
    version = bundle.get("version")
    if not isinstance(version, str):
        return "version must be a string"
    try:
        major = int(version.split(".")[0])
    except (ValueError, IndexError):
        return f"malformed version: {version!r}"
    if major != SUPPORTED_MAJOR:
        return f"unsupported bundle major version: {version}"
    if not isinstance(bundle.get("payload"), dict):
        return "payload missing"
    sig = bundle.get("signature")
    if not isinstance(sig, dict):
        return "signature missing"
    if sig.get("alg") != SUPPORTED_ALG:
        return f"unsupported signature alg: {sig.get('alg')!r}"
    if not isinstance(sig.get("value"), str):
        return "signature.value must be base64 string"
    p = bundle["payload"]
    issuer = p.get("issuer")
    if not isinstance(issuer, dict):
        return "payload.issuer missing"
    if not isinstance(issuer.get("publicKey"), str):
        return "payload.issuer.publicKey missing"
    if not isinstance(issuer.get("keyId"), str):
        return "payload.issuer.keyId missing"
    if not isinstance(p.get("policyHash"), dict):
        return "payload.policyHash missing"
    if not isinstance(p.get("auditChain"), list):
        return "payload.auditChain missing"
    return None


def _verify_audit_chain(chain: list[dict]) -> str | None:
    for i, ev in enumerate(chain):
        if ev.get("seq") != i + 1:
            return f"audit chain: event index {i} has seq={ev.get('seq')}, expected {i + 1}"
        if i == 0:
            if ev.get("prevHash") is not None:
                return f"audit chain: first event prevHash must be null (got {ev.get('prevHash')})"
            continue
        expected = "sha256:" + sha256_hex(jcs(chain[i - 1]).encode("utf-8"))
        if ev.get("prevHash") != expected:
            return (
                f"audit chain: broken link at seq={ev.get('seq')} "
                f"(expected {expected}, got {ev.get('prevHash')})"
            )
    return None


def verify_bundle(bundle_text: str | bytes, trusted_public_key: bytes) -> VerifyResult:
    """Verify a Grid Passport disclosure bundle against a pinned public key.

    Parameters
    ----------
    bundle_text : bytes or str
        The raw bundle JSON. Not canonicalized — the verifier reads the
        payload field, re-canonicalizes via JCS, and checks the signature
        over those bytes.
    trusted_public_key : bytes
        32-byte Ed25519 public key the caller has pre-pinned for this
        applicant (SSH known_hosts model — see §3.4 of the design doc).

    Returns
    -------
    VerifyResult
        .ok == True only if all of: signature valid, issuer.publicKey
        matches the pinned key, keyId fingerprint matches, audit chain
        integrity holds.
    """
    if len(trusted_public_key) != 32:
        return VerifyResult(False, [f"trusted public key must be 32 bytes; got {len(trusted_public_key)}"])

    if isinstance(bundle_text, bytes):
        bundle_text = bundle_text.decode("utf-8")
    try:
        bundle = json.loads(bundle_text)
    except json.JSONDecodeError as e:
        return VerifyResult(False, [f"bundle is not valid JSON: {e}"])

    structural = _structural_check(bundle)
    if structural:
        return VerifyResult(False, [structural])

    reasons: list[str] = []
    canonical = jcs(bundle["payload"]).encode("utf-8")

    try:
        signature = base64.b64decode(bundle["signature"]["value"], validate=True)
    except Exception as e:
        return VerifyResult(False, [f"signature.value is not base64: {e}"])

    # 1. Signature verification
    try:
        pk = Ed25519PublicKey.from_public_bytes(trusted_public_key)
        pk.verify(signature, canonical)
    except InvalidSignature:
        reasons.append("signature invalid under trusted public key")
    except Exception as e:
        reasons.append(f"signature check threw: {e}")

    # 2. Issuer key matches trusted key
    try:
        declared = base64.b64decode(bundle["payload"]["issuer"]["publicKey"], validate=True)
        if declared != trusted_public_key:
            reasons.append("issuer.publicKey does not match trusted public key")
    except Exception as e:
        reasons.append(f"issuer.publicKey is not base64: {e}")

    # 3. keyId fingerprint
    expected_kid = key_id(trusted_public_key)
    if bundle["payload"]["issuer"]["keyId"] != expected_kid:
        reasons.append(
            f"issuer.keyId mismatch (expected {expected_kid}, got {bundle['payload']['issuer']['keyId']})"
        )

    # 4. Audit chain integrity
    chain_err = _verify_audit_chain(bundle["payload"]["auditChain"])
    if chain_err:
        reasons.append(chain_err)

    return VerifyResult(
        ok=len(reasons) == 0,
        reasons=reasons,
        payload=bundle["payload"] if len(reasons) == 0 else None,
    )


def _decode_pubkey(raw: str) -> bytes:
    raw = raw.strip()
    if len(raw) == 64 and all(c in "0123456789abcdefABCDEF" for c in raw):
        return bytes.fromhex(raw)
    return base64.b64decode(raw, validate=True)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: python grid_passport_verifier.py <bundle.json> <pubkey.b64|pubkey.hex>", file=sys.stderr)
        return 2
    bundle_path, key_path = sys.argv[1], sys.argv[2]
    with open(bundle_path, "r", encoding="utf-8") as f:
        bundle_text = f.read()
    with open(key_path, "r", encoding="utf-8") as f:
        pubkey = _decode_pubkey(f.read())
    if len(pubkey) != 32:
        print(f"public key must be 32 bytes (got {len(pubkey)})", file=sys.stderr)
        return 2
    result = verify_bundle(bundle_text, pubkey)
    if result.ok:
        print(
            f"[verify-py] ok · keyId={result.payload['issuer']['keyId']} · "
            f"{len(result.payload['auditChain'])} audit events"
        )
        print(f"  policy.rego    {result.payload['policyHash']['rego']}")
        print(f"  policy.runtime {result.payload['policyHash']['runtime']}")
        return 0
    print(f"[verify-py] FAILED · {len(result.reasons)} reason(s):", file=sys.stderr)
    for r in result.reasons:
        print(f"  - {r}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
