/**
 * Game Server
 * Main server orchestration for the game world.
 *
 * In C++ SWG, the "ConnectionServer" is the client-facing game server.
 * Clients connect here after login for: auth, character creation, character
 * selection, and zone-in.  This server merges that role with the GameServer.
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ServerConfig } from '@swg/config';
import { initDb, CharacterRepository, ObjectRepository } from '@swg/database';
import { getRedisClient, SessionStore } from '@swg/redis';
import { DataTableManager, BuildoutLoader } from '@swg/datatable';
import {
  SessionManager,
  type Session,
  DisconnectReason,
} from '@swg/protocol/soe';
import { BufferWriter } from '@swg/protocol/soe/buffer-utils.js';
import {
  MovementMessageOpcode,
  deserializeDataTransform,
  deserializeDataTransformWithParent,
} from '@swg/protocol/swg/messages/movement.js';
import {
  ZoneMessageOpcode,
  isZoneMessageOpcode,
  createCmdStartScene,
  serializeCmdStartScene,
  createSceneCreateObjectByCrc,
  serializeSceneCreateObjectByCrc,
  createSceneEndBaselines,
  serializeSceneEndBaselines,
  createServerTimeMessage,
  serializeServerTimeMessage,
  createUpdateContainment,
  serializeUpdateContainment,
} from '@swg/protocol/swg/messages/zone-messages.js';
import {
  ConnectionMessageOpcode,
  deserializeClientIdMsg,
  deserializeSelectCharacter,
} from '@swg/protocol/swg/messages/connection-messages.js';
import {
  CharacterCreationOpcode,
  deserializeClientCreateCharacter,
  deserializeClientVerifyAndLockNameRequest,
  deserializeClientRandomNameRequest,
} from '@swg/protocol/swg/messages/character-creation.js';
import { serializeHeartBeat } from '@swg/protocol/swg/messages/character-messages.js';
import { createClientPermissionsMessage, createUpdatePvpStatusMessage } from '@swg/protocol/swg/messages/object-messages.js';
import {
  createChatServerStatus,
  serializeChatServerStatus,
} from '@swg/protocol/swg/messages/chat/chat-core.js';
import {
  PlayerObject as PlayerObjectClass,
  calculateTemplateCrc,
  TemplateCrc,
} from '@swg/objects';
import { Posture } from '@swg/protocol';
import {
  createParametersMessage,
  serializeParametersMessage,
} from '@swg/protocol/swg/messages/world-messages.js';
import { createUpdatePostureMessage } from '@swg/protocol/swg/messages/posture.js';

import {
  MovementHandler,
  createMovementHandler,
  type GameSession,
  type PlayerObject,
} from './handlers/movement-handler.js';
import {
  CharacterCreationHandler,
  createCharacterCreationHandler,
} from './handlers/character-creation-handler.js';
import {
  sendCreatureBaselines,
  sendPlayerBaselines,
  type SendReliable,
} from './services/baseline-sender.js';
import {
  ZoneService,
  createZoneService,
  SpawnManager,
  createSpawnManager,
} from './services/index.js';

// ---------------------------------------------------------------------------
// Opcodes for connection-level messages that don't belong to other categories
// ---------------------------------------------------------------------------
const ConnectionServerMessageOpcode = {
  AccountFeatureBits: 0x979f0279,
  VoiceChatStatus: 0x9e601905,
} as const;

const DefaultFeatureBits = {
  game: 0x00000000,
  subscription: 0x00000001,
} as const;

function serializeAccountFeatureBits(
  gameFeatures: number,
  subscriptionFeatures: number,
  connectionServerNumber: number,
  epochSeconds: number,
): Uint8Array {
  const writer = new BufferWriter(32);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ConnectionServerMessageOpcode.AccountFeatureBits);
  writer.writeUInt32LE(gameFeatures >>> 0);
  writer.writeUInt32LE(subscriptionFeatures >>> 0);
  writer.writeInt32LE(connectionServerNumber | 0);
  writer.writeInt32LE(epochSeconds | 0);
  return writer.toBuffer();
}

function serializeVoiceChatStatus(statusCode: number): Uint8Array {
  const writer = new BufferWriter(16);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ConnectionServerMessageOpcode.VoiceChatStatus);
  writer.writeUInt32LE(statusCode >>> 0);
  return writer.toBuffer();
}

// ---------------------------------------------------------------------------
// Extended game session: tracks auth state before character selection
// ---------------------------------------------------------------------------
interface ExtendedGameSession {
  soeSession: Session;
  sessionToken: string;
  authenticated: boolean;
  accountId: number;
  sentPostAuthPackets: boolean;

  // Set when character is selected/created
  characterId?: bigint;
  movementSession?: GameSession;
}

/**
 * Game Server instance interface
 */
export interface GameServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getConnectionCount(): number;
  getPlayerCount(): number;
  getZoneService(): ZoneService;
  getSpawnManager(): SpawnManager;
}

/**
 * Create the Game Server
 */
export async function createServer(config: ServerConfig): Promise<GameServer> {
  // Initialize database
  const db = initDb(config.database);
  console.log('[GameServer] Database initialized');

  // Initialize Redis
  const redisClient = getRedisClient(config.redis);
  await redisClient.connect();
  console.log('[GameServer] Redis connected');

  // Create repositories
  const characterRepository = new CharacterRepository(db);
  const objectRepository = new ObjectRepository(db);

  // Create session store
  const sessionStore = new SessionStore(redisClient, {
    defaultTtlSeconds: config.gameServer?.sessionTimeout ?? 3600,
  });

  // Initialize DataTableManager
  const thisDir = typeof import.meta.dirname === 'string'
    ? import.meta.dirname
    : fileURLToPath(new URL('.', import.meta.url));
  const dataRoot = process.env['DATA_ROOT'] ?? resolve(thisDir, '../../..', 'data/serverdata');
  DataTableManager.install(dataRoot);
  const buildoutLoader = new BuildoutLoader(DataTableManager.getInstance());

  // Create character creation handler
  const characterCreationHandler = createCharacterCreationHandler(
    characterRepository,
    sessionStore,
    config.clusterIdNumeric ?? 1,
  );

  // Create zone service
  const zoneService = createZoneService(objectRepository, {
    viewDistance: config.gameServer?.viewDistance ?? 192,
    autoLoadZones: [
      'tatooine', 'naboo', 'corellia', 'talus', 'rori',
      'dantooine', 'dathomir', 'endor', 'lok', 'yavin4',
    ],
    enableAutoSave: true,
    autoSaveInterval: 300000,
    buildoutLoader,
  });

  // Create spawn manager
  const spawnManager = createSpawnManager(zoneService, {
    defaultRespawnDelay: 300000,
  });

  // Create movement handler
  const movementHandler = createMovementHandler({
    cellSize: config.gameServer?.spatialCellSize ?? 64,
    viewDistance: config.gameServer?.viewDistance ?? 192,
  });

  // Create UDP socket
  const { createSocket } = await import('node:dgram');
  const udpSocket = createSocket('udp4');

  // Create SOE session manager
  const sessionManager = new SessionManager({
    udpBufferSize: 496,
    sessionTimeout: 30000,
    resendTimeout: 500,
    maxRetries: 5,
    enableCompression: true,
    enableEncryption: true,
    tickInterval: 100,
  });

  // Extended game sessions (keyed by SOE session key)
  const extSessions = new Map<string, ExtendedGameSession>();

  // Legacy game sessions for movement handler (keyed by SOE session key)
  const gameSessions = new Map<string, GameSession>();
  const playerObjects = new Map<bigint, PlayerObject>();

  const serverPort = config.gameServer?.port ?? 44463;
  const bindAddress = config.gameServer?.bindAddress ?? '0.0.0.0';

  // -----------------------------------------------------------------------
  // Post-auth packets (HeartBeat + AccountFeatureBits + ClientPermissions)
  // -----------------------------------------------------------------------
  function sendPostAuthPackets(ext: ExtendedGameSession): void {
    if (ext.sentPostAuthPackets) return;

    const accountFeatureBits = serializeAccountFeatureBits(
      DefaultFeatureBits.game,
      DefaultFeatureBits.subscription,
      1,
      Math.floor(Date.now() / 1000),
    );

    const clientPermissions = createClientPermissionsMessage(
      true,  // canLogin
      true,  // canPlay
      false, // canSave
      true,  // canSendMail
      false, // isAdmin
    );

    sessionManager.sendReliableGroup(ext.soeSession, [
      serializeHeartBeat(),
      accountFeatureBits,
      clientPermissions,
    ]);

    ext.sentPostAuthPackets = true;
    console.log(`[GameServer] Sent post-auth packets to ${ext.soeSession.getKey()}`);
  }

  // -----------------------------------------------------------------------
  // Post-select packets (ChatServerStatus + VoiceChatStatus)
  // -----------------------------------------------------------------------
  function sendPostSelectPackets(ext: ExtendedGameSession): void {
    const chatStatus = serializeChatServerStatus(createChatServerStatus(true));
    const voiceStatus = serializeVoiceChatStatus(0);

    sessionManager.sendReliableGroup(ext.soeSession, [chatStatus, voiceStatus]);
    console.log(`[GameServer] Sent chat/voice status to ${ext.soeSession.getKey()}`);
  }

  // -----------------------------------------------------------------------
  // ClientIdMsg — authenticate the client, do NOT require characterId yet
  // -----------------------------------------------------------------------
  /**
   * Unpack a legacy KeyShare::Token envelope sent by the login server.
   * Format: u32LE cipherDataLen + u32LE dataLen + cipherData[cipherDataLen] + digest[16]
   * Returns the inner token bytes, or null if the envelope is invalid.
   */
  function tryUnpackLegacyLoginToken(tokenBytes: Uint8Array): Uint8Array | null {
    if (tokenBytes.length < 24) return null;
    const view = new DataView(tokenBytes.buffer, tokenBytes.byteOffset, tokenBytes.byteLength);
    const cipherDataLen = view.getUint32(0, true);
    const dataLen = view.getUint32(4, true);
    if (8 + cipherDataLen + 16 !== tokenBytes.length) return null;
    if (cipherDataLen !== dataLen || dataLen === 0) return null;
    return tokenBytes.subarray(8, 8 + dataLen);
  }

  function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function handleClientIdMsg(
    soeSession: Session,
    data: Uint8Array,
  ): Promise<void> {
    const clientKey = soeSession.getKey();
    console.log(`[GameServer] ClientIdMsg from ${clientKey}`);

    const message = deserializeClientIdMsg(data);
    const tokenBytes = new Uint8Array(message.token);
    const unpacked = tryUnpackLegacyLoginToken(tokenBytes);
    const token = bytesToHex(unpacked ?? tokenBytes);
    if (unpacked) {
      console.log(`[GameServer] Unpacked legacy token: ${tokenBytes.length} -> ${unpacked.length} bytes`);
    }

    console.log(`[GameServer] Token raw=${tokenBytes.length}bytes, unpacked=${unpacked ? unpacked.length + 'bytes' : 'null'}, hex=${token}`);

    const sessionData = await sessionStore.getSession(token);
    if (!sessionData) {
      console.log(`[GameServer] Invalid token from ${clientKey} (looked up: session:${token})`);
      sessionManager.disconnectSession(soeSession, DisconnectReason.Application);
      return;
    }

    console.log(`[GameServer] Authenticated account ${sessionData.accountId} from ${clientKey}`);

    const ext: ExtendedGameSession = {
      soeSession,
      sessionToken: token,
      authenticated: true,
      accountId: sessionData.accountId,
      sentPostAuthPackets: false,
    };
    extSessions.set(clientKey, ext);

    // Send post-auth packets immediately (like C++ ConnectionServer)
    sendPostAuthPackets(ext);

    // If the client already has a characterId in Redis (returning player
    // who previously selected a character), we could auto-zone, but the
    // SWG client always sends SelectCharacter explicitly after auth.
  }

  // -----------------------------------------------------------------------
  // SelectCharacter — load character from DB and zone in
  // -----------------------------------------------------------------------
  async function handleSelectCharacter(
    soeSession: Session,
    data: Uint8Array,
  ): Promise<void> {
    const clientKey = soeSession.getKey();
    const ext = extSessions.get(clientKey);
    if (!ext?.authenticated) {
      console.warn(`[GameServer] SelectCharacter from unauthenticated ${clientKey}`);
      return;
    }

    const msg = deserializeSelectCharacter(data);
    const characterId = msg.characterId;
    console.log(`[GameServer] SelectCharacter ${characterId} from ${clientKey}`);

    // Update Redis so other servers know the selected character
    await sessionStore.updateSession(ext.sessionToken, {
      characterId,
      lastActivity: Date.now(),
    });

    // Send chat/voice status (C++ sends these right after selection)
    sendPostSelectPackets(ext);

    // Load and zone in
    await loadAndZoneIn(ext, characterId);
  }

  // -----------------------------------------------------------------------
  // Character creation messages
  // -----------------------------------------------------------------------
  async function handleCharacterCreation(
    soeSession: Session,
    opcode: number,
    data: Uint8Array,
  ): Promise<void> {
    const clientKey = soeSession.getKey();
    const ext = extSessions.get(clientKey);
    if (!ext?.authenticated) {
      console.warn(`[GameServer] Character creation from unauthenticated ${clientKey}`);
      return;
    }

    const creationSession = {
      authenticated: true,
      accountId: ext.accountId,
    };

    if (opcode === CharacterCreationOpcode.ClientRandomNameRequest) {
      const msg = deserializeClientRandomNameRequest(data);
      const response = characterCreationHandler.handleRandomName(msg);
      sessionManager.sendReliable(soeSession, response);
      return;
    }

    if (opcode === CharacterCreationOpcode.ClientVerifyAndLockNameRequest) {
      const msg = deserializeClientVerifyAndLockNameRequest(data);
      const response = await characterCreationHandler.handleVerifyName(creationSession, msg);
      sessionManager.sendReliable(soeSession, response);
      return;
    }

    if (opcode === CharacterCreationOpcode.ClientCreateCharacter) {
      console.log(`[GameServer] ClientCreateCharacter from ${clientKey}`);
      const msg = deserializeClientCreateCharacter(data);
      const result = await characterCreationHandler.createCharacter(creationSession, msg);

      // Send success/failure response
      sessionManager.sendReliable(soeSession, result.response);

      if (result.success && result.characterId) {
        console.log(`[GameServer] Character created: ${msg.characterName} (ID: ${result.characterId})`);

        // Update Redis with the new characterId
        await sessionStore.updateSession(ext.sessionToken, {
          characterId: result.characterId,
          lastActivity: Date.now(),
        });

        // The client will send SelectCharacter next to trigger zone-in
      }
    }
  }

  // -----------------------------------------------------------------------
  // Load character from DB, build objects, and send the zone-in sequence
  // -----------------------------------------------------------------------
  async function loadAndZoneIn(
    ext: ExtendedGameSession,
    characterId: bigint,
  ): Promise<void> {
    const soeSession = ext.soeSession;
    const clientKey = soeSession.getKey();

    const character = await characterRepository.findByIdWithRelations(characterId);
    if (!character) {
      console.log(`[GameServer] Character ${characterId} not found for ${clientKey}`);
      sessionManager.disconnectSession(soeSession, DisconnectReason.Application);
      return;
    }

    console.log(`[GameServer] Loading character ${character.name} (${characterId}) for account ${ext.accountId}`);

    // Build in-memory PlayerObject for baselines
    const templatePath = character.templateName || 'object/creature/player/shared_human_male.iff';
    const templateCrc = calculateTemplateCrc(templatePath);
    const playerObj = new PlayerObjectClass(characterId, templateCrc);
    playerObj.objectNameStfFile = 'string_name';
    playerObj.objectNameStfName = character.name;
    playerObj.sceneId = character.sceneId;
    playerObj.position = {
      x: character.x ?? 0,
      y: character.y ?? 0,
      z: character.z ?? 0,
    };
    playerObj.orientation = {
      x: character.orientationX ?? 0,
      y: character.orientationY ?? 0,
      z: character.orientationZ ?? 0,
      w: character.orientationW ?? 1,
    };
    playerObj.accountId = BigInt(ext.accountId);

    if (character.skills) {
      for (const skill of character.skills) {
        playerObj.addSkill(skill.skillName);
      }
    }
    if (character.experience) {
      for (const xp of character.experience) {
        playerObj.setExperience(xp.experienceType, xp.amount);
      }
    }
    playerObj.startSession();

    // Movement-handler lightweight position tracker
    const movementPlayerObj: PlayerObject = {
      objectId: characterId,
      characterId,
      name: character.name,
      position: { x: character.x ?? 0, y: character.y ?? 0, z: character.z ?? 0 },
      yaw: 0,
      posture: Posture.UPRIGHT,
      speed: 0,
      movementState: movementHandler.getValidator().createInitialState(
        { x: character.x ?? 0, y: character.y ?? 0, z: character.z ?? 0 },
        1.0,
      ),
      speciesModifier: 1.0,
      zoneId: character.sceneId,
      gridX: Math.floor((character.x ?? 0) / 64),
      gridZ: Math.floor((character.z ?? 0) / 64),
    };

    const sendCallback = (packet: Uint8Array) => {
      sessionManager.sendReliable(soeSession, packet);
    };

    const gameSession: GameSession = {
      sessionId: soeSession.sessionId,
      address: soeSession.clientAddress.address,
      port: soeSession.clientAddress.port,
      authenticated: true,
      accountId: ext.accountId,
      characterId,
      player: movementPlayerObj,
      sendCallback,
    };

    ext.characterId = characterId;
    ext.movementSession = gameSession;
    gameSessions.set(clientKey, gameSession);
    playerObjects.set(characterId, movementPlayerObj);
    movementHandler.registerPlayer(gameSession, movementPlayerObj);

    // Send the zone-in packet sequence
    await sendZoneInSequence(playerObj, character, sendCallback);
  }

  // -----------------------------------------------------------------------
  // Zone-in packet sequence
  // Matches C++ server pcap: ParametersMessage → CmdStartScene →
  // SceneCreateObjectByCrc(CREO) → CREO baselines 1,3,4,6,8,9 →
  // SceneCreateObjectByCrc(PLAY) → UpdateContainment → PLAY baselines 3,6,8,9 →
  // SceneEndBaselines(PLAY) → UpdatePvpStatus → UpdatePosture →
  // SceneEndBaselines(CREO) → ServerTimeMessage
  // -----------------------------------------------------------------------
  async function sendZoneInSequence(
    playerObj: PlayerObjectClass,
    character: {
      sceneId: string;
      x: number; y: number; z: number;
      orientationX: number; orientationY: number; orientationZ: number; orientationW: number;
      templateName?: string;
    },
    send: SendReliable,
  ): Promise<void> {
    const creoId = playerObj.objectId;
    // PLAY is a separate object with its own ID (C++ allocates these independently)
    const playId = creoId + 1n;
    console.log(`[GameServer] Sending zone-in for CREO=${creoId} PLAY=${playId} to ${character.sceneId} (${character.x}, ${character.y}, ${character.z})`);

    const templatePath = character.templateName || 'object/creature/player/shared_human_male.iff';
    const galacticTime = BigInt(Math.floor(Date.now() / 1000));
    const serverEpoch = Math.floor(Date.now() / 1000);

    // 1. ParametersMessage — tells client weather update interval (required)
    send(serializeParametersMessage(createParametersMessage(900)));

    // 2. CmdStartScene — triggers the client loading screen
    const terrainFile = `terrain/${character.sceneId}.trn`;
    send(serializeCmdStartScene(createCmdStartScene(
      creoId,
      terrainFile,
      character.x, character.y, character.z,
      0,
      templatePath,
      galacticTime,
      serverEpoch,
    )));

    // 3. SceneCreateObjectByCrc — create the CREO (creature) object
    send(serializeSceneCreateObjectByCrc(createSceneCreateObjectByCrc(
      creoId,
      playerObj.templateCrc,
      character.x, character.y, character.z,
      character.orientationX, character.orientationY, character.orientationZ, character.orientationW,
      false,
    )));

    // 4. CREO baselines (1, 3, 4, 6, 8, 9) — all 6 packages
    sendCreatureBaselines(playerObj, creoId, send);

    // 5. SceneCreateObjectByCrc — create the PLAY object (separate from CREO)
    send(serializeSceneCreateObjectByCrc(createSceneCreateObjectByCrc(
      playId,
      TemplateCrc.PLAYER_OBJECT,
      0, 0, 0,  // PLAY object has no world position
      0, 0, 0, 1, // identity quaternion
      false,
    )));

    // 6. UpdateContainment — link PLAY to CREO (slot -1 = no specific slot)
    send(serializeUpdateContainment(createUpdateContainment(playId, creoId, -1)));

    // 7. PLAY baselines (3, 6, 8, 9) — sent to PLAY objectId
    sendPlayerBaselines(playerObj, playId, send);

    // 8. SceneEndBaselines for PLAY object
    send(serializeSceneEndBaselines(createSceneEndBaselines(playId)));

    // 9. UpdatePvpStatusMessage for player (flags: IsPlayer=0x10)
    send(createUpdatePvpStatusMessage(0x10, 0, creoId));

    // 10. UpdatePostureMessage for player
    send(createUpdatePostureMessage(Posture.UPRIGHT, creoId));

    // 11. SceneEndBaselines for CREO object (comes AFTER all child objects)
    send(serializeSceneEndBaselines(createSceneEndBaselines(creoId)));

    // 12. ServerTimeMessage — synchronize the client clock
    send(serializeServerTimeMessage(createServerTimeMessage(BigInt(Math.floor(Date.now() / 1000)))));

    console.log(`[GameServer] Zone-in sequence sent for CREO=${creoId} PLAY=${playId}`);
  }

  // -----------------------------------------------------------------------
  // SWG message dispatcher
  // -----------------------------------------------------------------------
  async function handleSwgMessage(soeSession: Session, data: Uint8Array): Promise<void> {
    const clientKey = soeSession.getKey();

    if (data.length < 1) {
      console.warn(`[GameServer] SWG message too short from ${clientKey}`);
      return;
    }

    // 4-byte opcode messages (preceded by u16 operandCount)
    if (data.length >= 6) {
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const opcode = view.getUint32(2, true);

      // ClientIdMsg — first message from client, before auth
      if (opcode === ConnectionMessageOpcode.ClientIdMsg) {
        await handleClientIdMsg(soeSession, data);
        return;
      }

      // SelectCharacter
      if (opcode === ConnectionMessageOpcode.SelectCharacter) {
        await handleSelectCharacter(soeSession, data);
        return;
      }

      // Character creation opcodes
      if (
        opcode === CharacterCreationOpcode.ClientCreateCharacter ||
        opcode === CharacterCreationOpcode.ClientVerifyAndLockNameRequest ||
        opcode === CharacterCreationOpcode.ClientRandomNameRequest
      ) {
        await handleCharacterCreation(soeSession, opcode, data);
        return;
      }
    }

    // Everything below requires an authenticated + zoned-in session
    const session = gameSessions.get(clientKey);
    if (!session) {
      // Not zoned in yet — might be a pre-zone message, just log it
      if (data.length >= 6) {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const opcode = view.getUint32(2, true);
        console.log(`[GameServer] Pre-zone message 0x${opcode.toString(16)} from ${clientKey}`);
      }
      return;
    }

    try {
      const firstByte = data[0];

      // Movement messages (single byte opcodes)
      if (firstByte === MovementMessageOpcode.DataTransform) {
        const message = deserializeDataTransform(data);
        movementHandler.handleDataTransform(session, message);
        if (session.player) {
          zoneService.updateObjectPosition(session.player.objectId, {
            x: message.transform.x,
            y: message.transform.y,
            z: message.transform.z,
          });
        }
        return;
      }

      if (firstByte === MovementMessageOpcode.DataTransformWithParent) {
        const message = deserializeDataTransformWithParent(data);
        movementHandler.handleDataTransformWithParent(session, message);
        if (session.player) {
          zoneService.updateObjectPosition(session.player.objectId, {
            x: message.transform.x,
            y: message.transform.y,
            z: message.transform.z,
          });
        }
        return;
      }

      // 4-byte opcode messages
      if (data.length >= 6) {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const opcode = view.getUint32(2, true);

        if (opcode === ZoneMessageOpcode.CmdSceneReady) {
          console.log(`[GameServer] CmdSceneReady from ${clientKey}`);
          if (session.player) {
            await zoneService.onSceneReady(session.player);
          }
          return;
        }

        if (!isZoneMessageOpcode(opcode)) {
          console.log(`[GameServer] Unknown opcode 0x${opcode.toString(16)} from ${clientKey}`);
        }
      }
    } catch (error) {
      console.error(`[GameServer] Error handling message from ${clientKey}:`, error);
    }
  }

  // -----------------------------------------------------------------------
  // Session cleanup
  // -----------------------------------------------------------------------
  async function cleanupGameSession(key: string): Promise<void> {
    const session = gameSessions.get(key);
    if (session) {
      if (session.player) {
        await zoneService.exitZone(session.player);
        movementHandler.unregisterPlayer(session.player.objectId);
        playerObjects.delete(session.player.objectId);
      }
      gameSessions.delete(key);
    }
    extSessions.delete(key);
  }

  function sendToPlayer(objectId: bigint, data: Uint8Array): void {
    for (const [, session] of gameSessions) {
      if (session.player?.objectId === objectId && session.sendCallback) {
        session.sendCallback(data);
        return;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Wire up SOE session manager
  // -----------------------------------------------------------------------
  zoneService.setSendCallback(sendToPlayer);

  sessionManager.setSendCallback((data, address, port) => {
    udpSocket.send(data, port, address);
  });

  sessionManager.on('session:connected', (session: Session) => {
    console.log(`[GameServer] Session connected: ${session.getKey()}`);
  });

  sessionManager.on('session:disconnected', (session: Session, reason: number) => {
    const key = session.getKey();
    console.log(`[GameServer] Session disconnected: ${key}, reason: ${reason}`);
    void cleanupGameSession(key);
  });

  sessionManager.on('data', (session: Session, data: Uint8Array) => {
    void handleSwgMessage(session, data);
  });

  sessionManager.on('error', (error: Error, session?: Session) => {
    if (session) {
      console.error(`[GameServer] Error for ${session.getKey()}:`, error);
    } else {
      console.error('[GameServer] Error:', error);
    }
  });

  let running = false;

  return {
    async start(): Promise<void> {
      if (running) throw new Error('Server is already running');

      await zoneService.initialize();
      console.log('[GameServer] Zone service initialized');

      await spawnManager.initialize();
      console.log('[GameServer] Spawn manager initialized');

      return new Promise((resolve, reject) => {
        udpSocket.on('message', (msg, rinfo) => {
          console.log(`[GameServer] UDP recv ${rinfo.address}:${rinfo.port} len=${msg.length} hex=[${Array.from(msg.subarray(0, Math.min(16, msg.length))).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`);

          // C++ ConnectionServer echoes short probe packets (1-4 bytes) so
          // the client can measure cluster latency before establishing an SOE
          // session.  Without this the client considers the server unreachable.
          if (msg.length > 0 && msg.length <= 4) {
            console.log(`[GameServer] Echoing ping probe from ${rinfo.address}:${rinfo.port}`);
            udpSocket.send(msg, rinfo.port, rinfo.address);
            return;
          }

          sessionManager.handlePacket(new Uint8Array(msg), {
            address: rinfo.address,
            port: rinfo.port,
          });
        });

        udpSocket.on('error', (error) => {
          console.error('[GameServer] UDP error:', error);
          if (!running) reject(error);
        });

        udpSocket.bind(serverPort, bindAddress, () => {
          sessionManager.start();
          running = true;
          console.log(`[GameServer] Started on ${bindAddress}:${serverPort}`);
          resolve();
        });
      });
    },

    async stop(): Promise<void> {
      if (!running) return;

      sessionManager.stop();
      for (const session of sessionManager.getSessions()) {
        sessionManager.disconnectSession(session, DisconnectReason.Application);
      }
      for (const key of gameSessions.keys()) {
        await cleanupGameSession(key);
      }
      await spawnManager.shutdown();
      console.log('[GameServer] Spawn manager shutdown');
      await zoneService.shutdown();
      console.log('[GameServer] Zone service shutdown');
      sessionManager.destroy();

      return new Promise((resolve) => {
        udpSocket.close(() => {
          redisClient.disconnect()
            .then(() => { running = false; console.log('[GameServer] Stopped'); resolve(); })
            .catch((error) => { console.error('[GameServer] Redis disconnect error:', error); running = false; resolve(); });
        });
      });
    },

    isRunning: () => running,
    getConnectionCount: () => sessionManager.getSessionCount(),
    getPlayerCount: () => playerObjects.size,
    getZoneService: () => zoneService,
    getSpawnManager: () => spawnManager,
  };
}
