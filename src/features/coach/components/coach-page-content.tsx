"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCoachChat } from "../hooks/use-coach-chat";
import { CoachDisclaimer } from "./coach-disclaimer";
import { CoachSidebar } from "./coach-sidebar";
import { CoachChatHeader } from "./coach-chat-header";
import { CoachMessageItem } from "./coach-message-item";
import { CoachSuggestions } from "./coach-suggestions";
import { CoachInputFooter } from "./coach-input-footer";

export function CoachPageContent() {
  const {
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
  } = useCoachChat();

  return (
    <div className="container mx-auto max-w-7xl px-2 sm:px-4 py-3 flex flex-col h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] min-h-0 overflow-hidden space-y-2.5">
      {/* Medical Disclaimer Banner */}
      <CoachDisclaimer />

      {/* Main Terminal: Sidebar + Chat Box */}
      <div className="flex flex-1 gap-3 overflow-hidden min-h-0">
        {/* Previous Conversations Sidebar */}
        <CoachSidebar
          sidebarOpen={sidebarOpen}
          conversations={conversations}
          activeConversationId={activeConversationId}
          isLoadingConversations={isLoadingConversations}
          isStreaming={isStreaming}
          onSelectConversation={loadConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Main Chat Terminal */}
        <Card className="flex flex-col flex-1 border-border/70 bg-[#0B0F0E]/85 backdrop-blur-2xl shadow-2xl overflow-hidden min-w-0 min-h-0">
          {/* Chat Window Header */}
          <CoachChatHeader
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            activeTitle={activeTitle}
            isStreaming={isStreaming}
            onNewChat={handleNewChat}
          />

          {/* Messages Stream Container */}
          <CardContent className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0 custom-scrollbar">
            {isLoadingMessages ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <Loader2 className="size-7 text-emerald-400 animate-spin" />
                <span className="text-xs font-mono">Loading protocol history...</span>
              </div>
            ) : (
              messages.map((msg) => (
                <CoachMessageItem
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Prompt Speed-Dial Chips */}
          <CoachSuggestions
            isStreaming={isStreaming}
            onSelectSuggestion={(query) => handleSend(query)}
          />

          {/* Input Footer */}
          <CoachInputFooter
            input={input}
            isStreaming={isStreaming}
            onInputChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={() => handleSend()}
          />
        </Card>
      </div>
    </div>
  );
}
