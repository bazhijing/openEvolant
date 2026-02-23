import { getVersion } from './paths.js';
import { DEFAULT_PORT, DEFAULT_APP_ROOT } from './constants.js';

export function printHelp(): void {
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
