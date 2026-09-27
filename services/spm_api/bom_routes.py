"""
SPM API — AI-BOM (AI Bill of Materials) module routes.

Extends the existing inventory (model_registry, agents) with a typed
component/relationship graph instead of introducing a second registry.
`POST /bom/sync` upserts one bom_component row per existing model_registry
and agents row (matched idempotently via source_table+source_ref) so the
graph starts populated from real data, not empty.

Endpoints:
    POST /bom/sync                        — upsert components from model_registry + agents
    GET  /bom/components                  — list components (filter by type/tenant)
    POST /bom/relationships               — link two components (an edge)
    GET  /bom/{component_id}/graph        — component + its direct (1-hop) edges
    GET  /bom/{component_id}/blast-radius — BFS: everything reachable from this component

No relationship is ever fabricated — sync only creates nodes from data that
actually exists (model_registry, agents rows). Edges are created explicitly
via POST /bom/relationships, by whichever caller has the real reference
(e.g. a future agent-creation hook that knows which model an agent calls).
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from platform_shared.rbac import IdentityContext, require_model_read, require_model_write
from spm.db.models import (
    Agent,
    BomComponent,
    BomComponentType,
    BomRelationship,
    BomRelationshipType,
    ModelRegistry,
)
from spm.db.session import get_db

log = logging.getLogger(__name__)

router = APIRouter(prefix="/bom", tags=["ai-bom"])

_MAX_BLAST_RADIUS_DEPTH = 6  # bounds the BFS so a cyclic graph can't loop forever


# ── Response models ──────────────────────────────────────────────────────

class ComponentOut(BaseModel):
    id: UUID
    component_type: str
    name: str
    version: Optional[str] = None
    provider: Optional[str] = None
    owner: Optional[str] = None
    license: Optional[str] = None
    risk_tier: Optional[str] = None
    source_table: Optional[str] = None
    source_ref: Optional[str] = None
    component_meta: Dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def from_row(cls, r: BomComponent) -> "ComponentOut":
        return cls(
            id=r.id,
            component_type=r.component_type.value if r.component_type else "other",
            name=r.name,
            version=r.version,
            provider=r.provider,
            owner=r.owner,
            license=r.license,
            risk_tier=r.risk_tier.value if r.risk_tier else None,
            source_table=r.source_table,
            source_ref=r.source_ref,
            component_meta=r.component_meta or {},
        )


class RelationshipOut(BaseModel):
    id: UUID
    from_component_id: UUID
    to_component_id: UUID
    relationship_type: str

    @classmethod
    def from_row(cls, r: BomRelationship) -> "RelationshipOut":
        return cls(
            id=r.id,
            from_component_id=r.from_component_id,
            to_component_id=r.to_component_id,
            relationship_type=r.relationship_type.value,
        )


class GraphOut(BaseModel):
    component: ComponentOut
    outgoing: List[RelationshipOut]
    incoming: List[RelationshipOut]
    neighbours: List[ComponentOut]


class BlastRadiusOut(BaseModel):
    root: ComponentOut
    reachable: List[ComponentOut]
    depth_by_id: Dict[str, int]


class CreateRelationshipRequest(BaseModel):
    from_component_id: UUID
    to_component_id: UUID
    relationship_type: str
    relationship_meta: Dict[str, Any] = Field(default_factory=dict)


class SyncResult(BaseModel):
    components_upserted: int
    from_models: int
    from_agents: int


# ── POST /bom/sync ────────────────────────────────────────────────────────

@router.post("/sync", response_model=SyncResult)
async def sync_components(
    tenant_id: str = Query("t1"),
    db: AsyncSession = Depends(get_db),
    identity: IdentityContext = Depends(require_model_write),
):
    """Upsert one bom_component per existing model_registry + agents row.

    Idempotent: re-running only updates name/version/owner/risk_tier drift,
    it never creates duplicate rows (unique on tenant_id+source_table+source_ref).
    """
    from_models = 0
    from_agents = 0

    models = (await db.execute(
        select(ModelRegistry).where(ModelRegistry.tenant_id.in_([tenant_id, "global"]))
    )).scalars().all()
    for m in models:
        stmt = pg_insert(BomComponent).values(
            id=uuid4(),
            tenant_id=tenant_id,
            component_type=BomComponentType.model,
            name=m.name,
            version=m.version,
            provider=m.provider.value if m.provider else None,
            owner=m.owner,
            risk_tier=m.risk_tier,
            source_table="model_registry",
            source_ref=str(m.model_id),
            component_meta={"model_type": m.model_type.value if m.model_type else None},
        ).on_conflict_do_update(
            index_elements=["tenant_id", "source_table", "source_ref"],
            set_={
                "name": m.name, "version": m.version,
                "provider": m.provider.value if m.provider else None,
                "owner": m.owner, "risk_tier": m.risk_tier,
            },
        )
        await db.execute(stmt)
        from_models += 1

    agents = (await db.execute(
        select(Agent).where(Agent.tenant_id == tenant_id)
    )).scalars().all()
    for a in agents:
        stmt = pg_insert(BomComponent).values(
            id=uuid4(),
            tenant_id=tenant_id,
            component_type=BomComponentType.agent,
            name=a.name,
            version=a.version,
            provider=a.provider.value if a.provider else None,
            owner=a.owner,
            risk_tier=a.risk,
            source_table="agents",
            source_ref=str(a.id),
            component_meta={"agent_type": a.agent_type.value if a.agent_type else None},
        ).on_conflict_do_update(
            index_elements=["tenant_id", "source_table", "source_ref"],
            set_={
                "name": a.name, "version": a.version,
                "provider": a.provider.value if a.provider else None,
                "owner": a.owner, "risk_tier": a.risk,
            },
        )
        await db.execute(stmt)
        from_agents += 1

    await db.commit()
    log.info(
        "bom_sync tenant=%s models=%d agents=%d actor=%s",
        tenant_id, from_models, from_agents, identity.user_id,
    )
    return SyncResult(
        components_upserted=from_models + from_agents,
        from_models=from_models,
        from_agents=from_agents,
    )


# ── GET /bom/components ───────────────────────────────────────────────────

@router.get("/components", response_model=List[ComponentOut])
async def list_components(
    tenant_id: str = Query("t1"),
    component_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _identity: IdentityContext = Depends(require_model_read),
):
    q = select(BomComponent).where(BomComponent.tenant_id == tenant_id)
    if component_type:
        try:
            q = q.where(BomComponent.component_type == BomComponentType(component_type))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown component_type: {component_type}")
    rows = (await db.execute(q.order_by(BomComponent.name))).scalars().all()
    return [ComponentOut.from_row(r) for r in rows]


# -- GET /bom/license-report -----------------------------------------------

@router.get("/license-report")
async def license_report(
    tenant_id: str = Query("t1"),
    db: AsyncSession = Depends(get_db),
    _identity: IdentityContext = Depends(require_model_read),
):
    """Classify every BOM component's license against the license policy and
    return a gate result. Feeds the compliance rule bom_licenses_allowed."""
    from spm.bom.license_policy import evaluate
    rows = (await db.execute(
        select(BomComponent).where(BomComponent.tenant_id == tenant_id).order_by(BomComponent.name)
    )).scalars().all()
    components = [{
        "id": str(r.id), "name": r.name, "version": r.version,
        "license": r.license,
        "component_type": r.component_type.value if hasattr(r.component_type, "value") else r.component_type,
    } for r in rows]
    return evaluate(components)


# ── POST /bom/relationships ───────────────────────────────────────────────

@router.post("/relationships", response_model=RelationshipOut)
async def create_relationship(
    body: CreateRelationshipRequest,
    tenant_id: str = Query("t1"),
    db: AsyncSession = Depends(get_db),
    identity: IdentityContext = Depends(require_model_write),
):
    try:
        rel_type = BomRelationshipType(body.relationship_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown relationship_type: {body.relationship_type}")

    for cid in (body.from_component_id, body.to_component_id):
        exists = (await db.execute(
            select(BomComponent.id).where(BomComponent.id == cid)
        )).scalar_one_or_none()
        if exists is None:
            raise HTTPException(status_code=404, detail=f"Component {cid} not found")

    row = BomRelationship(
        id=uuid4(),
        tenant_id=tenant_id,
        from_component_id=body.from_component_id,
        to_component_id=body.to_component_id,
        relationship_type=rel_type,
        relationship_meta=body.relationship_meta,
    )
    db.add(row)
    await db.commit()
    log.info(
        "bom_relationship created %s -[%s]-> %s actor=%s",
        body.from_component_id, rel_type.value, body.to_component_id, identity.user_id,
    )
    return RelationshipOut.from_row(row)


# ── GET /bom/{component_id}/graph ─────────────────────────────────────────

async def _get_component_or_404(component_id: UUID, db: AsyncSession) -> BomComponent:
    row = (await db.execute(
        select(BomComponent).where(BomComponent.id == component_id)
    )).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Component {component_id} not found")
    return row


@router.get("/{component_id}/graph", response_model=GraphOut)
async def get_graph(
    component_id: UUID,
    db: AsyncSession = Depends(get_db),
    _identity: IdentityContext = Depends(require_model_read),
):
    """The component plus its direct (1-hop) neighbours in both directions."""
    root = await _get_component_or_404(component_id, db)

    outgoing = (await db.execute(
        select(BomRelationship).where(BomRelationship.from_component_id == component_id)
    )).scalars().all()
    incoming = (await db.execute(
        select(BomRelationship).where(BomRelationship.to_component_id == component_id)
    )).scalars().all()

    neighbour_ids = {r.to_component_id for r in outgoing} | {r.from_component_id for r in incoming}
    neighbours: List[BomComponent] = []
    if neighbour_ids:
        neighbours = (await db.execute(
            select(BomComponent).where(BomComponent.id.in_(neighbour_ids))
        )).scalars().all()

    return GraphOut(
        component=ComponentOut.from_row(root),
        outgoing=[RelationshipOut.from_row(r) for r in outgoing],
        incoming=[RelationshipOut.from_row(r) for r in incoming],
        neighbours=[ComponentOut.from_row(n) for n in neighbours],
    )


# ── GET /bom/{component_id}/blast-radius ──────────────────────────────────

@router.get("/{component_id}/blast-radius", response_model=BlastRadiusOut)
async def get_blast_radius(
    component_id: UUID,
    db: AsyncSession = Depends(get_db),
    _identity: IdentityContext = Depends(require_model_read),
):
    """BFS outward along outgoing edges only — "if this is compromised, what
    can it reach?" (a model this agent depends on is reachable; an unrelated
    agent that also happens to depend on the same model is not, since that
    edge points the other way).
    """
    root = await _get_component_or_404(component_id, db)

    depth_by_id: Dict[UUID, int] = {component_id: 0}
    frontier = [component_id]
    depth = 0
    while frontier and depth < _MAX_BLAST_RADIUS_DEPTH:
        depth += 1
        edges = (await db.execute(
            select(BomRelationship).where(BomRelationship.from_component_id.in_(frontier))
        )).scalars().all()
        next_frontier = []
        for e in edges:
            if e.to_component_id not in depth_by_id:
                depth_by_id[e.to_component_id] = depth
                next_frontier.append(e.to_component_id)
        frontier = next_frontier

    reachable_ids = [cid for cid in depth_by_id if cid != component_id]
    reachable: List[BomComponent] = []
    if reachable_ids:
        reachable = (await db.execute(
            select(BomComponent).where(BomComponent.id.in_(reachable_ids))
        )).scalars().all()

    return BlastRadiusOut(
        root=ComponentOut.from_row(root),
        reachable=[ComponentOut.from_row(r) for r in reachable],
        depth_by_id={str(k): v for k, v in depth_by_id.items() if k != component_id},
    )


# ─── License policy ──────────────────────────────────────────────────────────

import os as _os  # noqa: E402

_LICENSE_ALLOWLIST = {
    s.strip().lower() for s in _os.getenv(
        "BOM_LICENSE_ALLOWLIST",
        "apache-2.0,mit,bsd-2-clause,bsd-3-clause,isc,mpl-2.0,cc-by-4.0,openrail,openrail-m,llama3,llama-3,gemma,proprietary-internal",
    ).split(",") if s.strip()
}


@router.get("/license-findings")
async def license_findings(
    db: AsyncSession = Depends(get_db),
    identity: IdentityContext = Depends(require_model_read),
) -> Dict[str, Any]:
    """Components whose license is missing or outside BOM_LICENSE_ALLOWLIST.
    Feeds the compliance rule `bom_licenses_allowed` (ISO 27001 A.8.30,
    RBI vendor risk, IRDAI third-party risk, SEBI SBOM)."""
    tenant = identity.tenant_id or "t1"
    rows = (await db.execute(select(BomComponent).where(BomComponent.tenant_id == tenant))).scalars().all()
    findings = []
    for c in rows:
        lic = (c.license or "").strip()
        if not lic:
            findings.append({"component_id": str(c.id), "name": c.name, "version": c.version, "type": str(getattr(c.component_type, "value", c.component_type)),
                             "provider": c.provider, "license": None, "severity": "Medium", "rule": "License not declared"})
        elif lic.lower() not in _LICENSE_ALLOWLIST:
            findings.append({"component_id": str(c.id), "name": c.name, "version": c.version, "type": str(getattr(c.component_type, "value", c.component_type)),
                             "provider": c.provider, "license": lic, "severity": "High", "rule": "License outside the allow-list"})
    return {"components": len(rows), "allowlist": sorted(_LICENSE_ALLOWLIST), "findings": findings}
