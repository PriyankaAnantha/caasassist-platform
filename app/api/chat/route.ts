import { openai } from "@ai-sdk/openai"
import { createOpenAI } from "@ai-sdk/openai"
import { streamText } from "ai"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const maxDuration = 30

// Create OpenRouter client
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "CaaSAssist",
  },
})

// Create Ollama client
const ollama = createOpenAI({
  apiKey: "ollama", // Ollama doesn't need a real API key
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
})

export async function POST(req: Request) {
  console.log("=== Chat API Request Started ===")

  try {
    // Parse request body
    const body = await req.json()
    const { messages, model = "gpt-4o-mini", provider = "openai", sessionId } = body

    console.log("Request details:", {
      messagesCount: messages?.length,
      model,
      provider,
      sessionId,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      ollamaUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    })

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("Invalid messages:", messages)
      return new Response(
        JSON.stringify({
          error: "Messages are required and must be a non-empty array",
          details: "Please provide at least one message",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Validate provider
    const validProviders = ["openai", "openrouter", "ollama"]
    if (!validProviders.includes(provider)) {
      return new Response(
        JSON.stringify({
          error: `Invalid provider: ${provider}`,
          details: `Valid providers: ${validProviders.join(", ")}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Check API keys based on provider
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "OpenAI API key not configured",
          details: "Please add OPENAI_API_KEY to your environment variables",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "OpenRouter API key required",
          details:
            "Please add OPENROUTER_API_KEY to your environment variables. Get one free at https://openrouter.ai/",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Initialize Supabase and check authentication
    let supabase
    let session
    try {
      supabase = await createServerSupabaseClient()

      // Use getUser() instead of getSession() for better security
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("Auth error:", userError)
        return new Response(
          JSON.stringify({
            error: "Authentication failed",
            details: "Please sign in again",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // Create a session object for compatibility
      session = { user }
    } catch (supabaseError: any) {
      console.error("Supabase error:", supabaseError)
      return new Response(
        JSON.stringify({
          error: "Database connection failed",
          details: supabaseError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Clean and validate messages
    const cleanMessages = messages
      .filter((msg: any) => msg && typeof msg === "object" && msg.role && msg.content)
      .map((msg: any) => ({
        role: msg.role === "user" || msg.role === "assistant" ? msg.role : "user",
        content: String(msg.content || "").trim(),
      }))
      .filter((msg: any) => msg.content.length > 0)

    if (cleanMessages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No valid messages found",
          details: "Please provide messages with valid content",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log(`Processing ${cleanMessages.length} messages with ${provider}:${model}`)

    // Build system prompt
    let systemPrompt = `You are CaaSAssist, a helpful AI assistant. You are knowledgeable, friendly, and professional. 

You can help with:
- General knowledge questions
- Document analysis and Q&A (when documents are uploaded)
- Programming and technical questions
- Writing and content creation

Provide clear, helpful, and accurate responses. If you're referencing uploaded documents, mention that clearly.`

    // Enhanced document context retrieval
    let documentContext = ""
    try {
      const lastUserMessage = cleanMessages[cleanMessages.length - 1]
      if (lastUserMessage && lastUserMessage.role === "user") {
        console.log("=== DOCUMENT SEARCH DEBUG ===")
        console.log("User message:", lastUserMessage.content)

        // First, check if user has any completed documents
        const { data: userDocs, error: docsError } = await supabase
          .from("documents")
          .select("id, name, status, chunk_count")
          .eq("user_id", session.user.id)

        console.log("User documents query result:", { userDocs, docsError })

        if (docsError) {
          console.log("Error fetching user documents:", docsError)
        } else if (userDocs && userDocs.length > 0) {
          console.log(`Found ${userDocs.length} documents for user:`)
          userDocs.forEach((doc) => {
            console.log(`- ${doc.name} (${doc.status}, ${doc.chunk_count} chunks)`)
          })

          const completedDocs = userDocs.filter((doc) => doc.status === "completed")
          console.log(`${completedDocs.length} completed documents`)

          if (completedDocs.length > 0) {
            // Get all chunks for completed documents
            const { data: allChunks, error: chunksError } = await supabase
              .from("document_chunks")
              .select("content, metadata, document_id")
              .eq("user_id", session.user.id)
              .limit(10) // Get more chunks for better context

            console.log("Document chunks query result:", {
              chunksCount: allChunks?.length || 0,
              chunksError,
            })

            if (chunksError) {
              console.log("Error fetching document chunks:", chunksError)
            } else if (allChunks && allChunks.length > 0) {
              console.log(`Found ${allChunks.length} document chunks`)

              // Simple keyword matching for now
              const userQuery = lastUserMessage.content.toLowerCase()
              const keywords = userQuery.split(" ").filter((word) => word.length > 3)
              console.log("Search keywords:", keywords)

              let relevantChunks = allChunks

              // If we have keywords, try to find relevant chunks
              if (keywords.length > 0) {
                relevantChunks = allChunks.filter((chunk) => {
                  const chunkContent = chunk.content.toLowerCase()
                  return keywords.some((keyword) => chunkContent.includes(keyword))
                })

                console.log(`Found ${relevantChunks.length} relevant chunks using keywords`)
              }

              // If no relevant chunks found, use first few chunks as general context
              if (relevantChunks.length === 0) {
                relevantChunks = allChunks.slice(0, 3)
                console.log(`No keyword matches, using first ${relevantChunks.length} chunks as general context`)
              }

              // Build document context
              if (relevantChunks.length > 0) {
                documentContext = relevantChunks
                  .slice(0, 5) // Limit to 5 chunks max
                  .map((chunk, index) => {
                    const docName = userDocs.find((doc) => doc.id === chunk.document_id)?.name || "Unknown Document"
                    return `[Document: ${docName}]\n${chunk.content}`
                  })
                  .join("\n\n")
                  .substring(0, 2000) // Limit total context size

                console.log(`Built document context (${documentContext.length} characters)`)
                console.log("Document context preview:", documentContext.substring(0, 200) + "...")

                systemPrompt += `\n\n=== RELEVANT DOCUMENT CONTEXT ===\nThe user has uploaded documents. Here is relevant content from their documents:\n\n${documentContext}\n\n=== END DOCUMENT CONTEXT ===\n\nWhen answering, reference the document content when relevant and mention which document you're referencing.`
              }
            } else {
              console.log("No document chunks found - documents may not be processed yet")
            }
          } else {
            console.log("No completed documents found")
          }
        } else {
          console.log("No documents found for user")
        }

        console.log("=== END DOCUMENT SEARCH DEBUG ===")
      }
    } catch (docError) {
      console.error("Document context error:", docError)
      // Continue without document context
    }

    // Select AI client and model
    let aiClient
    let aiModel
    let maxTokens = 1000

    try {
      switch (provider) {
        case "openai":
          aiClient = openai
          aiModel = model
          break

        case "openrouter":
          // Enhanced OpenRouter client with better error handling
          const openrouterClient = createOpenAI({
            apiKey: process.env.OPENROUTER_API_KEY!,
            baseURL: "https://openrouter.ai/api/v1",
            headers: {
              "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              "X-Title": "CaaSAssist",
            },
          })
          aiClient = openrouterClient
          aiModel = model
          maxTokens = 1500 // Reduced for better reliability
          break

        case "ollama":
          aiClient = ollama
          aiModel = model
          maxTokens = 2000
          break

        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

      console.log("Creating AI stream with:", { provider, model, maxTokens })
      console.log("System prompt length:", systemPrompt.length)

      // Test the API connection first for OpenRouter
      if (provider === "openrouter") {
        try {
          console.log("Testing OpenRouter connection...")
          const testResponse = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              "X-Title": "CaaSAssist",
            },
          })

          if (!testResponse.ok) {
            throw new Error(`OpenRouter API test failed: ${testResponse.status} ${testResponse.statusText}`)
          }
          console.log("OpenRouter connection test passed")
        } catch (testError: any) {
          console.error("OpenRouter connection test failed:", testError)
          return new Response(
            JSON.stringify({
              error: "OpenRouter connection failed",
              details: testError.message,
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          )
        }
      }

      // Test Ollama connection
      if (provider === "ollama") {
        try {
          console.log("Testing Ollama connection...")
          const testResponse = await fetch(`${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/api/tags`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
          })

          if (!testResponse.ok) {
            throw new Error(`Ollama server not responding: ${testResponse.status}`)
          }

          const data = await testResponse.json()
          const availableModels = data.models?.map((m: any) => m.name) || []

          if (!availableModels.includes(model)) {
            throw new Error(
              `Model "${model}" not found. Available models: ${availableModels.join(", ")}. Run: ollama pull ${model}`,
            )
          }

          console.log("Ollama connection test passed, model available")
        } catch (testError: any) {
          console.error("Ollama connection test failed:", testError)
          return new Response(
            JSON.stringify({
              error: "Ollama connection failed",
              details: testError.message,
              suggestion: testError.message.includes("not found")
                ? `Run: ollama pull ${model}`
                : "Make sure Ollama is running with: ollama serve",
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          )
        }
      }

      // Create the stream with enhanced error handling
      const result = await streamText({
        model: aiClient(aiModel),
        system: systemPrompt,
        messages: cleanMessages,
        temperature: 0.7,
        maxTokens,
        // Add timeout and retry settings
        abortSignal: AbortSignal.timeout(30000), // 30 second timeout
      })

      console.log("AI stream created successfully")

      // Return the streaming response with proper headers
      return result.toDataStreamResponse({
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      })
    } catch (aiError: any) {
      console.error("=== AI SERVICE ERROR ===")
      console.error("Provider:", provider)
      console.error("Model:", model)
      console.error("Error:", aiError)
      console.error("Error message:", aiError.message)
      console.error("Error name:", aiError.name)
      console.error("Error stack:", aiError.stack?.substring(0, 500))

      // Handle specific AI errors with detailed messages
      let errorMessage = "AI service error"
      let errorDetails = ""
      let statusCode = 500

      if (provider === "openrouter") {
        if (
          aiError.message?.includes("API key") ||
          aiError.message?.includes("401") ||
          aiError.message?.includes("Unauthorized")
        ) {
          errorMessage = "OpenRouter API key invalid"
          errorDetails = "Your OpenRouter API key is invalid or expired. Get a new one at https://openrouter.ai/"
          statusCode = 401
        } else if (aiError.message?.includes("rate limit") || aiError.message?.includes("429")) {
          errorMessage = "OpenRouter rate limit exceeded"
          errorDetails = "Please wait a moment and try again"
          statusCode = 429
        } else if (aiError.message?.includes("quota") || aiError.message?.includes("402")) {
          errorMessage = "OpenRouter quota exceeded"
          errorDetails = "Check your OpenRouter billing settings"
          statusCode = 402
        } else if (aiError.message?.includes("model") || aiError.message?.includes("404")) {
          errorMessage = "Model not available on OpenRouter"
          errorDetails = `Model "${model}" may be temporarily unavailable. Try: meta-llama/llama-3.2-3b-instruct:free`
          statusCode = 404
        } else if (aiError.message?.includes("timeout") || aiError.name === "TimeoutError") {
          errorMessage = "OpenRouter request timeout"
          errorDetails = "The request took too long. Try again or switch models."
          statusCode = 408
        } else if (aiError.message?.includes("fetch") || aiError.message?.includes("network")) {
          errorMessage = "OpenRouter network error"
          errorDetails = "Cannot connect to OpenRouter. Check your internet connection."
          statusCode = 503
        } else {
          errorMessage = "OpenRouter streaming failed"
          errorDetails = aiError.message || "Unknown OpenRouter error during streaming"
        }
      } else if (provider === "ollama") {
        if (aiError.message?.includes("fetch") || aiError.message?.includes("ECONNREFUSED")) {
          errorMessage = "Ollama server not running"
          errorDetails = "Start Ollama with: ollama serve"
          statusCode = 503
        } else if (aiError.message?.includes("model") || aiError.message?.includes("404")) {
          errorMessage = "Ollama model not found"
          errorDetails = `Model "${model}" not installed. Run: ollama pull ${model}`
          statusCode = 404
        } else {
          errorMessage = "Ollama connection failed"
          errorDetails = aiError.message || "Check if Ollama is running"
        }
      } else if (provider === "openai") {
        if (aiError.message?.includes("API key") || aiError.message?.includes("401")) {
          errorMessage = "Invalid OpenAI API key"
          errorDetails = "Check your OPENAI_API_KEY environment variable"
          statusCode = 401
        } else if (aiError.message?.includes("rate limit") || aiError.message?.includes("429")) {
          errorMessage = "OpenAI rate limit exceeded"
          errorDetails = "Please wait a moment and try again"
          statusCode = 429
        } else if (aiError.message?.includes("quota") || aiError.message?.includes("402")) {
          errorMessage = "OpenAI quota exceeded"
          errorDetails = "Check your OpenAI billing settings"
          statusCode = 402
        } else {
          errorMessage = "OpenAI connection failed"
          errorDetails = aiError.message || "Unknown OpenAI error"
        }
      }

      // If we still have a generic error, provide more details
      if (errorMessage === "AI service error") {
        errorMessage = aiError.message || "Unknown AI service error"
        errorDetails = `Provider: ${provider}, Model: ${model}, Error: ${aiError.name || "Unknown"}`
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: errorDetails,
          provider,
          model,
          timestamp: new Date().toISOString(),
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error: any) {
    console.error("=== CRITICAL CHAT API ERROR ===")
    console.error("Error:", error)
    console.error("Stack:", error.stack)

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message || "Unknown error occurred",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
