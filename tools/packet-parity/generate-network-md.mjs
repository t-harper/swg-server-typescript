#!/usr/bin/env node

/**
 * Build NETWORK.md from local source-of-truth:
 * - ../swg-source-docker (C++ + runtime cfg)
 * - this repo packet parity manifest (generated)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const DOCKER_ROOT = path.resolve(REPO_ROOT, '../swg-source-docker');

const MANIFEST_FILE = path.resolve(
  REPO_ROOT,
  'packages/protocol/src/swg/messages/generated/cpp-packet-manifest.ts'
);
const OUTPUT_FILE = path.resolve(REPO_ROOT, 'NETWORK.md');

const CONFIG_CPP_ROOTS = [
  path.resolve(DOCKER_ROOT, 'swg-main/src/engine/server/application'),
  path.resolve(DOCKER_ROOT, 'swg-main/src/game/server/application'),
];

const CFG_FILES = [
  path.resolve(DOCKER_ROOT, 'docker-compose.yml'),
  path.resolve(DOCKER_ROOT, 'swg-main/exe/shared/servercommon.cfg'),
  path.resolve(DOCKER_ROOT, 'swg-main/exe/linux/serverNetwork.cfg'),
  path.resolve(DOCKER_ROOT, 'swg-main/exe/linux/default.cfg'),
  path.resolve(DOCKER_ROOT, 'swg-main/exe/linux/localOptions.cfg'),
  path.resolve(DOCKER_ROOT, 'swg-main/exe/linux/nodes.cfg'),
  path.resolve(DOCKER_ROOT, 'swg-main/exe/linux/multiserver.cfg'),
];

const UDP_HPP = path.resolve(
  DOCKER_ROOT,
  'swg-main/src/external/3rd/library/udplibrary/UdpLibrary.hpp'
);
const UDP_CPP = path.resolve(
  DOCKER_ROOT,
  'swg-main/src/external/3rd/library/udplibrary/UdpLibrary.cpp'
);

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
    const p = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(p, extensions, out);
      continue;
    }
    if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(p);
    }
  }
  return out;
}

function toRepoRelative(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function isNetworkKey(key, section = '') {
  const keyPattern =
    /(port|address|interface|bind|network|buffer|packet|fragment|raw|outstanding|timeout|crc|encrypt|compress|session|cluster|login|connection|chat|customer|metric|watcher|service|dsn|database|host|uid|pwd|protocol|reserved|ping|overflow|remap|keepalive|reliable|clock)/i;
  const sectionPattern =
    /(sharednetwork|connectionserver|loginserver|chatserver|centralserver|taskmanager|dbprocess|planetserver|servers?metrics|sharedlog|loginping|metricsserver|customerservice)/i;
  return keyPattern.test(key) || sectionPattern.test(section);
}

function parseManifestArray(tsText) {
  const startToken = 'export const CPP_PACKET_DEFINITIONS: CppPacketDefinition[] = ';
  const endToken = '\n\nexport const CPP_PACKET_DEFINITIONS_BY_NAME';
  const start = tsText.indexOf(startToken);
  if (start < 0) {
    throw new Error(`Unable to find CPP_PACKET_DEFINITIONS in ${MANIFEST_FILE}`);
  }
  const jsonStart = start + startToken.length;
  const end = tsText.indexOf(endToken, jsonStart);
  if (end < 0) {
    throw new Error(`Unable to find end of CPP_PACKET_DEFINITIONS in ${MANIFEST_FILE}`);
  }
  const raw = tsText.slice(jsonStart, end).trim();
  const jsonText = raw.endsWith(';') ? raw.slice(0, -1).trim() : raw;
  return JSON.parse(jsonText);
}

function parseEnumMembers(hppText, enumName) {
  const regex = new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\};`);
  const match = hppText.match(regex);
  if (!match) {
    return [];
  }
  const cleaned = stripComments(match[1])
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/\s*=.+$/, '').trim());

  return cleaned.map((name, index) => ({
    name,
    value: index,
  }));
}

function parseStructFields(hppText, structName) {
  const regex = new RegExp(`struct\\s+${structName}\\s*\\{([\\s\\S]*?)\\};`);
  const match = hppText.match(regex);
  if (!match) {
    return [];
  }
  const body = stripComments(match[1]);
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.endsWith(';'));

  const fields = [];
  for (const line of lines) {
    const normalized = line.replace(/;$/, '').trim();
    if (normalized.length === 0 || normalized.includes('(')) {
      continue;
    }
    const m = normalized.match(/^(.+?)\s+([A-Za-z_][A-Za-z0-9_]*)$/);
    if (!m) {
      continue;
    }
    fields.push({
      type: m[1].trim(),
      name: m[2],
    });
  }
  return fields;
}

function parseUdpParamsDefaults(cppText) {
  const ctorRegex = /UdpManager::Params::Params\(\)\s*\{([\s\S]*?)\n\}/;
  const match = cppText.match(ctorRegex);
  if (!match) {
    return [];
  }

  const body = stripComments(match[1]);
  const lines = body.split(/\r?\n/).map((line) => line.trim());
  const defaults = [];
  for (const line of lines) {
    if (!line || !line.endsWith(';')) {
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_\.\[\]]+)\s*=\s*(.+);$/);
    if (!m) {
      continue;
    }
    defaults.push({
      key: m[1],
      value: m[2].trim(),
    });
  }
  return defaults;
}

function parseConfigDefaults(cppText) {
  const out = [];
  const clean = stripComments(cppText);

  for (const m of clean.matchAll(/KEY_(INT|BOOL|STRING|FLOAT)\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([^)]+)\s*\)/g)) {
    if (m[2] === 'a' && m[3].trim() === 'b') {
      continue;
    }
    if (!isNetworkKey(m[2])) {
      continue;
    }
    out.push({
      type: m[1],
      key: m[2],
      defaultValue: m[3].trim(),
    });
  }
  return out;
}

function parseCfgAssignments(filePath, text) {
  const out = [];
  let section = 'global';
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }
    if (line.startsWith('#') || line.startsWith(';')) {
      continue;
    }
    const sec = line.match(/^\[([^\]]+)\]$/);
    if (sec) {
      section = sec[1];
      continue;
    }
    const eq = line.indexOf('=');
    if (eq < 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!isNetworkKey(key, section)) {
      continue;
    }
    out.push({
      file: toRepoRelative(filePath),
      section,
      key,
      value,
      line: i + 1,
    });
  }
  return out;
}

function formatPacketField(field) {
  return `\`${field.name}\`: \`${field.cppType}\` via \`${field.archiveContainer}\` -> \`${field.tsType}\` (${field.source})`;
}

async function main() {
  if (!(await exists(MANIFEST_FILE))) {
    throw new Error(
      `Missing packet manifest: ${MANIFEST_FILE}\nRun tools/packet-parity/generate-cpp-packet-manifest.mjs first.`
    );
  }

  const manifestText = await fs.readFile(MANIFEST_FILE, 'utf8');
  const packetDefs = parseManifestArray(manifestText).sort((a, b) => a.name.localeCompare(b.name));

  const implemented = packetDefs.filter((p) => p.implementedInTypescript);
  const missing = packetDefs.filter((p) => !p.implementedInTypescript);

  const hppText = await fs.readFile(UDP_HPP, 'utf8');
  const cppText = await fs.readFile(UDP_CPP, 'utf8');

  const udpPacketTypes = parseEnumMembers(hppText, 'UdpPacketType');
  const disconnectReasons = parseEnumMembers(hppText, 'DisconnectReason');
  const udpParamsDefaults = parseUdpParamsDefaults(cppText);

  const packetStructNames = [
    'UdpPacketConnect',
    'UdpPacketConfirm',
    'UdpPacketTerminate',
    'UdpPacketKeepAlive',
    'UdpPacketGroup',
    'UdpPacketClockSync',
    'UdpPacketClockReflect',
    'UdpPacketReliable',
    'UdpPacketReliableFragmentStart',
    'UdpPacketAck',
    'UdpPacketOrdered',
  ];

  const packetStructs = packetStructNames.map((name) => ({
    name,
    fields: parseStructFields(hppText, name),
  }));

  const configCppFiles = [];
  for (const root of CONFIG_CPP_ROOTS) {
    await walkFiles(root, ['.cpp'], configCppFiles);
  }
  const filteredConfigCppFiles = configCppFiles
    .filter((p) => path.basename(p).startsWith('Config'))
    .sort();

  const configDefaults = [];
  for (const file of filteredConfigCppFiles) {
    const text = await fs.readFile(file, 'utf8');
    const entries = parseConfigDefaults(text);
    if (entries.length > 0) {
      configDefaults.push({
        file: toRepoRelative(file),
        entries,
      });
    }
  }

  const cfgAssignments = [];
  for (const file of CFG_FILES) {
    if (!(await exists(file))) {
      continue;
    }
    const text = await fs.readFile(file, 'utf8');
    cfgAssignments.push(...parseCfgAssignments(file, text));
  }

  const generatedAt = new Date().toISOString();
  const lines = [];

  lines.push('# NETWORK');
  lines.push('');
  lines.push('This document is generated from local source code and config files only:');
  lines.push(`- TypeScript repo: \`${path.basename(REPO_ROOT)}\``);
  lines.push(`- Reference C++ repo: \`../swg-source-docker\``);
  lines.push(`- Generated at: \`${generatedAt}\``);
  lines.push('');
  lines.push('## Packet Parity Summary');
  lines.push('');
  lines.push(`- Total C++ \`GameNetworkMessage\` packets discovered: **${packetDefs.length}**`);
  lines.push(`- Implemented packet interfaces in \`swg-source-js\`: **${implemented.length}**`);
  lines.push(`- Missing packet interfaces in \`swg-source-js\`: **${missing.length}**`);
  lines.push(
    `- Coverage: **${((implemented.length / Math.max(packetDefs.length, 1)) * 100).toFixed(2)}%**`
  );
  lines.push('');
  lines.push('## Transport Layer (SOE UDP) from `UdpLibrary`');
  lines.push('');
  lines.push(`Source files: \`${path.relative(REPO_ROOT, UDP_HPP).replace(/\\/g, '/')}\`, \`${path.relative(REPO_ROOT, UDP_CPP).replace(/\\/g, '/')}\``);
  lines.push('');
  lines.push('### UdpPacketType Enum');
  lines.push('');
  lines.push('| Value | Name |');
  lines.push('| --- | --- |');
  for (const entry of udpPacketTypes) {
    lines.push(`| ${entry.value} | \`${entry.name}\` |`);
  }
  lines.push('');
  lines.push('### DisconnectReason Enum');
  lines.push('');
  lines.push('| Value | Name |');
  lines.push('| --- | --- |');
  for (const entry of disconnectReasons) {
    lines.push(`| ${entry.value} | \`${entry.name}\` |`);
  }
  lines.push('');
  lines.push('### Internal UDP Packet Structs (wire field order)');
  lines.push('');
  for (const pkt of packetStructs) {
    lines.push(`#### ${pkt.name}`);
    if (pkt.fields.length === 0) {
      lines.push('- *(no parsed fields)*');
    } else {
      for (const field of pkt.fields) {
        lines.push(`- \`${field.name}\`: \`${field.type}\``);
      }
    }
    lines.push('');
  }

  lines.push('### UdpManager::Params Default Values');
  lines.push('');
  lines.push('| Key | Default |');
  lines.push('| --- | --- |');
  for (const item of udpParamsDefaults) {
    lines.push(`| \`${item.key}\` | \`${item.value.replace(/\|/g, '\\|')}\` |`);
  }
  lines.push('');

  lines.push('## Server Application Config Defaults (`Config*.cpp`)');
  lines.push('');
  for (const cfg of configDefaults) {
    lines.push(`### ${cfg.file}`);
    lines.push('');
    lines.push('| Type | Key | Default |');
    lines.push('| --- | --- | --- |');
    for (const entry of cfg.entries) {
      lines.push(
        `| \`${entry.type}\` | \`${entry.key}\` | \`${entry.defaultValue.replace(/\|/g, '\\|')}\` |`
      );
    }
    lines.push('');
  }

  lines.push('## Runtime CFG Assignments (`*.cfg` + `docker-compose.yml`)');
  lines.push('');
  lines.push('| File | Section | Key | Value | Line |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const item of cfgAssignments) {
    lines.push(
      `| \`${item.file}\` | \`${item.section}\` | \`${item.key}\` | \`${item.value.replace(/\|/g, '\\|')}\` | ${item.line} |`
    );
  }
  lines.push('');

  lines.push('## Implemented Packet List (TypeScript present)');
  lines.push('');
  for (const packet of implemented) {
    lines.push(`### ${packet.name}`);
    lines.push(`- Status: ✅ Implemented`);
    lines.push(`- C++ headers: ${packet.headers.map((h) => `\`${h}\``).join(', ')}`);
    lines.push(`- Derived CRC/opcode hint: \`${packet.swgCrc32}\``);
    if (packet.fields.length === 0) {
      lines.push('- Fields: *(none parsed; packet may still carry behavior/state in implementation)*');
    } else {
      lines.push('- Fields (order):');
      for (const field of packet.fields) {
        lines.push(`  - ${formatPacketField(field)}`);
      }
    }
    lines.push('');
  }

  lines.push('## Missing Packet List (TypeScript absent)');
  lines.push('');
  for (const packet of missing) {
    lines.push(`### ${packet.name}`);
    lines.push(`- Status: ❌ Missing`);
    lines.push(`- C++ headers: ${packet.headers.map((h) => `\`${h}\``).join(', ')}`);
    lines.push(`- Derived CRC/opcode hint: \`${packet.swgCrc32}\``);
    if (packet.fields.length === 0) {
      lines.push('- Fields: *(none parsed)*');
    } else {
      lines.push('- Fields (order):');
      for (const field of packet.fields) {
        lines.push(`  - ${formatPacketField(field)}`);
      }
    }
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  lines.push('- `Derived CRC/opcode hint` values are computed from packet class names using the SWG CRC routine implemented in the generator/manifest pipeline.');
  lines.push('- For true wire-level validation, verify with captured client traffic and the concrete serializer implementation in each packet handler.');
  lines.push('- `Implemented` in this file means a TypeScript packet interface exists by name; it does not guarantee production-complete behavior in handlers.');
  lines.push('');

  await fs.writeFile(OUTPUT_FILE, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${toRepoRelative(OUTPUT_FILE)}`);
  console.log(`Implemented: ${implemented.length}, Missing: ${missing.length}, Total: ${packetDefs.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
