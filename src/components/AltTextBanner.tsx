'use client'

import { useConfig } from '@payloadcms/ui'

export const AltTextBanner = () => {
  const { config } = useConfig()
  return (
    <div
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 4,
        marginBottom: 24,
        padding: '12px 16px',
      }}
    >
      <strong>Alt Text Generator is active.</strong> Write alt text for your images in bulk from the{' '}
      <a href={`${config.routes.admin}/alt-text-generator`}>Alt Text Generator</a> page, or one at a time on any image.
    </div>
  )
}
