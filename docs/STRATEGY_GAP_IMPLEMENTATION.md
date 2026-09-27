# ReedShield — Strategy gap implementation

Date: 2026-09-15. This records what was built to close the partial and missing items from the AI Security strategy deck, plus the added compliance frameworks (ISO 27001 and the Indian and healthcare regimes).

Everything runs in the existing architecture: FastAPI on spm-api, the shared compliance evidence engine, OPA and the guard pipeline, the React console. No new service, database, or auth system was added.

## 1. Compliance frameworks (ISO 27001 + Indian + healthcare)

Six new control mappings feed the existing evidence engine (`spm/compliance/*_mapping.json`), each control tied to a live `evaluation_rule`:

| Framework | Controls | File |
|---|---|---|
| ISO/IEC 27001:2022 (Annex A) | 20 | `iso27001_mapping.json` |
| HIPAA Security Rule | 14 | `hipaa_mapping.json` |
| RBI (cyber framework, IT governance 2023, digital lending, outsourcing) | 19 | `rbi_mapping.json` |
| IRDAI Information & Cyber Security Guidelines 2023 | 13 | `irdai_mapping.json` |
| SEBI CSCRF 2024 | 11 | `sebi_cscrf_mapping.json` |
| CERT-In Directions 2022 | 5 | `cert_in_mapping.json` |

These join the four already present (NIST AI RMF, ISO 42001, OWASP LLM Top 10, EU AI Act) plus the DPDPA module, for **ten frameworks and 119 controls** evaluated live. 22 evaluation rules now exist in `spm/compliance/evaluator.py`; the 15 new ones read the shadow-AI, machine-identity, code-scan, credential-rotation, audit-export, and OPA-policy state. Verified: the report groups all ten frameworks and scores 66/100 overall on the seeded local stack.

New console page: **Comply → Frameworks** (`/admin/frameworks`), showing coverage per framework grouped by domain, click-through to each control and its mapped ReedShield control and evidence.

## 2. Partial items raised to fulfilled

- **Red-team probe coverage** (deck slide 11 gaps): added System Prompt Leakage and Harmful/Unsafe Output families to the Simulation Lab and the garak runner (`services/garak/main.py`, `ui/.../Simulation.jsx`). The default profile now runs seven families.
- **Output masking** (slide 10): the `redact` decision now rewrites the response in place with shape-preserving masks (email keeps its domain, secrets and other PII are masked with a short suffix) instead of blocking the whole reply (`services/api/app.py`).
- **AI-BOM license policy** (slide 12): `spm/bom/license_policy.py` classifies every component's license as allowed / review / denied / unknown, exposed at `GET /bom/license-report` and read by the compliance rule `bom_licenses_allowed`.

## 3. Missing items now built

### Shadow AI discovery (slide 9 — end-user AI security)
- Backend `services/spm_api/discovery_routes.py`: a catalog of ~38 AI SaaS domains, ingest from JSON or CSV (SWG / DNS / CASB exports), usage by user and department, an acceptable-use policy (sanction / review), and a findings list for unsanctioned or unreviewed apps. Tables `shadow_ai_apps`, `shadow_ai_events`.
- Console **Discover → Shadow AI** (`/admin/shadow-ai`): 30-day usage, sanctioned share, upload (data-egress) signal, per-department breakdown, per-app sanction control. A "Load sample telemetry" button seeds 30 days of labelled synthetic usage. Verified live: 12 apps in use, 60 users, 68 uploads flagged.

### Non-human identity register (slide 17)
- Backend `services/spm_api/identity_routes.py`: imports machine identities from agent tokens, integration credentials, and Keycloak service accounts into `machine_identities`, with owner, scopes, rotation policy, last-used, and risk flags (no owner, no expiry, rotation overdue, stale, broad scopes). Sync, rotate (re-mints agent tokens), freeze, unfreeze. Secret values are never stored or returned.
- Console **Discover → Machine Identities** (`/admin/machine-identities`): the register with risk flags, ownership share, rotation-overdue and no-expiry counts, and per-identity actions. Feeds the `nhi_register_current` compliance rule.

### Shift-left Code Guardrails (slide 13)
- `spm/codeguard/rules.py`: 17 rules for hardcoded secrets and unsafe AI patterns (model output to eval/exec or shell, `trust_remote_code`, unsafe deserialization, prompt built from raw user input, model output as raw HTML, secrets in logs, wildcard CORS, unpinned models). Snippets are redacted before storage, so a finding never reproduces a secret.
- Runs three ways from one rule set: the API (`services/spm_api/codeguard_routes.py` — scan JSON, upload a zip, record a CI result, scan the sample repo), the CLI (`scripts/reedshield_codeguard.py`), and CI (`.github/workflows/reedshield-codeguard.yml.example`, which fails a PR on critical or high). Tables `code_scans`, `code_findings`; unit tests in `tests/test_codeguard_rules.py`.
- Console **Validate → Code Guardrails** (`/admin/code-guardrails`): scan history, pass/fail gate, findings with redacted snippets and remediation. Verified: the sample repo scan returns 3 critical, 6 high, 4 medium, 1 low and fails the gate.

## 4. What is still demonstration data, not live

- Shadow-AI telemetry is sample data until a real SWG / DNS / CASB feed is connected to the ingest endpoint.
- The machine-identity register is fully live but small on this local stack (it imports whatever agents and credentials exist); it grows as agents and integrations are added, and picks up Keycloak service accounts when `KEYCLOAK_ADMIN_USER`/`_PASSWORD` are set for spm-api.
- Breach-runbook, log-retention, and NTP compliance rules read configuration flags (`BREACH_RUNBOOK_READY`, `AUDIT_RETENTION_DAYS`, `NTP_SYNC_CONFIGURED`); set them per environment.
- The compliance overall score is genuinely low until each module has produced evidence (run a red-team simulation, sync identities, sanction shadow-AI apps, scan code) — the rules are evidence-based by design.

## 5. Not changed

The security-audit remediation (separate `docs/SECURITY_AUDIT.md`) is still pending your approval; none of this pass touches those findings except that Code Guardrails now detects the same class of issues (base64 "encryption", plaintext tokens) in scanned code. The new endpoints all require `model.read` / `model.write` and derive tenant from the authenticated identity.

## 6. Files

New: `spm/compliance/{iso27001,hipaa,rbi,irdai,sebi_cscrf,cert_in}_mapping.json`, `spm/bom/license_policy.py`, `spm/codeguard/{__init__,rules}.py`, `services/spm_api/{discovery_routes,identity_routes,codeguard_routes}.py`, `scripts/reedshield_codeguard.py`, `.github/workflows/reedshield-codeguard.yml.example`, `tests/test_codeguard_rules.py`, `ui/src/admin/pages/{Frameworks,ShadowAi,MachineIdentities,CodeGuardrails}.jsx`.

Changed: `spm/db/models.py` (5 tables), `spm/compliance/evaluator.py` (15 rules), `services/spm_api/{app.py,bom_routes.py,Dockerfile}`, `services/api/app.py` (masking), `services/garak/main.py` (probes), `ui/src/admin/api/spm.js`, `ui/src/config/navigation.js`, `ui/src/index.jsx`, `ui/src/admin/pages/Simulation.jsx`.
