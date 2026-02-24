/**
 * 进化循环运行器对外配置。
 */
export type EvolutionRunnerConfig = {
  /** 可选：直接指定 genesPath；若缺省则从 .evolution + 环境变量推导 */
  genesPath?: string;
  /** 可选：直接指定 nsPath；若缺省则从 .evolution + 环境变量推导 */
  nsPath?: string;
  /** 任务 user message，例如「生成一个单页产品页 HTML，要求现代、简洁、美观」 */
  taskUserMessage?: string;
  /** 对应的 .evolution id，方便在日志中关联 */
  evolutionId?: string;
  /** 预算 USD（来自 .evolution 配置） */
  budgetUsd?: number;
  /** 时间限制（毫秒，来自 .evolution 配置） */
  timeLimitMs?: number;
  /** 最大迭代轮数上限（可选覆盖 .evolution 中 generation） */
  iterationCount?: number;
};
