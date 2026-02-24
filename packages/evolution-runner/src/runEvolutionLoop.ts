import type { EvolutionRunnerConfig } from './modules/types.js';
import { findEvolutionFile, readEvolutionSpec } from './modules/evolutionSpec.js';
import { resolveLoopParams } from './modules/resolveConfig.js';
import { logLoopStart, shouldBreakByBudget, shouldBreakByTime } from './modules/loopGuard.js';
import { updateProgressAfterRound } from './modules/progress.js';
import { prepareGenesForRound, writeRoundResultToGenes } from './modules/genes.js';
import { prepareSkillsForRound, writeRoundResultToSkill } from './modules/skills.js';
import { runAgentLoopOnce } from './modules/agentLoop.js';

/**
 * 执行进化循环：每轮做 genes/skills 准备、单轮 agent loop、进度写回 .evolution；
 * 支持时间与预算上限提前退出。
 */
export async function runEvolutionLoop(config: EvolutionRunnerConfig): Promise<void> {
  // 优先使用调用方显式传入的 evolutionId，其次才尝试从环境变量读取
  const evolutionId = config.evolutionId ?? process.env.OPENEVOLANT_EVOLUTION_ID;

  if (!evolutionId) {
    throw new Error(
      '[evolution-runner] evolutionId 未提供。请通过 runEvolutionLoop({ evolutionId }) 传入，或设置 OPENEVOLANT_EVOLUTION_ID 环境变量。',
    );
  }

  // 基于 evolutionId 在项目目录中定位对应的 `.evolution` 规格文件
  const evolutionFilePath = findEvolutionFile(evolutionId);

  if (!evolutionFilePath) {
    console.error(
      `[evolution-runner] 未找到 evolutionId="${evolutionId}" 对应的 .evolution 文件，将仅根据传入 config 运行且不写回进度。`,
    );
  } else {
    console.log('[evolution-runner] evolution file:', evolutionFilePath);
  }

  // 从 evolution 文件中读取基础 evolution 配置（种群规模、约束等）
  const baseSpec = readEvolutionSpec(evolutionFilePath);
  // 将 CLI 传入配置与 evolution 规格合并，解析出本轮循环所需的所有参数
  const params = resolveLoopParams(config, baseSpec, evolutionFilePath, evolutionId);

  // 记录本次 evolution 循环的关键信息（起始轮次、预算、时间限制等），方便调试与审计
  logLoopStart(params);

  const startedAt = Date.now();
  let usedBudget = 0;

  for (let round = 1; round <= params.maxIterations; round++) {
    console.log(`[evolution-runner] 第 ${round} 轮 开始`);

    // 超出时间上限时终止后续轮次，避免长时间占用资源
    if (shouldBreakByTime(startedAt, params.timeLimitMs)) break;
    // 消耗预算达到上限时终止后续轮次，避免超出成本控制
    if (shouldBreakByBudget(usedBudget, params.budgetUsd)) break;

    // 根据当前轮次对 genes 进行准备（如复制模板、替换占位符等），让本轮 agent loop 能读取到正确的基因配置
    await prepareGenesForRound({ genesPath: params.genesPath, round });
    // 为当前轮次装配/刷新 skills 命名空间，使 agent 能加载到对应轮次的技能实现
    await prepareSkillsForRound({ nsPath: params.nsPath, round });

    // 执行单轮 agent 进化循环（调用 LLM、执行技能等），并返回本轮的结果与花费
    const result = await runAgentLoopOnce({
      round,
      maxIterations: params.maxIterations,
      budgetUsd: params.budgetUsd,
      taskUserMessage: params.taskUserMessage,
      genesPath: params.genesPath,
      nsPath: params.nsPath,
    });
    usedBudget += result.costUsd;

    // 将当前轮结果写入 genes：第一轮若文件不存在则创建，否则追加 history
    writeRoundResultToGenes(params.genesPath, evolutionId, round, result);

    // 每轮创建对应的 .skill 文件：{evolutionsDir}/{evolutionId}/skills/round-{round}.skill
    writeRoundResultToSkill(params.genesPath, evolutionId, round, result);

    // 将当前轮次的结果与进度写回 evolution 文件（便于断点续跑与 Studio 可视化）
    updateProgressAfterRound(params.evolutionFilePath, result, params.maxIterations);


    // 为了方便测试 每轮目前阻塞一秒
    await new Promise((resolve) => setTimeout(resolve, 1000));

  }

  console.log('[evolution-runner] 进化循环结束');
}
