"""
findings_client.py
───────────────────
Async client that persists a model-artifact security finding to the
agent-orchestrator's ``threat_findings`` table.

Same auth pattern as services/api/findings_client.py and
services/threat-hunting-agent/service/findings_service.py (Keycloak
resource-owner-password-flow service account) — kept as a separate,
service-local copy rather than a shared platform_shared module because
that's the existing convention in this codebase (each service that posts
findings owns its own small client).
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

logger = logging.getLogger("model_security.findings_client")


class ModelSecurityFindingsClient:
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
        asset_name: str,
        severity: str,
        description: str,
        evidence: list[str],
        tenant_id: str = "t1",
    ) -> dict:
        try:
            token = await self._fetch_token()
        except Exception as exc:
            logger.warning("ModelSecurityFindingsClient: token fetch failed: %s", exc)
            return {"error": f"auth: {exc}"}

        canonical = json.dumps(
            {"tenant_id": tenant_id, "asset": asset_name, "description": description},
            sort_keys=True, default=str,
        )
        batch_hash = hashlib.sha256(canonical.encode()).hexdigest()

        payload = {
            "title":       f"Model artifact security finding: {asset_name}",
            "severity":    severity,
            "description": description,
            "evidence":    evidence,
            "ttps":        [],
            "tenant_id":   tenant_id,
            "batch_hash":  batch_hash,
            "asset":       asset_name,
            "source":      "modelscan",
            "should_open_case": severity in ("high", "critical"),
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
                "ModelSecurityFindingsClient: persisted id=%s asset=%s",
                data.get("id"), asset_name,
            )
            return data
        except Exception as exc:
            logger.warning(
                "ModelSecurityFindingsClient.persist_finding failed for %s: %s", asset_name, exc,
            )
            return {"error": str(exc)}


_client: Optional[ModelSecurityFindingsClient] = None


def get_findings_client() -> ModelSecurityFindingsClient:
    global _client
    if _client is None:
        _client = ModelSecurityFindingsClient()
    return _client
