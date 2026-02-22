/**
 * @openevolant/agentic-loop — Agentic Loop + Dispatcher：是否 tool call、编排 Skills、调用 MCP
 */

import type { GenContent } from '@openevolant/shared';

export type ToolCallDecision = { type: 'tool'; toolId: string; args: unknown[] } | { type: 'final'; text: string };

export function decideFromGenContent(_content: GenContent, _llmResponse: string): ToolCallDecision {
  // TODO: 根据 Gen 与 LLM 输出决定 tool call 或 final text
  return { type: 'final', text: _llmResponse };
}
