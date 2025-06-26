import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // Get user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("=== DOCUMENT DEBUG FOR USER:", user.id, "===")

    // Check documents
    const { data: documents, error: docsError } = await supabase.from("documents").select("*").eq("user_id", user.id)

    console.log("Documents query result:", { documents, docsError })

    // Check document chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("*")
      .eq("user_id", user.id)

    console.log("Chunks query result:", { chunksCount: chunks?.length, chunksError })

    // Sample chunk content
    if (chunks && chunks.length > 0) {
      console.log("Sample chunk content:")
      chunks.slice(0, 3).forEach((chunk, index) => {
        console.log(`Chunk ${index + 1}:`, chunk.content.substring(0, 200) + "...")
      })
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      documents: {
        count: documents?.length || 0,
        data: documents?.map((doc) => ({
          id: doc.id,
          name: doc.name,
          status: doc.status,
          chunk_count: doc.chunk_count,
          created_at: doc.created_at,
        })),
        error: docsError?.message,
      },
      chunks: {
        count: chunks?.length || 0,
        sample: chunks?.slice(0, 2).map((chunk) => ({
          id: chunk.id,
          document_id: chunk.document_id,
          content_preview: chunk.content.substring(0, 100) + "...",
          chunk_index: chunk.chunk_index,
        })),
        error: chunksError?.message,
      },
    })
  } catch (error: any) {
    console.error("Document debug error:", error)
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
