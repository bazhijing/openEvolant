export type SkillsRoundContext = {
  nsPath?: string;
  round: number;
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

