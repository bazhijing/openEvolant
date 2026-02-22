/**
 * @openevolant/llm — LLM API：大模型接入与配置（v0.1 优先 Kimi K2）
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

export function createLLMClient(config: LLMConfig): {
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResult>;
} {
  return {
    async chat(_options: ChatCompletionOptions): Promise<ChatCompletionResult> {
      // TODO: 接入 Kimi K2 等
      return { content: '' };
    },
  };
}
