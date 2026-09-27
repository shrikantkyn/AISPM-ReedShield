// src/LoginPage.jsx
// Branded sign-in shell. Authentication itself stays with Keycloak via
// Authorization Code + PKCE — this screen only presents the brand and
// launches the OIDC redirect. No credentials are collected or stored here.
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { loginRedirect } from './api.js'
import { ReedShieldMark } from './components/brand/ReedShieldMark.jsx'

function AssetConstellation() {
  // A restrained abstract visualization of connected AI assets — decorative.
  const nodes = [
    { x: 60, y: 70 }, { x: 170, y: 40 }, { x: 250, y: 110 }, { x: 120, y: 150 },
    { x: 210, y: 200 }, { x: 80, y: 220 }, { x: 280, y: 60 },
  ]
  const edges = [[0, 1], [1, 2], [0, 3], [3, 4], [3, 5], [2, 6], [1, 6], [4, 2]]
  return (
    <svg viewBox="0 0 320 260" className="w-full max-w-md" role="img" aria-label="Connected AI assets" aria-hidden="true">
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="#C4B5FD" strokeWidth="1.5" opacity="0.7" />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={i % 3 === 0 ? 9 : 6} fill={i % 3 === 0 ? '#7C3AED' : '#FFFFFF'} stroke="#7C3AED" strokeWidth="2" />
        </g>
      ))}
    </svg>
  )
}

export default function LoginPage() {
  const location = useLocation()
  const returnTo = location.state?.from?.pathname || '/admin/dashboard'
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function signIn() {
    setBusy(true); setError(null)
    loginRedirect(returnTo).catch(e => { setBusy(false); setError(e.message || String(e)) })
  }

  return (
    <div className="min-h-screen flex bg-[#FAFAF9] text-gray-900">
      {/* Left — brand message + visualization */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] px-14 py-12 border-r border-gray-200 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.10), transparent 70%)' }} aria-hidden="true" />
        <div className="relative">
          <ReedShieldMark size={40} />
        </div>
        <div className="relative max-w-md">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent-700">AI Security Posture Management</p>
          <h1 className="mt-4 text-[40px] font-semibold leading-[1.1] tracking-[-0.03em] text-gray-900">
            Secure your AI estate with confidence.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
            Discover every AI agent, model, API, data source and identity. Understand risk, enforce policy, and act on what matters, from one console.
          </p>
          <div className="mt-10"><AssetConstellation /></div>
        </div>
        <p className="relative text-[12px] text-gray-400">© {new Date().getFullYear()} ReedShield · AI Security Posture Management</p>
      </div>

      {/* Right — authentication card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-2.5 lg:hidden mb-8">
            <ReedShieldMark size={32} />
            <span className="text-[18px] font-bold tracking-[-0.02em]">ReedShield</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
            <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-gray-900">Welcome back</h2>
            <p className="mt-1.5 text-[14px] text-gray-500">Sign in to your AI security console.</p>

            {error && (
              <div role="alert" className="mt-5 rounded-lg border border-[#E4A9A4] bg-[#FDECEA] px-3.5 py-2.5 text-[13px] text-[#8E1F19]">
                We couldn’t start sign-in. {error}
              </div>
            )}

            <button
              onClick={signIn}
              disabled={busy}
              className="mt-6 w-full h-11 rounded-lg bg-accent-600 text-white text-[14.5px] font-semibold hover:bg-accent-700 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2"
            >
              {busy ? 'Redirecting…' : 'Sign in'}
            </button>

            <button
              onClick={signIn}
              disabled={busy}
              className="mt-3 w-full h-11 rounded-lg border border-gray-300 bg-white text-gray-700 text-[14px] font-semibold hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
            >
              Continue with SSO
            </button>

            <p className="mt-5 text-[13px] text-gray-500 text-center">
              Sign-in is handled securely by your identity provider.
            </p>
          </div>

          <p className="mt-6 text-center text-[12px] text-gray-400">
            By continuing you agree to the <a href="/terms" className="text-gray-500 hover:text-gray-700">Terms</a> and <a href="/privacy" className="text-gray-500 hover:text-gray-700">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
