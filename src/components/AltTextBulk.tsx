'use client'

import { Button } from '@payloadcms/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LANGUAGES } from '../languages.js'

type Row = {
  alt: string
  error?: string
  filename: string
  id: number | string
  loading?: boolean
  saved?: boolean
  selected?: boolean
  text: string
  thumb?: string
}

type Props = {
  altField: string
  collections: string[]
  defaultLocale: null | string
  defaults: { autoGenerate: boolean; language: string }
  locales: null | { code: string; label: string }[]
}

const SETTINGS_URL = '/api/globals/alt-text-generator-settings'

export const AltTextBulk = ({ altField, collections, defaultLocale, defaults, locales }: Props) => {
  const [collection, setCollection] = useState(collections[0])
  const [autoGenerate, setAutoGenerate] = useState(defaults.autoGenerate)
  const [language, setLanguage] = useState(defaults.language)
  const [locale, setLocale] = useState<string>(defaultLocale || locales?.[0]?.code || '')
  const localeQuery = locales ? `&locale=${locale}` : ''
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState<'all' | 'missing'>('missing')
  const [overwrite, setOverwrite] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [credits, setCredits] = useState<null | number>(null)
  const [creditsError, setCreditsError] = useState('')
  const [message, setMessage] = useState('')

  const patch = (id: Row['id'], changes: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...changes } : row)))

  const loadCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/alt-text-generator/credits', { credentials: 'include', method: 'POST' })
      const data = await res.json()
      setCredits(typeof data.credits === 'number' ? data.credits : null)
      setCreditsError(data.error || '')
    } catch {
      setCreditsError('Could not check credits.')
    }
  }, [])

  const scan = useCallback(async () => {
    setScanning(true)
    setMessage('')
    try {
      const all: Row[] = []
      for (let page = 1; ; page++) {
        const res = await fetch(`/api/${collection}?limit=100&page=${page}&depth=0&sort=filename${localeQuery}`, { cache: 'no-store', credentials: 'include' })
        const data = await res.json()
        for (const doc of data.docs || []) {
          if (doc.mimeType && !String(doc.mimeType).startsWith('image/')) continue
          all.push({
            id: doc.id,
            alt: (doc[altField] || '').trim(),
            filename: doc.filename,
            text: '',
            thumb: doc.thumbnailURL || doc.sizes?.thumbnail?.url || doc.url,
          })
        }
        if (!data.hasNextPage) break
      }
      setRows(all)
    } catch {
      setMessage('Could not load your images.')
    } finally {
      setScanning(false)
    }
  }, [altField, collection, localeQuery])

  useEffect(() => {
    void loadCredits()
  }, [loadCredits])
  useEffect(() => {
    fetch(SETTINGS_URL, { cache: 'no-store', credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((saved) => {
        if (!saved) return
        if (saved.autoGenerate) setAutoGenerate(saved.autoGenerate === 'on')
        if (saved.language) setLanguage(saved.language)
      })
      .catch(() => undefined)
  }, [])

  const saveSetting = async (changes: { autoGenerate?: 'off' | 'on'; language?: string }) => {
    try {
      await fetch(SETTINGS_URL, {
        body: JSON.stringify(changes),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
    } catch {
      setMessage('Could not save that setting.')
    }
  }
  useEffect(() => {
    void scan()
  }, [scan])

  const generateOne = async (row: Row): Promise<boolean> => {
    patch(row.id, { error: '', loading: true, saved: false })
    try {
      const res = await fetch('/api/alt-text-generator/generate', {
        body: JSON.stringify({ id: row.id, collection, language: locales ? undefined : language, locale: locales ? locale : undefined }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        patch(row.id, { error: data.error || 'Could not generate alt text.', loading: false })
        return false
      }
      patch(row.id, { loading: false, text: data.altText })
      return true
    } catch {
      patch(row.id, { error: 'Could not generate alt text.', loading: false })
      return false
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length
  const missingCount = rows.filter((r) => !r.alt).length
  const targets = useMemo(
    () => (selectedCount ? rows.filter((r) => r.selected) : overwrite ? rows : rows.filter((r) => !r.alt)),
    [rows, selectedCount, overwrite],
  )
  const changedCount = rows.filter((r) => r.text && r.text !== r.alt).length
  const shown = rows.filter((r) => filter === 'all' || !r.alt || r.text)

  const generateTargets = async () => {
    setBusy(true)
    setMessage('')
    const queue = [...targets]
    let stop = false
    const worker = async () => {
      while (queue.length && !stop) {
        const row = queue.shift() as Row
        const ok = await generateOne(row)
        if (!ok) {
          const latest = document.querySelector(`[data-row="${row.id}"] [data-error]`)?.textContent || ''
          if (/credits|API key/i.test(latest)) stop = true
        }
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setRows((current) => current.map((r) => ({ ...r, selected: false })))
    setBusy(false)
    setMessage('Done. Review the text, then save your changes.')
    void loadCredits()
  }

  const saveAll = async () => {
    setBusy(true)
    let saved = 0
    for (const row of rows.filter((r) => r.text && r.text !== r.alt)) {
      try {
        const res = await fetch(`/api/${collection}/${row.id}${locales ? `?locale=${locale}` : ''}`, {
          body: JSON.stringify({ [altField]: row.text }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        })
        if (res.ok) {
          patch(row.id, { alt: row.text, saved: true })
          saved++
        } else {
          patch(row.id, { error: 'Could not save this image.' })
        }
      } catch {
        patch(row.id, { error: 'Could not save this image.' })
      }
    }
    setBusy(false)
    setMessage(`Saved ${saved} image${saved === 1 ? '' : 's'}.`)
  }

  const box = {
    background: 'var(--theme-elevation-50)',
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: 4,
    padding: 16,
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...box, alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
        <div>
          {creditsError ? (
            <span>{creditsError}</span>
          ) : credits === null ? (
            <span>Checking credits…</span>
          ) : (
            <span>
              <strong>{credits}</strong> credits remaining
            </span>
          )}{' '}
          · <a href="https://alttextgeneratorai.com/dashboard" rel="noopener noreferrer" target="_blank">Get a free API key</a>
        </div>
        {collections.length > 1 && (
          <select onChange={(e) => setCollection(e.target.value)} value={collection}>
            {collections.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ ...box, alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
          <input
            checked={autoGenerate}
            onChange={(e) => {
              setAutoGenerate(e.target.checked)
              void saveSetting({ autoGenerate: e.target.checked ? 'on' : 'off' })
            }}
            type="checkbox"
          />
          Write alt text automatically when an image is uploaded
        </label>
        {locales ? (
          <label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
            Locale
            <select onChange={(e) => setLocale(e.target.value)} style={{ padding: '4px 8px' }} value={locale}>
              {locales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <small>The alt text is written in the language of the locale.</small>
          </label>
        ) : (
          <label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
            Language
            <select
              style={{ padding: '4px 8px' }}
              onChange={(e) => {
                setLanguage(e.target.value)
                void saveSetting({ language: e.target.value })
              }}
              value={language}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Button buttonStyle="secondary" disabled={scanning || busy} onClick={scan} size="small" type="button">
          {scanning ? 'Scanning…' : 'Scan images'}
        </Button>
        <Button buttonStyle={filter === 'missing' ? 'primary' : 'secondary'} onClick={() => setFilter('missing')} size="small" type="button">
          Missing
        </Button>
        <Button buttonStyle={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')} size="small" type="button">
          All
        </Button>
        <label style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
          <input checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} type="checkbox" />
          Overwrite images that already have alt text
        </label>
        <span>
          {rows.length} images, {missingCount} missing alt text
        </span>
      </div>

      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Button disabled={busy || targets.length === 0} onClick={generateTargets} size="small" type="button">
          {selectedCount ? `Generate selected (${selectedCount})` : overwrite ? `Generate all (${rows.length})` : `Generate all missing (${missingCount})`}
        </Button>
        <Button buttonStyle="secondary" disabled={busy || changedCount === 0} onClick={saveAll} size="small" type="button">
          Save changes ({changedCount})
        </Button>
        {message && <span>{message}</span>}
      </div>

      {shown.length === 0 && !scanning && <div style={box}>{filter === 'missing' ? 'No images are missing alt text.' : 'No images found.'}</div>}

      <div>
        {shown.map((row) => (
          <div
            data-row={row.id}
            key={row.id}
            style={{ alignItems: 'start', borderBottom: '1px solid var(--theme-elevation-100)', display: 'grid', gap: 16, gridTemplateColumns: '24px 56px 200px 1fr auto', padding: '12px 0' }}
          >
            <input checked={Boolean(row.selected)} onChange={(e) => patch(row.id, { selected: e.target.checked })} type="checkbox" />
            <div style={{ background: 'var(--theme-elevation-100)', borderRadius: 4, height: 56, overflow: 'hidden', width: 56 }}>
              {row.thumb && <img alt="" src={row.thumb} style={{ height: '100%', objectFit: 'cover', width: '100%' }} />}
            </div>
            <div style={{ overflowWrap: 'anywhere' }}>
              <strong>{row.filename}</strong>
            </div>
            <div>
              <textarea
                onChange={(e) => patch(row.id, { text: e.target.value })}
                placeholder={row.alt || 'Alt text'}
                style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-elevation-150)', borderRadius: 4, color: 'var(--theme-text)', font: 'inherit', height: 76, padding: 8, width: '100%' }}
                value={row.text}
              />
              {row.error && (
                <small data-error style={{ color: 'var(--theme-error-500)' }}>
                  {row.error}
                </small>
              )}
              {row.saved && !row.error && <small>Saved</small>}
            </div>
            <Button buttonStyle="secondary" disabled={busy || row.loading} onClick={() => generateOne(row)} size="small" type="button">
              {row.loading ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
