import { ChatProvider, ChatMessage } from "./provider";
import fetch from "node-fetch";

class OpenAIProvider implements ChatProvider {
  available = false;
  unavailableMessage?: string;
  apiKey?: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    if (!this.apiKey) {
      this.available = false;
      this.unavailableMessage = "OpenAI API key not configured (OPENAI_API_KEY).";
    } else {
      this.available = true;
    }
  }

  async sendChat(messages: ChatMessage[], opts?: { assistant?: string; mode?: string }) {
    if (!this.available) throw new Error(this.unavailableMessage);

    // Minimal forwarding implementation to OpenAI Chat Completions API v1
    const payload = {
      model: "gpt-4o-mini",
      messages: messages.map((m) => ({ role: m.role, content: m.content }))
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      const err: any = new Error("provider_error");
      err.status = resp.status;
      err.body = text;
      throw err;
    }

    const data = await resp.json();
    // This maps to a safe structure; do not expose provider internals.
    const content = data.choices?.[0]?.message?.content ?? null;
    return { text: content, raw: data };
  }
}

class UnavailableProvider implements ChatProvider {
  available = false;
  unavailableMessage = "No AI provider configured. Set AI_PROVIDER and provider credentials in environment variables.";
  async sendChat(): Promise<any> {
    throw new Error(this.unavailableMessage);
  }
}

export function createOpenAIProvider() {
  return new OpenAIProvider();
}

export function createUnavailableProvider() {
  return new UnavailableProvider();
}
