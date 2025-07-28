"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { ModelInput } from "@/components/model-input"
import { SettingsDialog } from "@/components/settings-dialog"
import { useChatStore } from "@/lib/stores/chat-store"
import { MessageSquare, History, FileText, Settings, Info, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { OllamaStatusIcon } from "@/components/ollama-status-icon"

interface ChatHeaderProps {
  onToggleHistory: () => void
  onToggleDocuments: () => void
}

export function ChatHeader({ onToggleHistory, onToggleDocuments }: ChatHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { currentSession } = useChatStore()
  const router = useRouter()

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

          {/* Model Input with Info */}
          <div className="flex items-center gap-2">
            <ModelInput />
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative group">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-500 hover:text-blue-600"
                  >
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Model information</span>
                  </Button>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    Click for model information
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-800"></div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Model Information</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Need help choosing a model? Here are some resources:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">OpenRouter Models</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Access a variety of models from different providers through OpenRouter.
                      </p>
                      <a
                        href="https://openrouter.ai/models"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Browse OpenRouter models
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">OpenAI Models</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Learn about the latest models available from OpenAI.
                      </p>
                      <a
                        href="https://platform.openai.com/docs/models"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Browse OpenAI models
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      💡 <span className="font-medium">Tip:</span> Select your provider first, then enter the model name (e.g., "gpt-4" or "anthropic/claude-2")
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Session Info */}
          {currentSession && <span className="text-sm text-gray-600 dark:text-gray-300">{currentSession.title}</span>}
        </div>

        <div className="flex items-center space-x-2">
          {/* Fine-tuning Button */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            onClick={() => router.push('/fine-tuning')}
          >
            <Sparkles className="h-4 w-4" />
            <span>Fine-tune</span>
          </Button>

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

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <ThemeToggle />
          <UserMenu />
        </div>

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </header>
  )
}
