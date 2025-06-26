"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/components/auth-provider"
import { Bug, RefreshCw, X, MessageSquare } from "lucide-react"

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [testing, setTesting] = useState(false)
  const { user } = useAuth()

  const runTests = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/test")
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      setTestResults({ error: error instanceof Error ? error.message : "Test failed" })
    }
    setTesting(false)
  }

  const testChat = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello, this is a test message" }],
          model: "gpt-4o-mini",
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        setTestResults({
          chatTest: "Failed",
          status: response.status,
          error: errorData,
        })
      } else {
        // For streaming responses, we just check if the response starts correctly
        const reader = response.body?.getReader()
        if (reader) {
          const { value } = await reader.read()
          const chunk = new TextDecoder().decode(value)
          setTestResults({
            chatTest: "Success",
            response: "Chat API is working",
            firstChunk: chunk.substring(0, 100) + "...",
          })
          reader.releaseLock()
        } else {
          setTestResults({ chatTest: "Success", response: "Chat API responded correctly" })
        }
      }
    } catch (error) {
      setTestResults({
        chatTest: "Failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
    setTesting(false)
  }

  const testOpenAI = async () => {
    setTesting(true)
    try {
      // Test if OpenAI key is configured
      const hasKey = !!process.env.NEXT_PUBLIC_OPENAI_API_KEY
      setTestResults({
        openaiTest: hasKey ? "Key Present" : "Key Missing",
        keyLength: process.env.NEXT_PUBLIC_OPENAI_API_KEY?.length || 0,
        note: "Check server logs for actual API key validation",
      })
    } catch (error) {
      setTestResults({
        openaiTest: "Failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
    setTesting(false)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button onClick={() => setIsOpen(true)} variant="outline" size="sm" className="bg-white/90 backdrop-blur-sm">
          <Bug className="w-4 h-4 mr-2" />
          Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className="w-96 bg-white/95 backdrop-blur-sm shadow-lg max-h-96">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Debug Panel</CardTitle>
            <div className="flex gap-2">
              <Button onClick={runTests} disabled={testing} size="sm" variant="ghost" title="Test API">
                <RefreshCw className={`w-3 h-3 ${testing ? "animate-spin" : ""}`} />
              </Button>
              <Button onClick={testChat} disabled={testing} size="sm" variant="ghost" title="Test Chat">
                <MessageSquare className="w-3 h-3" />
              </Button>
              <Button onClick={testOpenAI} disabled={testing} size="sm" variant="ghost" title="Test OpenAI">
                🤖
              </Button>
              <Button onClick={() => setIsOpen(false)} size="sm" variant="ghost">
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">User Authenticated</span>
              <Badge variant={user ? "default" : "destructive"}>{user ? "Yes" : "No"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">User ID</span>
              <span className="text-xs font-mono">{user?.id?.slice(0, 8) || "None"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Environment</span>
              <Badge variant="outline">{process.env.NODE_ENV || "development"}</Badge>
            </div>
          </div>

          {testResults && (
            <ScrollArea className="h-32">
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
