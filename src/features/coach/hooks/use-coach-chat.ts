"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { ConversationSummary, ChatMessage } from "../types";
import { DEFAULT_WELCOME_MESSAGE, LOCAL_STORAGE_ACTIVE_CHAT_KEY } from "../lib/constants";

export const ALLOWED_COACH_INTENT_PROMPTS: Record<string, string> = {
  "adjust-workout": "Can you help me adapt today's scheduled workout to my current time and energy level?",
  "protein-ideas": "I need some quick and healthy meal or snack ideas to hit my remaining protein target for today.",
  "hydration-plan": "Can you give me a simple plan to stay on track with my daily hydration goal?",
};

export function useCoachChat() {
  const searchParams = useSearchParams();
  const intent = searchParams?.get("intent");
  const initialPrompt = (intent && ALLOWED_COACH_INTENT_PROMPTS[intent]) || "";

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("New Consultation");
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [input, setInput] = useState(initialPrompt);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const accumulatedRef = useRef<string>("");
  const msgIdCounter = useRef(1);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

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

  return {
    conversations,
    activeConversationId,
    activeTitle,
    messages,
    input,
    setInput,
    isStreaming,
    isLoadingConversations,
    isLoadingMessages,
    sidebarOpen,
    setSidebarOpen,
    messagesEndRef,
    loadConversation,
    handleNewChat,
    handleDeleteConversation,
    handleSend,
    handleKeyDown,
  };
}
