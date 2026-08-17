import express from "express";
import { getProvider } from "../providers/factory";
import { QuotaManager } from "../storage/quotas";
import { HistoryStore } from "../storage/history";

const router = express.Router();

const provider = getProvider();
const quota = new QuotaManager();
const history = new HistoryStore();

// Assistant personas and mode system prompts
const ASSISTANT_PERSONAS: Record<string, string> = {
  ALIC: `You are ALIC (Assistant for Learning, Insight, and Conversation). You are friendly, concise, and helpful. Prioritize clear explanations, step-by-step solutions for complex problems, and ask clarifying questions when the user's intent is ambiguous. Use examples and analogies for teaching and avoid hallucinations. Keep replies safe and respectful.`,
  "DESK": `You are DESK — a productivity-focused assistant optimized for task automation, note-taking, and business writing. Provide templates, checklists, and short actionable steps. When asked, summarize meetings, extract action items, and provide suggested follow-ups.`,
  "SIR X": `You are SIR X — a creative persona that helps with brainstorming, storytelling, and ideation. Be imaginative and playful while staying on topic. Offer multiple alternatives and include concise prompts the user can reuse for content generation.`
}

const MODE_PROMPTS: Record<string, string> = {
  auto: `You may decide which persona is best for the user's request. If it's ambiguous, ask one clarifying question before answering.`,
  general: `Be helpful and answer the user's question directly. Keep responses concise unless the user asks for more detail.`,
  study: `Focus on teaching the topic: give explanations, examples, and short quizzes to reinforce learning.`,
  writing: `Assist with writing: editing, rewriting, improving tone, and structure. Provide suggestions and examples.`,
  coding: `Provide programming help: suggest code snippets, explain algorithms, and point out potential bugs. When giving code, include language and explanations.`,
  translator: `Translate text accurately, preserve meaning and tone. Identify source language if unknown and return the translated text only unless asked for commentary.`,
  summarizer: `Provide concise summaries covering the key points. Offer both short (1-2 lines) and detailed (3-5 lines) summaries if useful.`,
  quiz: `Create short quizzes with questions and answers to test comprehension. Use multiple choice or short answer formats based on context.`,
  explore: `Help the user explore ideas, resources, and next steps. Provide links (if known), suggestions for further reading, and related concepts.`
}

// Stable backend endpoint
router.post("/", async (req, res, next) => {
  try {
    const { messages, assistant = "ALIC", mode = "general", auto = false } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "invalid_request", message: "messages must be a non-empty array" });
    }

    // Simple quota by remote IP. In production, tie to user account.
    const ip = req.ip || (req.connection && (req.connection as any).remoteAddress) || "unknown";
    const allowed = await quota.consume(ip);
    if (!allowed.ok) {
      return res.status(429).json({ error: "quota_exceeded", message: allowed.message });
    }

    if (!provider.available) {
      return res.status(503).json({ error: "provider_unavailable", message: provider.unavailableMessage });
    }

    // Build system prompt from assistant and mode
    let persona = ASSISTANT_PERSONAS[assistant] || ASSISTANT_PERSONAS["ALIC"];
    let modePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS["general"];

    // If auto mode is requested, prepend auto directive
    if (auto || mode === "auto") {
      modePrompt = MODE_PROMPTS["auto"] + " " + modePrompt;
    }

    const systemMessage = { role: "system", content: persona + "\n\n" + modePrompt };

    const payloadMessages = [systemMessage, ...messages.map((m: any) => ({ role: m.role, content: m.content }))];

    const response = await provider.sendChat(payloadMessages, { assistant, mode });

    // persist to local history (append)
    await history.append({ id: Date.now().toString(), ip, assistant, mode, messages: payloadMessages, response, createdAt: new Date().toISOString() });

    res.json({ result: response });
  } catch (err) {
    next(err);
  }
});

export default router;
