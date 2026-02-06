/**
 * Zone Handler
 *
 * The main zone-in orchestrator. When a player selects a character, this
 * handles the full zone-in sequence by sending the required packet series:
 *
 * 1. CmdStartScene - Tells the client to begin loading the scene/terrain
 * 2. SceneCreateObjectByCrc - Creates the player object in the scene
 * 3. Baselines (CREO 1,3,4,6 + PLAY 3,6,8,9) - Full object state
 * 4. SceneEndBaselines - Signals all baselines for the object are sent
 * 5. ServerTimeMessage - Synchronizes the client clock
 */

import {
  createCmdStartScene,
  serializeCmdStartScene,
  createSceneCreateObjectByCrc,
  serializeSceneCreateObjectByCrc,
  createSceneEndBaselines,
  serializeSceneEndBaselines,
  createServerTimeMessage,
  serializeServerTimeMessage,
} from '@swg/protocol';
import type { CreatureObject, PlayerObject } from '@swg/objects';
import { DEFAULT_PLAYER_TEMPLATE_CRC } from '@swg/objects';
import { sendAllPlayerBaselines, type SendReliable } from '../services/baseline-sender.js';

/**
 * Data required to zone a player into the game world
 */
export interface ZoneInData {
  characterId: bigint;
  sceneId: string;
  x: number;
  y: number;
  z: number;
  orientationX: number;
  orientationY: number;
  orientationZ: number;
  orientationW: number;
  templateCrc: number;
  templateName: string;
}

/**
 * Result of a zone-in attempt
 */
export interface ZoneInResult {
  success: boolean;
  error?: string;
}

/**
 * Send the full zone-in packet sequence to a client.
 *
 * This is the core of the character login flow -- after the client selects a
 * character and the server loads their data from the database, this function
 * sends the ordered set of packets that the SWG client expects in order to
 * render the player in-world.
 */
export function sendZoneIn(
  data: ZoneInData,
  creature: CreatureObject,
  player: PlayerObject,
  send: SendReliable
): ZoneInResult {
  try {
    const templateCrc = data.templateCrc || DEFAULT_PLAYER_TEMPLATE_CRC;
    const templateName = data.templateName || 'object/creature/player/shared_human_male.iff';
    const galacticTime = BigInt(Math.floor(Date.now() / 1000));
    const serverEpoch = Math.floor(Date.now() / 1000);

    // 1. CmdStartScene -- triggers the client loading screen
    // sceneName is the scene ID (e.g., "tatooine"), NOT the terrain file path
    const startScene = createCmdStartScene(
      data.characterId,
      data.sceneId,       // scene name like "tatooine"
      data.x, data.y, data.z,
      0,                  // startYaw
      templateName,       // template path string
      galacticTime,
      serverEpoch
    );
    send(serializeCmdStartScene(startScene));

    // 2. SceneCreateObjectByCrc -- creates the player object in the scene
    const createObj = createSceneCreateObjectByCrc(
      data.characterId,
      templateCrc,
      data.x, data.y, data.z,
      data.orientationX, data.orientationY,
      data.orientationZ, data.orientationW,
      false // not hyperspace
    );
    send(serializeSceneCreateObjectByCrc(createObj));

    // 3. Send all baselines (CREO + PLAY)
    sendAllPlayerBaselines(creature, player, data.characterId, send);

    // 4. SceneEndBaselines -- signals that all baselines for the player are done
    const endBaselines = createSceneEndBaselines(data.characterId);
    send(serializeSceneEndBaselines(endBaselines));

    // 5. ServerTimeMessage -- synchronize the client clock
    const serverTime = createServerTimeMessage(galacticTime);
    send(serializeServerTimeMessage(serverTime));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during zone-in',
    };
  }
}
