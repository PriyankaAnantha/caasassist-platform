import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    // Test environment variables
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY

    // Test Supabase connection
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    // Test database connection
    let dbConnected = false
    try {
      const { error: dbError } = await supabase.from("profiles").select("id").limit(1)
      dbConnected = !dbError
    } catch (e) {
      dbConnected = false
    }

    return NextResponse.json({
      status: "API is working",
      environment: {
        supabaseUrl: hasSupabaseUrl,
        supabaseKey: hasSupabaseKey,
        openaiKey: hasOpenAIKey,
      },
      database: {
        connected: dbConnected,
      },
      auth: {
        hasSession: !!session,
        userId: session?.user?.id || null,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "API test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
