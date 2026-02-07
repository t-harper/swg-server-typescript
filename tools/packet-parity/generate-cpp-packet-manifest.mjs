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
  'engine/server/library/serverUtility/src/shared',
  'game/server/library/swgServerNetworkMessages/src/shared',
];

const TS_MESSAGES_ROOT = path.resolve(REPO_ROOT, 'packages/protocol/src/swg/messages');
const OUTPUT_DIR = path.resolve(REPO_ROOT, 'packages/protocol/src/swg/messages/generated');
const OUTPUT_MANIFEST_FILE = path.join(OUTPUT_DIR, 'cpp-packet-manifest.ts');

const SUPPORTED_ARCHIVE_CONTAINERS = new Set([
  'AutoVariable',
  'AutoVariableKeyShare',
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

function mapCppTypeToTsBase(cppTypeRaw) {
  const cppType = normalizeCppType(cppTypeRaw);
  const lower = cppType.toLowerCase();

  if (cppType === 'Vector') {
    return '{ x: number; y: number; z: number }';
  }

  if (cppType === 'Quaternion') {
    return '{ x: number; y: number; z: number; w: number }';
  }

  if (cppType === 'Transform') {
    return '{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }';
  }

  if (cppType === 'StringId') {
    return '{ table: string; textIndex: number; text: string }';
  }

  if (cppType === 'ChatAvatarId') {
    return 'ChatAvatarId';
  }

  if (cppType === 'ChatRoomData') {
    return 'ChatRoomData';
  }

  if (cppType === 'SuiPageData') {
    return 'SuiPageData';
  }

  if (cppType === 'ValueDictionary') {
    return 'Map<string, { type: "bool" | "float" | "object id" | "signed int" | "string"; value: boolean | number | bigint | string }>';
  }

  if (cppType === 'ProsePackage') {
    return '{ stringId: { table: string; textIndex: number; text: string }; actor: { id: bigint; stringId: { table: string; textIndex: number; text: string }; str: string }; target: { id: bigint; stringId: { table: string; textIndex: number; text: string }; str: string }; other: { id: bigint; stringId: { table: string; textIndex: number; text: string }; str: string }; digitInteger: number; digitFloat: number; complexGrammar: boolean }';
  }

  if (cppType === 'GroupMemberParam') {
    return '{ m_memberId: bigint; m_memberName: string; m_memberDifficulty: number; m_memberProfession: number; m_memberIsPC: boolean; m_memberShipId: bigint; m_memberShipIsPOB: boolean; m_memberOwnsPOB: boolean }';
  }

  if (cppType === 'NebulaLightningData') {
    return '{ lightningId: number; nebulaId: number; syncStampStart: number; syncStampEnd: number; endpoint0: { x: number; y: number; z: number }; endpoint1: { x: number; y: number; z: number } }';
  }

  if (cppType === 'ServerInfo') {
    return '{ ipAddress: string; serverId: number; systemPid: number; sceneId: string }';
  }

  if (cppType === 'Auction::ItemDataDetails') {
    return '{ itemId: bigint; userDescription: string; propertyList: [string, string][]; templateName: string; appearanceString: string }';
  }

  if (cppType === 'ADV') {
    return '{ type: number; auctionId: bigint; itemId: bigint; itemNameLength: number; itemName: string; minBid: number; highBid: number; timer: number; buyNowPrice: number; location: string; ownerId: bigint; highBidderId: bigint; maxProxyBid: number; myBid: number; itemType: number; resourceContainerClassCrc: number; flags: number; entranceCharge: number }[]';
  }

  if (cppType === 'PopulationList') {
    return '{ scene: string; x: number; z: number; population: number }[]';
  }

  if (cppType === 'AvatarList') {
    return '{ m_name: string; m_objectTemplateId: number; m_networkId: bigint; m_clusterId: number; m_characterType: number }[]';
  }

  if (cppType === 'ValueType') {
    return 'Uint8Array';
  }

  if (cppType === 'PackedPosition') {
    return '{ x: number; y: number; z: number }';
  }

  if (cppType === 'PackedVelocity') {
    return '{ vx: number; vy: number; vz: number }';
  }

  if (cppType === 'PackedTransform') {
    return '{ rotation: { w: number; x: number; y: number; z: number }; position: { x: number; y: number; z: number } }';
  }

  if (cppType === 'PackedRotationRate') {
    return 'number';
  }

  if (cppType === 'KeyShare::Key') {
    return 'Uint8Array';
  }

  if (
    cppType === 'Archive::ByteStream' ||
    cppType === 'Data' ||
    cppType === 'MessageToPayload'
  ) {
    return 'Uint8Array';
  }

  if (/^(bool)$/.test(lower)) {
    return 'boolean';
  }

  if (
    /^(int|short|long|float|real|double|char|byte|uint8|uint16|uint32|int8|int16|int32|unsigned|stationid|tag|unsigned char|unsigned short|unsigned int|unsigned long)$/.test(
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
    return `${mapCppTypeToTsBase(inner)}[]`;
  }

  if (cppType.startsWith('std::list<')) {
    const inner = cppType.slice('std::list<'.length, -1);
    return `${mapCppTypeToTsBase(inner)}[]`;
  }

  if (cppType.startsWith('std::deque<')) {
    const inner = cppType.slice('std::deque<'.length, -1);
    return `${mapCppTypeToTsBase(inner)}[]`;
  }

  if (cppType.startsWith('std::set<')) {
    const inner = cppType.slice('std::set<'.length, -1);
    return `${mapCppTypeToTsBase(inner)}[]`;
  }

  if (cppType.startsWith('std::pair<')) {
    const inner = cppType.slice('std::pair<'.length, -1);
    const args = splitTopLevelTemplateArgs(inner);
    if (args.length === 2) {
      return `[${mapCppTypeToTsBase(args[0])}, ${mapCppTypeToTsBase(args[1])}]`;
    }
    return '[unknown, unknown]';
  }

  if (cppType.startsWith('std::map<') || cppType.startsWith('std::unordered_map<')) {
    const inner = cppType.slice(cppType.indexOf('<') + 1, -1);
    const args = splitTopLevelTemplateArgs(inner);
    if (args.length === 2) {
      return `Map<${mapCppTypeToTsBase(args[0])}, ${mapCppTypeToTsBase(args[1])}>`;
    }
    return 'Map<unknown, unknown>';
  }

  if (cppType === 'PackedRgb') {
    return 'number';
  }

  return 'unknown';
}

function mapCppTypeToTs(cppTypeRaw, archiveContainer) {
  const base = mapCppTypeToTsBase(cppTypeRaw);

  if (
    archiveContainer === 'AutoArray' ||
    archiveContainer === 'AutoList' ||
    archiveContainer === 'AutoSet' ||
    archiveContainer === 'AutoDeltaVector' ||
    archiveContainer === 'AutoDeltaSet' ||
    archiveContainer === 'AutoDeltaQueue'
  ) {
    return base.endsWith('[]') ? base : `${base}[]`;
  }

  if (
    archiveContainer === 'AutoMap' ||
    archiveContainer === 'AutoDeltaMap' ||
    archiveContainer === 'AutoDeltaPackedMap'
  ) {
    if (base.startsWith('Map<')) {
      return base;
    }
    const args = splitTopLevelTemplateArgs(normalizeCppType(cppTypeRaw));
    if (args.length === 2) {
      return `Map<${mapCppTypeToTsBase(args[0])}, ${mapCppTypeToTsBase(args[1])}>`;
    }
    return 'Map<unknown, unknown>';
  }

  return base;
}

const FIXED_LENGTH_BY_TYPE = new Map([
  ['bool', 1],
  ['char', 1],
  ['signed char', 1],
  ['unsigned char', 1],
  ['int8', 1],
  ['uint8', 1],
  ['byte', 1],
  ['short', 2],
  ['signed short', 2],
  ['signed short int', 2],
  ['unsigned short', 2],
  ['unsigned short int', 2],
  ['int16', 2],
  ['uint16', 2],
  ['int', 4],
  ['signed int', 4],
  ['unsigned int', 4],
  ['long', 4],
  ['signed long', 4],
  ['signed long int', 4],
  ['unsigned long', 4],
  ['unsigned long int', 4],
  ['int32', 4],
  ['uint32', 4],
  ['float', 4],
  ['real', 4],
  ['double', 8],
  ['int64', 8],
  ['uint64', 8],
  ['long long', 8],
  ['unsigned long long', 8],
  ['networkid', 8],
  ['stationid', 4],
  ['tag', 4],
  ['unsigned', 4],
  ['vector', 12],
  ['quaternion', 16],
  ['transform', 28],
  ['packedposition', 6],
  ['packedvelocity', 4],
  ['packedrotationrate', 1],
  ['packedtransform', 10],
  ['keyshare::key', 16],
]);

function mergeLengthKinds(lhs, rhs) {
  if (lhs.kind === 'unknown' || rhs.kind === 'unknown') {
    return { kind: 'unknown', minBytes: null, exactBytes: null };
  }
  if (lhs.kind === 'exact' && rhs.kind === 'exact') {
    return {
      kind: 'exact',
      exactBytes: lhs.exactBytes + rhs.exactBytes,
      minBytes: lhs.exactBytes + rhs.exactBytes,
    };
  }

  const lhsMin = lhs.kind === 'exact' ? lhs.exactBytes : lhs.minBytes;
  const rhsMin = rhs.kind === 'exact' ? rhs.exactBytes : rhs.minBytes;
  return {
    kind: 'min',
    minBytes: lhsMin + rhsMin,
    exactBytes: null,
  };
}

function estimateCppTypeLength(cppTypeRaw) {
  const cppType = normalizeCppType(cppTypeRaw);
  const lower = cppType.toLowerCase();

  if (FIXED_LENGTH_BY_TYPE.has(lower)) {
    const bytes = FIXED_LENGTH_BY_TYPE.get(lower);
    return { kind: 'exact', exactBytes: bytes, minBytes: bytes };
  }

  if (cppType === 'std::string') {
    return { kind: 'min', minBytes: 2, exactBytes: null };
  }

  if (cppType === 'Unicode::String' || cppType.endsWith('::String')) {
    return { kind: 'min', minBytes: 4, exactBytes: null };
  }

  if (cppType === 'Archive::ByteStream') {
    return { kind: 'min', minBytes: 4, exactBytes: null };
  }

  if (cppType === 'Data' || cppType === 'MessageToPayload') {
    return { kind: 'min', minBytes: 4, exactBytes: null };
  }

  if (cppType === 'StringId') {
    return { kind: 'min', minBytes: 8, exactBytes: null };
  }

  if (cppType === 'ChatAvatarId') {
    return { kind: 'min', minBytes: 6, exactBytes: null };
  }

  if (cppType === 'ChatRoomData') {
    return { kind: 'min', minBytes: 35, exactBytes: null };
  }

  if (cppType === 'SuiPageData') {
    return { kind: 'min', minBytes: 34, exactBytes: null };
  }

  if (cppType === 'ValueDictionary') {
    return { kind: 'min', minBytes: 4, exactBytes: null };
  }

  if (cppType === 'ProsePackage') {
    return { kind: 'min', minBytes: 77, exactBytes: null };
  }

  if (cppType === 'GroupMemberParam') {
    return { kind: 'min', minBytes: 26, exactBytes: null };
  }

  if (cppType === 'NebulaLightningData') {
    return { kind: 'exact', exactBytes: 38, minBytes: 38 };
  }

  if (cppType === 'ServerInfo') {
    return { kind: 'min', minBytes: 12, exactBytes: null };
  }

  if (cppType === 'ValueType') {
    return { kind: 'min', minBytes: 0, exactBytes: null };
  }

  if (cppType === 'Auction::ItemDataDetails') {
    return { kind: 'min', minBytes: 20, exactBytes: null };
  }

  if (cppType === 'ADV') {
    return { kind: 'min', minBytes: 4, exactBytes: null };
  }

  if (cppType === 'PopulationList') {
    return { kind: 'min', minBytes: 4, exactBytes: null };
  }

  if (cppType === 'AvatarList') {
    return { kind: 'min', minBytes: 4, exactBytes: null };
  }

  if (
    cppType.startsWith('std::vector<') ||
    cppType.startsWith('std::list<') ||
    cppType.startsWith('std::set<') ||
    cppType.startsWith('std::deque<') ||
    cppType.startsWith('std::map<') ||
    cppType.startsWith('std::unordered_map<')
  ) {
    return { kind: 'min', minBytes: 4, exactBytes: null };
  }

  if (cppType.startsWith('std::pair<')) {
    const inner = cppType.slice('std::pair<'.length, -1);
    const args = splitTopLevelTemplateArgs(inner);
    if (args.length !== 2) {
      return { kind: 'unknown', minBytes: null, exactBytes: null };
    }
    return mergeLengthKinds(estimateCppTypeLength(args[0]), estimateCppTypeLength(args[1]));
  }

  return { kind: 'unknown', minBytes: null, exactBytes: null };
}

function estimateFieldLength(field) {
  const container = field.archiveContainer;
  if (container === 'Unknown') {
    return { kind: 'unknown', minBytes: null, exactBytes: null };
  }

  if (container === 'AutoVariableKeyShare') {
    return { kind: 'exact', exactBytes: 16, minBytes: 16 };
  }

  if (
    container === 'AutoArray' ||
    container === 'AutoList' ||
    container === 'AutoSet' ||
    container === 'AutoMap' ||
    container === 'AutoDeltaVector' ||
    container === 'AutoDeltaSet' ||
    container === 'AutoDeltaMap' ||
    container === 'AutoDeltaPackedMap' ||
    container === 'AutoDeltaQueue'
  ) {
    return { kind: 'min', minBytes: 4, exactBytes: null };
  }

  if (container === 'AutoByteStream' || container === 'AutoDeltaByteStream') {
    return { kind: 'min', minBytes: 4, exactBytes: null };
  }

  return estimateCppTypeLength(field.cppType);
}

function estimatePacketLength(fields) {
  if (!fields || fields.length === 0) {
    return { kind: 'exact', exactBytes: 0, minBytes: 0 };
  }

  let state = { kind: 'exact', exactBytes: 0, minBytes: 0 };
  for (const field of fields) {
    const fieldLen = estimateFieldLength(field);
    state = mergeLengthKinds(state, fieldLen);
    if (state.kind === 'unknown') {
      return state;
    }
  }
  return state;
}

function parseArchiveFieldsFromClassBlock(block) {
  const fields = [];
  const clean = stripComments(block);
  const statements = clean
    .split(';')
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  for (const statement of statements) {
    let normalized = statement
      .replace(/^[}\s]*(?:(?:public|private|protected)\s*:\s*)+/g, '')
      .replace(/^[}\s]+/g, '')
      .trim();

    if (!normalized || normalized.includes('(')) {
      continue;
    }

    const directMatch = normalized.match(
      /^Archive::([A-Za-z0-9_]+)\s*<([\s\S]+)>\s*([A-Za-z_][A-Za-z0-9_]*)$/
    );
    if (directMatch) {
      const archiveContainer = directMatch[1];
      const cppType = normalizeCppType(directMatch[2]);
      const name = directMatch[3];
      const tsType = mapCppTypeToTs(cppType, archiveContainer);
      fields.push({
        name,
        archiveContainer,
        cppType,
        tsType,
      });
      continue;
    }

    const keyShareMatch = normalized.match(/^AutoVariableKeyShare\s+([A-Za-z_][A-Za-z0-9_]*)$/);
    if (keyShareMatch) {
      const archiveContainer = 'AutoVariableKeyShare';
      const cppType = 'KeyShare::Key';
      const tsType = mapCppTypeToTs(cppType, archiveContainer);
      fields.push({
        name: keyShareMatch[1],
        archiveContainer,
        cppType,
        tsType,
      });
      continue;
    }
  }

  return fields.filter((field) => SUPPORTED_ARCHIVE_CONTAINERS.has(field.archiveContainer));
}

function extractConstructorWireNames(cppContent) {
  const namesByClass = new Map();
  const regex =
    /\b([A-Za-z_][A-Za-z0-9_]*)(?:<[^>]+>)?::\1(?:<[^>]+>)?\s*\([\s\S]*?\)\s*:\s*GameNetworkMessage\s*\(\s*"([^"]+)"\s*\)/g;

  for (const match of cppContent.matchAll(regex)) {
    const className = match[1];
    const wireName = match[2];
    if (!namesByClass.has(className)) {
      namesByClass.set(className, []);
    }
    namesByClass.get(className).push(wireName);
  }

  return namesByClass;
}

function dedupePreserveOrder(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    out.push(value);
  }
  return out;
}

function mergeMapOfArrays(target, source) {
  for (const [key, values] of source.entries()) {
    if (!target.has(key)) {
      target.set(key, []);
    }
    target.get(key).push(...values);
  }
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
      const ctorMatch = line.match(
        /\b([A-Za-z_][A-Za-z0-9_]*)(?:<[^>]+>)?::([A-Za-z_][A-Za-z0-9_]*)(?:<[^>]+>)?\s*\(/
      );
      if (ctorMatch && ctorMatch[1] === ctorMatch[2]) {
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
  const orderSourceFiles = dedupePreserveOrder([...cppFiles, ...headerFiles]);
  for (const sourceFile of orderSourceFiles) {
    const text = await fs.readFile(sourceFile, 'utf8');
    const ordersInFile = extractConstructorAddVariableOrders(text);
    mergeMapOfArrays(constructorOrdersByClass, ordersInFile);
  }

  const constructorWireNamesByClass = new Map();
  for (const cppFile of cppFiles) {
    const text = await fs.readFile(cppFile, 'utf8');
    const wireNamesInFile = extractConstructorWireNames(text);
    mergeMapOfArrays(constructorWireNamesByClass, wireNamesInFile);
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

    const wireNames = dedupePreserveOrder(constructorWireNamesByClass.get(className) ?? []);
    let crcInputName = className;
    let crcSource = 'className';
    if (wireNames.length === 1) {
      crcInputName = wireNames[0];
      crcSource = 'constructorString';
    } else if (wireNames.length > 1) {
      crcInputName = wireNames[0];
      crcSource = 'constructorStringMultiple';
    }
    const crc = computeSwgCrc32(crcInputName);
    const serializedLength = estimatePacketLength(orderedFields);

    definitions.push({
      name: className,
      swgCrc32: `0x${crc.toString(16).padStart(8, '0')}`,
      crcSource,
      wireNames,
      headers: metadata.headers,
      implementedInTypescript: tsInterfaces.has(className),
      fieldCount: orderedFields.length,
      fields: orderedFields,
      serializedLength,
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
  crcSource: 'className' | 'constructorString' | 'constructorStringMultiple';
  wireNames: string[];
  headers: string[];
  implementedInTypescript: boolean;
  fieldCount: number;
  fields: CppPacketFieldDefinition[];
  serializedLength: {
    kind: 'exact' | 'min' | 'unknown';
    exactBytes: number | null;
    minBytes: number | null;
  };
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
