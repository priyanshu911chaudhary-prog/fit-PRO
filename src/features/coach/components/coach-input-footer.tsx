import React from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CardFooter } from "@/components/ui/card";

interface CoachInputFooterProps {
  input: string;
  isStreaming: boolean;
  onInputChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
}

export function CoachInputFooter({
  input,
  isStreaming,
  onInputChange,
  onKeyDown,
  onSend,
}: CoachInputFooterProps) {
  return (
    <CardFooter className="p-3 border-t border-border/40 bg-background/40 shrink-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex items-end gap-2 w-full"
      >
        <Textarea
          id="coach-chat-input"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
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
  );
}
