"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Key, Shield, HardDrive } from "lucide-react"

interface SetupStatus {
  database: boolean
  storage: boolean
  auth: boolean
  apiKey: boolean
  tables: {
    profiles: boolean
    documents: boolean
    document_chunks: boolean
    chat_sessions: boolean
    chat_messages: boolean
  }
  storageDetails: {
    bucketExists: boolean
    canAccess: boolean
    error: string
  }
}

export function SetupChecker() {
  const { user } = useAuth()
  const [status, setStatus] = useState<SetupStatus>({
    database: false,
    storage: false,
    auth: false,
    apiKey: false,
    tables: {
      profiles: false,
      documents: false,
      document_chunks: false,
      chat_sessions: false,
      chat_messages: false,
    },
    storageDetails: {
      bucketExists: false,
      canAccess: false,
      error: "",
    },
  })
  const [checking, setChecking] = useState(false)
  const [showChecker, setShowChecker] = useState(false)
  const [detailedView, setDetailedView] = useState(false)
  const supabase = createClient()

  const checkStorage = async () => {
    const storageDetails = {
      bucketExists: false,
      canAccess: false,
      error: "",
    }

    if (!user) {
      storageDetails.error = "User not authenticated"
      return storageDetails
    }

    try {
      // Method 1: Try to list buckets (this might fail due to RLS)
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()

      if (!listError && buckets) {
        const documentsBucket = buckets.find((bucket) => bucket.name === "documents")
        storageDetails.bucketExists = !!documentsBucket
      }

      // Method 2: Try to access the documents bucket directly (more reliable)
      const { data: files, error: filesError } = await supabase.storage.from("documents").list("", { limit: 1 })

      if (!filesError) {
        storageDetails.bucketExists = true
        storageDetails.canAccess = true
      } else {
        // Check specific error types
        if (filesError.message?.includes("Bucket not found")) {
          storageDetails.bucketExists = false
          storageDetails.error = "Bucket does not exist"
        } else if (filesError.message?.includes("permission") || filesError.message?.includes("policy")) {
          storageDetails.bucketExists = true
          storageDetails.canAccess = false
          storageDetails.error = "Permission denied - check RLS policies"
        } else {
          storageDetails.bucketExists = true
          storageDetails.canAccess = false
          storageDetails.error = filesError.message
        }
      }

      // Method 3: Try a simple upload test if we can access
      if (storageDetails.canAccess) {
        try {
          const testContent = "test"
          const testFile = new File([testContent], "test.txt", { type: "text/plain" })
          const testPath = `${user.id}/test-${Date.now()}.txt`

          const { error: uploadError } = await supabase.storage.from("documents").upload(testPath, testFile)

          if (!uploadError) {
            // Clean up test file
            await supabase.storage.from("documents").remove([testPath])
          } else {
            storageDetails.error = `Upload test failed: ${uploadError.message}`
          }
        } catch (uploadException: any) {
          storageDetails.error = `Upload test exception: ${uploadException.message}`
        }
      }
    } catch (error: any) {
      storageDetails.error = `Storage check failed: ${error.message}`
    }

    return storageDetails
  }

  const checkSetup = async () => {
    setChecking(true)

    const newStatus: SetupStatus = {
      database: false,
      storage: false,
      auth: false,
      apiKey: false,
      tables: {
        profiles: false,
        documents: false,
        document_chunks: false,
        chat_sessions: false,
        chat_messages: false,
      },
      storageDetails: {
        bucketExists: false,
        canAccess: false,
        error: "",
      },
    }

    try {
      // Check auth
      newStatus.auth = !!user

      if (user) {
        // Check each table individually
        const tables = ["profiles", "documents", "document_chunks", "chat_sessions", "chat_messages"]

        for (const table of tables) {
          try {
            const { error } = await supabase.from(table).select("id").limit(1)
            newStatus.tables[table as keyof typeof newStatus.tables] = !error
          } catch (e) {
            console.log(`Table ${table} check failed:`, e)
            newStatus.tables[table as keyof typeof newStatus.tables] = false
          }
        }

        // Overall database status
        newStatus.database = Object.values(newStatus.tables).some(Boolean)

        // Check storage
        newStatus.storageDetails = await checkStorage()
        newStatus.storage = newStatus.storageDetails.bucketExists && newStatus.storageDetails.canAccess
      }

      // Check API key
      newStatus.apiKey = !!process.env.NEXT_PUBLIC_OPENAI_API_KEY
    } catch (error) {
      console.error("Setup check error:", error)
    }

    setStatus(newStatus)
    setChecking(false)
  }

  const fixStorage = async () => {
    try {
      const response = await fetch("/api/storage/setup", {
        method: "POST",
      })

      const result = await response.json()

      if (response.ok) {
        // Recheck after fix attempt
        setTimeout(checkSetup, 1000)
      } else {
        console.error("Storage fix failed:", result)
      }
    } catch (error) {
      console.error("Storage fix error:", error)
    }
  }

  useEffect(() => {
    if (user) {
      checkSetup()
    }
  }, [user])

  const allGood = status.auth && status.database && status.storage && status.apiKey
  const hasIssues = !allGood && user

  if (!showChecker && allGood) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!showChecker ? (
        <Button
          onClick={() => setShowChecker(true)}
          variant="outline"
          size="sm"
          className={`bg-white/90 backdrop-blur-sm ${hasIssues ? "border-red-300 text-red-600" : ""}`}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          {hasIssues ? "Setup Issues" : "System Status"}
        </Button>
      ) : (
        <Card className="w-80 bg-white/95 backdrop-blur-sm shadow-lg max-h-96 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">System Status</CardTitle>
              <div className="flex gap-2">
                <Button onClick={() => setDetailedView(!detailedView)} size="sm" variant="ghost" className="text-xs">
                  {detailedView ? "Simple" : "Details"}
                </Button>
                <Button onClick={checkSetup} disabled={checking} size="sm" variant="ghost">
                  <RefreshCw className={`w-3 h-3 ${checking ? "animate-spin" : ""}`} />
                </Button>
                <Button onClick={() => setShowChecker(false)} size="sm" variant="ghost">
                  ×
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="text-sm">Authentication</span>
              </div>
              {status.auth ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  <XCircle className="w-3 h-3 mr-1" />
                  Failed
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span className="text-sm">Database</span>
              </div>
              {status.database ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  <XCircle className="w-3 h-3 mr-1" />
                  Missing
                </Badge>
              )}
            </div>

            {detailedView && (
              <div className="ml-6 space-y-1 text-xs">
                {Object.entries(status.tables).map(([table, exists]) => (
                  <div key={table} className="flex items-center justify-between">
                    <span className="text-gray-600">{table}</span>
                    {exists ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span className="text-sm">Storage</span>
              </div>
              {status.storage ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  <XCircle className="w-3 h-3 mr-1" />
                  Issues
                </Badge>
              )}
            </div>

            {detailedView && (
              <div className="ml-6 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Bucket exists</span>
                  {status.storageDetails.bucketExists ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Can access</span>
                  {status.storageDetails.canAccess ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                </div>
                {status.storageDetails.error && (
                  <div className="text-red-600 text-xs mt-1">{status.storageDetails.error}</div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span className="text-sm">API Key</span>
              </div>
              {status.apiKey ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Check
                </Badge>
              )}
            </div>

            {!status.database && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Database tables missing. Run the schema.sql file in your Supabase SQL editor.
                </AlertDescription>
              </Alert>
            )}

            {!status.storage && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {status.storageDetails.error || "Storage bucket issues detected."}
                  <div className="mt-2 space-x-2">
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={fixStorage}>
                      Auto Fix
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={checkSetup}>
                      Recheck
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
