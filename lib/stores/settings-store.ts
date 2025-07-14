import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ProviderKeys = {
  openai?: string
  openrouter?: string
  ollama?: string
}

type SettingsState = {
  apiKeys: ProviderKeys
  setApiKey: (provider: keyof ProviderKeys, key: string) => void
  clearApiKey: (provider: keyof ProviderKeys) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKeys: {},
      setApiKey: (provider, key) => 
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key }
        })),
      clearApiKey: (provider) =>
        set((state) => {
          const newKeys = { ...state.apiKeys }
          delete newKeys[provider]
          return { apiKeys: newKeys }
        }),
    }),
    {
      name: 'settings-storage',
    }
  )
)
