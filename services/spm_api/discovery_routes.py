"""
Shadow AI discovery — end-user AI security.

Ingests AI SaaS usage from secure web gateway, DNS, CASB, or manual exports,
classifies domains against a catalog, and enforces an acceptable-use policy:
every app is either sanctioned or not, and unreviewed apps are findings.

    GET   /discovery/shadow-ai/apps                 catalog with 30-day usage
    PATCH /discovery/shadow-ai/apps/{id}            sanction / review / owner / notes
    POST  /discovery/shadow-ai/ingest               JSON events [{ts,user_id,department,domain,action,bytes_out,source}]
    POST  /discovery/shadow-ai/ingest/csv           CSV upload: ts,user_id,department,domain,action,bytes_out
    GET   /discovery/shadow-ai/summary              totals, by department, top users, findings
    POST  /discovery/shadow-ai/sample               30 days of synthetic events (labelled source=sample)

Registered in services/spm_api/app.py via include_router. Reads need
model.read; ingest and policy changes need model.write. Tables:
ShadowAiApp, ShadowAiEvent in spm/db/models.py.
"""
from __future__ import annotations

import csv
import io
import logging
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import case, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from platform_shared.rbac import IdentityContext, require_model_read, require_model_write
from spm.db.models import ShadowAiApp, ShadowAiEvent
from spm.db.session import get_db

log = logging.getLogger("spm-api.discovery")
router = APIRouter(prefix="/discovery/shadow-ai", tags=["discovery"])

# domain, name, vendor, category, default risk, sanctioned-by-default
CATALOG: List[tuple] = [
    ("chat.openai.com", "ChatGPT", "OpenAI", "assistant", "High", False),
    ("chatgpt.com", "ChatGPT", "OpenAI", "assistant", "High", False),
    ("api.openai.com", "OpenAI API", "OpenAI", "api", "High", False),
    ("claude.ai", "Claude", "Anthropic", "assistant", "High", False),
    ("api.anthropic.com", "Anthropic API", "Anthropic", "api", "High", False),
    ("gemini.google.com", "Gemini", "Google", "assistant", "High", False),
    ("aistudio.google.com", "Google AI Studio", "Google", "api", "High", False),
    ("copilot.microsoft.com", "Microsoft Copilot", "Microsoft", "assistant", "Medium", False),
    ("github.com/copilot", "GitHub Copilot", "GitHub", "code-assistant", "Medium", False),
    ("api.githubcopilot.com", "GitHub Copilot", "GitHub", "code-assistant", "Medium", False),
    ("cursor.sh", "Cursor", "Anysphere", "code-assistant", "Medium", False),
    ("codeium.com", "Codeium", "Codeium", "code-assistant", "Medium", False),
    ("perplexity.ai", "Perplexity", "Perplexity", "search", "Medium", False),
    ("poe.com", "Poe", "Quora", "assistant", "High", False),
    ("character.ai", "Character.AI", "Character", "consumer", "High", False),
    ("huggingface.co", "Hugging Face", "Hugging Face", "model-hub", "Medium", False),
    ("replicate.com", "Replicate", "Replicate", "api", "Medium", False),
    ("openrouter.ai", "OpenRouter", "OpenRouter", "api", "High", False),
    ("api.groq.com", "Groq", "Groq", "api", "Medium", False),
    ("api.mistral.ai", "Mistral", "Mistral", "api", "Medium", False),
    ("chat.deepseek.com", "DeepSeek", "DeepSeek", "assistant", "High", False),
    ("api.deepseek.com", "DeepSeek API", "DeepSeek", "api", "High", False),
    ("you.com", "You.com", "You", "search", "Medium", False),
    ("midjourney.com", "Midjourney", "Midjourney", "image", "Medium", False),
    ("stability.ai", "Stability AI", "Stability", "image", "Medium", False),
    ("elevenlabs.io", "ElevenLabs", "ElevenLabs", "audio", "Medium", False),
    ("otter.ai", "Otter", "Otter", "meeting", "High", False),
    ("fireflies.ai", "Fireflies", "Fireflies", "meeting", "High", False),
    ("notion.so/ai", "Notion AI", "Notion", "writing", "Medium", False),
    ("grammarly.com", "Grammarly", "Grammarly", "writing", "Medium", False),
    ("jasper.ai", "Jasper", "Jasper", "writing", "Medium", False),
    ("writesonic.com", "Writesonic", "Writesonic", "writing", "Medium", False),
    ("quillbot.com", "QuillBot", "QuillBot", "writing", "Medium", False),
    ("chatpdf.com", "ChatPDF", "ChatPDF", "document", "High", False),
    ("humata.ai", "Humata", "Humata", "document", "High", False),
    ("zapier.com/ai", "Zapier AI", "Zapier", "agent-platform", "Medium", False),
    ("make.com", "Make", "Celonis", "agent-platform", "Medium", False),
    ("langsmith.com", "LangSmith", "LangChain", "developer", "Medium", False),
]

DEPARTMENTS = ["Engineering", "Finance", "Sales", "Marketing", "Legal", "HR", "Operations", "Support"]


class AppPatch(BaseModel):
    sanctioned: Optional[bool] = None
    reviewed: Optional[bool] = None
    risk: Optional[str] = Field(None, pattern="^(Critical|High|Medium|Low)$")
    owner: Optional[str] = Field(None, max_length=120)
    notes: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, max_length=40)


class EventIn(BaseModel):
    ts: datetime
    user_id: str = Field(..., max_length=200)
    department: Optional[str] = Field(None, max_length=120)
    domain: str = Field(..., max_length=253)
    action: str = Field("allowed", pattern="^(allowed|blocked|upload)$")
    bytes_out: int = Field(0, ge=0)
    source: str = Field("manual", max_length=20)


def _tenant(identity: IdentityContext) -> str:
    return identity.tenant_id or "t1"


def _norm_domain(d: str) -> str:
    d = d.strip().lower()
    for pre in ("https://", "http://", "www."):
        if d.startswith(pre):
            d = d[len(pre):]
    return d.rstrip("/")


def _catalog_match(domain: str) -> Optional[tuple]:
    for row in CATALOG:
        base = row[0].split("/")[0]
        if domain == row[0] or domain.endswith("." + base) or domain.startswith(row[0]):
            return row
    return None


async def _ensure_catalog(db: AsyncSession, tenant: str) -> None:
    existing = set((await db.execute(select(ShadowAiApp.domain).where(ShadowAiApp.tenant_id == tenant))).scalars().all())
    added = 0
    for domain, name, vendor, category, risk, sanctioned in CATALOG:
        if domain not in existing:
            db.add(ShadowAiApp(tenant_id=tenant, domain=domain, name=name, vendor=vendor, category=category,
                               risk=risk, sanctioned=sanctioned, reviewed=False))
            added += 1
    if added:
        await db.commit()


async def _ensure_app(db: AsyncSession, tenant: str, domain: str, cache: Dict[str, ShadowAiApp]) -> ShadowAiApp:
    if domain in cache:
        return cache[domain]
    app = (await db.execute(select(ShadowAiApp).where(ShadowAiApp.tenant_id == tenant, ShadowAiApp.domain == domain))).scalar_one_or_none()
    if app is None:
        m = _catalog_match(domain)
        app = ShadowAiApp(tenant_id=tenant, domain=domain, name=m[1] if m else domain, vendor=m[2] if m else None,
                          category=m[3] if m else "unknown", risk=m[4] if m else "High", sanctioned=False, reviewed=False)
        db.add(app)
        await db.flush()
    cache[domain] = app
    return app


async def _ingest(db: AsyncSession, tenant: str, events: List[EventIn]) -> int:
    cache: Dict[str, ShadowAiApp] = {}
    n = 0
    for e in events:
        domain = _norm_domain(e.domain)
        if not domain:
            continue
        app = await _ensure_app(db, tenant, domain, cache)
        ts = e.ts if e.ts.tzinfo else e.ts.replace(tzinfo=timezone.utc)
        app.first_seen = min(app.first_seen, ts) if app.first_seen else ts
        app.last_seen = max(app.last_seen, ts) if app.last_seen else ts
        db.add(ShadowAiEvent(tenant_id=tenant, ts=ts, user_id=e.user_id, department=e.department or "Unassigned",
                             domain=domain, action=e.action, bytes_out=e.bytes_out, source=e.source[:20]))
        n += 1
    await db.commit()
    return n


def _app_out(a: ShadowAiApp, usage: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(a.id), "domain": a.domain, "name": a.name, "vendor": a.vendor, "category": a.category,
        "sanctioned": a.sanctioned, "reviewed": a.reviewed, "risk": a.risk, "owner": a.owner, "notes": a.notes,
        "first_seen": a.first_seen.isoformat() if a.first_seen else None,
        "last_seen": a.last_seen.isoformat() if a.last_seen else None,
        "events_30d": usage.get("events", 0), "users_30d": usage.get("users", 0),
        "departments_30d": usage.get("departments", 0), "bytes_out_30d": usage.get("bytes", 0),
        "uploads_30d": usage.get("uploads", 0), "blocked_30d": usage.get("blocked", 0),
    }


async def _usage_by_domain(db: AsyncSession, tenant: str, days: int = 30) -> Dict[str, Dict[str, Any]]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    E = ShadowAiEvent
    rows = (await db.execute(
        select(E.domain, func.count(), func.count(func.distinct(E.user_id)), func.count(func.distinct(E.department)),
               func.coalesce(func.sum(E.bytes_out), 0),
               func.coalesce(func.sum(case((E.action == "upload", 1), else_=0)), 0),
               func.coalesce(func.sum(case((E.action == "blocked", 1), else_=0)), 0))
        .where(E.tenant_id == tenant, E.ts >= since).group_by(E.domain)
    )).all()
    return {r[0]: {"events": r[1], "users": r[2], "departments": r[3], "bytes": int(r[4] or 0),
                   "uploads": int(r[5] or 0), "blocked": int(r[6] or 0)} for r in rows}


@router.get("/apps")
async def list_apps(db: AsyncSession = Depends(get_db), identity: IdentityContext = Depends(require_model_read)) -> List[Dict[str, Any]]:
    tenant = _tenant(identity)
    await _ensure_catalog(db, tenant)
    usage = await _usage_by_domain(db, tenant)
    apps = (await db.execute(select(ShadowAiApp).where(ShadowAiApp.tenant_id == tenant))).scalars().all()
    out = [_app_out(a, usage.get(a.domain, {})) for a in apps]
    out.sort(key=lambda x: (-x["events_30d"], x["name"]))
    return out


@router.patch("/apps/{app_id}")
async def patch_app(app_id: str, body: AppPatch, db: AsyncSession = Depends(get_db),
                    identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    try:
        aid = uuid.UUID(app_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="app not found")
    app = await db.get(ShadowAiApp, aid)
    if app is None or app.tenant_id != _tenant(identity):
        raise HTTPException(status_code=404, detail="app not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(app, k, v)
    if body.sanctioned is not None:
        app.reviewed = True
    await db.commit()
    usage = await _usage_by_domain(db, app.tenant_id)
    return _app_out(app, usage.get(app.domain, {}))


@router.post("/ingest")
async def ingest_json(events: List[EventIn], db: AsyncSession = Depends(get_db),
                      identity: IdentityContext = Depends(require_model_write)) -> Dict[str, int]:
    if len(events) > 50000:
        raise HTTPException(status_code=413, detail="Send at most 50,000 events per request")
    tenant = _tenant(identity)
    await _ensure_catalog(db, tenant)
    return {"ingested": await _ingest(db, tenant, events)}


@router.post("/ingest/csv")
async def ingest_csv(file: UploadFile = File(...), source: str = Query("swg", max_length=20),
                     db: AsyncSession = Depends(get_db), identity: IdentityContext = Depends(require_model_write)) -> Dict[str, int]:
    raw = await file.read(20 * 1024 * 1024 + 1)
    if len(raw) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="CSV exceeds 20 MB")
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8", errors="ignore")))
    events: List[EventIn] = []
    for row in reader:
        try:
            action = (row.get("action") or "allowed").lower()
            events.append(EventIn(
                ts=datetime.fromisoformat((row.get("ts") or row.get("timestamp") or "").replace("Z", "+00:00")),
                user_id=row.get("user_id") or row.get("user") or "unknown",
                department=row.get("department") or None,
                domain=row.get("domain") or row.get("host") or row.get("url") or "",
                action=action if action in ("allowed", "blocked", "upload") else "allowed",
                bytes_out=int(row.get("bytes_out") or row.get("bytes") or 0), source=source,
            ))
        except Exception:  # noqa: BLE001
            continue
        if len(events) >= 50000:
            break
    tenant = _tenant(identity)
    await _ensure_catalog(db, tenant)
    return {"ingested": await _ingest(db, tenant, events)}


@router.get("/summary")
async def summary(days: int = Query(30, ge=1, le=365), db: AsyncSession = Depends(get_db),
                  identity: IdentityContext = Depends(require_model_read)) -> Dict[str, Any]:
    tenant = _tenant(identity)
    await _ensure_catalog(db, tenant)
    since = datetime.now(timezone.utc) - timedelta(days=days)
    E = ShadowAiEvent
    apps = {a.domain: a for a in (await db.execute(select(ShadowAiApp).where(ShadowAiApp.tenant_id == tenant))).scalars().all()}
    usage = await _usage_by_domain(db, tenant, days)
    by_dept = (await db.execute(
        select(E.department, func.count(), func.count(func.distinct(E.user_id)), func.count(func.distinct(E.domain)),
               func.coalesce(func.sum(E.bytes_out), 0))
        .where(E.tenant_id == tenant, E.ts >= since).group_by(E.department)
    )).all()
    by_user = (await db.execute(
        select(E.user_id, E.department, func.count(), func.count(func.distinct(E.domain)), func.coalesce(func.sum(E.bytes_out), 0))
        .where(E.tenant_id == tenant, E.ts >= since).group_by(E.user_id, E.department).order_by(func.count().desc()).limit(15)
    )).all()
    total_events = sum(u["events"] for u in usage.values())
    seen = [apps[d] for d in usage if d in apps]
    unsanctioned = [a for a in seen if not a.sanctioned]
    unreviewed = [a for a in seen if not a.reviewed]
    sanctioned_events = sum(usage[a.domain]["events"] for a in seen if a.sanctioned)
    findings = []
    for a in sorted(unsanctioned, key=lambda x: -usage[x.domain]["events"]):
        u = usage[a.domain]
        sev = "Critical" if u["uploads"] > 0 and a.risk in ("High", "Critical") else "High" if a.risk in ("High", "Critical") else "Medium"
        findings.append({"app_id": str(a.id), "app": a.name, "domain": a.domain, "severity": sev, "reviewed": a.reviewed,
                         "events": u["events"], "users": u["users"], "uploads": u["uploads"], "bytes_out": u["bytes"],
                         "rule": "Unsanctioned AI application in use" if a.reviewed else "AI application not yet reviewed against the acceptable-use policy"})
    total_users = (await db.execute(select(func.count(func.distinct(E.user_id))).where(E.tenant_id == tenant, E.ts >= since))).scalar() or 0
    return {
        "days": days, "total_events": total_events, "apps_seen": len(seen), "apps_sanctioned": sum(1 for a in seen if a.sanctioned),
        "apps_unsanctioned": len(unsanctioned), "apps_unreviewed": len(unreviewed), "users": total_users,
        "sanctioned_share": round(sanctioned_events / total_events, 3) if total_events else None,
        "uploads": sum(u["uploads"] for u in usage.values()), "blocked": sum(u["blocked"] for u in usage.values()),
        "by_department": [{"department": r[0] or "Unassigned", "events": r[1], "users": r[2], "apps": r[3], "bytes_out": int(r[4] or 0)} for r in by_dept],
        "top_users": [{"user_id": r[0], "department": r[1] or "Unassigned", "events": r[2], "apps": r[3], "bytes_out": int(r[4] or 0)} for r in by_user],
        "findings": findings,
    }


@router.post("/sample")
async def load_sample(db: AsyncSession = Depends(get_db), identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    """Replace any previous sample events with 30 days of synthetic usage. Real ingested events are left untouched."""
    tenant = _tenant(identity)
    await _ensure_catalog(db, tenant)
    await db.execute(delete(ShadowAiEvent).where(ShadowAiEvent.tenant_id == tenant, ShadowAiEvent.source == "sample"))
    await db.commit()
    rng = random.Random(42)
    users = [f"user{n:03d}@example.local" for n in range(1, 61)]
    dept_of = {u: DEPARTMENTS[i % len(DEPARTMENTS)] for i, u in enumerate(users)}
    popular = ["chatgpt.com", "claude.ai", "gemini.google.com", "copilot.microsoft.com", "api.githubcopilot.com",
               "perplexity.ai", "chatpdf.com", "otter.ai", "grammarly.com", "chat.deepseek.com", "huggingface.co", "cursor.sh"]
    weights = [30, 14, 12, 16, 10, 6, 4, 3, 8, 3, 3, 5]
    now = datetime.now(timezone.utc)
    events: List[EventIn] = []
    for day in range(30):
        for _ in range(rng.randint(40, 90)):
            u = rng.choice(users)
            d = rng.choices(popular, weights=weights)[0]
            action = "upload" if (d in ("chatpdf.com", "chatgpt.com", "chat.deepseek.com") and rng.random() < 0.12) else ("blocked" if rng.random() < 0.05 else "allowed")
            events.append(EventIn(ts=now - timedelta(days=day, minutes=rng.randint(0, 1439)), user_id=u, department=dept_of[u],
                                  domain=d, action=action, bytes_out=rng.randint(2_000, 900_000) if action != "blocked" else 0, source="sample"))
    n = await _ingest(db, tenant, events)
    for domain in ("copilot.microsoft.com", "api.githubcopilot.com", "github.com/copilot"):
        app = (await db.execute(select(ShadowAiApp).where(ShadowAiApp.tenant_id == tenant, ShadowAiApp.domain == domain))).scalar_one_or_none()
        if app:
            app.sanctioned, app.reviewed, app.owner = True, True, "IT Platform"
    await db.commit()
    return {"ingested": n, "days": 30}
