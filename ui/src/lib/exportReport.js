// Generic report export used by every page's Export button.
// One place decides the report envelope and file formats so exports look the
// same product-wide. Works in the browser only (uses Blob + anchor download).
//
// Usage:
//   exportReport({ page: 'Identity & Trust', rows, columns, format: 'csv' })
//   exportReport({ page: 'Posture', rows, meta: { asOf }, format: 'json' })

/** Turn an array of objects into a stable column list when none is given. */
function inferColumns(rows) {
  const keys = []
  for (const r of rows) {
    if (r && typeof r === 'object') {
      for (const k of Object.keys(r)) {
        if (!keys.includes(k) && !k.startsWith('_') && k !== '$$typeof') {
          keys.push(k)
        }
      }
    }
  }
  return keys.map(k => ({ key: k, label: k }))
}

function cleanCellValue(value) {
  if (value == null) return ''
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (typeof value === 'function') return ''
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) return value.message
  if (typeof value === 'object') {
    // Check if React element
    if (value.$$typeof || value._owner) {
      const ch = value.props?.children
      if (typeof ch === 'string' || typeof ch === 'number') return String(ch)
      return ''
    }
    // Check if Array
    if (Array.isArray(value)) {
      return value
        .map(v => (typeof v === 'object' ? cleanCellValue(v) : String(v ?? '')))
        .filter(Boolean)
        .join('; ')
    }
    try {
      return JSON.stringify(value)
    } catch {
      return Object.prototype.toString.call(value)
    }
  }
  return String(value)
}

function toCSV(rows, columns) {
  const esc = val => {
    const v = cleanCellValue(val)
    return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  }
  const header = columns.map(c => esc(c.label ?? c.key)).join(',')
  const body = rows.map(r => columns.map(c => {
    try {
      const raw = typeof c.value === 'function' ? c.value(r) : r?.[c.key]
      return esc(raw)
    } catch {
      return ''
    }
  }).join(',')).join('\r\n')
  return `${header}\r\n${body}`
}

/**
 * Universal file download helper. Safe across Chromium, Firefox, and Safari.
 * Appends anchor to body, dispatches click, and retains DOM & blob URL
 * until the browser's download manager has started reading the stream.
 */
export function downloadFile(filename, text, mime = 'text/plain;charset=utf-8') {
  try {
    const hasCsv = mime.includes('csv')
    const content = hasCsv && !text.startsWith('\uFEFF') ? '\uFEFF' + text : text
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      try {
        if (a.parentNode) a.parentNode.removeChild(a)
        URL.revokeObjectURL(url)
      } catch {}
    }, 2000)
    return true
  } catch (err) {
    console.warn('[exportReport] Blob download failed, falling back to data URI:', err)
    try {
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = `data:${mime},${encodeURIComponent(text)}`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        try { if (a.parentNode) a.parentNode.removeChild(a) } catch {}
      }, 2000)
      return true
    } catch (e) {
      console.error('[exportReport] download error:', e)
      return false
    }
  }
}

function slug(s) {
  return String(s || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * Export a report. Returns true on success.
 * @param {object}   opts
 * @param {string}   opts.page      Human page/report name (e.g. 'Identity & Trust').
 * @param {object[]} opts.rows      The records to export.
 * @param {Array}    [opts.columns] [{ key, label?, value?(row) }]. Inferred if omitted.
 * @param {object}   [opts.meta]    Extra fields recorded in the JSON envelope.
 * @param {'csv'|'json'} [opts.format='csv']
 */
export function exportReport({ page = 'Report', rows = [], columns, meta = {}, format = 'csv' } = {}) {
  try {
    const safeRows = Array.isArray(rows) ? rows : []
    let cols = columns && columns.length ? columns : inferColumns(safeRows)
    if (!cols || cols.length === 0) {
      cols = [{ key: 'status', label: 'Status' }]
    }
    const date = new Date().toISOString().slice(0, 10)
    const base = `reedshield-${slug(page)}-${date}`

    if (format === 'json') {
      const envelope = {
        product: 'ReedShield',
        report: page,
        generatedAt: new Date().toISOString(),
        count: safeRows.length,
        ...meta,
        columns: cols.map(c => c.label ?? c.key),
        rows: safeRows,
      }
      return downloadFile(`${base}.json`, JSON.stringify(envelope, null, 2), 'application/json')
    }

    return downloadFile(`${base}.csv`, toCSV(safeRows, cols), 'text/csv;charset=utf-8')
  } catch (err) {
    console.error('[exportReport] Export failed:', err)
    return false
  }
}

export default exportReport
