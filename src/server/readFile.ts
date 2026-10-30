import type { PayloadRequest } from 'payload'

import fs from 'fs/promises'
import path from 'path'

/** Reads an uploaded file from local storage, or downloads it when it lives on a cloud URL. */
export async function readUploadedFile(
  req: PayloadRequest,
  collectionSlug: string,
  doc: { filename?: string; mimeType?: string; url?: string },
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const mimeType = doc.mimeType || 'image/jpeg'
  const upload = req.payload.collections[collectionSlug]?.config.upload
  const staticDir = upload && typeof upload === 'object' ? upload.staticDir : undefined

  if (staticDir && doc.filename) {
    try {
      const dir = path.isAbsolute(staticDir) ? staticDir : path.resolve(process.cwd(), staticDir)
      return { buffer: await fs.readFile(path.join(dir, doc.filename)), mimeType }
    } catch {
      /* fall through to the URL */
    }
  }

  if (doc.url) {
    try {
      const url = new URL(doc.url, req.url || 'http://localhost')
      const res = await fetch(url, { headers: req.headers.get('cookie') ? { cookie: req.headers.get('cookie') as string } : undefined })
      if (res.ok) return { buffer: Buffer.from(await res.arrayBuffer()), mimeType }
    } catch {
      /* no file */
    }
  }

  return null
}
