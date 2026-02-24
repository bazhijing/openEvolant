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

function resolveGenesPathFromEnv(genePool: string): string | undefined {
  const dataDir = process.env.OPENEVOLANT_DATA_DIR;
  const filename = genePool.endsWith('.genes') ? genePool : `${genePool}.genes`;

  if (dataDir) {
    const candidate = path.join(dataDir, 'genes', filename);
    if (fs.existsSync(candidate)) return candidate;
    return candidate;
  }
  if (path.isAbsolute(genePool)) return genePool;
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

/**
 * 从 config + .evolution spec 解析出单次进化循环所需的全部参数。
 */
export function resolveLoopParams(
  config: EvolutionRunnerConfig,
  baseSpec: Record<string, unknown>,
  evolutionFilePath: string | null,
  evolutionId: string | undefined,
): ResolvedLoopParams {
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
