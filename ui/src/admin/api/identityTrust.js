// Identity & Trust registry API — real, DB-backed via spm-api /identity-trust.
// Token handling delegates to ui/src/api.js (Keycloak-backed getToken).
import { getToken } from '../../api.js'

const BASE = '/api/spm/identity-trust'

async function _headers(json = false) {
  const token = await getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  }
}

export async function fetchIdentities() {
  const res = await fetch(BASE, { headers: await _headers() })
  if (!res.ok) throw new Error(`Failed to load identities (${res.status})`)
  const data = await res.json()
  return Array.isArray(data.identities) ? data.identities : []
}

export async function createIdentity(body) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: await _headers(true),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Failed to add identity (${res.status})`)
  return res.json()
}

export async function patchIdentity(id, patch) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: await _headers(true),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Failed to update identity (${res.status})`)
  return res.json()
}

export async function deleteIdentity(id) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: await _headers() })
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete identity (${res.status})`)
  return true
}
