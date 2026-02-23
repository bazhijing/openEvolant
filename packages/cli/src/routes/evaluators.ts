import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import type { ServerContext } from '../server-context.js';

function resolveRepoEvaluatorDir(scriptDir: string): string | null {
  const candidates = [
    path.join(scriptDir, '..', '..', 'config', 'evaluator'),
    path.join(scriptDir, '..', '..', '..', 'config', 'evaluator'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
  }
  return null;
}

function readEvaluatorsFromDir(
  dir: string,
  source: 'preset' | 'user'
): Array<Record<string, unknown>> {
  const evaluators: Array<Record<string, unknown>> = [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.evaluator'));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const spec = JSON.parse(raw) as Record<string, unknown>;
      if (spec && typeof spec.id === 'string') evaluators.push({ ...spec, source });
    } catch {
      /* skip invalid file */
    }
  }
  return evaluators;
}

const EXAMPLE_USER_EVALUATOR = {
  specVersion: '0.1',
  id: 'example-user',
  name: 'Example (user)',
  createdAt: '2025-02-22T00:00:00Z',
  updatedAt: '2025-02-22T00:00:00Z',
  kind: 'accuracy',
  config: { higherBetter: true },
};

function ensureUserEvaluatorDirWithExample(userEvaluatorDir: string): void {
  if (!fs.existsSync(userEvaluatorDir)) {
    fs.mkdirSync(userEvaluatorDir, { recursive: true });
  }
  const files = fs.readdirSync(userEvaluatorDir).filter((f) => f.endsWith('.evaluator'));
  if (files.length === 0) {
    const examplePath = path.join(userEvaluatorDir, 'example-user.evaluator');
    fs.writeFileSync(examplePath, JSON.stringify(EXAMPLE_USER_EVALUATOR, null, 2), 'utf-8');
  }
}

function evaluatorIdToFilename(evaluatorId: string): string {
  return `${evaluatorId.replace(/[^a-zA-Z0-9_-]/g, '-')}.evaluator`;
}

export function registerEvaluatorRoutes(
  app: import('express').Application,
  ctx: ServerContext
): void {
  const userEvaluatorDir = path.join(ctx.configDir, 'evaluator');

  app.get('/api/config/evaluators', (_req: Request, res: Response) => {
    try {
      ensureUserEvaluatorDirWithExample(userEvaluatorDir);

      const presets: Array<Record<string, unknown>> = [];
      const repoEvaluatorDir = resolveRepoEvaluatorDir(ctx.scriptDir);
      if (repoEvaluatorDir) {
        presets.push(...readEvaluatorsFromDir(repoEvaluatorDir, 'preset'));
      }

      const userEvaluators = readEvaluatorsFromDir(userEvaluatorDir, 'user');
      const evaluators = [...presets, ...userEvaluators];
      res.json({ evaluators });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/config/evaluators', (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      ensureUserEvaluatorDirWithExample(userEvaluatorDir);
      const payload = {
        specVersion: body.specVersion ?? '0.1',
        id,
        name: typeof body.name === 'string' ? body.name : 'Unnamed',
        createdAt: typeof body.createdAt === 'string' ? body.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        kind: body.kind ?? 'ai',
        config: body.config && typeof body.config === 'object' ? body.config : {},
      };
      const filename = evaluatorIdToFilename(id);
      const filePath = path.join(userEvaluatorDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.json({ evaluator: { ...payload, source: 'user' }, savedPath: filePath });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete('/api/config/evaluators/:id', (req: Request, res: Response) => {
    try {
      const id = (req.params.id ?? '').trim();
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      const filename = evaluatorIdToFilename(id);
      const filePath = path.join(userEvaluatorDir, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Evaluator not found' });
      }
      fs.unlinkSync(filePath);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });
}
