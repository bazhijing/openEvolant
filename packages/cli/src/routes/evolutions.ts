import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import type { ServerContext } from '../server-context.js';
import { getEvolutionManager } from '../evolution-manager.js';

/** .evolution 文件顶层结构（正在运行/暂停的进化任务，比 .genes 更复杂） */
export interface EvolutionFile {
  specVersion?: string;
  id: string;
  speciesName: string;
  genePool: string;
  evaluator: string;
  policy: string;
  /** running | paused，v1 仅此两种 */
  status: 'running' | 'paused';
  scheduleType?: 'continuous' | 'scheduled';
  generation: number;
  bestScore: number;
  progressPercent: number;
  startedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvolutionListItem {
  id: string;
  speciesName: string;
  genePool: string;
  evaluator: string;
  policy: string;
  status: 'running' | 'paused';
  scheduleType?: 'continuous' | 'scheduled';
  generation: number;
  bestScore: number;
  progressPercent: number;
  startedAt: string;
  updatedAt: string;
}

function readEvolutionsFromDir(dir: string): EvolutionListItem[] {
  const list: EvolutionListItem[] = [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return list;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.evolution'));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const spec = JSON.parse(raw) as EvolutionFile;
      if (!spec || typeof spec.id !== 'string') continue;
      const status = spec.status === 'paused' ? 'paused' : 'running';
      list.push({
        id: spec.id,
        speciesName: typeof spec.speciesName === 'string' ? spec.speciesName : spec.id,
        genePool: typeof spec.genePool === 'string' ? spec.genePool : '',
        evaluator: typeof spec.evaluator === 'string' ? spec.evaluator : '',
        policy: typeof spec.policy === 'string' ? spec.policy : '',
        status,
        scheduleType: spec.scheduleType,
        generation: typeof spec.generation === 'number' ? spec.generation : 0,
        bestScore: typeof spec.bestScore === 'number' ? spec.bestScore : 0,
        progressPercent: typeof spec.progressPercent === 'number' ? spec.progressPercent : 0,
        startedAt: typeof spec.startedAt === 'string' ? spec.startedAt : spec.createdAt ?? new Date().toISOString(),
        updatedAt: typeof spec.updatedAt === 'string' ? spec.updatedAt : spec.startedAt ?? new Date().toISOString(),
      });
    } catch {
      /* skip invalid file */
    }
  }
  return list;
}

function resolveEvolutionsDir(ctx: ServerContext): string {
  const fromData = path.join(ctx.dataDir, 'evolutions');
  if (fs.existsSync(fromData) && fs.statSync(fromData).isDirectory()) return fromData;
  const fromRoot = path.join(ctx.rootDir, 'evolutions');
  if (fs.existsSync(fromRoot) && fs.statSync(fromRoot).isDirectory()) return fromRoot;
  const dir = path.join(ctx.dataDir, 'evolutions');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function listEvolutions(ctx: ServerContext): EvolutionListItem[] {
  const fromData = path.join(ctx.dataDir, 'evolutions');
  const fromRoot = path.join(ctx.rootDir, 'evolutions');
  const evolutions: EvolutionListItem[] = [];
  const seenIds = new Set<string>();
  for (const d of [fromData, fromRoot]) {
    for (const item of readEvolutionsFromDir(d)) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        evolutions.push(item);
      }
    }
  }
  return evolutions;
}

function findEvolutionFilePath(ctx: ServerContext, id: string): string | null {
  const fromData = path.join(ctx.dataDir, 'evolutions');
  const fromRoot = path.join(ctx.rootDir, 'evolutions');
  for (const base of [fromData, fromRoot]) {
    const filePath = path.join(base, `${id}.evolution`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

export function registerEvolutionRoutes(
  app: import('express').Application,
  ctx: ServerContext
): void {
  const dir = resolveEvolutionsDir(ctx);

  // /api/evolutions — 主接口
  app.get('/api/evolutions', (_req: Request, res: Response) => {
    try {
      res.json({ evolutions: listEvolutions(ctx) });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/evolutions', (req: Request, res: Response) => {
    const body = req.body as Partial<EvolutionFile>;
    const speciesName = typeof body?.speciesName === 'string' ? body.speciesName.trim() : '';
    const genePool = typeof body?.genePool === 'string' ? body.genePool : 'default.genes';
    const evaluator = typeof body?.evaluator === 'string' ? body.evaluator : 'AI Quality';
    const policy = typeof body?.policy === 'string' ? body.policy : 'balanced.ns';
    const id = 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();
    const evolution: EvolutionFile = {
      specVersion: '1.0',
      id,
      speciesName: speciesName || id,
      genePool,
      evaluator,
      policy,
      status: 'running',
      scheduleType: 'continuous',
      generation: 0,
      bestScore: 0,
      progressPercent: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${id}.evolution`);
      fs.writeFileSync(filePath, JSON.stringify(evolution, null, 2), 'utf-8');

      try {
        const manager = getEvolutionManager();
        manager.startEvolution({
          id,
          speciesName: evolution.speciesName,
          genePool,
          evaluator,
          policy,
        });
      } catch {
        // 如果 manager 尚未初始化，静默忽略以保证 API 不被阻塞
      }

      res.status(201).json(evolution);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.patch('/api/evolutions/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const body = req.body as { status?: 'running' | 'paused' };
    if (!id || typeof body?.status !== 'string' || !['running', 'paused'].includes(body.status)) {
      res.status(400).json({ error: 'Bad request: status must be "running" or "paused"' });
      return;
    }
    try {
      const filePath = findEvolutionFilePath(ctx, id);
      if (!filePath) {
        res.status(404).json({ error: 'Evolution not found' });
        return;
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      const spec = JSON.parse(raw) as EvolutionFile;
      const updated: EvolutionFile = {
        ...spec,
        status: body.status as 'running' | 'paused',
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete('/api/evolutions/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Bad request' });
      return;
    }
    try {
      const filePath = findEvolutionFilePath(ctx, id);
      if (!filePath) {
        res.status(404).json({ error: 'Evolution not found' });
        return;
      }
      fs.unlinkSync(filePath);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // 兼容旧路径 /api/config/evolutions
  app.get('/api/config/evolutions', (_req: Request, res: Response) => {
    try {
      res.json({ evolutions: listEvolutions(ctx) });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.patch('/api/config/evolutions/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const body = req.body as { status?: 'running' | 'paused' };
    if (!id || typeof body?.status !== 'string' || !['running', 'paused'].includes(body.status)) {
      res.status(400).json({ error: 'Bad request: status must be "running" or "paused"' });
      return;
    }
    try {
      const fromData = path.join(ctx.dataDir, 'evolutions');
      const fromRoot = path.join(ctx.rootDir, 'evolutions');
      let found = false;
      for (const base of [fromData, fromRoot]) {
        if (!fs.existsSync(base)) continue;
        const files = fs.readdirSync(base).filter((f) => f.endsWith('.evolution'));
        for (const file of files) {
          const filePath = path.join(base, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const spec = JSON.parse(raw) as EvolutionFile;
          if (spec?.id !== id) continue;
          found = true;
          const updated: EvolutionFile = {
            ...spec,
            status: body.status as 'running' | 'paused',
            updatedAt: new Date().toISOString(),
          };
          fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
          res.json(updated);
          return;
        }
      }
      if (!found) res.status(404).json({ error: 'Evolution not found' });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete('/api/config/evolutions/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Bad request' });
      return;
    }
    try {
      const fromData = path.join(ctx.dataDir, 'evolutions');
      const fromRoot = path.join(ctx.rootDir, 'evolutions');
      for (const base of [fromData, fromRoot]) {
        const filePath = path.join(base, `${id}.evolution`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          res.status(204).send();
          return;
        }
      }
      res.status(404).json({ error: 'Evolution not found' });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/config/evolutions', (req: Request, res: Response) => {
    const body = req.body as Partial<EvolutionFile>;
    const speciesName = typeof body?.speciesName === 'string' ? body.speciesName.trim() : '';
    const genePool = typeof body?.genePool === 'string' ? body.genePool : 'default.genes';
    const evaluator = typeof body?.evaluator === 'string' ? body.evaluator : 'AI Quality';
    const policy = typeof body?.policy === 'string' ? body.policy : 'balanced.ns';
    const id = 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();
    const evolution: EvolutionFile = {
      specVersion: '1.0',
      id,
      speciesName: speciesName || id,
      genePool,
      evaluator,
      policy,
      status: 'running',
      scheduleType: 'continuous',
      generation: 0,
      bestScore: 0,
      progressPercent: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${id}.evolution`);
      fs.writeFileSync(filePath, JSON.stringify(evolution, null, 2), 'utf-8');

      try {
        const manager = getEvolutionManager();
        manager.startEvolution({
          id,
          speciesName: evolution.speciesName,
          genePool,
          evaluator,
          policy,
        });
      } catch {
        // 同上，manager 相关错误不影响配置写入与 API 返回
      }

      res.status(201).json(evolution);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });
}
