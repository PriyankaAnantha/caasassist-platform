import type { NextRequest } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log("Starting document processing...")
  
  try {
    const supabase = await createServerSupabaseClient()

    // Get user session
    console.log("Getting user session...")
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()
    
    if (authError || !session) {
      console.error("Auth error or no session:", authError)
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Parsing form data...")
    const formData = await req.formData()
    const file = formData.get("file") as File
    const documentId = formData.get("documentId") as string

    if (!file || !documentId) {
      console.error("Missing file or document ID")
      return Response.json({ error: "Missing file or document ID" }, { status: 400 })
    }

    console.log(`Processing document ${documentId} (${file.name}, ${file.size} bytes)...`)
    
    // Update document status to processing
    const { error: updateStatusError } = await supabase
      .from("documents")
      .update({
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("id", documentId)

    if (updateStatusError) {
      console.error("Error updating document status:", updateStatusError)
      throw new Error(`Failed to update document status: ${updateStatusError.message}`)
    }

    // Extract text from file
    console.log("Extracting text from file...")
    let text: string
    try {
      text = await extractTextFromFile(file)
      console.log(`Extracted ${text.length} characters from file`)
    } catch (err) {
      const error = err as Error
      console.error("Error extracting text:", error)
      throw new Error(`Failed to extract text from file: ${error.message}`)
    }

    // Chunk the text
    console.log("Chunking text...")
    const chunks = chunkText(text, 1000, 200) // 1000 chars with 200 char overlap
    console.log(`Created ${chunks.length} chunks`)

    // Generate embeddings and store chunks
    const chunkRecords = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
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

    // Store chunks in database in batches to avoid hitting limits
    console.log(`Storing ${chunkRecords.length} chunks in database...`)
    const BATCH_SIZE = 50
    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE)
      const { error: chunksError } = await supabase.from("document_chunks").insert(batch)
      
      if (chunksError) {
        console.error(`Error inserting chunks batch ${i / BATCH_SIZE + 1}:", chunksError`)
        throw new Error(`Failed to store document chunks: ${chunksError.message}`)
      }
      console.log(`Stored batch ${i / BATCH_SIZE + 1}/${Math.ceil(chunkRecords.length / BATCH_SIZE)}`)
    }

    // Update document status to completed
    console.log("Updating document status to completed...")
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "completed",
        chunk_count: chunks.length,
        updated_at: new Date().toISOString()
      })
      .eq("id", documentId)

    if (updateError) {
      console.error("Error updating document status to completed:", updateError)
      throw new Error(`Failed to complete document processing: ${updateError.message}`)
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`Document processing completed in ${processingTime} seconds`)

    return Response.json({
      success: true,
      chunkCount: chunks.length,
      processingTime: `${processingTime}s`
    })
  } catch (err) {
    const error = err as Error
    console.error("Document processing error:", error)
    
    // Try to update document status to error if possible
    try {
      const supabase = await createServerSupabaseClient()
      const formData = await req.formData()
      const docId = formData.get("documentId") as string
      
      if (docId) {
        await supabase
          .from("documents")
          .update({
            status: "error",
            error_message: error.message || "Unknown error occurred",
            updated_at: new Date().toISOString()
          })
          .eq("id", docId)
      }
    } catch (updateError) {
      console.error("Failed to update document status to error:", updateError)
    }
    
    return Response.json(
      {
        error: error?.message || "Failed to process document",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
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
