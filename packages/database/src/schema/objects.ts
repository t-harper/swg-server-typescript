/**
 * Object Schema
 * Database schema for game objects, tangibles, and creatures
 */

import {
  bigint,
  boolean,
  datetime,
  float,
  index,
  int,
  mysqlTable,
  tinyint,
  varchar,
  blob,
} from 'drizzle-orm/mysql-core';
import { relations, sql } from 'drizzle-orm';

/**
 * Objects table schema
 * Base table for all persistent game objects
 */
export const objects = mysqlTable(
  'objects',
  {
    /** Snowflake-style 64-bit object ID */
    objectId: bigint('object_id', { mode: 'bigint' }).primaryKey(),
    /** CRC32 hash of the template string (.iff file path) */
    templateCrc: int('template_crc').notNull(),
    /** Object type enum value from ObjectType */
    typeId: int('type_id').notNull(),
    /** Parent container object ID (null if in world) */
    containerId: bigint('container_id', { mode: 'bigint' }),
    /** Slot arrangement index within container (-1 if not slotted) */
    slotArrangement: int('slot_arrangement').notNull().default(-1),
    /** Scene/zone name (empty if in a container) */
    sceneId: varchar('scene_id', { length: 50 }),
    /** X coordinate in world or cell */
    x: float('x').notNull().default(0),
    /** Y coordinate (height) */
    y: float('y').notNull().default(0),
    /** Z coordinate in world or cell */
    z: float('z').notNull().default(0),
    /** Orientation quaternion W component */
    orientationW: float('orientation_w').notNull().default(1),
    /** Orientation quaternion X component */
    orientationX: float('orientation_x').notNull().default(0),
    /** Orientation quaternion Y component */
    orientationY: float('orientation_y').notNull().default(0),
    /** Orientation quaternion Z component */
    orientationZ: float('orientation_z').notNull().default(0),
    /** Whether to load container contents on object load */
    loadContents: boolean('load_contents').notNull().default(true),
    /** Object name STF file reference */
    objectNameStfFile: varchar('object_name_stf_file', { length: 100 }),
    /** Object name STF key */
    objectNameStfName: varchar('object_name_stf_name', { length: 100 }),
    /** Object scale factor */
    scale: float('scale').notNull().default(1.0),
    /** Volume consumed in containers */
    volume: int('volume').notNull().default(1),
    /** Complexity value for crafting */
    objectComplexity: float('object_complexity').notNull().default(0),
    /** Creation timestamp */
    createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    /** Last update timestamp */
    updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_objects_template_crc').on(table.templateCrc),
    index('idx_objects_type_id').on(table.typeId),
    index('idx_objects_container_id').on(table.containerId),
    index('idx_objects_scene_id').on(table.sceneId),
    index('idx_objects_scene_position').on(table.sceneId, table.x, table.z),
  ]
);

/**
 * Object tangibles table schema
 * Extended data for tangible objects (items, containers, equipment, etc.)
 */
export const objectTangibles = mysqlTable('object_tangibles', {
  /** Object ID foreign key */
  objectId: bigint('object_id', { mode: 'bigint' })
    .primaryKey()
    .references(() => objects.objectId, { onDelete: 'cascade' }),
  /** Player-assigned custom name */
  customName: varchar('custom_name', { length: 255 }),
  /** Current condition/durability */
  condition: int('condition').notNull().default(100),
  /** Maximum condition/durability */
  maxCondition: int('max_condition').notNull().default(100),
  /** PvP status bitmask */
  pvpStatus: int('pvp_status').notNull().default(0),
  /** Faction CRC (0 = neutral) */
  pvpFaction: int('pvp_faction').notNull().default(0),
  /** Options bitmask (TangibleOptions) */
  optionsBitmask: int('options_bitmask').notNull().default(0),
  /** Item count for stackable items */
  count: int('count').notNull().default(1),
  /** Maximum hit points */
  maxHitPoints: int('max_hit_points').notNull().default(0),
  /** Owner object ID (for bio-linked items) */
  ownerId: bigint('owner_id', { mode: 'bigint' }),
  /** Crafter character ID */
  craftedById: bigint('crafted_by_id', { mode: 'bigint' }),
  /** Serial number for crafted items */
  serialNumber: bigint('serial_number', { mode: 'bigint' }),
  /** Current use count */
  useCount: int('use_count').notNull().default(0),
  /** Maximum uses (-1 = unlimited) */
  maxUseCount: int('max_use_count').notNull().default(-1),
  /** Appearance/customization data */
  appearanceData: blob('appearance_data'),
  /** Armor rating */
  armorRating: int('armor_rating').notNull().default(0),
});

/**
 * Object creatures table schema
 * Extended data for creature objects (NPCs, players)
 */
export const objectCreatures = mysqlTable(
  'object_creatures',
  {
    /** Object ID foreign key */
    objectId: bigint('object_id', { mode: 'bigint' })
      .primaryKey()
      .references(() => objects.objectId, { onDelete: 'cascade' }),
    /** Species/race ID */
    speciesId: int('species_id').notNull().default(0),
    /** Current posture (standing, sitting, prone, etc.) */
    posture: tinyint('posture').notNull().default(0),
    /** Current locomotion mode (walking, running, etc.) */
    locomotion: tinyint('locomotion').notNull().default(0),
    /** Current health attribute */
    currentHealth: int('current_health').notNull().default(0),
    /** Maximum health attribute */
    maxHealth: int('max_health').notNull().default(0),
    /** Health wounds */
    healthWounds: int('health_wounds').notNull().default(0),
    /** Current action attribute */
    currentAction: int('current_action').notNull().default(0),
    /** Maximum action attribute */
    maxAction: int('max_action').notNull().default(0),
    /** Action wounds */
    actionWounds: int('action_wounds').notNull().default(0),
    /** Current mind attribute */
    currentMind: int('current_mind').notNull().default(0),
    /** Maximum mind attribute */
    maxMind: int('max_mind').notNull().default(0),
    /** Mind wounds */
    mindWounds: int('mind_wounds').notNull().default(0),
    /** Combat level */
    level: int('level').notNull().default(1),
    /** Faction name/identifier */
    faction: varchar('faction', { length: 50 }),
    /** Current mood ID */
    moodId: int('mood_id').notNull().default(0),
    /** State flags bitmask */
    stateFlags: bigint('state_flags', { mode: 'bigint' }).notNull().default(0n),
    /** Current target object ID */
    targetId: bigint('target_id', { mode: 'bigint' }),
  },
  (table) => [
    index('idx_object_creatures_species').on(table.speciesId),
    index('idx_object_creatures_level').on(table.level),
    index('idx_object_creatures_faction').on(table.faction),
  ]
);

/**
 * Object dirty tracking table
 * Tracks which objects have been modified since last save
 */
export const objectDirtyTracking = mysqlTable(
  'object_dirty_tracking',
  {
    /** Object ID */
    objectId: bigint('object_id', { mode: 'bigint' })
      .primaryKey()
      .references(() => objects.objectId, { onDelete: 'cascade' }),
    /** Whether the base object data is dirty */
    baseObjectDirty: boolean('base_object_dirty').notNull().default(false),
    /** Whether tangible data is dirty */
    tangibleDirty: boolean('tangible_dirty').notNull().default(false),
    /** Whether creature data is dirty */
    creatureDirty: boolean('creature_dirty').notNull().default(false),
    /** Last saved timestamp */
    lastSavedAt: datetime('last_saved_at'),
    /** Dirty properties JSON array */
    dirtyProperties: varchar('dirty_properties', { length: 1000 }),
  },
  (table) => [
    index('idx_dirty_tracking_base').on(table.baseObjectDirty),
    index('idx_dirty_tracking_tangible').on(table.tangibleDirty),
    index('idx_dirty_tracking_creature').on(table.creatureDirty),
  ]
);

/**
 * Objects relations
 */
export const objectsRelations = relations(objects, ({ one, many }) => ({
  container: one(objects, {
    fields: [objects.containerId],
    references: [objects.objectId],
    relationName: 'containerRelation',
  }),
  contents: many(objects, { relationName: 'containerRelation' }),
  tangible: one(objectTangibles, {
    fields: [objects.objectId],
    references: [objectTangibles.objectId],
  }),
  creature: one(objectCreatures, {
    fields: [objects.objectId],
    references: [objectCreatures.objectId],
  }),
  dirtyTracking: one(objectDirtyTracking, {
    fields: [objects.objectId],
    references: [objectDirtyTracking.objectId],
  }),
}));

/**
 * Object tangibles relations
 */
export const objectTangiblesRelations = relations(
  objectTangibles,
  ({ one }) => ({
    object: one(objects, {
      fields: [objectTangibles.objectId],
      references: [objects.objectId],
    }),
  })
);

/**
 * Object creatures relations
 */
export const objectCreaturesRelations = relations(
  objectCreatures,
  ({ one }) => ({
    object: one(objects, {
      fields: [objectCreatures.objectId],
      references: [objects.objectId],
    }),
  })
);

/**
 * Object dirty tracking relations
 */
export const objectDirtyTrackingRelations = relations(
  objectDirtyTracking,
  ({ one }) => ({
    object: one(objects, {
      fields: [objectDirtyTracking.objectId],
      references: [objects.objectId],
    }),
  })
);

/**
 * Object insert type
 */
export type NewObject = typeof objects.$inferInsert;

/**
 * Object select type
 */
export type GameObject = typeof objects.$inferSelect;

/**
 * Object tangible insert type
 */
export type NewObjectTangible = typeof objectTangibles.$inferInsert;

/**
 * Object tangible select type
 */
export type ObjectTangible = typeof objectTangibles.$inferSelect;

/**
 * Object creature insert type
 */
export type NewObjectCreature = typeof objectCreatures.$inferInsert;

/**
 * Object creature select type
 */
export type ObjectCreature = typeof objectCreatures.$inferSelect;

/**
 * Object dirty tracking insert type
 */
export type NewObjectDirtyTracking = typeof objectDirtyTracking.$inferInsert;

/**
 * Object dirty tracking select type
 */
export type ObjectDirtyTracking = typeof objectDirtyTracking.$inferSelect;

/**
 * Combined object data type (object + type-specific data)
 */
export interface ObjectWithRelations extends GameObject {
  tangible?: ObjectTangible | null;
  creature?: ObjectCreature | null;
  dirtyTracking?: ObjectDirtyTracking | null;
}
