import OpenAI from "openai";

let openai: OpenAI | null = null;

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  if (!openai) openai = new OpenAI({ apiKey: key });
  return openai;
}
