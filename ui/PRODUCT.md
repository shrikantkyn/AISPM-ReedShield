# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Security and compliance teams at mid-market to enterprise organizations that build or operate AI applications on multi-cloud infrastructure and are headquartered in, or serve customers in, India (the DPDP Act applies extraterritorially). Eight Keycloak realm roles gate the console:

- Security Analyst (`spm:security-analyst`) — triages a cross-module alert queue, runs simulations and red-team probes, investigates attack paths. Lives in Simulation, Runtime, Alerts, Risk Graph.
- Compliance Auditor (`spm:auditor`) — needs defensible, exportable evidence per framework. Lives in Compliance, Evidence, Lineage.
- Platform Admin (`spm:admin`) — identity, integrations, approvals, freeze/unfreeze. Lives in Identity & Trust, Integrations, Settings.
- Read-Only Stakeholder (`spm:viewer`) — a CISO or board-facing lead wanting a five-second trustworthy read on organizational risk, with no controls to touch. Lives in Dashboard, Overview.
- Cloud Engineer (`spm:cloud-engineer`) — real misconfigurations scoped to what they own, with safe fixes.
- Developer / AppSec (`spm:developer`) — findings inside IDE/PR/CI, not a separate console.
- Pentester (`spm:pentester`) — scoped, authorized offensive testing with evidence capture.
- Data Protection Officer (`spm:dpo`) — a live registry, DPIA and breach-clock workflow, grievance case handling, and DPDP readiness by obligation category.

The situation is operational: a person is inside a task (triage, investigate, approve, prove, respond), often under time pressure (a breach-notification clock, an audit request, a regulator query), at a desk on a large display.

## Product Purpose

ReedShield (CPM v4 — Convergent Posture Management) is a unified security platform converging AI security posture management, cloud & code security (CNAPP), penetration testing, multi-framework compliance, and Digital Personal Data Protection Act (India) compliance into one console with one inventory, one identity graph, one policy engine (OPA/Rego), and one evidence trail.

It exists so a security team can answer, from one place: what AI, cloud, code, and personal-data processing exists; whether it is behaving; whether defenses hold under real offensive pressure; and whether the organization can produce audit-defensible evidence on demand. Success is measured by policy coverage in enforced mode, red-team/pentest pass rate, mean time to freeze a compromised identity, alert-to-acknowledge time, MTTR with and without AutoFix, DPDP evidence turnaround under one business day, and a low cloud/code false-positive rate.

## Positioning

One inventory, one risk graph, one evidence trail across AI, cloud, code, offensive validation, and India-specific data protection — with a native DPDP Act module that Wiz, Orca, Snyk and Prisma Cloud do not model. Red-teaming and pentesting run against the live enforcement pipeline (guard model → OPA → LLM → output guard), not a mock, so a passing result is evidence rather than a claim. The compliance layer generalizes the same control-mapping/evidence engine across NIST AI RMF, ISO 42001, OWASP LLM Top 10, EU AI Act (already live) and SOC 2 / ISO 27001 / HIPAA / PCI-DSS / CIS / DPDPA (roadmap).

## Operating Context

- Console at `/admin/*` behind Keycloak OIDC; chat surface at `/`. Nav groups per PRD v4: Monitor (Dashboard, Risk Graph, Alerts), Discover (Inventory), Protect (Runtime & Policies, Cloud Posture, Code Guardrails, Remediate), Validate (Simulation Lab, Pentest), Comply (Frameworks, DPDPA), plus Identity & Trust and Settings.
- Real backend today (this repo): FastAPI microservices — `api` gateway (chat, streaming, tool loop, `/internal/probe`), `spm-api` (model registry, agents, posture, integrations, AI-BOM `/bom/*`, compliance report `/compliance/nist-airm/report?framework=…`), `agent-orchestrator` (sessions, lineage, policies, findings, alerts, cases), `guard-model`, `garak-runner` (red-team probes), `model-security` (ModelScan), OPA with 11 Rego bundles, Kafka/Flink CEP, Redis, Postgres, Keycloak. LLM generation currently routed via OpenRouter (`anthropic/claude-sonnet-5`).
- Existing real console pages: Overview, Dashboard, Posture, Alerts, Inventory, Identity & Trust, Data & Knowledge, Runtime, Policies, Lineage, Simulation, Cases, Automation, Integrations, Settings. Several (Identity & Trust, Posture, parts of Inventory, Dashboard KPIs) render hardcoded demonstration data pending backend tables.
- Documents of record: `C:\Users\EV\Downloads\PRD_v4.docx`, `BRD.docx`, `UserStories_v4.docx` (248 stories, 8 personas), `DPDP_Compliance_Feature_PRD_BRD_FRD.docx`, `Unified_Security_Platform.pdf` (one-page mockup of the incumbent unified dashboard). 
- Deployment: production-shaped Kubernetes (Kind/Istio/CNPG) path, and a local Docker Compose path (`compose.local.yml` overlay) used for development on this machine. The UI is a Vite/React 18 app (Tailwind 3, lucide-react, react-router 6), built into an nginx image on port 3001.

## Capabilities and Constraints

- Numbers that govern behavior and belong on-screen unchanged: posture thresholds allow < 0.30 / escalate 0.30–0.70 / block ≥ 0.70; intent-drift threshold 0.65; burst windows 120 s (5 events) and 3600 s (15 events); rate limit 60 req/min; guard-model timeout 60 s; RS256 JWT; Kafka RF 3 / min ISR 2; evidence retention 7 years default; DPDP evidence turnaround target under one business day.
- Terminology to preserve: Decision Trace, Policy Impact, Lineage, Risk Graph, Simulation Lab, freeze/unfreeze, posture score, blended risk score, Rules of Engagement (ROE), AutoFix, DPIA, Significant Data Fiduciary (SDF), Data Principal, Grievance Officer, breach-notification clock. DPDP control sections: S.4, S.5, S.6, S.6(4), S.7, S.8(5), S.8(6), S.9, S.10, S.11, S.12, S.13, S.16, S.18.
- DPDP module — scope confirmed for this pass: Command Center (readiness score overall and per control, trend, critical gaps), Controls (S.4–S.18 with Pass/Warning/Fail/Not Assessed), Findings (severity, section, penalty tier, asset, evidence, owner, status, remediation), Consent & Data Principal Rights readiness, Breach-notification clock and readiness, Cross-border transfer register. DPIA workflow, children's data, policy analyzer, reports, and administration are out of this pass.
- DPDP scoring must be transparent and configurable; never display a computed rupee amount as an assured legal liability — label as "potential exposure / penalty tier reference" requiring legal review. DPDP output is advisory and evidentiary; it does not replace the customer's DPO, Grievance Officer, or counsel.
- No DPDP backend exists yet. This pass ships the DPDP module in the console with a structured data layer so real endpoints can replace it without UI change; all DPDP figures are demonstration data and are labeled as such in the interface.
- Undecided: the exact backend service and tables for DPDP (candidate: extend `spm_api` and the `compliance_evidence` pattern). Undecided: which cloud/code/pentest modules from PRD v4 get real backends; their nav entries are not added until a page exists behind them.
- Roles: existing four roles keep their access boundaries; the four new roles exist in the PRD and must not break existing RBAC behavior.
- Non-functional: keyboard-accessible core workflows and readable status indicators (DPDP NFR-10); every finding exposes evidence and rule rationale (NFR-07).

## Brand Commitments

- Name: **ReedShield** (Hebrew, "steadfast, enduring").  The Keycloak realm id (`aispm`) and internal service names are not user-facing and stay as they are.
- Originality is a binding constraint: the identity must be clearly distinct from (a) generic dashboard templates and theme kits; (b) the competitor/reference product the user refers to as "zero-x" (name not supplied). When the user later names zero-x, verify distance against it explicitly.
- Voice: plain, operational, and precise; controls name their action; errors name the problem and the recovery. No hype, no gamification.

## Evidence on Hand

- Five product documents listed under Operating Context (extracted text lives in the session scratchpad). The PDF mockup is evidence of the incumbent composition and content, not a design authority.
- Real backend endpoints and data for AI-SPM, AI-BOM, model-security findings, and the four compliance frameworks already seeded; a real Keycloak realm with seeded users (`admin@aispm.local` etc.).
- Absences that must not be fabricated: no customer names, testimonials, pricing, or benchmarks; no real DPDP findings, data-principal records, breach incidents, or transfer register entries — all DPDP content in this pass is synthetic demonstration data and must be marked so.

## Product Principles

1. One graph, not a fifth tool — every module contributes to and reads from one inventory, one identity model, one risk score, one evidence trail; never a siloed sub-product.
2. Evidence, not a guess — a control is proven by a live result (Decision Trace, probe, scan, retest), and every compliance claim is traceable through Lineage to the finding beneath it.
3. Time-critical by design — a breach clock, a freeze, an escalation must be findable and actionable within seconds; the interface serves the task under pressure before it serves expression.
4. Advisory where the law is — DPDP output informs a DPO and counsel; the product never presents itself as legal compliance, and never dresses a penalty reference as a liability figure.
5. Land single-module, expand without re-onboarding — any module (DPDPA alone included) must stand on its own and join the shared graph without migration.

## Accessibility & Inclusion

Keyboard-accessible core workflows and readable, non-color-only status indicators are product requirements (DPDP NFR-10). Text contrast ≥ 4.5:1 for body, ≥ 3:1 for large text; severity and control status carry a label or icon alongside color. Reduced-motion preference respected.
