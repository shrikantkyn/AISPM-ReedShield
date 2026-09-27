"""
AI SPM — NIST AI RMF compliance evaluator.
Maps evaluation_rule names to functions that check CPM/SPM state.
"""
from __future__ import annotations
import json
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Callable, Coroutine, Any, Dict

import requests
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from spm.db.models import (
    AuditExport, ComplianceEvidence, ComplianceStatus,
    ModelRegistry, PostureSnapshot,
)

log = logging.getLogger("spm.compliance")

OPA_URL        = os.getenv("OPA_URL", "http://opa:8181")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")
OPA_POLICIES   = ["prompt_policy", "tool_policy", "output_policy", "memory_policy", "agent_policy"]


async def _rule_opa_policy_loaded(db: AsyncSession) -> ComplianceStatus:
    """Check all 5 OPA policies are loaded."""
    try:
        for policy in OPA_POLICIES:
            resp = requests.get(f"{OPA_URL}/v1/policies/{policy}", timeout=3.0)
            if resp.status_code != 200:
                return ComplianceStatus.partial
        return ComplianceStatus.satisfied
    except Exception:
        return ComplianceStatus.not_satisfied


async def _rule_model_approved_exists(db: AsyncSession) -> ComplianceStatus:
    """Check at least one model has an approved_by record."""
    result = await db.execute(
        select(func.count()).select_from(ModelRegistry)
        .where(ModelRegistry.approved_by.isnot(None))
    )
    count = result.scalar()
    return ComplianceStatus.satisfied if count > 0 else ComplianceStatus.partial


async def _rule_risk_fusion_active(db: AsyncSession) -> ComplianceStatus:
    """Check posture snapshots exist (indicates risk fusion is running)."""
    result = await db.execute(
        select(PostureSnapshot).order_by(PostureSnapshot.snapshot_at.desc()).limit(1)
    )
    snap = result.scalar_one_or_none()
    if snap is None:
        return ComplianceStatus.partial  # no data yet
    return ComplianceStatus.satisfied


async def _rule_models_have_risk_tier(db: AsyncSession) -> ComplianceStatus:
    """Check all registered models have a risk_tier set."""
    result = await db.execute(
        select(func.count()).select_from(ModelRegistry)
        .where(ModelRegistry.risk_tier.is_(None))
    )
    missing = result.scalar()
    return ComplianceStatus.satisfied if missing == 0 else ComplianceStatus.partial


async def _rule_snapshots_recent(db: AsyncSession) -> ComplianceStatus:
    """Check a snapshot was written in the last 10 minutes."""
    cutoff = datetime.now(tz=timezone.utc) - timedelta(minutes=10)
    result = await db.execute(
        select(func.count()).select_from(PostureSnapshot)
        .where(PostureSnapshot.snapshot_at >= cutoff)
    )
    count = result.scalar()
    return ComplianceStatus.satisfied if count > 0 else ComplianceStatus.partial


async def _rule_prometheus_reachable(db: AsyncSession) -> ComplianceStatus:
    """Check Prometheus is up."""
    try:
        resp = requests.get(f"{PROMETHEUS_URL}/-/healthy", timeout=3.0)
        return ComplianceStatus.satisfied if resp.status_code == 200 else ComplianceStatus.partial
    except Exception:
        return ComplianceStatus.not_satisfied


async def _rule_enforcement_action_exists(db: AsyncSession) -> ComplianceStatus:
    """Check at least one enforcement action in last 30 days."""
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=30)
    result = await db.execute(
        select(func.count()).select_from(AuditExport)
        .where(AuditExport.event_type.in_(["enforcement_block", "freeze_applied"]))
        .where(AuditExport.timestamp >= cutoff)
    )
    count = result.scalar()
    return ComplianceStatus.satisfied if count > 0 else ComplianceStatus.partial


MODEL_SECURITY_URL = os.getenv("MODEL_SECURITY_URL", "http://model-security:8300")


async def _rule_model_security_scanner_reachable(db: AsyncSession) -> ComplianceStatus:
    """Check the model-security (ModelScan) sidecar is up — added alongside
    Architecture Plan Phase 3. Same shallow "is the mechanism
    present" style as _rule_prometheus_reachable / _rule_opa_policy_loaded
    above, not a deep scan-history check (this evaluator only has a DB
    session scoped to spm-db; scan findings live in agent-orchestrator's
    threat_findings table, a separate database — see
    Architecture Guide §1 on the two DB domains)."""
    try:
        resp = requests.get(f"{MODEL_SECURITY_URL}/health", timeout=3.0)
        return ComplianceStatus.satisfied if resp.status_code == 200 else ComplianceStatus.partial
    except Exception:
        return ComplianceStatus.not_satisfied



# -- Rules added for ISO 27001 + Indian frameworks (RBI, IRDAI, SEBI, CERT-In, HIPAA) --
# Same shallow "mechanism present and producing evidence" style as above.

async def _rule_rbac_matrix_defined(db: AsyncSession) -> ComplianceStatus:
    from spm.db.models import RbacRolePermission
    n = (await db.execute(select(func.count()).select_from(RbacRolePermission))).scalar() or 0
    return ComplianceStatus.satisfied if n > 0 else ComplianceStatus.partial

async def _rule_audit_export_recent(db: AsyncSession) -> ComplianceStatus:
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=7)
    n = (await db.execute(select(func.count()).select_from(AuditExport).where(AuditExport.timestamp >= cutoff))).scalar() or 0
    return ComplianceStatus.satisfied if n > 0 else ComplianceStatus.partial

async def _rule_incident_case_workflow(db: AsyncSession) -> ComplianceStatus:
    import os as _os
    url = _os.getenv("ORCHESTRATOR_URL", "http://agent-orchestrator:8094")
    try:
        r = requests.get(f"{url}/health", timeout=3.0)
        return ComplianceStatus.satisfied if r.status_code == 200 else ComplianceStatus.partial
    except Exception:
        return ComplianceStatus.not_satisfied

async def _rule_pii_redaction_enabled(db: AsyncSession) -> ComplianceStatus:
    try:
        r = requests.get(f"{OPA_URL}/v1/policies/pii_policy", timeout=3.0)
        if r.status_code == 200:
            return ComplianceStatus.satisfied
        r2 = requests.get(f"{OPA_URL}/v1/policies/output_policy", timeout=3.0)
        return ComplianceStatus.satisfied if r2.status_code == 200 else ComplianceStatus.partial
    except Exception:
        return ComplianceStatus.not_satisfied

async def _rule_nhi_register_current(db: AsyncSession) -> ComplianceStatus:
    from spm.db.models import MachineIdentity
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=7)
    total = (await db.execute(select(func.count()).select_from(MachineIdentity))).scalar() or 0
    if total == 0:
        return ComplianceStatus.not_satisfied
    owned = (await db.execute(select(func.count()).select_from(MachineIdentity).where(MachineIdentity.owner.isnot(None)))).scalar() or 0
    recent = (await db.execute(select(func.count()).select_from(MachineIdentity).where(MachineIdentity.synced_at >= cutoff))).scalar() or 0
    return ComplianceStatus.satisfied if recent > 0 and owned >= total * 0.8 else ComplianceStatus.partial

async def _rule_integration_credentials_rotated(db: AsyncSession) -> ComplianceStatus:
    from spm.db.models import IntegrationCredential
    configured = (await db.execute(select(func.count()).select_from(IntegrationCredential).where(IntegrationCredential.is_configured.is_(True)))).scalar() or 0
    if configured == 0:
        return ComplianceStatus.partial
    rotated = (await db.execute(select(func.count()).select_from(IntegrationCredential).where(IntegrationCredential.rotated_at.isnot(None)))).scalar() or 0
    return ComplianceStatus.satisfied if rotated > 0 else ComplianceStatus.partial

async def _rule_shadow_ai_policy_enforced(db: AsyncSession) -> ComplianceStatus:
    from spm.db.models import ShadowAiApp, ShadowAiEvent
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=30)
    seen = (await db.execute(select(func.count()).select_from(ShadowAiEvent).where(ShadowAiEvent.ts >= cutoff))).scalar() or 0
    if seen == 0:
        return ComplianceStatus.partial
    reviewed = (await db.execute(select(func.count()).select_from(ShadowAiApp).where(ShadowAiApp.reviewed.is_(True)))).scalar() or 0
    return ComplianceStatus.satisfied if reviewed > 0 else ComplianceStatus.partial

async def _rule_codeguard_scan_recent(db: AsyncSession) -> ComplianceStatus:
    from spm.db.models import CodeScan
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=30)
    n = (await db.execute(select(func.count()).select_from(CodeScan).where(CodeScan.started_at >= cutoff))).scalar() or 0
    return ComplianceStatus.satisfied if n > 0 else ComplianceStatus.not_satisfied

async def _rule_codeguard_no_critical(db: AsyncSession) -> ComplianceStatus:
    from spm.db.models import CodeScan
    latest = (await db.execute(select(CodeScan).order_by(CodeScan.started_at.desc()).limit(1))).scalar_one_or_none()
    if latest is None:
        return ComplianceStatus.not_satisfied
    return ComplianceStatus.satisfied if (latest.critical or 0) == 0 else ComplianceStatus.partial

async def _rule_bom_licenses_allowed(db: AsyncSession) -> ComplianceStatus:
    from spm.db.models import BomComponent
    total = (await db.execute(select(func.count()).select_from(BomComponent))).scalar() or 0
    if total == 0:
        return ComplianceStatus.partial
    try:
        from spm.bom.license_policy import DENIED_LICENSES
    except Exception:
        return ComplianceStatus.partial
    rows = (await db.execute(select(BomComponent.license))).scalars().all()
    denied = sum(1 for lic in rows if lic and lic.strip().lower() in DENIED_LICENSES)
    unknown = sum(1 for lic in rows if not lic)
    if denied > 0:
        return ComplianceStatus.not_satisfied
    return ComplianceStatus.satisfied if unknown == 0 else ComplianceStatus.partial

async def _rule_redteam_run_recent(db: AsyncSession) -> ComplianceStatus:
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=30)
    n = (await db.execute(select(func.count()).select_from(AuditExport)
                          .where(AuditExport.event_type.in_(["simulation_completed", "redteam_run", "garak_run"]))
                          .where(AuditExport.timestamp >= cutoff))).scalar() or 0
    return ComplianceStatus.satisfied if n > 0 else ComplianceStatus.partial

async def _rule_breach_runbook_ready(db: AsyncSession) -> ComplianceStatus:
    import os as _os
    return ComplianceStatus.satisfied if _os.getenv("BREACH_RUNBOOK_READY", "").lower() in ("1", "true", "yes") else ComplianceStatus.partial

async def _rule_log_retention_180d(db: AsyncSession) -> ComplianceStatus:
    import os as _os
    days = int(_os.getenv("AUDIT_RETENTION_DAYS", "2555"))
    return ComplianceStatus.satisfied if days >= 180 else ComplianceStatus.partial

async def _rule_ntp_sync_configured(db: AsyncSession) -> ComplianceStatus:
    import os as _os
    return ComplianceStatus.satisfied if _os.getenv("NTP_SYNC_CONFIGURED", "true").lower() in ("1", "true", "yes") else ComplianceStatus.partial


RuleFunc = Callable[[AsyncSession], Coroutine[Any, Any, ComplianceStatus]]
RULE_MAP: Dict[str, RuleFunc] = {
    "opa_policy_loaded":         _rule_opa_policy_loaded,
    "model_approved_exists":     _rule_model_approved_exists,
    "risk_fusion_active":        _rule_risk_fusion_active,
    "models_have_risk_tier":     _rule_models_have_risk_tier,
    "snapshots_recent":          _rule_snapshots_recent,
    "prometheus_reachable":      _rule_prometheus_reachable,
    "enforcement_action_exists": _rule_enforcement_action_exists,
    "model_security_scanner_reachable": _rule_model_security_scanner_reachable,
    "rbac_matrix_defined":              _rule_rbac_matrix_defined,
    "audit_export_recent":              _rule_audit_export_recent,
    "incident_case_workflow":           _rule_incident_case_workflow,
    "pii_redaction_enabled":            _rule_pii_redaction_enabled,
    "nhi_register_current":             _rule_nhi_register_current,
    "integration_credentials_rotated":  _rule_integration_credentials_rotated,
    "shadow_ai_policy_enforced":        _rule_shadow_ai_policy_enforced,
    "codeguard_scan_recent":            _rule_codeguard_scan_recent,
    "codeguard_no_critical":            _rule_codeguard_no_critical,
    "bom_licenses_allowed":             _rule_bom_licenses_allowed,
    "redteam_run_recent":               _rule_redteam_run_recent,
    "breach_runbook_ready":             _rule_breach_runbook_ready,
    "log_retention_180d":               _rule_log_retention_180d,
    "ntp_sync_configured":              _rule_ntp_sync_configured,
}

# Every *_mapping.json file in this directory is a framework — adding a new
# one (e.g. iso42001_mapping.json) is enough to bring a whole new framework
# into evaluate_all_controls / compliance_report, no code change required.
# This is what Architecture Plan §F means by "framework-agnostic
# schema — adding a second framework needs only a new mapping JSON".
_MAPPING_FILE_SUFFIX = "_mapping.json"


def _load_all_mappings() -> list[dict]:
    here = os.path.dirname(__file__)
    all_controls: list[dict] = []
    for fname in sorted(os.listdir(here)):
        if fname.endswith(_MAPPING_FILE_SUFFIX):
            with open(os.path.join(here, fname)) as f:
                all_controls.extend(json.load(f))
    return all_controls


async def _ensure_controls_seeded(db: AsyncSession, controls_def: list[dict]) -> None:
    """Insert any ComplianceEvidence row a mapping file defines but the DB
    doesn't have yet (matched on category, which is unique per framework in
    practice — e.g. "GOVERN-1.1" vs "OWASP-LLM01"). Existing rows are left
    untouched here; evaluate_all_controls updates their status separately.
    Safe to call every time — this is an upsert-by-absence, not a reset.
    """
    # select(ComplianceEvidence.category) already yields plain strings via
    # .scalars() — not ORM rows — so no .category attribute access here.
    existing = set(
        (await db.execute(select(ComplianceEvidence.category))).scalars().all()
    )
    missing = [c for c in controls_def if c["category"] not in existing]
    for c in missing:
        db.add(ComplianceEvidence(
            framework=c["framework"],
            function=c["function"],
            category=c["category"],
            subcategory=c.get("subcategory"),
            cpm_control=c["cpm_control"],
            status=ComplianceStatus.not_satisfied,
        ))
    if missing:
        await db.commit()
        log.info("Seeded %d new compliance_evidence rows from mapping files", len(missing))


async def evaluate_all_controls(db: AsyncSession) -> None:
    """Re-evaluate all compliance controls (across every framework mapping
    file present) and update their status in DB. Auto-seeds any control a
    mapping file defines that the DB doesn't have a row for yet, so this
    function is also how a freshly-added framework's rows get created —
    no separate seed script to remember to run.
    """
    controls_def_list = _load_all_mappings()
    await _ensure_controls_seeded(db, controls_def_list)
    controls_def = {c["category"]: c for c in controls_def_list}

    result = await db.execute(select(ComplianceEvidence))
    controls = result.scalars().all()

    for control in controls:
        rule_name = controls_def.get(control.category, {}).get("evaluation_rule")
        if rule_name and rule_name in RULE_MAP:
            new_status = await RULE_MAP[rule_name](db)
            control.status = new_status
            control.last_evaluated_at = datetime.now(tz=timezone.utc)

    await db.commit()
    log.info("Compliance evaluation complete — %d controls evaluated", len(controls))


def render_pdf(report: Dict) -> bytes:
    """Render compliance report to PDF via WeasyPrint."""
    from weasyprint import HTML

    template_path = os.path.join(os.path.dirname(__file__), "report_template.html")
    with open(template_path) as f:
        template = f.read()

    functions_html = ""
    for fn in report["functions"]:
        gaps_html = "".join(
            f"<li>{g['category']}: {g['control']} ({g['status']})</li>"
            for g in fn["gaps"]
        ) or "<li>None</li>"
        functions_html += f"""
        <div class="function">
            <h2>{fn['function']} — {fn['coverage_pct']}% coverage</h2>
            <p><strong>Gaps:</strong></p><ul>{gaps_html}</ul>
        </div>"""

    html = template.replace("{{generated_at}}", report["generated_at"])
    html = html.replace("{{overall_coverage_pct}}", str(report["overall_coverage_pct"]))
    html = html.replace("{{functions}}", functions_html)

    return HTML(string=html).write_pdf()
