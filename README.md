# nuxt-phone-input

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A Nuxt module that provides a phone number input component with international formatting, real-time validation, and automatic country detection. Built on top of [Nuxt UI](https://ui.nuxt.com) and [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js).

## Features

- AsYouType formatting as the user types
- Real-time phone number validation
- Automatic country detection from browser locale or timezone
- Country selector with flags and dial codes (virtualized for performance)
- RTL support - country names display in their native direction
- Two language modes: browser language or each country's native language
- E.164 formatted output for storage
- Fully accessible with keyboard navigation

## Quick Setup

Install the module:

```bash
pnpm add nuxt-phone-input
```

Then add it to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-phone-input']
})
```

## Usage

```vue
<script setup lang="ts">
const phone = ref('')
const isValid = ref(false)
const countryInfo = ref({ name: '', example: '' })
</script>

<template>
  <PhoneInput
    v-model="phone"
    v-model:valid="isValid"
    v-model:country="countryInfo"
    required
    @blur="handleBlur"
  />
  <p v-if="!isValid && phone">
    Invalid number for {{ countryInfo.name }}.
    Example: {{ countryInfo.example }}
  </p>
</template>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `required` | `boolean` | `false` | Marks the input as required |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Input size (matches Nuxt UI sizes) |
| `disabled` | `boolean` | `false` | Disables the input and country selector |
| `language` | `'country' \| 'browser'` | `'browser'` | `'browser'` shows all country names in the browser's language. `'country'` shows each country name in its native language. |

## Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `v-model` | `string` | `''` | Phone number in E.164 format (e.g. `+14155552671`) |
| `v-model:valid` | `boolean` | `false` | Whether the current input is a valid phone number |
| `v-model:country` | `CountryInfo` | `{ name: '', example: '' }` | Selected country name and example number for validation messages |

## Events

| Event | Description |
|-------|-------------|
| `input` | Fires on every keystroke |
| `blur` | Fires when the input loses focus |

## Types

```typescript
import type { CountryInfo, Country } from 'nuxt-phone-input'

interface CountryInfo {
  name: string
  example: string
}

interface Country {
  code: string      // ISO 3166-1 alpha-2 (e.g. "US")
  dialCode: string  // Country calling code (e.g. "1")
  name: string      // Display name
  icon: string      // Iconify icon name
  label: string     // "Name (+code)" format
  value: string     // Same as code
  direction: 'ltr' | 'rtl'
}
```

## Peer Dependencies

This module requires [Nuxt UI](https://ui.nuxt.com) (v3 or v4) to be installed in your project - the component uses `USelectMenu` and `UInput` internally.

## Development

```bash
# Install dependencies
pnpm install

# Generate type stubs
pnpm run dev:prepare

# Develop with the playground
pnpm run dev

# Run ESLint
pnpm run lint

# Run Vitest
pnpm run test
```

## License

[MIT](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-phone-input/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-phone-input

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-phone-input.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-phone-input

[license-src]: https://img.shields.io/npm/l/nuxt-phone-input.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-phone-input

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
