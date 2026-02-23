/**
 * @openevolant/agentic-loop — Agentic Loop：Gen 驱动 Prompt 构建 + 单轮/多轮生成 + Dispatcher
 * 内聚原 Agent Runner 的 Prompt/History/Context 职责，可先简化为单轮生成。
 */

import type { Gen, GenContent } from '@openevolant/shared';
import type { ChatMessage } from '@openevolant/llm';

// ——— Gen 驱动 Prompt 与消息构建（原 agent-runner 职责） ———

export function buildSystemPromptFromGen(gen: Gen): string {
  return gen.content.promptFragments.join('\n');
}

export function buildMessages(
  systemPrompt: string,
  history: ChatMessage[],
  userInput: string,
  maxTokensEstimate: number = 4096
): ChatMessage[] {
  const system: ChatMessage = { role: 'system', content: systemPrompt };
  const trimmed = trimHistoryToFit(history, maxTokensEstimate);
  const user: ChatMessage = { role: 'user', content: userInput };
  return [system, ...trimmed, user];
}

function trimHistoryToFit(history: ChatMessage[], _maxEstimate: number): ChatMessage[] {
  // TODO: Context Window Guard — 按 token 估算截断
  return history;
}

// ——— Dispatcher：单轮可先只返回 final text ———

export type ToolCallDecision = { type: 'tool'; toolId: string; args: unknown[] } | { type: 'final'; text: string };

export function decideFromGenContent(_content: GenContent, _llmResponse: string): ToolCallDecision {
  // TODO: 根据 Gen 与 LLM 输出决定 tool call 或 final text；可先简化为单轮生成，只返回 final
  return { type: 'final', text: _llmResponse };
}
