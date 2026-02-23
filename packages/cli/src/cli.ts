#!/usr/bin/env node
/**
 * openevolant 命令行：一键启动 Web GUI、执行配置等
 * 用法: openevolant [start] [--port=3000] [--root=./openevolant]
 *       配置、数据、skill 等统一存放在 --root 目录下（默认 ./openevolant）
 *       openevolant --help | --version
 */

import path from 'path';
import { getScriptDir, getVersion } from './paths.js';
import { printHelp } from './help.js';
import { parseArgs } from './args.js';
import { startServer } from './server.js';

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
    const scriptDir = getScriptDir();

    try {
      startServer({
        port,
        rootDir,
        configDir,
        dataDir,
        host,
        apiOnly,
        scriptDir,
      });
    } catch (e) {
      console.error('错误:', e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  } else {
    printHelp();
    process.exit(1);
  }
}

main();
