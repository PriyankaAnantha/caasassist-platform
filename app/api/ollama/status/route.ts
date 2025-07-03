import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  console.log("=== Ollama Status API Called ===")

  try {
    const body = await req.json()
    const { ollamaUrl } = body

    console.log("Request body:", body)

    if (!ollamaUrl) {
      console.log("❌ No Ollama URL provided")
      return NextResponse.json({ error: "Ollama URL is required" }, { status: 400 })
    }

    // Clean the URL and ensure it doesn't end with /v1
    const cleanUrl = ollamaUrl.replace(/\/v1$/, "").replace(/\/$/, "")
    const testUrl = `${cleanUrl}/api/tags`

    console.log("Testing Ollama connection at:", testUrl)

    // Create manual AbortController for better compatibility
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      console.log("⏰ Request timeout after 8 seconds")
      controller.abort()
    }, 8000)

    try {
      const response = await fetch(testUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "CaaSAssist/1.0",
        },
      })

      clearTimeout(timeout)

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.log("❌ Response not OK:", errorText)
        throw new Error(`Ollama server responded with ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ Response data:", data)

      const models = data.models?.map((m: any) => m.name) || []
      console.log("📋 Available models:", models)

      return NextResponse.json({
        success: true,
        status: "connected",
        models,
        url: cleanUrl,
        debug: {
          responseStatus: response.status,
          modelCount: models.length,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (fetchError: any) {
      clearTimeout(timeout)
      throw fetchError
    }
  } catch (error: any) {
    console.error("=== Ollama Status Check Failed ===")
    console.error("Error name:", error.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack?.substring(0, 500))

    let errorMessage = "Connection failed"
    let suggestion = ""
    const debugInfo = {
      errorName: error.name,
      errorMessage: error.message,
      timestamp: new Date().toISOString(),
    }

    if (error.name === "AbortError") {
      errorMessage = "Connection timeout"
      suggestion = "Ollama server is not responding. Make sure 'ollama serve' is running."
    } else if (error.message?.includes("ECONNREFUSED")) {
      errorMessage = "Connection refused"
      suggestion = "Ollama server is not running. Start it with 'ollama serve'"
    } else if (error.message?.includes("ENOTFOUND") || error.message?.includes("getaddrinfo")) {
      errorMessage = "Host not found"
      suggestion = "Check the Ollama URL. Use 'http://localhost:11434' for local setup."
    } else if (error.message?.includes("fetch")) {
      errorMessage = "Network error"
      suggestion = "Cannot reach Ollama server. Check if it's running and accessible."
    } else if (error.message?.includes("404")) {
      errorMessage = "Ollama API not found"
      suggestion = "Check the URL and make sure Ollama is properly installed"
    } else {
      errorMessage = error.message || "Unknown error"
      suggestion = "Check Ollama server status and URL"
    }

    console.log("🔍 Error analysis:", { errorMessage, suggestion })

    return NextResponse.json({
      success: false,
      status: "disconnected",
      error: errorMessage,
      suggestion,
      debug: debugInfo,
    })
  }
}
