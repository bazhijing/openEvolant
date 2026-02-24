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
  /** 任务内容描述 */
  taskContent?: string;
  /** 预算 USD */
  budgetUsd?: number;
  /** 时间限制（毫秒） */
  timeLimitMs?: number;
  /** 已执行的迭代轮数（由 runner 累加写回） */
  iterationCount?: number;
  /** running | paused，v1 仅此两种 */
  status: 'running' | 'paused';
  scheduleType?: 'continuous' | 'scheduled';
  /** 计划的最大迭代轮数（上限），创建任务时写入 */
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
  /** 计划的最大迭代轮数（上限） */
  generation: number;
  /** 已执行的迭代轮数 */
  iterationCount?: number;
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
        generation: typeof spec.generation === 'number' && spec.generation > 0 ? spec.generation : 0,
        iterationCount:
          typeof spec.iterationCount === 'number' && spec.iterationCount >= 0
            ? spec.iterationCount
            : 0,
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
  const nsDir = path.join(ctx.configDir, 'ns');

  function tryReadMaxIterationsFromPolicy(policy: string): number | undefined {
    try {
      const filename = policy.endsWith('.ns') ? policy : `${policy}.ns`;
      const filePath = path.join(nsDir, filename);
      if (!fs.existsSync(filePath)) return undefined;
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (!raw.trim()) return undefined;
      const spec = JSON.parse(raw) as {
        runConstraints?: { maxIterations?: number };
      };
      const v = spec?.runConstraints?.maxIterations;
      return typeof v === 'number' && v > 0 ? v : undefined;
    } catch {
      return undefined;
    }
  }

  // /api/evolutions — 主接口
  app.get('/api/evolutions', (_req: Request, res: Response) => {
    try {
      res.json({ evolutions: listEvolutions(ctx) });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/evolutions', (req: Request, res: Response) => {
    const body = req.body as Partial<EvolutionFile> & { budgetUsd?: number; timeLimitMs?: number; iterationCount?: number; taskContent?: string };
    const speciesName = typeof body?.speciesName === 'string' ? body.speciesName.trim() : '';
    const genePool = typeof body?.genePool === 'string' ? body.genePool : 'default.genes';
    const policy = typeof body?.policy === 'string' ? body.policy : '自然选择';
    const taskContent = typeof body?.taskContent === 'string' ? body.taskContent.trim() || undefined : undefined;
    const budgetUsd = typeof body?.budgetUsd === 'number' && body.budgetUsd >= 0 ? body.budgetUsd : undefined;
    const timeLimitMs = typeof body?.timeLimitMs === 'number' && body.timeLimitMs >= 1 ? body.timeLimitMs : undefined;
    const requestedMaxIterations =
      typeof body?.iterationCount === 'number' && body.iterationCount >= 2 ? body.iterationCount : undefined;
    const policyMaxIterations = tryReadMaxIterationsFromPolicy(policy);
    const maxIterations = requestedMaxIterations ?? policyMaxIterations ?? 0;
    const id = 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();
    const evolution: EvolutionFile = {
      specVersion: '1.0',
      id,
      speciesName: speciesName || id,
      genePool,
      evaluator: '',
      policy,
      taskContent,
      budgetUsd,
      timeLimitMs,
      // 迭代信息：generation = 最大上限，iterationCount = 当前已执行轮数（创建时为 0）
      iterationCount: 0,
      status: 'running',
      scheduleType: 'continuous',
      generation: maxIterations,
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
        // 这里只需要传 id，实际的 genePool / policy / taskContent 等
        // 均在 EvolutionManager 内部从 .evolution 文件读取
        manager.startEvolution({ id });
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
      try {
        const manager = getEvolutionManager();
        manager.stopEvolution(id);
      } catch {
        // Manager not initialized or process not running — continue to delete profile
      }
      fs.unlinkSync(filePath);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });
}
