// src/config/navigation.js
import {
  Home, LayoutDashboard, Shield, TriangleAlert,
  Boxes, Database, Fingerprint,
  Activity, ScrollText, GitBranch,
  FlaskConical, ClipboardList, Workflow,
  Scale, Plug, Settings, ScanEye, KeyRound, FileCode2, ShieldCheck, LineChart,
} from 'lucide-react'

/** Overview is pinned above all sections. */
export const PINNED = { label: 'Overview', to: '/admin/overview', icon: Home, end: true }

/**
 * Sectioned navigation. Each section is an index tab in the binder and
 * carries its own tab color (see tailwind `tab.*` and `--tab-*` tokens).
 */
export const NAV = [
  {
    section: 'Monitor',
    key: 'monitor',
    items: [
      { label: 'Dashboard',        to: '/admin/dashboard',    icon: LayoutDashboard },
      { label: 'Posture',          to: '/admin/posture',      icon: Shield          },
      { label: 'Alerts',           to: '/admin/alerts',       icon: TriangleAlert   },
      { label: 'Observability',    to: '/admin/observability', icon: LineChart       },
    ],
  },
  {
    section: 'Discover',
    key: 'discover',
    items: [
      { label: 'Inventory',        to: '/admin/inventory',    icon: Boxes      },
      { label: 'Shadow AI',        to: '/admin/shadow-ai',    icon: ScanEye    },
      { label: 'Identity & Trust', to: '/admin/identity',     icon: Fingerprint },
      { label: 'Machine Identities', to: '/admin/machine-identities', icon: KeyRound },
      { label: 'Data & Knowledge', to: '/admin/data',         icon: Database   },
    ],
  },
  {
    section: 'Protect',
    key: 'protect',
    items: [
      { label: 'Runtime',          to: '/admin/runtime',      icon: Activity   },
      { label: 'Policies',         to: '/admin/policies',     icon: ScrollText },
      { label: 'Lineage',          to: '/admin/lineage',      icon: GitBranch  },
    ],
  },
  {
    section: 'Validate',
    key: 'validate',
    items: [
      { label: 'Simulation',       to: '/admin/simulation',   icon: FlaskConical },
      { label: 'Code Guardrails',  to: '/admin/code-guardrails', icon: FileCode2 },
      { label: 'Cases',            to: '/admin/cases',        icon: ClipboardList },
      { label: 'Automation',       to: '/admin/automation',   icon: Workflow     },
    ],
  },
  {
    section: 'Comply',
    key: 'comply',
    items: [
      { label: 'Frameworks',       to: '/admin/frameworks',   icon: ShieldCheck },
      { label: 'DPDPA',            to: '/admin/dpdp',         icon: Scale },
    ],
  },
  {
    section: 'Platform',
    key: 'platform',
    items: [
      { label: 'Integrations',     to: '/admin/integrations', icon: Plug     },
      { label: 'Settings',         to: '/admin/settings',     icon: Settings },
    ],
  },
]

/** Tab color per section key (CSS custom property names). */
export const TAB_COLOR = {
  monitor:  'var(--tab-monitor)',
  discover: 'var(--tab-discover)',
  protect:  'var(--tab-protect)',
  validate: 'var(--tab-validate)',
  comply:   'var(--tab-comply)',
  platform: 'var(--tab-platform)',
}

/** Resolve which section a pathname belongs to. */
export function sectionForPath(pathname) {
  for (const s of NAV) {
    if (s.items.some(it => pathname === it.to || pathname.startsWith(`${it.to}/`))) return s.key
  }
  return null
}

/**
 * ROUTE_META — maps route segment → display label.
 * Used by Breadcrumbs to resolve human-readable names.
 * Param segments (e.g. :alertId) are resolved dynamically.
 */
export const ROUTE_META = {
  admin:        'ReedShield',
  overview:     'Overview',
  dashboard:    'Dashboard',
  posture:      'Posture',
  alerts:       'Alerts',
  observability: 'Observability & Usage',
  inventory:    'Inventory',
  identity:     'Identity & Trust',
  data:         'Data & Knowledge',
  runtime:      'Runtime',
  policies:     'Policies',
  lineage:      'Lineage',
  simulation:   'Simulation Lab',
  cases:        'Cases',
  automation:   'Automation',
  dpdp:         'DPDPA',
  frameworks:   'Frameworks',
  'shadow-ai':  'Shadow AI',
  'machine-identities': 'Machine Identities',
  'code-guardrails':    'Code Guardrails',
  controls:     'Controls',
  findings:     'Findings',
  rights:       'Consent & Rights',
  breach:       'Breach Clock',
  transfers:    'Cross-border',
  integrations: 'Integrations',
  settings:     'Settings',
}
