"""
findings_client.py
───────────────────
Async HTTP client that persists a Garak red-team finding to the
agent-orchestrator's durable ``/api/v1/threat-findings`` store.

Before this module existed, garak_runner.py normalised every finding and
emitted it as a SimulationEvent over WebSocket/Kafka only — real evidence
that a red-team run caught (or missed) an attack lived exclusively for the
life of that WebSocket connection and was gone the moment the browser tab
closed. This client closes that gap by writing the same normalised finding
into ``threat_findings`` (source="garak"), reusing the exact auth pattern
already proven by services/threat-hunting-agent/service/findings_service.py
(Keycloak resource-owner-password-flow service-account token, cached until
near expiry).

Failures here are non-fatal by design: a garak-runner sidecar hiccup or an
orchestrator outage must never break the live simulation the operator is
watching. Every method logs and returns ``{"error": ...}`` rather than
raising.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from typing import Any, Optional

import httpx

_KEYCLOAK_URL      = os.environ.get("KEYCLOAK_URL", "http://keycloak:8080")
_KC_REALM          = os.environ.get("KEYCLOAK_REALM", "aispm")
_KC_CLIENT_ID      = os.environ.get("KC_CLIENT_ID", "aispm-ui")
_SERVICE_USER      = os.environ.get("SERVICE_ACCOUNT_USER", "admin@aispm.local")
_SERVICE_PASS      = os.environ.get("SERVICE_ACCOUNT_PASSWORD", "admin-changeme")
_ORCHESTRATOR_URL  = os.environ.get("ORCHESTRATOR_URL", "http://agent-orchestrator:8094").rstrip("/")

logger = logging.getLogger("api.findings_client")


class GarakFindingsClient:
    """Stateless-ish singleton (one instance per process); caches its token."""

    def __init__(self, timeout: float = 8.0) -> None:
        self._client = httpx.AsyncClient(timeout=timeout, trust_env=False)
        self._token: str = ""
        self._token_expiry: float = 0.0

    async def _fetch_token(self) -> str:
        now = time.time()
        if self._token and self._token_expiry > now + 30:
            return self._token
        url = f"{_KEYCLOAK_URL}/realms/{_KC_REALM}/protocol/openid-connect/token"
        resp = await self._client.post(url, data={
            "grant_type": "password",
            "client_id":  _KC_CLIENT_ID,
            "username":   _SERVICE_USER,
            "password":   _SERVICE_PASS,
        })
        resp.raise_for_status()
        data = resp.json()
        self._token = data["access_token"]
        self._token_expiry = now + data.get("expires_in", 300)
        return self._token

    async def persist_finding(
        self,
        *,
        session_id: str,
        probe_name: str,
        attempt_correlation_id: str,
        normalized: dict[str, Any],
        defense_outcome: Optional[str],
        tenant_id: str = "t1",
    ) -> dict:
        """POST one Garak finding to /api/v1/threat-findings. Never raises."""
        try:
            token = await self._fetch_token()
        except Exception as exc:
            logger.warning("GarakFindingsClient: token fetch failed: %s", exc)
            return {"error": f"auth: {exc}"}

        title = f"Garak probe {probe_name}: {normalized['category']}"
        canonical = json.dumps(
            {"tenant_id": tenant_id, "session_id": session_id, "attempt": attempt_correlation_id},
            sort_keys=True, default=str,
        )
        batch_hash = hashlib.sha256(canonical.encode()).hexdigest()

        payload = {
            "title":       title,
            "severity":    normalized["severity"],
            "description": normalized["description"],
            "evidence":    [f"correlation_id={attempt_correlation_id}"],
            "ttps":        [],
            "tenant_id":   tenant_id,
            "batch_hash":  batch_hash,
            "asset":       probe_name,
            "source":      "garak",
            "hypothesis": (
                f"Adversarial probe '{probe_name}' (category: {normalized['category']}) "
                f"was run against the live pipeline; defense outcome: {defense_outcome or 'unknown'}."
            ),
            "correlated_events": [attempt_correlation_id],
            # should_open_case only for attacks the defense actually missed —
            # a caught attack is evidence the guard worked, not an incident.
            "should_open_case": defense_outcome == "missed",
        }

        try:
            resp = await self._client.post(
                f"{_ORCHESTRATOR_URL}/api/v1/threat-findings",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info(
                "GarakFindingsClient: persisted id=%s deduplicated=%s probe=%s",
                data.get("id"), data.get("deduplicated"), probe_name,
            )
            return data
        except Exception as exc:
            logger.warning(
                "GarakFindingsClient.persist_finding failed for probe=%s: %s", probe_name, exc,
            )
            return {"error": str(exc)}

    async def aclose(self) -> None:
        await self._client.aclose()


# Module-level singleton, mirroring the pattern used elsewhere in this
# service (e.g. _garak_runner_url() in garak_runner.py) — no DI container
# in this codebase, so a lazily-created module singleton is the convention.
_client: Optional[GarakFindingsClient] = None


def get_findings_client() -> GarakFindingsClient:
    global _client
    if _client is None:
        _client = GarakFindingsClient()
    return _client
