import { ENV, requireEnv } from "./env";

type Message = { role: "system" | "user" | "assistant"; content: string };
type InvokeParams = { messages: Message[]; response_format?: unknown };

/** OpenAI-compatible client: works with OpenAI, OpenRouter, Groq, or compatible gateways. */
export async function invokeLLM(params: InvokeParams) {
  const response = await fetch(`${ENV.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${requireEnv(ENV.llmApiKey, "LLM_API_KEY vagy OPENAI_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: ENV.llmModel, messages: params.messages, temperature: 0.6, ...(params.response_format ? { response_format: params.response_format } : {}) }),
    signal: AbortSignal.timeout(30000),
  });
  const payload = (await response.json().catch(() => ({}))) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string }; message?: string };
  if (!response.ok) throw new Error(payload.error?.message ?? payload.message ?? `LLM hiba (${response.status}).`);
  return payload;
}
