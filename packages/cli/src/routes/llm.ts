import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import type { ServerContext } from '../server-context.js';

function resolveRepoLlmConfigDir(scriptDir: string): string | null {
  const candidates = [
    path.join(scriptDir, '..', '..', 'config', 'llm'),
    path.join(scriptDir, '..', '..', '..', 'config', 'llm'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

export function registerLlmRoutes(app: import('express').Application, ctx: ServerContext): void {
  const llmDir = path.join(ctx.configDir, 'llm');
  const defaultLlmPath = path.join(llmDir, 'default.llm.json');
  const exampleLlmPath = path.join(llmDir, 'example.llm.json');

  // GET 当前 LLM 配置
  app.get('/api/config/llm', (_req: Request, res: Response) => {
    try {
      let raw: string | undefined;
      if (fs.existsSync(defaultLlmPath)) {
        raw = fs.readFileSync(defaultLlmPath, 'utf-8');
      } else if (fs.existsSync(exampleLlmPath)) {
        raw = fs.readFileSync(exampleLlmPath, 'utf-8');
      } else {
        const repoExample = path.join(ctx.scriptDir, '..', '..', 'config', 'llm', 'example.llm.json');
        if (fs.existsSync(repoExample)) {
          try {
            fs.mkdirSync(llmDir, { recursive: true });
            fs.copyFileSync(repoExample, exampleLlmPath);
            raw = fs.readFileSync(exampleLlmPath, 'utf-8');
          } catch {
            /* ignore */
          }
        }
        if (typeof raw === 'undefined') {
          return res.json({
            specVersion: '0.1',
            id: 'default-llm',
            name: '默认 LLM 配置',
            models: [],
          });
        }
      }
      if (typeof raw === 'undefined') {
        return res.json({
          specVersion: '0.1',
          id: 'default-llm',
          name: '默认 LLM 配置',
          models: [],
        });
      }
      const data = JSON.parse(raw);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // GET 支持的供应商与模型列表
  app.get('/api/config/llm/supported', (_req: Request, res: Response) => {
    try {
      const repoLlmDir = resolveRepoLlmConfigDir(ctx.scriptDir);
      const supportedPath = repoLlmDir
        ? path.join(repoLlmDir, 'supported-vendors-models.json')
        : null;
      if (!supportedPath || !fs.existsSync(supportedPath)) {
        return res.json({ vendors: [] });
      }
      const raw = fs.readFileSync(supportedPath, 'utf-8');
      const data = JSON.parse(raw) as {
        vendors?: Array<{ id: string; name: string; models?: Array<{ id: string; name: string }> }>;
      };
      const vendors = Array.isArray(data.vendors) ? data.vendors : [];
      res.json({ vendors });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // POST 保存 LLM 配置到 default.llm.json
  app.post('/api/config/llm', (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
      const models = Array.isArray(body.models) ? body.models : [];
      if (models.length < 1) {
        return res.status(400).json({ error: 'At least one model is required' });
      }
      if (!fs.existsSync(llmDir)) {
        fs.mkdirSync(llmDir, { recursive: true });
      }
      const payload = {
        specVersion: body.specVersion ?? '0.1',
        id: body.id ?? 'default-llm',
        name: body.name ?? '默认 LLM 配置',
        models,
      };
      fs.writeFileSync(defaultLlmPath, JSON.stringify(payload, null, 2), 'utf-8');
      res.json({ ...payload, savedPath: defaultLlmPath });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });
}
