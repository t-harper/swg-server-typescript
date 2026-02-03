/**
 * IFF CLI - Command line tools for SWG IFF file processing
 */

import { parseArgs } from 'node:util';
import { resolve, dirname, basename, extname, relative } from 'node:path';
import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';
import { IffParser, IffParseError } from './iff-parser.js';
import { TemplateExtractor, TemplateExtractError } from './template-extractor.js';
import {
  generateCrcTable,
  crcTableToJson,
  crcTableToTypeScript,
  calculateCrc32,
  type CrcTable,
} from './crc-table.js';

/**
 * Available IFF CLI commands
 */
type IffCommand =
  | 'extract-templates'
  | 'extract-single'
  | 'generate-crc-table'
  | 'inspect'
  | 'help';

/**
 * Parse command line arguments for IFF CLI
 */
function parseIffArgs(): {
  command: IffCommand;
  args: string[];
  options: {
    output?: string;
    recursive: boolean;
    format: 'json' | 'typescript';
    verbose: boolean;
  };
} {
  const args = process.argv.slice(2);

  // Find command
  let command: IffCommand = 'help';
  let commandIndex = -1;

  const validCommands: IffCommand[] = [
    'extract-templates',
    'extract-single',
    'generate-crc-table',
    'inspect',
    'help',
  ];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg && validCommands.includes(arg as IffCommand)) {
      command = arg as IffCommand;
      commandIndex = i;
      break;
    }
  }

  // Parse remaining args as positional
  const positionalArgs: string[] = [];
  let output: string | undefined;
  let recursive = true;
  let format: 'json' | 'typescript' = 'json';
  let verbose = false;

  for (let i = commandIndex + 1; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === '-o' || arg === '--output') {
      output = args[++i];
    } else if (arg === '-r' || arg === '--recursive') {
      recursive = true;
    } else if (arg === '--no-recursive') {
      recursive = false;
    } else if (arg === '-f' || arg === '--format') {
      const fmt = args[++i];
      if (fmt === 'json' || fmt === 'typescript' || fmt === 'ts') {
        format = fmt === 'ts' ? 'typescript' : fmt;
      }
    } else if (arg === '-v' || arg === '--verbose') {
      verbose = true;
    } else if (!arg.startsWith('-')) {
      positionalArgs.push(arg);
    }
  }

  return {
    command,
    args: positionalArgs,
    options: { output, recursive, format, verbose },
  };
}

/**
 * Print CLI help
 */
function printHelp(): void {
  console.log(`
SWG IFF Tools
=============

Commands:
  extract-templates <input-dir> <output-dir>  Batch extract templates from IFF files
    -r, --recursive      Process subdirectories (default: true)
    --no-recursive       Only process top-level directory
    -v, --verbose        Show detailed progress

  extract-single <iff-file> [-o output-file]  Extract a single template
    -o, --output <file>  Output file path (default: stdout)

  generate-crc-table <template-dir> <output-file>  Generate CRC lookup table
    -f, --format <fmt>   Output format: json, typescript (default: json)
    -r, --recursive      Process subdirectories (default: true)

  inspect <iff-file>                          Inspect IFF structure
    -v, --verbose        Show raw chunk data

  help                                         Show this help message

Examples:
  swg-iff extract-templates ./templates ./output
  swg-iff extract-single ./creature.iff -o creature.json
  swg-iff generate-crc-table ./templates ./crc-table.json
  swg-iff generate-crc-table ./templates ./crc-table.ts -f typescript
  swg-iff inspect ./weapon.iff -v
`);
}

/**
 * Extract templates from a directory
 */
async function extractTemplates(
  inputDir: string,
  outputDir: string,
  options: { recursive: boolean; verbose: boolean }
): Promise<void> {
  const inputPath = resolve(inputDir);
  const outputPath = resolve(outputDir);

  console.log(`Extracting templates from: ${inputPath}`);
  console.log(`Output directory: ${outputPath}`);
  console.log(`Recursive: ${options.recursive}`);
  console.log('');

  const extractor = new TemplateExtractor();

  const result = await extractor.extractDirectory(inputPath, outputPath, {
    recursive: options.recursive,
    filePattern: /\.iff$/i,
  });

  console.log('Extraction complete:');
  console.log(`  Files processed: ${result.processed}`);
  console.log(`  Successful: ${result.successful}`);
  console.log(`  Failed: ${result.failed}`);

  if (result.errors.length > 0 && options.verbose) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      console.log(`  ${error.file}: ${error.error}`);
    }
  } else if (result.errors.length > 0) {
    console.log(`\nUse -v to see ${result.errors.length} error details`);
  }

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

/**
 * Extract a single template file
 */
async function extractSingle(
  inputFile: string,
  outputFile: string | undefined,
  options: { verbose: boolean }
): Promise<void> {
  const inputPath = resolve(inputFile);

  if (options.verbose) {
    console.log(`Reading: ${inputPath}`);
  }

  const data = await readFile(inputPath);
  const extractor = new TemplateExtractor();

  const templatePath = basename(inputPath);
  const template = extractor.extract(new Uint8Array(data), templatePath);

  const json = JSON.stringify(template, null, 2);

  if (outputFile) {
    const outputPath = resolve(outputFile);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, json);
    console.log(`Written: ${outputPath}`);
  } else {
    console.log(json);
  }
}

/**
 * Generate CRC lookup table
 */
async function generateCrcTableCommand(
  templateDir: string,
  outputFile: string,
  options: { recursive: boolean; format: 'json' | 'typescript' }
): Promise<void> {
  const inputPath = resolve(templateDir);
  const outputPath = resolve(outputFile);

  console.log(`Scanning: ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Format: ${options.format}`);
  console.log('');

  const table = await generateCrcTable(inputPath, {
    recursive: options.recursive,
    lowercase: true,
    extensions: ['.iff'],
  });

  console.log(`Found ${table.count} templates`);

  let output: string;
  if (options.format === 'typescript') {
    output = crcTableToTypeScript(table, 'TEMPLATE');
  } else {
    output = crcTableToJson(table, true);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output);

  console.log(`Written: ${outputPath}`);
}

/**
 * Inspect IFF file structure
 */
async function inspectIff(
  inputFile: string,
  options: { verbose: boolean }
): Promise<void> {
  const inputPath = resolve(inputFile);

  console.log(`Inspecting: ${inputPath}`);
  console.log('');

  const data = await readFile(inputPath);
  const parser = new IffParser();

  try {
    const root = parser.parse(new Uint8Array(data));

    console.log('Structure:');
    console.log(IffParser.printStructure(root));

    if (options.verbose) {
      console.log('\nForm path:', IffParser.getFormPath(root).join(' > '));

      // Show data chunks
      const dataChunks = IffParser.findAllChunksDeep(root, '').filter(
        (c) => c.data instanceof Uint8Array && c.data.length > 0
      );

      if (dataChunks.length > 0) {
        console.log('\nData chunks:');
        for (const chunk of dataChunks) {
          if (chunk.data instanceof Uint8Array) {
            const preview = Array.from(chunk.data.slice(0, 32))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(' ');
            console.log(`  ${chunk.type}: ${chunk.size} bytes`);
            console.log(`    ${preview}${chunk.data.length > 32 ? '...' : ''}`);

            // Try to decode as string if printable
            const text = new TextDecoder('utf-8', { fatal: false }).decode(
              chunk.data.slice(0, 64)
            );
            const printable = text.replace(/[\x00-\x1f\x7f-\xff]/g, '.');
            if (printable.length > 0 && printable !== '.'.repeat(printable.length)) {
              console.log(`    Text: "${printable}${chunk.data.length > 64 ? '...' : ''}"`);
            }
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof IffParseError) {
      console.error(`Parse error: ${error.message}`);
    } else {
      throw error;
    }
    process.exitCode = 1;
  }
}

/**
 * Calculate and display CRC for a string
 */
function showCrc(path: string): void {
  const normalizedPath = path.toLowerCase().replace(/\\/g, '/');
  const crc = calculateCrc32(normalizedPath);

  console.log(`Path: ${path}`);
  console.log(`Normalized: ${normalizedPath}`);
  console.log(`CRC32: 0x${crc.toString(16).padStart(8, '0')} (${crc})`);
}

/**
 * Main entry point for IFF CLI
 */
export async function runIffCli(): Promise<void> {
  const { command, args, options } = parseIffArgs();

  try {
    switch (command) {
      case 'extract-templates': {
        const [inputDir, outputDir] = args;
        if (!inputDir || !outputDir) {
          console.error('Usage: extract-templates <input-dir> <output-dir>');
          process.exitCode = 1;
          return;
        }
        await extractTemplates(inputDir, outputDir, {
          recursive: options.recursive,
          verbose: options.verbose,
        });
        break;
      }

      case 'extract-single': {
        const [inputFile] = args;
        if (!inputFile) {
          console.error('Usage: extract-single <iff-file> [-o output-file]');
          process.exitCode = 1;
          return;
        }
        await extractSingle(inputFile, options.output, {
          verbose: options.verbose,
        });
        break;
      }

      case 'generate-crc-table': {
        const [templateDir, outputFile] = args;
        if (!templateDir || !outputFile) {
          console.error('Usage: generate-crc-table <template-dir> <output-file>');
          process.exitCode = 1;
          return;
        }
        await generateCrcTableCommand(templateDir, outputFile, {
          recursive: options.recursive,
          format: options.format,
        });
        break;
      }

      case 'inspect': {
        const [inputFile] = args;
        if (!inputFile) {
          console.error('Usage: inspect <iff-file>');
          process.exitCode = 1;
          return;
        }
        await inspectIff(inputFile, { verbose: options.verbose });
        break;
      }

      case 'help':
      default:
        printHelp();
        break;
    }
  } catch (error) {
    if (error instanceof IffParseError || error instanceof TemplateExtractError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }
    process.exitCode = 1;
  }
}

// Run if executed directly
const isMainModule = process.argv[1]?.endsWith('iff/cli.js') ||
  process.argv[1]?.endsWith('iff/cli.ts') ||
  process.argv[1]?.includes('iff-cli');

if (isMainModule) {
  void runIffCli();
}
