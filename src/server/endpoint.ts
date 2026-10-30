import type { Endpoint } from 'payload'

import type { ResolvedOptions } from '../options.js'

import { generateAltText } from './generate.js'
import { readUploadedFile } from './readFile.js'
import { pickLanguage, readSettings } from './settings.js'

/** POST /api/alt-text-generator/generate with { collection, id } returns { altText }. */
export const createGenerateEndpoint = (options: ResolvedOptions): Endpoint => ({
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'You need to be signed in.' }, { status: 401 })
    }
    if (!(await options.access({ req }))) {
      return Response.json({ error: 'You do not have permission to do this.' }, { status: 403 })
    }

    let body: { collection?: string; id?: number | string; language?: string; locale?: string } = {}
    try {
      body = (await req.json?.()) ?? {}
    } catch {
      return Response.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const { id, collection } = body
    if (!collection || !id || !options.collections.includes(collection)) {
      return Response.json({ error: 'This collection is not set up for alt text.' }, { status: 400 })
    }

    const doc = await req.payload.findByID({ id, collection, depth: 0, overrideAccess: false, req })
    const file = await readUploadedFile(req, collection, doc as never)
    if (!file) {
      return Response.json({ error: 'Could not read the image file.' }, { status: 404 })
    }

    const settings = await readSettings(req, options)
    const language = pickLanguage(req, settings, body.language, body.locale)
    const result = await generateAltText(file.buffer, file.mimeType, { ...options, language })
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status })
    }
    return Response.json({ altText: result.altText })
  },
  method: 'post',
  path: '/alt-text-generator/generate',
})
