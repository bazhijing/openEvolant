#!/usr/bin/env node
/**
 * openevolant 命令行：一键启动 Web GUI、执行配置等
 * 用法: openevolant [start] [--port=3000] [--data-dir=./data] [--config-dir=./config]
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
const DEFAULT_DATA_DIR = 'data';
const DEFAULT_CONFIG_DIR = 'config';

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
  --data-dir=<路径>  数据目录（.genes、会话等），默认 ${DEFAULT_DATA_DIR}
  --config-dir=<路径> 配置目录（.evaluator 等），默认 ${DEFAULT_CONFIG_DIR}
  --host=<host>      监听地址，默认 0.0.0.0

示例:
  openevolant
  openevolant start --port=4000
  openevolant --data-dir=./my-data
`);
}

function startServer(opts: {
  port: number;
  dataDir: string;
  configDir: string;
  host: string;
}): void {
  const app = express();
  const webRoot = resolveWebRoot();

  if (!fs.existsSync(webRoot)) {
    console.error('错误: 未找到 Web 前端构建产物，请先执行 npm run build');
    process.exit(1);
  }

  app.use(express.static(webRoot, { index: 'index.html' }));

  // 健康检查 / 简单 API 占位
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      version: getVersion(),
      dataDir: opts.dataDir,
      configDir: opts.configDir,
    });
  });

  const server = http.createServer(app);
  server.listen(opts.port, opts.host, () => {
    console.log(`OpenEvolant 已启动`);
    console.log(`  Web GUI: http://localhost:${opts.port}`);
    console.log(`  数据目录: ${path.resolve(opts.dataDir)}`);
    console.log(`  配置目录: ${path.resolve(opts.configDir)}`);
  });
}

function parseArgs(): { command: string; port: number; dataDir: string; configDir: string; host: string } {
  const args = process.argv.slice(2);
  let command = 'start';
  let port = DEFAULT_PORT;
  let dataDir = DEFAULT_DATA_DIR;
  let configDir = DEFAULT_CONFIG_DIR;
  let host = '0.0.0.0';

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
    else if (arg.startsWith('--data-dir=')) dataDir = arg.slice(10).trim() || DEFAULT_DATA_DIR;
    else if (arg.startsWith('--config-dir=')) configDir = arg.slice(12).trim() || DEFAULT_CONFIG_DIR;
    else if (arg.startsWith('--host=')) host = arg.slice(7).trim() || '0.0.0.0';
  }

  return { command, port, dataDir, configDir, host };
}

function main(): void {
  const { command, port, dataDir, configDir, host } = parseArgs();

  if (command === 'help') {
    printHelp();
    process.exit(0);
  }
  if (command === 'version') {
    console.log(getVersion());
    process.exit(0);
  }

  if (command === 'start') {
    startServer({ port, dataDir, configDir, host });
  } else {
    printHelp();
    process.exit(1);
  }
}

main();
