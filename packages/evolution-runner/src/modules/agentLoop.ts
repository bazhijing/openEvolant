export type AgentLoopInput = {
  round: number;
  maxIterations: number;
  budgetUsd?: number;
  taskUserMessage: string;
  genesPath?: string;
  nsPath?: string;
};

export type AgentLoopResult = {
  /** 本轮得到的（模拟）得分，0–1 之间 */
  score: number;
  /** 本轮（模拟）花费的 USD，用于累计预算消耗 */
  costUsd: number;
};

/**
 * 单轮 Agentic Loop 的占位实现。
 *
 * 未来这里会：
 * - 读取 genes / ns / evaluator
 * - 对每个 Gen 跑一次 agentic loop 并评估
 * - 返回本轮整体得分和成本
 */
export async function runAgentLoopOnce(input: AgentLoopInput): Promise<AgentLoopResult> {
  const { round, maxIterations, budgetUsd } = input;

  // 使用一个随轮次单调提升的模拟得分（0–1），便于前端观察 bestScore 变化
  const simulatedScoreBase = round / maxIterations;
  const simulatedNoise = Math.random() * 0.1; // 小抖动，避免完全线性
  const score = Math.min(1, simulatedScoreBase + simulatedNoise);

  // 简单按「均匀每轮花费」的方式模拟预算消耗
  const costUsd =
    typeof budgetUsd === 'number' && budgetUsd > 0 ? budgetUsd / maxIterations : 0;

  await Promise.resolve();
  return { score, costUsd };
}

