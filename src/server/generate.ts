const DEFAULT_ENDPOINT = 'https://alttextgeneratorai.com/api/payload'
const MAX_DATA_URL_LENGTH = 5_500_000

export type GenerateOptions = {
  apiKey: string
  endpoint?: string
  language?: string
}

export type GenerateResult = { altText: string; ok: true } | { error: string; ok: false; status: number }

/** Shrinks big images before they are sent, if `sharp` is installed (Payload already uses it). */
async function toJpegBase64(buffer: Buffer): Promise<string> {
  try {
    const sharp = (await import('sharp')).default
    const resized = await sharp(buffer)
      .rotate()
      .resize({ fit: 'inside', height: 1024, width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    return `data:image/jpeg;base64,${resized.toString('base64')}`
  } catch {
    return ''
  }
}

/**
 * Sends one image to the Alt Text Generator service and returns the alt text.
 * Runs on the server only, so the API key is never exposed to the browser.
 */
export async function generateAltText(
  image: Buffer,
  mimeType: string,
  options: GenerateOptions,
): Promise<GenerateResult> {
  if (!options.apiKey) {
    return { error: 'No API key. Set ALT_TEXT_GENERATOR_API_KEY or pass apiKey to the plugin.', ok: false, status: 401 }
  }

  let dataUrl = await toJpegBase64(image)
  if (!dataUrl && /^image\/(jpeg|png|webp|gif)$/.test(mimeType)) {
    dataUrl = `data:${mimeType};base64,${image.toString('base64')}`
  }
  if (!dataUrl) {
    return { error: 'This image type is not supported.', ok: false, status: 415 }
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    return { error: 'This image is too large to send.', ok: false, status: 413 }
  }

  try {
    const res = await fetch(options.endpoint || DEFAULT_ENDPOINT, {
      body: JSON.stringify({ image: dataUrl, language: options.language || 'english', wpkey: options.apiKey }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const text = (await res.text()).trim()

    if (!res.ok) {
      const error =
        res.status === 401
          ? 'Invalid API key.'
          : res.status === 402
            ? 'No credits left on this API key.'
            : text && text.length < 160 && !text.startsWith('<')
              ? text
              : `Generation failed (${res.status}).`
      return { error, ok: false, status: res.status }
    }

    return { altText: text, ok: true }
  } catch {
    return { error: 'Could not reach the Alt Text Generator service.', ok: false, status: 502 }
  }
}
