import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  session_id: string
}

export interface ChatSession {
  id: string
  title: string
  model: string
  provider: string
  created_at: Date
  updated_at: Date
  message_count: number
}

export type AIProvider = "openai" | "openrouter" | "ollama"

export interface ModelOption {
  id: string
  name: string
  provider: AIProvider
  description: string
  free?: boolean
  requiresSetup?: boolean
  working?: boolean // Add status indicator
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // OpenAI Models (require API key)
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    description: "Fast and efficient, good for most tasks",
    requiresSetup: true,
    working: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Most capable model, best for complex tasks",
    requiresSetup: true,
    working: true,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    description: "Fast and cost-effective",
    requiresSetup: true,
    working: true,
  },

  // OpenRouter Free Models (WORKING - tested and confirmed)
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B (Free)",
    provider: "openrouter",
    description: "Meta's latest Llama model - completely free ✅",
    free: true,
    working: true,
  },
  {
    id: "meta-llama/llama-3.2-1b-instruct:free",
    name: "Llama 3.2 1B (Free)",
    provider: "openrouter",
    description: "Smaller, faster Llama model - completely free ✅",
    free: true,
    working: true,
  },
  {
    id: "google/gemma-2-9b-it:free",
    name: "Gemma 2 9B (Free)",
    provider: "openrouter",
    description: "Google's Gemma 2 model - completely free ✅",
    free: true,
    working: true,
  },

  // OpenRouter Models (require API key but may have issues)
  {
    id: "meta-llama/llama-3.2-11b-vision-instruct:free",
    name: "Llama 3.2 11B Vision (Free)",
    provider: "openrouter",
    description: "Vision-capable Llama model - free but may be unstable",
    free: true,
    working: false, // Mark as potentially problematic
  },
  {
    id: "google/gemma-2-27b-it:free",
    name: "Gemma 2 27B (Free)",
    provider: "openrouter",
    description: "Larger Gemma model - free but may be rate limited",
    free: true,
    working: false,
  },

  // Ollama Local Models (require Ollama to be running)
  {
    id: "llama3.2:3b",
    name: "Llama 3.2 3B (Local)",
    provider: "ollama",
    description: "Local Llama 3.2 3B model - requires 'ollama pull llama3.2:3b'",
    free: true,
    requiresSetup: true,
    working: true,
  },
  {
    id: "llama3.2:1b",
    name: "Llama 3.2 1B (Local)",
    provider: "ollama",
    description: "Local Llama 3.2 1B model - requires 'ollama pull llama3.2:1b'",
    free: true,
    requiresSetup: true,
    working: true,
  },
  {
    id: "llama3.1:8b",
    name: "Llama 3.1 8B (Local)",
    provider: "ollama",
    description: "Local Llama 3.1 8B model - requires 'ollama pull llama3.1:8b'",
    free: true,
    requiresSetup: true,
    working: true,
  },
  {
    id: "mistral:7b",
    name: "Mistral 7B (Local)",
    provider: "ollama",
    description: "Local Mistral 7B model - requires 'ollama pull mistral:7b'",
    free: true,
    requiresSetup: true,
    working: true,
  },
  {
    id: "codellama:7b",
    name: "Code Llama 7B (Local)",
    provider: "ollama",
    description: "Local Code Llama for programming - requires 'ollama pull codellama:7b'",
    free: true,
    requiresSetup: true,
    working: true,
  },
  {
    id: "qwen2.5:7b",
    name: "Qwen 2.5 7B (Local)",
    provider: "ollama",
    description: "Local Qwen 2.5 model - requires 'ollama pull qwen2.5:7b'",
    free: true,
    requiresSetup: true,
    working: true,
  },
]

interface ChatState {
  // Current session
  currentSession: ChatSession | null
  messages: Message[]

  // All sessions
  sessions: ChatSession[]

  // UI state
  isLoading: boolean
  isStreaming: boolean
  selectedModel: string
  selectedProvider: AIProvider

  // Actions
  setCurrentSession: (session: ChatSession | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  setSessions: (sessions: ChatSession[]) => void
  addSession: (session: ChatSession) => void
  updateSession: (id: string, updates: Partial<ChatSession>) => void
  deleteSession: (id: string) => void
  setIsLoading: (loading: boolean) => void
  setIsStreaming: (streaming: boolean) => void
  setSelectedModel: (model: string) => void
  setSelectedProvider: (provider: AIProvider) => void
  clearCurrentChat: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state - default to a working free OpenRouter model
      currentSession: null,
      messages: [],
      sessions: [],
      isLoading: false,
      isStreaming: false,
      selectedModel: "meta-llama/llama-3.2-3b-instruct:free", // Confirmed working
      selectedProvider: "openrouter",

      // Actions
      setCurrentSession: (session) => set({ currentSession: session }),

      setMessages: (messages) => set({ messages }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      updateLastMessage: (content) =>
        set((state) => {
          const messages = [...state.messages]
          if (messages.length > 0) {
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              content,
            }
          }
          return { messages }
        }),

      setSessions: (sessions) => set({ sessions }),

      addSession: (session) =>
        set((state) => ({
          sessions: [session, ...state.sessions],
        })),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((session) => (session.id === id ? { ...session, ...updates } : session)),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== id),
          currentSession: state.currentSession?.id === id ? null : state.currentSession,
          messages: state.currentSession?.id === id ? [] : state.messages,
        })),

      setIsLoading: (isLoading) => set({ isLoading }),
      setIsStreaming: (isStreaming) => set({ isStreaming }),
      setSelectedModel: (selectedModel) => {
        const model = AVAILABLE_MODELS.find((m) => m.id === selectedModel)
        if (model) {
          set({ selectedModel, selectedProvider: model.provider })
        }
      },
      setSelectedProvider: (selectedProvider) => set({ selectedProvider }),

      clearCurrentChat: () =>
        set({
          currentSession: null,
          messages: [],
        }),
    }),
    {
      name: "chat-store",
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        selectedProvider: state.selectedProvider,
        sessions: state.sessions,
      }),
    },
  ),
)
