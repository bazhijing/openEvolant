import fs from 'fs';
import path from 'path';
import type { EvolutionRunnerConfig } from './types.js';

export type ResolvedLoopParams = {
  evolutionId: string | undefined;
  evolutionFilePath: string | null;
  genesPath: string | undefined;
  nsPath: string | undefined;
  taskUserMessage: string;
  budgetUsd: number | undefined;
  timeLimitMs: number | undefined;
  maxIterations: number;
};

/**
 * 根据 evolutionId 在用户数据 data 目录下生成 genesPath。
 *
 * 约定（与 openevolant/data/genes 一致）：
 * - 基于 OPENEVOLANT_DATA_DIR
 * - 路径形如：{OPENEVOLANT_DATA_DIR}/genes/{evolutionId}.genes
 *
 * 若缺少必要信息，则返回 undefined，由上层决定是否抛错或兜底。
 */
function resolveGenesPathFromEnv(evolutionId: string | undefined): string | undefined {
  const dataDir = process.env.OPENEVOLANT_DATA_DIR;
  if (!dataDir || !evolutionId) return undefined;

  const filename = `${evolutionId}.genes`;
  const candidate = path.join(dataDir, 'genes', filename);

  // 即使文件当前不存在，也返回约定好的路径，方便后续写入/初始化
  return candidate;
}

function resolveNsPathFromEnv(policy: string): string | undefined {
  const configDir = process.env.OPENEVOLANT_CONFIG_DIR;
  if (!configDir) return undefined;
  const filename = policy.endsWith('.ns') ? policy : `${policy}.ns`;
  const candidate = path.join(configDir, 'ns', filename);
  if (fs.existsSync(candidate)) return candidate;
  return candidate;
}

/**
 * 从 config + .evolution spec 解析出单次进化循环所需的全部参数。
 */
export function resolveLoopParams(
  config: EvolutionRunnerConfig,
  baseSpec: Record<string, unknown>,
  evolutionFilePath: string | null,
  evolutionId: string | undefined,
): ResolvedLoopParams {
  const policy =
    typeof baseSpec.policy === 'string' && baseSpec.policy.trim()
      ? baseSpec.policy.trim()
      : '自然选择';

  // genesPath 优先使用调用方显式传入，其次按 evolutionId 在 data 目录下生成
  const genesPath = config.genesPath ?? resolveGenesPathFromEnv(evolutionId);
  const nsPath = config.nsPath ?? resolveNsPathFromEnv(policy);

  const taskUserMessage =
    config.taskUserMessage ||
    (typeof baseSpec.taskContent === 'string' && (baseSpec.taskContent as string).trim()) ||
    `Evolution task for ${(baseSpec.speciesName as string) || (baseSpec.id as string) || evolutionId || 'unknown'}`;

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

  const maxIterationsFromSpec =
    typeof baseSpec.generation === 'number' && baseSpec.generation > 0
      ? baseSpec.generation
      : undefined;

  const maxIterations =
    typeof config.iterationCount === 'number' && config.iterationCount > 0
      ? config.iterationCount
      : maxIterationsFromSpec ?? 3;

  return {
    evolutionId,
    evolutionFilePath,
    genesPath,
    nsPath,
    taskUserMessage,
    budgetUsd,
    timeLimitMs,
    maxIterations,
  };
}
