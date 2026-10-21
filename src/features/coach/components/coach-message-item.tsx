import React from "react";
import { Sparkles, User } from "lucide-react";
import { cn } from "cn";
import type { ChatMessage } from "../types";

interface CoachMessageItemProps {
  message: ChatMessage;
  isStreaming: boolean;
}

export function CoachMessageItem({ message, isStreaming }: CoachMessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div
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
          {message.content}
          {!isUser && isStreaming && message.content && (
            <span className="inline-block size-2 rounded-full bg-emerald-400 ml-1.5 animate-pulse" />
          )}
          {!isUser && isStreaming && !message.content && (
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
          {message.timestamp}
        </span>
      </div>

      {isUser && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-foreground border border-border/60 mt-0.5">
          <User className="size-4" />
        </div>
      )}
    </div>
  );
}
