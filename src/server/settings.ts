import type { GlobalConfig, PayloadRequest } from 'payload'

import type { ResolvedOptions } from '../options.js'

import { languageForLocale } from '../languages.js'

export const SETTINGS_SLUG = 'alt-text-generator-settings'

/** Hidden global that stores the choices made on the Alt Text Generator page. */
export const createSettingsGlobal = (options: ResolvedOptions): GlobalConfig => ({
  slug: SETTINGS_SLUG,
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => options.access({ req }),
  },
  admin: { hidden: true },
  fields: [
    { name: 'autoGenerate', type: 'select', options: ['on', 'off'] },
    { name: 'language', type: 'text' },
  ],
  graphQL: false,
})

export type StoredSettings = { autoGenerate: boolean; language: string }

/** Settings saved in the admin win. Anything not saved falls back to the plugin options. */
export async function readSettings(req: PayloadRequest, options: ResolvedOptions): Promise<StoredSettings> {
  let saved: { autoGenerate?: null | string; language?: null | string } = {}
  try {
    saved = (await req.payload.findGlobal({ slug: SETTINGS_SLUG as never, depth: 0, overrideAccess: true, req })) as typeof saved
  } catch {
    /* not created yet */
  }
  return {
    autoGenerate: saved.autoGenerate ? saved.autoGenerate === 'on' : options.autoGenerate,
    language: saved.language || options.language,
  }
}

/** On sites with several locales the alt text follows the locale being edited. */
export function pickLanguage(req: PayloadRequest, settings: StoredSettings, explicit?: string, locale?: string): string {
  if (explicit) return explicit
  if (req.payload.config.localization) {
    const fromLocale = languageForLocale(locale || (req.locale as string | undefined))
    if (fromLocale) return fromLocale
  }
  return settings.language
}
