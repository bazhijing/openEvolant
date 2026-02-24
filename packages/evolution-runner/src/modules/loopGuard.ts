import type { ResolvedLoopParams } from './resolveConfig.js';

/**
 * 是否因时间上限应提前结束循环。
 */
export function shouldBreakByTime(
  startedAt: number,
  timeLimitMs: number | undefined,
): boolean {
  if (typeof timeLimitMs !== 'number' || timeLimitMs <= 0) return false;
  if (Date.now() - startedAt >= timeLimitMs) {
    console.log('[evolution-runner] 已达到时间上限，提前结束进化循环');
    return true;
  }
  return false;
}

/**
 * 是否因预算用尽应提前结束循环。
 */
export function shouldBreakByBudget(
  usedBudget: number,
  budgetUsd: number | undefined,
): boolean {
  if (typeof budgetUsd !== 'number' || budgetUsd < 0) return false;
  if (usedBudget >= budgetUsd) {
    console.log('[evolution-runner] 预算已用尽，提前结束进化循环');
    return true;
  }
  return false;
}

/**
 * 进化循环启动时打印解析后的参数，便于排查。
 */
export function logLoopStart(params: ResolvedLoopParams): void {
  console.log('[evolution-runner] 进化循环启动');
  if (params.evolutionId) {
    console.log('[evolution-runner] evolutionId:', params.evolutionId);
  }
  if (params.genesPath) {
    console.log('[evolution-runner] genesPath:', params.genesPath);
  } else {
    console.warn(
      '[evolution-runner] genesPath 未能解析（请检查 OPENEVOLANT_DATA_DIR / OPENEVOLANT_ROOT_DIR 与 genePool 配置）',
    );
  }
  if (params.nsPath) {
    console.log('[evolution-runner] nsPath:', params.nsPath);
  } else {
    console.warn(
      '[evolution-runner] nsPath 未能解析（请检查 OPENEVOLANT_CONFIG_DIR 与 policy 配置）',
    );
  }
  console.log('[evolution-runner] taskUserMessage:', params.taskUserMessage);
  if (typeof params.budgetUsd === 'number') {
    console.log('[evolution-runner] budgetUsd:', params.budgetUsd);
  }
  if (typeof params.timeLimitMs === 'number') {
    console.log('[evolution-runner] timeLimitMs:', params.timeLimitMs);
  }
  console.log('[evolution-runner] maxIterations:', params.maxIterations);
}
