export type GenesRoundContext = {
  genesPath?: string;
  round: number;
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

