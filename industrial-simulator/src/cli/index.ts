#!/usr/bin/env node
import { loadConfig } from '../config/loader.js';
import { SimulatorRuntime } from '../runtime/simulator-runtime.js';

interface CliArgs {
  config?: string;
  validateConfig?: boolean;
  watch?: boolean;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.config) {
    throw new Error('Missing required --config <path>');
  }

  if (args.validateConfig) {
    await loadConfig(args.config);
    console.log(`configuration is valid: ${args.config}`);
    return;
  }

  const runtime = new SimulatorRuntime(args.config);
  await runtime.start({ watch: args.watch });

  const shutdown = async (): Promise<void> => {
    await runtime.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--config') {
      args.config = argv[++index];
    } else if (token === '--validate-config') {
      args.validateConfig = true;
    } else if (token === '--watch') {
      args.watch = true;
    } else if (token === '--help' || token === '-h') {
      console.log('Usage: industrial-simulator --config <file> [--validate-config] [--watch]');
      process.exit(0);
    }
  }
  return args;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
