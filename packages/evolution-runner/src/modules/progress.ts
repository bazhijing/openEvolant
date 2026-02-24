import { readEvolutionSpec, writeEvolutionSpec } from './evolutionSpec.js';

/**
 * 本轮得分与费用，用于更新 .evolution 进度。
 */
export type RoundResult = {
  score: number;
  costUsd: number;
};

/**
 * 根据本轮结果更新 .evolution 中的进度并写回。
 * 会读取当前 spec，计算 iterationCount / bestScore / progressPercent / updatedAt，再写入。
 */
export function updateProgressAfterRound(
  evolutionFilePath: string | null,
  roundResult: RoundResult,
  maxIterations: number,
): void {
  if (!evolutionFilePath) return;

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
  const nextBestScore = Math.max(prevBestScore, roundResult.score);
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
    `[evolution-runner] 第 ${nextExecutedIterations} 轮 结束，iterationCount=${nextExecutedIterations}, generation=${totalPlannedIterations}, bestScore=${nextBestScore.toFixed(4)}, progress=${updatedSpec.progressPercent}%`,
  );
}
