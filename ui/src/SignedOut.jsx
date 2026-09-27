// src/SignedOut.jsx
// Branded post-logout landing. Keycloak ends the session, then redirects here
// (post_logout_redirect_uri). No auth logic lives here.
import { useNavigate } from 'react-router-dom'
import { ReedShieldMark } from './components/brand/ReedShieldMark.jsx'

export default function SignedOut() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9] px-6 text-gray-900">
      <div className="w-full max-w-[440px] text-center">
        <div className="flex justify-center"><ReedShieldMark size={44} /></div>
        <h1 className="mt-6 text-[22px] font-semibold tracking-[-0.02em]">You’re securely signed out.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
          Your ReedShield session has ended. Sign in again whenever you’re ready.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-8 h-11 px-6 rounded-lg bg-accent-600 text-white text-[14.5px] font-semibold hover:bg-accent-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2"
        >
          Return to ReedShield
        </button>
        <p className="mt-10 text-[12px] text-gray-400">© {new Date().getFullYear()} ReedShield · AI Security Posture Management</p>
      </div>
    </div>
  )
}
