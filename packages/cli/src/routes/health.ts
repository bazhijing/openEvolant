import type { Request, Response } from 'express';
import type { ServerContext } from '../server-context.js';
import { getVersion } from '../paths.js';

export function registerHealthRoutes(
  app: import('express').Application,
  _ctx: ServerContext
): void {
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      version: getVersion(),
      rootDir: _ctx.rootDir,
      configDir: _ctx.configDir,
      dataDir: _ctx.dataDir,
    });
  });
}
