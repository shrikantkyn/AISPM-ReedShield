#!/usr/bin/env python3
"""
ReedShield Code Guardrails CLI — run the shift-left rules locally or in CI.

    python scripts/reedshield_codeguard.py [PATH] [--fail-on HIGH] [--json out.json]
        [--post http://localhost:3001/api/spm/codeguard/scan --token $REEDSHIELD_TOKEN]
        [--repo org/name --ref main]

Exit code 1 when a finding is at or above --fail-on (default HIGH), so the
command can gate a pull request. With --post, the scan is also recorded in
ReedShield so the Code Guardrails page and the compliance evidence see it.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from spm.codeguard import gate, scan_files, should_scan_path, summarize  # noqa: E402


def iter_files(root: str):
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root)
        dirnames[:] = [d for d in dirnames if should_scan_path(os.path.join(rel_dir, d, "x"))]
        for name in filenames:
            rel = os.path.normpath(os.path.join(rel_dir, name)).replace("\\", "/")
            if rel.startswith("./"):
                rel = rel[2:]
            if not should_scan_path(rel):
                continue
            full = os.path.join(dirpath, name)
            try:
                if os.path.getsize(full) > 1_000_000:
                    continue
                with open(full, "r", encoding="utf-8", errors="ignore") as fh:
                    yield rel, fh.read()
            except OSError:
                continue


def main() -> int:
    ap = argparse.ArgumentParser(description="ReedShield Code Guardrails scanner")
    ap.add_argument("path", nargs="?", default=".")
    ap.add_argument("--fail-on", default="HIGH", choices=["CRITICAL", "HIGH", "MEDIUM", "LOW"])
    ap.add_argument("--json", dest="json_out")
    ap.add_argument("--post", help="ReedShield spm-api base URL to record the scan, e.g. http://localhost:3001/api/spm")
    ap.add_argument("--token", default=os.getenv("REEDSHIELD_TOKEN"), help="Bearer token (or REEDSHIELD_TOKEN)")
    ap.add_argument("--repo", default=os.getenv("GITHUB_REPOSITORY") or os.path.basename(os.path.abspath(".")))
    ap.add_argument("--ref", default=os.getenv("GITHUB_REF_NAME") or os.getenv("GITHUB_SHA") or "local")
    args = ap.parse_args()

    files = list(iter_files(args.path))
    findings = scan_files(files)
    counts = summarize(findings)
    passed = gate(findings, args.fail_on)

    print(f"ReedShield Code Guardrails — {len(files)} files scanned")
    print("  " + "  ".join(f"{k}: {v}" for k, v in counts.items()))
    for f in findings:
        print(f"  [{f.severity}] {f.rule_id} {f.file_path}:{f.line}  {f.title}")
        print(f"           {f.snippet}")
    print("RESULT:", "PASSED" if passed else f"FAILED (findings at or above {args.fail_on})")

    payload = {
        "repo": args.repo, "ref": args.ref, "source": "ci" if os.getenv("CI") else "cli",
        "files_scanned": len(files), "fail_on": args.fail_on,
        "findings": [f.as_dict() for f in findings],
    }
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
    if args.post:
        if not args.token:
            print("--post needs --token or REEDSHIELD_TOKEN", file=sys.stderr)
            return 2
        req = urllib.request.Request(
            args.post.rstrip("/") + "/codeguard/scans/record",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {args.token}"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                print("Recorded in ReedShield:", resp.status)
        except Exception as exc:  # noqa: BLE001
            print("Could not record the scan in ReedShield:", exc, file=sys.stderr)
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
