/**
 * @openevolant/evolution — Evolution Engine：变异、重组、种群轮替
 */

import type { GenesFile, Gen } from '@openevolant/genes';

export type { GenesFile, Gen };

export function selectTopByFitness(file: GenesFile, n: number): Gen[] {
  const withFitness = file.population.filter((g) => g.fitness != null) as (Gen & { fitness: number })[];
  return withFitness.sort((a, b) => b.fitness - a.fitness).slice(0, n);
}

export function createSeedGen(genId: string, content: Gen['content']): Gen {
  return {
    genId,
    version: 1,
    fitness: null,
    content,
    parentIds: [],
    origin: 'seed',
    createdAt: new Date().toISOString(),
  };
}
