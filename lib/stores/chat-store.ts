import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createClient } from "@/lib/supabase/client"
import { v4 as uuidv4 } from 'uuid'

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  session_id: string
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  provider: string;
  created_at: Date;
  updated_at: Date;
  message_count: number;
  user_id: string;
}

export type AIProvider = "openai" | "openrouter" | "ollama"

export interface ModelOption {
  id: string
  name: string
  provider: AIProvider
  description: string
  free?: boolean
  requiresSetup?: boolean
  working?: boolean
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
    description: "Meta's latest Llama model - completely free ",
    free: true,
    working: true,
  },
  {
    id: "meta-llama/llama-3.2-1b-instruct:free",
    name: "Llama 3.2 1B (Free)",
    provider: "openrouter",
    description: "Smaller, faster Llama model - completely free ",
    free: true,
    working: true,
  },
  {
    id: "google/gemma-2-9b-it:free",
    name: "Gemma 2 9B (Free)",
    provider: "openrouter",
    description: "Google's Gemma 2 model - completely free ",
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
    working: false,
  },
  {
    id: "google/gemma-2-27b-it:free",
    name: "Gemma 2 27B (Free)",
    provider: "openrouter",
    description: "Larger Gemma model - free but may be rate limited",
    free: true,
    working: false,
  },

  // Ollama Local Models (require Ollama to be running) - Updated with your available models
  {
    id: "mistral:7b",
    name: "Mistral 7B (Local)",
    provider: "ollama",
    description: "Local Mistral 7B model - you have this installed ",
    free: true,
    requiresSetup: true,
    working: true,
  },
  {
    id: "mistral:latest",
    name: "Mistral Latest (Local)",
    provider: "ollama",
    description: "Local Mistral latest model - you have this installed ",
    free: true,
    requiresSetup: true,
    working: true,
  },
  {
    id: "qwen:7b",
    name: "Qwen 7B (Local)",
    provider: "ollama",
    description: "Local Qwen 7B model - you have this installed ",
    free: true,
    requiresSetup: true,
    working: true,
  },
  {
    id: "llama3:latest",
    name: "Llama 3 Latest (Local)",
    provider: "ollama",
    description: "Local Llama 3 latest model - you have this installed ",
    free: true,
    requiresSetup: true,
    working: true,
  },
  {
    id: "phi:latest",
    name: "Phi Latest (Local)",
    provider: "ollama",
    description: "Local Phi latest model - you have this installed ",
    free: true,
    requiresSetup: true,
    working: true,
  },
  // Additional common models that might be pulled
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
    id: "codellama:7b",
    name: "Code Llama 7B (Local)",
    provider: "ollama",
    description: "Local Code Llama for programming - requires 'ollama pull codellama:7b'",
    free: true,
    requiresSetup: true,
    working: true,
  },
]

interface ChatState {
  currentSession: ChatSession | null
  messages: Message[]
  sessions: ChatSession[]
  isLoading: boolean
  isStreaming: boolean
  selectedModel: string
  selectedProvider: AIProvider
  ollamaUrl: string
  apiKeys: {
    openai?: string
    openrouter?: string
    ollama?: string
  }
  user: {
    id: string
  }
  validateModelName: (modelName: string) => boolean
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
  setOllamaUrl: (url: string) => void
  setApiKey: (provider: keyof ChatState['apiKeys'], key: string) => void
  clearApiKey: (provider: keyof ChatState['apiKeys']) => void
  clearCurrentChat: () => void
  streamMessage: (message: string) => Promise<void>
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state - default to a working free OpenRouter model
      currentSession: null as ChatSession | null,
      messages: [] as Message[],
      sessions: [] as ChatSession[],
      isLoading: false,
      isStreaming: false,
      selectedModel: "meta-llama/llama-3.2-3b-instruct:free",
      selectedProvider: "openrouter" as AIProvider,
      ollamaUrl: "http://localhost:11434",
      apiKeys: {
        openai: "",
        openrouter: "",
        ollama: ""
      } as const,
      user: {
        id: ""
      },
      validateModelName: (modelName: string): boolean => {
        // Get the current provider from the store state
        const state = get();
        const provider = state.selectedProvider;

        // For Ollama models, allow both formats:
        // 1. Full format: model:tag (e.g., mistral:latest)
        // 2. Just model name (e.g., mistral)
        if (provider === 'ollama') {
          // Allow just model name or model:tag format
          return modelName.length > 0 && /^[a-zA-Z0-9-_]+(:[a-zA-Z0-9-_]+)?$/.test(modelName);
        }
        
        // For other providers, maintain original validation
        return modelName.includes('/') && modelName.length > 5;
      },
      setCurrentSession: (session: ChatSession | null) => set({ currentSession: session }),
      setMessages: (messages: Message[]) => set({ messages }),
      addMessage: (message: Message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      updateLastMessage: (content: string) =>
        set((state) => {
          const lastMessage = state.messages[state.messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            const updatedMessages = [...state.messages];
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              content,
            };
            return { messages: updatedMessages };
          }
          return state;
        }),
      setSessions: (sessions: ChatSession[]) => set({ sessions }),
      addSession: (session: ChatSession) =>
        set((state) => ({
          sessions: [...state.sessions, session],
        })),
      updateSession: (id: string, updates: Partial<ChatSession>) =>
        set((state) => {
          const updatedSessions = state.sessions.map(s => 
            s.id === id ? { ...s, ...updates } : s
          );
          
          // If this is the current session, update it as well
          const updatedCurrentSession = state.currentSession?.id === id
            ? { ...state.currentSession, ...updates }
            : state.currentSession;

          return {
            sessions: updatedSessions,
            currentSession: updatedCurrentSession
          };
        }),
      deleteSession: (id: string) =>
        set((state) => ({
          sessions: state.sessions.filter(s => s.id !== id),
        })),
      setIsLoading: (loading: boolean) => set({ isLoading: loading }),
      setIsStreaming: (streaming: boolean) => set({ isStreaming: streaming }),
      setSelectedModel: (modelName: string) => {
        const isValid = get().validateModelName(modelName);
        if (isValid) {
          set({ selectedModel: modelName });
        }
      },
      setSelectedProvider: (provider: AIProvider) => set({ selectedProvider: provider }),
      setOllamaUrl: (url: string) => set({ ollamaUrl: url }),
      setApiKey: (provider: keyof ChatState['apiKeys'], key: string) => 
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key }
        })),
      clearApiKey: (provider: keyof ChatState['apiKeys']) => 
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: '' }
        })),
      clearCurrentChat: () =>
        set({
          currentSession: null,
          messages: [],
          isLoading: false,
          isStreaming: false
        }),
      streamMessage: async (userMessage: string) => {
        const state = get();
        const { selectedModel, selectedProvider, apiKeys, currentSession, user, ollamaUrl } = state;
        
        if (!selectedModel) {
          throw new Error('No model selected');
        }

        const providerKey = apiKeys[selectedProvider];
        if (selectedProvider !== 'ollama' && !providerKey) {
          throw new Error('API key required for selected provider');
        }

        set({ isLoading: true, isStreaming: true });
        let streamingContent: string = '';
        let assistantMessage: Message | null = null;

        try {
          assistantMessage = {
            id: uuidv4(),
            role: "assistant" as const,
            content: '',
            timestamp: new Date(),
            session_id: currentSession?.id || uuidv4()
          };

          if (!assistantMessage) {
            throw new Error('Failed to create assistant message');
          }

          // Add user message to the conversation
          const userMessageObj: Message = {
            id: uuidv4(),
            role: "user",
            content: userMessage,
            timestamp: new Date(),
            session_id: currentSession?.id || uuidv4()
          };

          // Add both messages to the state
          set({ messages: [...state.messages, userMessageObj, assistantMessage] });

          // Prepare the API request
          const apiUrl = selectedProvider === 'ollama' 
            ? `${ollamaUrl || 'http://localhost:11434'}/api/generate`
            : ''; // Handle other providers if needed

          const requestBody = {
            model: selectedModel,
            prompt: userMessage,
            stream: true
          };

          // Make the API request
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(selectedProvider !== 'ollama' && { 'Authorization': `Bearer ${providerKey}` })
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate response');
          }

          if (!response.body) {
            throw new Error('No response body');
          }

          // Process the streaming response
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                  streamingContent += parsed.response;
                  // Update the message content in real-time
                  set(state => ({
                    messages: state.messages.map(msg => 
                      msg.id === assistantMessage!.id 
                        ? { ...msg, content: streamingContent }
                        : msg
                    )
                  }));
                }
              } catch (e) {
                console.warn('Failed to parse chunk:', e);
              }
            }
          }

        } catch (error) {
          console.error('Streaming error:', error);
          // Clear the streaming message on error
          set({
            messages: state.messages.filter(msg => msg.id !== assistantMessage!.id)
          });
          throw error;
        } finally {
          // Ensure streaming state is cleared
          set({ isLoading: false, isStreaming: false });
          
          // Save the final message
          if (assistantMessage && streamingContent && user && currentSession) {
            try {
              const supabase = createClient();
              await supabase.from("chat_messages").insert({
                session_id: currentSession.id,
                role: "assistant",
                content: streamingContent,
                user_id: user.id
              });
            } catch (saveError) {
              console.error('Failed to save message:', saveError);
            }
          }
        }
      }
    }),
    {
      name: "chat-store",
      partialize: (state: ChatState) => ({
        selectedModel: state.selectedModel,
        selectedProvider: state.selectedProvider,
        apiKeys: state.apiKeys,
        ollamaUrl: state.ollamaUrl
      })
    }
  )
)
