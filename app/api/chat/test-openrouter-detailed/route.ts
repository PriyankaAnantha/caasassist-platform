import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { NextResponse } from "next/server"

export async function GET() {
  console.log("=== Detailed OpenRouter Test ===")

  try {
    // Step 1: Check environment
    const hasKey = !!process.env.OPENROUTER_API_KEY
    const keyLength = process.env.OPENROUTER_API_KEY?.length || 0
    const keyPrefix = process.env.OPENROUTER_API_KEY?.substring(0, 10) || "none"

    console.log("OpenRouter API Key:", hasKey ? `Present (${keyLength} chars, starts with ${keyPrefix})` : "Missing")

    if (!hasKey) {
      return NextResponse.json({
        success: false,
        step: "environment",
        error: "OpenRouter API key not found",
        solution: "Add OPENROUTER_API_KEY to your .env.local file",
        getKey: "Get a free API key at https://openrouter.ai/",
      })
    }

    // Step 2: Test API connection
    console.log("Step 2: Testing OpenRouter API connection...")
    try {
      const apiResponse = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "CaaSAssist",
        },
      })

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text()
        throw new Error(`API connection failed: ${apiResponse.status} ${apiResponse.statusText} - ${errorText}`)
      }

      const models = await apiResponse.json()
      console.log(`Found ${models.data?.length || 0} models`)
    } catch (apiError: any) {
      console.error("API connection test failed:", apiError)
      return NextResponse.json({
        success: false,
        step: "api_connection",
        error: apiError.message,
        solution: "Check your API key or network connection",
      })
    }

    // Step 3: Test AI SDK integration
    console.log("Step 3: Testing AI SDK integration...")
    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      headers: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "CaaSAssist",
      },
    })

    // Step 4: Test simple generation
    console.log("Step 4: Testing text generation...")
    const { text } = await generateText({
      model: openrouter("microsoft/phi-3-mini-128k-instruct:free"),
      prompt: "Say 'Hello' in one word",
      maxTokens: 5,
    })

    console.log("OpenRouter response:", text)

    return NextResponse.json({
      success: true,
      message: "OpenRouter is working perfectly",
      response: text,
      model: "microsoft/phi-3-mini-128k-instruct:free",
      steps: {
        environment: "✅ API key found",
        api_connection: "✅ API accessible",
        ai_sdk: "✅ AI SDK integration working",
        generation: "✅ Text generation successful",
      },
    })
  } catch (error: any) {
    console.error("OpenRouter detailed test error:", error)

    const errorMessage = error.message || "Unknown error"
    let solution = ""

    if (errorMessage.includes("API key") || errorMessage.includes("401")) {
      solution = "Invalid API key. Get a new one at https://openrouter.ai/"
    } else if (errorMessage.includes("rate limit")) {
      solution = "Rate limited. Wait a moment and try again."
    } else if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
      solution = "Network error. Check your internet connection."
    } else if (errorMessage.includes("timeout")) {
      solution = "Request timeout. Try again."
    }

    return NextResponse.json({
      success: false,
      step: "generation",
      error: errorMessage,
      solution,
      details: {
        name: error.name,
        stack: error.stack?.substring(0, 300),
      },
    })
  }
}
