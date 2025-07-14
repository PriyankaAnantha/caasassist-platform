"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, Globe, Monitor, Eye, EyeOff, Settings } from "lucide-react"
import { useSettingsStore } from "@/lib/stores/settings-store"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { apiKeys, setApiKey, clearApiKey } = useSettingsStore()
  const [showKeys, setShowKeys] = useState({
    openai: false,
    openrouter: false,
    ollama: false,
  })

  const [localKeys, setLocalKeys] = useState({
    openai: apiKeys.openai || "",
    openrouter: apiKeys.openrouter || "",
    ollama: apiKeys.ollama || "http://localhost:11434"
  })

  const handleSave = () => {
    if (localKeys.openai) setApiKey('openai', localKeys.openai)
    if (localKeys.openrouter) setApiKey('openrouter', localKeys.openrouter)
    if (localKeys.ollama) setApiKey('ollama', localKeys.ollama)
    onOpenChange(false)
  }

  const toggleKeyVisibility = (provider: keyof typeof showKeys) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* OpenAI API Key */}
          <div className="space-y-2">
            <Label htmlFor="openai-key" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              OpenAI API Key
            </Label>
            <div className="relative">
              <Input
                id="openai-key"
                type={showKeys.openai ? "text" : "password"}
                value={localKeys.openai}
                onChange={(e) => setLocalKeys({...localKeys, openai: e.target.value})}
                placeholder="sk-..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => toggleKeyVisibility('openai')}
              >
                {showKeys.openai ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* OpenRouter API Key */}
          <div className="space-y-2">
            <Label htmlFor="openrouter-key" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              OpenRouter API Key
            </Label>
            <div className="relative">
              <Input
                id="openrouter-key"
                type={showKeys.openrouter ? "text" : "password"}
                value={localKeys.openrouter}
                onChange={(e) => setLocalKeys({...localKeys, openrouter: e.target.value})}
                placeholder="sk-or-..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => toggleKeyVisibility('openrouter')}
              >
                {showKeys.openrouter ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Ollama URL */}
          <div className="space-y-2">
            <Label htmlFor="ollama-url" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Ollama URL
            </Label>
            <Input
              id="ollama-url"
              type="text"
              value={localKeys.ollama}
              onChange={(e) => setLocalKeys({...localKeys, ollama: e.target.value})}
              placeholder="http://localhost:11434"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
