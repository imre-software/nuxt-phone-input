<script setup lang="ts">
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumber,
  parsePhoneNumberWithError
} from 'libphonenumber-js/mobile'
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

interface CountryInfo {
  name: string
  example: string
}

const props = withDefaults(defineProps<{
  required?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  language?: 'country' | 'browser'
}>(), {
  size: 'md',
  language: 'browser'
})

const modelValue = defineModel<string>({ default: '' })
const valid = defineModel<boolean>('valid', { default: false })
const country = defineModel<CountryInfo>('country', { default: () => ({ name: '', example: '' }) })

const emit = defineEmits<{
  'input': []
  'blur': []
}>()

// Safe wrapper that never throws
const safeParsePhoneNumber = (value: string) => {
  if (!value || !value.trim()) return null
  try {
    return parsePhoneNumber(value)
  } catch {
    return null
  }
}

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

const selectedCountry = ref<string>(
  safeParsePhoneNumber(modelValue.value)?.country || detectCountryFromBrowser()
)
const localNumber = ref<string>(
  safeParsePhoneNumber(modelValue.value)?.formatNational() || ''
)
const asYouType = ref<AsYouType | null>(null)

// Cache for country lists by language key (browser, country, or specific language code)
const countryListCache = ref<Map<string, Country[]>>(new Map())
const countries = ref<Country[]>([])
const isInitializing = ref(false)

// Initialize countries list with caching and lazy loading
const initializeCountries = () => {
  if (isInitializing.value) return

  // Generate cache key based on language mode
  const cacheKey = props.language === 'browser'
    ? `browser:${navigator.language}`
    : 'country'

  // Return cached data if available (instant!)
  if (countryListCache.value.has(cacheKey)) {
    countries.value = countryListCache.value.get(cacheKey)!
    return
  }

  // Compute country list once and cache it
  isInitializing.value = true

  try {
    // Determine browser language and direction once if needed
    let browserLanguageCode: string = ''
    let browserDirection: 'ltr' | 'rtl' = 'ltr'
    let browserDisplayNames: Intl.DisplayNames | null = null

    if (props.language === 'browser') {
      browserLanguageCode = navigator.language.split('-')[0] || 'en' // e.g., 'en' from 'en-US'

      // Get browser text direction
      try {
        const locale = new Intl.Locale(navigator.language)
        browserDirection = typeof (locale as any).getTextInfo === 'function'
          ? (locale as any).getTextInfo().direction
          : 'ltr' as 'ltr' | 'rtl'
      } catch {
        browserDirection = 'ltr'
      }

      // MAJOR OPTIMIZATION: Create ONE DisplayNames instance for all countries in browser mode
      browserDisplayNames = new Intl.DisplayNames([browserLanguageCode], { type: 'region' })
    }

    // For country mode: cache DisplayNames instances per language
    const displayNamesCache = new Map<string, Intl.DisplayNames>()
    const getDisplayNames = (languageCode: string): Intl.DisplayNames => {
      if (!displayNamesCache.has(languageCode)) {
        displayNamesCache.set(languageCode, new Intl.DisplayNames([languageCode], { type: 'region' }))
      }
      return displayNamesCache.get(languageCode)!
    }

    // For country mode: cache locale maximization results
    const localeInfoCache = new Map<string, { language: string, direction: 'ltr' | 'rtl' }>()
    const getLocaleInfo = (countryCode: string) => {
      if (!localeInfoCache.has(countryCode)) {
        const locale = new Intl.Locale('und', { region: countryCode })
        const maximized = locale.maximize()
        const direction = typeof (locale as any).getTextInfo === 'function'
          ? (locale as any).getTextInfo().direction
          : 'ltr' as 'ltr' | 'rtl'
        localeInfoCache.set(countryCode, { language: maximized.language, direction })
      }
      return localeInfoCache.get(countryCode)!
    }

    const countryList = getCountries().map(code => {
      const dialCode = getCountryCallingCode(code)

      let languageCode: string
      let direction: 'ltr' | 'rtl'
      let displayNames: Intl.DisplayNames

      if (props.language === 'browser' && browserDisplayNames) {
        // Use browser language for all countries (FAST PATH)
        direction = browserDirection
        displayNames = browserDisplayNames // Reuse the single instance!
      } else {
        // Use country's native language (current behavior)
        const localeInfo = getLocaleInfo(code)
        languageCode = localeInfo.language
        direction = localeInfo.direction
        displayNames = getDisplayNames(languageCode)
      }

      // Get country name in the determined language
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

    // Cache the result
    countryListCache.value.set(cacheKey, countryList)
    countries.value = countryList
  } finally {
    isInitializing.value = false
  }
}

// Watch language prop changes and re-initialize if needed
watch(() => props.language, () => {
  initializeCountries()
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
    asYouType.value = new AsYouType(newCountry || 'US')
    localNumber.value = ''
    // Note: country.value is initialized in onMounted to prevent synchronous updates during setup
    // It's then updated in handleInput/handleBlur during user interactions
    // Note: Don't emit blur here - only on actual user blur to prevent isDirty from being set during initialization
  }
})

// Handle input with AsYouType formatting and real-time validation
const handleInput = (event: Event) => {
  const input = (event.target as HTMLInputElement).value

  // Ensure asYouType exists
  if (!asYouType.value) {
    asYouType.value = new AsYouType(selectedCountry.value || 'US')
  }

  // Format display with AsYouType
  asYouType.value.reset()
  const formatted = asYouType.value.input(input)
  localNumber.value = formatted

  // Validate and update models on every keystroke
  const { isValid, phoneNumber } = validateAndParsePhoneNumber()
  valid.value = isValid
  country.value = getCountryInfo()
  modelValue.value = phoneNumber

  // Emit input event for standard DOM-like API
  emit('input')
}

// Get country info for error messages
const getCountryInfo = (): CountryInfo => {
  if (!selectedCountry.value) {
    return { name: '', example: '' }
  }

  const country = countries.value.find(c => c.code === selectedCountry.value)
  let exampleNumber = ''

  try {
    const example = getExampleNumber(selectedCountry.value, examples)
    exampleNumber = example?.formatNational() || ''
  } catch {
    exampleNumber = ''
  }

  return {
    name: country?.name || '',
    example: exampleNumber
  }
}

// Validate and parse phone number - returns both validation state and formatted number
const validateAndParsePhoneNumber = (): { isValid: boolean, phoneNumber: string } => {
  let isValid = false
  let phoneNumber = localNumber.value

  try {
    const parsed = parsePhoneNumberWithError(localNumber.value, selectedCountry.value)
    // Check if number is actually valid (not just parseable)
    if (parsed.isValid()) {
      phoneNumber = parsed.format('E.164')
      isValid = true
    }
  } catch {
    // Parse failed - keep raw value
  } finally {
    return { isValid, phoneNumber }
  }
}

// Handle blur - emit blur event for parent to mark field as dirty
const handleBlur = () => {
  country.value = getCountryInfo()
  emit('blur')
  // Validation already handled in handleInput
}

// Initialize countries on mount
onMounted(() => {
  // Initialize country list immediately
  // This runs during mount (before user can interact) and populates the cache
  // Subsequent dropdown opens are instant from cache
  initializeCountries()

  // Initialize country info after mount (not during setup) to prevent cascading updates
  country.value = getCountryInfo()
})
</script>

<template>
  <div class="flex gap-2">
    <!-- Country Selector -->
    <USelectMenu
        v-model="selectedCountry"
        :items="countries"
        :disabled="disabled"
        value-key="code"
        placeholder="Country"
        :size="size"
        :content="{ align: 'start' }"
        :ui="{ base: 'w-28', content: 'w-fit max-w-96' }"
        virtualized
    >
      <!-- Compact trigger: flag + dial code only -->
      <template #default="{ modelValue }">
        <div v-if="modelValue" class="flex items-center gap-1.5 w-24 max-w-24">
          <UIcon
              :name="`circle-flags:${modelValue.toLowerCase()}`"
              class="size-5 shrink-0"
          />
          <span class="text-sm font-medium">
            +{{ countries.find((country: Country) => country.code === modelValue)?.dialCode }}
          </span>
        </div>
        <span v-else class="text-dimmed">Country</span>
      </template>

      <!-- Full width dropdown items: flag + full label -->
      <template #item="{ item }">
        <div class="flex items-center gap-2 w-full" :dir="item.direction">
          <UIcon :name="item.icon" class="size-5 shrink-0"/>
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
        @blur="handleBlur"
    />
  </div>
</template>
