"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useChatStore } from "@/lib/stores/chat-store"
import { Monitor, CheckCircle, XCircle, RefreshCw, Terminal, Download } from "lucide-react"

export function OllamaChecker() {
  const { selectedProvider, selectedModel, setSelectedModel } = useChatStore()
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "running" | "not-running" | "error">("checking")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isModelInstalled, setIsModelInstalled] = useState(false)

  const checkOllamaStatus = async () => {
    setOllamaStatus("checking")

    try {
      // Check if Ollama is running
      const response = await fetch(`${process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || "http://localhost:11434"}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (response.ok) {
        const data = await response.json()
        setOllamaStatus("running")
        const models = data.models?.map((m: any) => m.name) || []
        setAvailableModels(models)

        // Check if current model is installed
        setIsModelInstalled(models.includes(selectedModel))
      } else {
        setOllamaStatus("not-running")
      }
    } catch (error) {
      console.log("Ollama check failed:", error)
      setOllamaStatus("not-running")
    }
  }

  useEffect(() => {
    if (selectedProvider === "ollama") {
      checkOllamaStatus()
    }
  }, [selectedProvider, selectedModel])

  const switchToWorkingModel = () => {
    setSelectedModel("meta-llama/llama-3.2-3b-instruct:free")
  }

  const getModelPullCommand = (model: string) => {
    // Convert our model IDs to Ollama pull commands
    const modelMap: Record<string, string> = {
      "llama3.2:3b": "llama3.2:3b",
      "llama3.2:1b": "llama3.2:1b",
      "llama3.1:8b": "llama3.1:8b",
      "mistral:7b": "mistral:7b",
      "codellama:7b": "codellama:7b",
      "qwen2.5:7b": "qwen2.5:7b",
    }
    return modelMap[model] || model
  }

  if (selectedProvider !== "ollama") {
    return null
  }

  return (
    <div className="px-4 py-2">
      <Alert variant={ollamaStatus === "running" && isModelInstalled ? "default" : "destructive"}>
        <Monitor className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Ollama Status:</span>
                {ollamaStatus === "checking" && (
                  <Badge variant="secondary">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Checking...
                  </Badge>
                )}
                {ollamaStatus === "running" && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Running
                  </Badge>
                )}
                {ollamaStatus === "not-running" && (
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Running
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={checkOllamaStatus}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
                <Button variant="ghost" size="sm" onClick={switchToWorkingModel}>
                  Use OpenRouter
                </Button>
              </div>
            </div>

            {ollamaStatus === "not-running" && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <div className="flex items-center gap-1 mb-2">
                  <Terminal className="w-4 h-4" />
                  <span className="font-medium">Setup Ollama:</span>
                </div>
                <div className="space-y-1 text-sm font-mono">
                  <div className="text-gray-600 dark:text-gray-400"># 1. Install Ollama</div>
                  <div className="bg-black text-green-400 p-2 rounded">
                    curl -fsSL https://ollama.ai/install.sh | sh
                  </div>

                  <div className="text-gray-600 dark:text-gray-400 mt-2"># 2. Start Ollama server</div>
                  <div className="bg-black text-green-400 p-2 rounded">ollama serve</div>

                  <div className="text-gray-600 dark:text-gray-400 mt-2"># 3. Pull a model</div>
                  <div className="bg-black text-green-400 p-2 rounded">
                    ollama pull {getModelPullCommand(selectedModel)}
                  </div>
                </div>
              </div>
            )}

            {ollamaStatus === "running" && !isModelInstalled && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                <div className="flex items-center gap-1 mb-2">
                  <Download className="w-4 h-4" />
                  <span className="font-medium">Model Not Installed:</span>
                </div>
                <div className="text-sm">
                  <p className="mb-2">The model "{selectedModel}" is not installed. Run this command:</p>
                  <div className="bg-black text-green-400 p-2 rounded font-mono">
                    ollama pull {getModelPullCommand(selectedModel)}
                  </div>
                </div>
              </div>
            )}

            {ollamaStatus === "running" && availableModels.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                <div className="text-sm">
                  <p className="font-medium mb-1">Available models:</p>
                  <div className="flex flex-wrap gap-1">
                    {availableModels.map((model) => (
                      <Badge key={model} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                  {isModelInstalled && (
                    <div className="flex items-center gap-1 mt-2 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span className="text-xs">Current model is ready!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {ollamaStatus === "running" && availableModels.length === 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <div className="text-sm">
                  <p className="mb-2">Ollama is running but no models are installed. Install a model:</p>
                  <div className="bg-black text-green-400 p-2 rounded font-mono">ollama pull llama3.2:3b</div>
                </div>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
