/**
 * OpenAI API client (server-side only).
 * See https://platform.openai.com/docs/api-reference
 * Set OPENAI_API_KEY in .env.local (get a key at https://platform.openai.com/api-keys).
 */

import OpenAI from "openai";

let _client = null;

/**
 * @returns {OpenAI}
 */
export function getOpenAIClient() {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Get a key at https://platform.openai.com/api-keys"
      );
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Chat completion (convenience wrapper).
 * @param {Array<{ role: 'system' | 'user' | 'assistant'; content: string }>} messages
 * @param {Object} [options] - e.g. { model: 'gpt-4o-mini', temperature: 0.7 }
 * @returns {Promise<string>} Assistant message content
 */
export async function chat(messages, options = {}) {
  const client = getOpenAIClient();
  const {
    model = "gpt-4o-mini",
    temperature = 0.7,
    max_tokens = 1024,
    ...rest
  } = options;
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
    ...rest,
  });
  const choice = completion.choices?.[0];
  if (!choice) throw new Error("No completion choice returned");
  return choice.message?.content ?? "";
}
