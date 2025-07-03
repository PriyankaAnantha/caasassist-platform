"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useChatStore } from "@/lib/stores/chat-store"
import {
  Monitor,
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  Terminal,
  Download,
  ExternalLink,
  Wifi,
  WifiOff,
} from "lucide-react"

export function OllamaSetup() {
  const { selectedProvider, selectedModel, ollamaUrl, setOllamaUrl } = useChatStore()
  const [isOpen, setIsOpen] = useState(false)
  const [tempUrl, setTempUrl] = useState(ollamaUrl)
  const [status, setStatus] = useState<"checking" | "connected" | "disconnected" | "error">("checking")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isModelInstalled, setIsModelInstalled] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [suggestion, setSuggestion] = useState("")
  const [isChecking, setIsChecking] = useState(false)

  const checkOllamaConnection = async (url: string = ollamaUrl) => {
    if (isChecking) {
      console.log("Already checking connection, skipping...")
      return
    }

    setIsChecking(true)
    setStatus("checking")
    setErrorMessage("")
    setSuggestion("")

    try {
      console.log("=== Ollama Connection Check ===")
      console.log("Testing URL:", url)
      console.log("Using API proxy at /api/ollama/status")

      const response = await fetch("/api/ollama/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ollamaUrl: url }),
        // Add timeout on client side too
        signal: AbortSignal.timeout(10000),
      })

      console.log("API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API response error:", errorText)
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log("API response data:", result)

      if (result.success) {
        setAvailableModels(result.models || [])
        setIsModelInstalled(result.models?.includes(selectedModel) || false)
        setStatus("connected")
        console.log("✅ Ollama connected successfully")
        console.log("Available models:", result.models)
      } else {
        setStatus("disconnected")
        setErrorMessage(result.error || "Connection failed")
        setSuggestion(result.suggestion || "Check Ollama server status")
        console.log("❌ Ollama connection failed:", result.error)
      }
    } catch (error: any) {
      console.error("=== Ollama Connection Error ===")
      console.error("Error:", error)
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)

      setStatus("error")

      if (error.name === "AbortError" || error.message?.includes("timeout")) {
        setErrorMessage("Connection timeout")
        setSuggestion("Ollama server is not responding. Make sure it's running.")
      } else if (error.message?.includes("Failed to fetch") || error.message?.includes("fetch")) {
        setErrorMessage("Network error")
        setSuggestion("Cannot reach the API. Check if the development server is running.")
      } else if (error.message?.includes("API request failed")) {
        setErrorMessage("API error")
        setSuggestion("The proxy API returned an error. Check server logs.")
      } else {
        setErrorMessage(error.message || "Unknown error")
        setSuggestion("Check browser console and server logs for details.")
      }
    } finally {
      setIsChecking(false)
    }
  }

  const handleSaveUrl = () => {
    const cleanUrl = tempUrl.replace(/\/v1$/, "").replace(/\/$/, "")
    console.log("Saving Ollama URL:", cleanUrl)
    setOllamaUrl(cleanUrl)
    checkOllamaConnection(cleanUrl)
    setIsOpen(false)
  }

  const resetToDefault = () => {
    setTempUrl("http://localhost:11434")
  }

  const testDirectConnection = async () => {
    console.log("=== Testing Direct Ollama Connection ===")
    const testUrl = `${ollamaUrl}/api/tags`
    console.log("Direct test URL:", testUrl)

    try {
      // This will likely fail due to CORS, but let's see what happens
      const response = await fetch(testUrl, {
        method: "GET",
        mode: "cors",
        signal: AbortSignal.timeout(5000),
      })

      console.log("Direct connection successful:", response.status)
      const data = await response.json()
      console.log("Direct response data:", data)
    } catch (error: any) {
      console.log("Direct connection failed (expected due to CORS):", error.message)
      console.log("This is why we use the API proxy")
    }
  }

  // Check connection when provider changes to ollama
  useEffect(() => {
    if (selectedProvider === "ollama") {
      console.log("Provider changed to Ollama, checking connection...")
      checkOllamaConnection()
    }
  }, [selectedProvider, selectedModel, ollamaUrl])

  // Update temp URL when ollama URL changes
  useEffect(() => {
    setTempUrl(ollamaUrl)
  }, [ollamaUrl])

  const getModelPullCommand = (model: string) => {
    const modelMap: Record<string, string> = {
      "llama3.2:3b": "llama3.2:3b",
      "llama3.2:1b": "llama3.2:1b",
      "llama3.1:8b": "llama3.1:8b",
      "mistral:7b": "mistral:7b",
      "codellama:7b": "codellama:7b",
      "qwen2.5:7b": "qwen2.5:7b",
      "mistral:latest": "mistral:latest",
      "qwen:7b": "qwen:7b",
      "llama3:latest": "llama3:latest",
      "phi:latest": "phi:latest",
    }
    return modelMap[model] || model
  }

  if (selectedProvider !== "ollama") {
    return null
  }

  const StatusIcon = () => {
    switch (status) {
      case "checking":
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
      case "connected":
        return <Wifi className="w-4 h-4 text-green-500" />
      case "disconnected":
      case "error":
        return <WifiOff className="w-4 h-4 text-red-500" />
      default:
        return <Monitor className="w-4 h-4 text-gray-500" />
    }
  }

  const StatusBadge = () => {
    switch (status) {
      case "checking":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Checking...
          </Badge>
        )
      case "connected":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        )
      case "disconnected":
      case "error":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Disconnected
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <StatusIcon />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Ollama Server</span>
              <StatusBadge />
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{ollamaUrl}</div>
            {errorMessage && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{errorMessage}</div>}
            {suggestion && <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">💡 {suggestion}</div>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => checkOllamaConnection()} disabled={isChecking}>
            <RefreshCw className={`h-3 w-3 mr-1 ${isChecking ? "animate-spin" : ""}`} />
            Test
          </Button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-3 w-3 mr-1" />
                Setup
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Ollama Configuration
                </DialogTitle>
                <DialogDescription>
                  Configure your Ollama server connection and check available models.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ollama-url">Ollama Server URL</Label>
                  <Input
                    id="ollama-url"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetToDefault}>
                      Reset to Default
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => checkOllamaConnection(tempUrl)}
                      disabled={isChecking}
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${isChecking ? "animate-spin" : ""}`} />
                      Test Connection
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testDirectConnection}
                      className="text-xs bg-transparent"
                    >
                      Debug
                    </Button>
                  </div>
                </div>

                {(errorMessage || suggestion) && (
                  <Alert variant={status === "error" ? "destructive" : "default"}>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        {errorMessage && <div className="font-medium">{errorMessage}</div>}
                        {suggestion && <div className="text-sm">💡 {suggestion}</div>}

                        <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2">
                          <div className="font-medium mb-1">Troubleshooting Steps:</div>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>
                              Make sure Ollama is running: <code>ollama serve</code>
                            </li>
                            <li>
                              Check if accessible: <code>curl {ollamaUrl}/api/tags</code>
                            </li>
                            <li>Verify port 11434 is not blocked</li>
                            <li>Check browser console for detailed errors</li>
                          </ol>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {status === "disconnected" && (
                  <Card className="bg-gray-50 dark:bg-gray-900">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        Quick Setup Guide
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1">1. Install Ollama</div>
                        <div className="bg-black text-green-400 p-2 rounded text-xs font-mono">
                          curl -fsSL https://ollama.ai/install.sh | sh
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Or download from{" "}
                          <a
                            href="https://ollama.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            ollama.ai <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-1">2. Start Ollama Server</div>
                        <div className="bg-black text-green-400 p-2 rounded text-xs font-mono">ollama serve</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Should show: "Ollama is running on http://localhost:11434"
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-1">3. Pull a Model</div>
                        <div className="bg-black text-green-400 p-2 rounded text-xs font-mono">
                          ollama pull {getModelPullCommand(selectedModel)}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-1">4. Test Connection</div>
                        <div className="bg-black text-green-400 p-2 rounded text-xs font-mono">
                          curl http://localhost:11434/api/tags
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Should return JSON with your models</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {status === "connected" && (
                  <Card className="bg-green-50 dark:bg-green-900/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-sm">Connection Successful!</span>
                      </div>

                      {availableModels.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Available Models ({availableModels.length}):</div>
                          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                            {availableModels.map((model) => (
                              <Badge
                                key={model}
                                variant="outline"
                                className={`text-xs ${
                                  model === selectedModel ? "bg-green-100 text-green-700 border-green-300" : ""
                                }`}
                              >
                                {model}
                                {model === selectedModel && <CheckCircle className="w-3 h-3 ml-1" />}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isModelInstalled && (
                        <Alert className="mt-3">
                          <Download className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <div>Model "{selectedModel}" not found. Install it:</div>
                              <div className="bg-black text-green-400 p-2 rounded text-xs font-mono">
                                ollama pull {getModelPullCommand(selectedModel)}
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveUrl}>Save Configuration</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
