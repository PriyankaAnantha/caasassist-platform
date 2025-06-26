"use client"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useChatStore, AVAILABLE_MODELS, type AIProvider } from "@/lib/stores/chat-store"
import { Bot, Zap, Globe, Monitor, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

export function ModelSelector() {
  const { selectedModel, setSelectedModel } = useChatStore()

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case "openai":
        return <Bot className="w-3 h-3" />
      case "openrouter":
        return <Globe className="w-3 h-3" />
      case "ollama":
        return <Monitor className="w-3 h-3" />
    }
  }

  const getProviderColor = (provider: AIProvider) => {
    switch (provider) {
      case "openai":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      case "openrouter":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      case "ollama":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
    }
  }

  const getStatusIcon = (working?: boolean) => {
    if (working === true) return <CheckCircle className="w-3 h-3 text-green-500" />
    if (working === false) return <XCircle className="w-3 h-3 text-red-500" />
    return <AlertTriangle className="w-3 h-3 text-yellow-500" />
  }

  const selectedModelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel)

  // Group models by status
  const workingModels = AVAILABLE_MODELS.filter((model) => model.working === true && !model.requiresSetup)
  const workingSetupModels = AVAILABLE_MODELS.filter((model) => model.working === true && model.requiresSetup)
  const problematicModels = AVAILABLE_MODELS.filter((model) => model.working === false)

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger className="w-80">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {/* Working Models - No Setup Required */}
          <div className="p-2 text-xs text-gray-600 border-b">
            <div className="font-medium mb-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              Ready to use (no setup required)
            </div>
          </div>
          {workingModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {getProviderIcon(model.provider)}
                  <span className="font-medium">{model.name}</span>
                  {getStatusIcon(model.working)}
                  {model.free && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                      <Zap className="w-2 h-2 mr-1" />
                      Free
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{model.description}</div>
            </SelectItem>
          ))}

          {/* Working Models - Setup Required */}
          <div className="p-2 text-xs text-gray-600 border-b border-t mt-2">
            <div className="font-medium mb-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              Working (setup required)
            </div>
          </div>
          {workingSetupModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {getProviderIcon(model.provider)}
                  <span className="font-medium">{model.name}</span>
                  {getStatusIcon(model.working)}
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  {model.free && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                      <Zap className="w-2 h-2 mr-1" />
                      Free
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{model.description}</div>
            </SelectItem>
          ))}

          {/* Problematic Models */}
          {problematicModels.length > 0 && (
            <>
              <div className="p-2 text-xs text-gray-600 border-b border-t mt-2">
                <div className="font-medium mb-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-500" />
                  Known issues (may not work)
                </div>
              </div>
              {problematicModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(model.provider)}
                      <span className="font-medium text-gray-500">{model.name}</span>
                      {getStatusIcon(model.working)}
                      {model.free && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                          <Zap className="w-2 h-2 mr-1" />
                          Free
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{model.description}</div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {selectedModelInfo && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={getProviderColor(selectedModelInfo.provider)}>
            {getProviderIcon(selectedModelInfo.provider)}
            <span className="ml-1 capitalize">{selectedModelInfo.provider}</span>
          </Badge>
          {selectedModelInfo.free && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <Zap className="w-3 h-3 mr-1" />
              Free
            </Badge>
          )}
          {selectedModelInfo.requiresSetup && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Setup Required
            </Badge>
          )}
          {getStatusIcon(selectedModelInfo.working)}
        </div>
      )}
    </div>
  )
}
