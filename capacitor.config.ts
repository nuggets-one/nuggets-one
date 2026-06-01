import type { CapacitorConfig } from '@capacitor/cli'

const configuredServerUrl = process.env.CAPACITOR_SERVER_URL?.trim()
const fallbackServerUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
const serverUrl = configuredServerUrl || fallbackServerUrl || 'https://nuggets.one'
const usesCleartext = serverUrl.startsWith('http://')

const config: CapacitorConfig = {
  appId: 'one.nuggets.app',
  appName: 'Nuggets',
  webDir: 'mobile-web',
  bundledWebRuntime: false,
  server: {
    url: serverUrl,
    cleartext: usesCleartext,
    androidScheme: usesCleartext ? 'http' : 'https',
  },
}

export default config
