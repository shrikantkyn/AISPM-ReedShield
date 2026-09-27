// src/index.jsx
import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom'
const App = lazy(() => import('./App.jsx'))
import LoginPage           from './LoginPage.jsx'
import AuthCallback        from './AuthCallback.jsx'
import SignedOut           from './SignedOut.jsx'
import RequireAuth         from './RequireAuth.jsx'
import { AppShell as DashboardLayout } from './admin/shell/AppShell.jsx'
import { SimulationContext } from './context/SimulationContext.jsx'
import { useSimulationState } from './hooks/useSimulationState.js'
const Overview = lazy(() => import('./admin/pages/Overview.jsx'))
const Dashboard = lazy(() => import('./admin/pages/Dashboard.jsx'))
const Posture = lazy(() => import('./admin/pages/Posture.jsx'))
const Alerts = lazy(() => import('./admin/pages/Alerts.jsx'))
const Observability = lazy(() => import('./admin/pages/Observability.jsx'))
const Inventory = lazy(() => import('./admin/pages/Inventory.jsx'))
const Runtime = lazy(() => import('./admin/pages/Runtime.jsx'))
const Policies = lazy(() => import('./admin/pages/Policies.jsx'))
const Lineage = lazy(() => import('./admin/pages/Lineage.jsx'))
const Simulation = lazy(() => import('./admin/pages/Simulation.jsx'))
const Cases = lazy(() => import('./admin/pages/Cases.jsx'))
const Automation = lazy(() => import('./admin/pages/Automation.jsx'))
const Integrations = lazy(() => import('./admin/pages/Integrations.jsx'))
const Identity = lazy(() => import('./admin/pages/Identity.jsx'))
const Data = lazy(() => import('./admin/pages/Data.jsx'))
const Placeholder = lazy(() => import('./admin/pages/Placeholder.jsx'))
const Settings = lazy(() => import('./admin/pages/Settings.jsx'))
const DpdpLayout = lazy(() => import('./admin/pages/dpdp/DpdpLayout.jsx'))
const DpdpCommandCenter = lazy(() => import('./admin/pages/dpdp/CommandCenter.jsx'))
const DpdpControls = lazy(() => import('./admin/pages/dpdp/Controls.jsx'))
const DpdpFindings = lazy(() => import('./admin/pages/dpdp/Findings.jsx'))
const DpdpRights = lazy(() => import('./admin/pages/dpdp/Rights.jsx'))
const DpdpBreach = lazy(() => import('./admin/pages/dpdp/BreachClock.jsx'))
const DpdpTransfers = lazy(() => import('./admin/pages/dpdp/Transfers.jsx'))
const Frameworks   = lazy(() => import('./admin/pages/Frameworks.jsx'))
const ShadowAi     = lazy(() => import('./admin/pages/ShadowAi.jsx'))
const MachineIdentities = lazy(() => import('./admin/pages/MachineIdentities.jsx'))
const CodeGuardrails = lazy(() => import('./admin/pages/CodeGuardrails.jsx'))
const MarketingHome = lazy(() => import('./marketing/MarketingHome.jsx'))
const GetStarted    = lazy(() => import('./marketing/GetStarted.jsx'))
import { RouteSkeleton } from './components/layout/RouteSkeleton.jsx'
import './index.css'

/**
 * SimulationRoot
 * ──────────────
 * Owns the single `useSimulationState()` instance and exposes it via
 * SimulationContext to every route — both the chat (/) and the admin
 * dashboard (/admin/*).  This MUST wrap both route trees so that events
 * produced on one page (e.g. a chat session at /) are visible on another
 * (e.g. the Lineage graph at /admin/lineage) without a full reload.
 *
 * Calling useSimulationState() anywhere else creates a second, isolated
 * instance and breaks cross-route event sharing.
 */
/**
 * AgentChatRoute
 * ──────────────
 * Wrapper around the existing landing-chat ``<App />`` that pulls the
 * agent ID + display name out of the URL and forwards them as the
 * ``agentBinding`` prop.  This is the route that the right-click
 * context menu in Inventory opens in a new tab — gives the operator a
 * dedicated full-window chat surface for one specific custom agent
 * without disturbing whatever they were doing in the original tab.
 *
 * Why URL-based and not a fetch: the agent name is a cosmetic label
 * (the heavy lifting — auth, agent existence, runtime_state — happens
 * server-side in /api/spm/agents/{id}/chat).  Putting the name in the
 * query string avoids a second round-trip on tab open and keeps the
 * route bookmarkable / copy-pasteable.
 */
function AgentChatRoute() {
  const { agentId } = useParams()
  const [search]    = useSearchParams()
  const name        = search.get('name') || agentId
  return <App agentBinding={{ id: agentId, name }} />
}


function SimulationRoot({ children }) {
  const {
    simState,
    startSimulation,
    resetSimulation,
    subscribeToSession,
    unsubscribeFromSession,
    loadSessionEvents,
  } = useSimulationState()

  return (
    <SimulationContext.Provider
      value={{
        simEvents: simState.simEvents,
        simState,
        startSimulation,
        resetSimulation,
        subscribeToSession,
        unsubscribeFromSession,
        loadSessionEvents,
      }}
    >
      {children}
    </SimulationContext.Provider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SimulationRoot>
      <Suspense fallback={<RouteSkeleton />}>
      <Routes>
          {/* Public — login page (redirects to Keycloak hosted login) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Public — OAuth Authorization Code callback from Keycloak.
              Exchanges ?code=... for tokens, then navigates to returnTo. */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/signed-out" element={<SignedOut />} />

          {/* Public marketing site (additive; the authed chat stays at "/") */}
          <Route path="/home" element={<MarketingHome />} />
          <Route path="/platform" element={<MarketingHome />} />
          <Route path="/ai-security" element={<MarketingHome />} />
          <Route path="/compliance" element={<MarketingHome />} />
          <Route path="/resources" element={<MarketingHome />} />
          <Route path="/pricing" element={<MarketingHome />} />
          <Route path="/security" element={<MarketingHome />} />
          <Route path="/get-started" element={<GetStarted />} />

          {/* Root redirects to admin dashboard */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Chat UI — bound to a specific custom agent (auth-gated) */}
          <Route path="/agent/:agentId/chat" element={<RequireAuth><AgentChatRoute /></RequireAuth>} />

          {/* Admin UI (auth-gated) */}
          <Route path="/admin" element={<RequireAuth><DashboardLayout /></RequireAuth>}>

            <Route index element={<Dashboard />} />

            {/* ── Command center ── */}
            <Route path="overview"     element={<Overview />} />

            {/* ── Monitor ── */}
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="posture"      element={<Posture />} />
            <Route path="alerts"       element={<Alerts />} />
            <Route path="alerts/:alertId" element={<Alerts />} />
            <Route path="observability" element={<Observability />} />

            {/* ── Discover ── */}
            <Route path="inventory"    element={<Inventory />} />
            <Route path="shadow-ai"    element={<ShadowAi />} />
            <Route path="machine-identities" element={<MachineIdentities />} />
            <Route path="inventory/:assetId" element={<Inventory />} />
            <Route path="identity"     element={<Identity />} />
            <Route path="data"         element={<Data />} />

            {/* ── Protect ── */}
            <Route path="runtime"      element={<Runtime />} />
            <Route path="runtime/:sessionId" element={<Runtime />} />
            <Route path="policies"     element={<Policies />} />
            <Route path="policies/:policyId" element={<Policies />} />
            <Route path="lineage"      element={<Lineage />} />
            <Route path="lineage/:sessionId" element={<Lineage />} />

            {/* ── Validate ── */}
            <Route path="simulation"   element={<Simulation />} />
            <Route path="code-guardrails" element={<CodeGuardrails />} />
            <Route path="cases"        element={<Cases />} />
            <Route path="cases/:caseId" element={<Cases />} />
            <Route path="automation"   element={<Automation />} />

            {/* ── Comply ── */}
            <Route path="frameworks"   element={<Frameworks />} />
            <Route path="dpdp" element={<DpdpLayout />}>
              <Route index element={<DpdpCommandCenter />} />
              <Route path="controls"  element={<DpdpControls />} />
              <Route path="findings"  element={<DpdpFindings />} />
              <Route path="findings/:findingId" element={<DpdpFindings />} />
              <Route path="rights"    element={<DpdpRights />} />
              <Route path="breach"    element={<DpdpBreach />} />
              <Route path="transfers" element={<DpdpTransfers />} />
            </Route>

            {/* ── Platform ── */}
            <Route path="integrations" element={<Integrations />} />
            <Route path="settings"     element={<Settings />} />
          </Route>

          {/* Any unknown path → Overview */}
          <Route path="*" element={<Navigate to="/admin/overview" replace />} />
        </Routes>
      </Suspense>
      </SimulationRoot>
    </BrowserRouter>
  </React.StrictMode>
)

