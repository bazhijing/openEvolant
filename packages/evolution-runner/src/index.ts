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

export async function runEvolutionLoop(config: EvolutionRunnerConfig): Promise<void> {
  const { genesPath, nsPath, taskUserMessage } = config;
  console.log('[evolution-runner] 进化循环启动');
  console.log('[evolution-runner] genesPath:', genesPath);
  console.log('[evolution-runner] nsPath:', nsPath);
  console.log('[evolution-runner] taskUserMessage:', taskUserMessage);

  let round = 0;

  // TODO: 实现完整编排 — 1. 加载 .genes、.ns、.evaluator
  // 2. 对种群中每个 gen：buildSystemPromptFromGen + buildMessages → LLM → 评估 → 累计成本
  // 3. selectTopByFitness → mutate/crossover → 写回 .genes
  // 4. 直到 interruptConditions 或预算用尽

  while (true) {
    round += 1;
    console.log(`[evolution-runner] 第 ${round} 轮 开始`);

    // TODO: 本轮实际逻辑（加载、评估、选择、变异、写回）
    // 当前为占位：仅输出轮次，便于串流程模拟
    await Promise.resolve();

    console.log(`[evolution-runner] 第 ${round} 轮 结束`);

    // 模拟用：跑 3 轮后退出，便于观察输出
    if (round >= 3) {
      console.log(`[evolution-runner] 进化循环结束，共执行 ${round} 轮`);
      break;
    }
  }
}
