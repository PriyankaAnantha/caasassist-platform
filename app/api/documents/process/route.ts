import type { NextRequest } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get user session
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()
    if (authError || !session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const documentId = formData.get("documentId") as string

    if (!file || !documentId) {
      return Response.json({ error: "Missing file or document ID" }, { status: 400 })
    }

    // Extract text from file
    const text = await extractTextFromFile(file)

    // Chunk the text
    const chunks = chunkText(text, 1000, 200) // 1000 chars with 200 char overlap

    // Generate embeddings and store chunks
    const chunkRecords = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      // In a real implementation, you'd generate embeddings here
      // For now, we'll just store the text chunks
      chunkRecords.push({
        document_id: documentId,
        user_id: session.user.id,
        content: chunk,
        chunk_index: i,
        metadata: {
          filename: file.name,
          chunk_size: chunk.length,
        },
      })
    }

    // Store chunks in database
    const { error: chunksError } = await supabase.from("document_chunks").insert(chunkRecords)

    if (chunksError) throw chunksError

    // Update document status
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "completed",
        chunk_count: chunks.length,
      })
      .eq("id", documentId)

    if (updateError) throw updateError

    return Response.json({
      success: true,
      chunkCount: chunks.length,
    })
  } catch (error) {
    console.error("Document processing error:", error)
    return Response.json(
      {
        error: "Failed to process document",
      },
      { status: 500 },
    )
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  const text = await file.text()

  if (file.type === "application/pdf") {
    // In a real implementation, you'd use a PDF parsing library
    // For now, return placeholder text
    return `PDF content from ${file.name}: ${text.substring(0, 1000)}...`
  }

  return text
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const chunk = text.substring(start, end)
    chunks.push(chunk)

    if (end === text.length) break
    start = end - overlap
  }

  return chunks
}
