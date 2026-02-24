import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import type { ServerContext } from '../server-context.js';

/** .genes 文件顶层结构（仅列出 API 所需字段） */
interface GenesFile {
  specVersion?: string;
  id: string;
  createdAt?: string;
  updatedAt?: string;
  taskIntent?: { id?: string; name?: string; skillId?: string | null; skillSource?: string };
  population?: Array<{ genId?: string; fitness?: number | null }>;
  currentBestGenId?: string | null;
  history?: Array<{ iteration?: number; scores?: Record<string, number> }>;
}

export interface GenomeListItem {
  id: string;
  name: string;
  generation: number;
  score: number;
  updatedAt: string;
  status: 'stable' | 'evolving' | 'archived';
  geneCount: number;
  source: 'preset' | 'user';
}

function resolveRepoGenesDir(scriptDir: string): string | null {
  const candidates = [
    path.join(scriptDir, '..', '..', 'config', 'genes'),
    path.join(scriptDir, '..', '..', '..', 'config', 'genes'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
  }
  return null;
}

function readGenesFromDir(
  dir: string,
  source: 'preset' | 'user'
): GenomeListItem[] {
  const list: GenomeListItem[] = [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return list;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.genes'));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const spec = JSON.parse(raw) as GenesFile;
      if (!spec || typeof spec.id !== 'string') continue;
      const name =
        (spec.taskIntent && typeof spec.taskIntent.name === 'string' && spec.taskIntent.name.trim()) ||
        spec.id;
      const population = Array.isArray(spec.population) ? spec.population : [];
      const history = Array.isArray(spec.history) ? spec.history : [];
      let score = 0;
      if (spec.currentBestGenId && population.length > 0) {
        const best = population.find((p) => p.genId === spec.currentBestGenId);
        if (best != null && typeof best.fitness === 'number') score = best.fitness;
      }
      if (score === 0 && history.length > 0) {
        const last = history[history.length - 1];
        const scores = last?.scores && typeof last.scores === 'object' ? last.scores : {};
        const vals = Object.values(scores).filter((v): v is number => typeof v === 'number');
        if (vals.length > 0) score = vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      list.push({
        id: spec.id,
        name,
        generation: history.length,
        score,
        updatedAt: typeof spec.updatedAt === 'string' ? spec.updatedAt : (spec.createdAt ?? new Date().toISOString()),
        status: 'stable',
        geneCount: population.length,
        source,
      });
    } catch {
      /* skip invalid file */
    }
  }
  return list;
}

export function registerGenesRoutes(
  app: import('express').Application,
  ctx: ServerContext
): void {
  // 运行时基因池统一放在 <root>/data/genes（例如 openevolant/data/genes）
  const userGenesDir = path.join(ctx.dataDir, 'genes');

  app.get('/api/config/genes', (_req: Request, res: Response) => {
    try {
      const genomes: GenomeListItem[] = [];

      const repoGenesDir = resolveRepoGenesDir(ctx.scriptDir);
      if (repoGenesDir) {
        genomes.push(...readGenesFromDir(repoGenesDir, 'preset'));
      }

      const userGenomes = readGenesFromDir(userGenesDir, 'user');
      const seenIds = new Set(genomes.map((g) => g.id));
      for (const g of userGenomes) {
        if (!seenIds.has(g.id)) {
          seenIds.add(g.id);
          genomes.push(g);
        }
      }

      res.json({ genomes });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });
}
