"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  onUploadProgress?: (progress: number) => void
  onUploadComplete?: (response: any) => void
  onError?: (error: string) => void
  accept?: string | {
    [key: string]: string[]
  }
  maxFiles?: number
  maxSize?: number
  className?: string
  apiUrl?: string
  customUpload?: (file: File, onProgress: (progress: number) => void) => Promise<any>
}

export function FileUpload({
  onFilesSelected,
  onUploadProgress,
  onUploadComplete,
  onError,
  // Using proper MIME types instead of file extensions
  accept = {
    'application/json': ['.json', '.jsonl'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'application/pdf': ['.pdf']
  },
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  className,
  apiUrl = "",
  customUpload
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const uploadFile = async (file: File) => {
    // If custom upload function is provided, use it
    if (customUpload) {
      return customUpload(file, (progress) => {
        setProgress(progress);
        if (onUploadProgress) {
          onUploadProgress(progress);
        }
      });
    }

    // Default upload implementation
    const formData = new FormData()
    formData.append("file", file)

    try {
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setProgress(percentComplete)
          if (onUploadProgress) {
            onUploadProgress(percentComplete)
          }
        }
      })

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText)
                if (onUploadComplete) {
                  onUploadComplete(response)
                }
                resolve(response)
              } catch (e) {
                const error = new Error(`Failed to parse server response: ${xhr.responseText}`)
                if (onError) onError(error.message)
                reject(error)
              }
            } else {
              const error = new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`)
              if (onError) onError(error.message)
              reject(error)
            }
          }
        }

        xhr.onerror = () => {
          const error = new Error("Network error during file upload")
          if (onError) onError(error.message)
          reject(error)
        }

        xhr.open("POST", `${apiUrl}/documents/process`, true)
        xhr.send(formData)
      })

      await uploadPromise
      return { success: true }
    } catch (error) {
      console.error("Upload error:", error)
      throw error
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: any[]) => {
      setError(null)

      // Handle file rejections
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0]
        if (rejection.errors[0].code === "file-too-large") {
          const errorMsg = `File is too large. Max size is ${maxSize / (1024 * 1024)}MB`
          setError(errorMsg)
          if (onError) onError(errorMsg)
        } else if (rejection.errors[0].code === "file-invalid-type") {
          const errorMsg = `Invalid file type. Only ${accept} files are accepted.`
          setError(errorMsg)
          if (onError) onError(errorMsg)
        } else if (rejection.errors[0].code === "too-many-files") {
          const errorMsg = `You can only upload up to ${maxFiles} files at a time.`
          setError(errorMsg)
          if (onError) onError(errorMsg)
        } else {
          const errorMsg = "Error uploading file. Please try again."
          setError(errorMsg)
          if (onError) onError(errorMsg)
        }
        return
      }

      // Process valid files
      if (acceptedFiles.length > 0) {
        setIsUploading(true)
        setProgress(0)
        
        try {
          // Process files one by one
          for (const file of acceptedFiles) {
            if (file.size > maxSize) {
              const errorMsg = `File ${file.name} exceeds maximum size of ${maxSize / (1024 * 1024)}MB`
              setError(errorMsg)
              if (onError) onError(errorMsg)
              continue
            }

            // Upload the file
            await uploadFile(file)
            
            // If we have a callback for successful file selection
            onFilesSelected([file])
          }
        } catch (error) {
          console.error('Upload error:', error)
          const errorMsg = error instanceof Error ? error.message : 'Failed to upload files'
          setError(errorMsg)
          if (onError) onError(errorMsg)
        } finally {
          setIsUploading(false)
          setProgress(0)
        }
      }
    },
    [onFilesSelected, onUploadComplete, onError, maxSize, maxFiles, accept, apiUrl]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept as any, // Type assertion to bypass type checking
    maxSize,
    maxFiles,
    disabled: isUploading,
  })

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Uploading... {progress}%
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {isDragActive ? "Drop the files here" : "Drag & drop files here, or click to select"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {typeof accept === 'string' ? accept : 'Supported files: ' + Object.values(accept).flat().join(', ')}
                  {' '}(max {maxSize / (1024 * 1024)}MB per file)
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
