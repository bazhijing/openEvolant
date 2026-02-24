import fs from 'fs';
import path from 'path';

export type SkillsRoundContext = {
  nsPath?: string;
  round: number;
};

/** 单轮结果，用于写回当轮 .skill 文件 */
export type RoundResultForSkill = {
  score: number;
  costUsd: number;
};

/**
 * 每一轮进化前，根据 ns（policy）做技能树 / 评估器等准备。
 *
 * 当前为占位实现，后续可在此接入：
 * - 解析 .ns / policy
 * - 准备技能配置、评估策略等
 */
export async function prepareSkillsForRound(ctx: SkillsRoundContext): Promise<void> {
  void ctx;
  await Promise.resolve();
}

/**
 * 将本轮的 skills 迭代结果写入对应轮次的 .skill 文件。
 * 每轮都会新建一个文件：{data/genes}/{evolutionId}/skills/round-{round}.skill
 */
export function writeRoundResultToSkill(
  genesPath: string | undefined,
  evolutionId: string,
  round: number,
  result: RoundResultForSkill,
): void {
  if (!genesPath) return;

  const genesDir = path.dirname(genesPath);
  const skillsDir = path.join(genesDir, evolutionId, 'skills');
  const filename = `round-${round}.skill`;
  const filePath = path.join(skillsDir, filename);

  const payload = {
    specVersion: '0.1',
    evolutionId,
    round,
    score: result.score,
    costUsd: result.costUsd,
    writtenAt: new Date().toISOString(),
  };

  try {
    if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (e) {
    console.error('[evolution-runner] 写入当轮 .skill 失败（不会中断进程）', e);
  }
}

