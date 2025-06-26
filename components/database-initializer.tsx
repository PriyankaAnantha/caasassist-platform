"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import { Database, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export function DatabaseInitializer() {
  const { user } = useAuth()
  const [isInitializing, setIsInitializing] = useState(false)
  const [initStatus, setInitStatus] = useState<string>("")
  const [error, setError] = useState<string>("")
  const supabase = createClient()

  const initializeDatabase = async () => {
    if (!user) return

    setIsInitializing(true)
    setError("")
    setInitStatus("Checking database...")

    try {
      // Try to create a simple profile entry to test the database
      setInitStatus("Testing database connection...")

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || "User",
      })

      if (profileError) {
        throw new Error(`Database not ready: ${profileError.message}`)
      }

      setInitStatus("Database is ready!")
      setTimeout(() => {
        setInitStatus("")
        setIsInitializing(false)
      }, 2000)
    } catch (error: any) {
      console.error("Database initialization error:", error)
      setError(error.message || "Failed to initialize database")
      setIsInitializing(false)
    }
  }

  if (!user) return null

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Database Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Initialize your database connection and create your user profile.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {initStatus && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{initStatus}</AlertDescription>
          </Alert>
        )}

        <Button onClick={initializeDatabase} disabled={isInitializing} className="w-full">
          {isInitializing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Initialize Database
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
