<script setup lang="ts">
import { AsYouType, getCountries, getCountryCallingCode, getExampleNumber, parsePhoneNumber } from 'libphonenumber-js/mobile'
import examples from 'libphonenumber-js/mobile/examples'

interface Country {
  code: string
  dialCode: string
  name: string
  icon: string
  label: string
  value: string
  direction: 'ltr' | 'rtl'
}

const props = withDefaults(defineProps<{
  modelValue?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  language?: 'country' | 'browser'
}>(), {
  size: 'md',
  language: 'country'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedCountry = ref<string>('')
const localNumber = ref<string>('')
const asYouType = ref<AsYouType | null>(null)

// Build countries list with native names or browser language
const countries = computed<Country[]>(() => {
  // Determine browser language and direction once if needed
  let browserLanguageCode: string | null = null
  let browserDirection: 'ltr' | 'rtl' = 'ltr'

  if (props.language === 'browser') {
    const browserLocale = navigator.language.split('-')[0] // e.g., 'en' from 'en-US'
    browserLanguageCode = browserLocale

    // Get browser text direction
    try {
      const locale = new Intl.Locale(navigator.language)
      browserDirection = typeof (locale as any).getTextInfo === 'function'
        ? (locale as any).getTextInfo().direction
        : 'ltr' as 'ltr' | 'rtl'
    } catch {
      browserDirection = 'ltr'
    }
  }

  return getCountries().map(code => {
    const dialCode = getCountryCallingCode(code)

    let languageCode: string
    let direction: 'ltr' | 'rtl'

    if (props.language === 'browser' && browserLanguageCode) {
      // Use browser language for all countries
      languageCode = browserLanguageCode
      direction = browserDirection
    } else {
      // Use country's native language (current behavior)
      // Infer the primary language for this country using Intl.Locale
      const localeForCountry = new Intl.Locale('und', { region: code })
      const maximizedLocale = localeForCountry.maximize()
      languageCode = maximizedLocale.language

      // Get text direction (RTL or LTR) - not supported in Firefox yet
      direction = typeof (localeForCountry as any).getTextInfo === 'function'
        ? (localeForCountry as any).getTextInfo().direction
        : 'ltr' as 'ltr' | 'rtl'
    }

    // Get country name in the determined language
    const displayNames = new Intl.DisplayNames([languageCode], { type: 'region' })
    const name = displayNames.of(code) || code

    return {
      code,
      dialCode,
      name,
      icon: `circle-flags:${code.toLowerCase()}`,
      label: `${name} (+${dialCode})`,
      value: code,
      direction
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
})

// Dynamic placeholder based on selected country
const placeholder = computed(() => {
  if (!selectedCountry.value) return 'Select country first'

  try {
    const exampleNumber = getExampleNumber(selectedCountry.value, examples)
    return exampleNumber?.formatNational() || 'Enter phone number'
  } catch {
    return 'Enter phone number'
  }
})

// Initialize AsYouType when country changes
watch(selectedCountry, (newCountry) => {
  if (newCountry) {
    asYouType.value = new AsYouType(newCountry)
    localNumber.value = ''
  }
})

// Handle input with AsYouType formatting
const handleInput = (event: Event) => {
  const input = (event.target as HTMLInputElement).value

  if (asYouType.value && selectedCountry.value) {
    asYouType.value.reset()
    const formatted = asYouType.value.input(input)
    localNumber.value = formatted
  } else {
    localNumber.value = input
  }
}

// Update model value with validated phone number
const updateModelValue = () => {
  if (!selectedCountry.value || !localNumber.value.trim()) {
    emit('update:modelValue', '')
    return
  }

  try {
    const phoneNumber = parsePhoneNumber(localNumber.value, selectedCountry.value)

    if (phoneNumber?.isValid()) {
      const dialCode = getCountryCallingCode(selectedCountry.value)
      // Output format: dialCode + nationalNumber (no +, no spaces)
      // parsePhoneNumber automatically removes trunk prefix (leading 0)
      emit('update:modelValue', `${dialCode}${phoneNumber.nationalNumber}`)
    } else {
      emit('update:modelValue', '')
    }
  } catch (error) {
    // Invalid input, don't update model
    console.warn('Phone validation error:', error)
    emit('update:modelValue', '')
  }
}

watch([selectedCountry, localNumber], updateModelValue)

// Detect country from browser locale
const detectCountryFromBrowser = (): string => {
  try {
    // Try to get country from navigator.language (e.g., "en-US" -> "US")
    const locale = navigator.language
    const countryCode = locale.split('-')[1]?.toUpperCase()

    // Validate that the country code exists in our list
    if (countryCode && getCountries().includes(countryCode)) {
      return countryCode
    }

    // Fallback: try to detect from timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    // Common timezone to country mappings
    const tzMap: Record<string, string> = {
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Asia/Jerusalem': 'IL',
      'Asia/Tokyo': 'JP',
      'Australia/Sydney': 'AU',
    }

    const detectedCountry = tzMap[timeZone]
    if (detectedCountry && getCountries().includes(detectedCountry)) {
      return detectedCountry
    }
  } catch {
    // Detection failed, will use default
  }

  // Default to US if detection fails
  return 'US'
}

// Parse initial value if provided, or detect country from browser
onMounted(() => {
  if (props.modelValue) {
    try {
      const phoneNumber = parsePhoneNumber(`+${props.modelValue}`)
      if (phoneNumber) {
        selectedCountry.value = phoneNumber.country || ''
        localNumber.value = phoneNumber.formatNational()
      }
    } catch {
      // Invalid initial value, ignore
    }
  } else {
    // Auto-detect country from browser
    selectedCountry.value = detectCountryFromBrowser()
  }
})
</script>

<template>
  <div class="flex flex-col sm:flex-row gap-2">
    <!-- Country Selector -->
    <USelectMenu
      v-model="selectedCountry"
      :items="countries"
      :disabled="disabled"
      value-key="code"
      placeholder="Country"
      :size="size"
      :content="{ align: 'start' }"
      :ui="{ base: 'w-24', content: 'w-fit' }"
    >
      <!-- Compact trigger: flag + dial code only -->
      <template #default="{ modelValue }">
        <div v-if="modelValue" class="flex items-center gap-1.5 w-24 max-w-24">
          <UIcon
            :name="`circle-flags:${modelValue.toLowerCase()}`"
            class="size-5 shrink-0"
          />
          <span class="text-sm font-medium">
            +{{ countries.find(c => c.code === modelValue)?.dialCode }}
          </span>
        </div>
        <span v-else class="text-dimmed">Country</span>
      </template>

      <!-- Full width dropdown items: flag + full label -->
      <template #item="{ item }">
        <div class="flex items-center gap-2 w-full" :dir="item.direction">
          <UIcon :name="item.icon" class="size-5 shrink-0" />
          <span>{{ item.label }}</span>
        </div>
      </template>
    </USelectMenu>

    <!-- Phone Number Input with AsYouType formatting -->
    <UInput
      :model-value="localNumber"
      type="tel"
      :size="size"
      :disabled="disabled || !selectedCountry"
      :placeholder="placeholder"
      :required="required"
      @input="handleInput"
    />
  </div>
</template>
