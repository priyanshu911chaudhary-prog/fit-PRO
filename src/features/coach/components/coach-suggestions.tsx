import React from "react";
import { PROMPT_SUGGESTIONS } from "../lib/constants";

interface CoachSuggestionsProps {
  isStreaming: boolean;
  onSelectSuggestion: (query: string) => void;
}

export function CoachSuggestions({ isStreaming, onSelectSuggestion }: CoachSuggestionsProps) {
  return (
    <div className="px-4 pb-2 flex gap-2 overflow-x-auto text-[11px] no-scrollbar shrink-0">
      {PROMPT_SUGGESTIONS.map((s, idx) => {
        const IconComp = s.icon;
        return (
          <button
            key={idx}
            type="button"
            disabled={isStreaming}
            onClick={() => onSelectSuggestion(s.query)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/70 bg-card/40 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer font-medium"
          >
            <IconComp className="size-3 text-emerald-400" />
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
