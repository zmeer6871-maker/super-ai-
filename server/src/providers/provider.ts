export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatProvider {
  available: boolean;
  unavailableMessage?: string;
  sendChat(messages: ChatMessage[], opts?: { assistant?: string; mode?: string }): Promise<any>;
}
