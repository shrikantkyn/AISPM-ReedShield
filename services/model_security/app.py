"""
services/model_security/app.py
───────────────────────────────
Model artifact security scanner — wraps Protect AI's open-source ModelScan
(https://github.com/protectai/modelscan, Apache 2.0) to detect unsafe
deserialization (malicious pickle/H5/SavedModel payloads) in uploaded model
files, following the exact sidecar shape already used by garak-runner:
a small FastAPI wrapper around a real security-scanning library, findings
normalised and persisted into the platform's existing threat_findings table
(never a second findings store).

Endpoints:
    GET  /health
    POST /scan   — upload a model file; returns the normalised scan result
                   and (fire-and-forget) persists one finding per issue
                   found into threat_findings (source="modelscan").

Security note: this service only ever reads the uploaded file from its own
tmp directory and never touches the host filesystem, production credentials,
the Docker socket, or any other service's volume — model artifacts are
untrusted input by definition (that's the entire point of scanning them).
"""
from __future__ import annotations

import asyncio
import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from findings_client import get_findings_client

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
log = logging.getLogger("model_security")

app = FastAPI(title="ReedShield Model Security", version="1.0.0")

_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024  # 2 GiB — generous for LLM weight files
_SEVERITY_MAP = {
    "CRITICAL": "critical",
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
}


class ScanIssue(BaseModel):
    severity: str
    description: str
    source: str | None = None


class ScanResult(BaseModel):
    asset_name: str
    scanned: bool
    issue_count: int
    issues: list[ScanIssue]
    findings_persisted: int
    error: str | None = None


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "model_security"}


def _run_modelscan(path: str) -> dict[str, Any]:
    """Runs ModelScan synchronously (it's a CPU-bound file-parsing library,
    not async-native) — called via asyncio.to_thread from the route handler
    so it doesn't block the event loop.

    Returns a dict with the shape ModelScan's own Python API produces:
    {"summary": {...}, "issues": [{"severity", "description", "source"}, ...], "errors": [...]}
    Wrapped defensively — if the installed modelscan version's API differs
    slightly (return shape has shifted between releases), we degrade to an
    "unscanned" result rather than crashing the request.
    """
    try:
        from modelscan.modelscan import ModelScan
    except ImportError as exc:
        log.error("modelscan library not importable: %s", exc)
        return {"issues": [], "errors": [f"modelscan not installed: {exc}"]}

    try:
        scanner = ModelScan()
        report = scanner.scan(path)
        if isinstance(report, dict):
            return report
        # Some modelscan versions return None from .scan() and expose state
        # on the scanner instance instead.
        issues = getattr(scanner, "issues", None)
        all_issues = issues.all_issues if issues is not None else []
        return {
            "issues": [
                {
                    "severity": getattr(i, "severity", getattr(i, "severity_name", "MEDIUM")),
                    "description": str(getattr(i, "description", i)),
                    "source": str(getattr(i, "source", "") or ""),
                }
                for i in all_issues
            ],
            "errors": [],
        }
    except Exception as exc:
        log.exception("modelscan.scan() failed for %s", path)
        return {"issues": [], "errors": [str(exc)]}


@app.post("/scan", response_model=ScanResult)
async def scan_model(file: UploadFile = File(...)) -> ScanResult:
    asset_name = file.filename or f"upload-{uuid.uuid4().hex[:8]}"

    with tempfile.TemporaryDirectory(prefix="modelscan-") as tmpdir:
        dest = Path(tmpdir) / asset_name
        written = 0
        with open(dest, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > _MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Model file too large to scan")
                f.write(chunk)

        report = await asyncio.to_thread(_run_modelscan, str(dest))

    raw_issues = report.get("issues", [])
    errors = report.get("errors", [])

    issues = [
        ScanIssue(
            severity=_SEVERITY_MAP.get(
                str(iss.get("severity", "MEDIUM")).upper(), "medium",
            ),
            description=str(iss.get("description", "Unspecified finding")),
            source=iss.get("source"),
        )
        for iss in raw_issues
    ]

    persisted = 0
    client = get_findings_client()
    for issue in issues:
        result = await client.persist_finding(
            asset_name=asset_name,
            severity=issue.severity,
            description=issue.description,
            evidence=[issue.source] if issue.source else [],
        )
        if "error" not in result:
            persisted += 1

    return ScanResult(
        asset_name=asset_name,
        scanned=not errors,
        issue_count=len(issues),
        issues=issues,
        findings_persisted=persisted,
        error="; ".join(errors) if errors else None,
    )
