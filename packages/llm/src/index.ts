/**
 * @openevolant/llm — LLM API：大模型接入与配置（v0.1 优先 Kimi / Moonshot）
 * Moonshot 兼容 OpenAI Chat Completions：https://platform.moonshot.cn/docs/api/chat
 */

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface ChatCompletionResult {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
}

const MOONSHOT_DEFAULT_BASE = 'https://api.moonshot.cn/v1';

function isMoonshot(config: LLMConfig): boolean {
  return config.provider.toLowerCase() === 'moonshot';
}

async function chatMoonshot(
  config: LLMConfig,
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const base = (config.baseURL ?? MOONSHOT_DEFAULT_BASE).replace(/\/$/, '');
  const url = `${base}/chat/completions`;
  const apiKey = config.apiKey?.trim();
  if (!apiKey) {
    throw new Error('Moonshot API key is required');
  }
  const body = {
    model: config.model,
    messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: options.temperature ?? 0.6,
    ...(options.maxTokens != null && options.maxTokens > 0 ? { max_tokens: options.maxTokens } : {}),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Moonshot API error ${res.status}: ${text || res.statusText}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    error?: { message?: string };
  };
  if (data.error?.message) {
    throw new Error(`Moonshot API: ${data.error.message}`);
  }
  const content = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage
    ? {
        promptTokens: data.usage.prompt_tokens ?? 0,
        completionTokens: data.usage.completion_tokens ?? 0,
      }
    : undefined;
  return { content, usage };
}

export function createLLMClient(config: LLMConfig): {
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResult>;
} {
  return {
    async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
      if (isMoonshot(config)) {
        return chatMoonshot(config, options);
      }
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
    },
  };
}
