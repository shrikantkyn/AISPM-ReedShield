"""
Code Guardrails routes — shift-left scanning of AI application code.

    POST /codeguard/scan            JSON {repo, ref, files:[{path, content}]} → runs the rules, stores the scan
    POST /codeguard/scan/upload     multipart zip → same, for a repository archive
    POST /codeguard/scans/record    JSON produced by scripts/reedshield_codeguard.py in CI (findings already computed)
    POST /codeguard/scans/sample    scans the built-in sample repository (demonstration)
    GET  /codeguard/scans           recent scans
    GET  /codeguard/scans/{id}      one scan with its findings
    GET  /codeguard/rules           the rule catalogue

Read needs model.read; scanning and recording need model.write (developers,
AppSec, admins). Snippets are redacted by the rules module before storage.
"""
from __future__ import annotations

import io
import logging
import uuid
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from platform_shared.rbac import IdentityContext, require_model_read, require_model_write
from spm.codeguard import RULES, SAMPLE_REPO, gate, scan_files, should_scan_path, summarize
from spm.db.models import CodeFinding, CodeScan
from spm.db.session import get_db

log = logging.getLogger("spm-api.codeguard")
router = APIRouter(prefix="/codeguard", tags=["codeguard"])

MAX_ZIP_BYTES = 50 * 1024 * 1024
MAX_FILES = 5000


class FileIn(BaseModel):
    path: str = Field(..., max_length=512)
    content: str = Field(..., max_length=1_000_000)


class ScanIn(BaseModel):
    repo: str = Field(..., max_length=200)
    ref: Optional[str] = Field("local", max_length=200)
    source: str = Field("api", max_length=32)
    fail_on: str = Field("HIGH", pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    files: List[FileIn] = Field(..., max_length=MAX_FILES)


class FindingIn(BaseModel):
    rule_id: str
    severity: str = Field(..., pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    message: str
    file_path: str
    line: Optional[int] = None
    snippet: Optional[str] = None
    remediation: Optional[str] = None


class RecordIn(BaseModel):
    repo: str = Field(..., max_length=200)
    ref: Optional[str] = Field("local", max_length=200)
    source: str = Field("ci", max_length=32)
    files_scanned: int = 0
    fail_on: str = Field("HIGH", pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    findings: List[FindingIn] = Field(default_factory=list, max_length=20000)


def _tenant(identity: IdentityContext) -> str:
    return identity.tenant_id or "t1"


def _scan_out(s: CodeScan, with_findings: bool = False) -> Dict[str, Any]:
    d = {
        "id": str(s.id), "repo": s.repo, "ref": s.ref, "source": s.source, "triggered_by": s.triggered_by,
        "files_scanned": s.files_scanned, "critical": s.critical, "high": s.high, "medium": s.medium, "low": s.low,
        "status": s.status, "started_at": s.started_at.isoformat() if s.started_at else None,
        "finished_at": s.finished_at.isoformat() if s.finished_at else None,
    }
    if with_findings:
        d["findings"] = [
            {"id": str(f.id), "rule_id": f.rule_id, "severity": f.severity, "file_path": f.file_path, "line": f.line,
             "message": f.message, "remediation": f.remediation, "snippet": f.snippet, "status": f.status}
            for f in sorted(s.findings, key=lambda f: (["CRITICAL", "HIGH", "MEDIUM", "LOW"].index(f.severity), f.file_path, f.line or 0))
        ]
    return d


async def _persist(db: AsyncSession, identity: IdentityContext, *, repo: str, ref: str, source: str,
                   files_scanned: int, findings: List[Dict[str, Any]], fail_on: str) -> CodeScan:
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in findings:
        counts[f["severity"]] += 1
    order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    failed = any(order.index(f["severity"]) <= order.index(fail_on) for f in findings)
    scan = CodeScan(
        tenant_id=_tenant(identity), repo=repo, ref=ref or "local", source=source,
        triggered_by=identity.user_id, files_scanned=files_scanned,
        critical=counts["CRITICAL"], high=counts["HIGH"], medium=counts["MEDIUM"], low=counts["LOW"],
        status="failed" if failed else "passed", finished_at=datetime.now(timezone.utc),
    )
    for f in findings[:20000]:
        scan.findings.append(CodeFinding(
            rule_id=f["rule_id"], severity=f["severity"], file_path=f["file_path"][:512], line=f.get("line"),
            message=f["message"][:500], remediation=(f.get("remediation") or "")[:1000],
            snippet=(f.get("snippet") or "")[:160],
        ))
    db.add(scan)
    await db.commit()
    # expire_on_commit=False keeps the appended findings in memory; only the
    # server-default timestamp needs refreshing. Refreshing the whole object
    # would expire the findings relationship and trigger a lazy load outside
    # the async greenlet (MissingGreenlet).
    await db.refresh(scan, attribute_names=["started_at"])
    return scan


@router.get("/rules")
async def list_rules(_identity: IdentityContext = Depends(require_model_read)) -> List[Dict[str, Any]]:
    return [{"id": r.id, "severity": r.severity, "title": r.title, "remediation": r.remediation} for r in RULES]


@router.post("/scan")
async def scan_json(body: ScanIn, db: AsyncSession = Depends(get_db),
                    identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    findings = [f.as_dict() for f in scan_files((f.path, f.content) for f in body.files)]
    scan = await _persist(db, identity, repo=body.repo, ref=body.ref, source=body.source,
                          files_scanned=len(body.files), findings=findings, fail_on=body.fail_on)
    return _scan_out(scan, with_findings=True)


@router.post("/scan/upload")
async def scan_upload(file: UploadFile = File(...), repo: str = Query("upload", max_length=200),
                      ref: str = Query("local", max_length=200), fail_on: str = Query("HIGH"),
                      db: AsyncSession = Depends(get_db),
                      identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    raw = await file.read(MAX_ZIP_BYTES + 1)
    if len(raw) > MAX_ZIP_BYTES:
        raise HTTPException(status_code=413, detail="Archive exceeds 50 MB")
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Upload a .zip archive of the repository")
    files: List[tuple[str, str]] = []
    for info in zf.infolist():
        if info.is_dir() or len(files) >= MAX_FILES:
            continue
        name = info.filename.replace("\\", "/")
        if name.startswith("/") or ".." in name.split("/"):
            continue                      # archive traversal: skip silently
        if not should_scan_path(name) or info.file_size > 1_000_000:
            continue
        try:
            files.append((name, zf.read(info).decode("utf-8", errors="ignore")))
        except Exception:  # noqa: BLE001
            continue
    findings = [f.as_dict() for f in scan_files(files)]
    scan = await _persist(db, identity, repo=repo, ref=ref, source="upload",
                          files_scanned=len(files), findings=findings, fail_on=fail_on if fail_on in ("CRITICAL", "HIGH", "MEDIUM", "LOW") else "HIGH")
    return _scan_out(scan, with_findings=True)


@router.post("/scans/record")
async def record_scan(body: RecordIn, db: AsyncSession = Depends(get_db),
                      identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    findings = [f.model_dump() for f in body.findings]
    scan = await _persist(db, identity, repo=body.repo, ref=body.ref, source=body.source,
                          files_scanned=body.files_scanned, findings=findings, fail_on=body.fail_on)
    return _scan_out(scan)


@router.post("/scans/sample")
async def scan_sample(db: AsyncSession = Depends(get_db),
                      identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    findings = [f.as_dict() for f in scan_files(SAMPLE_REPO)]
    scan = await _persist(db, identity, repo="reedshield-samples/insecure-ai-app", ref="main", source="sample",
                          files_scanned=len(SAMPLE_REPO), findings=findings, fail_on="HIGH")
    return _scan_out(scan, with_findings=True)


@router.get("/scans")
async def list_scans(limit: int = Query(50, ge=1, le=500), db: AsyncSession = Depends(get_db),
                     identity: IdentityContext = Depends(require_model_read)) -> List[Dict[str, Any]]:
    rows = (await db.execute(
        select(CodeScan).where(CodeScan.tenant_id == _tenant(identity)).order_by(CodeScan.started_at.desc()).limit(limit)
    )).scalars().all()
    return [_scan_out(s) for s in rows]


@router.get("/scans/{scan_id}")
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_db),
                   identity: IdentityContext = Depends(require_model_read)) -> Dict[str, Any]:
    try:
        sid = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="scan not found")
    scan = await db.get(CodeScan, sid)
    if scan is None or scan.tenant_id != _tenant(identity):
        raise HTTPException(status_code=404, detail="scan not found")
    await db.refresh(scan, attribute_names=["findings"])
    return _scan_out(scan, with_findings=True)
