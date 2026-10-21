export interface ConversationSummary {
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface PromptSuggestion {
  label: string;
  query: string;
  icon: React.ComponentType<{ className?: string }>;
}
