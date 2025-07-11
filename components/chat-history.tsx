"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useChatStore, type ChatSession } from "@/lib/stores/chat-store"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase/client"
import {
  Plus,
  MessageSquare,
  MoreHorizontal,
  Edit2,
  Trash2,
  Search,
  Calendar,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ChatHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNewChat: () => void
  onSessionSelect?: (session: ChatSession) => void
}

export function ChatHistory({ open, onOpenChange, onNewChat, onSessionSelect }: ChatHistoryProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [loadingError, setLoadingError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  const { sessions, currentSession, setSessions, setCurrentSession, updateSession, deleteSession, setMessages } =
    useChatStore()

  const filteredSessions = sessions.filter((session) => session.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const loadSessions = async () => {
    if (!user) {
      setLoadingError("User not authenticated")
      return
    }

    setIsLoading(true)
    setLoadingError("")

    try {
      console.log("Loading chat sessions for user:", user.id)

      // Try to load sessions with graceful fallback for missing columns
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("Error loading sessions:", error)

        if (error.code === "PGRST116") {
          throw new Error("Chat sessions table not found. Please run the database setup.")
        } else if (error.message?.includes("JWT")) {
          throw new Error("Authentication expired. Please refresh the page.")
        } else {
          throw new Error(`Database error: ${error.message}`)
        }
      }

      console.log(`Loaded ${data?.length || 0} sessions`)

      // Process sessions with message counts
      interface Session {
        id: string;
        title: string;
        model: string;
        provider?: string;
        created_at: string;
        updated_at: string;
        user_id: string;
      }

      const sessionsWithCounts = await Promise.all(
        (data || [] as Session[]).map(async (session: Session) => {
          try {
            // Get all messages for this session
            const { data: messages, error } = await supabase
              .from("chat_messages")
              .select("*")
              .eq("session_id", session.id)
              .order("created_at", { ascending: true });

            if (error) throw error;

            // If session has fewer than 2 messages, delete it
            if (messages.length < 2) {
              console.log(`Deleting session ${session.id} with ${messages.length} messages`);
              await supabase.from("chat_messages").delete().eq("session_id", session.id);
              await supabase.from("chat_sessions").delete().eq("id", session.id);
              return null; // This session will be filtered out
            }

            return {
              id: session.id,
              title: session.title,
              model: session.model,
              provider: session.provider || "openai",
              created_at: new Date(session.created_at),
              updated_at: new Date(session.updated_at),
              message_count: messages.length,
            };
          } catch (error) {
            console.error("Error processing session:", session.id, error);
            return null; // Skip this session if there's an error
          }
        }),
      );

      // Filter out null sessions and update state
      const validSessions = sessionsWithCounts.filter(Boolean) as ChatSession[];
      setSessions(validSessions);
      console.log("Sessions loaded successfully")
    } catch (error: any) {
      console.error("Error loading sessions:", error)
      setLoadingError(error.message || "Failed to load chat history")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSessionSelect = async (session: ChatSession) => {
    console.log("Selecting session:", session.id)

    // Call the parent's session select handler if provided
    if (onSessionSelect) {
      onSessionSelect(session)
    } else {
      // Fallback to default behavior
      setCurrentSession(session)
    }

    onOpenChange(false) // Close the history panel
  }

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      console.log("Renaming session:", sessionId, "to:", newTitle)

      const { data, error } = await supabase
        .from("chat_sessions")
        .update({ 
          title: newTitle,
          updated_at: new Date().toISOString() 
        })
        .eq("id", sessionId)
        .eq("user_id", user?.id) // Extra security check
        .select()
        .single()

      if (error) {
        console.error("Rename error:", error)
        throw error
      }

      // Update the session in the local state
      updateSession(sessionId, { 
        title: newTitle,
        updated_at: new Date(data.updated_at)
      })
      
      // Clear editing state
      setEditingId(null)
      setEditTitle("")
      
      console.log("Session renamed successfully")
    } catch (error: any) {
      console.error("Error renaming session:", error)
      setLoadingError(`Failed to rename session: ${error.message}`)
      // Reset editing state on error
      setEditingId(null)
      setEditTitle("")
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) {
      setLoadingError("User not authenticated")
      return
    }

    // Prevent double-clicking
    if (deletingId === sessionId) {
      console.log("Already deleting session:", sessionId)
      return
    }

    setDeletingId(sessionId)
    console.log("=== DELETING SESSION ===")
    console.log("Session ID:", sessionId)
    console.log("User ID:", user.id)

    try {
      // Step 1: Delete all messages for this session
      console.log("Step 1: Deleting messages...")
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", user.id) // Extra security

      if (messagesError) {
        console.error("Error deleting messages:", messagesError)
        // Continue anyway - maybe there were no messages
      } else {
        console.log("Messages deleted successfully")
      }

      // Step 2: Delete the session
      console.log("Step 2: Deleting session...")
      const { error: sessionError } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", user.id) // Extra security

      if (sessionError) {
        console.error("Error deleting session:", sessionError)
        throw sessionError
      }

      console.log("Session deleted successfully")

      // Step 3: Update local state
      deleteSession(sessionId)

      // Step 4: If this was the current session, clear it
      if (currentSession?.id === sessionId) {
        console.log("Deleted session was current session, clearing...")
        setCurrentSession(null)
        setMessages([])
      }

      console.log("=== SESSION DELETION COMPLETE ===")
    } catch (error: any) {
      console.error("=== SESSION DELETION FAILED ===")
      console.error("Error:", error)
      setLoadingError(`Failed to delete session: ${error.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  // Handle saving when clicking outside or pressing Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && editingId) {
        const session = sessions.find(s => s.id === editingId);
        if (session) {
          handleRenameSession(editingId, editTitle.trim() || session.title);
        }
      } else if (e.key === 'Escape' && editingId) {
        setEditingId(null);
        setEditTitle('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingId, editTitle, sessions]);

  // Load sessions when panel opens
  useEffect(() => {
    if (open && user) {
      loadSessions()
    }
  }, [open, user])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-blue-200/50 flex-shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <span>Chat History</span>
            <Button
              size="sm"
              onClick={() => {
                onNewChat()
                onOpenChange(false)
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 border-b border-blue-200/50 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading Error */}
        {loadingError && (
          <div className="p-4 flex-shrink-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="flex-1">{loadingError}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={loadSessions}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => setLoadingError("")}>
                    ×
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Scrollable Sessions List */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Loading conversations...</p>
                </div>
              ) : filteredSessions.length === 0 && !loadingError ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <Button variant="ghost" size="sm" onClick={loadSessions} className="mt-2 text-xs">
                    Refresh
                  </Button>
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                      currentSession?.id === session.id
                        ? "bg-blue-100 dark:bg-blue-900/50"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    } ${deletingId === session.id ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => !deletingId && handleSessionSelect(session)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {editingId === session.id ? (
                          <div className="w-full">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-8 text-sm w-full"
                              autoFocus
                              onFocus={(e) => e.target.select()}
                            />
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleRenameSession(session.id, editTitle.trim() || session.title)}
                              >
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditTitle('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <h4 className="font-medium text-sm truncate">
                            {deletingId === session.id ? "Deleting..." : session.title}
                          </h4>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {session.model}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {session.provider}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {session.message_count} messages
                          </span>
                        </div>

                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(session.updated_at, { addSuffix: true })}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(session.id);
                              setEditTitle(session.title);
                            }}
                            disabled={deletingId === session.id || editingId != null}
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingId(session.id)
                              setEditTitle(session.title)
                              // Small delay to ensure the input is rendered before focusing
                              setTimeout(() => {
                                const input = document.querySelector(`[data-session-id="${session.id}"] input`)
                                if (input instanceof HTMLInputElement) {
                                  input.focus()
                                  input.select()
                                }
                              }, 10)
                            }}
                            disabled={deletingId === session.id}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`Are you sure you want to delete "${session.title}"?`)) {
                                handleDeleteSession(session.id)
                              }
                            }}
                            className="text-red-600 dark:text-red-400"
                            disabled={deletingId === session.id}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
