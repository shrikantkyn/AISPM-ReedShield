"""
AI SPM — SQLAlchemy ORM models matching 001_initial.sql
"""
from __future__ import annotations
import enum
import uuid
from typing import Dict

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, Index, String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class ModelProvider(str, enum.Enum):
    # Legacy / conceptual values (kept for back-compat with existing rows + callers)
    local = "local"
    openai = "openai"
    anthropic = "anthropic"
    other = "other"
    # Cloud-provider values surfaced by the admin UI (Inventory → Models)
    aws = "aws"
    azure = "azure"
    gcp = "gcp"
    internal = "internal"


class ModelRiskTier(str, enum.Enum):
    # Legacy EU-AI-Act-style values (kept for back-compat)
    minimal = "minimal"
    limited = "limited"
    high = "high"
    unacceptable = "unacceptable"
    # UI-taxonomy values surfaced in the admin Inventory table
    low = "low"
    medium = "medium"
    critical = "critical"


class ModelStatus(str, enum.Enum):
    registered = "registered"
    under_review = "under_review"
    approved = "approved"
    deprecated = "deprecated"
    retired = "retired"


class ModelType(str, enum.Enum):
    """Coarse functional classification of the model, surfaced as the 'Type' column in the UI."""
    llm = "llm"
    open_source_llm = "open_source_llm"
    embedding_model = "embedding_model"
    audio_model = "audio_model"
    vision_model = "vision_model"
    multimodal = "multimodal"
    other = "other"


class PolicyCoverage(str, enum.Enum):
    """Policy coverage level surfaced as the 'Policy' column in the Inventory table."""
    full = "full"         # → "Covered"
    partial = "partial"   # → "Partial"
    none = "none"         # → "None"


class ComplianceStatus(str, enum.Enum):
    satisfied = "satisfied"
    partial = "partial"
    not_satisfied = "not_satisfied"


# Valid lifecycle transitions
MODEL_TRANSITIONS: Dict[ModelStatus, set] = {
    ModelStatus.registered:   {ModelStatus.under_review},
    ModelStatus.under_review: {ModelStatus.approved, ModelStatus.registered},
    ModelStatus.approved:     {ModelStatus.deprecated},
    ModelStatus.deprecated:   {ModelStatus.retired},
    ModelStatus.retired:      set(),  # terminal
}


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    model_id      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(Text, nullable=False)
    version       = Column(Text, nullable=False)
    provider      = Column(Enum(ModelProvider, name="model_provider"), nullable=False, default=ModelProvider.local)
    purpose       = Column(Text)
    risk_tier     = Column(Enum(ModelRiskTier, name="model_risk_tier"), nullable=False, default=ModelRiskTier.limited)
    model_type    = Column(Enum(ModelType, name="model_type"), nullable=True)
    # Inventory-table fields (surfaced as Owner / Policy / Alerts columns)
    owner         = Column(Text, nullable=True)
    policy_status = Column(Enum(PolicyCoverage, name="policy_coverage"), nullable=True)
    alerts_count  = Column(Integer, nullable=False, default=0, server_default="0")
    last_seen_at  = Column(DateTime(timezone=True), nullable=True)
    tenant_id     = Column(Text, nullable=False, default="global")
    status        = Column(Enum(ModelStatus, name="model_status"), nullable=False, default=ModelStatus.registered)
    approved_by   = Column(Text)
    approved_at   = Column(DateTime(timezone=True))
    notes         = Column(Text, nullable=True)
    ai_sbom       = Column(JSONB, default=dict)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("name", "version", "tenant_id", name="uq_model_name_version_tenant"),
    )

    def can_transition_to(self, new_status: ModelStatus) -> bool:
        return new_status in MODEL_TRANSITIONS.get(self.status, set())


class PostureSnapshot(Base):
    __tablename__ = "posture_snapshots"

    id               = Column(BigInteger, primary_key=True, autoincrement=True)
    model_id         = Column(UUID(as_uuid=True), nullable=True)
    tenant_id        = Column(Text, nullable=False)
    snapshot_at      = Column(DateTime(timezone=True), nullable=False)
    request_count    = Column(Integer, default=0)
    block_count      = Column(Integer, default=0)
    escalation_count = Column(Integer, default=0)
    avg_risk_score   = Column(Float, default=0.0)
    max_risk_score   = Column(Float, default=0.0)
    intent_drift_avg = Column(Float, default=0.0)
    ttp_hit_count    = Column(Integer, default=0)

    __table_args__ = (
        # Required by spm_aggregator.upsert_snapshot's
        #   INSERT ... ON CONFLICT (model_id, tenant_id, snapshot_at) DO UPDATE
        # which needs a unique constraint on exactly those columns.
        # Matches 001_initial.sql:`uq_snapshot UNIQUE NULLS DISTINCT (...)`.
        # NULLS DISTINCT is Postgres 15+ default — model_id IS NULL rows
        # don't conflict with each other, so unknown-model snapshots are
        # insert-only.  If aggregation across unknown-model rows is ever
        # needed, switch to postgresql_nulls_not_distinct=True here AND in
        # the bootstrap SQL.  Bug discovered May 2026 when a fresh cluster
        # was bootstrapped via `Base.metadata.create_all` (which previously
        # didn't include this constraint) instead of the raw SQL — the
        # aggregator started erroring `42P10` on every snapshot insert.
        UniqueConstraint(
            "model_id", "tenant_id", "snapshot_at",
            name="uq_snapshot",
        ),
        Index("idx_snapshots_model_tenant_time", "model_id", "tenant_id", "snapshot_at"),
    )


class ComplianceEvidence(Base):
    __tablename__ = "compliance_evidence"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    framework         = Column(Text, nullable=False, default="NIST_AI_RMF")
    function          = Column(Text, nullable=False)
    category          = Column(Text, nullable=False)
    subcategory       = Column(Text)
    cpm_control       = Column(Text, nullable=False)
    status            = Column(Enum(ComplianceStatus, name="compliance_status"), nullable=False, default=ComplianceStatus.not_satisfied)
    evidence_ref      = Column(JSONB, default=dict)
    last_evaluated_at = Column(DateTime(timezone=True))


class BomComponentType(str, enum.Enum):
    """What kind of thing a bom_component row represents."""
    model      = "model"
    agent      = "agent"
    dataset    = "dataset"
    tool       = "tool"
    mcp_server = "mcp_server"
    vector_db  = "vector_db"
    api        = "api"
    other      = "other"


class BomRelationshipType(str, enum.Enum):
    """How one component relates to another — the edges of the AI-BOM graph."""
    depends_on   = "depends_on"    # agent -> model, agent -> dataset
    invokes      = "invokes"       # agent -> tool, agent -> mcp_server
    reads_from   = "reads_from"    # agent -> vector_db, agent -> dataset
    writes_to    = "writes_to"     # agent -> vector_db
    derived_from = "derived_from"  # model -> model (fine-tune lineage)
    calls        = "calls"         # agent -> api


class BomComponent(Base):
    """
    AI Bill of Materials — one row per model/agent/dataset/tool/MCP server/
    vector DB/external API in the AI estate.

    Deliberately NOT a new asset registry: `source_ref` points back at the
    row in `model_registry` or `agents` that this component describes
    (populated via POST /bom/sync), so this table is a typed, queryable
    graph layer *over* the existing inventory, not a competing one. A
    component with no source_ref (e.g. a dataset or vector DB — nothing
    else in the schema tracks those yet) is the first-class record itself.
    """
    __tablename__ = "bom_component"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id      = Column(Text, nullable=False, default="t1")
    component_type = Column(Enum(BomComponentType, name="bom_component_type"), nullable=False)
    name           = Column(Text, nullable=False)
    version        = Column(Text, nullable=True)
    provider       = Column(Text, nullable=True)
    owner          = Column(Text, nullable=True)
    license        = Column(Text, nullable=True)
    risk_tier      = Column(Enum(ModelRiskTier, name="model_risk_tier"), nullable=True)
    # Points at model_registry.model_id or agents.id when this component
    # mirrors an existing inventory row; NULL for BOM-only nodes (datasets,
    # vector DBs, external APIs) that have no other home in the schema.
    source_table   = Column(Text, nullable=True)   # "model_registry" | "agents" | NULL
    source_ref     = Column(Text, nullable=True)
    component_meta = Column(JSONB, default=dict)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("tenant_id", "source_table", "source_ref",
                          name="uq_bom_component_source"),
        Index("ix_bom_component_tenant_type", "tenant_id", "component_type"),
    )


class BomRelationship(Base):
    """One directed edge in the AI-BOM graph (component A --[type]--> component B)."""
    __tablename__ = "bom_relationship"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(Text, nullable=False, default="t1")
    from_component_id   = Column(UUID(as_uuid=True),
                                 ForeignKey("bom_component.id", ondelete="CASCADE"),
                                 nullable=False)
    to_component_id     = Column(UUID(as_uuid=True),
                                 ForeignKey("bom_component.id", ondelete="CASCADE"),
                                 nullable=False)
    relationship_type   = Column(Enum(BomRelationshipType, name="bom_relationship_type"), nullable=False)
    relationship_meta   = Column(JSONB, default=dict)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("from_component_id", "to_component_id", "relationship_type",
                          name="uq_bom_relationship_edge"),
        Index("ix_bom_relationship_from", "from_component_id"),
        Index("ix_bom_relationship_to", "to_component_id"),
    )


class AuditExport(Base):
    __tablename__ = "audit_export"

    event_id   = Column(Text, primary_key=True)
    tenant_id  = Column(Text, nullable=False)
    event_type = Column(Text, nullable=False)
    actor      = Column(Text)
    timestamp  = Column(DateTime(timezone=True), nullable=False)
    payload    = Column(JSONB, nullable=False)
    session_id = Column(String(64), nullable=True)

    __table_args__ = (
        Index("idx_audit_export_session_id", "session_id"),
    )


# ─── Integrations module ────────────────────────────────────────────────────────
# Single source of truth for the Admin → Integrations page.  Mirrors the
# shape used by the UI (MOCK_INTEGRATIONS) so the seed script can migrate
# existing mock entries row-for-row.


class IntegrationStatus(str, enum.Enum):
    Healthy = "Healthy"
    Warning = "Warning"
    Error = "Error"
    NotConfigured = "Not Configured"
    Disabled = "Disabled"
    Partial = "Partial"


class IntegrationAuthMethod(str, enum.Enum):
    api_key = "API Key"
    oauth = "OAuth"
    iam_role = "IAM Role"
    service_account = "Service Account"


class IntegrationActivityResult(str, enum.Enum):
    Success = "Success"
    Warning = "Warning"
    Error = "Error"
    Info = "Info"


class Integration(Base):
    __tablename__ = "integrations"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id   = Column(Text, unique=True, nullable=True)
    # connector_type is the stable registry key ("postgres", "redis", …)
    # that drives schema-based form rendering and probe dispatch.  Nullable
    # for back-compat with rows written before migration 004; name-based
    # dispatch is the fallback when this is null.
    connector_type = Column(Text, nullable=True)
    name          = Column(Text, nullable=False)
    abbrev        = Column(Text, nullable=True)
    category      = Column(Text, nullable=False)
    status        = Column(Enum(IntegrationStatus, name="integration_status",
                                values_callable=lambda e: [m.value for m in e]),
                           nullable=False, default=IntegrationStatus.NotConfigured)
    auth_method   = Column(Enum(IntegrationAuthMethod, name="integration_auth_method",
                                values_callable=lambda e: [m.value for m in e]),
                           nullable=False, default=IntegrationAuthMethod.api_key)
    owner         = Column(Text, nullable=True)
    owner_display = Column(Text, nullable=True)
    environment   = Column(Text, nullable=False, default="Production")
    enabled       = Column(Boolean, nullable=False, default=True, server_default="true")
    description   = Column(Text, nullable=True)
    vendor        = Column(Text, nullable=True)
    tags          = Column(JSONB, nullable=False, default=list, server_default="[]")
    config        = Column(JSONB, nullable=False, default=dict, server_default="{}")
    tenant_id     = Column(Text, nullable=False, default="global", server_default="'global'")
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    credentials = relationship("IntegrationCredential", back_populates="integration",
                               cascade="all, delete-orphan", lazy="selectin")
    connection  = relationship("IntegrationConnection", back_populates="integration",
                               uselist=False, cascade="all, delete-orphan", lazy="selectin")
    auth        = relationship("IntegrationAuth", back_populates="integration",
                               uselist=False, cascade="all, delete-orphan", lazy="selectin")
    coverage    = relationship("IntegrationCoverage", back_populates="integration",
                               cascade="all, delete-orphan", lazy="selectin",
                               order_by="IntegrationCoverage.position")
    activity    = relationship("IntegrationActivity", back_populates="integration",
                               cascade="all, delete-orphan", lazy="selectin",
                               order_by="IntegrationActivity.event_at.desc()")
    workflows   = relationship("IntegrationWorkflow", back_populates="integration",
                               uselist=False, cascade="all, delete-orphan", lazy="selectin")
    logs        = relationship("IntegrationLog", back_populates="integration",
                               cascade="all, delete-orphan", lazy="selectin",
                               order_by="IntegrationLog.event_at.desc()")


class IntegrationCredential(Base):
    __tablename__ = "integration_credentials"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id  = Column(UUID(as_uuid=True),
                             ForeignKey("integrations.id", ondelete="CASCADE"),
                             nullable=False)
    credential_type = Column(Text, nullable=False)
    name            = Column(Text, nullable=False)
    value_enc       = Column(Text, nullable=True)
    value_hint      = Column(Text, nullable=True)
    is_configured   = Column(Boolean, nullable=False, default=False, server_default="false")
    rotated_at      = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    integration = relationship("Integration", back_populates="credentials")


class IntegrationConnection(Base):
    __tablename__ = "integration_connections"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id    = Column(UUID(as_uuid=True),
                               ForeignKey("integrations.id", ondelete="CASCADE"),
                               nullable=False, unique=True)
    last_sync         = Column(Text, nullable=True)
    last_sync_full    = Column(Text, nullable=True)
    last_failed_sync  = Column(Text, nullable=True)
    avg_latency       = Column(Text, nullable=True)
    uptime            = Column(Text, nullable=True)
    health_history    = Column(JSONB, nullable=False, default=list, server_default="[]")
    updated_at        = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    integration = relationship("Integration", back_populates="connection")


class IntegrationAuth(Base):
    __tablename__ = "integration_auth"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id  = Column(UUID(as_uuid=True),
                             ForeignKey("integrations.id", ondelete="CASCADE"),
                             nullable=False, unique=True)
    token_expiry    = Column(Text, nullable=True)
    scopes          = Column(JSONB, nullable=False, default=list, server_default="[]")
    missing_scopes  = Column(JSONB, nullable=False, default=list, server_default="[]")
    setup_progress  = Column(JSONB, nullable=True)
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    integration = relationship("Integration", back_populates="auth")


class IntegrationCoverage(Base):
    __tablename__ = "integration_coverage"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id  = Column(UUID(as_uuid=True),
                             ForeignKey("integrations.id", ondelete="CASCADE"),
                             nullable=False)
    position        = Column(Integer, nullable=False, default=0, server_default="0")
    label           = Column(Text, nullable=False)
    enabled         = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    integration = relationship("Integration", back_populates="coverage")


class IntegrationActivity(Base):
    __tablename__ = "integration_activity"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id  = Column(UUID(as_uuid=True),
                             ForeignKey("integrations.id", ondelete="CASCADE"),
                             nullable=False)
    ts_display      = Column(Text, nullable=False)
    event_at        = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    event           = Column(Text, nullable=False)
    result          = Column(Enum(IntegrationActivityResult, name="integration_activity_result",
                                  values_callable=lambda e: [m.value for m in e]),
                             nullable=False, default=IntegrationActivityResult.Info)
    actor           = Column(Text, nullable=True)

    integration = relationship("Integration", back_populates="activity")


class IntegrationWorkflow(Base):
    __tablename__ = "integration_workflows"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id  = Column(UUID(as_uuid=True),
                             ForeignKey("integrations.id", ondelete="CASCADE"),
                             nullable=False, unique=True)
    playbooks       = Column(JSONB, nullable=False, default=list, server_default="[]")
    alerts          = Column(JSONB, nullable=False, default=list, server_default="[]")
    policies        = Column(JSONB, nullable=False, default=list, server_default="[]")
    cases           = Column(JSONB, nullable=False, default=list, server_default="[]")
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    integration = relationship("Integration", back_populates="workflows")


class IntegrationLog(Base):
    __tablename__ = "integration_logs"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id  = Column(UUID(as_uuid=True),
                             ForeignKey("integrations.id", ondelete="CASCADE"),
                             nullable=False)
    event_at        = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    action          = Column(Text, nullable=False)
    actor           = Column(Text, nullable=True)
    result          = Column(Enum(IntegrationActivityResult, name="integration_activity_result",
                                  values_callable=lambda e: [m.value for m in e],
                                  create_type=False),
                             nullable=False, default=IntegrationActivityResult.Info)
    message         = Column(Text, nullable=True)
    detail          = Column(JSONB, nullable=False, default=dict, server_default="{}")

    integration = relationship("Integration", back_populates="logs")


# ─── Agent Runtime Control Plane models ───────────────────────────────────────────────────────
# Support for customer-uploaded AI agents running in sandboxed containers.


class AgentType(str, enum.Enum):
    """Classification of agent framework/architecture."""
    langchain = "langchain"
    llamaindex = "llamaindex"
    autogpt = "autogpt"
    openai_assistant = "openai_assistant"
    custom = "custom"


class RuntimeState(str, enum.Enum):
    """Agent container lifecycle state."""
    stopped = "stopped"
    starting = "starting"
    running = "running"
    crashed = "crashed"


class AgentKind(str, enum.Enum):
    """Distinguishes customer-uploaded agents from platform-internal
    system services that happen to need an ``agents`` row (so they get
    a real ``llm_api_key`` accepted by spm-llm-proxy and show up in the
    inventory). Customer agents render the chat surface in the admin
    UI; system agents render an inventory row only — no chat, no
    "Open Chat" button — because they are not interactive.
    """
    customer = "customer"
    system   = "system"


class ChatRole(str, enum.Enum):
    """Role of messages in a chat session."""
    user = "user"
    agent = "agent"


class Agent(Base):
    """
    A customer-uploaded AI agent deployed on the platform.

    Agents run in sandboxed containers with access to MCP tools (web_fetch),
    an OpenAI-compatible LLM proxy, and Kafka-based chat I/O. Chat sessions
    are tracked in agent_chat_sessions; messages in agent_chat_messages.
    """
    __tablename__ = "agents"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name         = Column(Text, nullable=False)
    version      = Column(Text, nullable=False)
    agent_type   = Column(Enum(AgentType, name="agent_type"), nullable=False)
    provider     = Column(Enum(ModelProvider, name="model_provider"), nullable=False, default=ModelProvider.internal)
    owner        = Column(Text)
    description  = Column(Text, default="")
    risk         = Column(Enum(ModelRiskTier, name="model_risk_tier"), default=ModelRiskTier.low)
    policy_status= Column(Enum(PolicyCoverage, name="policy_coverage"), default=PolicyCoverage.none)
    runtime_state= Column(Enum(RuntimeState, name="runtime_state"), nullable=False, default=RuntimeState.stopped)
    # Customer-uploaded vs. platform-internal system agent. System
    # agents (threat-hunting-agent, etc.) keep an inventory row +
    # llm_api_key so they pass spm-llm-proxy auth, but the admin UI
    # does NOT render a chat window for them.
    kind         = Column(Enum(AgentKind, name="agent_kind"), nullable=False, default=AgentKind.customer)
    code_path    = Column(Text, nullable=False)
    code_sha256  = Column(Text, nullable=False)
    # Phase 4 — full text of the customer's agent.py at registration
    # time. Source-of-truth for the runtime: spawn_agent_container
    # rewrites code_path from this on every spawn so the platform
    # self-heals if the host volume gets cleaned up. Legacy rows
    # (Phase 1-3 registrations) have NULL here and fall back to
    # reading code_path; once those are re-uploaded the blob takes
    # over.
    code_blob    = Column(Text, nullable=True)
    # Per-agent bearer tokens. Stored as Fernet ciphertext at rest (audit
    # finding H2): the raw value must be recoverable to inject into the agent
    # container at spawn time, so we encrypt (reversible) rather than hash.
    # The *_hash columns hold a SHA-256 of the raw token for O(1) equality
    # lookups (Fernet ciphertext is non-deterministic and cannot be queried).
    mcp_token    = Column(Text, nullable=False)        # Fernet ciphertext
    llm_api_key  = Column(Text, nullable=False)        # Fernet ciphertext
    mcp_token_hash   = Column(Text, index=True)        # sha256(raw mcp_token)
    llm_api_key_hash = Column(Text, index=True)        # sha256(raw llm_api_key)
    last_seen_at = Column(DateTime(timezone=True))
    tenant_id    = Column(Text, nullable=False, default="t1", index=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("name", "version", "tenant_id", name="uq_agents_name_ver_tenant"),
        Index("ix_agents_tenant_state", "tenant_id", "runtime_state"),
    )

    sessions = relationship("AgentChatSession", back_populates="agent",
                           cascade="all, delete-orphan")
    policies = relationship("AgentPolicy", back_populates="agent",
                           cascade="all, delete-orphan")


class TrustIdentity(Base):
    """Identity & Trust registry — humans, service accounts, AI agents and machine
    identities carrying a trust score. Real and persisted; replaces the former
    front-end mock on the Identity & Trust page."""
    __tablename__ = "trust_identities"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name         = Column(Text, nullable=False)
    kind         = Column(Text, nullable=False, default="Human User")   # Human User | Service Account | AI Agent | Machine Identity
    environment  = Column(Text, default="Production")
    owner        = Column(Text)
    trust_score  = Column(Integer, nullable=False, default=75)
    status       = Column(Text, nullable=False, default="Active")        # Active | Suspicious | Quarantined | Suspended
    flags        = Column(JSONB, nullable=False, default=list, server_default="[]")
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    tenant_id    = Column(Text, nullable=False, default="global", index=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Playbook(Base):
    """Automation playbook — real, persisted. Rich structure (conditions,
    actions, workflow nodes, audit) is stored as JSONB; workflow nodes carry a
    `nodeType` string and the UI maps it to an icon (icons aren't stored)."""
    __tablename__ = "playbooks"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(Text, nullable=False)
    description   = Column(Text, default="")
    status        = Column(Text, nullable=False, default="Active")   # Active | Disabled
    trigger       = Column(Text, default="Alert Threshold")
    scope         = Column(Text, default="Production")
    owner         = Column(Text)
    owner_display = Column(Text)
    enabled       = Column(Boolean, nullable=False, default=True)
    tags          = Column(JSONB, nullable=False, default=list, server_default="[]")
    conditions    = Column(JSONB, nullable=False, default=list, server_default="[]")
    actions       = Column(JSONB, nullable=False, default=list, server_default="[]")
    integrations  = Column(JSONB, nullable=False, default=list, server_default="[]")
    workflow      = Column(JSONB, nullable=False, default=list, server_default="[]")
    audit_history = Column(JSONB, nullable=False, default=list, server_default="[]")
    runs_today    = Column(Integer, nullable=False, default=0)
    success_rate  = Column(Integer, nullable=False, default=100)
    last_run      = Column(Text, default="never")
    last_run_result = Column(Text, default="—")
    tenant_id     = Column(Text, nullable=False, default="global", index=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PlaybookRun(Base):
    """A single execution of a playbook (real test runs and live triggers)."""
    __tablename__ = "playbook_runs"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    playbook_id   = Column(UUID(as_uuid=True), index=True)
    playbook_name = Column(Text)
    trigger       = Column(Text, default="Manual test")
    result        = Column(Text, default="Success")   # Success | Failed | Running
    duration_ms   = Column(Integer, default=0)
    tenant_id     = Column(Text, nullable=False, default="global", index=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class AgentChatSession(Base):
    """
    A conversation session between a user and an agent.

    One session per user per agent per conversation. Messages are stored
    in agent_chat_messages, linked by session_id.
    """
    __tablename__ = "agent_chat_sessions"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id        = Column(UUID(as_uuid=True),
                             ForeignKey("agents.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    user_id         = Column(Text, nullable=False, index=True)
    started_at      = Column(DateTime(timezone=True), server_default=func.now())
    last_message_at = Column(DateTime(timezone=True))
    message_count   = Column(Integer, nullable=False, default=0)

    agent    = relationship("Agent", back_populates="sessions")
    messages = relationship("AgentChatMessage", back_populates="session",
                           cascade="all, delete-orphan",
                           order_by="AgentChatMessage.ts")


class AgentChatMessage(Base):
    """
    A single message in an agent chat session.

    Messages are immutable once created. trace_id links to lineage events
    (prompt-guard, policy-decider, tool calls, LLM calls, output-guard).
    """
    __tablename__ = "agent_chat_messages"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True),
                       ForeignKey("agent_chat_sessions.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    role       = Column(Enum(ChatRole, name="chat_role"), nullable=False)
    text       = Column(Text, nullable=False)
    ts         = Column(DateTime(timezone=True), server_default=func.now())
    trace_id   = Column(Text, index=True)

    session    = relationship("AgentChatSession", back_populates="messages")


class RbacRolePermission(Base):
    """
    Persisted overrides for the RBAC permission matrix.

    One row per (role, permission) pair.  The RBAC engine reads this
    table on startup (cached in Redis with ~30s TTL) and falls back to
    the hardcoded defaults in platform_shared.rbac when the table is
    empty.  Only users with the spm:admin role may write here.
    """
    __tablename__ = "rbac_role_permissions"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role       = Column(String(64), nullable=False)
    permission = Column(String(64), nullable=False)
    granted    = Column(Boolean, nullable=False, default=True)
    updated_by = Column(String(255))
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (UniqueConstraint("role", "permission", name="uq_rbac_role_permission"),)


class AgentPolicy(Base):
    """
    Join table: which CPM policies are attached to which agent.

    ``policy_id`` is plain Text — not an FK — because the source-of-
    truth policy registry lives in the CPM orchestrator, not spm-db.
    The UI fetches policy metadata (name, coverage, status) from
    ``GET /api/v1/policies`` and matches by ID. Phase 4's chat
    pipeline reads this set when building the policy-decider input.

    Cascade on agent delete is enforced by the FK below. Deleting a
    policy in CPM does NOT cascade here — that's a manual cleanup the
    operator runs if needed. The chat pipeline tolerates dangling
    policy_ids by simply not finding them in the /api/v1/policies
    response (no crash).
    """
    __tablename__ = "agent_policies"

    agent_id    = Column(UUID(as_uuid=True),
                         ForeignKey("agents.id", ondelete="CASCADE"),
                         primary_key=True)
    policy_id   = Column(Text, primary_key=True)
    attached_at = Column(DateTime(timezone=True),
                         server_default=func.now(), nullable=False)
    attached_by = Column(Text)

    agent = relationship("Agent", back_populates="policies")


# ═════════════════════════════════════════════════════════════════════════════
# Enterprise visibility tables — shadow AI discovery, machine identities,
# and code guardrails. Added 2026-09 for the "Discovery to Continuous
# Assurance" coverage; all three feed compliance evidence rules.
# ═════════════════════════════════════════════════════════════════════════════

class ShadowAiApp(Base):
    """An AI SaaS application seen in traffic or listed in the catalog.
    `sanctioned` is the acceptable-use decision; `reviewed` says whether a
    human has made that decision yet."""
    __tablename__ = "shadow_ai_apps"
    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id  = Column(Text, nullable=False, default="t1", index=True)
    domain     = Column(Text, nullable=False)
    name       = Column(Text, nullable=False)
    vendor     = Column(Text)
    category   = Column(Text, default="assistant")
    sanctioned = Column(Boolean, nullable=False, default=False, server_default="false")
    reviewed   = Column(Boolean, nullable=False, default=False, server_default="false")
    risk       = Column(Text, default="Medium")
    owner      = Column(Text)
    notes      = Column(Text)
    first_seen = Column(DateTime(timezone=True))
    last_seen  = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint("tenant_id", "domain", name="uq_shadow_ai_app_domain"),)


class ShadowAiEvent(Base):
    """One observed use of an AI SaaS domain (from SWG, DNS, CASB, or a sample)."""
    __tablename__ = "shadow_ai_events"
    id         = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id  = Column(Text, nullable=False, default="t1")
    ts         = Column(DateTime(timezone=True), nullable=False)
    user_id    = Column(Text, nullable=False)
    department = Column(Text)
    domain     = Column(Text, nullable=False)
    action     = Column(Text, default="allowed")      # allowed | blocked | upload
    bytes_out  = Column(BigInteger, default=0)
    source     = Column(Text, default="manual")       # swg | dns | casb | manual | sample
    __table_args__ = (
        Index("ix_shadow_ai_events_tenant_ts", "tenant_id", "ts"),
        Index("ix_shadow_ai_events_domain", "domain"),
    )


class MachineIdentity(Base):
    """A non-human identity: agent tokens, integration credentials, service
    accounts, API keys. Ownership, scope, and rotation are tracked here;
    secret values never are."""
    __tablename__ = "machine_identities"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id     = Column(Text, nullable=False, default="t1", index=True)
    kind          = Column(Text, nullable=False)     # agent_mcp | agent_llm | integration_credential | service_account | api_key
    subject       = Column(Text, nullable=False)
    name          = Column(Text, nullable=False)
    owner         = Column(Text)
    scopes        = Column(JSONB, default=list)
    source        = Column(Text, nullable=False)     # agents | integrations | keycloak | manual
    source_ref    = Column(Text, nullable=False)
    status        = Column(Text, nullable=False, default="active")   # active | frozen | revoked | expired
    rotation_days = Column(Integer, default=90)
    rotated_at    = Column(DateTime(timezone=True))
    last_used_at  = Column(DateTime(timezone=True))
    expires_at    = Column(DateTime(timezone=True))
    risk_flags    = Column(JSONB, default=list)
    synced_at     = Column(DateTime(timezone=True))
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (UniqueConstraint("tenant_id", "kind", "source_ref", name="uq_machine_identity_ref"),)


class CodeScan(Base):
    __tablename__ = "code_scans"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id     = Column(Text, nullable=False, default="t1", index=True)
    repo          = Column(Text, nullable=False)
    ref           = Column(Text)
    source        = Column(Text, default="upload")   # upload | ci | sample | api
    triggered_by  = Column(Text)
    files_scanned = Column(Integer, default=0)
    critical      = Column(Integer, default=0)
    high          = Column(Integer, default=0)
    medium        = Column(Integer, default=0)
    low           = Column(Integer, default=0)
    status        = Column(Text, default="passed")   # passed | failed
    started_at    = Column(DateTime(timezone=True), server_default=func.now())
    finished_at   = Column(DateTime(timezone=True))
    findings      = relationship("CodeFinding", back_populates="scan", cascade="all, delete-orphan")


class CodeFinding(Base):
    __tablename__ = "code_findings"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id     = Column(UUID(as_uuid=True), ForeignKey("code_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id     = Column(Text, nullable=False)
    severity    = Column(Text, nullable=False)       # CRITICAL | HIGH | MEDIUM | LOW
    file_path   = Column(Text, nullable=False)
    line        = Column(Integer)
    message     = Column(Text, nullable=False)
    remediation = Column(Text)
    snippet     = Column(Text)                       # already redacted by the scanner
    status      = Column(Text, default="open")
    scan        = relationship("CodeScan", back_populates="findings")
