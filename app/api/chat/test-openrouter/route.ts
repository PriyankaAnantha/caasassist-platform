import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { NextResponse } from "next/server"

export async function GET() {
  console.log("=== OpenRouter Test ===")

  try {
    // Check environment
    const hasKey = !!process.env.OPENROUTER_API_KEY
    const keyLength = process.env.OPENROUTER_API_KEY?.length || 0

    console.log("OpenRouter API Key:", hasKey ? `Present (${keyLength} chars)` : "Missing")

    if (!hasKey) {
      return NextResponse.json({
        success: false,
        error: "OpenRouter API key not found",
        solution: "Add OPENROUTER_API_KEY to your .env.local file",
        getKey: "Get a free API key at https://openrouter.ai/",
      })
    }

    // Create OpenRouter client
    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      headers: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "CaaSAssist",
      },
    })

    console.log("Testing OpenRouter connection...")

    // Test with a simple free model
    const { text } = await generateText({
      model: openrouter("microsoft/phi-3-mini-128k-instruct:free"),
      prompt: "Say hello in one word",
      maxTokens: 5,
    })

    console.log("OpenRouter response:", text)

    return NextResponse.json({
      success: true,
      message: "OpenRouter is working",
      response: text,
      model: "microsoft/phi-3-mini-128k-instruct:free",
    })
  } catch (error: any) {
    console.error("OpenRouter test error:", error)

    const errorMessage = error.message || "Unknown error"
    let solution = ""

    if (errorMessage.includes("API key") || errorMessage.includes("401")) {
      solution = "Invalid API key. Get a new one at https://openrouter.ai/"
    } else if (errorMessage.includes("rate limit")) {
      solution = "Rate limited. Wait a moment and try again."
    } else if (errorMessage.includes("fetch")) {
      solution = "Network error. Check your internet connection."
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      solution,
      details: {
        name: error.name,
        stack: error.stack?.substring(0, 300),
      },
    })
  }
}
