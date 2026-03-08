export interface Country {
  code: string
  dialCode: string
  name: string
  icon: string
  label: string
  value: string
  direction: 'ltr' | 'rtl'
}

export interface CountryInfo {
  name: string
  example: string
}
