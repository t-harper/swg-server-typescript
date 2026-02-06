/**
 * Object Commands
 * GM commands for object manipulation including spawning, destruction,
 * item giving, and object property modification
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  type CommandDefinition,
  type CommandContext,
  type CommandResult,
  AdminLevel,
  CommandCategory,
  successResult,
  errorResult,
} from '../command-types.js';

/**
 * Spawned object info returned by spawn handlers
 */
export interface SpawnedObjectInfo {
  objectId: ObjectId;
  templatePath: string;
  position: Vector3;
}

/**
 * Spawn object function type
 */
export type SpawnObjectFn = (
  templatePath: string,
  position: Vector3,
  heading?: number,
  zoneId?: string
) => Promise<SpawnedObjectInfo | undefined>;

/**
 * Destroy object function type
 */
export type DestroyObjectFn = (objectId: ObjectId) => Promise<boolean>;

/**
 * Give item to player function type
 */
export type GiveItemFn = (
  playerId: ObjectId,
  templatePath: string,
  count: number
) => Promise<{ itemId: ObjectId; templatePath: string } | undefined>;

/**
 * Move object function type
 */
export type MoveObjectFn = (
  objectId: ObjectId,
  x: number,
  y: number,
  z: number
) => Promise<boolean>;

/**
 * Rotate object function type
 */
export type RotateObjectFn = (
  objectId: ObjectId,
  heading: number
) => Promise<boolean>;

/**
 * Set object name function type
 */
export type SetObjectNameFn = (
  objectId: ObjectId,
  name: string
) => Promise<boolean>;

/**
 * Get player position function type
 */
export type GetPlayerPositionFn = (playerId: ObjectId) => Promise<{
  position: Vector3;
  zoneId: string;
  heading: number;
} | undefined>;

/**
 * Player lookup function type
 */
export type PlayerLookupFn = (name: string) => Promise<{
  objectId: ObjectId;
  name: string;
} | undefined>;

/**
 * Options for object command handlers
 */
export interface ObjectCommandHandlerOptions {
  /** Function to spawn objects */
  spawnObject: SpawnObjectFn;
  /** Function to destroy objects */
  destroyObject: DestroyObjectFn;
  /** Function to give items to players */
  giveItem: GiveItemFn;
  /** Function to move objects */
  moveObject: MoveObjectFn;
  /** Function to rotate objects */
  rotateObject: RotateObjectFn;
  /** Function to set object names */
  setObjectName: SetObjectNameFn;
  /** Function to get player position */
  getPlayerPosition: GetPlayerPositionFn;
  /** Function to look up players by name */
  playerLookup: PlayerLookupFn;
}

/**
 * Common object template prefixes for validation
 */
const TEMPLATE_PREFIXES = [
  'object/creature/',
  'object/mobile/',
  'object/tangible/',
  'object/static/',
  'object/building/',
  'object/installation/',
  'object/weapon/',
  'object/armor/',
  'object/resource/',
  'object/draft_schematic/',
  'object/intangible/',
];

/**
 * Validate and normalize a template path
 */
function normalizeTemplatePath(input: string): string {
  let path = input.toLowerCase();

  // Add object/ prefix if missing
  if (!path.startsWith('object/')) {
    // Check if it starts with a known subpath
    for (const prefix of TEMPLATE_PREFIXES) {
      const subpath = prefix.replace('object/', '');
      if (path.startsWith(subpath)) {
        path = 'object/' + path;
        break;
      }
    }
  }

  // Add .iff extension if missing
  if (!path.endsWith('.iff')) {
    path += '.iff';
  }

  return path;
}

/**
 * Create object command definitions
 */
export function createObjectCommands(
  handlers: ObjectCommandHandlerOptions
): CommandDefinition[] {
  const commands: CommandDefinition[] = [];

  // /spawn command
  commands.push({
    name: 'spawn',
    aliases: ['create', 'summon'],
    category: CommandCategory.OBJECT,
    minLevel: AdminLevel.QA,
    usage: '/spawn <template> [heading]',
    description: 'Spawn an object or creature at your location',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, executorId } = context;

      if (args.length < 1) {
        return errorResult('Usage: /spawn <template> [heading]');
      }

      // Get executor position
      const playerInfo = await handlers.getPlayerPosition(executorId);
      if (!playerInfo) {
        return errorResult('Could not determine your position');
      }

      const templatePath = normalizeTemplatePath(args[0]!);

      // Optional heading
      let heading = playerInfo.heading;
      if (args.length >= 2) {
        const parsedHeading = parseFloat(args[1]!);
        if (!isNaN(parsedHeading)) {
          // Convert degrees to radians if > 2*PI
          heading = parsedHeading > 6.28
            ? (parsedHeading * Math.PI) / 180
            : parsedHeading;
        }
      }

      // Spawn slightly in front of the player
      const spawnDistance = 3;
      const spawnPosition: Vector3 = {
        x: playerInfo.position.x + Math.sin(playerInfo.heading) * spawnDistance,
        y: playerInfo.position.y,
        z: playerInfo.position.z + Math.cos(playerInfo.heading) * spawnDistance,
      };

      const result = await handlers.spawnObject(
        templatePath,
        spawnPosition,
        heading,
        playerInfo.zoneId
      );

      if (result) {
        return successResult(
          `Spawned ${templatePath} (ID: ${result.objectId}) at ` +
            `(${result.position.x.toFixed(1)}, ${result.position.y.toFixed(1)}, ${result.position.z.toFixed(1)})`
        );
      }

      return errorResult(`Failed to spawn '${templatePath}'`);
    },
  });

  // /destroy command
  commands.push({
    name: 'destroy',
    aliases: ['delete', 'remove'],
    category: CommandCategory.OBJECT,
    minLevel: AdminLevel.QA,
    usage: '/destroy [@target|objectId]',
    description: 'Destroy an object or your current target',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, targetId } = context;

      let objectId: ObjectId;

      if (args.length >= 1) {
        const arg = args[0]!;
        if (arg === '@target') {
          if (!targetId) {
            return errorResult('No target selected');
          }
          objectId = targetId;
        } else {
          try {
            objectId = BigInt(arg);
          } catch {
            return errorResult(`Invalid object ID: ${arg}`);
          }
        }
      } else {
        // Default to current target
        if (!targetId) {
          return errorResult('Usage: /destroy [@target|objectId]');
        }
        objectId = targetId;
      }

      const success = await handlers.destroyObject(objectId);

      if (success) {
        return successResult(`Destroyed object ${objectId}`);
      }

      return errorResult(`Failed to destroy object ${objectId}`);
    },
  });

  // /give command
  commands.push({
    name: 'give',
    aliases: ['giveitem', 'item'],
    category: CommandCategory.OBJECT,
    minLevel: AdminLevel.QA,
    usage: '/give [player] <item_template> [count]',
    description: 'Give an item to yourself or another player',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, executorId } = context;

      if (args.length < 1) {
        return errorResult('Usage: /give [player] <item_template> [count]');
      }

      let targetId = executorId;
      let templateIndex = 0;

      // Check if first arg is a player name
      if (args.length >= 2) {
        const firstArg = args[0]!;
        if (firstArg === '@self') {
          targetId = executorId;
          templateIndex = 1;
        } else if (firstArg === '@target') {
          if (!context.targetId) {
            return errorResult('No target selected');
          }
          targetId = context.targetId;
          templateIndex = 1;
        } else {
          // Try to look up as player
          const player = await handlers.playerLookup(firstArg);
          if (player) {
            targetId = player.objectId;
            templateIndex = 1;
          }
        }
      }

      const templatePath = normalizeTemplatePath(args[templateIndex]!);

      // Optional count
      let count = 1;
      if (args.length > templateIndex + 1) {
        const parsedCount = parseInt(args[templateIndex + 1]!, 10);
        if (!isNaN(parsedCount) && parsedCount > 0) {
          count = Math.min(parsedCount, 100); // Cap at 100 items
        }
      }

      const result = await handlers.giveItem(targetId, templatePath, count);

      if (result) {
        const countStr = count > 1 ? ` x${count}` : '';
        return successResult(`Gave ${templatePath}${countStr} (ID: ${result.itemId})`);
      }

      return errorResult(`Failed to give '${templatePath}'`);
    },
  });

  // /move command
  commands.push({
    name: 'move',
    aliases: ['moveobj', 'setpos'],
    category: CommandCategory.OBJECT,
    minLevel: AdminLevel.QA,
    usage: '/move <x> <y> <z> [@target|objectId]',
    description: 'Move an object to specified coordinates',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, targetId } = context;

      if (args.length < 3) {
        return errorResult('Usage: /move <x> <y> <z> [@target|objectId]');
      }

      const x = parseFloat(args[0]!);
      const y = parseFloat(args[1]!);
      const z = parseFloat(args[2]!);

      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        return errorResult('Invalid coordinates');
      }

      // Check coordinate bounds
      const MAX_COORD = 16384;
      if (Math.abs(x) > MAX_COORD || Math.abs(z) > MAX_COORD) {
        return errorResult(`Coordinates out of bounds (max: +/-${MAX_COORD})`);
      }

      let objectId: ObjectId;
      if (args.length >= 4) {
        const arg = args[3]!;
        if (arg === '@target') {
          if (!targetId) {
            return errorResult('No target selected');
          }
          objectId = targetId;
        } else {
          try {
            objectId = BigInt(arg);
          } catch {
            return errorResult(`Invalid object ID: ${arg}`);
          }
        }
      } else {
        if (!targetId) {
          return errorResult('Must specify an object or have a target');
        }
        objectId = targetId;
      }

      const success = await handlers.moveObject(objectId, x, y, z);

      if (success) {
        return successResult(
          `Moved object ${objectId} to (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`
        );
      }

      return errorResult('Failed to move object');
    },
  });

  // /rotate command
  commands.push({
    name: 'rotate',
    aliases: ['setrotation', 'heading'],
    category: CommandCategory.OBJECT,
    minLevel: AdminLevel.QA,
    usage: '/rotate <heading> [@target|objectId]',
    description: 'Set an object\'s rotation (heading in degrees or radians)',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, targetId } = context;

      if (args.length < 1) {
        return errorResult('Usage: /rotate <heading> [@target|objectId]');
      }

      let heading = parseFloat(args[0]!);
      if (isNaN(heading)) {
        return errorResult('Invalid heading value');
      }

      // Convert degrees to radians if value is > 2*PI
      if (heading > 6.28) {
        heading = (heading * Math.PI) / 180;
      }

      let objectId: ObjectId;
      if (args.length >= 2) {
        const arg = args[1]!;
        if (arg === '@target') {
          if (!targetId) {
            return errorResult('No target selected');
          }
          objectId = targetId;
        } else {
          try {
            objectId = BigInt(arg);
          } catch {
            return errorResult(`Invalid object ID: ${arg}`);
          }
        }
      } else {
        if (!targetId) {
          return errorResult('Must specify an object or have a target');
        }
        objectId = targetId;
      }

      const success = await handlers.rotateObject(objectId, heading);

      if (success) {
        const degrees = (heading * 180) / Math.PI;
        return successResult(
          `Rotated object ${objectId} to ${degrees.toFixed(1)} degrees`
        );
      }

      return errorResult('Failed to rotate object');
    },
  });

  // /setname command
  commands.push({
    name: 'setname',
    aliases: ['rename', 'name'],
    category: CommandCategory.OBJECT,
    minLevel: AdminLevel.QA,
    usage: '/setname <name> [@target|objectId]',
    description: 'Set the display name of an object',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, targetId } = context;

      if (args.length < 1) {
        return errorResult('Usage: /setname <name> [@target|objectId]');
      }

      // Find where the name ends and objectId begins
      let name: string;
      let objectId: ObjectId;

      const lastArg = args[args.length - 1]!;
      if (lastArg === '@target') {
        if (!targetId) {
          return errorResult('No target selected');
        }
        objectId = targetId;
        name = args.slice(0, -1).join(' ');
      } else if (/^\d+$/.test(lastArg)) {
        try {
          objectId = BigInt(lastArg);
          name = args.slice(0, -1).join(' ');
        } catch {
          // Last arg isn't an object ID, so treat entire args as name
          if (!targetId) {
            return errorResult('Must specify an object or have a target');
          }
          objectId = targetId;
          name = args.join(' ');
        }
      } else {
        if (!targetId) {
          return errorResult('Must specify an object or have a target');
        }
        objectId = targetId;
        name = args.join(' ');
      }

      if (name.length === 0) {
        return errorResult('Name cannot be empty');
      }

      if (name.length > 64) {
        return errorResult('Name too long (max 64 characters)');
      }

      const success = await handlers.setObjectName(objectId, name);

      if (success) {
        return successResult(`Set name of object ${objectId} to '${name}'`);
      }

      return errorResult('Failed to set object name');
    },
  });

  return commands;
}

/**
 * Register all object commands with a registry
 */
export function registerObjectCommands(
  registry: { registerCommand: (def: CommandDefinition) => void },
  handlers: ObjectCommandHandlerOptions
): void {
  const commands = createObjectCommands(handlers);
  for (const command of commands) {
    registry.registerCommand(command);
  }
}
