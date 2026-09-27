# ReedShield against "AI Security — From Discovery to Continuous Assurance" (deck v1.5)

Assessment date: 2026-09-15. Source: the 18-slide deck. Each requirement below is rated against what exists in the ReedShield codebase today, not against the PRD roadmap.

Ratings: **Fulfilled** (real, working code behind it), **Partial** (some of it is real, the rest is demonstration data or missing), **Missing** (no implementation).

## Summary

| Deck area | Rating | What ReedShield has | What is missing |
|---|---|---|---|
| 1. Discovery (slide 7) | Partial | Model registry, agent registry, AI-BOM components and relationships with blast radius, posture drift for AI asset misconfiguration, Lineage for data flows | Shadow-AI discovery from network, SaaS, or browser telemetry; the Inventory page's asset list is demonstration data; per-asset ownership and risk are seeded, not computed |
| 2. Model Security (slide 12) | Fulfilled, one gap | ModelScan scanning service, AI-BOM with component inventory, model status gate (register → approved → enforced) with the enforce hook, agent code validation on upload | License and "unauthorized package" policy on BOM components is not evaluated; training-data vetting is out of scope |
| 3. Runtime (slide 8) | Fulfilled | Guard model with prompt-injection and jailbreak scoring, output guard with PII and secret detection, 11 OPA policy bundles, Kafka/Flink event pipeline, live Runtime sessions and event stream, alerts, cases, freeze controller for response | Remediation playbooks (Automation page) run on demonstration data; AutoFix is not built |
| 4. Guardrails (slide 10) | Partial | Input and output validation, prompt policies in OPA, malicious-prompt detection (S-code categories), PII and secret detection with block / redact / allow decisions | Redaction is a decision, not a masking transform on the response body; sensitive corporate data classification beyond PII patterns is absent |
| 5. Red Teaming (slide 11) | Fulfilled, one gap | Simulation Lab attack types (injection, jailbreak, exfiltration, tool abuse, evasion), Garak probe families (prompt injection, data exfiltration, tool use, encoding, multi-turn) against the live pipeline, persisted findings | No explicit system-prompt-leakage probe family and no harmful-content probe family enabled by default |
| End-User AI Security (slide 9) | Missing | Only traffic that passes through ReedShield's own gateway is seen | Shadow consumer-AI discovery, usage by user and department, data-sharing prevention at the endpoint, acceptable-use policy enforcement: this is CASB / SASE / browser telemetry, which ReedShield does not ingest |
| Shift-left in AI/ML development (slide 13) | Partial | Agent code validated on upload; model gate before deployment | No IDE, pull-request, or CI integration; the PRD's Code Guardrails module is not built |
| Governance and compliance (slide 15) | Partial | ISO/IEC 42001 and OWASP LLM Top 10 mapped with a live evidence engine and reports; NIST AI RMF, EU AI Act, and DPDPA as extras | ISO/IEC 27000 series is not mapped (listed as roadmap) |
| Continuous journey (slide 16) | Fulfilled | Continuous monitoring, drift checks, weekly readiness readings, retest-driven findings | — |
| Non-human identities (slide 17) | Partial | Every agent is minted machine credentials that are tracked; scope drift is detected; the freeze controller revokes; integration credentials can be rotated from the UI | No NHI inventory across the enterprise (only ReedShield-minted identities), no ownership register, no least-privilege analytics, no rotation schedule for agent tokens; the Identity & Trust page runs on demonstration data; the security audit rates agent-token storage HIGH (plaintext) |

Overall: ReedShield fulfils the deck's five-pillar technical framework for the AI systems that run through it (pillars 2, 3, 5 fully; 1 and 4 partly). It does not fulfil the two enterprise-wide visibility promises: end-user shadow-AI discovery and non-human-identity governance across the estate. Those two, plus ISO 27001 mapping and CI integration, are the gap.

## Detail by slide

### Slide 6 and 7: Discovery
- *Asset inventory (LLMs, GenAI apps, agents, unsanctioned AI SaaS).* Models and agents are registered in `spm-api` with real tables; AI-BOM components come from the `/bom/sync` importer. Unsanctioned SaaS is not discoverable without a traffic or identity-provider feed. **Partial.**
- *Ecosystem mapping (users, data flows, API connections, datasets).* Lineage traces prompt → guard → policy → model → output; BOM relationships give component graphs and blast radius. Users and datasets are present only where a session touched them. **Partial.**
- *Risk quantification (ownership, exposure, inherent risk per asset).* Posture score and pillar scores are computed from real evidence; per-asset owner and risk on the Inventory page are seeded. **Partial.**
- *AI asset misconfiguration.* `platform_shared/posture_drift.py` compares agent, model, tool, and identity configuration against a baseline and raises drift findings. **Fulfilled for ReedShield-managed assets.**

### Slide 8: Runtime
- *Continuous monitoring.* Every request is screened by the guard model and OPA; events flow through Kafka to Flink CEP with burst and intent-drift rules; the Runtime page shows live sessions. **Fulfilled.**
- *Threat detection (prompt injection, data-leakage).* Guard model categories S1–S15 with weighted scoring; output guard detects PII and secrets; thresholds allow < 0.30, escalate 0.30–0.70, block ≥ 0.70. **Fulfilled.**
- *Behavioural oversight of agents, tools, API calls.* Tool-injection guard and tool policy in OPA; agent activity endpoint; MCP tool calls mediated by `spm_mcp`. **Fulfilled.**
- *Detect, respond, remediate.* Alerts and cases are real; freeze controller responds; remediation playbooks are demonstration data. **Respond fulfilled, remediate partial.**

### Slide 9: End-User AI Security
Not in scope of the current product. To fulfil it, ReedShield would need one of: a CASB/SASE log integration (SWG or DNS logs) to classify AI SaaS domains, an identity-provider app-usage feed, or a browser extension. The Integrations page has the connector framework these would plug into, but no such connector exists. **Missing.**

### Slide 10: Guardrails
- *Input and output validation, overarching prompt policies.* `prompt_policy.rego`, `output_policy.rego`, `output_schema_guard.rego`, and the two guard services. **Fulfilled.**
- *Malicious prompt detection.* Injection, jailbreak (including persona jailbreaks), recon, and tool-injection detection. **Fulfilled.**
- *Sensitive data protection with masking and redaction.* PII and secret patterns are detected and the policy can return `redact`, but the response is blocked rather than rewritten with masked values. **Partial**; a masking transform in `output_guard` closes it.

### Slide 11: Red Teaming
- *Prompt injection and jailbreaks, malicious instructions, model behaviour manipulation.* Covered by the Simulation Lab attack types and the enabled Garak families; runs execute against the live guard → OPA → model → output guard pipeline and persist findings. **Fulfilled.**
- *System prompt leakage.* No dedicated probe family is enabled. Garak has one; it needs to be added to the probe list. **Partial.**
- *Unsafe or harmful responses.* Output policy blocks configured categories; no toxicity or harm probe family is enabled by default. **Partial.**

### Slide 12: Model Security
- *Deep assessment before deployment.* `model-security` runs ModelScan on uploaded weights and records findings. **Fulfilled.**
- *Model-related component risks and AI-BOM.* Components, relationships, graph, and blast radius exist. Unlicensed or unauthorized packages: components carry metadata but no license policy is evaluated. **Partial.**
- *Enforce security checks and block failing models.* Model status transitions and the enforce hook gate promotion; OPA `model_policy.rego` blocks unapproved models at runtime. **Fulfilled.**

### Slide 13: Shift-left
Only the upload-time agent code validation exists (and its execution step is a critical audit finding). No SAST-style scanning of AI application code, no PR annotations, no CI gate. **Partial.**

### Slide 15: Governance
ISO/IEC 42001 and OWASP LLM Top 10 mappings exist with live evidence and PDF/JSON reports; NIST AI RMF and EU AI Act are also mapped; DPDPA has its own module. ISO/IEC 27001 is not mapped. **Partial.** Adding a 27001 mapping file follows the same pattern as the existing four.

### Slide 17: Non-human identities
- *Discover every NHI.* ReedShield knows the identities it mints (agent MCP and LLM tokens) and the integration credentials it stores; it does not discover service accounts, API keys, or OAuth tokens elsewhere in the enterprise. **Partial.**
- *Establish ownership.* Agents have a tenant; there is no owner field or ownership workflow for machine identities. **Missing.**
- *Minimize privilege.* Agent policies scope tools; posture drift flags scope changes; no privilege analytics or least-privilege recommendations. **Partial.**
- *Rotate and revoke continuously.* Freeze controller revokes; integration credentials rotate on demand; agent tokens have no rotation or expiry schedule. **Partial.**
- *MFA loophole.* Not applicable to a machine identity; ReedShield's compensating control is scoped, revocable tokens. Note the security audit finding H2: tokens are stored in plaintext today.

## What it would take to fulfil the whole deck

Ordered by leverage, smallest first:

1. **Red-team probe coverage** (hours): enable Garak's system-prompt-leakage and harmful-content families in the Simulation Lab defaults.
2. **ISO/IEC 27001 mapping** (a day): add `spm/compliance/iso27001_mapping.json` on the existing evaluator; the Posture page and reports pick it up.
3. **Output masking** (a day): make the `redact` decision rewrite the response with masked PII and secrets instead of blocking.
4. **BOM license policy** (one to two days): evaluate component licenses and an allow-list in OPA, surface failures as findings.
5. **NHI register** (one to two weeks): an identity table for machine credentials with owner, scope, last-used, expiry, rotation schedule, and a discovery importer from Keycloak service accounts and cloud IAM; fix audit finding H2 as part of it. This turns the Identity & Trust page from demonstration data into the deck's NHI capability.
6. **End-user shadow-AI discovery** (two to four weeks): a connector for SWG, DNS, or CASB logs with an AI-SaaS domain classifier, plus usage-by-user and usage-by-department views and an acceptable-use policy that raises findings.
7. **Shift-left** (two to three weeks): the PRD's Code Guardrails module: repository scanning for AI misuse patterns and secrets, PR checks, and a CI gate that calls the model and agent validators.

Items 1 to 4 keep the current architecture. Items 5 to 7 add new data sources and are the three genuinely new capabilities the deck asks for.
