import { ChatProvider } from "./provider";
import { createOpenAIProvider, createUnavailableProvider } from "./openaiProvider";

export function getProvider(): ChatProvider {
  const selected = process.env.AI_PROVIDER || "";
  if (selected.toLowerCase() === "openai") {
    return createOpenAIProvider();
  }
  return createUnavailableProvider();
}
