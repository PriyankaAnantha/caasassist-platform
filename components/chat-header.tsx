"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { ModelSelector } from "@/components/model-selector"
import { useChatStore } from "@/lib/stores/chat-store"
import { MessageSquare, History, FileText } from "lucide-react"
import { OllamaStatusIcon } from "@/components/ollama-status-icon"

interface ChatHeaderProps {
  onToggleHistory: () => void
  onToggleDocuments: () => void
}

export function ChatHeader({ onToggleHistory, onToggleDocuments }: ChatHeaderProps) {
  const { currentSession } = useChatStore()

  return (
    <header className="border-b border-blue-200/50 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 dark:border-gray-700/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              CaaSAssist
            </span>
          </div>

          {/* Model Selector */}
          <ModelSelector />

          {/* Session Info */}
          {currentSession && <span className="text-sm text-gray-600 dark:text-gray-300">{currentSession.title}</span>}
        </div>

        <div className="flex items-center space-x-2">
          {/* Action Buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleHistory}
            className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400"
          >
            <History className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDocuments}
            className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400"
          >
            <FileText className="w-4 h-4" />
          </Button>

          <OllamaStatusIcon />

          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
