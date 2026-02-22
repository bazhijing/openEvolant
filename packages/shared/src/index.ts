/**
 * @openevolant/shared — 公共类型与工具
 */

export const PKG_NAME = '@openevolant/shared';
export const SPEC_VERSION_GENES = '0.1';
export const SPEC_VERSION_EVALUATOR = '0.1';

export type GenOrigin = 'seed' | 'mutation' | 'crossover';

export interface GenContent {
  promptFragments: string[];
  decisionSequence: unknown[];
  toolCallPreference: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface Gen {
  genId: string;
  version: number;
  fitness: number | null;
  content: GenContent;
  parentIds: string[];
  origin: GenOrigin;
  createdAt: string;
}

export interface TaskIntent {
  id: string;
  name: string;
  skillId: string | null;
  skillSource: 'new' | 'installed';
}

export interface GenesFile {
  specVersion: string;
  id: string;
  createdAt: string;
  updatedAt: string;
  taskIntent: TaskIntent;
  population: Gen[];
  currentBestGenId: string | null;
  history: Array<{
    iteration: number;
    at: string;
    event: string;
    genIds: string[];
    scores: Record<string, unknown>;
    summary?: string;
  }>;
}
