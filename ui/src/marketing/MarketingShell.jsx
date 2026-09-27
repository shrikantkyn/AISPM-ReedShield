// Shared header + footer for the public marketing surface.
// Light premium enterprise theme; distinct from the dense console shell but
// sharing the brand, type, and color system.
import { Link } from 'react-router-dom'
import { ReedShieldMark } from '../components/brand/ReedShieldMark.jsx'

const NAV = [
  { label: 'Platform', to: '/platform' },
  { label: 'AI Security', to: '/ai-security' },
  { label: 'Compliance', to: '/compliance' },
  { label: 'Resources', to: '/resources' },
  { label: 'Pricing', to: '/pricing' },
]

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF9]/85 backdrop-blur border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center gap-8">
        <Link to="/home" className="flex items-center gap-2.5 shrink-0" aria-label="ReedShield home">
          <ReedShieldMark size={30} />
          <span className="text-[18px] font-bold tracking-[-0.02em] text-gray-900">ReedShield</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-[14px] font-medium text-gray-600" aria-label="Main navigation">
          {NAV.map(n => (
            <Link key={n.to} to={n.to} className="hover:text-gray-900 transition-colors">{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/login" className="hidden sm:inline text-[14px] font-medium text-gray-700 hover:text-gray-900">Sign in</Link>
          <Link
            to="/get-started"
            className="h-9 px-4 inline-flex items-center rounded-lg bg-accent-600 text-white text-[13.5px] font-semibold hover:bg-accent-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}

const FOOTER = [
  { title: 'Platform', links: [['AI Asset Discovery', '/platform'], ['Model Security', '/ai-security'], ['Runtime Security', '/platform'], ['Attack Paths', '/platform']] },
  { title: 'Solutions', links: [['AI Security', '/ai-security'], ['Compliance', '/compliance'], ['Enterprise', '/platform']] },
  { title: 'Resources', links: [['Documentation', '/resources'], ['Blog', '/resources'], ['Trust Center', '/security']] },
  { title: 'Company', links: [['About', '/home'], ['Contact', '/get-started']] },
  { title: 'Legal', links: [['Privacy', '/privacy'], ['Terms', '/terms'], ['Security', '/security']] },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-6 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <ReedShieldMark size={26} />
            <span className="text-[16px] font-bold tracking-[-0.02em] text-gray-900">ReedShield</span>
          </div>
          <p className="mt-3 text-[13px] text-gray-500 leading-relaxed">AI Security Posture Management for the enterprise AI estate.</p>
        </div>
        {FOOTER.map(col => (
          <div key={col.title}>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-gray-400">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map(([label, to]) => (
                <li key={label}><Link to={to} className="text-[13.5px] text-gray-600 hover:text-gray-900 transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12.5px] text-gray-400">
          <p>© {new Date().getFullYear()} ReedShield. All rights reserved.</p>
          <p>AI Security Posture Management</p>
        </div>
      </div>
    </footer>
  )
}
