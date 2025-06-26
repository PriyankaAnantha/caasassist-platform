"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useChatStore } from "@/lib/stores/chat-store"
import { Globe, ExternalLink, Key, CheckCircle, XCircle, RefreshCw } from "lucide-react"

export function OpenRouterSetup() {
  const { selectedProvider, setSelectedModel } = useChatStore()
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const testOpenRouter = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/chat/test-openrouter-detailed")
      const result = await response.json()
      setTestResult(result)
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
        solution: "Check your network connection",
      })
    } finally {
      setTesting(false)
    }
  }

  const switchToOpenAI = () => {
    setSelectedModel("gpt-4o-mini")
  }

  if (selectedProvider !== "openrouter") {
    return null
  }

  return (
    <div className="px-4 py-2">
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">OpenRouter Setup Required</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={testOpenRouter} disabled={testing}>
                  {testing ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Test
                </Button>
                <Button variant="ghost" size="sm" onClick={switchToOpenAI}>
                  Use OpenAI Instead
                </Button>
              </div>
            </div>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Get Your Free OpenRouter API Key
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm space-y-2">
                  <p>OpenRouter provides access to many free AI models, but requires an API key:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>
                      Visit{" "}
                      <a
                        href="https://openrouter.ai/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        openrouter.ai <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>Sign up for a free account</li>
                    <li>Go to Keys section and create a new API key</li>
                    <li>Add it to your .env.local file as OPENROUTER_API_KEY</li>
                    <li>Restart your development server</li>
                  </ol>
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-xs">
                  <div className="text-gray-600 dark:text-gray-400"># Add to .env.local</div>
                  <div>OPENROUTER_API_KEY=sk-or-v1-your-key-here</div>
                </div>
              </CardContent>
            </Card>

            {testResult && (
              <div className="mt-3">
                {testResult.success ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">OpenRouter is working! Response: "{testResult.response}"</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Error: {testResult.error}</span>
                    </div>
                    {testResult.solution && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">💡 Solution: {testResult.solution}</div>
                    )}
                    {testResult.getKey && (
                      <div className="text-sm">
                        <a
                          href={testResult.getKey}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          Get API Key <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
