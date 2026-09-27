---
version: 1
slug: "src-admin-pages-dashboard-jsx"
primary_target: "src/admin/pages/Dashboard.jsx"
related_targets: ["src/admin/shell/AppSidebar.jsx","src/admin/shell/Topbar.jsx","src/admin/pages/dpdp/CommandCenter.jsx"]
---

# Surface: /admin/dashboard (ReedShield console shell + Dashboard + DPDPA module)

Scope: replacement visual world for the ReedShield console. Primary target is the Dashboard; the shell (sidebar, topbar), shared primitives, and the new DPDPA module (/admin/dpdp/*) inherit it. Mode: Operate.

Audience and job: security analyst, DPO, auditor, CISO at a desk on a large display, daylit office or late-shift dim room; task is a five-second trustworthy read of organizational risk, then triage or evidence. Proof/content: blended risk, open criticals, mean time to freeze, modules enforced, the week's highest-confidence attack path, recent cross-module alerts, module health, DPDP readiness and breach clock. Constraints: originality against the incumbent ReedShield blue look, the PDF mockup, stock templates, and the user's "zero-x" reference; no hype; demonstration figures labeled synthetic.

## Direction contract

THESIS: The console is an auditor's working-papers binder: every panel is a referenced working paper on ruled ledger stock, every status is an audit tick mark with a legend, and the navigation is the binder's colored index tabs. It refuses the hero-metric row of rounded white cards on a white page with a blue accent, and refuses the dark SOC console with neon glow.

OWN-WORLD: Eye-ease ledger green paper as the page ground (#EAF0E4), lighter sheets (#F7F9F3) for panels, hairline rulings (#C5D5BC) instead of shadows, deep green-black ink (#17261B), rubber-stamp violet (#5B2E8A) as the single accent for primary action and selection, red pencil (#C8322B), amber pencil (#B8791A), green pencil (#2F7A3E) as the tick-mark vocabulary. Square corners (2px max), sheets carry a ruled header band with a working-paper reference code, tables draw vertical column rulings like a 13-column analysis pad. Type: Archivo for all UI, Fragment Mono for references, timestamps, clocks, and hashes, tabular figures everywhere. Index tabs on the sidebar edge: one saturated tab color per nav group; the active tab pulls forward as a full color block. Rubber stamps (rotated outlined boxes) mark states that are facts: ENFORCED, DEMO DATA, ROE SIGNED.

STORY: The visitor opens the binder to the summary sheet, reads the trial-balance line for the organization's posture, follows the referenced attack path across modules, checks the breach clock, and acts by acknowledging or opening the referenced working paper. They believe the numbers because every figure carries a reference and a legend, not a glow.

FIRST VIEWPORT (1440 wide): a working-paper header band with the sheet title "Dashboard", the reference "WP A-1", prepared-by (signed-in user), as-of timestamp, and the period selector. Beneath it, one full-width ruled ledger line (the trial balance) with four columns separated by hairlines: Blended risk 72/100 on a ruled 0–100 scale, Open critical alerts 14 with age of oldest, Mean time to freeze 38 s against SLA, Modules enforced 8/8 with an ENFORCED stamp. Then a two-column band: left (8/12) the Unified Risk Graph sheet showing the week's highest-confidence attack path as a referenced chain (SEC → IAM → AI → PII), right (4/12) the DPDPA sheet with the breach-notification clock in fixed-position digits and readiness ticks. Below: Recent alerts as a ruled table with tick-mark severity, and Module health as a ledger. Footer: tick-mark legend and the DEMO DATA stamp. The primary action (Open full graph) is a violet stamp-ink button in the risk-graph sheet header.

FORM: Auditor's working-papers binder (index tabs, tick marks, ledger ruling, prepared/reviewed boxes), position 7 of 7 on the grounded list, assigned by seed key f731be03 (mode operate, scope direction). Raised by the dealt hand: from dark-first developer console, hairline seams instead of shadow and destructive actions isolated by empty space; from nixie laboratory counter, fixed decimal positions and a value change rendered as a visible event on the breach clock; from terminal yellow wayfinding, one message per line and resolved items dropping off the sheet entirely; from CRT arcade pixel, strict palette law for states (a color means one thing). Build path: code-led (no image generation available in this harness).

Signature interaction: acknowledging a finding draws its tick mark with a 200 ms stroke; the sidebar index tab pulls forward on selection. Motion grammar: 150–200 ms, exponential ease-out, no page-load choreography.

Honest risk: ledger green plus tick marks can read as an accounting product if type is set timidly or the tabs are muted; keep tab colors saturated and severity ticks red-pencil bold.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved
- The user's "zero-x" reference is unnamed; distance verified against the incumbent ReedShield look and stock templates only.
- DPDP backend does not exist; module ships on a structured demo data layer in src/dpdp/.
