# ReedShield User Guide

ReedShield is a unified security console: AI security posture, runtime enforcement, offensive validation, compliance evidence, and India's Digital Personal Data Protection Act (DPDPA) in one binder. This guide walks every screen and every action as numbered steps with the result you should see after each one.

Conventions used below:

- **Step** — what you do. **Expect** — what the screen shows when the step worked. **If not** — the most likely cause and the fix.
- Figures marked with a red **DEMO DATA** stamp are demonstration values. They are there so every workflow can be tried end to end before live sources are connected.
- Keyboard shortcuts are written as Ctrl+B; on macOS use Cmd instead of Ctrl.

---

## 1. Getting started

### 1.1 Start the platform (local Docker)

1. **Step:** Open Docker Desktop and wait until it reports "Engine running".
   **Expect:** The whale icon stops animating.
2. **Step:** In a terminal at the repository root, start the infrastructure:
   ```bash
   docker compose -f compose.yml -f compose.local.yml --env-file .env up -d spm-db kafka-1 redis opa
   ```
   **Expect:** Four containers reported as Started. `docker ps` shows `cpm-spm-db` as healthy within about a minute.
3. **Step:** Start the identity provider:
   ```bash
   docker compose -f compose.auth.yml up -d
   ```
   **Expect:** `keycloak`, `traefik`, and `traefik-forward-auth` are Up. Keycloak reports healthy after roughly 30 seconds.
4. **Step:** Start the application services and the console:
   ```bash
   docker compose -f compose.yml -f compose.local.yml --env-file .env up -d guard-model api spm-api model-security garak-runner agent-orchestrator ui
   ```
   **Expect:** All containers Up; `cpm-api`, `cpm-spm-api`, `cpm-guard-model`, `cpm-agent-orchestrator` show healthy.
   **If not:** If `spm-api` or `agent-orchestrator` exited because the database was still starting, run `docker start cpm-spm-api cpm-agent-orchestrator` once the database is healthy.
5. **Step:** Confirm the hosts entry `127.0.0.1 keycloak.local` exists in `C:\Windows\System32\drivers\etc\hosts`.
   **Expect:** Opening http://keycloak.local:8180 shows the Keycloak welcome page.

### 1.2 Sign in

1. **Step:** Open http://localhost:3001/admin/dashboard.
   **Expect:** You are redirected to the Keycloak sign-in page titled "Sign in to your account".
2. **Step:** Enter one of the local accounts and press **Sign In**.

   | Username | Password | Role | What the role can do |
   |---|---|---|---|
   | admin@aispm.local | admin | Admin | Everything, including settings, integrations, and policy activation |
   | analyst@aispm.local | analyst | Security Analyst | Triage alerts, run simulations, open cases |
   | auditor@aispm.local | auditor | Auditor | Read compliance and evidence, export reports |
   | viewer@aispm.local | viewer | Viewer | Read-only dashboards |

   **Expect:** The browser returns to the console and the **Dashboard** sheet appears with the ReedShield mark in the sidebar. The account square at the top right shows the first letter of the signed-in user.
   **If not:** "Invalid username or password" means the password was changed in Keycloak; reset it in the Keycloak admin console (admin / admin) under Realm `aispm` → Users → Credentials.

### 1.3 Sign out

1. **Step:** Click the account square at the top right, then **Log out**.
   **Expect:** The Keycloak session ends and the sign-in page returns.

---

## 2. Finding your way around

### 2.1 The binder layout

The console is drawn as an auditor's working-papers binder:

- **Sidebar (the binder edge)** on the left with colored **index tabs**: Monitor (orange), Discover (yellow), Protect (green), Validate (violet), Comply (teal), Platform (slate). The tab of the section you are in pulls forward as a solid block.
- **Top bar** with breadcrumbs (`ReedShield / Section / Page`), search, the reporting period, notifications, help, and your account.
- **Sheets** are the panels. Each has a ruled header band with a working-paper reference such as `WP A-3`, a title, and sometimes an action on the right.
- **Tick marks** are the status vocabulary and always carry a word: green check = pass or agreed to evidence, amber flag = warning or follow up, red cross = fail or exception, grey dash = not assessed.
- **Stamps** (rotated outlined labels) mark facts: ENFORCED, DEMO DATA, ROE SIGNED, ACTIVE.

### 2.2 Sidebar modes: open, rail, and tucked away

1. **Step:** Click the panel icon at the far left of the top bar.
   **Expect:** The sidebar shrinks to a 64px rail of icons and color chips. Hovering an icon shows its name. Click again to reopen.
2. **Step:** At the bottom of the open sidebar, click **Tuck away** (or press Ctrl+B).
   **Expect:** The sidebar slides out of view entirely and the page uses the full width. A small handle with the ReedShield mark appears on the left edge, halfway down.
3. **Step:** Click the edge handle, press Ctrl+B again, or click the top-bar panel icon.
   **Expect:** The full sidebar returns. Your last deliberate choice is remembered on this browser.
4. **Note:** On windows narrower than 1024px the sidebar starts in rail mode; that automatic choice is not saved.

### 2.3 Search

1. **Step:** Click the search field in the top bar (visible at widths of 1024px and above) and type part of an asset, alert, policy, or session name, for example `gpt-4`.
   **Expect:** A dropdown lists matches grouped as Assets, Alerts, Policies, Sessions. Press Esc to close.

### 2.4 Reporting period

1. **Step:** Use the calendar select in the top bar to choose Last 1 hour, 24 hours, 7 days, or 30 days.
   **Expect:** The selection is shown in the control. (Live pages that honor the period re-query on change; demonstration sheets keep their figures.)

### 2.5 Notifications

1. **Step:** Click the bell.
   **Expect:** A dropdown of case notifications, newest first; unread ones are marked. **Mark all read** clears the unread count. **View all cases** opens the Cases page.
   **If not:** "No notifications yet" means no cases have been opened by you or the threat-hunting agent.

---

## 3. Monitor

### 3.1 Overview (`/admin/overview`)

The Security Command Center: overall posture, critical alerts, policy coverage, high-risk agents, active threats, recommendations, and weekly activity.

1. **Step:** Click **Overview** at the top of the sidebar.
   **Expect:** The hero shows an overall posture gauge (0–100 with a Healthy / Warning / Critical band), followed by four figures: Posture Score, Critical Alerts, Policy Coverage, High Risk Agents.
2. **Step:** Click **Run Simulation** in the hero.
   **Expect:** You land on the Simulation Lab (section 6.1).
3. **Step:** Under **Active Threats**, click any row.
   **Expect:** The Alerts page opens on that finding.
4. **Step:** Use the **Launch** tiles at the bottom (Inventory, Alerts, Runtime, Lineage, Policies, Simulation).
   **Expect:** Each tile opens its module.

### 3.2 Dashboard (`/admin/dashboard`)

The organization's summary sheet across AI, cloud, code, offensive validation, and DPDPA. All figures carry the DEMO DATA stamp until live endpoints exist.

1. **Step:** Click **Monitor → Dashboard**.
   **Expect:** A working-paper header (`WP A-1 Dashboard`) with **Prepared by** and **As of** boxes and an **Export sheet** button.
2. **Step:** Read the **trial-balance line** (the ruled row of four figures).
   **Expect:**
   - **Blended risk score** on a 0–100 ruled scale with a marker; red band above 70, amber 40–70. The movement line shows the 7-day change; lower is better.
   - **Open critical alerts** with today's count, the modules affected, and the age of the oldest.
   - **Mean time to freeze** in seconds with a green **Agreed** tick when within the 60 s SLA.
   - **Modules enforced** as `8/8` with an **ENFORCED** stamp when every policy bundle is in enforce mode.
3. **Step:** In **Unified Risk Graph (WP G-2)**, follow the four squares SEC → IAM → AI → PII.
   **Expect:** Each square is colored by its module and captioned with the step number, working-paper reference, finding title, asset, and module. Clicking a square opens that module. **Open full graph** opens Lineage.
4. **Step:** Read the **DPDPA readiness (WP H-1)** sheet on the right.
   **Expect:** A readiness figure on a ruled scale, one tick per obligation category, and a breach clock reading `00:00:00` with "No clock running". **Command center** opens the DPDPA module.
5. **Step:** In **Recent alerts (WP A-3)**, click an alert title.
   **Expect:** The Alerts page (or the DPDPA findings page for DPDPA alerts) opens on it.
6. **Step:** In **Module health (WP A-4)**, click a module line.
   **Expect:** The corresponding page opens. A green **ROE SIGNED** stamp on Pentest means the rules of engagement are on file.
7. **Step:** Check the footer legend.
   **Expect:** The four tick marks are explained, and the DEMO DATA stamp states that the figures are demonstration data.

### 3.3 Posture (`/admin/posture`)

Measures AI security coverage, gaps, and enforcement readiness.

1. **Step:** Click **Monitor → Posture**.
   **Expect:** Coverage by asset class (Agents, Tools, Knowledge Sources, Identities, Policies, Simulation Flows) with covered-of-total counts, and three pillar scores: Prevention, Visibility, Governance, each banded Healthy / Warning / Critical.
2. **Step:** Scroll to **Framework Alignment**.
   **Expect:** Alignment against NIST AI RMF, ISO 42001, OWASP LLM Top 10, and EU AI Act with percentage coverage per framework, sourced from the compliance evidence tables.
3. **Step:** Click a gap row.
   **Expect:** The related module opens so the gap can be closed (for example an unprotected agent opens Policies).

### 3.4 Alerts (`/admin/alerts`)

AI-powered threat findings from the hunt engine.

1. **Step:** Click **Monitor → Alerts**.
   **Expect:** Summary figures (open, investigating, resolved in 24h), filters for Severity and Status (Open, Investigating, Resolved), and a ruled table of findings.
2. **Step:** Click a finding.
   **Expect:** A detail panel with severity, the rule that fired, the affected model or agent, evidence, and the decision trace.
3. **Step:** Click **Open Case** on an open finding.
   **Expect:** A case is created and the finding's status becomes Investigating; the bell shows a new notification.
4. **Step:** Click **Mark as Resolved**.
   **Expect:** The button reads "Already Resolved" and the row moves to the Resolved filter.
   **If not:** A red error under the buttons means the orchestrator (`cpm-agent-orchestrator`) is not reachable; check `docker ps`.

---

## 4. Discover

### 4.1 Inventory (`/admin/inventory`)

Every AI asset: models, agents, tools, MCP servers, sessions, and context sources.

1. **Step:** Click **Discover → Inventory**.
   **Expect:** Filters by type, risk, provider, and policy status; a table with risk, owner, provider, last seen, and linked policies and alerts.
2. **Step:** Click a row.
   **Expect:** A detail drawer with description, runtime status, policies, and recent alerts.
3. **Step:** Right-click a custom agent row and choose **Open Chat in New Tab**.
   **Expect:** A dedicated chat surface for that agent opens at `/agent/<id>/chat`. The option is greyed out for platform-internal agents and for agents that are stopped.
4. **Step:** Click **Export**.
   **Expect:** A JSON export of the current inventory downloads.

### 4.2 Identity & Trust (`/admin/identity`)

Access posture, delegated permissions, and trust signals for users, agents, and service accounts.

1. **Step:** Click **Discover → Identity & Trust**.
   **Expect:** Identity counts, MFA coverage, frozen identities, over-privileged principals, and a table of identities with trust scores.
2. **Step:** Open an identity with a warning.
   **Expect:** Its permissions, delegated scopes, recent activity, and the freeze control.
3. **Step:** Click **Freeze** on a compromised identity, then confirm.
   **Expect:** The identity shows Frozen; the platform's mean-time-to-freeze figure counts this action. **Unfreeze** reverses it.

### 4.3 Data & Knowledge (`/admin/data`)

Context sources, data trust posture, and knowledge dependencies.

1. **Step:** Click **Discover → Data & Knowledge**.
   **Expect:** Sources with classification, trust level, connector credential status, and which agents depend on each.
2. **Step:** Open an unclassified source and set its classification.
   **Expect:** The Posture page's "unclassified" count drops on its next refresh, and DPDPA control S.8(5) gains evidence.

---

## 5. Protect

### 5.1 Runtime (`/admin/runtime`)

Live AI execution, tool usage, and security decisions.

1. **Step:** Click **Protect → Runtime**.
   **Expect:** A **Sessions** list on the left and an **Event Stream** on the right. Sessions carry a status (allowed, escalated, blocked).
2. **Step:** Select a session.
   **Expect:** The event stream fills with guard-model decisions, OPA policy results, tool calls, and outputs in order, each with its score against the thresholds (allow below 0.30, escalate 0.30–0.70, block at 0.70 and above).
3. **Step:** Click **Escalate Session to Case**.
   **Expect:** A case is created with the session attached and the Cases page opens on it.

### 5.2 Policies (`/admin/policies`)

The OPA/Rego policy bundles that govern every request.

1. **Step:** Click **Protect → Policies**.
   **Expect:** A list of policies with mode (Monitor, Enforce, Draft), version, and violations today.
2. **Step:** Open a policy and click **Edit**; change the logic or scope.
   **Expect:** An editor with the policy JSON and a **Save & Activate** button.
3. **Step:** Click **Save & Activate**.
   **Expect:** The policy saves and its mode flips to Enforce in one action. Use **Save as Draft** only when intentionally staging a change.
4. **Step:** On a Monitor-mode policy, click **Activate**.
   **Expect:** Mode becomes Enforce. The Dashboard's "Modules enforced" figure reflects the change once live.
5. **Step:** Use the row menu for **Duplicate policy**, **Download policy JSON**, or **Delete policy**.
   **Expect:** Duplicate creates a Draft copy; Download saves `reedshield-policies-export-<date>.json`; Delete asks for confirmation first.

### 5.3 Lineage (`/admin/lineage`)

Trace how context flowed into an AI decision.

1. **Step:** Click **Protect → Lineage** (or **Open full graph** from the Dashboard).
   **Expect:** A graph of sessions, prompts, tools, data sources, policies, and outputs.
2. **Step:** Open `/admin/lineage/<session id>` from a session or case.
   **Expect:** The graph filtered to that session, with the decision trace for each node. Events produced in the chat surface appear here without a reload.

---

## 6. Validate

### 6.1 Simulation Lab (`/admin/simulation`)

Attack the live enforcement pipeline (guard model → OPA → model → output guard). A passing result is evidence, not a claim.

1. **Step:** Click **Validate → Simulation**.
   **Expect:** A configuration panel with attack types: Prompt Injection, Jailbreak Attempt, Data Exfiltration, Tool Abuse, Policy Evasion, Custom Input.
2. **Step:** Pick **Prompt Injection**, keep the default prompt, choose the policies to validate, and click **Run**.
   **Expect:** A live timeline of phases (request, guard decision, policy evaluation, model, output guard) with each event's score. The run ends with a verdict: blocked, escalated, or allowed, and a pass rate.
3. **Step:** Pick **Custom Input → Automated Attack (Garak)**, tick the probe families (Prompt Injection, Data Exfiltration, Tool Abuse, Encoding, Multi-turn), and click **Run**.
   **Expect:** The garak runner executes the probes against the pipeline; findings stream in and persist. Slow probe families are unticked by default.
   **If not:** "probe_error" cards mean a probe timed out; rerun with fewer families.
4. **Step:** Click a completed run.
   **Expect:** The result summary, the events, and a link to its Lineage graph.

### 6.2 Cases (`/admin/cases`)

Investigations and incident response.

1. **Step:** Click **Validate → Cases**.
   **Expect:** Case counts by status (Open, Investigating, Escalated, Awaiting Review, Resolved) and a table.
2. **Step:** Open a case.
   **Expect:** Its linked findings, sessions, timeline, notes, and the **Open Lineage graph for this session** link.
3. **Step:** Change the status or assign an owner.
   **Expect:** The table and the bell notification update.

### 6.3 Automation (`/admin/automation`)

Security playbooks and automated response.

1. **Step:** Click **Validate → Automation**.
   **Expect:** Active playbook count and a table with Playbook, Trigger, and an **Active** toggle.
2. **Step:** Switch a playbook's toggle on.
   **Expect:** The row shows Active and the Active Playbooks figure increments. Playbooks touching production-tagged assets keep a human approval step.

---

## 7. Comply: DPDPA (`/admin/dpdp`)

Digital Personal Data Protection Act, 2023. The module is advisory: it summarises evidence for the Data Protection Officer and counsel and never presents itself as a legal determination. All figures are stamped DEMO DATA until a backend is connected.

### 7.1 Command center

1. **Step:** Click **Comply → DPDPA**.
   **Expect:** The DPDPA header (`WP H`) with Data source and As of boxes, six sub-tabs, and the command center.
2. **Step:** Read the trial-balance line.
   **Expect:**
   - **Readiness score** out of 100, weighted; not-assessed controls are excluded; bands at 55 and 80.
   - **Open findings** with critical and high counts and an **Open** link.
   - **Breach clock** at `00:00:00` with "No clock running".
   - **Requests overdue** with an amber tick when any Data Principal request is past its SLA.
3. **Step:** In **Readiness by obligation (WP H-1.1)**, click an obligation name.
   **Expect:** The Controls tab opens filtered to that obligation.
4. **Step:** In **Critical gaps (WP H-1.2)**, read a failing control and click its **n findings** link.
   **Expect:** The Findings tab opens filtered to that section. The penalty tier reference is labeled "legal review"; it is never a computed liability.
5. **Step:** Read **Readiness by week (WP H-1.3)**.
   **Expect:** Eight weekly readings on a ruled chart with the 55 and 80 thresholds shaded.

### 7.2 Controls

1. **Step:** Click the **Controls** tab.
   **Expect:** The control register: Sections 4 to 18 with status tick, weight, evidence count, findings count, and owner. Filters for Obligation and Status sit in the header.
2. **Step:** Click a control row (for example S.8(5)).
   **Expect:** The row expands inline with the assessment summary, weight, evidence items, last-assessed date, the penalty tier reference with its basis, and a link to linked findings. Click again to collapse. The expanded control is kept in the URL, so the link can be shared.
3. **Step:** Filter Status to **Fail**.
   **Expect:** Only exception controls remain; the subtitle reads "n of 14 controls".

### 7.3 Findings

1. **Step:** Click the **Findings** tab.
   **Expect:** A ledger of findings on the left (reference, severity tick, title with section and owner, status stamp, due date) and the first finding's detail sheet on the right.
2. **Step:** Use the Severity, Status, and Section filters.
   **Expect:** The list narrows; the filters are in the URL. **Clear filters** appears when any filter is set.
3. **Step:** Click a finding.
   **Expect:** The detail sheet shows severity, control, owner, detected and due dates, the rule rationale, evidence lines with their working-paper references, a remediation checklist, and the penalty tier reference.
4. **Step:** Click **Acknowledge**.
   **Expect:** A green tick draws itself on the button and it reads "Acknowledged".
5. **Step:** Click **Start remediation**, then tick remediation steps as you complete them.
   **Expect:** The status stamp changes to IN PROGRESS; the counter reads "n of m done".
6. **Step:** When every step is ticked, click **Mark resolved**.
   **Expect:** The stamp reads RESOLVED and the finding leaves the Open filter. **Reopen** reverses it.
7. **Step:** To accept a risk instead, click **Accept risk** (kept apart on the right, red outline).
   **Expect:** The stamp reads RISK ACCEPTED and the remediation checklist locks.
   **Note:** These edits are kept for the current session until a backend persists them.

### 7.4 Consent & rights

1. **Step:** Click the **Consent & rights** tab.
   **Expect:** A trial-balance line: Notice coverage (S.5) as `18/21` with a warning tick, Consent records (S.6), Withdrawal median (S.6(4)) in hours, and Consent Manager registration status.
2. **Step:** Read **Data Principal requests (WP H-4.1)**.
   **Expect:** One row per right (Access S.11, Correction and Erasure S.12, Nomination S.14, Grievance S.13) with open, overdue, median days, SLA, and a tick.
3. **Step:** Read **Grievance redressal (WP H-4.2)** and **Recent requests (WP H-4.3)**.
   **Expect:** Whether the Grievance Officer is published, open cases, oldest case age, the 90-day response period, and the newest requests with status stamps.

### 7.5 Breach clock

1. **Step:** Click the **Breach clock** tab.
   **Expect:** A large `00:00:00` elapsed clock (muted), the three notification windows (Data Protection Board 72 h, CERT-In 6 h, affected Data Principals without delay) each with its legal basis, a **Standing by** stamp, and the **Declare a breach** button. On the right, the readiness checklist and the last drill.
2. **Step:** Click **Declare a breach**, type what happened, adjust **Aware at** if awareness was earlier, and click **Start clock**.
   **Expect:** The stamp turns red **ACTIVE**, the elapsed clock counts up every second, and each window shows its remaining time counting down; a window turns amber under six hours and red at zero.
3. **Step:** After notifying an authority, click **Mark notified** on its row.
   **Expect:** The row shows a green tick with the notification time.
4. **Step:** Click **Close incident**, then **Confirm close**.
   **Expect:** The clock stops and the page returns to Standing by. The clock state survives a page refresh because it is kept in the browser until a backend owns it.

### 7.6 Cross-border

1. **Step:** Click the **Cross-border** tab.
   **Expect:** Counts of transfers on register, documented, needing review, and with basis missing, then the Section 16 register: processor and service, route, purpose, data categories, contractual basis, status tick, and last review date.
2. **Step:** Find the row whose purpose and basis read **Not recorded** in red.
   **Expect:** Its status is Basis missing and a finding reference (for example DPDP-0135) links to the Findings tab.
3. **Step:** Read the footer note.
   **Expect:** A reminder that no countries are currently notified as restricted and to re-check the Central Government list at each review.

---

## 8. Platform

### 8.1 Integrations (`/admin/integrations`)

1. **Step:** Click **Platform → Integrations**.
   **Expect:** Connected count and a list of AI providers, security systems, and operational tools with status (Connected, Not Configured, Disabled, Error).
2. **Step:** Click **Add integration**, pick a type, fill in the endpoint and credentials, and save.
   **Expect:** A four-step setup with "Test connection" as step 4.
3. **Step:** Open the integration and, on the **Connection** tab, click **Test Connection**.
   **Expect:** "Testing…" then a success line; on failure, "Connection failed. Check credentials and endpoint configuration."
4. **Step:** Review the **Activity** tab.
   **Expect:** A timestamped log of connection attempts and syncs.

### 8.2 Settings (`/admin/settings`)

1. **Step:** Click **Platform → Settings**.
   **Expect:** Two tabs: **General** and **Access Control**.
2. **Step:** On General, adjust platform options and notification categories (Session, Agent, Model, Integration, Compliance, Posture, Chat, Audit) and click **Save**.
   **Expect:** The button briefly reads "Saved".
3. **Step:** On Access Control, review the role matrix (Viewer, Auditor, Security Analyst, Admin).
   **Expect:** A grid of which role may see or change each area. Only Admin can change it.

---

## 9. The chat surface (`/`)

The chat surface talks to the configured model through the guard pipeline.

1. **Step:** Open http://localhost:3001/.
   **Expect:** The ReedShield mark and wordmark, a prompt box reading "Ask anything...", and a model selector.
2. **Step:** Type a normal question and press Enter.
   **Expect:** A streamed reply. Badges under the reply show the guard decision and policy results; the explainability panel shows the Decision Trace.
3. **Step:** Type an obviously unsafe request (for example, asking the assistant to reveal its system prompt).
   **Expect:** The request is blocked or escalated with the matched rule named in the message. The event appears on the Runtime and Lineage pages.
4. **Step:** Open an agent-bound chat from Inventory (right-click → Open Chat in New Tab).
   **Expect:** The header shows the agent's name instead of "ReedShield", and messages go to that agent's runtime.

---

## 10. Common tasks, end to end

### 10.1 Triage a critical alert
1. Dashboard → **Recent alerts** → click the critical row. **Expect:** Alerts page on that finding.
2. Read the rule and evidence; click **Open Case**. **Expect:** Status Investigating, notification in the bell.
3. Cases → open the case → **Open Lineage graph for this session**. **Expect:** The path from prompt to output.
4. If an identity is involved: Identity & Trust → **Freeze**. **Expect:** Identity Frozen.
5. Back on the finding: **Mark as Resolved**. **Expect:** "Already Resolved".

### 10.2 Prove a control for an auditor
1. DPDPA → Controls → expand the control. **Expect:** Evidence count and last-assessed date.
2. Click the linked findings. **Expect:** Each finding lists its evidence with working-paper references.
3. Posture → Framework Alignment. **Expect:** The framework coverage figure that cites the same evidence.

### 10.3 Run a red-team check before a release
1. Simulation Lab → Custom Input → Automated Attack (Garak) → tick probe families → **Run**. **Expect:** A live run.
2. When it ends, note the pass rate. **Expect:** Findings persisted; the Overview "Simulation" tile shows the pass rate.
3. Fix any failing policy in Policies → **Save & Activate**; rerun. **Expect:** A higher pass rate.

### 10.4 Rehearse a breach
1. DPDPA → Breach clock → **Declare a breach** with a drill summary. **Expect:** Clock running, windows counting down.
2. Work the checklist; **Mark notified** each authority. **Expect:** Green ticks with times.
3. **Close incident → Confirm close**. **Expect:** Standing by. Record the drill date in the readiness checklist owner's notes.

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Sign-in page never loads at keycloak.local | Missing hosts entry or Keycloak not running | Add `127.0.0.1 keycloak.local` to the hosts file; `docker compose -f compose.auth.yml up -d` |
| "Invalid username or password" for a seeded account | Password changed | Reset it in Keycloak admin (admin / admin), realm `aispm` |
| Console loads but tables are empty and the bell shows 502 in the browser console | Backend containers down | `docker ps`; start `cpm-api`, `cpm-spm-api`, `cpm-agent-orchestrator` |
| 401 on every page after sign-in | Token audience mapper missing on the `aispm-ui` client | In Keycloak, add an Audience mapper for `aispm-ui` to the client scope |
| `docker compose up` errors: "traefik-forward-auth depends on undefined service keycloak" | All three compose files passed together | Run the auth stack (`compose.auth.yml`) as its own command |
| Fonts look like a plain system sans | No internet access to Google Fonts | The console falls back to Segoe UI; self-host Archivo and Fragment Mono under `ui/public/fonts` to remove the dependency |
| Sidebar vanished | It was tucked away | Press Ctrl+B or click the handle on the left edge |

---

## 12. Reference

- Local URLs: console http://localhost:3001, API http://localhost:8080, SPM API http://localhost:8092, Keycloak http://keycloak.local:8180.
- Thresholds: allow below 0.30, escalate 0.30–0.70, block at 0.70 and above; intent-drift 0.65; rate limit 60 requests per minute; guard-model timeout 60 s.
- DPDPA notification windows tracked by the breach clock: Data Protection Board 72 hours, CERT-In 6 hours, Data Principals without delay.
- Design system: `ui/DESIGN.md`. Product context: `ui/PRODUCT.md`.
