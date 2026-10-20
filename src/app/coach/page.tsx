"use client";

import React, { Suspense, useState, useRef, useEffect, useCallback } from "react";
import {
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
  Zap,
  Activity,
  Dumbbell,
  Utensils,
  Flame,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { toast } from "sonner";
import { cn } from "cn";

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
  { label: "Strength Overload", query: "How can I increase pull-up strength safely without shoulder impingement?", icon: Dumbbell },
  { label: "Hypertrophy Fuel", query: "Suggest a high-protein post-workout vegetarian meal under 650 kcal", icon: Utensils },
  { label: "Recovery Protocol", query: "How should I structure my rest days between heavy hypertrophy sessions?", icon: Activity },
  { label: "Hydration Balance", query: "Tips for optimizing cellular hydration and electrolytes during intense cardio", icon: Zap },
];

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "System calibrated. I am your fit-PRO Biomechanics & Athletic Intelligence Engine. Whether you need progressive overload programming, kinematic form cues, macronutrient partition strategies, or cellular recovery protocols, I am ready to advise. What is your training priority today?",
  timestamp: "12:00 PM",
};

const LOCAL_STORAGE_ACTIVE_CHAT_KEY = "fitpro_active_coach_chat_id";

function CoachContent() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("New Consultation");
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
        setActiveTitle(conv.title || "Consultation");
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

  useEffect(() => {
    let ignore = false;
    async function initConversations() {
      try {
        const res = await fetch("/api/coach/conversations");
        if (!res.ok || ignore) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.conversations) && !ignore) {
          const list: ConversationSummary[] = data.data.conversations;
          setConversations(list);

          const storedId =
            typeof window !== "undefined"
              ? localStorage.getItem(LOCAL_STORAGE_ACTIVE_CHAT_KEY)
              : null;

          if (storedId && list.some((c) => c._id === storedId)) {
            await loadConversation(storedId);
          } else if (list.length > 0) {
            await loadConversation(list[0]._id);
          } else {
            setActiveConversationId(null);
            setActiveTitle("New Consultation");
            setMessages([DEFAULT_WELCOME_MESSAGE]);
          }
        }
      } catch {
        // Quiet fallback
      } finally {
        if (!ignore) {
          setIsLoadingConversations(false);
        }
      }
    }

    void initConversations();
    return () => {
      ignore = true;
    };
  }, [loadConversation]);

  const handleNewChat = () => {
    if (isStreaming) return;
    setActiveConversationId(null);
    setActiveTitle("New Consultation");
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
        toast.success("Consultation deleted");
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

      fetch("/api/coach/conversations")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data?.conversations)) {
            setConversations(data.data.conversations);
          }
        })
        .catch(() => {});
    } catch {
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
    <div className="container mx-auto max-w-7xl px-2 sm:px-4 py-3 flex flex-col h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] min-h-0 overflow-hidden space-y-2.5">
      {/* Medical Disclaimer Banner */}
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-300 shrink-0 shadow-xs">
        <ShieldAlert className="size-4 shrink-0 text-amber-400" />
        <p className="leading-snug text-[11px] sm:text-xs">
          <strong className="text-amber-200">Physician & Safety Notice:</strong> AI Coach provides precision algorithmic workout & nutrition telemetry. Not a substitute for professional medical prescription or clinical physical therapy.
        </p>
      </div>

      {/* Main Terminal: Sidebar + Chat Box */}
      <div className="flex flex-1 gap-3 overflow-hidden min-h-0">
        {/* Previous Conversations Sidebar */}
        <aside
          className={cn(
            "flex flex-col border border-border/70 bg-[#0B0F0E]/85 backdrop-blur-2xl rounded-2xl shadow-xl transition-all duration-300 overflow-hidden shrink-0 min-h-0",
            sidebarOpen ? "w-72 md:w-80" : "w-0 p-0 border-0 opacity-0 pointer-events-none hidden md:flex md:w-0"
          )}
        >
          {/* Sidebar Header */}
          <div className="p-3.5 border-b border-border/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                Telemetry Logs
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNewChat}
              disabled={isStreaming}
              className="text-xs h-7 gap-1 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 cursor-pointer font-medium"
            >
              <Plus className="size-3.5" />
              New
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 text-xs min-h-0 custom-scrollbar">
            {isLoadingConversations ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                <Loader2 className="size-5 animate-spin text-emerald-400" />
                <span className="text-[11px] font-mono">Retrieving sessions...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-muted-foreground space-y-2">
                <MessageSquare className="size-8 mx-auto opacity-30 text-emerald-400" />
                <p className="text-xs font-semibold text-foreground">No active sessions</p>
                <p className="text-[11px] text-muted-foreground">
                  Ask a question below to initialize your first athletic consultation.
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
                      "group relative flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer",
                      isActive
                        ? "border-emerald-500/40 bg-emerald-500/10 shadow-sm"
                        : "border-transparent bg-muted/20 hover:bg-muted/40 hover:border-border/60"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-6 space-y-1">
                      <span className={cn("font-semibold truncate text-xs", isActive ? "text-emerald-400" : "text-foreground")}>
                        {conv.title || "Consultation"}
                      </span>
                      {conv.lastMessage && (
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          {conv.lastMessage.content}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 font-mono pt-0.5">
                        <Calendar className="size-2.5 text-emerald-400" />
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>{conv.messageCount} msgs</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Delete conversation"
                      onClick={(e) => handleDeleteConversation(conv._id, e)}
                      className="absolute right-2 top-2 p-1.5 rounded-lg text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Chat Terminal */}
        <Card className="flex flex-col flex-1 border-border/70 bg-[#0B0F0E]/85 backdrop-blur-2xl shadow-2xl overflow-hidden min-w-0 min-h-0">
          {/* Chat Window Header */}
          <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between shrink-0 bg-background/30">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="size-8 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground cursor-pointer"
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
              </Button>

              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
                <Sparkles className="size-4 text-emerald-100" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2 truncate text-foreground">
                  <span className="truncate">{activeTitle}</span>
                  <span className="size-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  fit-PRO Biomechanics Engine • Gemini High-Throughput
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              disabled={isStreaming}
              className="text-xs h-8 px-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer hidden sm:flex items-center gap-1.5 font-medium"
            >
              <Plus className="size-3.5" />
              New Consultation
            </Button>
          </CardHeader>

          {/* Messages Stream Container */}
          <CardContent className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0 custom-scrollbar">
            {isLoadingMessages ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <Loader2 className="size-7 text-emerald-400 animate-spin" />
                <span className="text-xs font-mono">Loading protocol history...</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isUser && (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                        <Sparkles className="size-4" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed space-y-1.5",
                        isUser
                          ? "bg-primary text-primary-foreground font-medium shadow-md shadow-emerald-500/20"
                          : "bg-card/60 border border-border/70 text-foreground shadow-sm"
                      )}
                    >
                      <div className="whitespace-pre-wrap font-sans">
                        {msg.content}
                        {!isUser && isStreaming && msg.content && (
                          <span className="inline-block size-2 rounded-full bg-emerald-400 ml-1.5 animate-pulse" />
                        )}
                        {!isUser && isStreaming && !msg.content && (
                          <span className="text-muted-foreground font-mono animate-pulse">
                            Synthesizing biomechanical protocol...
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[9px] font-mono block text-right pt-0.5",
                          isUser ? "text-primary-foreground/75" : "text-muted-foreground"
                        )}
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {isUser && (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-foreground border border-border/60 mt-0.5">
                        <User className="size-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Prompt Speed-Dial Chips */}
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto text-[11px] no-scrollbar shrink-0">
            {PROMPT_SUGGESTIONS.map((s, idx) => {
              const IconComp = s.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isStreaming}
                  onClick={() => handleSend(s.query)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/70 bg-card/40 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer font-medium"
                >
                  <IconComp className="size-3 text-emerald-400" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Input Footer */}
          <CardFooter className="p-3 border-t border-border/40 bg-background/40 shrink-0">
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
                placeholder="Ask about workout sets, form biomechanics, macro deficits, or deload periods... (Enter to send, Shift+Enter for new line)"
                className="min-h-[46px] max-h-32 text-xs resize-none bg-background/50 border-border/70 focus-visible:ring-emerald-500/30 text-foreground py-3"
                rows={1}
              />

              <Button
                type="submit"
                id="coach-chat-send-btn"
                disabled={!input.trim() || isStreaming}
                className="size-11 shrink-0 bg-primary text-primary-foreground rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 cursor-pointer transition-all"
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
          <div className="w-full h-96 rounded-2xl bg-[#0B0F0E]/80 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <CoachContent />
    </Suspense>
  );
}
