/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChatProvider, ChatMessage } from "../providers/provider";
const fetch: any = require('node-fetch')

class OpenAIProvider implements ChatProvider {
  available = false;
  unavailableMessage?: string;
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.2');
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '800', 10);

    if (!this.apiKey) {
      this.available = false;
      this.unavailableMessage = "OpenAI API key not configured (OPENAI_API_KEY).";
    } else {
      this.available = true;
    }
  }

  async sendChat(messages: ChatMessage[], opts?: { assistant?: string; mode?: string }) {
    if (!this.available) throw new Error(this.unavailableMessage);

    const payload: any = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: this.temperature,
      max_tokens: this.maxTokens
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
      // Try parse JSON body
      try { err.body = JSON.parse(text); } catch { err.body = text; }
      throw err;
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? null;
    const usage = data.usage || null;
    return { text: content, raw: data, usage, model: this.model };
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
