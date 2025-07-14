"use client"
import { useState, useEffect } from "react"
import { Bot, Globe, Monitor, CheckCircle, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useChatStore, type AIProvider } from "@/lib/stores/chat-store"

export function ModelInput() {
  const { selectedModel, selectedProvider, setSelectedModel, setSelectedProvider } = useChatStore()
  const [modelName, setModelName] = useState(selectedModel)
  const [isOpen, setIsOpen] = useState(false)

  const providers: { id: AIProvider; name: string; icon: JSX.Element }[] = [
    { id: "openai", name: "OpenAI", icon: <Bot className="w-4 h-4" /> },
    { id: "openrouter", name: "OpenRouter", icon: <Globe className="w-4 h-4" /> },
    { id: "ollama", name: "Ollama", icon: <Monitor className="w-4 h-4" /> },
  ]

  const getProviderIcon = (provider: AIProvider) => {
    return providers.find(p => p.id === provider)?.icon || <Bot className="w-4 h-4" />
  }

  const handleProviderSelect = (provider: AIProvider) => {
    setSelectedProvider(provider)
    setIsOpen(false)
  }

  const handleSave = () => {
    if (modelName.trim()) {
      setSelectedModel(modelName.trim())
    }
  }

  // Update local state when store changes
  useEffect(() => {
    setModelName(selectedModel)
  }, [selectedModel])

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="w-10 h-10">
            {getProviderIcon(selectedProvider)}
            <span className="sr-only">Select AI Provider</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                variant="ghost"
                className={`w-full justify-start ${selectedProvider === provider.id ? 'bg-accent' : ''}`}
                onClick={() => handleProviderSelect(provider.id)}
              >
                <span className="mr-2">{provider.icon}</span>
                {provider.name}
                {selectedProvider === provider.id && (
                  <CheckCircle className="ml-auto h-4 w-4 text-green-500" />
                )}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="relative flex-1">
        <Input
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Enter model name (e.g., gpt-4o)"
          className="pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
          {modelName !== selectedModel ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleSave}
            >
              Save
            </Button>
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>
      </div>
    </div>
  )
}
