import type { EvolutionRunnerConfig } from './modules/types.js';
import { findEvolutionFile, readEvolutionSpec } from './modules/evolutionSpec.js';
import { resolveLoopParams } from './modules/resolveConfig.js';
import { logLoopStart, shouldBreakByBudget, shouldBreakByTime } from './modules/loopGuard.js';
import { updateProgressAfterRound } from './modules/progress.js';
import { prepareGenesForRound } from './modules/genes.js';
import { prepareSkillsForRound } from './modules/skills.js';
import { runAgentLoopOnce } from './modules/agentLoop.js';

/**
 * 执行进化循环：每轮做 genes/skills 准备、单轮 agent loop、进度写回 .evolution；
 * 支持时间与预算上限提前退出。
 */
export async function runEvolutionLoop(config: EvolutionRunnerConfig): Promise<void> {
  const evolutionId = config.evolutionId ?? process.env.OPENEVOLANT_EVOLUTION_ID;
  const evolutionFilePath = findEvolutionFile(evolutionId);

  if (!evolutionFilePath) {
    console.warn(
      '[evolution-runner] 未找到对应的 .evolution 文件，将仅根据传入 config 运行且不写回进度。',
    );
  } else {
    console.log('[evolution-runner] evolution file:', evolutionFilePath);
  }

  const baseSpec = readEvolutionSpec(evolutionFilePath);
  const params = resolveLoopParams(config, baseSpec, evolutionFilePath, evolutionId);

  logLoopStart(params);

  const startedAt = Date.now();
  let usedBudget = 0;

  for (let round = 1; round <= params.maxIterations; round++) {
    console.log(`[evolution-runner] 第 ${round} 轮 开始`);

    if (shouldBreakByTime(startedAt, params.timeLimitMs)) break;
    if (shouldBreakByBudget(usedBudget, params.budgetUsd)) break;

    await prepareGenesForRound({ genesPath: params.genesPath, round });
    await prepareSkillsForRound({ nsPath: params.nsPath, round });

    const result = await runAgentLoopOnce({
      round,
      maxIterations: params.maxIterations,
      budgetUsd: params.budgetUsd,
      taskUserMessage: params.taskUserMessage,
      genesPath: params.genesPath,
      nsPath: params.nsPath,
    });
    usedBudget += result.costUsd;

    updateProgressAfterRound(params.evolutionFilePath, result, params.maxIterations);
  }

  console.log('[evolution-runner] 进化循环结束');
}
