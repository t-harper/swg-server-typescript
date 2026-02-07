#!/usr/bin/env node

/**
 * Generate a packet-by-packet manifest from SWG C++ GameNetworkMessage classes.
 *
 * The script extracts:
 * - packet class names
 * - serialized field declarations (Archive::AutoVariable/AutoArray/etc)
 * - field serialization order from addVariable(...) calls in constructors
 * - a rough TypeScript type mapping per field
 * - parity status against TypeScript message interfaces in this repo
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

const DEFAULT_DOCKER_SRC = path.resolve(REPO_ROOT, '../swg-source-docker/swg-main/src');
const dockerSrcRoot = path.resolve(process.argv[2] ?? DEFAULT_DOCKER_SRC);

const CPP_MESSAGE_ROOTS = [
  'engine/shared/library/sharedNetworkMessages/src/shared',
  'game/shared/library/swgSharedNetworkMessages/src/shared',
  'engine/server/library/serverNetworkMessages/src/shared',
  'game/server/library/swgServerNetworkMessages/src/shared',
];

const TS_MESSAGES_ROOT = path.resolve(REPO_ROOT, 'packages/protocol/src/swg/messages');
const OUTPUT_DIR = path.resolve(REPO_ROOT, 'packages/protocol/src/swg/messages/generated');
const OUTPUT_MANIFEST_FILE = path.join(OUTPUT_DIR, 'cpp-packet-manifest.ts');

const SUPPORTED_ARCHIVE_CONTAINERS = new Set([
  'AutoVariable',
  'AutoArray',
  'AutoList',
  'AutoSet',
  'AutoMap',
  'AutoDeltaVariable',
  'AutoDeltaVector',
  'AutoDeltaSet',
  'AutoDeltaMap',
  'AutoDeltaPackedMap',
  'AutoDeltaByteStream',
  'AutoByteStream',
  'AutoDeltaQueue',
]);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(rootDir, extensions, out = []) {
  if (!(await exists(rootDir))) {
    return out;
  }

  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(entryPath, extensions, out);
      continue;
    }
    if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(entryPath);
    }
  }

  return out;
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

function findMatchingBrace(text, openingBraceIndex) {
  let depth = 0;
  for (let i = openingBraceIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function extractClassBlocks(headerContent) {
  const blocks = [];
  const classRegex = /class\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*public\s+GameNetworkMessage\b/g;

  let match = classRegex.exec(headerContent);
  while (match) {
    const className = match[1];
    const classDeclIndex = match.index;
    const openBraceIndex = headerContent.indexOf('{', classDeclIndex);

    if (openBraceIndex >= 0) {
      const closeBraceIndex = findMatchingBrace(headerContent, openBraceIndex);
      if (closeBraceIndex > openBraceIndex) {
        const block = headerContent.slice(openBraceIndex + 1, closeBraceIndex);
        blocks.push({ className, block });
      }
    }

    match = classRegex.exec(headerContent);
  }

  return blocks;
}

function normalizeCppType(rawType) {
  return rawType
    .replace(/\bconst\b/g, '')
    .replace(/\s*&/g, '')
    .replace(/\s*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTopLevelTemplateArgs(typeString) {
  const args = [];
  let current = '';
  let depth = 0;
  for (const ch of typeString) {
    if (ch === '<') {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === '>') {
      depth -= 1;
      current += ch;
      continue;
    }
    if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) {
    args.push(current.trim());
  }
  return args;
}

function mapCppTypeToTs(cppTypeRaw) {
  const cppType = normalizeCppType(cppTypeRaw);
  const lower = cppType.toLowerCase();

  if (
    /^(bool)$/.test(lower)
  ) {
    return 'boolean';
  }

  if (
    /^(int|short|long|float|double|char|byte|uint8|uint16|uint32|int8|int16|int32|unsigned char|unsigned short|unsigned int|unsigned long)$/.test(
      lower
    )
  ) {
    return 'number';
  }

  if (
    /^(uint64|int64|unsigned long long|long long|networkid)$/.test(lower) ||
    cppType.includes('NetworkId')
  ) {
    return 'bigint';
  }

  if (
    cppType === 'std::string' ||
    cppType === 'Unicode::String' ||
    cppType.endsWith('::String')
  ) {
    return 'string';
  }

  if (cppType.startsWith('std::vector<')) {
    const inner = cppType.slice('std::vector<'.length, -1);
    return `${mapCppTypeToTs(inner)}[]`;
  }

  if (cppType.startsWith('std::list<')) {
    const inner = cppType.slice('std::list<'.length, -1);
    return `${mapCppTypeToTs(inner)}[]`;
  }

  if (cppType.startsWith('std::set<')) {
    const inner = cppType.slice('std::set<'.length, -1);
    return `${mapCppTypeToTs(inner)}[]`;
  }

  if (cppType.startsWith('std::pair<')) {
    const inner = cppType.slice('std::pair<'.length, -1);
    const args = splitTopLevelTemplateArgs(inner);
    if (args.length === 2) {
      return `[${mapCppTypeToTs(args[0])}, ${mapCppTypeToTs(args[1])}]`;
    }
    return '[unknown, unknown]';
  }

  if (cppType.startsWith('std::map<') || cppType.startsWith('std::unordered_map<')) {
    return 'Record<string, unknown>';
  }

  if (cppType === 'PackedRgb') {
    return 'number';
  }

  return 'unknown';
}

function parseArchiveFieldsFromClassBlock(block) {
  const fields = [];
  const clean = stripComments(block);
  const statements = clean
    .split(';')
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  for (const statement of statements) {
    if (!statement.includes('Archive::')) {
      continue;
    }
    if (statement.includes('(')) {
      continue;
    }

    const fullMatch =
      statement.match(/^Archive::([A-Za-z0-9_]+)\s*<(.+)>\s*([A-Za-z_][A-Za-z0-9_]*)$/) ??
      statement.match(/^([A-Za-z0-9_:<>\s]+)\s+([A-Za-z_][A-Za-z0-9_]*)$/);

    if (!fullMatch) {
      continue;
    }

    if (fullMatch.length === 4 && fullMatch[1].startsWith('Auto')) {
      const archiveContainer = fullMatch[1];
      const cppType = normalizeCppType(fullMatch[2]);
      const name = fullMatch[3];
      const tsType = mapCppTypeToTs(cppType);
      fields.push({
        name,
        archiveContainer,
        cppType,
        tsType,
      });
      continue;
    }

    const fallbackDecl = fullMatch[1];
    const fallbackName = fullMatch[2];
    const archiveMatch = fallbackDecl.match(/Archive::([A-Za-z0-9_]+)\s*<(.+)>/);
    if (!archiveMatch) {
      continue;
    }

    const archiveContainer = archiveMatch[1];
    const cppType = normalizeCppType(archiveMatch[2]);
    const tsType = mapCppTypeToTs(cppType);
    fields.push({
      name: fallbackName,
      archiveContainer,
      cppType,
      tsType,
    });
  }

  return fields.filter((field) => SUPPORTED_ARCHIVE_CONTAINERS.has(field.archiveContainer));
}

function extractConstructorAddVariableOrders(cppContent) {
  const ordersByClass = new Map();
  const lines = cppContent.split(/\r?\n/);

  let activeClass = null;
  let activeVars = [];
  let braceDepth = 0;
  let openedBody = false;

  const flush = () => {
    if (!activeClass) {
      return;
    }
    const trimmed = activeVars.filter(Boolean);
    if (trimmed.length > 0) {
      const existing = ordersByClass.get(activeClass) ?? [];
      existing.push(trimmed);
      ordersByClass.set(activeClass, existing);
    }
    activeClass = null;
    activeVars = [];
    braceDepth = 0;
    openedBody = false;
  };

  for (const line of lines) {
    if (!activeClass) {
      const ctorMatch = line.match(/\b([A-Za-z_][A-Za-z0-9_]*)::\1\s*\(/);
      if (ctorMatch) {
        activeClass = ctorMatch[1];
      }
    }

    if (!activeClass) {
      continue;
    }

    for (const addVarMatch of line.matchAll(/addVariable\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
      activeVars.push(addVarMatch[1]);
    }

    let openCount = 0;
    let closeCount = 0;
    for (const ch of line) {
      if (ch === '{') {
        openCount += 1;
      } else if (ch === '}') {
        closeCount += 1;
      }
    }

    if (openCount > 0) {
      openedBody = true;
    }

    braceDepth += openCount - closeCount;

    if (openedBody && braceDepth <= 0) {
      flush();
    }
  }

  flush();
  return ordersByClass;
}

function dedupeOrder(order) {
  const seen = new Set();
  const deduped = [];
  for (const name of order) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    deduped.push(name);
  }
  return deduped;
}

function chooseBestOrder(orders) {
  if (!orders || orders.length === 0) {
    return [];
  }
  let best = [];
  let bestScore = -1;
  for (const order of orders) {
    const deduped = dedupeOrder(order);
    if (deduped.length > bestScore) {
      bestScore = deduped.length;
      best = deduped;
    }
  }
  return best;
}

function computeSwgCrc32(value) {
  let crc = 0xffffffff;
  for (let i = 0; i < value.length; i += 1) {
    crc ^= value.charCodeAt(i) << 24;
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x80000000) {
        crc = ((crc << 1) ^ 0x04c11db7) >>> 0;
      } else {
        crc = (crc << 1) >>> 0;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function readTsInterfaceNames() {
  const tsFiles = await walkFiles(TS_MESSAGES_ROOT, ['.ts']);
  const names = new Set();

  for (const file of tsFiles) {
    if (file.includes(`${path.sep}generated${path.sep}`)) {
      continue;
    }
    const text = await fs.readFile(file, 'utf8');
    for (const match of text.matchAll(/export\s+interface\s+([A-Za-z_][A-Za-z0-9_]*)\b/g)) {
      names.add(match[1]);
    }
  }

  return names;
}

function toRepoRelative(absolutePath) {
  return path.relative(REPO_ROOT, absolutePath).replace(/\\/g, '/');
}

async function main() {
  for (const rel of CPP_MESSAGE_ROOTS) {
    const abs = path.resolve(dockerSrcRoot, rel);
    if (!(await exists(abs))) {
      throw new Error(`Missing expected C++ source directory: ${abs}`);
    }
  }

  const headerFiles = [];
  const cppFiles = [];
  for (const rel of CPP_MESSAGE_ROOTS) {
    const abs = path.resolve(dockerSrcRoot, rel);
    await walkFiles(abs, ['.h'], headerFiles);
    await walkFiles(abs, ['.cpp'], cppFiles);
  }

  const classMetadata = new Map();
  for (const headerFile of headerFiles) {
    const text = await fs.readFile(headerFile, 'utf8');
    const classBlocks = extractClassBlocks(text);
    for (const { className, block } of classBlocks) {
      if (!classMetadata.has(className)) {
        classMetadata.set(className, {
          name: className,
          headers: [],
          fields: [],
        });
      }
      const entry = classMetadata.get(className);
      entry.headers.push(path.relative(dockerSrcRoot, headerFile).replace(/\\/g, '/'));
      if (entry.fields.length === 0) {
        entry.fields = parseArchiveFieldsFromClassBlock(block);
      }
    }
  }

  const constructorOrdersByClass = new Map();
  for (const cppFile of cppFiles) {
    const text = await fs.readFile(cppFile, 'utf8');
    const ordersInFile = extractConstructorAddVariableOrders(text);

    for (const [className, orders] of ordersInFile.entries()) {
      if (!constructorOrdersByClass.has(className)) {
        constructorOrdersByClass.set(className, []);
      }
      const acc = constructorOrdersByClass.get(className);
      for (const order of orders) {
        acc.push(order);
      }
    }
  }

  const tsInterfaces = await readTsInterfaceNames();

  const definitions = [];
  const classNames = [...classMetadata.keys()].sort((a, b) => a.localeCompare(b));
  for (const className of classNames) {
    const metadata = classMetadata.get(className);
    const order = chooseBestOrder(constructorOrdersByClass.get(className) ?? []);
    const fieldByName = new Map(metadata.fields.map((field) => [field.name, field]));
    const orderedFields = [];
    const used = new Set();

    for (const name of order) {
      const field = fieldByName.get(name);
      if (field) {
        orderedFields.push({ ...field, source: 'addVariable' });
        used.add(name);
      } else {
        orderedFields.push({
          name,
          archiveContainer: 'Unknown',
          cppType: 'unknown',
          tsType: 'unknown',
          source: 'addVariable',
        });
        used.add(name);
      }
    }

    for (const field of metadata.fields) {
      if (used.has(field.name)) {
        continue;
      }
      orderedFields.push({ ...field, source: 'declarationOnly' });
    }

    const crc = computeSwgCrc32(className);

    definitions.push({
      name: className,
      swgCrc32: `0x${crc.toString(16).padStart(8, '0')}`,
      headers: metadata.headers,
      implementedInTypescript: tsInterfaces.has(className),
      fieldCount: orderedFields.length,
      fields: orderedFields,
    });
  }

  const totalPackets = definitions.length;
  const implementedPackets = definitions.filter((entry) => entry.implementedInTypescript).length;
  const missingPackets = totalPackets - implementedPackets;
  const coverage = totalPackets === 0 ? 0 : Number(((implementedPackets / totalPackets) * 100).toFixed(2));

  const banner = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 *
 * Generated by:
 * \`${toRepoRelative(path.join(SCRIPT_DIR, 'generate-cpp-packet-manifest.mjs'))}\`
 *
 * Source roots:
 * ${CPP_MESSAGE_ROOTS.map((rel) => `- ${path.join(path.relative(REPO_ROOT, dockerSrcRoot), rel).replace(/\\/g, '/')}`).join('\n * ')}
 */
`;

  const manifestFileContents = `${banner}
export interface CppPacketFieldDefinition {
  name: string;
  archiveContainer: string;
  cppType: string;
  tsType: string;
  source: 'addVariable' | 'declarationOnly';
}

export interface CppPacketDefinition {
  name: string;
  swgCrc32: string;
  headers: string[];
  implementedInTypescript: boolean;
  fieldCount: number;
  fields: CppPacketFieldDefinition[];
}

export const CPP_PACKET_DEFINITIONS: CppPacketDefinition[] = ${JSON.stringify(definitions, null, 2)};

export const CPP_PACKET_DEFINITIONS_BY_NAME = new Map<string, CppPacketDefinition>(
  CPP_PACKET_DEFINITIONS.map((definition) => [definition.name, definition])
);

export const CPP_PACKET_PARITY_SUMMARY = {
  totalPackets: ${totalPackets},
  implementedPackets: ${implementedPackets},
  missingPackets: ${missingPackets},
  coveragePercent: ${coverage},
} as const;
`;

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_MANIFEST_FILE, manifestFileContents, 'utf8');

  const relDocker = path.relative(REPO_ROOT, dockerSrcRoot).replace(/\\/g, '/');
  console.log(`Generated ${toRepoRelative(OUTPUT_MANIFEST_FILE)} from ${relDocker}`);
  console.log(`Packets: ${totalPackets} total, ${implementedPackets} implemented, ${missingPackets} missing (${coverage}%)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
