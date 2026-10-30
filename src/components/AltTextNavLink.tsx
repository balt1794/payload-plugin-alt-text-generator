'use client'

import { useConfig } from '@payloadcms/ui'

export const AltTextNavLink = () => {
  const { config } = useConfig()
  const adminRoute = config.routes.admin
  return (
    <a className="nav__link" href={`${adminRoute}/alt-text-generator`} style={{ marginTop: 8 }}>
      <span className="nav__link-label">Alt Text Generator</span>
    </a>
  )
}
