import type { CapacitorConfig } from '@capacitor/cli'

const configuredServerUrl = process.env.CAPACITOR_SERVER_URL?.trim()
const fallbackServerUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
const rawServerUrl = configuredServerUrl || fallbackServerUrl || 'https://www.nuggets.one'
const serverUrl = rawServerUrl.replace(/^https:\/\/nuggets\.one(\/|$)/, 'https://www.nuggets.one$1')
const usesCleartext = serverUrl.startsWith('http://')
const allowNavigation = ['nuggets.one', 'www.nuggets.one', '*.nuggets.one']

const config: CapacitorConfig = {
  appId: 'nuggets.one',
  appName: 'Nuggets',
  webDir: 'mobile-web',
  server: {
    url: serverUrl,
    cleartext: usesCleartext,
    androidScheme: usesCleartext ? 'http' : 'https',
    allowNavigation,
  },
}

export default config
