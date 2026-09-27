"""Identity & Trust registry — real, DB-backed CRUD.

Backs the Identity & Trust page (formerly front-end mock). Humans, service
accounts, AI agents and machine identities are stored in `trust_identities` and
served/edited here. Tenant is derived from the caller's token only.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from platform_shared.rbac import (
    IdentityContext, require_integration_read, require_integration_write,
)
from spm.db.models import TrustIdentity
from spm.db.session import get_db

router = APIRouter(prefix="/identity-trust", tags=["identity-trust"])

_VALID_KINDS = {"Human User", "Service Account", "AI Agent", "Machine Identity"}
_VALID_STATUS = {"Active", "Suspicious", "Quarantined", "Suspended"}


def _tenant(identity: IdentityContext) -> str:
    return identity.tenant_id or os.getenv("DEFAULT_TENANT", "global")


def _humanize(ts: Optional[datetime]) -> str:
    if not ts:
        return "—"
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    secs = (datetime.now(timezone.utc) - ts).total_seconds()
    if secs < 60:
        return "just now"
    if secs < 3600:
        return f"{int(secs // 60)}m ago"
    if secs < 86400:
        return f"{int(secs // 3600)}h ago"
    return f"{int(secs // 86400)}d ago"


def _out(row: TrustIdentity) -> dict:
    return {
        "id": str(row.id),
        "name": row.name,
        "type": row.kind,
        "environment": row.environment,
        "owner": row.owner,
        "trustScore": row.trust_score,
        "status": row.status,
        "flags": list(row.flags or []),
        "lastActivity": _humanize(row.last_seen_at),
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        # Fields the detail panel reads; empty until populated by discovery.
        "delegatedPermissions": [],
        "delegatedFrom": None,
        "recommendedActions": [],
    }


class IdentityCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: str = "Human User"
    environment: str = "Production"
    owner: Optional[str] = None
    trustScore: int = Field(default=75, ge=0, le=100)


class IdentityPatch(BaseModel):
    status: Optional[str] = None
    trustScore: Optional[int] = Field(default=None, ge=0, le=100)
    owner: Optional[str] = None
    environment: Optional[str] = None
    flags: Optional[List[str]] = None


@router.get("")
async def list_identities(
    db: AsyncSession = Depends(get_db),
    identity: IdentityContext = Depends(require_integration_read),
) -> dict:
    result = await db.execute(
        select(TrustIdentity)
        .where(TrustIdentity.tenant_id == _tenant(identity))
        .order_by(TrustIdentity.trust_score.asc())
    )
    rows = result.scalars().all()
    return {"identities": [_out(r) for r in rows], "count": len(rows)}


@router.post("", status_code=201)
async def create_identity(
    body: IdentityCreate,
    db: AsyncSession = Depends(get_db),
    identity: IdentityContext = Depends(require_integration_write),
) -> dict:
    kind = body.type if body.type in _VALID_KINDS else "Human User"
    row = TrustIdentity(
        id=uuid.uuid4(), name=body.name.strip(), kind=kind,
        environment=body.environment or "Production", owner=(body.owner or "").strip() or None,
        trust_score=body.trustScore, status="Active", flags=[],
        tenant_id=_tenant(identity),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _out(row)


@router.patch("/{identity_id}")
async def patch_identity(
    identity_id: str,
    body: IdentityPatch,
    db: AsyncSession = Depends(get_db),
    identity: IdentityContext = Depends(require_integration_write),
) -> dict:
    row = await db.get(TrustIdentity, uuid.UUID(identity_id))
    if not row or row.tenant_id != _tenant(identity):
        raise HTTPException(status_code=404, detail="Identity not found")
    if body.status is not None:
        if body.status not in _VALID_STATUS:
            raise HTTPException(status_code=400, detail="Invalid status")
        row.status = body.status
    if body.trustScore is not None:
        row.trust_score = body.trustScore
    if body.owner is not None:
        row.owner = body.owner.strip() or None
    if body.environment is not None:
        row.environment = body.environment
    if body.flags is not None:
        row.flags = body.flags
    await db.commit()
    await db.refresh(row)
    return _out(row)


@router.delete("/{identity_id}")
async def delete_identity(
    identity_id: str,
    db: AsyncSession = Depends(get_db),
    identity: IdentityContext = Depends(require_integration_write),
) -> dict:
    row = await db.get(TrustIdentity, uuid.UUID(identity_id))
    if not row or row.tenant_id != _tenant(identity):
        raise HTTPException(status_code=404, detail="Identity not found")
    await db.delete(row)
    await db.commit()
    return {"deleted": True, "id": identity_id}
