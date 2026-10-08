import { logger } from "../utils/logger.js";

export type LlmProvider = "mock" | "ollama" | "openai-compat" | "anthropic";

export function currentProvider(): LlmProvider {
  const v = (process.env.LLM_PROVIDER ?? "mock").toLowerCase();
  if (v === "ollama" || v === "openai-compat" || v === "anthropic") return v;
  return "mock";
}

/** Extract the first {...} JSON object from a model response. */
export function extractJson(text: string): unknown {
  const direct = tryParse(text);
  if (direct !== undefined) return direct;
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    const parsed = tryParse(m[0]);
    if (parsed !== undefined) return parsed;
  }
  throw new Error("No valid JSON found in model output");
}

function tryParse(s: string): unknown | undefined {
  try {
    return JSON.parse(s.trim().replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    return undefined;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 60_000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function chatOllama(system: string, user: string, model: string): Promise<string> {
  const base = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const res = await fetchWithTimeout(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

async function chatOpenAiCompat(system: string, user: string, model: string): Promise<string> {
  const base = (process.env.OPENAI_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) throw new Error("OPENAI_BASE_URL is not set");
  const res = await fetchWithTimeout(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI-compat HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

async function chatAnthropic(system: string, user: string, model: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error(`Anthropic rate limited (429): ${body}`);
    throw new Error(`Anthropic HTTP ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  return data.content?.map((c) => c.text ?? "").join("") ?? "";
}

/**
 * Generate JSON via the configured provider, with retries.
 * kind: "article" | "word" selects the model env vars.
 */
export async function generateJsonWithRetry(
  system: string,
  user: string,
  kind: "article" | "word" = "article",
  maxRetries = 2
): Promise<unknown> {
  const provider = currentProvider();
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const text = await chat(system, user, kind, provider);
      return extractJson(text);
    } catch (err) {
      lastErr = err;
      logger.warn(`LLM attempt ${attempt + 1} failed (${provider})`, { error: String(err) });
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function chat(system: string, user: string, kind: "article" | "word", provider: LlmProvider): Promise<string> {
  switch (provider) {
    case "ollama": {
      const model =
        kind === "article"
          ? process.env.OLLAMA_MODEL_ARTICLE ?? "llama3.1:8b"
          : process.env.OLLAMA_MODEL_WORD ?? "llama3.1:8b";
      return chatOllama(system, user, model);
    }
    case "openai-compat": {
      const model =
        kind === "article"
          ? process.env.OPENAI_MODEL_ARTICLE || process.env.OPENAI_MODEL_WORD || "gpt-4o-mini"
          : process.env.OPENAI_MODEL_WORD || process.env.OPENAI_MODEL_ARTICLE || "gpt-4o-mini";
      return chatOpenAiCompat(system, user, model);
    }
    case "anthropic": {
      const model =
        kind === "article"
          ? process.env.ANTHROPIC_MODEL_ARTICLE ?? "claude-3-haiku-20240307"
          : process.env.ANTHROPIC_MODEL_WORD ?? "claude-3-haiku-20240307";
      return chatAnthropic(system, user, model);
    }
    case "mock":
    default:
      throw new Error("mock provider does not use chat()");
  }
}

export function providerStatus() {
  const provider = currentProvider();
  const missing: string[] = [];
  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (provider === "openai-compat" && !process.env.OPENAI_BASE_URL) missing.push("OPENAI_BASE_URL");
  return { provider, configured: missing.length === 0, missing };
}
