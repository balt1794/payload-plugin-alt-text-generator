'use client'

import type { TextFieldClientComponent } from 'payload'

import { Button, FieldLabel, TextInput, useDocumentInfo, useField, useLocale } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

type Props = { autoGenerate?: boolean }

export const AltTextField: TextFieldClientComponent = (props) => {
  const { field, path } = props
  const [autoGenerate, setAutoGenerate] = useState(Boolean((props as unknown as Props).autoGenerate))
  const locale = useLocale()
  const { id, collectionSlug } = useDocumentInfo()
  const { setValue, value } = useField<string>({ path })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/globals/alt-text-generator-settings', { cache: 'no-store', credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((saved) => {
        if (saved?.autoGenerate) setAutoGenerate(saved.autoGenerate === 'on')
      })
      .catch(() => undefined)
  }, [])

  const label = typeof field.label === 'string' ? field.label : 'Alt text'

  const generate = async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/alt-text-generator/generate', {
        body: JSON.stringify({ id, collection: collectionSlug, locale: locale?.code }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'Could not generate alt text.')
        return
      }
      setValue(data.altText)
      setMessage('Added. Save to keep it.')
    } catch {
      setMessage('Could not generate alt text.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="field-type text">
      <FieldLabel label={label} path={path} />
      <TextInput onChange={(e: { target: { value: string } }) => setValue(e.target.value)} path={path} value={value ?? ''} />
      {id ? (
        <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginTop: 8 }}>
          <Button buttonStyle="secondary" disabled={loading} onClick={generate} size="small" type="button">
            {loading ? 'Generating…' : 'Generate alt text'}
          </Button>
          {message && <small>{message}</small>}
        </div>
      ) : (
        autoGenerate && <small style={{ display: 'block', marginTop: 8 }}>Alt text is written automatically when you save.</small>
      )}
    </div>
  )
}
