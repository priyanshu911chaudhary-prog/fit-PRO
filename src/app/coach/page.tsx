"use client";

import React, { Suspense, useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Sparkles,
  ShieldAlert,
  Trash2,
  User,
  Loader2,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConversationSummary {
  _id: string;
  title: string;
  messageCount: number;
  lastMessage: {
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const PROMPT_SUGGESTIONS = [
  "How can I increase pull-up strength safely?",
  "Suggest a high-protein post-workout vegetarian meal",
  "How should I structure my rest days between hypertrophy sessions?",
  "Tips for optimizing hydration during intense cardio",
];

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I am your AI Fitness Coach powered by Google Gemini. Whether you need workout adjustments, form cues, macronutrient strategies, or recovery advice, I am here to help you achieve your goals safely and efficiently. What can we focus on today?",
  timestamp: "12:00 PM",
};

const LOCAL_STORAGE_ACTIVE_CHAT_KEY = "fitpro_active_coach_chat_id";

function CoachContent() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("New Chat");
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const accumulatedRef = useRef<string>("");
  const msgIdCounter = useRef(1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Load conversation messages by ID
  const loadConversation = useCallback(async (convId: string) => {
    try {
      setIsLoadingMessages(true);
      const res = await fetch(`/api/coach/conversations/${convId}`);
      if (!res.ok) {
        throw new Error("Failed to load conversation");
      }
      const data = await res.json();
      if (data.success && data.data?.conversation) {
        const conv = data.data.conversation;
        setActiveConversationId(conv._id);
        setActiveTitle(conv.title || "Conversation");
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_ACTIVE_CHAT_KEY, conv._id);
        }

        if (Array.isArray(conv.messages) && conv.messages.length > 0) {
          const mappedMessages: ChatMessage[] = conv.messages.map(
            (m: { _id?: string; role: "user" | "assistant"; content: string; createdAt?: string }, idx: number) => ({
              id: m._id || `msg-${idx}`,
              role: m.role,
              content: m.content,
              timestamp: m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Recent",
            })
          );
          setMessages(mappedMessages);
        } else {
          setMessages([DEFAULT_WELCOME_MESSAGE]);
        }
      }
    } catch {
      toast.error("Could not load conversation messages");
      setActiveConversationId(null);
      setMessages([DEFAULT_WELCOME_MESSAGE]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Fetch list of previous conversations
  const fetchConversations = useCallback(
    async (preferredId?: string | null) => {
      try {
        setIsLoadingConversations(true);
        const res = await fetch("/api/coach/conversations");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.conversations)) {
          const list: ConversationSummary[] = data.data.conversations;
          setConversations(list);

          const storedId =
            preferredId !== undefined
              ? preferredId
              : typeof window !== "undefined"
              ? localStorage.getItem(LOCAL_STORAGE_ACTIVE_CHAT_KEY)
              : null;

          if (storedId && list.some((c) => c._id === storedId)) {
            await loadConversation(storedId);
          } else if (list.length > 0) {
            await loadConversation(list[0]._id);
          } else {
            setActiveConversationId(null);
            setActiveTitle("New Chat");
            setMessages([DEFAULT_WELCOME_MESSAGE]);
          }
        }
      } catch {
        // Quiet fallback
      } finally {
        setIsLoadingConversations(false);
      }
    },
    [loadConversation]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewChat = () => {
    if (isStreaming) return;
    setActiveConversationId(null);
    setActiveTitle("New Chat");
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_CHAT_KEY);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/coach/conversations/${convId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Conversation deleted");
        setConversations((prev) => prev.filter((c) => c._id !== convId));
        if (activeConversationId === convId) {
          handleNewChat();
        }
      } else {
        toast.error("Failed to delete conversation");
      }
    } catch {
      toast.error("Network error deleting conversation");
    }
  };

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isStreaming) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `user-${msgIdCounter.current++}`;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: prompt,
      timestamp: currentTime,
    };

    // If active conversation had default welcome message, replace it
    const cleanCurrentMessages =
      messages.length === 1 && messages[0].id.startsWith("welcome") ? [] : messages;

    const newMessages = [...cleanCurrentMessages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMsgId = `assistant-${msgIdCounter.current++}`;
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: currentTime,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    accumulatedRef.current = "";

    const historyPayload = newMessages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content.slice(0, 1000),
    }));

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          conversationId: activeConversationId,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to AI Coach stream");
      }

      // Check header for conversation ID
      const headerConvId = response.headers.get("X-Conversation-Id");
      if (headerConvId && headerConvId !== activeConversationId) {
        setActiveConversationId(headerConvId);
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_ACTIVE_CHAT_KEY, headerConvId);
        }
      }

      if (!response.body) {
        throw new Error("No response body available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawData = line.slice(6).trim();
            if (rawData === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(rawData);
              if (parsed.chunk) {
                accumulatedRef.current += parsed.chunk;
                const updatedContent = accumulatedRef.current;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId ? { ...msg, content: updatedContent } : msg
                  )
                );
              }
              if (parsed.conversationId) {
                setActiveConversationId(parsed.conversationId);
                if (typeof window !== "undefined") {
                  localStorage.setItem(LOCAL_STORAGE_ACTIVE_CHAT_KEY, parsed.conversationId);
                }
              }
              if (parsed.title) {
                setActiveTitle(parsed.title);
              }
            } catch {
              if (rawData && rawData !== "[DONE]") {
                accumulatedRef.current += rawData + " ";
                const updatedContent = accumulatedRef.current;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId ? { ...msg, content: updatedContent } : msg
                  )
                );
              }
            }
          }
        }
      }

      // Re-sync conversation list quietly
      fetch("/api/coach/conversations")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data?.conversations)) {
            setConversations(data.data.conversations);
          }
        })
        .catch(() => {});
    } catch {
      // Fallback to JSON endpoint if SSE interrupted
      try {
        const jsonRes = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: prompt,
            conversationId: activeConversationId,
          }),
        });
        const data = await jsonRes.json();
        if (data.data?.reply) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, content: data.data.reply } : msg
            )
          );
          if (data.data.conversationId) {
            setActiveConversationId(data.data.conversationId);
            if (typeof window !== "undefined") {
              localStorage.setItem(LOCAL_STORAGE_ACTIVE_CHAT_KEY, data.data.conversationId);
            }
          }
          if (data.data.title) {
            setActiveTitle(data.data.title);
          }
        }
      } catch {
        toast.error("AI Coach currently unavailable. Please try again shortly.");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    "I encountered a temporary connection issue. Please verify your GEMINI_API_KEY and try asking again.",
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-2 sm:px-4 py-4 flex flex-col flex-1 h-[calc(100vh-5.5rem)] min-h-[600px] space-y-3">
      {/* Medical Disclaimer Banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-500/90 dark:text-amber-400 shrink-0">
        <ShieldAlert className="size-4 shrink-0 mt-0.5" />
        <p className="leading-snug">
          <span className="font-bold">Medical Disclaimer:</span> AI Fitness Coach provides general fitness, exercise, and nutritional guidance powered by Google Gemini. It is not a substitute for certified medical diagnosis, treatment, or professional prescription.
        </p>
      </div>

      {/* Main Container: Sidebar + Chat Box */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Previous Conversations Sidebar */}
        <aside
          className={cn(
            "flex flex-col border border-border/60 bg-card/75 backdrop-blur-xl rounded-2xl shadow-xl transition-all duration-300 overflow-hidden shrink-0",
            sidebarOpen ? "w-72 md:w-80" : "w-0 p-0 border-0 opacity-0 pointer-events-none hidden md:flex md:w-0"
          )}
        >
          {/* Sidebar Header */}
          <div className="p-3 border-b border-border/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Conversations</span>
            </div>
            <Button
              size="xs"
              variant="outline"
              onClick={handleNewChat}
              disabled={isStreaming}
              className="text-xs h-7 gap-1 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400 cursor-pointer"
            >
              <Plus className="size-3.5" />
              New Chat
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 text-xs">
            {isLoadingConversations ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                <Loader2 className="size-5 animate-spin text-indigo-500" />
                <span className="text-[11px]">Loading chats...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 px-4 text-muted-foreground space-y-2">
                <MessageSquare className="size-8 mx-auto opacity-30" />
                <p className="text-xs font-medium">No previous chats yet</p>
                <p className="text-[11px] text-muted-foreground/80">
                  Ask a question to start your first fitness consultation!
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv._id === activeConversationId;
                const formattedDate = conv.updatedAt
                  ? new Date(conv.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })
                  : "";

                return (
                  <div
                    key={conv._id}
                    onClick={() => {
                      if (!isStreaming) loadConversation(conv._id);
                    }}
                    className={cn(
                      "group relative flex items-start justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
                      isActive
                        ? "border-indigo-500/50 bg-indigo-500/10 shadow-sm"
                        : "border-transparent bg-muted/20 hover:bg-muted/60 hover:border-border/60"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-6 space-y-1">
                      <span className={cn("font-semibold truncate text-xs", isActive ? "text-indigo-400" : "text-foreground")}>
                        {conv.title || "Consultation"}
                      </span>
                      {conv.lastMessage && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {conv.lastMessage.content}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 pt-0.5">
                        <Calendar className="size-2.5" />
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>{conv.messageCount} msgs</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Delete conversation"
                      onClick={(e) => handleDeleteConversation(conv._id, e)}
                      className="absolute right-2 top-2 p-1.5 rounded-lg text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Chat Window */}
        <Card className="flex flex-col flex-1 border-border/60 bg-card/75 backdrop-blur-xl shadow-xl overflow-hidden min-w-0">
          {/* Chat Window Header */}
          <CardHeader className="py-2.5 px-3 sm:px-4 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="size-8 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground"
                title={sidebarOpen ? "Hide conversations" : "Show conversations"}
              >
                {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
              </Button>

              <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 text-white shadow-sm shrink-0">
                <Bot className="size-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5 truncate">
                  <span className="truncate">{activeTitle}</span>
                  <span className="size-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                </CardTitle>
                <p className="text-[10px] text-muted-foreground truncate">
                  AI Fitness & Nutrition Coach • Gemini 2.5
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={handleNewChat}
                disabled={isStreaming}
                className="text-xs h-7 px-2 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 cursor-pointer hidden sm:flex items-center gap-1"
              >
                <Plus className="size-3.5" />
                New Chat
              </Button>
            </div>
          </CardHeader>

          {/* Messages Stream Container */}
          <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
            {isLoadingMessages ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Loader2 className="size-6 text-indigo-500 animate-spin" />
                <span className="text-xs">Loading conversation history...</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                        <Sparkles className="size-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs leading-relaxed space-y-1 ${
                        isUser
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/10"
                          : "bg-muted/40 border border-border/60 text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content || (isStreaming ? "Thinking..." : "")}</p>
                      <span
                        className={`text-[9px] block text-right opacity-70 ${
                          isUser ? "text-white/80" : "text-muted-foreground"
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {isUser && (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-foreground mt-0.5">
                        <User className="size-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Quick Suggestion Chips */}
          <div className="px-3 sm:px-4 pb-2 flex gap-2 overflow-x-auto text-[11px] no-scrollbar shrink-0">
            {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isStreaming}
                onClick={() => handleSend(suggestion)}
                className="shrink-0 px-2.5 py-1 rounded-full border border-border/60 bg-muted/30 hover:bg-muted/70 hover:border-indigo-500/30 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <CardFooter className="p-2.5 sm:p-3 border-t border-border/40 bg-card/40 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2 w-full"
            >
              <Textarea
                id="coach-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your coach anything about workouts, nutrition, or recovery... (Shift + Enter for new line)"
                className="min-h-[44px] max-h-32 text-xs resize-none bg-background/50 border-border/60 focus-visible:ring-indigo-500/30 py-2.5"
                rows={1}
              />

              <Button
                type="submit"
                id="coach-chat-send-btn"
                disabled={!input.trim() || isStreaming}
                className="size-11 shrink-0 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                {isStreaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl p-8">
          <div className="w-full h-96 rounded-xl bg-card/50 animate-pulse" />
        </div>
      }
    >
      <CoachContent />
    </Suspense>
  );
}
