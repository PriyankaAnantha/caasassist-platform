import { NextResponse } from "next/server"

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: "Chat API endpoint is accessible",
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
        ollamaUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/",
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    return NextResponse.json({
      success: true,
      message: "POST request received successfully",
      receivedData: {
        hasMessages: !!body.messages,
        messageCount: body.messages?.length || 0,
        model: body.model,
        provider: body.provider,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
