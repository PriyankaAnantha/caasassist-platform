"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useDocumentStore, type Document } from "@/lib/stores/document-store"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { useDropzone } from "react-dropzone"
import {
  Upload,
  FileText,
  MoreHorizontal,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  File,
  X,
  RefreshCw,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface DocumentManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentManager({ open, onOpenChange }: DocumentManagerProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [loadingError, setLoadingError] = useState("")
  const supabase = createClient()

  const { documents, isUploading, setDocuments, addDocument, updateDocument, deleteDocument, setIsUploading } =
    useDocumentStore()

  const filteredDocuments = documents.filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const loadDocuments = async () => {
    if (!user) return

    setLoadingError("")

    try {
      // Add a small delay to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      const formattedDocs: Document[] = (data || []).map((doc) => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        type: doc.type,
        status: doc.status,
        upload_progress: doc.upload_progress || 100,
        created_at: new Date(doc.created_at),
        chunk_count: doc.chunk_count,
        error_message: doc.error_message,
      }))

      setDocuments(formattedDocs)
    } catch (error: any) {
      console.error("Error loading documents:", error)

      // Handle different types of errors
      if (error.message?.includes("Too Many Requests") || error.message?.includes("rate limit")) {
        setLoadingError("Rate limit exceeded. Please wait a moment and try again.")
      } else if (error.message?.includes("JWT")) {
        setLoadingError("Authentication error. Please refresh the page and try again.")
      } else if (error.code === "PGRST116") {
        setLoadingError("Documents table not found. Please run the database setup.")
      } else {
        setLoadingError(`Failed to load documents: ${error.message || "Unknown error"}`)
      }
    }
  }

  const uploadDocument = async (file: File) => {
    if (!user) return

    setIsUploading(true)
    setUploadError("")

    try {
      // Create document record first
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          name: file.name,
          size: file.size,
          type: file.type,
          status: "uploading",
          upload_progress: 0,
          user_id: user.id,
        })
        .select()
        .single()

      if (docError) {
        console.error("Document creation error:", docError)
        throw docError
      }

      const newDoc: Document = {
        id: docData.id,
        name: docData.name,
        size: docData.size,
        type: docData.type,
        status: "uploading",
        upload_progress: 0,
        created_at: new Date(docData.created_at),
      }

      addDocument(newDoc)

      // Upload file to storage with proper path
      const filePath = `${user.id}/${docData.id}/${file.name}`
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        console.error("Storage upload error:", uploadError)

        // Handle specific storage errors
        if (uploadError.message.includes("Bucket not found")) {
          throw new Error("Storage bucket not configured. Please set up the documents bucket in Supabase Storage.")
        } else if (uploadError.message.includes("Row Level Security")) {
          throw new Error("Storage permissions not configured. Please check your RLS policies.")
        }
        throw uploadError
      }

      // Update document status to processing
      await supabase
        .from("documents")
        .update({
          status: "processing",
          upload_progress: 100,
        })
        .eq("id", docData.id)

      updateDocument(docData.id, {
        status: "processing",
        upload_progress: 100,
      })

      // Process document
      await processDocument(docData.id, file)
    } catch (error: any) {
      console.error("Error uploading document:", error)
      setUploadError(error.message || "Failed to upload document")
    } finally {
      setIsUploading(false)
    }
  }

  const processDocument = async (documentId: string, file: File) => {
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("documentId", documentId)

      const response = await fetch("/api/documents/process", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "Failed to process document"

        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()

      updateDocument(documentId, {
        status: "completed",
        chunk_count: result.chunkCount,
      })
    } catch (error: any) {
      console.error("Error processing document:", error)
      updateDocument(documentId, {
        status: "error",
        error_message: error.message,
      })
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", documentId)

      if (error) throw error

      deleteDocument(documentId)
    } catch (error: any) {
      console.error("Error deleting document:", error)
      setLoadingError(`Failed to delete document: ${error.message}`)
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        // Validate file type
        const allowedTypes = ["application/pdf", "text/plain", "text/markdown"]
        if (!allowedTypes.includes(file.type)) {
          setUploadError(`File type ${file.type} is not supported. Please upload PDF or text files.`)
          return
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          setUploadError("File size must be less than 10MB")
          return
        }

        uploadDocument(file)
      })
    },
    [user],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    multiple: true,
    disabled: isUploading,
  })

  const getStatusIcon = (status: Document["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <File className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: Document["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      case "error":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  // Load documents when panel opens, with debouncing
  useEffect(() => {
    if (open && user) {
      const timer = setTimeout(() => {
        loadDocuments()
      }, 300) // Debounce to prevent rapid calls

      return () => clearTimeout(timer)
    }
  }, [open, user])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 p-0">
        <SheetHeader className="p-4 border-b border-blue-200/50">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:hover:border-blue-500"
            } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isDragActive ? "Drop files here..." : "Drag & drop files or click to browse"}
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF, TXT, MD files up to 10MB</p>
          </div>

          {/* Upload Error */}
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                {uploadError}
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => setUploadError("")}>
                  <X className="h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading Error */}
          {loadingError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                {loadingError}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={loadDocuments}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => setLoadingError("")}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Documents List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {filteredDocuments.length === 0 && !loadingError ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No documents uploaded</p>
                <Button variant="ghost" size="sm" onClick={loadDocuments} className="mt-2 text-xs">
                  Refresh
                </Button>
              </div>
            ) : (
              filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className="group p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(document.status)}
                        <h4 className="font-medium text-sm truncate">{document.name}</h4>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className={`text-xs ${getStatusColor(document.status)}`}>
                          {document.status}
                        </Badge>
                        <span className="text-xs text-gray-500">{(document.size / 1024).toFixed(1)} KB</span>
                        {document.chunk_count && (
                          <span className="text-xs text-gray-500">{document.chunk_count} chunks</span>
                        )}
                      </div>

                      {document.status === "uploading" && (
                        <Progress value={document.upload_progress} className="h-1 mb-2" />
                      )}

                      {document.error_message && (
                        <p className="text-xs text-red-600 dark:text-red-400 mb-2">{document.error_message}</p>
                      )}

                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(document.created_at, { addSuffix: true })}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDeleteDocument(document.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
