"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { useChatStore } from "@/lib/stores/chat-store"
import { Monitor, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { OllamaSetup } from "@/components/ollama-setup"

export function OllamaStatusIcon() {
  const { selectedProvider, ollamaUrl } = useChatStore()
  const [status, setStatus] = useState<"checking" | "connected" | "disconnected">("checking")
  const [isOpen, setIsOpen] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkStatus = async () => {
    if (selectedProvider !== "ollama") return

    console.log("🔍 Ollama Status Icon: Checking status...")
    setStatus("checking")

    try {
      const response = await fetch("/api/ollama/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ollamaUrl }),
        signal: AbortSignal.timeout(10000),
      })

      const result = await response.json()
      console.log("🔍 Ollama Status Icon: API result:", result)

      setStatus(result.success ? "connected" : "disconnected")
      setLastCheck(new Date())
    } catch (error: any) {
      console.error("🔍 Ollama Status Icon: Check failed:", error)
      setStatus("disconnected")
      setLastCheck(new Date())
    }
  }

  useEffect(() => {
    if (selectedProvider === "ollama") {
      console.log("🔍 Ollama Status Icon: Provider is Ollama, starting checks...")
      checkStatus()

      // Check every 30 seconds
      const interval = setInterval(checkStatus, 30000)
      return () => {
        console.log("🔍 Ollama Status Icon: Cleaning up interval")
        clearInterval(interval)
      }
    } else {
      console.log("🔍 Ollama Status Icon: Provider is not Ollama, skipping checks")
    }
  }, [selectedProvider, ollamaUrl])

  if (selectedProvider !== "ollama") {
    return null
  }

  const getIcon = () => {
    switch (status) {
      case "checking":
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
      case "connected":
        return <Wifi className="w-4 h-4 text-green-500" />
      case "disconnected":
        return <WifiOff className="w-4 h-4 text-red-500" />
      default:
        return <Monitor className="w-4 h-4 text-gray-500" />
    }
  }

  const getTitle = () => {
    const baseTitle =
      {
        checking: "Checking Ollama connection...",
        connected: "Ollama connected",
        disconnected: "Ollama disconnected - click to setup",
      }[status] || "Ollama status unknown"

    return lastCheck ? `${baseTitle} (last checked: ${lastCheck.toLocaleTimeString()})` : baseTitle
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={getTitle()}
          onClick={() => {
            console.log("🔍 Ollama Status Icon: Clicked, current status:", status)
            // Trigger a fresh check when clicked
            if (status === "disconnected") {
              checkStatus()
            }
          }}
        >
          {getIcon()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogDescription className="sr-only">Configure and manage your Ollama server connection</DialogDescription>
        <OllamaSetup />
      </DialogContent>
    </Dialog>
  )
}
