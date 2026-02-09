# CLAUDE.md - SWG-Source-JS Project Guide

## Project Overview

TypeScript reimplementation of the Star Wars Galaxies (SWG) server. The original SWG was a C++ MMO; this project recreates the server to be compatible with the original closed-source SWG client binary (SwgClient_r.exe).

## Architecture

**Monorepo** using pnpm workspaces + Turborepo. Three workspace roots: `apps/`, `packages/`, `tools/`.

### Servers (apps/)

| Server | Port | Protocol | Role |
|--------|------|----------|------|
| login-server | 44453/UDP | SOE+SWG | Authentication, cluster enumeration, character list |
| connection-server | 44455/UDP | SOE+SWG | Post-login routing, character creation, session validation |
| game-server | 44463/UDP | SOE+SWG | Zone-in, baselines, gameplay, movement, character creation |
| chat-server | 44462/TCP | SWG | Chat, mail, messaging |

**Client connects to exactly 2 servers**: login (44453) then game (44463). The connection server (44455) is internal infrastructure - not in the client's direct flow. `LoginClusterStatus` advertises the game server address/port to clients.

### Packages (packages/)

| Package | Purpose |
|---------|---------|
| @swg/protocol | SOE UDP layer + SWG message serialization (526+ packet types) |
| @swg/database | MySQL schema (Drizzle ORM), repositories, migrations |
| @swg/objects | Game objects, baselines (CREO/PLAY), templates, CRC lookup |
| @swg/config | Zod-based configuration schemas for all servers |
| @swg/game-logic | Combat, skills, crafting, movement, resources, PvP, Jedi, factions |
| @swg/world | Zone management, spatial partitioning (quad-tree) |
| @swg/redis | Redis client wrapper, session store, pub/sub |
| @swg/shared-types | Shared TypeScript type definitions |
| @swg/datatable | DTII binary parser, DataTableManager singleton, BuildoutLoader |
| @swg/ai | NPC behavior trees |
| @swg/metrics | Metrics collection (stub) |

## Build & Development

```bash
# Prerequisites: Node 22+, pnpm 9.15.0
pnpm install                           # Install all dependencies
pnpm build                             # Build everything (turbo)
pnpm test                              # Run all tests (vitest)
pnpm --filter @swg/protocol build      # Build single package
pnpm --filter @swg/game-server build   # Build single app (esbuild)
pnpm dev                               # Dev mode with watch (tsx)
```

**Build pipeline**: Turbo handles dependency ordering. Packages use `tsc`, apps use `esbuild` (target: node22, ESM). Output goes to `dist/`.

**Important**: Containers run compiled `dist/*.js` files. After changing `.ts` source, you must rebuild the affected package AND rebuild the container image for changes to take effect.

### Docker Deployment

```bash
cd docker/
cp .env.example .env                   # Configure environment
podman compose build                   # Build all images
podman compose up -d                   # Start all services
podman compose down                    # Stop all services
podman compose build login-server      # Rebuild single service
podman logs swg-js-login-server        # View logs
```

**Use `podman compose`** (not `docker compose`) on this system. Must run from the `docker/` directory.

**IMPORTANT**: `podman compose restart` does NOT pick up new container images — it just restarts existing containers. To deploy code changes, you must `podman compose down` then `podman compose up -d` (or `podman compose build <service>` first for a single service).

Services: MySQL 8, Redis 7, login-server, connection-server, game-server, chat-server. All on a bridge network (172.28.0.0/16). `PUBLIC_ADDRESS` in `.env` controls what IP clients connect to. MySQL port is 3307, Redis port is 6380 (non-default to avoid conflicts).

## Protocol Architecture

Two-layer protocol stack:

### SOE Layer (UDP transport)
- Session management with encryption (XOR CBC), compression (zlib), CRC validation
- Reliable delivery with sequence numbers, acknowledgments, retransmission
- `MultiMessage` (0x0019) wraps multiple SWG messages in one Data packet with variable-length size prefixes
- `SessionManager` handles all of this: `setSendCallback`, `sendReliable`, `sendReliableGroup`
- Key events: `session:connected`, `session:disconnected`, `data`

### SWG Layer (game messages)
- Messages start with `operandCount(u16LE)` then `opcode(u32LE)` then fields
- **operandCount includes itself**: value = number_of_payload_fields + 1
- ALL strings use LE uint16 length prefix (matches C++ Archive)
- Unicode strings: uint32LE char count + UTF-16LE encoded chars
- `BufferReader`/`BufferWriter` for serialization (`packages/protocol/src/soe/buffer-utils.ts`)
- Each message type has `serialize`, `deserialize`, and `create` factory functions

### Client Login Flow
1. **Login**: `LoginClientId` -> `LoginClientToken` + `LoginEnumCluster` + `LoginClusterStatus` + `CharacterCreationDisabled` (grouped) -> `StationIdHasJediSlot` + `EnumerateCharacterIdResponse` (grouped)
2. **Game Server Auth**: Client connects to game server -> `ClientIdMsg` (token validation) -> `HeartBeat` + `AccountFeatureBits` + `ClientPermissions` (grouped)
3. **Character Select**: `SelectCharacter` -> `ChatServerStatus` + `VoiceChatStatus` -> zone-in sequence
4. **Zone-In** (see detailed sequence below)

## Zone-In Sequence (C++ pcap verified)

The zone-in is implemented in `apps/game-server/src/server.ts` (`sendZoneInSequence`). The exact packet order matters — the client crashes if messages are missing or misordered.

```
1.  ParametersMessage(weatherUpdateInterval=900)     ← REQUIRED, client crashes without it
2.  CmdStartScene(terrainFile, position, template)   ← sceneName = "terrain/tatooine.trn"
3.  SceneCreateObjectByCrc(CREO objectId)            ← creature object
4.  BaselinesMessage × 6: CREO 1, 3, 4, 6, 8, 9    ← pkgs 8/9 are empty (varCount=0) but required
5.  SceneCreateObjectByCrc(PLAY objectId)            ← PLAY is a SEPARATE object (creoId + 1)
6.  UpdateContainment(PLAY → CREO, slot=-1)          ← links PLAY inside CREO
7.  BaselinesMessage × 4: PLAY 3, 6, 8, 9           ← sent to PLAY objectId, NOT CREO objectId
8.  SceneEndBaselines(PLAY)
9.  UpdatePvpStatusMessage(flags=0x10, target=CREO)  ← IsPlayer flag
10. UpdatePostureMessage(UPRIGHT, target=CREO)
11. SceneEndBaselines(CREO)                          ← CREO end comes AFTER all child objects
12. ServerTimeMessage
```

**Key rules:**
- PLAY object MUST have its own objectId (currently `creoId + 1n`) and its own `SceneCreateObjectByCrc`
- CREO MUST send all 6 baseline packages (1,3,4,6,8,9) even though 8/9 are empty
- `CmdStartScene` sceneName is the terrain file path (`terrain/tatooine.trn`), NOT the scene ID (`tatooine`)
- `SceneEndBaselines` for CREO must come AFTER PLAY's `SceneEndBaselines`
- `ParametersMessage` opcode is `0x487652da` (the `world-messages.ts` value was wrong as `0x3324f080` and has been fixed)
- `UpdatePostureMessage` (`0x0bde6b41`) is a different message from `PostureMessage` (`0xf5ea7b42`)

## Critical Protocol Gotchas

### DO NOT REMOVE these fields (client crashes without them)

- **LoginClusterStatus trailing `reserved` u16**: The C++ *server* source code does NOT have this field, but the *client binary* REQUIRES it. Removing it causes exception `e06d7363`. This is a client/server source version mismatch. Always write `reserved ?? 0` as a u16 at the end of each ClusterStatusDataEntry.

- **AccountFeatureBits `epochSeconds` field**: Must include all 4 fields after opcode: `gameFeatures(u32)` + `subscriptionFeatures(u32)` + `connectionServerNumber(i32)` + `epochSeconds(i32)`. Missing the epoch crashes the client.

- **ParametersMessage before zone-in**: Must be sent before `CmdStartScene`. Contains `weatherUpdateInterval` (default 900). Client crashes without it.

### Message grouping matters

- **LoginClusterStatusEx** must be sent as a **separate** `sendReliable()`, NOT bundled in the login response group.
- The login response group (Data seq=1) should contain exactly: `ServerNowEpochTime` + `LoginClientToken` + `LoginEnumCluster` + `CharacterCreationDisabled` + `LoginClusterStatus`.
- Avatar list is a separate group (Data seq=2): `StationIdHasJediSlot` + `EnumerateCharacterIdResponse`.
- On session connect, send proactive group (Data seq=0): `GameServerLagResponse` + `SystemAssignedProcessId`.

### Wire format specifics
- `LoginClientToken`: `token(AutoArray<u8>)` + `stationId(u32)` + `username(string)`
- `ClientIdMsg`: `gameBitsToClear(u32)` + `token(AutoArray<u8>)` + `version(string)`
- `EnumerateCharacterIdResponse`: `name(Unicode)` + `templateCrc(i32)` + `characterId(u64)` + `clusterId(u32)` + `characterType(i32)` per entry
- `SceneCreateObjectByCrc`: Quaternion(x,y,z,w) BEFORE Vector(x,y,z) in Transform
- Character creation: all 7 messages have operandCount prefix; handled on the game server (not login)

### Baseline format (C++ Packager.cpp match)
- Package mapping: `addSharedVariable`->Pkg3, `addSharedVariable_np`->Pkg6, `addAuthClientServerVariable`->Pkg1, `addAuthClientServerVariable_np`->Pkg4, `addFirstParentAuthClientServerVariable`->Pkg8, `addFirstParentAuthClientServerVariable_np`->Pkg9
- Server-only vars (`addServerVariable`/`addServerVariable_np`) are NOT sent to client
- CREO sends 6 packages: 1(4 vars), 3(19), 4(16), 6(35), 8(0 empty), 9(0 empty)
- PLAY sends 4 packages: 3(20 vars), 6(17), 8(9), 9(29)
- `AutoDeltaVector` baseline: `size + counter + elements` (NO cmd byte)
- `AutoDeltaSet/Map`: `size + counter + [u8(cmd) + element]`

### Opcode pitfalls
- Some opcodes in `world-messages.ts` and `cpp-packet-stubs.ts` were auto-generated and may be wrong. Always verify against `cpp-packet-manifest.ts` (`swgCrc32` field) which is parsed from C++ constructor strings.
- `UpdatePostureMessage` (0x0bde6b41) vs `PostureMessage` (0xf5ea7b42) — different opcodes, different wire formats.

## Reference Materials

### C++ Source Code
Located at `/home/tharper/code/swg-source-docker/swg-main/src/`. This is the open-source SWG server. Key paths:
- `engine/shared/library/sharedNetworkMessages/` - Message class definitions
- `engine/server/application/ConnectionServer/` - ConnectionServer logic
- `engine/server/application/LoginServer/` - LoginServer logic
- `game/server/application/` - GameServer logic

**Warning**: The C++ server source does not always match the client binary exactly. The client may have fields or behaviors not present in the server source (e.g., the LoginClusterStatus `reserved` u16).

### Packet Captures (docs/pcaps/)
- `login_capture_c++.pcap` - Full login flow captured from a working C++ server (86 KB)
- `login_capture_client.pcap` - Client-side login capture (3.6 KB)
- `character_creation_zone_in_process.pcap` - Character creation through zone-in (123 KB)

### Decode Tool
```bash
node tools/decode-pcap.mjs docs/pcaps/login_capture_c++.pcap [port-filter]
```
Decodes SOE-encrypted packets from pcap files. Handles SOE session negotiation, decryption, decompression, and SWG opcode identification. Properly unwraps UdpPacketGroup / MultiMessage (0x00 0x19) bundles into individual SWG messages with correct opcode resolution. Output shows `MultiMessage (N SWG messages)` with indexed sub-messages for easy protocol analysis.

### Packet Parity Tools (tools/packet-parity/)
- `generate-cpp-packet-manifest.mjs` - Parses C++ source to generate TypeScript manifest of all 526 packet types
- `generate-cpp-packet-stubs.mjs` - Generates stub serializers for C++ packets
- `generate-network-md.mjs` - Generates NETWORK.md protocol documentation

### Generated Protocol Files
- `packages/protocol/src/swg/messages/generated/cpp-packet-manifest.ts` - Auto-generated manifest of all C++ packets
- `packages/protocol/src/swg/messages/cpp-packet-stubs.ts` - Stub serializers
- `packages/protocol/src/swg/wire/cpp-wire-codec.ts` - Full wire codec for all 526 packets

### DataTable Package (@swg/datatable)

Canonical home for the DTII binary parser, `DataTableManager` singleton, and `BuildoutLoader`. Located at `packages/datatable/src/`. The data-importer CLI re-exports from this package.

**DTII Binary Format:**
- 7,230 binary datatable files in `data/serverdata/datatables/` containing all game configuration data (skills, combat, crafting, buildout, character creation, commands, etc.)
- Structure: `FORM/DTII > FORM/<version> > COLS + TYPE + ROWS`
- **Critical**: DTII files have NO even-boundary padding between chunks. The parser uses `IffDataReader` directly (not `IffParser`) to avoid its padding logic.
- Typespec chars: `i`=int, `f`=float, `s`=string, `h`=hex, `b`=bool, `e`=enum, `v`=bitvector, `p`=path, `z`=zero, `c`=comment
- All numeric values are little-endian (i32/f32), strings are null-terminated

**DataTableManager** — Singleton that lazy-loads and caches datatable files at runtime (mirrors C++ `DataTableManager`):
- `DataTableManager.install(dataRoot)` — initializes with path to `data/serverdata/`
- `getTable(path)` — reads, parses, and caches a `.iff` file; returns `undefined` for missing files
- `searchColumnString(table, column, value)` — find row index by string column value
- `getIntValue/getFloatValue/getStringValue(table, column, row)` — typed cell accessors
- Configured via `DATA_ROOT` env var or defaults to `data/serverdata/` relative to game server

**BuildoutLoader** — Loads static world objects (buildings, NPCs, terminals, decorations) from buildout datatables:
- `getSceneNames()` — reads `datatables/buildout/buildout_scenes.iff` (22 scenes)
- `getAreasForScene(sceneId)` — reads `datatables/buildout/areas_<scene>.iff`
- `loadBuildoutObjects(sceneId)` — reads grid files from `datatables/buildout/<scene>/`, returns `BuildoutObject[]` with position, orientation, template CRC, container info
- Skips event-gated areas (halloween, lifeday, etc.)
- Called by `ZoneService.loadZone()` at startup for each planet; only top-level objects (containerId=0) are added to the zone

Key source files:
- `packages/datatable/src/iff-data-reader.ts` — Low-level binary reader for IFF data (no padding)
- `packages/datatable/src/datatable-parser.ts` — Core DTII binary parser (`parseDataTable`, `parseTypeSpec`)
- `packages/datatable/src/datatable-manager.ts` — Singleton manager with lazy loading and caching
- `packages/datatable/src/buildout-loader.ts` — Buildout object loading from datatable grid files

### Data Importer Tool (tools/data-importer/)

CLI tool (`@swg/data-importer`) for processing SWG binary data files. Re-exports parser and `IffDataReader` from `@swg/datatable`. Source in `tools/data-importer/src/iff/`.

**IFF Template Extraction:**
```bash
npx tsx tools/data-importer/src/iff/cli.ts extract-single <file.iff>
npx tsx tools/data-importer/src/iff/cli.ts extract-templates <input-dir> <output-dir>
npx tsx tools/data-importer/src/iff/cli.ts inspect <file.iff> -v
npx tsx tools/data-importer/src/iff/cli.ts generate-crc-table <template-dir> <output-file>
```

**DataTable CLI:**
```bash
npx tsx tools/data-importer/src/iff/cli.ts datatable <file.iff> [-o output.json]
npx tsx tools/data-importer/src/iff/cli.ts datatable-dir <input-dir> <output-dir> [-r] [-v]
```

### Task Tracking (done/, in_progress/, to_do/)
Markdown files tracking implementation progress. `done/` has 13 completed milestones (protocol layers, login, connection, zone-in, Redis, DB schema). `in_progress/` and `to_do/` have planned work.

## Database

MySQL 8 with Drizzle ORM. Schema in `packages/database/src/schema/`. Key tables: accounts, characters (with `template_name` column), sessions.

- Character IDs: Snowflake-style 64-bit (`packages/objects/src/object-id.ts`) - 42-bit timestamp + 10-bit worker + 12-bit sequence
- Template CRC: CRC32 of lowercase template path string (`packages/objects/src/template-crc.ts`)
- Migrations: `drizzle-kit generate` / `drizzle-kit migrate`

## Session Management

- Login server creates a 64-char hex session token, stored in Redis with `session:` prefix
- All servers must use the same `session:` prefix for token lookup
- Login server must NOT delete the Redis session on disconnect (client disconnects from login before connecting to game server)
- Game server validates the token from `ClientIdMsg` against Redis

## Testing

```bash
pnpm test                              # All tests
pnpm --filter @swg/protocol test       # Protocol tests only
pnpm --filter @swg/world test          # World/spatial tests
```

Framework: Vitest with v8 coverage. Test files: `*.test.ts` in package `src/` directories. Integration tests in `tests/integration/`.

Key test suites:
- `packages/protocol/src/swg/wire/cpp-wire-codec.test.ts` - 42 roundtrip tests for C++ packet codec
- `packages/protocol/src/soe/udp-library-wire.test.ts` - SOE protocol tests
- `packages/datatable/src/datatable-parser.test.ts` - 21 tests for DTII datatable parser
- `packages/datatable/src/datatable-manager.test.ts` - 12 tests for DataTableManager + BuildoutLoader
- `tools/data-importer/src/iff/datatable-parser.test.ts` - 21 tests (re-exports from @swg/datatable)
- `tests/integration/` - Login and zone-entry integration tests

## Data Management

Clear all game data (useful when testing protocol changes):
```bash
mysql -h 127.0.0.1 -P 3307 -u swg -pswg swg -e "DELETE FROM character_skills; DELETE FROM character_experience; DELETE FROM characters; DELETE FROM accounts;"
podman exec swg-js-redis redis-cli -a swg_redis_password FLUSHALL
```

## Profanity Filter

Profanity filter exists in 3 copies (login-server, connection-server, game-server `src/data/profanity-filter.ts`). All 3 must be kept in sync. The `normalizeString()` function strips non-alphanumeric characters, so symbol-heavy entries like `a$$` normalize to `a` which matches every name via substring check. A minimum-length guard (< 3 chars) prevents these false positives.

## Pre-existing Issues

- Type errors in `packages/protocol/src/soe/` (crc32.ts, packet.ts, session-manager.ts) - pre-existing, not from our changes
- Build errors in `@swg/objects` (ship, guild, harvester files) and `@swg/metrics` - pre-existing
- `bazaar-handler.ts` has 20 type errors from missing exports in `@swg/protocol` (bazaar-messages) and `@swg/database` (market-repository) — those modules haven't been implemented yet
- The `Makefile` references `docker-compose` but the system uses `podman compose`
