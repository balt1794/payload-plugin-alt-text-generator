import type { CollectionBeforeChangeHook, Config, Field } from 'payload'

import type { AltTextGeneratorOptions } from './options.js'

import { resolveOptions } from './options.js'
import { createCreditsEndpoint } from './server/credits.js'
import { createGenerateEndpoint } from './server/endpoint.js'
import { generateAltText } from './server/generate.js'
import { createSettingsGlobal, pickLanguage, readSettings } from './server/settings.js'

export type { AltTextGeneratorOptions } from './options.js'

const CLIENT = '@balt1794/payload-plugin-alt-text-generator/client'
const RSC = '@balt1794/payload-plugin-alt-text-generator/rsc'

export const altTextGenerator =
  (pluginOptions: AltTextGeneratorOptions) =>
  (config: Config): Config => {
    const options = resolveOptions(pluginOptions)
    const targets = new Set(options.collections)

    config.collections = (config.collections || []).map((collection) => {
      if (!targets.has(collection.slug)) {
        return collection
      }

      const fields: Field[] = [...collection.fields]
      const existing = fields.findIndex((field) => 'name' in field && field.name === options.altField)

      if (existing === -1) {
        fields.push({
          name: options.altField,
          type: 'text',
          admin: { components: { Field: { clientProps: { autoGenerate: options.autoGenerate }, path: `${CLIENT}#AltTextField` } }, description: 'Describes the image for screen readers and search engines.' },
          label: 'Alt text',
        })
      } else if (!pluginOptions.disabled) {
        const field = fields[existing] as Extract<Field, { type: 'text' }>
        fields[existing] = { ...field, admin: { ...field.admin, components: { ...field.admin?.components, Field: { clientProps: { autoGenerate: options.autoGenerate }, path: `${CLIENT}#AltTextField` } } } }
      }

      const autoAlt: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
        if (pluginOptions.disabled || !options.apiKey) {
          return data
        }
        const settings = await readSettings(req, options)
        if (!settings.autoGenerate) {
          return data
        }
        const file = req.file
        const hasNewFile = Boolean(file?.data?.length) && (operation === 'create' || operation === 'update')
        if (!hasNewFile || !file) {
          return data
        }
        const current = (data as Record<string, unknown>)[options.altField]
        if (operation === 'update' || (typeof current === 'string' && current.trim())) {
          // A replaced file always gets new alt text. A new upload keeps alt text the editor typed.
          if (operation === 'create') return data
        }

        const result = await generateAltText(file.data, file.mimetype, { ...options, language: pickLanguage(req, settings) })
        if (!result.ok) {
          req.payload.logger.warn(`Alt Text Generator: ${result.error}`)
          return data
        }
        return { ...data, [options.altField]: result.altText }
      }

      return { ...collection, fields, hooks: { ...collection.hooks, beforeChange: [...(collection.hooks?.beforeChange || []), autoAlt] } }
    })

    config.globals = [...(config.globals || []), createSettingsGlobal(options)]
    config.custom = {
      ...config.custom,
      altTextGenerator: {
        altField: options.altField,
        autoGenerate: options.autoGenerate,
        collections: options.collections,
        language: options.language,
      },
    }

    if (!pluginOptions.disabled) {
      config.endpoints = [...(config.endpoints || []), createGenerateEndpoint(options), createCreditsEndpoint(options)]

      config.admin = config.admin || {}
      config.admin.components = config.admin.components || {}
      config.admin.components.afterNavLinks = [...(config.admin.components.afterNavLinks || []), `${CLIENT}#AltTextNavLink`]
      config.admin.components.beforeDashboard = [...(config.admin.components.beforeDashboard || []), `${CLIENT}#AltTextBanner`]
      config.admin.components.views = {
        ...config.admin.components.views,
        altTextGenerator: { Component: `${RSC}#AltTextView`, path: '/alt-text-generator' },
      }
    }

    return config
  }
