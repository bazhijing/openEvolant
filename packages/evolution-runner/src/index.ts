/**
 * @openevolant/evolution-runner — 进化编排器：串起「读 genes/ns/evaluator → 对每个 Gen 跑 Agentic Loop（单轮）→ 评估 → 选择 → 变异 → 写回」
 */

// TODO: 实现 runEvolutionLoop(genesPath, nsPath, options)
// 1. 加载 .genes、.ns、.evaluator
// 2. 对种群中每个 gen：buildSystemPromptFromGen + buildMessages → LLM → 评估 → 累计成本
// 3. selectTopByFitness → mutate/crossover → 写回 .genes
// 4. 直到 interruptConditions 或预算用尽

export type EvolutionRunnerConfig = {
  genesPath: string;
  nsPath: string;
  /** 任务 user message，例如「生成一个单页产品页 HTML，要求现代、简洁、美观」 */
  taskUserMessage: string;
};

export async function runEvolutionLoop(_config: EvolutionRunnerConfig): Promise<void> {
  // TODO: 实现完整编排
}
