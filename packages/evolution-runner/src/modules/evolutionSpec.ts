import fs from 'fs';
import path from 'path';

/**
 * 根据 evolutionId 查找 .evolution 文件路径。
 * 查找顺序：OPENEVOLANT_DATA_DIR/evolutions、OPENEVOLANT_ROOT_DIR/evolutions。
 */
export function findEvolutionFile(evolutionId?: string): string | null {
  if (!evolutionId) return null;

  const dataDir = process.env.OPENEVOLANT_DATA_DIR;
  const rootDir = process.env.OPENEVOLANT_ROOT_DIR;

  const candidates: string[] = [];
  if (dataDir) {
    candidates.push(path.join(dataDir, 'evolutions', `${evolutionId}.evolution`));
  }
  if (rootDir) {
    candidates.push(path.join(rootDir, 'evolutions', `${evolutionId}.evolution`));
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  return candidates[0] ?? null;
}

/**
 * 读取 .evolution 文件内容，解析为 JSON 对象。
 * 文件不存在或解析失败时返回空对象。
 */
export function readEvolutionSpec(filePath: string | null): Record<string, unknown> {
  if (!filePath) return {};
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return {};
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (e) {
    console.error('[evolution-runner] 读取 .evolution 失败，将使用空配置继续', e);
    return {};
  }
}

/**
 * 将进度/配置写回 .evolution 文件。
 */
export function writeEvolutionSpec(
  filePath: string | null,
  spec: Record<string, unknown>,
): void {
  if (!filePath) return;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(spec, null, 2), 'utf-8');
  } catch (e) {
    console.error('[evolution-runner] 写入 .evolution 失败（不会中断进程）', e);
  }
}
