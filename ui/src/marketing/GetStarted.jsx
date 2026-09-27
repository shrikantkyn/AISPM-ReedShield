// src/marketing/GetStarted.jsx
// Public onboarding surface at /get-started. It explains the first-run journey
// (connect cloud, AI providers and code), then hands authentication entirely to
// Keycloak via loginRedirect(). No credentials, secrets or auth logic live here.
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cloud, Bot, GitBranch, ShieldCheck, ArrowRight, Check } from 'lucide-react'
import { ReedShieldMark } from '../components/brand/ReedShieldMark.jsx'
import { loginRedirect } from '../api.js'

const CONNECTORS = [
  {
    icon: Cloud, title: 'Connect your cloud',
    body: 'Grant read-only access to AWS, Azure, GCP or OCI so ReedShield can discover the infrastructure your AI runs on.',
    tags: ['AWS', 'Azure', 'GCP', 'OCI'],
  },
  {
    icon: Bot, title: 'Connect your AI providers',
    body: 'Link the model and agent platforms you use so every LLM app, agent and endpoint is inventoried.',
    tags: ['OpenAI', 'Anthropic', 'Azure OpenAI', 'Self-hosted'],
  },
  {
    icon: GitBranch, title: 'Connect your code',
    body: 'Add GitHub so ReedShield can scan repositories for exposed secrets, unsafe AI usage and supply-chain risk.',
    tags: ['GitHub'],
  },
]

const STEPS = ['Create your account', 'Connect a source', 'See your AI estate', 'Act on top risks']

export default function GetStarted() {
  useEffect(() => {
    document.title = 'Get Started — ReedShield'
    let el = document.head.querySelector('meta[name="description"]')
    if (!el) { el = document.createElement('meta'); el.setAttribute('name', 'description'); document.head.appendChild(el) }
    el.setAttribute('content', 'Start with ReedShield: connect your cloud, AI providers and code to discover and secure your AI estate.')
  }, [])

  const handleCreate = () => loginRedirect('/admin/overview')
  const handleSignIn = () => loginRedirect('/admin/overview')

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_0.9fr] bg-[#FAFAF9] text-gray-900">
      {/* Left — the journey */}
      <div className="px-6 sm:px-10 lg:px-16 py-10 lg:py-14">
        <Link to="/home" className="inline-flex items-center gap-2.5" aria-label="ReedShield home">
          <ReedShieldMark size={30} />
          <span className="text-[18px] font-bold tracking-[-0.02em]">ReedShield</span>
        </Link>

        <div className="mt-12 max-w-[560px]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-700">Get started</p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
            Bring your AI estate into view.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-gray-600">
            Connect a source and ReedShield starts discovering assets, mapping risk and prioritizing what needs
            attention. You can start with one connector and add the rest later.
          </p>

          <ol className="mt-8 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-accent-600 text-white text-[12px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-[15px] text-gray-700">{s}</span>
              </li>
            ))}
          </ol>

          <div className="mt-10 space-y-4">
            {CONNECTORS.map(c => (
              <div key={c.title} className="rounded-xl border border-gray-200 bg-white p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center shrink-0"><c.icon size={20} className="text-accent-700" /></div>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-gray-900">{c.title}</h2>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-gray-600">{c.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.tags.map(t => (
                      <span key={t} className="px-2.5 py-1 rounded-md border border-gray-200 bg-[#FAFAF9] text-[12px] text-gray-600">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — account panel */}
      <div className="relative flex items-center justify-center px-6 sm:px-10 py-10 lg:py-14 bg-white border-t lg:border-t-0 lg:border-l border-gray-200">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 80% at 100% 0%, rgba(124,58,237,0.06), transparent 60%)' }} aria-hidden="true" />
        <div className="relative w-full max-w-[400px]">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-7">
            <div className="w-11 h-11 rounded-xl bg-accent-50 flex items-center justify-center"><ShieldCheck size={22} className="text-accent-700" /></div>
            <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">Create your account</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-gray-600">
              Accounts, sign-in and single sign-on are handled by our secure identity provider. You will be taken there to continue.
            </p>

            <button
              onClick={handleCreate}
              className="mt-6 w-full h-11 rounded-lg bg-accent-600 text-white text-[14.5px] font-semibold hover:bg-accent-700 transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2"
            >
              Create account <ArrowRight size={16} />
            </button>
            <button
              onClick={handleSignIn}
              className="mt-3 w-full h-11 rounded-lg border border-gray-300 bg-white text-gray-800 text-[14.5px] font-semibold hover:bg-gray-50 transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2"
            >
              Sign in
            </button>

            <ul className="mt-6 space-y-2">
              {['No credit card required', 'Read-only connectors', 'SSO / OIDC supported'].map(t => (
                <li key={t} className="flex items-center gap-2 text-[13px] text-gray-600">
                  <Check size={15} className="text-status-low shrink-0" />{t}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-center text-[12.5px] text-gray-400">
            By continuing you agree to our <Link to="/terms" className="text-gray-600 hover:text-gray-900 underline underline-offset-2">Terms</Link> and{' '}
            <Link to="/privacy" className="text-gray-600 hover:text-gray-900 underline underline-offset-2">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
