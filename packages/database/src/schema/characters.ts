/**
 * Character Schema
 * Database schema for player characters, appearance, skills, and experience
 */

import {
  bigint,
  customType,
  datetime,
  float,
  index,
  int,
  mysqlTable,
  primaryKey,
  varchar,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

const blob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'blob';
  },
});
import { accounts } from './accounts.js';

/**
 * Characters table schema
 * Stores core character data including position and orientation
 */
export const characters = mysqlTable(
  'characters',
  {
    characterId: bigint('character_id', { mode: 'bigint' }).primaryKey(),
    accountId: int('account_id')
      .notNull()
      .references(() => accounts.accountId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    sceneId: varchar('scene_id', { length: 50 }).notNull(),
    x: float('x').notNull().default(0),
    y: float('y').notNull().default(0),
    z: float('z').notNull().default(0),
    orientationX: float('orientation_x').notNull().default(0),
    orientationY: float('orientation_y').notNull().default(0),
    orientationZ: float('orientation_z').notNull().default(0),
    orientationW: float('orientation_w').notNull().default(1),
    templateName: varchar('template_name', { length: 255 })
      .notNull()
      .default('object/creature/player/shared_human_male.iff'),
    createdAt: datetime('created_at').notNull().default(new Date()),
    lastSaved: datetime('last_saved'),
  },
  (table) => ({
    accountIdIdx: index('idx_characters_account_id').on(table.accountId),
    nameIdx: index('idx_characters_name').on(table.name),
    sceneIdIdx: index('idx_characters_scene_id').on(table.sceneId),
  })
);

/**
 * Character appearance table schema
 * Stores character customization and visual data
 */
export const characterAppearance = mysqlTable('character_appearance', {
  characterId: bigint('character_id', { mode: 'bigint' })
    .primaryKey()
    .references(() => characters.characterId, { onDelete: 'cascade' }),
  customizationData: blob('customization_data'),
  scale: float('scale').notNull().default(1.0),
});

/**
 * Character skills table schema
 * Stores acquired skills for each character
 */
export const characterSkills = mysqlTable(
  'character_skills',
  {
    characterId: bigint('character_id', { mode: 'bigint' })
      .notNull()
      .references(() => characters.characterId, { onDelete: 'cascade' }),
    skillName: varchar('skill_name', { length: 100 }).notNull(),
    acquiredAt: datetime('acquired_at').notNull().default(new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.skillName] }),
    characterIdIdx: index('idx_character_skills_character_id').on(table.characterId),
    skillNameIdx: index('idx_character_skills_skill_name').on(table.skillName),
  })
);

/**
 * Character experience table schema
 * Stores experience points by type for each character
 */
export const characterExperience = mysqlTable(
  'character_experience',
  {
    characterId: bigint('character_id', { mode: 'bigint' })
      .notNull()
      .references(() => characters.characterId, { onDelete: 'cascade' }),
    experienceType: varchar('experience_type', { length: 50 }).notNull(),
    amount: int('amount').notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.experienceType] }),
    characterIdIdx: index('idx_character_experience_character_id').on(table.characterId),
    experienceTypeIdx: index('idx_character_experience_type').on(table.experienceType),
  })
);

/**
 * Character relations
 */
export const charactersRelations = relations(characters, ({ one, many }) => ({
  account: one(accounts, {
    fields: [characters.accountId],
    references: [accounts.accountId],
  }),
  appearance: one(characterAppearance, {
    fields: [characters.characterId],
    references: [characterAppearance.characterId],
  }),
  skills: many(characterSkills),
  experience: many(characterExperience),
}));

/**
 * Character appearance relations
 */
export const characterAppearanceRelations = relations(
  characterAppearance,
  ({ one }) => ({
    character: one(characters, {
      fields: [characterAppearance.characterId],
      references: [characters.characterId],
    }),
  })
);

/**
 * Character skills relations
 */
export const characterSkillsRelations = relations(
  characterSkills,
  ({ one }) => ({
    character: one(characters, {
      fields: [characterSkills.characterId],
      references: [characters.characterId],
    }),
  })
);

/**
 * Character experience relations
 */
export const characterExperienceRelations = relations(
  characterExperience,
  ({ one }) => ({
    character: one(characters, {
      fields: [characterExperience.characterId],
      references: [characters.characterId],
    }),
  })
);

/**
 * Character insert type
 */
export type NewCharacter = typeof characters.$inferInsert;

/**
 * Character select type
 */
export type Character = typeof characters.$inferSelect;

/**
 * Character appearance insert type
 */
export type NewCharacterAppearance = typeof characterAppearance.$inferInsert;

/**
 * Character appearance select type
 */
export type CharacterAppearance = typeof characterAppearance.$inferSelect;

/**
 * Character skill insert type
 */
export type NewCharacterSkill = typeof characterSkills.$inferInsert;

/**
 * Character skill select type
 */
export type CharacterSkill = typeof characterSkills.$inferSelect;

/**
 * Character experience insert type
 */
export type NewCharacterExperience = typeof characterExperience.$inferInsert;

/**
 * Character experience select type
 */
export type CharacterExperience = typeof characterExperience.$inferSelect;
