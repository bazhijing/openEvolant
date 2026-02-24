import { spawn, type ChildProcess } from 'child_process';

export interface EvolutionStartOptions {
  /** .evolution 文件中的 id */
  id: string;
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

    const env = {
      ...process.env,
      OPENEVOLANT_ROOT_DIR: this.options.rootDir,
      OPENEVOLANT_DATA_DIR: this.options.dataDir,
      OPENEVOLANT_CONFIG_DIR: this.options.configDir,
      OPENEVOLANT_EVOLUTION_ID: opts.id,
    };

    const code = [
      "import('@openevolant/evolution-runner')",
      "  .then((mod) => {",
      "    if (typeof mod.runEvolutionLoop !== 'function') {",
      "      throw new Error('runEvolutionLoop is not a function on @openevolant/evolution-runner');",
      "    }",
      "    const evolutionId = process.env.OPENEVOLANT_EVOLUTION_ID;",
      "    return mod.runEvolutionLoop({ evolutionId });",
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

