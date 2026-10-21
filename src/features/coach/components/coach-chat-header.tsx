import React from "react";
import { PanelLeftClose, PanelLeftOpen, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";

interface CoachChatHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeTitle: string;
  isStreaming: boolean;
  onNewChat: () => void;
}

export function CoachChatHeader({
  sidebarOpen,
  onToggleSidebar,
  activeTitle,
  isStreaming,
  onNewChat,
}: CoachChatHeaderProps) {
  return (
    <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between shrink-0 bg-background/30">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
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
        onClick={onNewChat}
        disabled={isStreaming}
        className="text-xs h-8 px-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer hidden sm:flex items-center gap-1.5 font-medium"
      >
        <Plus className="size-3.5" />
        New Consultation
      </Button>
    </CardHeader>
  );
}
