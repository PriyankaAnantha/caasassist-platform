"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChatHeader } from "@/components/chat-header"
import { ChatHistory } from "@/components/chat-history"
import { DocumentManager } from "@/components/document-manager"
import { MarkdownRenderer } from "./markdown-renderer"
import { OllamaSetup } from "@/components/ollama-setup"
import { useChatStore } from "@/lib/stores/chat-store"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { Send, Square, Bot, User, Loader2, FileText, AlertCircle, RefreshCw, Bug } from "lucide-react"
import { useChat } from "ai/react"
import { SetupChecker } from "@/components/setup-checker"
import { DebugPanel } from "@/components/debug-panel"

export function ChatInterface() {
  const { user } = useAuth()
  const [showHistory, setShowHistory] = useState(false)
  const [showDocuments, setShowDocuments] = useState(false)
  const [connectionError, setConnectionError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [fallbackMode, setFallbackMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const {
    currentSession,
    messages: storeMessages,
    isStreaming: isStreamingGlobal,
    selectedModel,
    selectedProvider,
    ollamaUrl,
    setCurrentSession,
    setMessages,
    addMessage,
    setIsStreaming: setGlobalIsStreaming,
    clearCurrentChat,
  } = useChatStore()
  
  // Local state for streaming to handle UI updates more responsively
  const [isStreaming, setIsStreaming] = useState(false)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages: setChatMessages,
    error,
    reload,
  } = useChat({
    api: "/api/chat",
    body: {
      model: selectedProvider === "ollama" ? (selectedModel.includes(':') ? selectedModel : `${selectedModel}:latest`) : selectedModel,
      provider: selectedProvider,
      sessionId: currentSession?.id,
      ollamaUrl: selectedProvider === "ollama" ? ollamaUrl : undefined,
    },
    headers: {
      "Content-Type": "application/json",
    },
    onFinish: async (message) => {
      console.log("Chat finished successfully")
      setIsStreaming(false)
      setGlobalIsStreaming(false)
      setConnectionError("")
      setRetryCount(0)
      setFallbackMode(false)

      // Save message to database
      if (currentSession && user) {
        try {
          await saveMessage(message.content, "assistant", currentSession.id)
        } catch (saveError) {
          console.error("Failed to save message:", saveError)
        }
      }
    },
    onError: async (rawError: unknown) => {
      console.error("=== CHAT ERROR HANDLER TRIGGERED ===");
      console.error("Raw error:", rawError);
      
      setIsStreaming(false)
      setGlobalIsStreaming(false)
      
      // Default error details
      let errorDetails = { 
        message: 'An unknown error occurred', 
        details: '', 
        suggestion: 'Please try again later', 
        type: 'unknown_error' 
      }
      
      try {
        // Handle Response objects (API errors)
        if (rawError && typeof rawError === 'object' && 'json' in rawError) {
          try {
            // Safely cast to Response-like object
            const errorResponse = rawError as { json: () => Promise<any>; status?: number; statusText?: string }
            const errorData = await errorResponse.json()
            console.log("Error response data:", errorData)
            
            errorDetails = {
              message: errorData.error || 'API Error',
              details: errorData.details || `Status: ${errorResponse.status} ${errorResponse.statusText}`,
              suggestion: errorData.suggestion || 'Please check your connection and try again',
              type: errorData.type || 'api_error'
            }
          } catch (parseError) {
            console.error("Error parsing error response:", parseError)
            errorDetails = {
              message: 'Invalid server response',
              details: 'The server returned an invalid response format',
              suggestion: 'Please check the server logs',
              type: 'invalid_response'
            }
          }
        } 
        // Handle Error objects
        else if (rawError instanceof Error) {
          console.error("Error object:", rawError)
          errorDetails = {
            message: rawError.message || 'An error occurred',
            details: rawError.stack ? rawError.stack.split('\n').slice(0, 3).join('\n') : '',
            suggestion: 'Please check your network connection and try again',
            type: 'client_error'
          }
          
          // Handle common network errors
          if (rawError.message.includes('Failed to fetch') || 
              rawError.message.includes('NetworkError') ||
              rawError.message.includes('ECONNREFUSED')) {
            errorDetails.message = 'Connection failed'
            errorDetails.details = 'Could not connect to the server'
            errorDetails.suggestion = 'Please check if the server is running and accessible'
            errorDetails.type = 'connection_error'
          }
        } else {
          console.error("Unknown error format:", rawError)
        }
      } catch (error) {
        console.error('Critical error in error handler:', error)
        errorDetails = {
          message: 'Critical error',
          details: 'An unexpected error occurred while processing the error',
          suggestion: 'Please refresh the page and try again',
          type: 'critical_error'
        }
      }

      // Safe error logging to prevent serialization issues
      try {
        console.error("=== Chat Error Details ===")
        // Safely stringify the raw error for logging
        const safeRawError = rawError instanceof Error 
          ? { 
              name: rawError.name, 
              message: rawError.message, 
              stack: rawError.stack,
              // Add any other safe properties
              ...(rawError as any).cause ? { cause: String((rawError as any).cause) } : {}
            } 
          : typeof rawError === 'object' 
            ? JSON.parse(JSON.stringify(rawError, (key, value) => 
                typeof value === 'bigint' ? value.toString() : value
              ))
            : rawError
            
        console.error("Raw error:", safeRawError)
        console.error("Error details:", errorDetails)
      } catch (logError) {
        console.error("Error while logging error:", logError)
      }

      const debugData = {
        error: {
          message: errorDetails.message || 'Unknown error',
          details: errorDetails.details,
          type: errorDetails.type,
          name: (rawError && typeof rawError === 'object' && 'name' in rawError) 
            ? String(rawError.name) 
            : 'UnknownError',
          stack: (rawError instanceof Error && rawError.stack) 
            ? rawError.stack.toString() 
            : undefined,
        },
        context: {
          timestamp: new Date().toISOString(),
          provider: selectedProvider,
          model: selectedModel,
          isOllama: selectedProvider === 'ollama',
          ollamaUrl: selectedProvider === 'ollama' ? ollamaUrl : undefined
        },
      }
      setDebugInfo(debugData)

      // Set user-friendly error messages
      let errorMessage = errorDetails.message || "Something went wrong with the AI response"
      let suggestion = errorDetails.suggestion || ""

      // Handle Ollama-specific errors
      if (selectedProvider === "ollama") {
        if (errorDetails.type === 'ollama_connection_error') {
          // Use the error details from the server
          errorMessage = errorDetails.message || "Ollama connection failed"
          suggestion = errorDetails.suggestion || "Make sure Ollama is running and accessible"
        } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
          errorMessage = "Could not connect to Ollama server"
          suggestion = `Make sure Ollama is running at ${ollamaUrl || 'http://localhost:11434'}`
        } else if (errorMessage.includes('model not found')) {
          errorMessage = `Model "${selectedModel}" not found in Ollama`
          suggestion = `Run: ollama pull ${selectedModel}`
        } else {
          errorMessage = errorMessage || "Ollama error occurred"
          suggestion = "Check the Ollama server logs for more details"
        }
      } 
      // Handle other provider errors
      else if (errorMessage.includes("API key") || errorMessage.includes("401")) {
        errorMessage = `${selectedProvider} API key issue`
        suggestion = "Check your API key configuration"
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        errorMessage = "Rate limit exceeded"
        suggestion = "Please wait and try again"
      } else if (errorMessage.includes("quota") || errorMessage.includes("402")) {
        errorMessage = "API quota exceeded"
        suggestion = "Check your billing settings"
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        errorMessage = "Network error"
        suggestion = "Check your internet connection"
      }

      const full = suggestion ? `${errorMessage}. ${suggestion}` : errorMessage
      setConnectionError(full)
    },
  })

  const saveMessage = async (content: string, role: "user" | "assistant", sessionId: string) => {
    if (!user || !sessionId) return

    try {
      const { error } = await supabase.from("chat_messages").insert({
        session_id: sessionId,
        role,
        content,
        user_id: user.id,
      })

      if (error) throw error
    } catch (error) {
      console.error("Error saving message:", error)
      throw error
    }
  }

  const createNewSession = async () => {
    if (!user) {
      setConnectionError("User not authenticated")
      return
    }

    try {
      console.log("Creating new session...")

      const sessionData = {
        title: "New Chat",
        model: selectedModel,
        user_id: user.id,
      }

      // Try to create with provider column first
      let { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          ...sessionData,
          provider: selectedProvider,
        })
        .select()
        .single()

      // Fallback without provider if column doesn't exist
      if (error && error.message?.includes("provider")) {
        console.log("Provider column not found, creating session without provider")
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("chat_sessions")
          .insert(sessionData)
          .select()
          .single()

        if (fallbackError) throw fallbackError
        data = fallbackData
      } else if (error) {
        throw error
      }

      const newSession = {
        id: data.id,
        title: data.title,
        model: data.model,
        provider: data.provider || selectedProvider,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
        message_count: 0,
      }

      console.log("Session created successfully:", newSession.id)
      setCurrentSession(newSession)
      setChatMessages([])
      setMessages([])
      setConnectionError("")
      setDebugInfo(null)
      setRetryCount(0)
      setFallbackMode(false)
    } catch (error: any) {
      console.error("Error creating session:", error)
      setConnectionError(`Failed to create chat session: ${error.message}`)
    }
  }

  const testChatAPI = async () => {
    console.log("Testing chat API...")
    setConnectionError("Testing API...")
    setDebugInfo(null)

    try {
      const simpleResponse = await fetch("/api/chat/simple-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "test" }],
          model: selectedModel,
          provider: selectedProvider,
        }),
      })

      const simpleResult = await simpleResponse.json()
      console.log("Simple test result:", simpleResult)

      if (simpleResult.success) {
        setConnectionError("✅ Basic API test successful!")
        setTimeout(() => setConnectionError(""), 3000)
      } else {
        setConnectionError(`❌ API test failed: ${simpleResult.error}`)
        setDebugInfo(simpleResult)
      }
    } catch (error: any) {
      console.error("API test error:", error)
      setConnectionError(`❌ API test error: ${error.message}`)
      setDebugInfo({ testError: error.message })
    }
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!input.trim()) return

    console.log("Submitting message...")

    // Clear any previous errors
    setConnectionError("")
    setDebugInfo(null)

    // Create session if none exists
    if (!currentSession) {
      console.log("No current session, creating new one...")
      await createNewSession()
      return
    }

    setIsStreaming(true)

    // Save user message first
    if (user) {
      try {
        await saveMessage(input, "user", currentSession.id)
      } catch (saveError) {
        console.error("Failed to save user message:", saveError)
      }
    }

    // Submit to AI SDK
    try {
      setIsStreaming(true)
      setGlobalIsStreaming(true)
      handleSubmit(e)
    } catch (submitError) {
      console.error("Submit error:", submitError)
      setIsStreaming(false)
      setGlobalIsStreaming(false)
      setConnectionError("Failed to submit message")
    }
  }

  const handleRetry = () => {
    console.log("Retrying chat...")
    setConnectionError("")
    setDebugInfo(null)

    if (messages.length > 0) {
      try {
        reload()
      } catch (reloadError) {
        console.error("Reload error:", reloadError)
        setConnectionError("Failed to retry")
      }
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize session when user is available
  useEffect(() => {
    if (user && !isInitialized) {
      console.log("Initializing chat interface for user:", user.id)
      setIsInitialized(true)

      if (!currentSession) {
        createNewSession()
      }
    }
    
    // Sync local streaming state with global state
    if (isStreaming !== isStreamingGlobal) {
      setIsStreaming(isStreamingGlobal)
    }
  }, [user, isInitialized, currentSession, isStreamingGlobal])

  // Show loading state while initializing
  if (!user || !isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Initializing chat...</p>
        </div>
      </div>
    )
  }

  const loadSessionMessages = async (sessionId: string) => {
    try {
      console.log("Loading messages for session:", sessionId)

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error loading messages:", error)
        return
      }

      interface Message {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        created_at: string;
        session_id: string;
      }

      const dbMessages = (data || [] as Message[]).map((msg: Message) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        session_id: msg.session_id,
      }))

      console.log(`Loaded ${dbMessages.length} messages for session`)

      // Convert to AI SDK format and set both stores
      const aiMessages = dbMessages.map((msg: { id: string; role: 'user' | 'assistant'; content: string }) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: new Date(),
      }))

      console.log("Setting messages in both stores:", aiMessages.length)
      setChatMessages(aiMessages) // Set AI SDK messages
      setMessages(dbMessages) // Set store messages
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const handleSessionSelect = async (session: any) => {
    console.log("=== Session Selection Started ===")
    console.log("Selected session:", session.id)

    // Set current session first
    setCurrentSession(session)

    // Clear current messages first
    console.log("Clearing current messages...")
    setChatMessages([])
    setMessages([])

    // Small delay to ensure state is cleared
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Then load the session messages
    console.log("Loading session messages...")
    await loadSessionMessages(session.id)

    console.log("=== Session Selection Complete ===")
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Chat History Sidebar */}
      <ChatHistory
        open={showHistory}
        onOpenChange={setShowHistory}
        onNewChat={createNewSession}
        onSessionSelect={handleSessionSelect}
      />

      {/* Document Manager Sidebar */}
      <DocumentManager open={showDocuments} onOpenChange={setShowDocuments} />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <ChatHeader
          onToggleHistory={() => setShowHistory(!showHistory)}
          onToggleDocuments={() => setShowDocuments(!showDocuments)}
        />

        {/* Ollama Setup */}
        <OllamaSetup />

        {/* Connection Error Alert */}
        {connectionError && (
          <div className="px-4 py-2">
            <Alert variant={connectionError.includes("✅") ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="flex-1">{connectionError}</span>
                <div className="flex gap-2 ml-2">
                  {retryCount < 3 && !connectionError.includes("✅") && (
                    <Button variant="ghost" size="sm" onClick={handleRetry}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={testChatAPI}>
                    <Bug className="h-3 w-3 mr-1" />
                    Test
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConnectionError("")}>
                    ×
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <div className="px-4 py-2">
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertDescription>
                <details className="text-xs">
                  <summary className="cursor-pointer">Debug Information (Click to expand)</summary>
                  <pre className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-4">
            <div className="max-w-4xl mx-auto py-6 space-y-6">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Welcome to CaaSAssist</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Start a conversation or upload documents to get started
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mb-4">
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Document Q&A
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    >
                      <Bot className="w-3 h-3 mr-1" />
                      AI Assistant
                    </Badge>
                  </div>

                  {/* Status info */}
                  <div className="text-sm text-gray-500 mb-4">
                    <p>Model: {selectedModel}</p>
                    <p>Provider: {selectedProvider}</p>
                    {currentSession && <p>Session: {currentSession.id.substring(0, 8)}...</p>}
                  </div>

                  {/* Quick test button */}
                  <Button variant="outline" size="sm" onClick={testChatAPI} className="mt-2 bg-transparent">
                    <Bug className="w-4 h-4 mr-2" />
                    Test Chat API
                  </Button>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600">
                        <AvatarFallback>
                          <Bot className="w-4 h-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <Card
                      className={`max-w-[80%] p-4 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                          : "bg-white dark:bg-gray-800 border-blue-200/50"
                      }`}
                    >
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <MarkdownRenderer content={message.content} />
                      </div>
                    </Card>

                    {message.role === "user" && (
                      <Avatar className="w-8 h-8 bg-gray-200 dark:bg-gray-700">
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <Avatar className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600">
                    <AvatarFallback>
                      <Bot className="w-4 h-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <Card className="max-w-[80%] p-4 bg-white dark:bg-gray-800 border-blue-200/50">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">AI is thinking...</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="border-t border-blue-200/50 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 dark:border-gray-700/50 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={onSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask me anything about your documents..."
                className="flex-1 bg-white dark:bg-gray-800 border-blue-200/50"
                disabled={isLoading || !currentSession}
              />
              {isLoading ? (
                <Button
                  type="button"
                  onClick={stop}
                  variant="outline"
                  size="icon"
                  className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                >
                  <Square className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || !currentSession}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </form>
          </div>
        </div>
      </div>
      {/* Setup Checker */}
      <SetupChecker />
      {/* Debug Panel */}
      <DebugPanel />
    </div>
  )
}
