import fs from 'fs';
import path from 'path';

export type GenesRoundContext = {
  genesPath?: string;
  round: number;
};

/** 单轮结果，用于写回 .genes 的 history */
export type RoundResultForGenes = {
  score: number;
  costUsd: number;
};

/** .genes 文件可写结构（与 CLI 约定一致） */
type GenesFileSpec = {
  specVersion?: string;
  id: string;
  createdAt?: string;
  updatedAt?: string;
  taskIntent?: { id?: string; name?: string; skillId?: string | null; skillSource?: string };
  population?: Array<{ genId?: string; fitness?: number | null }>;
  currentBestGenId?: string | null;
  history?: Array<{ iteration?: number; at?: string; event?: string; scores?: Record<string, number>; summary?: string }>;
};

/**
 * 每一轮进化前，对 genes 做准备 / 读取 / 缓存等操作。
 *
 * 当前为占位实现，后续可在此接入：
 * - 读取 .genes
 * - 根据上一轮结果选择 / 变异
 * - 把本轮需要用到的基因集准备好给 agent loop 使用
 */
export async function prepareGenesForRound(ctx: GenesRoundContext): Promise<void> {
  void ctx;
  await Promise.resolve();
}

/**
 * 将当前轮结果写入 genes 文件。
 * - 第一轮：若文件不存在则创建初始 .genes（id、空 population、history 含本轮）。
 * - 后续轮：读取现有 .genes，追加本轮到 history，写回。
 */
export function writeRoundResultToGenes(
  genesPath: string | undefined,
  evolutionId: string,
  round: number,
  result: RoundResultForGenes,
): void {
  if (!genesPath) return;

  const now = new Date().toISOString();
  const dir = path.dirname(genesPath);
  const isFirstRound = round === 1;
  const fileExists = fs.existsSync(genesPath);

  if (isFirstRound && !fileExists) {
    const initial: GenesFileSpec = {
      specVersion: '0.1',
      id: evolutionId,
      createdAt: now,
      updatedAt: now,
      taskIntent: { id: `intent-${evolutionId}`, name: evolutionId, skillId: null, skillSource: 'evolution' },
      population: [],
      currentBestGenId: null,
      history: [
        { iteration: 1, at: now, event: 'round', scores: { round1: result.score }, summary: `Round 1 completed, score=${result.score.toFixed(4)}` },
      ],
    };
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(genesPath, JSON.stringify(initial, null, 2), 'utf-8');
    return;
  }

  if (!fileExists) return;

  try {
    const raw = fs.readFileSync(genesPath, 'utf-8');
    const spec = JSON.parse(raw) as GenesFileSpec;
    const history = Array.isArray(spec.history) ? spec.history : [];
    history.push({
      iteration: round,
      at: now,
      event: 'round',
      scores: { [`round${round}`]: result.score },
      summary: `Round ${round} completed, score=${result.score.toFixed(4)}, costUsd=${result.costUsd}`,
    });
    const updated: GenesFileSpec = {
      ...spec,
      history,
      updatedAt: now,
    };
    fs.writeFileSync(genesPath, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {
    console.error('[evolution-runner] 写入 .genes 失败（不会中断进程）', e);
  }
}

