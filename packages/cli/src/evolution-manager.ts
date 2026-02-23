import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface EvolutionStartOptions {
  id: string;
  speciesName: string;
  genePool: string;
  evaluator: string;
  policy: string;
  budgetUsd?: number;
  timeLimitMs?: number;
  iterationCount?: number;
  taskContent?: string;
}

export interface EvolutionManagerInitOptions {
  rootDir: string;
  dataDir: string;
  configDir: string;
}

class EvolutionManager {
  private readonly processes = new Map<string, ChildProcess>();

  constructor(private readonly options: EvolutionManagerInitOptions) {}

  startEvolution(opts: EvolutionStartOptions): void {
    if (!opts.id) return;
    if (this.processes.has(opts.id)) {
      return;
    }

    const genesPath = this.resolveGenesPath(opts.genePool);
    const nsPath = this.resolveNsPath(opts.policy);

    const runnerConfig = {
      genesPath,
      nsPath,
      taskUserMessage: `Evolution task for ${opts.speciesName || opts.id}`,
    };

    const env = {
      ...process.env,
      OPENEVOLANT_ROOT_DIR: this.options.rootDir,
      OPENEVOLANT_DATA_DIR: this.options.dataDir,
      OPENEVOLANT_CONFIG_DIR: this.options.configDir,
      OPENEVOLANT_EVOLUTION_ID: opts.id,
      OPENEVOLANT_EVOLUTION_CONFIG: JSON.stringify(runnerConfig),
    };

    const code = [
      "const raw = process.env.OPENEVOLANT_EVOLUTION_CONFIG;",
      "if (!raw) {",
      "  console.error('Missing OPENEVOLANT_EVOLUTION_CONFIG');",
      "  process.exit(1);",
      "}",
      "let config;",
      "try {",
      "  config = JSON.parse(raw);",
      "} catch (e) {",
      "  console.error('Invalid OPENEVOLANT_EVOLUTION_CONFIG JSON', e);",
      "  process.exit(1);",
      "}",
      "import('@openevolant/evolution-runner')",
      "  .then((mod) => {",
      "    if (typeof mod.runEvolutionLoop !== 'function') {",
      "      throw new Error('runEvolutionLoop is not a function on @openevolant/evolution-runner');",
      "    }",
      "    return mod.runEvolutionLoop(config);",
      "  })",
      "  .catch((err) => {",
      "    console.error('Evolution runner failed:', err);",
      "    process.exitCode = 1;",
      "  });",
    ].join('\n');

    const child = spawn(process.execPath, ['-e', code], {
      env,
      stdio: 'inherit',
    });

    this.processes.set(opts.id, child);

    child.on('exit', () => {
      this.processes.delete(opts.id);
    });
  }

  stopEvolution(id: string): void {
    const child = this.processes.get(id);
    if (!child) return;
    child.kill();
    this.processes.delete(id);
    console.log(`Terminated evolution task: ${id}`);
  }

  private resolveGenesPath(genePool: string): string {
    const filename = genePool.endsWith('.genes') ? genePool : `${genePool}.genes`;
    const candidates = [
      path.join(this.options.dataDir, 'genes', filename),
      path.join(this.options.rootDir, 'genes', filename),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return path.isAbsolute(genePool)
      ? genePool
      : path.join(this.options.dataDir, 'genes', filename);
  }

  private resolveNsPath(policy: string): string {
    const filename = policy.endsWith('.ns') ? policy : `${policy}.ns`;
    const candidates = [path.join(this.options.configDir, 'ns', filename)];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return path.join(this.options.configDir, 'ns', filename);
  }
}

let globalManager: EvolutionManager | null = null;

export function initEvolutionManager(options: EvolutionManagerInitOptions): EvolutionManager {
  if (!globalManager) {
    globalManager = new EvolutionManager(options);
  }
  return globalManager;
}

export function getEvolutionManager(): EvolutionManager {
  if (!globalManager) {
    throw new Error('EvolutionManager has not been initialized. Call initEvolutionManager() first.');
  }
  return globalManager;
}

