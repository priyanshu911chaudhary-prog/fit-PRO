import React from "react";
import { Calendar, Loader2, MessageSquare, Plus, Terminal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import type { ConversationSummary } from "../types";

interface CoachSidebarProps {
  sidebarOpen: boolean;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  isLoadingConversations: boolean;
  isStreaming: boolean;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
}

export function CoachSidebar({
  sidebarOpen,
  conversations,
  activeConversationId,
  isLoadingConversations,
  isStreaming,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}: CoachSidebarProps) {
  return (
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
          onClick={onNewChat}
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
                  if (!isStreaming) onSelectConversation(conv._id);
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
                  onClick={(e) => onDeleteConversation(conv._id, e)}
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
  );
}
