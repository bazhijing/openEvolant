/**
 * @openevolant/agent-runner — Agent Runner：Gen 驱动 Prompt 构建、Session History、Memory、Context Window Guard
 */

import type { Gen, GenContent } from '@openevolant/shared';
import type { ChatMessage } from '@openevolant/llm';

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
