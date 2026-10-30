import type { CollectionSlug, PayloadRequest } from 'payload'

export type AltTextGeneratorOptions = {
  /**
   * Decides who may generate alt text, check credits and change the settings. Receives the request and returns
   * true to allow it. Defaults to any signed-in user. Example: `({ req }) => req.user?.role === 'admin'`.
   */
  access?: (args: { req: PayloadRequest }) => boolean | Promise<boolean>
  /** Field that holds the alt text. Created when the collection does not have it. Default `alt`. */
  altField?: string
  /** Your Alt Text Generator API key. Defaults to the ALT_TEXT_GENERATOR_API_KEY environment variable. */
  apiKey?: string
  /** Write alt text automatically when an image is uploaded and the alt field is empty. Default `false`. */
  autoGenerate?: boolean
  /** Upload collections to add alt text generation to. */
  collections: CollectionSlug[]
  /** Turn the plugin off but keep its fields so the database stays consistent. */
  disabled?: boolean
  /** Override the service address, for local testing. */
  endpoint?: string
  /** Language of the alt text, for example `english` or `spanish`. Default `english`. */
  language?: string
}

export type ResolvedOptions = {
  access: (args: { req: PayloadRequest }) => boolean | Promise<boolean>
  altField: string
  apiKey: string
  autoGenerate: boolean
  collections: string[]
  endpoint?: string
  language: string
}

export const resolveOptions = (options: AltTextGeneratorOptions): ResolvedOptions => ({
  access: options.access || (({ req }) => Boolean(req.user)),
  altField: options.altField || 'alt',
  apiKey: options.apiKey || process.env.ALT_TEXT_GENERATOR_API_KEY || '',
  autoGenerate: Boolean(options.autoGenerate),
  collections: options.collections as string[],
  endpoint: options.endpoint || process.env.ALT_TEXT_GENERATOR_ENDPOINT || undefined,
  language: options.language || 'english',
})
