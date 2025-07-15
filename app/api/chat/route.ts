import { openai } from "@ai-sdk/openai"
import { createOpenAI } from "@ai-sdk/openai"
import { streamText } from "ai"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const maxDuration = 30

// Helper function to get API client with user-provided keys
function getApiClient(provider: string, apiKey: string, baseUrl?: string) {
  const baseConfig = {
    apiKey: apiKey || "",
    baseURL: baseUrl,
  }

  switch (provider) {
    case 'openrouter':
      return createOpenAI({
        ...baseConfig,
        baseURL: baseUrl || "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "CaaSAssist",
        },
      })
    case 'ollama':
      return createOpenAI({
        ...baseConfig,
        baseURL: baseUrl || "http://localhost:11434/v1",
      })
    case 'openai':
    default:
      return createOpenAI({
        ...baseConfig,
        baseURL: baseUrl || "https://api.openai.com/v1",
      })
  }
}

export async function POST(req: Request) {
  console.log("=== Chat API Request Started ===")

  try {
    // Parse request body
    const body = await req.json()
    const { messages, model = "gpt-4o-mini", provider = "openai", sessionId, ollamaUrl } = body
    
    // Get API keys from headers
    const openaiKey = req.headers.get('x-openai-key') || ''
    const openrouterKey = req.headers.get('x-openrouter-key') || ''
    const ollamaKey = req.headers.get('x-ollama-key') || ''
    const customOllamaUrl = req.headers.get('x-ollama-url') || ''

    console.log("Request details:", {
      messagesCount: messages?.length,
      model,
      provider,
      sessionId,
      ollamaUrl,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
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

Provide clear, helpful, and accurate responses. If you're referencing uploaded documents, mention that clearly.
Remember that you are a technical writing assistant. When responding, format your answers in Markdown using:
Section headings (##)
Short paragraphs instead of bullet points
Code blocks where needed
Clean, readable language like in developer documentation

Avoid raw bullet-point lists unless absolutely necessary. Use clear structure and logical flow.`

    // Enhanced document context retrieval
    let documentContext = ""
    try {
      const lastUserMessage = cleanMessages[cleanMessages.length - 1]
      if (lastUserMessage && lastUserMessage.role === "user") {
        console.log("=== DOCUMENT SEARCH DEBUG ===")
        console.log("User message:", lastUserMessage.content)

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
            const { data: allChunks, error: chunksError } = await supabase
              .from("document_chunks")
              .select("content, metadata, document_id")
              .eq("user_id", session.user.id)
              .limit(10)

            console.log("Document chunks query result:", {
              chunksCount: allChunks?.length || 0,
              chunksError,
            })

            if (chunksError) {
              console.log("Error fetching document chunks:", chunksError)
            } else if (allChunks && allChunks.length > 0) {
              console.log(`Found ${allChunks.length} document chunks`)

              const userQuery = lastUserMessage.content.toLowerCase()
              const keywords = userQuery.split(" ").filter((word) => word.length > 3)
              console.log("Search keywords:", keywords)

              let relevantChunks = allChunks

              if (keywords.length > 0) {
                relevantChunks = allChunks.filter((chunk) => {
                  const chunkContent = chunk.content.toLowerCase()
                  return keywords.some((keyword) => chunkContent.includes(keyword))
                })

                console.log(`Found ${relevantChunks.length} relevant chunks using keywords`)
              }

              if (relevantChunks.length === 0) {
                relevantChunks = allChunks.slice(0, 3)
                console.log(`No keyword matches, using first ${relevantChunks.length} chunks as general context`)
              }

              if (relevantChunks.length > 0) {
                documentContext = relevantChunks
                  .slice(0, 5)
                  .map((chunk, index) => {
                    const docName = userDocs.find((doc) => doc.id === chunk.document_id)?.name || "Unknown Document"
                    return `[Document: ${docName}]\n${chunk.content}`
                  })
                  .join("\n\n")
                  .substring(0, 2000)

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
    }

    // Select AI client and model
    let aiClient
    let aiModel
    let maxTokens = 1000
    let baseUrl = ""

    try {
      switch (provider) {
        case "openai":
          aiClient = openai
          aiModel = model
          maxTokens = 2000
          break

        case "openrouter":
          aiClient = getApiClient("openrouter", openrouterKey, "https://openrouter.ai/api/v1")
          aiModel = model
          maxTokens = 1500
          break

        case "ollama":
          try {
            // Use custom Ollama URL if provided, otherwise use environment variable
            baseUrl = (ollamaUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434").trim()
            // Ensure base URL doesn't end with a slash and doesn't include /v1
            baseUrl = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')
            
            console.log("Using Ollama URL:", baseUrl)

            // First, verify Ollama server is reachable
            const healthCheckUrl = `${baseUrl}/api/tags`
            console.log("Checking Ollama server health at:", healthCheckUrl)
            
            const healthResponse = await fetch(healthCheckUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            })

            if (!healthResponse.ok) {
              const errorText = await healthResponse.text()
              throw new Error(`Ollama server returned ${healthResponse.status}: ${errorText}`)
            }

            // Parse the response to check available models
            const healthData = await healthResponse.json()
            const availableModels = healthData.models?.map((m: any) => m.name) || []
            console.log("Available Ollama models:", availableModels)

            // Determine the model name with fallback
            const targetModel = model.includes(':') ? model : `${model}:latest`
            
            // Check if the requested model is available
            const modelExists = availableModels.some((m: string) => 
              m.toLowerCase() === targetModel.toLowerCase()
            )
            
            if (!modelExists) {
              throw new Error(
                `Model "${targetModel}" not found. Available models: ${availableModels.join(', ') || 'none'}.\n` +
                `To download the model, run: ollama pull ${model}`
              )
            }

            // Create the Ollama client
            const ollamaClient = createOpenAI({
              apiKey: "ollama", // Dummy key, not used by Ollama
              baseURL: `${baseUrl}/v1`, // Add /v1 for OpenAI compatibility
            })
            
            aiClient = ollamaClient
            aiModel = targetModel
            // Use the maximum safe integer value for maxTokens
            maxTokens = Number.MAX_SAFE_INTEGER
            
            console.log("Ollama client configured with model:", aiModel)
          } catch (error: any) {
            console.error("Error configuring Ollama client:", error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            return new Response(
              JSON.stringify({
                error: "Ollama Configuration Error",
                details: errorMessage,
                suggestion: "Please check if Ollama is running and the model is downloaded",
                type: "ollama_config_error"
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              }
            )
          }
          break

        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

      console.log("Creating AI stream with:", { provider, model, maxTokens })
      console.log("System prompt length:", systemPrompt.length)

      // Test connections with better error handling
      if (provider === "openrouter") {
        try {
          console.log("Testing OpenRouter connection...")
          const testResponse = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              "X-Title": "CaaSAssist",
            },
            signal: AbortSignal.timeout(10000),
          })

          if (!testResponse.ok) {
            const errorText = await testResponse.text()
            throw new Error(
              `OpenRouter API test failed: ${testResponse.status} ${testResponse.statusText} - ${errorText}`,
            )
          }
          console.log("OpenRouter connection test passed")
        } catch (testError: any) {
          console.error("OpenRouter connection test failed:", testError)
          return new Response(
            JSON.stringify({
              error: "OpenRouter connection failed",
              details: testError.message,
              suggestion: "Check your API key and internet connection",
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          )
        }
      }

      if (provider === "ollama") {
        try {
          // Normalize the base URL
          let baseUrl = (ollamaUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434").trim()
          // Ensure base URL doesn't end with a slash
          baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
          
          // Remove /v1 if present and add /api/tags
          const testUrl = `${baseUrl.replace('/v1', '')}/api/tags`
          console.log("Testing Ollama connection at:", testUrl)

          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout

          const testResponse = await fetch(testUrl, {
            method: "GET",
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }).finally(() => clearTimeout(timeout))

          if (!testResponse.ok) {
            const errorText = await testResponse.text()
            console.error('Ollama API error:', {
              status: testResponse.status,
              statusText: testResponse.statusText,
              errorText
            })
            throw new Error(`Ollama server error: ${testResponse.status} ${testResponse.statusText} - ${errorText}`)
          }

          let data
          try {
            data = await testResponse.json()
          } catch (parseError) {
            console.error('Failed to parse Ollama response:', parseError)
            throw new Error('Received invalid JSON response from Ollama server')
          }

          const availableModels = data.models?.map((m: any) => m.name) || []
          console.log('Available Ollama models:', availableModels)

          // Check if the requested model is available
          const modelExists = availableModels.some((m: string) => m.toLowerCase() === model.toLowerCase())
          
          if (!modelExists) {
            throw new Error(
              `Model "${model}" not found. Available models: ${availableModels.join(", ") || 'none'}.\n` +
              `To download the model, run: ollama pull ${model}`
            )
          }

          console.log("Ollama connection test passed, model available")
        } catch (testError: any) {
          console.error("Ollama connection test failed:", testError)
          
          // Provide more specific error messages
          let errorMessage = testError.message
          let suggestion = "Make sure Ollama is running and accessible"
          
          if (testError.name === 'AbortError') {
            errorMessage = "Connection to Ollama server timed out"
            suggestion = "Check if Ollama is running and the URL is correct"
          } else if (testError.message.includes('ECONNREFUSED') || testError.message.includes('Failed to fetch')) {
            errorMessage = "Could not connect to Ollama server"
            suggestion = `Make sure Ollama is running and accessible at ${ollamaUrl || 'http://localhost:11434'}`
          }
          
          return new Response(
            JSON.stringify({
              error: "Ollama connection failed",
              details: errorMessage,
              suggestion: suggestion,
              type: 'ollama_connection_error'
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          )
        }
      }

      // Create the stream with enhanced error handling and retry logic
      console.log("Creating AI stream...")

      const result = await streamText({
        model: aiClient(aiModel),
        system: systemPrompt,
        messages: cleanMessages,
        temperature: 0.7,
        maxTokens,
        abortSignal: AbortSignal.timeout(45000), // 45 second timeout
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
      console.error("Error cause:", aiError.cause)

      // Enhanced error handling with specific messages
      let errorMessage = "AI service error"
      let errorDetails = ""
      let statusCode = 500

      // Handle AI SDK specific errors
      if (aiError.name === "AI_APICallError" || aiError.name === "APICallError") {
        if (aiError.message?.includes("API key") || aiError.statusCode === 401) {
          errorMessage = `${provider} API key invalid`
          errorDetails = `Your ${provider} API key is invalid or expired`
          statusCode = 401
        } else if (aiError.statusCode === 429) {
          errorMessage = `${provider} rate limit exceeded`
          errorDetails = "Please wait a moment and try again"
          statusCode = 429
        } else if (aiError.statusCode === 402) {
          errorMessage = `${provider} quota exceeded`
          errorDetails = `Check your ${provider} billing settings`
          statusCode = 402
        } else if (aiError.statusCode === 404) {
          errorMessage = "Model not available"
          errorDetails = `Model "${model}" may be temporarily unavailable on ${provider}`
          statusCode = 404
        } else {
          errorMessage = `${provider} API error`
          errorDetails = aiError.message || `Unknown ${provider} API error`
          statusCode = aiError.statusCode || 500
        }
      } else if (aiError.name === "AbortError" || aiError.message?.includes("timeout")) {
        errorMessage = "Request timeout"
        errorDetails = "The AI request took too long. Try again or switch models."
        statusCode = 408
      } else if (aiError.message?.includes("fetch") || aiError.message?.includes("network")) {
        errorMessage = "Network error"
        errorDetails = `Cannot connect to ${provider}. Check your internet connection.`
        statusCode = 503
      } else if (provider === "ollama") {
        if (aiError.message?.includes("ECONNREFUSED") || aiError.message?.includes("fetch")) {
          errorMessage = "Ollama server not running"
          errorDetails = "Cannot connect to Ollama server. Make sure it's running and accessible."
          statusCode = 503
        } else if (aiError.message?.includes("model") || aiError.message?.includes("404")) {
          errorMessage = "Ollama model not found"
          errorDetails = `Model "${model}" not installed. Run: ollama pull ${model}`
          statusCode = 404
        } else {
          errorMessage = "Ollama connection failed"
          errorDetails = aiError.message || "Check if Ollama is running and accessible"
        }
      } else {
        // Generic error handling
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
