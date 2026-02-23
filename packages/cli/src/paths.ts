import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

/** 通过 symlink 运行时解析真实脚本所在目录 */
export function getScriptDir(): string {
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

/** 解析 Web 前端构建产物目录（studio/dist） */
export function resolveWebRoot(): string {
  const envRoot = process.env.OPENEVOLANT_ROOT;
  if (envRoot) {
    const p = path.join(path.resolve(envRoot), 'studio', 'dist');
    if (fs.existsSync(p)) return p;
  }
  const scriptDir = getScriptDir();
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'studio', 'dist'),
    path.join(scriptDir, '..', '..', 'studio', 'dist'),
    path.join(scriptDir, '..', 'studio', 'dist'),
  ];
  let dir = scriptDir;
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

/** 从 package.json 读取版本号 */
export function getVersion(): string {
  const scriptDir = getScriptDir();
  const candidates = [
    path.join(scriptDir, '..', '..', 'package.json'),
    path.join(scriptDir, '..', 'package.json'),
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
