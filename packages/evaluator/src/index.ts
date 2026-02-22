/**
 * @openevolant/evaluator — 评估逻辑、.evaluator 配置、多维度打分
 */

export interface EvaluatorDimension {
  key: string;
  name: string;
  weight: number;
  kind: 'ai' | 'cost' | 'time' | 'accuracy' | 'custom';
  config: Record<string, unknown>;
}

export interface EvaluatorConfig {
  specVersion: string;
  id: string;
  name: string;
  runConstraints: {
    timeLimitSeconds: number | null;
    budgetMoney: number | null;
    maxIterations: number;
    maxConcurrentRuns: number | null;
  };
  interruptConditions: {
    stopWhenScoreAbove: number | null;
    stopWhenScoreBelow: number | null;
    stopWhenNoImprovementForIterations: number | null;
  };
  dimensions: EvaluatorDimension[];
  aggregation: { method: 'weighted_sum' | 'min' | 'max'; primaryDimension: string | null };
}

export function parseEvaluatorConfig(json: string): EvaluatorConfig {
  return JSON.parse(json) as EvaluatorConfig;
}

export function aggregateScore(
  scoresByDimension: Record<string, number>,
  dimensions: EvaluatorDimension[],
  method: EvaluatorConfig['aggregation']['method']
): number {
  if (method === 'weighted_sum') {
    let sum = 0;
    let totalWeight = 0;
    for (const d of dimensions) {
      const v = scoresByDimension[d.key];
      if (typeof v === 'number') {
        sum += v * d.weight;
        totalWeight += d.weight;
      }
    }
    return totalWeight > 0 ? sum / totalWeight : 0;
  }
  const values = dimensions.map((d) => scoresByDimension[d.key]).filter((v) => typeof v === 'number');
  if (values.length === 0) return 0;
  return method === 'min' ? Math.min(...values) : Math.max(...values);
}
