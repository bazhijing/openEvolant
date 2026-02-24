import fs from 'fs';
import path from 'path';

/**
 * @openevolant/evolution-runner — 进化编排器：串起「读 genes/ns/evaluator → 对每个 Gen 跑 Agentic Loop（单轮）→ 评估 → 选择 → 变异 → 写回」
 *
 * 当前版本：从 .evolution 配置 + 运行环境中自动解析：
 * - genesPath / nsPath（根据 genePool / policy 和 OPENEVOLANT_* 目录）
 * - taskUserMessage / budgetUsd / timeLimitMs / maxIterations / evolutionId
 *
 * 并模拟进化循环，在每一轮结束后把最新的进度写回对应的 .evolution 文件：
 * - generation：计划的最大迭代轮数（上限），保持不变
 * - iterationCount：已执行的轮次，逐轮累加
 * - bestScore：使用模拟 score 单调提升
 * - progressPercent：按 iterationCount 或实际轮次数计算 0–100%
 * - updatedAt：每轮更新
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

function findEvolutionFile(evolutionId?: string): string | null {
  if (!evolutionId) return null;

  const dataDir = process.env.OPENEVOLANT_DATA_DIR;
  const rootDir = process.env.OPENEVOLANT_ROOT_DIR;

  const candidates: string[] = [];
  if (dataDir) {
    candidates.push(path.join(dataDir, 'evolutions', `${evolutionId}.evolution`));
  }
  if (rootDir) {
    candidates.push(path.join(rootDir, 'evolutions', `${evolutionId}.evolution`));
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  return candidates[0] ?? null;
}

function readEvolutionSpec(filePath: string | null): any {
  if (!filePath) return {};
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return {};
    return JSON.parse(raw) as any;
  } catch (e) {
    console.error('[evolution-runner] 读取 .evolution 失败，将使用空配置继续', e);
    return {};
  }
}

function writeEvolutionSpec(filePath: string | null, spec: any): void {
  if (!filePath) return;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(spec, null, 2), 'utf-8');
  } catch (e) {
    console.error('[evolution-runner] 写入 .evolution 失败（不会中断进程）', e);
  }
}

function resolveGenesPathFromEnv(genePool: string): string | undefined {
  const dataDir = process.env.OPENEVOLANT_DATA_DIR;
  const rootDir = process.env.OPENEVOLANT_ROOT_DIR;
  const filename = genePool.endsWith('.genes') ? genePool : `${genePool}.genes`;

  const candidates: string[] = [];
  if (dataDir) {
    candidates.push(path.join(dataDir, 'genes', filename));
  }
  if (rootDir) {
    candidates.push(path.join(rootDir, 'genes', filename));
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  if (path.isAbsolute(genePool)) return genePool;
  if (dataDir) return path.join(dataDir, 'genes', filename);
  return undefined;
}

function resolveNsPathFromEnv(policy: string): string | undefined {
  const configDir = process.env.OPENEVOLANT_CONFIG_DIR;
  if (!configDir) return undefined;
  const filename = policy.endsWith('.ns') ? policy : `${policy}.ns`;
  const candidate = path.join(configDir, 'ns', filename);
  if (fs.existsSync(candidate)) return candidate;
  return candidate;
}

export async function runEvolutionLoop(config: EvolutionRunnerConfig): Promise<void> {
  const evolutionIdFromEnv = process.env.OPENEVOLANT_EVOLUTION_ID;
  const evolutionId = config.evolutionId ?? evolutionIdFromEnv;

  const evolutionFilePath = findEvolutionFile(evolutionId);
  if (!evolutionFilePath) {
    console.warn(
      '[evolution-runner] 未找到对应的 .evolution 文件，将仅根据传入 config 运行且不写回进度。',
    );
  } else {
    console.log('[evolution-runner] evolution file:', evolutionFilePath);
  }

  const baseSpec = readEvolutionSpec(evolutionFilePath);

  const genePool =
    typeof baseSpec.genePool === 'string' && baseSpec.genePool.trim()
      ? baseSpec.genePool.trim()
      : 'default.genes';
  const policy =
    typeof baseSpec.policy === 'string' && baseSpec.policy.trim()
      ? baseSpec.policy.trim()
      : '自然选择';

  const genesPath = config.genesPath ?? resolveGenesPathFromEnv(genePool);
  const nsPath = config.nsPath ?? resolveNsPathFromEnv(policy);

  const taskUserMessage =
    config.taskUserMessage ||
    (typeof baseSpec.taskContent === 'string' && baseSpec.taskContent.trim()) ||
    `Evolution task for ${baseSpec.speciesName || baseSpec.id || evolutionId || 'unknown'}`;

  const budgetUsd =
    typeof config.budgetUsd === 'number'
      ? config.budgetUsd
      : typeof baseSpec.budgetUsd === 'number'
        ? baseSpec.budgetUsd
        : undefined;

  const timeLimitMs =
    typeof config.timeLimitMs === 'number'
      ? config.timeLimitMs
      : typeof baseSpec.timeLimitMs === 'number'
        ? baseSpec.timeLimitMs
        : undefined;

  // 最大迭代轮数（优先使用 config 覆盖，其次使用 .evolution 中 generation，否则默认 3）
  const maxIterationsFromSpec =
    typeof baseSpec.generation === 'number' && baseSpec.generation > 0
      ? baseSpec.generation
      : undefined;

  const maxIterations =
    typeof config.iterationCount === 'number' && config.iterationCount > 0
      ? config.iterationCount
      : maxIterationsFromSpec ?? 3;

  console.log('[evolution-runner] 进化循环启动');
  if (evolutionId) {
    console.log('[evolution-runner] evolutionId:', evolutionId);
  }
  if (genesPath) {
    console.log('[evolution-runner] genesPath:', genesPath);
  } else {
    console.warn(
      '[evolution-runner] genesPath 未能解析（请检查 OPENEVOLANT_DATA_DIR / OPENEVOLANT_ROOT_DIR 与 genePool 配置）',
    );
  }
  if (nsPath) {
    console.log('[evolution-runner] nsPath:', nsPath);
  } else {
    console.warn(
      '[evolution-runner] nsPath 未能解析（请检查 OPENEVOLANT_CONFIG_DIR 与 policy 配置）',
    );
  }
  console.log('[evolution-runner] taskUserMessage:', taskUserMessage);
  if (typeof budgetUsd === 'number') {
    console.log('[evolution-runner] budgetUsd:', budgetUsd);
  }
  if (typeof timeLimitMs === 'number') {
    console.log('[evolution-runner] timeLimitMs:', timeLimitMs);
  }
  console.log('[evolution-runner] maxIterations:', maxIterations);
  const startedAt = Date.now();
  let usedBudget = 0;

  for (let round = 1; round <= maxIterations; round++) {
    console.log(`[evolution-runner] 第 ${round} 轮 开始`);

    // 时间 / 预算 约束（仅模拟，用于提前结束循环）
    if (
      typeof timeLimitMs === 'number' &&
      timeLimitMs > 0 &&
      Date.now() - startedAt >= timeLimitMs
    ) {
      console.log('[evolution-runner] 已达到时间上限，提前结束进化循环');
      break;
    }

    if (typeof budgetUsd === 'number' && budgetUsd >= 0 && usedBudget >= budgetUsd) {
      console.log('[evolution-runner] 预算已用尽，提前结束进化循环');
      break;
    }

    // TODO: 这里未来接入真实的：
    // - 读取 .genes / .ns / .evaluator
    // - 对每个 gen 跑 agentic loop + evaluator
    // - 选择 / 变异 / 写回 .genes
    //
    // 当前实现：仅做占位计算，便于把「进度写回 .evolution」
    await Promise.resolve();

    // 使用一个随轮次单调提升的模拟得分（0–1），便于前端观察 bestScore 变化
    const simulatedScoreBase = round / maxIterations;
    const simulatedNoise = Math.random() * 0.1; // 小抖动，避免完全线性
    const simulatedScore = Math.min(1, simulatedScoreBase + simulatedNoise);

    // 简单按「均匀每轮花费」的方式模拟预算消耗
    const simulatedCostThisRound =
      typeof budgetUsd === 'number' && budgetUsd > 0 ? budgetUsd / maxIterations : 0;
    usedBudget += simulatedCostThisRound;

    // 从 .evolution 中读出当前进度，并写回本轮结束后的结果
    const spec = readEvolutionSpec(evolutionFilePath);
    const prevExecutedIterations =
      typeof spec.iterationCount === 'number' && Number.isFinite(spec.iterationCount)
        ? spec.iterationCount
        : 0;
    const prevBestScore =
      typeof spec.bestScore === 'number' && Number.isFinite(spec.bestScore)
        ? spec.bestScore
        : 0;

    const totalPlannedIterations =
      typeof spec.generation === 'number' && spec.generation > 0
        ? spec.generation
        : maxIterations;

    const nextExecutedIterations = Math.min(prevExecutedIterations + 1, totalPlannedIterations);
    const nextBestScore = Math.max(prevBestScore, simulatedScore);
    const completedRatio = Math.max(
      0,
      Math.min(1, nextExecutedIterations / totalPlannedIterations),
    );

    const updatedSpec = {
      ...spec,
      generation: totalPlannedIterations,
      iterationCount: nextExecutedIterations,
      bestScore: nextBestScore,
      progressPercent: Math.round(completedRatio * 100),
      updatedAt: new Date().toISOString(),
    };

    writeEvolutionSpec(evolutionFilePath, updatedSpec);

    console.log(
      `[evolution-runner] 第 ${round} 轮 结束，iterationCount=${nextExecutedIterations}, generation=${totalPlannedIterations}, bestScore=${nextBestScore.toFixed(
        4,
      )}, progress=${updatedSpec.progressPercent}%`,
    );
  }

  console.log('[evolution-runner] 进化循环结束');
}
