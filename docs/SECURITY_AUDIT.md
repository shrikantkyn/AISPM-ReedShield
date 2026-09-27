# ReedShield (AI-SPM) — Master Security Audit

Date: 2026-09-15. Scope: the existing codebase and local Docker deployment as found. Nothing was changed for this audit; the report ends with a prioritized remediation plan that waits for approval.

Secrets discovered during the audit are described by type and location only. No value is reproduced anywhere in this document.

## 0. Method and coverage

- Read: the three FastAPI services (`services/api`, `services/spm_api`, `services/agent-orchestrator-service`), shared auth and RBAC (`platform_shared/keycloak_auth.py`, `rbac.py`, `security.py`, `credentials.py`, `integration_config.py`, `agent_tokens.py`), database models and sessions (`spm/db`), the LLM client and tool loop (`services/api/llm_client.py`, `app.py`), uploads and the agent code validator, the nginx front end, the Vite build, the frontend token handling, Keycloak realm setup (`auth/*.sh`), and the three compose files.
- Ran: `npm audit` on the UI (3 moderate in production dependencies, 5 high in dev-only tooling), a Lighthouse best-practices pass (100), and the design detector. No Python dependency scanner is installed in this environment; see finding 11.2.
- Not exercised: Kubernetes/Helm manifests, Flink jobs, MinIO, the threat-hunting agent, and the WebSocket consumer in depth. They are listed as follow-ups.

The 50 audit areas are covered below; areas with no finding are listed in section 3 so the coverage is explicit.

## 1. Secrets found (type and location only)

| Type | Location | Provider | Redacted form | Action |
|---|---|---|---|---|
| LLM provider API keys | `.env` at repo root (git-ignored; the tree is not a git repository) | OpenRouter, Anthropic | `sk-or-v1-…`, `sk-ant-api03-…` | Both keys were pasted into a chat session earlier. Treat as compromised: rotate at the provider, update `.env`, restart `cpm-api`. |
| Web search API key, other provider keys | `.env` | Tavily, Groq | `tvly-…`, `gsk_…` | Rotate if they were ever shared; confirm they are unset if unused. |
| Service-to-service shared secret | `compose.yml` lines 652 and 699, literal default | Internal | `internal-secret-changeme` (a placeholder, not a real secret) | Replace with a generated value from `.env` before any non-local deployment. Finding 2.1. |
| OIDC client secret | `compose.yml` line 582, literal default | Keycloak | `aispm-client-secret-changeme` | Same. Finding 2.1. |
| Keycloak admin and seeded user passwords | `compose.auth.yml` lines 41–44; local realm users reset during this session | Keycloak | `admin`, role names as passwords | Acceptable only on a developer machine. Finding 2.2. |
| Database and Redis passwords | `compose.yml`, `compose.local.yml`, `.env` | Postgres, Redis | env-substituted | Confirm non-default values in `.env` before deployment. |

## 2. Findings

Severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL. "Breaking" says whether the minimal fix changes observable behaviour for a legitimate client.

### CRITICAL

**C1. Uploaded agent code is executed by the API process (RCE for any agent-writer).**
- File: `services/spm_api/agent_validator.py` `validate_agent_code()` lines 144–195; called from `services/spm_api/agent_routes.py` on agent create/patch (code upload at line 178).
- Vulnerability: the "dry import" step runs `subprocess.run([sys.executable, "-c", _DRY_IMPORT_SCRIPT, path])` on the uploaded Python file. Importing a module executes its top-level code. The subprocess inherits the spm-api container's user (root, see H6), network, filesystem, and environment (a filtered `env` is passed, but the process can still read `/proc`, the model upload directory, and reach the database and Redis on the network).
- Attack: any account with `agent:write` uploads `agent.py` whose top level opens a reverse shell, reads `spm-db` with the connection string it can find, or writes to the upload directory. The AST checks run first but only look for a fixed set of banned calls and are bypassable (`getattr(__import__('os'), 'sys'+'tem')`).
- Impact: full compromise of spm-api and everything it can reach.
- Fix: do not execute customer code in the API process. Minimal: set `dry_import=False` by default (AST checks only) and run the dry import, if it is kept, in the existing `garak-runner`/executor tier with `--network none`, a read-only rootfs, a non-root user, a seccomp profile, a tmpfs, and a 5 s CPU limit. Longer term: the executor service already exists for this purpose.
- Breaking: no for the API contract; validation warnings from the dry import disappear unless the sandboxed path is kept.

**C2. RBAC matrix can be rewritten by any model-writer (privilege escalation to admin).**
- File: `services/spm_api/app.py` `put_rbac_matrix()` lines 1064–1075, guarded by `Depends(require_model_write)`.
- Vulnerability: the permission that edits the role→permission matrix is `model:write`, not an admin permission. The matrix is loaded into `platform_shared.rbac` and governs every service.
- Attack: a Security Analyst (who has model write) PUTs a matrix granting `spm:security-analyst` every permission, then uses any admin endpoint.
- Impact: vertical privilege escalation.
- Fix: guard with `require_admin` (already defined at line 116) and additionally require the `spm:admin` realm role even if the matrix says otherwise (the matrix must not be able to grant the right to edit itself). Audit-log the change.
- Breaking: only for non-admin callers, which is the point.

### HIGH

**H1. Integration credentials are base64-encoded, not encrypted.**
- File: `platform_shared/integration_config.py` `_encode_secret()` / `_decode_secret()` lines 105–118; used by `services/spm_api/integrations_routes.py` `configure_integration()` and `rotate_credentials()` (line 1330 `cred.value_enc = _encode_secret(raw)`), and read by `platform_shared/credentials.py`.
- Vulnerability: `value_enc` is `base64(raw)`. Any read of the `integration_credentials` table (backup, read-only replica user, SQL injection elsewhere, log dump) yields every cloud, scanner, and LLM credential in clear.
- Fix: envelope-encrypt with a key from the environment (`INTEGRATION_KEY`, 32 bytes) using the `cryptography` package already installed (`Fernet`), with a one-time migration that re-encodes existing rows. Keep the `_decode_secret` call sites; only the two functions change.
- Breaking: no; migration required before deploy.

**H2. Per-agent secrets are stored in plaintext JSON and returned in clear.**
- File: `services/spm_api/agent_routes.py` `get_secret_endpoint()` lines 479–509; storage in `agents.config.env_vars`; `spm/db/models.py` line 546 `mcp_token = Column(Text)` with the comment "encrypted at rest (V2)" but no encryption.
- Vulnerability: agent secrets and the agent's bearer token are plaintext columns; the endpoint returns `{"value": …}`. The lookup in `platform_shared/agent_tokens.py` compares the presented token with stored plaintext.
- Attack: same exposure as H1; additionally a database read yields every agent's bearer token, which then unlocks `/agents/{id}/secrets/*`.
- Fix: store a SHA-256 hash of `mcp_token` and compare hashes; move `env_vars` values into `integration_credentials` under the H1 encryption (the file's own docstring names this as V2). Keep the wire shape.
- Breaking: existing agents need their tokens re-minted once.

**H3. Internal service routes are reachable from the browser edge and protected only by a shared secret that defaults to a placeholder.**
- Files: `ui/nginx.conf` proxies `/api/spm/` and `/api/` without excluding `/internal/*`; `services/spm_api/app.py` `_require_internal_secret()` line 124 and `/internal/enforce/{model_id}`; `services/api/app.py` `_require_internal_secret_api()` line 623 and `/internal/probe`; `compose.yml` lines 652 and 699 set `INTERNAL_SERVICE_SECRET: internal-secret-changeme`.
- Attack: `POST http://host:3001/api/spm/internal/enforce/<id>` with header `X-Internal-Secret: internal-secret-changeme` enforces or unenforces a model without a user token.
- Fix: in nginx add `location ~ ^/api/(spm/)?internal/ { return 404; }` above the proxy blocks; generate the secret in `.env`; fail startup when it equals the placeholder. Also see M3 for the comparison.
- Breaking: no legitimate browser client uses these routes.

**H4. Cross-tenant reads: tenant comes from the query string or is missing.**
- Files: `services/spm_api/app.py` `list_models(tenant_id: Optional[str])` line 694 (client-supplied tenant filter, no filter when omitted), `get_model()` line 706 (no tenant check), `services/spm_api/integrations_routes.py` `list_integrations()` line 703 (`select(Integration)` with no tenant filter); `_tenant_from_claims()` falls back to `"global"`.
- Vulnerability: authorization is role-based only; object ownership by tenant is not enforced. The system is single-tenant today, so this is latent, but the PRD sells multi-module, multi-tenant onboarding.
- Fix: derive `tenant_id` from `IdentityContext` only, ignore the query parameter, add `.where(Model.tenant_id == identity.tenant_id)` to every list and get, and return 404 (not 403) on mismatch. Ten call sites.
- Breaking: no for single-tenant tokens.

**H5. Keycloak accepts password grants for the browser client, in dev mode, over HTTP.**
- Files: `auth/setup-realm.sh` line 44 `directAccessGrantsEnabled=true`; `compose.auth.yml` `command: start-dev`, `KC_HTTP_ENABLED: "true"`, `KC_HOSTNAME_STRICT_HTTPS: "false"`; no `bruteForceProtected` in the realm script.
- Attack: unlimited `grant_type=password` attempts at `/realms/aispm/protocol/openid-connect/token` (this audit itself used that grant). Credential stuffing and enumeration through differing error strings.
- Fix: set `directAccessGrantsEnabled=false` for `aispm-ui` outside local development; enable realm brute-force protection (`bruteForceProtected=true`, `failureFactor=5`, `waitIncrementSeconds=60`); run `start` with TLS behind traefik in any shared environment.
- Breaking: the scripted ROPC login used by tests and by this session stops working; the console's Authorization Code + PKCE flow is unaffected.

**H6. API containers run as root.**
- Files: `services/api/Dockerfile`, `services/spm_api/Dockerfile`, `services/guard_model/Dockerfile` have no `USER`; `services/agent-orchestrator-service/Dockerfile` line 57 does (`USER appuser`), which is the pattern to copy.
- Impact: multiplies C1 and any future RCE into full container control.
- Fix: add a non-root user and `USER` line; make the model upload directory writable by that user. Breaking: no.

### MEDIUM

**M1. Wildcard CORS on authenticated APIs at the edge; permissive CORS on spm-api.**
- Files: `ui/nginx.conf` `add_header Access-Control-Allow-Origin *` in every `/api/*` location; `services/spm_api/app.py` lines 397–402 `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.
- Impact: any origin can call the APIs with a stolen bearer token; with credentials allowed on spm-api, a cookie-bearing future client would be CSRF-able. Bearer-token auth limits today's blast radius to token theft (see M4).
- Fix: remove the nginx `add_header` lines (the console is same-origin) and set spm-api `allow_credentials=False`, explicit methods and headers. Breaking: only for third-party origins, none are known.

**M2. No security headers.**
- File: `ui/nginx.conf`; nothing sets `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or HSTS.
- Impact: clickjacking of the console; no XSS containment; MIME sniffing.
- Fix: one `add_header` block in the `server` context (note nginx's inheritance rule: any `add_header` inside a `location` clears inherited ones, so the security headers go into an `include`d snippet added in every location, or use `always`). CSP for this app: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' http://keycloak.local:8180; frame-ancestors 'none'`. `'unsafe-inline'` for styles is needed by the `<style>` in ClockDigits and inline `style=` props; documented exception. Self-hosting the two fonts removes the Google domains.

**M3. Shared-secret comparison is not constant-time.**
- Files: `services/api/app.py` line 626 `x_internal_secret != expected`; `services/spm_api/app.py` line 130.
- Fix: `hmac.compare_digest`. Breaking: no.

**M4. Access and refresh tokens live in `sessionStorage`.**
- File: `ui/src/api.js` lines 17–44.
- Impact: any XSS reads both tokens; the refresh token extends the theft. Mitigated by the public PKCE client and short Keycloak lifetimes, and made materially worse by M2 (no CSP).
- Fix (minimal): keep the access token in memory only, keep the refresh token in `sessionStorage` (the redirect round-trip needs one persisted value), add CSP (M2). Fix (better): a backend-for-frontend that holds tokens in an `HttpOnly; Secure; SameSite=Strict` cookie; that is an architecture change and is not recommended in this pass.

**M5. Verbose error details reach clients.**
- Files: `services/api/app.py` line 620 `detail=f"Invalid token: {exc}"`, line 1008 `LLM call failed: {e}`; `services/spm_api/app.py` line 108, line 601 `Failed to store upload: {e}`, line 879 `JWKS generation failed: {e}`.
- Impact: library versions, file paths, upstream provider messages, and JWT validation internals disclosed.
- Fix: log the exception with a trace id, return a fixed message plus the trace id. Breaking: no.

**M6. No rate limiting outside the chat endpoints.**
- Files: `services/api/app.py` `check_rate_limit` is applied only to `/chat` and `/chat/stream`; spm-api and the orchestrator have none; nginx has no `limit_req`.
- Impact: unrestricted resource consumption on uploads (8 GB model upload, 2 GiB scan upload), compliance evaluation, list endpoints, and the Keycloak token endpoint via the proxy.
- Fix: nginx `limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;` on `/api/` with a higher burst on the streaming route; keep the app-level limiter for chat. Breaking: no at normal use.

**M7. Indirect prompt injection through the web-search tool result.**
- File: `services/api/app.py` `_run_web_search()` line 224 returns Tavily page text that is appended verbatim as a `tool_result` (lines 942–975 and 1333–1362).
- Impact: a crafted web page can instruct the model. Agency is limited to one tool (`web_search`) and the output guard runs on the final answer, so exfiltration is bounded to what the model would say.
- Fix: wrap tool results in a delimiter and a system-prompt rule that tool output is data; strip URLs and instructions-like lines from search snippets; cap snippet length. Keep the guard model on output. Breaking: no.

**M8. Sensitive prompt content leaves the platform.**
- File: `services/api/llm_client.py` `OpenRouterAdapter` sends the full conversation to OpenRouter (and on to whichever provider serves the model).
- Impact: customer prompts, including whatever the guard model let through, reach a third party under that provider's retention terms. This is by design but is a DPDPA cross-border transfer (register entry XB-05 on the DPDPA page describes it).
- Fix: document the transfer basis, enable the provider's zero-retention option, and keep the PII guard in enforce mode. No code change required for the audit gate.

**M9. traefik-forward-auth cookie is insecure and the OIDC client secret is a placeholder.**
- Files: `.env.auth` (`INSECURE_COOKIE=true` per the container's startup log), `compose.yml` line 582.
- Impact: applies only on the `aispm.local` traefik path, not the direct `:3001` path used locally.
- Fix: secure cookie and a real secret before any shared deployment.

### LOW

**L1. Development artefacts in the frontend.** `console.log` at 15 call sites in production code (`src/hooks/useSimulationState.js`, `Runtime.jsx`, `Cases.jsx`, `simulationApi.js`, others). The `dev-token` endpoint and production source maps were already removed from the build in the performance pass. Fix: strip with a build-time `drop: ['console']` in `vite.config.js` or remove the calls.

**L2. Unbounded list endpoints.** `list_agents`, `list_integrations`, `list_sessions` return every row. `list_models` was bounded in the performance pass (`limit` ≤ 1000). Fix: same `limit`/`offset` pattern.

**L3. Open-redirect surface in the login return path.** `ui/src/api.js` `loginRedirect(returnTo)` stores `returnTo` in `sessionStorage` and navigates to it after the callback. Only same-origin paths reach it today; validate that it starts with `/` and not `//`.

**L4. Frontend dependency advisories.** `npm audit`: 3 moderate in production (`@remix-run/router`, `nanoid` via a transitive path); 5 high in dev-only tooling (`browserslist`, `postcss`, `@vitest/*`). Fix: `npm update` the three production packages; upgrade `@vitejs/plugin-react` to a Vite-8-compatible release so `--legacy-peer-deps` is no longer needed.

**L5. Model uploads accepted at 8 GB with no type allow-list.** `services/spm_api/app.py` `_persist_upload()` sanitises the filename and caps size; there is no content-type or magic-byte check and files land on the API's local disk. Nothing loads them in-process (ModelScan runs in `model-security`). Fix: an extension allow-list and streaming to object storage.

### INFORMATIONAL

**I1. Good controls observed.** RS256 JWT with issuer, audience, and expiry enforced (`platform_shared/keycloak_auth.py`); WebSocket validates the token (`services/api/ws/session_ws.py`); CORS on `api` and the orchestrator is explicit with credentials off; filenames are sanitised and UUID-prefixed; the agent list never serialises tokens (`_to_dict`); credentials are fetched on demand with Redis TTL (`platform_shared/credentials.py`); no `dangerouslySetInnerHTML` in the UI; `VITE_*` variables carry only public URLs and the public client id; the orchestrator container runs non-root.

**I2. Audit logging.** Request access lines exist (`TraceMiddleware`), and `platform_shared/audit.py` exists; verify that RBAC matrix changes, credential rotation, policy activation, and freeze actions each write an audit row with actor, tenant, and trace id.

**I3. Python dependency scanning.** Not runnable here (no `pip-audit`); `.github/workflows/sbom.yml` produces an SBOM. Add `pip-audit --strict` to `test.yml`.

**I4. Not examined in depth.** Helm/Kubernetes manifests, Flink jobs, MinIO, the threat-hunting agent, Kafka ACLs (plaintext listeners in compose), Redis AUTH usage.

## 3. Areas with no finding

Authentication mechanism (Keycloak OIDC, PKCE, RS256), JWT signature and claim validation, output encoding (React escapes; no raw HTML), XSS sinks (none found), SQL/NoSQL injection (SQLAlchemy ORM throughout; no string-built SQL found in the three services), command injection (no shell=True; subprocess argument lists only), path traversal (sanitised filenames), prototype pollution (no client-side merge of untrusted JSON into state), deserialization (no pickle/yaml.load of user input in the API tier; model files are scanned, not loaded), clickjacking (covered by M2), webhooks (none implemented), background jobs (Kafka consumers read platform topics only), third-party scripts (none; two Google Fonts stylesheets only), frontend bundle exposure (no secrets; source maps off).

## 4. Prioritized remediation plan

**Status (2026-09-16): the production gate — steps 1–8, every CRITICAL and HIGH — is IMPLEMENTED and verified on the local stack.** Steps 9–13 (MEDIUM/LOW, and rotating the exposed keys) remain open. See section 6 for what each closed change was and how it was verified.

Each step is minimal and independently deployable. Estimated effort is in engineer-hours on this codebase.

| # | Finding | Change | Breaking | Effort |
|---|---|---|---|---|
| 1 | C2 | `put_rbac_matrix` → `require_admin` plus realm-role check; audit row | Non-admins lose an access they should never have had | 1 h |
| 2 | H3 | nginx 404 for `/api/**/internal/*`; generated `INTERNAL_SERVICE_SECRET`; startup refuses the placeholder; M3 constant-time compare | No | 1 h |
| 3 | C1 | `dry_import=False` default; sandboxed executor path behind a flag | Fewer validation warnings | 2 h (flag) / 1 d (sandbox) |
| 4 | H1, H2 | Fernet envelope encryption for `integration_credentials`; hashed `mcp_token`; migration | Re-mint agent tokens once | 1 d |
| 5 | M1, M2 | Remove wildcard CORS; security headers and CSP in nginx; spm-api CORS tightened | None known | 2 h |
| 6 | H4 | Tenant from identity only; tenant filter on every list/get | No (single tenant) | 4 h |
| 7 | H5 | ROPC off outside dev; brute-force protection; TLS in shared envs | Scripted password login stops | 1 h |
| 8 | H6 | Non-root users in the three Dockerfiles | No | 1 h |
| 9 | M5, M6 | Fixed error messages with trace ids; nginx `limit_req` | No | 2 h |
| 10 | M4 | Access token in memory only; CSP from step 5 | No | 1 h |
| 11 | M7 | Tool-result delimiting and snippet limits | No | 1 h |
| 12 | L1–L5, I2, I3 | Console stripping, pagination, redirect check, dependency updates, audit rows, pip-audit in CI | No | 4 h |
| 13 | Secrets | Rotate the two LLM keys named in section 1; regenerate placeholders | No | 30 min |

Production gate rule from your prompt 14: steps 1–8 close every CRITICAL and HIGH and are the minimum before any deployment beyond a developer machine.

## 5. What was already changed in the performance pass (for transparency)

These were made under Task 1 and also reduce exposure: production source maps disabled; the Vite `dev-token` endpoint excluded from production builds; gzip and immutable asset caching in nginx; `list_models` bounded to 1000 rows; the compliance report cached for 60 s per tenant and framework. None of them touches authentication, authorization, or secrets.

## 6. Production-gate remediation as built (2026-09-16)

Steps 1–8 are implemented and verified. Details, by finding:

- **C2 — RBAC escalation.** `PUT /rbac/matrix` now depends on `require_admin_identity` (Keycloak realm role, not the editable matrix) in `services/spm_api/app.py`, and writes an `rbac.matrix.updated` audit event. The matrix can no longer grant the right to edit itself.
- **C1 — RCE via uploaded agent code.** `validate_agent_code()` (`services/spm_api/agent_validator.py`) now defaults `dry_import=False` and refuses to execute unless `AGENT_DRY_IMPORT_ENABLED=1` is set (intended only for a sandboxed executor tier). The create path uses the default, so uploaded code is never imported in the API process. Tests updated in `tests/test_agent_validator.py`.
- **H1 — integration credentials base64, not encrypted.** New `platform_shared/secret_crypto.py` provides Fernet envelope encryption keyed by `INTEGRATION_KEY`. `_encode_secret`/`_decode_secret` delegate to it (backward compatible with legacy base64 on read); a one-time migration in `scripts/seed_all.py` re-encrypts existing rows. Verified: the configured credential row is Fernet ciphertext at rest.
- **H2 — agent tokens plaintext.** `agents.mcp_token`/`llm_api_key` are stored Fernet-encrypted (recoverable for container spawn injection), with new indexed `*_hash` (SHA-256) columns for lookup. `platform_shared/agent_tokens.py` resolves by hash; `agent_controller` decrypts at spawn; create/rotate encrypt + hash. A seed migration adds the columns and backfills.
- **H3 / M3 — internal routes at the edge.** `ui/nginx.conf` returns 404 for `/api/**/internal/*`; both internal-secret guards use `hmac.compare_digest` and refuse the `internal-secret-changeme` placeholder. A real `INTERNAL_SERVICE_SECRET` is generated in `.env`. Verified: internal route → 404, normal proxy → 200.
- **H4 — cross-tenant reads.** Tenant is derived from the token only via `_effective_tenant()`; the client-supplied `tenant_id` is ignored; list/get/create for models and `list_integrations` filter by it; `get_model` returns 404 on tenant mismatch. Verified: `?tenant_id=other` still returns only the caller's tenant.
- **H5 — Keycloak ROPC / brute force.** `auth/setup-realm.sh` sets `directAccessGrantsEnabled=${KC_ALLOW_ROPC:-false}` (off by default; on only for local dev) and enables realm brute-force protection; brute-force is applied to the live realm. Per this finding, ROPC stays enabled only on developer machines.
- **H6 — containers as root.** `services/{api,spm_api,guard_model}/Dockerfile` add a non-root `appuser` and `USER`. Verified: all three run as `appuser`.
- **M1 / M2 — CORS and security headers.** Wildcard `Access-Control-Allow-Origin` removed from nginx; a CSP plus `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` are set (the strict CSP is intentionally not layered onto the proxied Keycloak login, which ships its own). spm-api CORS uses `allow_credentials=False` with explicit method/header allow-lists.

Shared secrets (`INTEGRATION_KEY`, `INTERNAL_SERVICE_SECRET`) are provisioned in `.env` and shared via the compose `common-env` anchor. Still open: steps 9–13 (rate limiting and error hygiene, token-in-memory, tool-result delimiting, dependency updates and CI scanning, and rotating the two exposed LLM keys named in section 1).
