import OpenAI from "openai";

export const MODEL = process.env.OPENAI_MODEL || "openai/gpt-4o-mini";

/**
 * Works against the OpenAI API directly, or against an OpenAI-compatible
 * gateway such as OpenRouter by setting OPENAI_BASE_URL. The model stays an
 * OpenAI model either way.
 */
const BASE_URL = process.env.OPENAI_BASE_URL;

export function hasKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let cached: OpenAI | null = null;

export function client(): OpenAI {
  if (!cached)
    cached = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(BASE_URL ? { baseURL: BASE_URL } : {}),
      defaultHeaders: BASE_URL?.includes("openrouter")
        ? { "HTTP-Referer": "https://loksahay.vercel.app", "X-Title": "Loksahay" }
        : undefined,
    });
  return cached;
}

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

/** One structured turn. Throws on transport failure so callers can degrade. */
export async function structured<T>(
  messages: ChatMsg[],
  schema: object,
  name = "turn",
): Promise<T> {
  const res = await client().chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.3,
    response_format: {
      type: "json_schema",
      json_schema: { name, schema: schema as Record<string, unknown>, strict: true },
    },
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as T;
}

/** Free-text completion, used for appeal drafting. */
export async function text(messages: ChatMsg[]): Promise<string> {
  const res = await client().chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.4,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}
