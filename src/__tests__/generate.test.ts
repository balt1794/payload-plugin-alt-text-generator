import { afterEach, describe, expect, it, vi } from 'vitest'

import { generateAltText } from '../server/generate.js'

const image = Buffer.from('not a real image')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateAltText', () => {
  it('asks for a key when none is set', async () => {
    const result = await generateAltText(image, 'image/jpeg', { apiKey: '' })
    expect(result).toMatchObject({ ok: false, status: 401 })
  })

  it('returns the alt text and sends the key and language', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('A red car on a street.', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateAltText(image, 'image/jpeg', { apiKey: 'key-123', endpoint: 'https://example.test/api', language: 'spanish' })

    expect(result).toEqual({ altText: 'A red car on a street.', ok: true })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.wpkey).toBe('key-123')
    expect(body.language).toBe('spanish')
    expect(body.image).toMatch(/^data:image\/jpeg;base64,/)
  })

  it.each([
    [401, 'Invalid API key.'],
    [402, 'No credits left on this API key.'],
  ])('explains a %i answer', async (status, error) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status })))
    const result = await generateAltText(image, 'image/png', { apiKey: 'key' })
    expect(result).toMatchObject({ error, ok: false, status })
  })

  it('does not show an HTML error page to the editor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!DOCTYPE html><html>404</html>', { status: 404 })))
    const result = await generateAltText(image, 'image/png', { apiKey: 'key' })
    expect(result).toMatchObject({ error: 'Generation failed (404).', ok: false })
  })

  it('reports an unreachable service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const result = await generateAltText(image, 'image/png', { apiKey: 'key' })
    expect(result).toMatchObject({ error: 'Could not reach the Alt Text Generator service.', ok: false })
  })
})
