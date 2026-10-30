import type { AdminViewServerProps } from 'payload'

import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { AltTextBulk } from './AltTextBulk.js'

export const AltTextView = ({ initPageResult, params, searchParams }: AdminViewServerProps) => {
  const { req } = initPageResult
  const settings = (req.payload.config.custom?.altTextGenerator || {
    altField: 'alt',
    autoGenerate: false,
    collections: [],
    language: 'english',
  }) as {
    altField: string
    autoGenerate: boolean
    collections: string[]
    language: string
  }
  const localization = req.payload.config.localization
  const locales = localization
    ? localization.locales.map((l) => ({ code: l.code, label: typeof l.label === 'string' ? l.label : l.code }))
    : null
  const defaultLocale = localization ? localization.defaultLocale : null

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <h1>Alt Text Generator AI</h1>
        <p>Write alt text for your images in bulk.</p>
        <div style={{ marginTop: 32 }}>
          <AltTextBulk
            altField={settings.altField}
            collections={settings.collections}
            defaultLocale={defaultLocale}
            defaults={{ autoGenerate: settings.autoGenerate, language: settings.language }}
            locales={locales}
          />
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
