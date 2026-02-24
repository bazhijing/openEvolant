/**
 * @openevolant/evolution-runner — 进化编排器：串起「读 genes/ns/evaluator → 对每个 Gen 跑 Agentic Loop（单轮）→ 评估 → 选择 → 变异 → 写回」
 *
 * 从 .evolution 配置 + 运行环境解析 genesPath/nsPath、taskUserMessage、预算与迭代上限，
 * 每轮结束后将 generation / iterationCount / bestScore / progressPercent / updatedAt 写回 .evolution。
 */

export type { EvolutionRunnerConfig } from './modules/types.js';
export { runEvolutionLoop } from './runEvolutionLoop';
