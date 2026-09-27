import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Boxes, ShieldCheck, Bot, Plug, KeyRound, Cloud, Database, Fingerprint,
  Activity, Scale, FileCheck, GitBranch, ArrowRight,
} from 'lucide-react'
import { MarketingHeader, MarketingFooter } from './MarketingShell.jsx'
import { DashboardPreview } from './DashboardPreview.jsx'

function useSeo(title, description) {
  useEffect(() => {
    document.title = title
    const set = (name, content, attr = 'name') => {
      let el = document.head.querySelector(`meta[${attr}="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    set('description', description)
    set('og:title', title, 'property'); set('og:description', description, 'property'); set('og:type', 'website', 'property')
    set('twitter:card', 'summary_large_image')
  }, [title, description])
}

const CAPABILITIES = [
  { icon: Boxes, title: 'AI Asset Discovery', body: 'Find every model, agent, LLM app, tool, API and data source across your environments, so nothing runs unseen.' },
  { icon: ShieldCheck, title: 'AI Model Security', body: 'Scan model artefacts and dependencies before deployment; block models that fail your security checks.' },
  { icon: Bot, title: 'Agent Security', body: 'Govern autonomous agents: scoped tools, credential hygiene, and runtime decisions you can trace.' },
  { icon: Plug, title: 'API Security', body: 'Inventory the APIs your AI reaches and enforce authorization and rate limits on every call.' },
  { icon: KeyRound, title: 'Secrets & Identities', body: 'Discover non-human identities, establish ownership, and rotate or revoke credentials continuously.' },
  { icon: Cloud, title: 'Cloud Security', body: 'Correlate AI risk with the cloud posture around it, from misconfiguration to exposed storage.' },
  { icon: Database, title: 'Data Security', body: 'Classify context sources, detect sensitive data, and stop leakage in AI inputs and outputs.' },
  { icon: Activity, title: 'Runtime Security', body: 'Watch prompts, responses, tool calls and policy decisions in real time; block live threats.' },
  { icon: Scale, title: 'AI Governance', body: 'Turn controls into evidence across NIST AI RMF, ISO 42001, DPDP and more, continuously scored.' },
  { icon: GitBranch, title: 'Attack Paths', body: 'See how a hard-coded secret becomes an over-privileged role becomes exposed customer data.' },
]

const STORY = [
  ['Assets appear', 'Every AI agent, model, API, data source and identity is discovered and inventoried.'],
  ['Risk becomes visible', 'Relationships and exposure are mapped so risk is a graph, not a list.'],
  ['Attack paths are identified', 'The chains an attacker could follow are surfaced before they are used.'],
  ['Findings are prioritized', 'Critical exposure on sensitive data rises to the top of the queue.'],
  ['Policies are evaluated', 'Every request is checked against policy at runtime, not after the fact.'],
  ['Remediation is recommended', 'Each finding carries the evidence and the fix, ready to action.'],
]

const RISK = [
  ['Critical', 'text-status-critical', 'bg-status-critical'],
  ['High', 'text-status-high', 'bg-status-high'],
  ['Medium', 'text-status-medium', 'bg-status-medium'],
  ['Low', 'text-status-low', 'bg-status-low'],
]

const FRAMEWORKS = ['DPDP Act 2023', 'NIST AI RMF', 'ISO/IEC 42001', 'ISO/IEC 27001', 'OWASP LLM Top 10', 'HIPAA', 'RBI', 'IRDAI', 'SEBI CSCRF', 'CERT-In', 'EU AI Act']

const ENTERPRISE = ['RBAC', 'SSO / OIDC', 'Audit logs', 'Multi-tenant isolation', 'API security', 'Secrets protection', 'Cloud integrations', 'Security policies', 'Reporting']

export default function MarketingHome() {
  useSeo('ReedShield — AI Security Posture Management', 'Discover AI agents, models, APIs, data sources, identities and cloud infrastructure. Continuously understand risk, enforce policy and prioritize what needs attention.')

  return (
    <div className="bg-[#FAFAF9] text-gray-900">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)' }} aria-hidden="true" />
        <div className="max-w-[1200px] mx-auto px-6 pt-20 pb-16 relative">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-700">AI Security Posture Management</p>
          <h1 className="mt-4 text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.03em] max-w-[18ch]">
            See every AI asset. Secure every AI decision.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-gray-600 max-w-[62ch]">
            Discover AI agents, models, APIs, data sources, identities and cloud infrastructure. Continuously
            understand risk, enforce policy, and prioritize what actually needs attention.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/get-started" className="h-12 px-6 inline-flex items-center gap-2 rounded-lg bg-accent-600 text-white text-[15px] font-semibold hover:bg-accent-700 transition-colors">
              Get Started <ArrowRight size={16} />
            </Link>
            <Link to="/get-started" className="h-12 px-6 inline-flex items-center rounded-lg border border-gray-300 bg-white text-gray-800 text-[15px] font-semibold hover:bg-gray-50 transition-colors">
              Book a Demo
            </Link>
          </div>
          <div className="mt-14"><DashboardPreview /></div>
        </div>
      </section>

      {/* Trust / coverage */}
      <section className="border-y border-gray-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-gray-400">One posture across your AI estate</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[15px] font-medium text-gray-500">
            {['AI Security', 'Cloud Security', 'Data Security', 'Identity', 'Governance', 'Compliance'].map(t => (
              <span key={t} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent-500" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Core platform */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold tracking-[-0.02em] max-w-[20ch]">One security posture for your entire AI estate.</h2>
        <p className="mt-4 text-[16px] text-gray-600 max-w-[60ch]">Every capability contributes to one inventory, one risk graph and one evidence trail, so your team works from a single source of truth.</p>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAPABILITIES.map(c => (
            <div key={c.title} className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center"><c.icon size={20} className="text-accent-700" /></div>
              <h3 className="mt-4 text-[16px] font-semibold text-gray-900">{c.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product story */}
      <section className="border-y border-gray-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold tracking-[-0.02em] max-w-[22ch]">From discovery to continuous assurance.</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {STORY.map(([t, b], i) => (
              <div key={t} className="relative pl-12">
                <span className="absolute left-0 top-0 w-8 h-8 rounded-lg bg-accent-600 text-white text-[14px] font-semibold flex items-center justify-center">{i + 1}</span>
                <h3 className="text-[16px] font-semibold text-gray-900">{t}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold tracking-[-0.02em]">Find the risks that actually matter.</h2>
            <p className="mt-4 text-[16px] text-gray-600 max-w-[54ch]">ReedShield prioritizes by asset, identity, exposure, data sensitivity, vulnerability, configuration, runtime behavior and business context, so the top of the queue is the thing to fix first.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['Asset', 'Identity', 'Exposure', 'Data sensitivity', 'Vulnerability', 'Configuration', 'Runtime', 'Business context'].map(t => (
                <span key={t} className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[13px] text-gray-600">{t}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {RISK.map(([label, text, dot], i) => (
              <div key={label} className={`flex items-center gap-4 py-3.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                <span className={`text-[14px] font-semibold ${text} w-20`}>{label}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${dot}`} style={{ width: `${[92, 70, 45, 22][i]}%` }} />
                </div>
                <span className="text-[13px] tabular-nums text-gray-400 w-8 text-right">{[6, 14, 27, 41][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="border-y border-gray-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold tracking-[-0.02em] max-w-[22ch]">Turn AI security into measurable compliance.</h2>
          <p className="mt-4 text-[16px] text-gray-600 max-w-[60ch]">ReedShield maps its controls to the frameworks your auditors ask about and scores each one from live evidence. Control mapping is not certification, and ReedShield tells you which is which.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            {FRAMEWORKS.map(f => (
              <span key={f} className="px-4 py-2 rounded-lg border border-gray-200 bg-[#FAFAF9] text-[14px] font-medium text-gray-700 flex items-center gap-2">
                <FileCheck size={15} className="text-accent-600" />{f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold tracking-[-0.02em]">Built for security teams. Ready for enterprise AI.</h2>
            <p className="mt-4 text-[16px] text-gray-600 max-w-[54ch]">Role-based access, single sign-on, audit logging and tenant isolation are part of the platform, not an add-on.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ENTERPRISE.map(e => (
              <div key={e} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-[13.5px] font-medium text-gray-700">
                <Fingerprint size={15} className="text-accent-600 shrink-0" />{e}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-200 bg-gradient-to-b from-white to-[#F5F3FF]">
        <div className="max-w-[1200px] mx-auto px-6 py-24 text-center">
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.02em] max-w-[20ch] mx-auto">Your AI estate is growing. Your security posture should keep up.</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/get-started" className="h-12 px-7 inline-flex items-center gap-2 rounded-lg bg-accent-600 text-white text-[15px] font-semibold hover:bg-accent-700 transition-colors">
              Get Started <ArrowRight size={16} />
            </Link>
            <Link to="/get-started" className="h-12 px-7 inline-flex items-center rounded-lg border border-gray-300 bg-white text-gray-800 text-[15px] font-semibold hover:bg-gray-50 transition-colors">
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
