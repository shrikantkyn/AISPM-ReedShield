"""
Machine identity register — non-human identities (NHI).

Every credential the platform knows about becomes a row with an owner, scopes,
rotation policy, and risk flags. Secret values are never stored or returned
here; only the agents table and integration credentials hold them.

    GET   /identities                 register with risk flags
    GET   /identities/summary         counts and open findings
    POST  /identities/sync            import from agents, integration credentials, Keycloak service accounts
    PATCH /identities/{id}            owner, rotation_days, expires_at, scopes, status
    POST  /identities/{id}/rotate     re-mint agent tokens; others get a rotation request
    POST  /identities/{id}/freeze     stop an agent / mark frozen
    POST  /identities/{id}/unfreeze

Registered in services/spm_api/app.py via include_router. Reads need
model.read; changes need model.write. Table: MachineIdentity in
spm/db/models.py.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from platform_shared.rbac import IdentityContext, require_model_read, require_model_write
from spm.db.models import Agent, Integration, IntegrationCredential, MachineIdentity, RuntimeState
from spm.db.session import get_db

log = logging.getLogger("spm-api.identities")
router = APIRouter(prefix="/identities", tags=["identities"])

STALE_DAYS = 30
BROAD_SCOPES = 8


class IdentityPatch(BaseModel):
    owner: Optional[str] = Field(None, max_length=120)
    rotation_days: Optional[int] = Field(None, ge=1, le=3650)
    expires_at: Optional[datetime] = None
    scopes: Optional[List[str]] = Field(None, max_length=200)
    status: Optional[str] = Field(None, pattern="^(active|frozen|revoked|expired)$")


def _tenant(identity: IdentityContext) -> str:
    return identity.tenant_id or "t1"


def _flags(m: MachineIdentity, now: datetime) -> List[str]:
    flags: List[str] = []
    if not m.owner:
        flags.append("no_owner")
    if m.expires_at is None:
        flags.append("no_expiry")
    elif m.expires_at < now:
        flags.append("expired")
    anchor = m.rotated_at or m.created_at
    if anchor and m.rotation_days and (now - anchor).days > m.rotation_days:
        flags.append("rotation_overdue")
    if m.last_used_at is None or (now - m.last_used_at).days > STALE_DAYS:
        flags.append("stale")
    if isinstance(m.scopes, list) and len(m.scopes) > BROAD_SCOPES:
        flags.append("broad_scopes")
    return flags


def _out(m: MachineIdentity) -> Dict[str, Any]:
    def iso(d):
        return d.isoformat() if d else None
    return {
        "id": str(m.id), "kind": m.kind, "subject": m.subject, "name": m.name, "owner": m.owner,
        "scopes": m.scopes or [], "source": m.source, "source_ref": m.source_ref, "status": m.status,
        "rotation_days": m.rotation_days, "rotated_at": iso(m.rotated_at), "last_used_at": iso(m.last_used_at),
        "expires_at": iso(m.expires_at), "risk_flags": m.risk_flags or [], "synced_at": iso(m.synced_at),
        "created_at": iso(m.created_at),
    }


async def _upsert(db: AsyncSession, tenant: str, *, kind: str, source: str, source_ref: str, subject: str, name: str,
                  owner: Optional[str], scopes: List[str], last_used_at: Optional[datetime], created_at: Optional[datetime],
                  rotated_at: Optional[datetime], status: str, index: Dict[tuple, MachineIdentity], now: datetime) -> MachineIdentity:
    key = (kind, source_ref)
    m = index.get(key)
    if m is None:
        m = MachineIdentity(tenant_id=tenant, kind=kind, source=source, source_ref=source_ref, subject=subject, name=name,
                            owner=owner, scopes=scopes, status=status, rotation_days=90)
        db.add(m)
        index[key] = m
    else:
        m.subject, m.name, m.scopes = subject, name, scopes
        if owner and not m.owner:
            m.owner = owner
        if m.status not in ("frozen", "revoked"):
            m.status = status
    if last_used_at:
        m.last_used_at = last_used_at
    if rotated_at:
        m.rotated_at = rotated_at
    m.synced_at = now
    m.risk_flags = _flags(m, now)
    return m


async def _keycloak_service_accounts() -> List[Dict[str, Any]]:
    """Service-account clients from the realm, when admin access is configured. Fail soft."""
    base = os.getenv("KEYCLOAK_URL", "")
    user, pw = os.getenv("KEYCLOAK_ADMIN_USER", ""), os.getenv("KEYCLOAK_ADMIN_PASSWORD", "")
    realm = os.getenv("KEYCLOAK_REALM", "aispm")
    if not (base and user and pw):
        return []
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            tok = await client.post(f"{base}/realms/master/protocol/openid-connect/token",
                                    data={"grant_type": "password", "client_id": "admin-cli", "username": user, "password": pw})
            if tok.status_code != 200:
                return []
            headers = {"Authorization": f"Bearer {tok.json()['access_token']}"}
            clients = await client.get(f"{base}/admin/realms/{realm}/clients?max=200", headers=headers)
            if clients.status_code != 200:
                return []
            return [c for c in clients.json() if c.get("serviceAccountsEnabled")]
    except Exception as exc:  # noqa: BLE001
        log.info("Keycloak service-account discovery skipped: %s", exc)
        return []


@router.post("/sync")
async def sync_identities(db: AsyncSession = Depends(get_db), identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    tenant = _tenant(identity)
    now = datetime.now(timezone.utc)
    existing = (await db.execute(select(MachineIdentity).where(MachineIdentity.tenant_id == tenant))).scalars().all()
    index = {(m.kind, m.source_ref): m for m in existing}
    seen: set = set()

    agents = (await db.execute(select(Agent).where(Agent.tenant_id == tenant))).scalars().all()
    for a in agents:
        scopes: List[str] = []
        try:
            cfg = a.config or {}
            scopes += [f"tool:{t}" for t in (cfg.get("tools") or [])][:50]
        except Exception:  # noqa: BLE001
            pass
        for kind, label in (("agent_mcp", "MCP token"), ("agent_llm", "LLM credential")):
            m = await _upsert(db, tenant, kind=kind, source="agents", source_ref=f"{a.id}:{kind}", subject=f"agent:{a.name}",
                              name=f"{a.name} · {label}", owner=a.owner, scopes=scopes, last_used_at=a.last_seen_at,
                              created_at=a.created_at, rotated_at=None, status="active", index=index, now=now)
            if m.created_at is None and a.created_at:
                m.created_at = a.created_at
            seen.add((m.kind, m.source_ref))

    creds = (await db.execute(
        select(IntegrationCredential, Integration).join(Integration, Integration.id == IntegrationCredential.integration_id)
    )).all()
    for cred, integ in creds:
        if not cred.is_configured:
            continue
        m = await _upsert(db, tenant, kind="integration_credential", source="integrations", source_ref=str(cred.id),
                          subject=f"integration:{integ.name}", name=f"{integ.name} · {cred.name}", owner=None,
                          scopes=[f"connector:{integ.connector_type or integ.category}"], last_used_at=None,
                          created_at=cred.created_at, rotated_at=cred.rotated_at, status="active", index=index, now=now)
        if m.created_at is None and cred.created_at:
            m.created_at = cred.created_at
        seen.add((m.kind, m.source_ref))

    for c in await _keycloak_service_accounts():
        ref = c.get("id") or c.get("clientId")
        m = await _upsert(db, tenant, kind="service_account", source="keycloak", source_ref=ref,
                          subject=f"service-account-{c.get('clientId')}", name=f"{c.get('clientId')} · service account", owner=None,
                          scopes=["realm:default"], last_used_at=None, created_at=None, rotated_at=None,
                          status="active" if c.get("enabled", True) else "revoked", index=index, now=now)
        seen.add((m.kind, m.source_ref))

    stale_rows = [m for m in existing if (m.kind, m.source_ref) not in seen and m.source != "manual" and m.status != "revoked"]
    for m in stale_rows:
        m.status = "revoked"
        m.risk_flags = _flags(m, now)
        m.synced_at = now
    await db.commit()
    return {"synced": len(seen), "revoked_missing": len(stale_rows), "at": now.isoformat()}


@router.get("")
async def list_identities(db: AsyncSession = Depends(get_db), identity: IdentityContext = Depends(require_model_read)) -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    rows = (await db.execute(select(MachineIdentity).where(MachineIdentity.tenant_id == _tenant(identity)))).scalars().all()
    out = []
    for m in rows:
        m.risk_flags = _flags(m, now)
        out.append(_out(m))
    out.sort(key=lambda x: (-len(x["risk_flags"]), x["name"]))
    return out


@router.get("/summary")
async def identities_summary(db: AsyncSession = Depends(get_db), identity: IdentityContext = Depends(require_model_read)) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    rows = (await db.execute(select(MachineIdentity).where(MachineIdentity.tenant_id == _tenant(identity)))).scalars().all()
    flags = {"no_owner": 0, "no_expiry": 0, "expired": 0, "rotation_overdue": 0, "stale": 0, "broad_scopes": 0}
    by_kind: Dict[str, int] = {}
    active = 0
    last_sync = None
    for m in rows:
        for f in _flags(m, now):
            flags[f] = flags.get(f, 0) + 1
        by_kind[m.kind] = by_kind.get(m.kind, 0) + 1
        active += m.status == "active"
        if m.synced_at and (last_sync is None or m.synced_at > last_sync):
            last_sync = m.synced_at
    return {"total": len(rows), "active": active, "by_kind": by_kind, "flags": flags,
            "owned_share": round(sum(1 for m in rows if m.owner) / len(rows), 3) if rows else None,
            "last_sync": last_sync.isoformat() if last_sync else None}


async def _get(db: AsyncSession, identity: IdentityContext, identity_id: str) -> MachineIdentity:
    try:
        mid = uuid.UUID(identity_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="identity not found")
    m = await db.get(MachineIdentity, mid)
    if m is None or m.tenant_id != _tenant(identity):
        raise HTTPException(status_code=404, detail="identity not found")
    return m


@router.patch("/{identity_id}")
async def patch_identity(identity_id: str, body: IdentityPatch, db: AsyncSession = Depends(get_db),
                         identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    m = await _get(db, identity, identity_id)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(m, k, v)
    m.risk_flags = _flags(m, datetime.now(timezone.utc))
    await db.commit()
    return _out(m)


@router.post("/{identity_id}/rotate")
async def rotate_identity(identity_id: str, db: AsyncSession = Depends(get_db),
                          identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    m = await _get(db, identity, identity_id)
    now = datetime.now(timezone.utc)
    if m.kind in ("agent_mcp", "agent_llm"):
        try:
            from agent_controller import mint_agent_tokens  # type: ignore
        except ImportError:
            from services.spm_api.agent_controller import mint_agent_tokens
        agent = await db.get(Agent, uuid.UUID(m.source_ref.split(":")[0]))
        if agent is None:
            raise HTTPException(status_code=409, detail="agent no longer exists")
        mcp, llm = mint_agent_tokens()
        # Store encrypted + hashed at rest (audit finding H2).
        from platform_shared.secret_crypto import encrypt_secret, hash_token
        if m.kind == "agent_mcp":
            agent.mcp_token = encrypt_secret(mcp)
            agent.mcp_token_hash = hash_token(mcp)
        else:
            agent.llm_api_key = encrypt_secret(llm)
            agent.llm_api_key_hash = hash_token(llm)
        m.rotated_at = now
        m.risk_flags = _flags(m, now)
        await db.commit()
        return {"rotated": True, "note": "New token minted; restart the agent so it picks up the credential.", "identity": _out(m)}
    if m.kind == "integration_credential":
        raise HTTPException(status_code=409, detail="Rotate this credential from the Integrations page, which takes the new secret from the vendor.")
    raise HTTPException(status_code=409, detail="Rotate this identity in its identity provider, then re-sync the register.")


@router.post("/{identity_id}/freeze")
async def freeze_identity(identity_id: str, db: AsyncSession = Depends(get_db),
                          identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    m = await _get(db, identity, identity_id)
    if m.kind in ("agent_mcp", "agent_llm"):
        agent = await db.get(Agent, uuid.UUID(m.source_ref.split(":")[0]))
        if agent is not None:
            agent.runtime_state = RuntimeState.stopped
    m.status = "frozen"
    await db.commit()
    return _out(m)


@router.post("/{identity_id}/unfreeze")
async def unfreeze_identity(identity_id: str, db: AsyncSession = Depends(get_db),
                            identity: IdentityContext = Depends(require_model_write)) -> Dict[str, Any]:
    m = await _get(db, identity, identity_id)
    m.status = "active"
    m.risk_flags = _flags(m, datetime.now(timezone.utc))
    await db.commit()
    return _out(m)
