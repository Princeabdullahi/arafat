import { env } from "../config/env";

export const deepseekService = {
  chat: async (prompt: string) => {
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`DeepSeek error: ${resp.status} ${text}`);
    }

    const data: any = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    return String(content ?? "").trim() || "No response.";
  },
};
