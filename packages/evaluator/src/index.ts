/**
 * @openevolant/evaluator — 评估逻辑、.evaluator 配置、多维度打分
 */

import { createLLMClient, type LLMConfig } from '@openevolant/llm';

// --- 单条件评估器（.evaluator 单文件，供 .ns 引用）---

export type SingleEvaluatorKind = 'ai' | 'aiwebsite' | 'cost' | 'time' | 'accuracy' | 'custom';

export interface SingleEvaluatorSpec {
  specVersion: string;
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  kind: SingleEvaluatorKind;
  config: Record<string, unknown>;
}

/** 分数方向：true = 分数越大越好（如质量、准确率），false = 分数越小越好（如成本、耗时） */
export function isHigherBetter(spec: SingleEvaluatorSpec): boolean {
  const v = spec.config?.['higherBetter'];
  if (v === false) return false;
  return true;
}

export function parseSingleEvaluatorConfig(json: string): SingleEvaluatorSpec {
  return JSON.parse(json) as SingleEvaluatorSpec;
}

export interface SingleEvaluatorRunContext {
  userInput?: string;
  modelOutput?: string;
  cost?: number;
  timeMs?: number;
  /** 准确率/符合度 0–1，仅 kind=accuracy 时使用 */
  accuracy?: number;
}

export interface SingleEvaluatorRunOptions {
  llmConfig?: LLMConfig;
}

/**
 * 运行单条件评估器，返回 0–1 归一化分数（1 表示该维度上「越好」）。
 * 对于 higherBetter=false 的维度（如 cost、time），内部已做 invert，调用方拿到的仍是「越高越好」的 0–1。
 */
export async function runSingleEvaluator(
  spec: SingleEvaluatorSpec,
  context: SingleEvaluatorRunContext,
  options?: SingleEvaluatorRunOptions
): Promise<{ score: number }> {
  const cfg = spec.config || {};
  switch (spec.kind) {
    case 'ai':
    case 'aiwebsite': {
      const prompt = (cfg['prompt'] as string) ?? '';
      const userInput = context.userInput ?? '';
      const modelOutput = context.modelOutput ?? '';
      const filled = prompt
        .replace(/\{\{userInput\}\}/g, userInput)
        .replace(/\{\{modelOutput\}\}/g, modelOutput);
      const llmConfig = options?.llmConfig;
      if (!llmConfig) {
        return { score: 0 };
      }
      const modelOverride = cfg['model'] as string | undefined;
      const client = createLLMClient(
        modelOverride ? { ...llmConfig, model: modelOverride } : llmConfig
      );
      const temperature = (cfg['temperature'] as number) ?? 0;
      const res = await client.chat({
        messages: [{ role: 'user', content: filled }],
        temperature,
        maxTokens: 64,
      });
      const raw = parseFloat(res.content.trim().replace(/[^\d.-]/g, '') || '0');
      const min = (cfg['min'] as number) ?? 0;
      const max = (cfg['max'] as number) ?? 100;
      const clamp = Math.min(max, Math.max(min, raw));
      const normalizeToZeroOne = cfg['normalizeToZeroOne'] !== false;
      const score = normalizeToZeroOne ? (clamp - min) / (max - min || 1) : clamp;
      return { score };
    }
    case 'cost': {
      const cost = context.cost ?? 0;
      const cap = (cfg['cap'] as number) ?? 1;
      const ratio = cap > 0 ? Math.min(1, cost / cap) : 0;
      const score = 1 - ratio;
      return { score };
    }
    case 'time': {
      const timeMs = context.timeMs ?? 0;
      const capMs = (cfg['capMs'] as number) ?? 30000;
      const ratio = capMs > 0 ? Math.min(1, timeMs / capMs) : 0;
      const score = 1 - ratio;
      return { score };
    }
    case 'accuracy': {
      const score = typeof context.accuracy === 'number' ? Math.min(1, Math.max(0, context.accuracy)) : 0;
      return { score };
    }
    default:
      return { score: 0 };
  }
}

// --- 复合评估配置（多维度 + 聚合，兼容现有 example.evaluator）---

export interface EvaluatorDimension {
  key: string;
  name: string;
  weight: number;
  kind: 'ai' | 'aiwebsite' | 'cost' | 'time' | 'accuracy' | 'custom';
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
