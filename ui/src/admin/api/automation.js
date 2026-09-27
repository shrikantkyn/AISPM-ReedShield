// Automation playbooks API — real, DB-backed via spm-api /automation.
import { getToken } from '../../api.js'

const BASE = '/api/spm/automation'

async function _headers(json = false) {
  const token = await getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  }
}

export async function fetchPlaybooks() {
  const res = await fetch(`${BASE}/playbooks`, { headers: await _headers() })
  if (!res.ok) throw new Error(`Failed to load playbooks (${res.status})`)
  const data = await res.json()
  return Array.isArray(data.playbooks) ? data.playbooks : []
}

export async function fetchRuns(limit = 20) {
  const res = await fetch(`${BASE}/runs?limit=${limit}`, { headers: await _headers() })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.runs) ? data.runs : []
}

export async function createPlaybook(body) {
  const res = await fetch(`${BASE}/playbooks`, {
    method: 'POST', headers: await _headers(true), body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Failed to create playbook (${res.status})`)
  return res.json()
}

export async function patchPlaybook(id, patch) {
  const res = await fetch(`${BASE}/playbooks/${id}`, {
    method: 'PATCH', headers: await _headers(true), body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Failed to update playbook (${res.status})`)
  return res.json()
}

export async function runPlaybook(id) {
  const res = await fetch(`${BASE}/playbooks/${id}/run`, { method: 'POST', headers: await _headers() })
  if (!res.ok) throw new Error(`Failed to run playbook (${res.status})`)
  return res.json()
}

export async function duplicatePlaybook(id) {
  const res = await fetch(`${BASE}/playbooks/${id}/duplicate`, { method: 'POST', headers: await _headers() })
  if (!res.ok) throw new Error(`Failed to duplicate playbook (${res.status})`)
  return res.json()
}

export async function deletePlaybook(id) {
  const res = await fetch(`${BASE}/playbooks/${id}`, { method: 'DELETE', headers: await _headers() })
  if (!res.ok) throw new Error(`Failed to delete playbook (${res.status})`)
  return res.json()
}
