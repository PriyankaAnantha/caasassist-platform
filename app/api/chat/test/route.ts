import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { NextResponse } from "next/server"

export async function GET() {
  console.log("=== Chat Test API ===")

  try {
    // Test 1: Environment variables
    const envTest = {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || "none",
    }
    console.log("Environment test:", envTest)

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "OpenAI API key not found",
        envTest,
      })
    }

    // Test 2: Simple OpenAI call
    console.log("Testing OpenAI API...")
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: "Say hello in one word",
      maxTokens: 5,
    })

    console.log("OpenAI response:", text)

    return NextResponse.json({
      success: true,
      message: "Chat API is working",
      openaiResponse: text,
      envTest,
    })
  } catch (error: any) {
    console.error("Chat test error:", error)

    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        name: error.name,
        cause: error.cause,
        stack: error.stack?.substring(0, 500),
      },
    })
  }
}
