/**
 * @openevolant/genes — Gen Pool、.genes 读写与版本管理
 */

import type { GenesFile, Gen } from '@openevolant/shared';
import { SPEC_VERSION_GENES } from '@openevolant/shared';

export type { GenesFile, Gen };

export function createEmptyGenesFile(id: string, taskIntent: GenesFile['taskIntent']): GenesFile {
  const now = new Date().toISOString();
  return {
    specVersion: SPEC_VERSION_GENES,
    id,
    createdAt: now,
    updatedAt: now,
    taskIntent,
    population: [],
    currentBestGenId: null,
    history: [],
  };
}

export function addGen(file: GenesFile, gen: Gen): GenesFile {
  return {
    ...file,
    updatedAt: new Date().toISOString(),
    population: [...file.population, gen],
  };
}

export function setCurrentBest(file: GenesFile, genId: string): GenesFile {
  return {
    ...file,
    updatedAt: new Date().toISOString(),
    currentBestGenId: genId,
  };
}
