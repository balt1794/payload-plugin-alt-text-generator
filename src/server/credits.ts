import type { Endpoint } from 'payload'

import type { ResolvedOptions } from '../options.js'

const DEFAULT_ENDPOINT = 'https://alttextgeneratorai.com/api/payload'

/** POST /api/alt-text-generator/credits returns { credits } for the configured key. */
export const createCreditsEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'You need to be signed in.' }, { status: 401 })
    }
    if (!(await options.access({ req }))) {
      return Response.json({ error: 'You do not have permission to do this.' }, { status: 403 })
    }
    if (!options.apiKey) {
      return Response.json({ credits: null, error: 'No API key.' })
    }
    try {
      const verifyUrl = (options.endpoint || DEFAULT_ENDPOINT).replace(/\/[^/]+$/, '/verify')
      const res = await fetch(verifyUrl, {
        body: JSON.stringify({ apiKey: options.apiKey }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        return Response.json({ credits: null, error: 'That API key was not found.' })
      }
      const data = (await res.json()) as { freeRewritesLeft?: number }
      return Response.json({ credits: typeof data.freeRewritesLeft === 'number' ? data.freeRewritesLeft : null })
    } catch {
      return Response.json({ credits: null, error: 'Could not reach the Alt Text Generator service.' })
    }
  },
  method: 'post',
  path: '/alt-text-generator/credits',
})
