"""Deterministic stub sentence embedder for Concordia's
`AssociativeMemoryBank`.

Concordia memory banks need a `Callable[[str], np.ndarray]`. For the
bench we don't need state-of-the-art retrieval — per-run memories are
small (~30 turns) and recency-weighted retrieval works fine even on
random projections. We use a SHA256-derived 64-dim vector so memory is
(a) deterministic across seeds for reproducibility, (b) free of an
extra model dependency, (c) fast enough to not dominate run wall-clock.

If retrieval quality becomes a measured-pain point in the pilot
(e.g. the wrong prior turn keeps coming back when an Applicant
recalls), swap to a real embedder (sentence-transformers MiniLM works
out of the box) — `build_*` factories accept an embedder override.
"""

from __future__ import annotations

import hashlib

import numpy as np


def deterministic_embedder(text: str, *, dim: int = 64) -> np.ndarray:
    """Return a `dim`-dimensional unit-norm vector deterministic in `text`.

    Uses SHA256 to seed a numpy RNG, then samples `dim` standard normals.
    The vector is L2-normalized so cosine similarity reduces to a dot
    product — Concordia's basic memory bank uses cosine similarity.
    """
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    seed_int = int.from_bytes(digest[:8], "big", signed=False)
    rng = np.random.default_rng(seed_int)
    vec = rng.standard_normal(dim).astype(np.float32)
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm
