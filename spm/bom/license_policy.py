"""
AI-BOM license policy.

Classifies a component's license against three sets: allowed (permissive and
common weak-copyleft), review (strong copyleft and non-commercial that need a
legal decision), and denied (licenses the organization refuses in shipped AI
components, and "unknown" when a component has no license recorded).

Used by services/spm_api/bom_routes.py (the /bom/license-report endpoint) and
by the compliance rule `bom_licenses_allowed`.
"""
from __future__ import annotations

from typing import Dict, List

# Normalised (lower-case, stripped) SPDX-ish identifiers.
ALLOWED_LICENSES = {
    "mit", "mit-0", "apache-2.0", "apache 2.0", "apache", "bsd-2-clause", "bsd-3-clause", "bsd",
    "isc", "0bsd", "unlicense", "cc0-1.0", "cc0", "python-2.0", "psf", "zlib", "mpl-2.0",
    "openrail", "openrail-m", "bigscience-openrail-m", "creativeml-openrail-m", "apache-2.0-with-llvm-exception",
}

REVIEW_LICENSES = {
    "gpl-2.0", "gpl-3.0", "gpl", "lgpl-2.1", "lgpl-3.0", "lgpl", "agpl-3.0", "agpl", "epl-2.0",
    "cc-by-4.0", "cc-by-sa-4.0", "cc-by-nc-4.0", "cc-by-nc-sa-4.0", "llama-2", "llama-3", "llama2", "llama3",
    "gemma", "falcon-180b-tii-license", "cc-by-nc-nd-4.0", "bsl-1.1", "elastic-2.0", "sspl-1.0",
    "proprietary", "commercial", "research-only", "non-commercial", "other",
}

# Explicitly refused in shipped AI components. "unknown" is handled separately
# (no license recorded) and always counts as denied for the gate.
DENIED_LICENSES = {
    "wtfpl", "do-what-the-fuck-you-want", "json",  # JSON "good not evil" clause is not OSI-approved
    "unknown-viral", "cc-by-nc-nd-3.0",
}


def classify(license_str: str | None) -> str:
    """Return 'allowed' | 'review' | 'denied' | 'unknown' for one license string."""
    if not license_str or not license_str.strip():
        return "unknown"
    key = license_str.strip().lower()
    if key in DENIED_LICENSES:
        return "denied"
    if key in ALLOWED_LICENSES:
        return "allowed"
    if key in REVIEW_LICENSES:
        return "review"
    # Prefix heuristics for versioned identifiers not in the sets above.
    if key.startswith(("gpl", "agpl", "lgpl", "cc-by-nc", "cc-by-sa")):
        return "review"
    if key.startswith(("apache", "bsd", "mit")):
        return "allowed"
    return "review"


def evaluate(components: List[Dict]) -> Dict:
    """
    Summarise a list of components ({name, version, license, ...}) against the
    policy. Returns counts, a per-component verdict, and a gate result.
    """
    buckets = {"allowed": [], "review": [], "denied": [], "unknown": []}
    for c in components:
        verdict = classify(c.get("license"))
        buckets[verdict].append({
            "id": c.get("id"), "name": c.get("name"), "version": c.get("version"),
            "license": c.get("license"), "component_type": c.get("component_type"), "verdict": verdict,
        })
    counts = {k: len(v) for k, v in buckets.items()}
    # Gate fails on any denied license or any component with no license recorded.
    passed = counts["denied"] == 0 and counts["unknown"] == 0
    return {
        "counts": counts,
        "total": sum(counts.values()),
        "passed": passed,
        "components": buckets["denied"] + buckets["unknown"] + buckets["review"] + buckets["allowed"],
    }
