import fs from 'fs';
import http from 'http';
import express from 'express';
import { resolveWebRoot } from './paths.js';
import type { ServerContext } from './server-context.js';
import {
  registerHealthRoutes,
  registerLlmRoutes,
  registerEvaluatorRoutes,
  registerNsRoutes,
  registerGenesRoutes,
  registerEvolutionRoutes,
} from './routes/index.js';
import { initEvolutionManager } from './evolution-manager.js';

/**
 * 创建并配置 Express 应用（中间件 + 所有 API 路由），不监听端口。
 */
export function createApp(ctx: ServerContext): express.Application {
  const app = express();

  if (!ctx.apiOnly) {
    const webRoot = resolveWebRoot();
    if (!fs.existsSync(webRoot)) {
      throw new Error('未找到 Web 前端构建产物，请先执行 npm run build');
    }
  }

  app.use(express.json());

  if (ctx.apiOnly) {
    app.use((_req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (_req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });
  }

  if (!ctx.apiOnly) {
    const webRoot = resolveWebRoot();
    app.use(express.static(webRoot, { index: 'index.html' }));
  }

  registerHealthRoutes(app, ctx);
  registerLlmRoutes(app, ctx);
  registerEvaluatorRoutes(app, ctx);
  registerNsRoutes(app, ctx);
  registerGenesRoutes(app, ctx);
  registerEvolutionRoutes(app, ctx);

  return app;
}

/**
 * 启动 HTTP 服务：创建 app、监听端口并输出启动信息。
 */
export function startServer(ctx: ServerContext): void {
  initEvolutionManager({
    rootDir: ctx.rootDir,
    dataDir: ctx.dataDir,
    configDir: ctx.configDir,
  });

  const app = createApp(ctx);
  const server = http.createServer(app);

  server.listen(ctx.port, ctx.host, () => {
    console.log(`OpenEvolant 已启动${ctx.apiOnly ? ' (仅 API)' : ''}`);
    if (!ctx.apiOnly) {
      console.log(`  Web GUI: http://localhost:${ctx.port}`);
    } else {
      console.log(`  API: http://localhost:${ctx.port}`);
    }
    console.log(`  应用根目录: ${ctx.rootDir}`);
    console.log(`  配置目录: ${ctx.configDir}`);
    console.log(`  数据目录: ${ctx.dataDir}`);
  });
}
