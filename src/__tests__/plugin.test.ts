import type { Config } from 'payload'

import { describe, expect, it } from 'vitest'

import { altTextGenerator } from '../index.js'
import { languageForLocale } from '../languages.js'

const baseConfig = (): Config =>
  ({
    collections: [
      { slug: 'media', fields: [], upload: true },
      { slug: 'posts', fields: [{ name: 'title', type: 'text' }] },
    ],
    secret: 'test',
  }) as unknown as Config

describe('altTextGenerator plugin', () => {
  it('adds an alt field, a hook and the admin pieces to the chosen collection only', () => {
    const config = altTextGenerator({ apiKey: 'key', collections: ['media' as never] })(baseConfig())

    const media = config.collections?.find((c) => c.slug === 'media')
    expect(media?.fields.some((f) => 'name' in f && f.name === 'alt')).toBe(true)
    expect(media?.hooks?.beforeChange?.length).toBe(1)

    const posts = config.collections?.find((c) => c.slug === 'posts')
    expect(posts?.fields).toHaveLength(1)
    expect(posts?.hooks).toBeUndefined()

    expect(config.endpoints?.map((e) => e.path)).toEqual(['/alt-text-generator/generate', '/alt-text-generator/credits'])
    expect(config.globals?.some((g) => g.slug === 'alt-text-generator-settings')).toBe(true)
    expect(config.admin?.components?.views).toHaveProperty('altTextGenerator')
  })

  it('keeps an alt field the collection already has and only attaches the button', () => {
    const incoming = baseConfig()
    incoming.collections![0].fields.push({ name: 'alt', type: 'text', required: true })
    const config = altTextGenerator({ collections: ['media' as never] })(incoming)

    const fields = config.collections![0].fields.filter((f) => 'name' in f && f.name === 'alt')
    expect(fields).toHaveLength(1)
    expect((fields[0] as { required?: boolean }).required).toBe(true)
    expect((fields[0] as { admin?: { components?: { Field?: unknown } } }).admin?.components?.Field).toBeTruthy()
  })

  it('adds no endpoints or admin pages when disabled, but keeps the fields', () => {
    const config = altTextGenerator({ collections: ['media' as never], disabled: true })(baseConfig())
    expect(config.endpoints ?? []).toHaveLength(0)
    expect(config.admin?.components?.views).toBeUndefined()
    expect(config.collections![0].fields.some((f) => 'name' in f && f.name === 'alt')).toBe(true)
  })
})

describe('languageForLocale', () => {
  it('maps locale codes to language names', () => {
    expect(languageForLocale('es')).toBe('spanish')
    expect(languageForLocale('pt-BR')).toBe('portuguese')
    expect(languageForLocale('xx')).toBeUndefined()
    expect(languageForLocale(undefined)).toBeUndefined()
  })
})
