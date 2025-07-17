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
    const file = formData.get("file") as File | null
    const documentId = formData.get("documentId") as string | null

    if (!file || !documentId) {
      const errorMsg = `Missing required fields. File: ${!!file}, Document ID: ${!!documentId}`
      console.error(errorMsg)
      return Response.json({ error: errorMsg }, { status: 400 })
    }

    // Sanitize and validate filename
    const safeFileName = file.name
      .replace(/[^\w\s.-]/g, '_') // Replace special chars with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .toLowerCase()

    console.log(`Processing document ${documentId} (${safeFileName}, ${file.size} bytes, ${file.type})...`)
    
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
      // Validate file size (50MB limit)
      const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size (50MB)`)
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/markdown',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/html'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}`)
      }

      text = await extractTextFromFile(file)
      console.log(`Successfully extracted ${text.length} characters from file`)
      
      // Ensure we have content
      if (!text || text.trim().length === 0) {
        throw new Error('Extracted text is empty')
      }
      
    } catch (err: any) {
      const error = err as Error
      console.error("Error processing file:", {
        error: error.message,
        stack: error.stack,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
      throw new Error(`Failed to process file: ${error.message}`)
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
  try {
    // For text-based files, we can read them directly
    if (file.type.startsWith('text/') || 
        file.type === 'application/json' || 
        file.type === 'application/xml') {
      return await file.text()
    }

    // For PDFs, we'd typically use a library like pdf-parse
    if (file.type === 'application/pdf') {
      // In a production environment, you'd use a proper PDF parsing library
      // For now, we'll extract some basic text if possible
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Simple text extraction from PDF (very basic, won't work for all PDFs)
      // In a real app, you'd use a proper PDF parsing library here
      const text = buffer.toString('utf8', 0, Math.min(10000, buffer.length))
      return text.replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable characters
    }

    // For other file types, try to extract text if possible
    try {
      return await file.text()
    } catch (e) {
      console.warn(`Could not extract text from file type: ${file.type}`)
      return ''
    }
  } catch (error: any) {
    console.error('Error in extractTextFromFile:', {
      error: error.message,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })
    throw new Error(`Failed to extract text: ${error.message}`)
  }
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
