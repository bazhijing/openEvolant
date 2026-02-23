import { DEFAULT_PORT, DEFAULT_APP_ROOT } from './constants.js';

export interface ParsedArgs {
  command: string;
  port: number;
  root: string;
  host: string;
  apiOnly: boolean;
}

export function parseArgs(): ParsedArgs {
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
