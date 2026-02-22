#!/usr/bin/env node
/**
 * openevolant 命令行：一键启动 Web GUI、执行配置等
 * 用法: openevolant [start] [--port=3000] [--root=./openevolant]
 *       配置、数据、skill 等统一存放在 --root 目录下（默认 ./openevolant）
 *       openevolant --help | --version
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import express, { type Request, type Response } from 'express';

// 通过 symlink（如 /usr/local/bin/openevolant）运行时，用 process.argv[1] 解析真实脚本路径
function getScriptDir(): string {
  const fromArgv = process.argv[1];
  if (fromArgv) {
    const abs = path.isAbsolute(fromArgv) ? fromArgv : path.resolve(process.cwd(), fromArgv);
    try {
      if (fs.existsSync(abs)) return path.dirname(fs.realpathSync(abs));
    } catch {
      /* ignore */
    }
  }
  const fromUrl = fileURLToPath(import.meta.url);
  try {
    return path.dirname(fs.realpathSync(fromUrl));
  } catch {
    return path.dirname(fromUrl);
  }
}
const __dirname = getScriptDir();

const DEFAULT_PORT = 3000;
/** 默认应用根目录，其下为 config/、data/、skills/ 等 */
const DEFAULT_APP_ROOT = 'openevolant';

function resolveWebRoot(): string {
  const envRoot = process.env.OPENEVOLANT_ROOT;
  if (envRoot) {
    const p = path.join(path.resolve(envRoot), 'studio', 'dist');
    if (fs.existsSync(p)) return p;
  }
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'studio', 'dist'),
    path.join(__dirname, '..', '..', 'studio', 'dist'),
    path.join(__dirname, '..', 'studio', 'dist'),
  ];
  // 从 __dirname 向上查找包含 studio/dist 的目录（兼容 symlink 与任意安装深度）
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, 'studio', 'dist');
    if (fs.existsSync(p)) {
      candidates.push(p);
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function getVersion(): string {
  // packages/cli/dist -> ../../package.json = 根
  const candidates = [
    path.join(__dirname, '..', '..', 'package.json'),
    path.join(__dirname, '..', 'package.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return pkg.version ?? '0.1.0';
      }
    } catch {
      /* ignore */
    }
  }
  return '0.1.0';
}

function printHelp(): void {
  const v = getVersion();
  console.log(`
OpenEvolant v${v} — 自主进化引擎

用法:
  openevolant [命令] [选项]

命令:
  start              启动 Web GUI 与本地服务（默认）
  help, --help, -h   显示此帮助
  version, --version, -v  显示版本

 选项 (start):
  --port=<端口>      服务端口，默认 ${DEFAULT_PORT}
  --root=<路径>      应用根目录（其下为 config/、data/、skills/），默认 ${DEFAULT_APP_ROOT}
  --host=<host>      监听地址，默认 0.0.0.0
  --api-only         仅启动 API（不托管静态资源），用于开发时与 Vite 前端联调

示例:
  openevolant
  openevolant start --port=4000
  openevolant --root=./my-openevolant
`);
}

function startServer(opts: {
  port: number;
  rootDir: string;
  configDir: string;
  dataDir: string;
  host: string;
  apiOnly?: boolean;
}): void {
  const app = express();

  if (!opts.apiOnly) {
    const webRoot = resolveWebRoot();
    if (!fs.existsSync(webRoot)) {
      console.error('错误: 未找到 Web 前端构建产物，请先执行 npm run build');
      process.exit(1);
    }
  }

  app.use(express.json());
  // 开发联调时允许 Vite 前端 (localhost:5173) 跨域访问
  if (opts.apiOnly) {
    app.use((_req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (_req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });
  }
  if (!opts.apiOnly) {
    const webRoot = resolveWebRoot();
    app.use(express.static(webRoot, { index: 'index.html' }));
  }

  const llmDir = path.join(opts.configDir, 'llm');
  const defaultLlmPath = path.join(llmDir, 'default.llm.json');
  const exampleLlmPath = path.join(llmDir, 'example.llm.json');

  /** 解析仓库内 config/llm 目录（支持从 packages/cli 或 packages/cli/dist 运行） */
  function resolveRepoLlmConfigDir(): string | null {
    const candidates = [
      path.join(__dirname, '..', '..', 'config', 'llm'),
      path.join(__dirname, '..', '..', '..', 'config', 'llm'),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) return dir;
    }
    return null;
  }

  /** 解析仓库内 config/evaluator（预设，随仓库打包） */
  function resolveRepoEvaluatorDir(): string | null {
    const candidates = [
      path.join(__dirname, '..', '..', 'config', 'evaluator'),
      path.join(__dirname, '..', '..', '..', 'config', 'evaluator'),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
    }
    return null;
  }

  function readEvaluatorsFromDir(dir: string, source: 'preset' | 'user'): Array<Record<string, unknown>> {
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

  /** 根目录 config/evaluator 为空时写入示例，便于测试用户侧 evaluator */
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

  // 健康检查 / 简单 API 占位
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      version: getVersion(),
      rootDir: opts.rootDir,
      configDir: opts.configDir,
      dataDir: opts.dataDir,
    });
  });

  // GET 当前 LLM 配置（default.llm.json 或 example.llm.json 或空骨架）
  app.get('/api/config/llm', (_req: Request, res: Response) => {
    try {
      let raw: string | undefined;
      if (fs.existsSync(defaultLlmPath)) {
        raw = fs.readFileSync(defaultLlmPath, 'utf-8');
      } else if (fs.existsSync(exampleLlmPath)) {
        raw = fs.readFileSync(exampleLlmPath, 'utf-8');
      } else {
        // 首次运行：尝试从仓库 config/llm 复制示例到应用根目录下
        const repoExample = path.join(__dirname, '..', '..', 'config', 'llm', 'example.llm.json');
        if (fs.existsSync(repoExample)) {
          try {
            fs.mkdirSync(llmDir, { recursive: true });
            fs.copyFileSync(repoExample, exampleLlmPath);
            raw = fs.readFileSync(exampleLlmPath, 'utf-8');
          } catch {
            /* ignore, use skeleton */
          }
        }
        if (typeof raw === 'undefined') {
          const skeleton = {
            specVersion: '0.1',
            id: 'default-llm',
            name: '默认 LLM 配置',
            models: [],
          };
          return res.json(skeleton);
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

  // GET 支持的供应商与模型列表（来自 config/llm/supported-vendors-models.json）
  app.get('/api/config/llm/supported', (_req: Request, res: Response) => {
    try {
      const repoLlmDir = resolveRepoLlmConfigDir();
      const supportedPath = repoLlmDir
        ? path.join(repoLlmDir, 'supported-vendors-models.json')
        : null;
      if (!supportedPath || !fs.existsSync(supportedPath)) {
        return res.json({ vendors: [] });
      }
      const raw = fs.readFileSync(supportedPath, 'utf-8');
      const data = JSON.parse(raw) as { vendors?: Array<{ id: string; name: string; models?: Array<{ id: string; name: string }> }> };
      const vendors = Array.isArray(data.vendors) ? data.vendors : [];
      res.json({ vendors });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // GET 所有 .evaluator：预设（仓库 config/evaluator 打包）+ 用户（根目录 config/evaluator）。每项带 source: 'preset' | 'user'
  const userEvaluatorDir = path.join(opts.configDir, 'evaluator');
  app.get('/api/config/evaluators', (_req: Request, res: Response) => {
    try {
      ensureUserEvaluatorDirWithExample(userEvaluatorDir);

      const presets: Array<Record<string, unknown>> = [];
      const repoEvaluatorDir = resolveRepoEvaluatorDir();
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

  /** 将 id 转为安全文件名（仅保留字母数字、连字符、下划线） */
  function evaluatorIdToFilename(evaluatorId: string): string {
    return `${evaluatorId.replace(/[^a-zA-Z0-9_-]/g, '-')}.evaluator`;
  }

  // POST 创建或更新用户 .evaluator 文件（写入 config/evaluator/<id>.evaluator）
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

  // DELETE 删除用户 .evaluator 文件（仅限用户目录，不可删预设）
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

  // POST 保存 LLM 配置到 default.llm.json（至少保留一个模型）
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

  const server = http.createServer(app);
  server.listen(opts.port, opts.host, () => {
    console.log(`OpenEvolant 已启动${opts.apiOnly ? ' (仅 API)' : ''}`);
    if (!opts.apiOnly) {
      console.log(`  Web GUI: http://localhost:${opts.port}`);
    } else {
      console.log(`  API: http://localhost:${opts.port}`);
    }
    console.log(`  应用根目录: ${opts.rootDir}`);
    console.log(`  配置目录: ${opts.configDir}`);
    console.log(`  数据目录: ${opts.dataDir}`);
  });
}

function parseArgs(): {
  command: string;
  port: number;
  root: string;
  host: string;
  apiOnly: boolean;
} {
  const args = process.argv.slice(2);
  let command = 'start';
  let port = DEFAULT_PORT;
  let root = DEFAULT_APP_ROOT;
  let host = '0.0.0.0';
  let apiOnly = false;

  for (const arg of args) {
    if (arg === '--help' || arg === '-h' || arg === 'help') {
      command = 'help';
      break;
    }
    if (arg === '--version' || arg === '-v' || arg === 'version') {
      command = 'version';
      break;
    }
    if (arg === 'start') command = 'start';
    else if (arg.startsWith('--port=')) port = parseInt(arg.slice(7), 10) || DEFAULT_PORT;
    else if (arg.startsWith('--root=')) root = arg.slice(7).trim() || DEFAULT_APP_ROOT;
    else if (arg.startsWith('--host=')) host = arg.slice(7).trim() || '0.0.0.0';
    else if (arg === '--api-only') apiOnly = true;
  }

  return { command, port, root, host, apiOnly };
}

function main(): void {
  const { command, port, root, host, apiOnly } = parseArgs();

  if (command === 'help') {
    printHelp();
    process.exit(0);
  }
  if (command === 'version') {
    console.log(getVersion());
    process.exit(0);
  }

  if (command === 'start') {
    const cwd = process.cwd();
    const rootDir = path.resolve(cwd, root);
    const configDir = path.join(rootDir, 'config');
    const dataDir = path.join(rootDir, 'data');
    startServer({ port, rootDir, configDir, dataDir, host, apiOnly });
  } else {
    printHelp();
    process.exit(1);
  }
}

main();
