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
  setup(_options, _nuxt) {
    const resolver = createResolver(import.meta.url)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))

    // Register components directory
    addComponentsDir({
      path: resolver.resolve('./runtime/components')
    })
  },
})
