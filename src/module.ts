import { defineNuxtModule, addPlugin, addComponentsDir, createResolver } from '@nuxt/kit'

export type { Country, CountryInfo } from './runtime/types'

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-phone-input',
    configKey: 'phoneInput',
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.build.transpile.push(resolver.resolve('./runtime'))

    addPlugin(resolver.resolve('./runtime/plugin'))

    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
    })
  },
})
