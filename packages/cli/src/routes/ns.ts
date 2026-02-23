import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import type { ServerContext } from '../server-context.js';

function resolveRepoNsDir(scriptDir: string): string | null {
  const candidates = [
    path.join(scriptDir, '..', '..', 'config', 'ns'),
    path.join(scriptDir, '..', '..', '..', 'config', 'ns'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
  }
  return null;
}

function readNsFromDir(dir: string, source: 'preset' | 'user'): Array<Record<string, unknown>> {
  const list: Array<Record<string, unknown>> = [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return list;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ns'));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const spec = JSON.parse(raw) as Record<string, unknown>;
      if (spec && typeof spec.id === 'string') list.push({ ...spec, source });
    } catch {
      /* skip invalid file */
    }
  }
  return list;
}

const EXAMPLE_USER_NS = {
  specVersion: '0.1',
  id: 'example-user',
  name: 'Example (user) 示例策略',
  createdAt: '2025-02-22T00:00:00Z',
  updatedAt: '2025-02-22T00:00:00Z',
  runConstraints: {
    timeLimitSeconds: 1800,
    budgetMoney: 5,
    maxIterations: 30,
    maxConcurrentRuns: null,
  },
  interruptConditions: {
    stopWhenScoreAbove: 0.9,
    stopWhenScoreBelow: null,
    stopWhenNoImprovementForIterations: 5,
    description: '示例：分数≥0.9 或连续 5 轮无提升则停',
  },
  evaluatorRefs: [
    { evaluatorId: 'preset-ai-quality', key: 'ai', weight: 0.6 },
    { evaluatorId: 'preset-cost', key: 'cost', weight: 0.2 },
    { evaluatorId: 'preset-time', key: 'time', weight: 0.2 },
  ],
  aggregation: { method: 'weighted_sum' as const, primaryDimension: null as string | null },
};

function ensureUserNsDirWithExample(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ns'));
  if (files.length === 0) {
    const examplePath = path.join(dir, 'example-user.ns');
    fs.writeFileSync(examplePath, JSON.stringify(EXAMPLE_USER_NS, null, 2), 'utf-8');
  }
}

function nsIdToFilename(nsId: string): string {
  return `${nsId.replace(/[^a-zA-Z0-9_-]/g, '-')}.ns`;
}

export function registerNsRoutes(app: import('express').Application, ctx: ServerContext): void {
  const userNsDir = path.join(ctx.configDir, 'ns');

  app.get('/api/config/ns', (_req: Request, res: Response) => {
    try {
      ensureUserNsDirWithExample(userNsDir);

      const presets: Array<Record<string, unknown>> = [];
      const repoNsDir = resolveRepoNsDir(ctx.scriptDir);
      if (repoNsDir) {
        presets.push(...readNsFromDir(repoNsDir, 'preset'));
      }

      const userList = readNsFromDir(userNsDir, 'user');
      const policies = [...presets, ...userList];
      res.json({ policies });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/config/ns', (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      ensureUserNsDirWithExample(userNsDir);
      const payload = {
        specVersion: body.specVersion ?? '0.1',
        id,
        name: typeof body.name === 'string' ? body.name : 'Unnamed',
        createdAt: typeof body.createdAt === 'string' ? body.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        runConstraints:
          body.runConstraints && typeof body.runConstraints === 'object'
            ? body.runConstraints
            : EXAMPLE_USER_NS.runConstraints,
        interruptConditions:
          body.interruptConditions && typeof body.interruptConditions === 'object'
            ? body.interruptConditions
            : EXAMPLE_USER_NS.interruptConditions,
        evaluatorRefs: Array.isArray(body.evaluatorRefs) ? body.evaluatorRefs : EXAMPLE_USER_NS.evaluatorRefs,
        aggregation:
          body.aggregation && typeof body.aggregation === 'object'
            ? body.aggregation
            : EXAMPLE_USER_NS.aggregation,
      };
      const filename = nsIdToFilename(id);
      const filePath = path.join(userNsDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.json({ policy: { ...payload, source: 'user' }, savedPath: filePath });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete('/api/config/ns/:id', (req: Request, res: Response) => {
    try {
      const id = (req.params.id ?? '').trim();
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      const filename = nsIdToFilename(id);
      const filePath = path.join(userNsDir, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Policy not found' });
      }
      fs.unlinkSync(filePath);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });
}
