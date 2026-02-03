/**
 * @swg/data-importer CLI
 * Convert SWG TAB files to JSON and extract IFF templates
 */

import { TabConverter } from './tab-converter.js';
import { runIffCli } from './iff/cli.js';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

/**
 * Available CLI commands
 */
type Command = 'tab' | 'iff' | 'help';

/**
 * Print main help
 */
function printHelp(): void {
  console.log(`
SWG Data Importer
=================

Convert SWG game data files to JSON format.

Usage:
  swg-import <command> [options]

Commands:
  tab                    Convert TAB files to JSON (default)
    -i, --input <dir>    Input directory (default: ./input)
    -o, --output <dir>   Output directory (default: ./output)
    -r, --recursive      Process subdirectories (default: true)

  iff <subcommand>       IFF file operations
    extract-templates    Batch extract templates
    extract-single       Extract single template
    generate-crc-table   Generate CRC lookup table
    inspect              Inspect IFF structure

  help                   Show this help message

Examples:
  swg-import tab -i ./datatables -o ./json
  swg-import iff extract-templates ./templates ./output
  swg-import iff inspect ./creature.iff -v

For IFF subcommand help:
  swg-import iff help
`);
}

/**
 * Parse command and route to appropriate handler
 */
function parseCommand(): { command: Command; args: string[] } {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return { command: 'tab', args: [] };
  }

  const firstArg = args[0]?.toLowerCase();

  if (firstArg === 'iff') {
    return { command: 'iff', args: args.slice(1) };
  }

  if (firstArg === 'tab') {
    return { command: 'tab', args: args.slice(1) };
  }

  if (firstArg === 'help' || firstArg === '--help' || firstArg === '-h') {
    return { command: 'help', args: [] };
  }

  // Default to TAB command with all args
  return { command: 'tab', args };
}

/**
 * Parse TAB command arguments
 */
function parseTabArgs(args: string[]): {
  input: string;
  output: string;
  recursive: boolean;
} {
  let input = './input';
  let output = './output';
  let recursive = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === '-i' || arg === '--input') {
      input = args[++i] ?? input;
    } else if (arg === '-o' || arg === '--output') {
      output = args[++i] ?? output;
    } else if (arg === '-r' || arg === '--recursive') {
      recursive = true;
    } else if (arg === '--no-recursive') {
      recursive = false;
    }
  }

  return { input, output, recursive };
}

/**
 * Run TAB conversion
 */
async function runTabConvert(args: string[]): Promise<void> {
  console.log('SWG Data Importer - TAB Converter');
  console.log('==================================\n');

  const { input, output, recursive } = parseTabArgs(args);
  const inputPath = resolve(input);
  const outputPath = resolve(output);

  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Recursive: ${recursive}\n`);

  await mkdir(outputPath, { recursive: true });

  const converter = new TabConverter();
  const result = await converter.convertDirectory(inputPath, outputPath, recursive);

  console.log('\nConversion complete:');
  console.log(`  Files processed: ${result.filesProcessed}`);
  console.log(`  Files converted: ${result.filesConverted}`);
  console.log(`  Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const { command, args } = parseCommand();

  switch (command) {
    case 'tab':
      await runTabConvert(args);
      break;

    case 'iff':
      // Rebuild argv for IFF CLI
      process.argv = [process.argv[0] ?? '', process.argv[1] ?? '', ...args];
      await runIffCli();
      break;

    case 'help':
    default:
      printHelp();
      break;
  }
}

void main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
