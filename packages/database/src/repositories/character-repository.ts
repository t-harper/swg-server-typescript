/**
 * Character Repository
 * Data access layer for character management
 */

import { eq, and } from 'drizzle-orm';
import { getDb, type Database } from '../connection.js';
import {
  characters,
  characterAppearance,
  characterSkills,
  characterExperience,
  type Character,
  type NewCharacter,
  type CharacterAppearance,
  type NewCharacterAppearance,
  type CharacterSkill,
  type NewCharacterSkill,
  type CharacterExperience,
  type NewCharacterExperience,
} from '../schema/characters.js';
import { ObjectRepository, createObjectRepository } from './object-repository.js';
import { SceneObject } from '@swg/objects';

/**
 * Character with related data
 */
export interface CharacterWithRelations extends Character {
  appearance?: CharacterAppearance | undefined;
  skills?: CharacterSkill[] | undefined;
  experience?: CharacterExperience[] | undefined;
}

/**
 * Character with inventory data
 */
export interface CharacterWithInventory extends CharacterWithRelations {
  /** Equipment objects (items in equipment slots) */
  equipment?: SceneObject[];
  /** Inventory objects (items in inventory container) */
  inventory?: SceneObject[];
  /** Datapad objects (waypoints, missions, etc.) */
  datapad?: SceneObject[];
}

/**
 * Character creation data
 */
export interface CreateCharacterData {
  characterId: bigint;
  accountId: number;
  name: string;
  templateName: string;
  sceneId: string;
  x?: number;
  y?: number;
  z?: number;
  orientationX?: number;
  orientationY?: number;
  orientationZ?: number;
  orientationW?: number;
  appearance?: {
    customizationData?: Buffer;
    scale?: number;
  };
}

/**
 * Character update data
 */
export interface UpdateCharacterData {
  name?: string;
  sceneId?: string;
  x?: number;
  y?: number;
  z?: number;
  orientationX?: number;
  orientationY?: number;
  orientationZ?: number;
  orientationW?: number;
}

/**
 * Well-known container slot types for player inventory
 */
export enum ContainerSlot {
  /** Player's inventory container */
  Inventory = 4,
  /** Player's equipment container (worn items) */
  Equipment = 0,
  /** Player's datapad (waypoints, missions, etc.) */
  Datapad = 8,
  /** Player's bank */
  Bank = 1,
}

/**
 * Character Repository
 * Provides data access methods for character operations
 */
export class CharacterRepository {
  private db: Database;
  private objectRepository: ObjectRepository;

  constructor(db?: Database, objectRepository?: ObjectRepository) {
    this.db = db ?? getDb();
    this.objectRepository = objectRepository ?? createObjectRepository(this.db);
  }

  /**
   * Find all characters belonging to an account
   * @param accountId The account ID to search for
   * @returns Array of characters belonging to the account
   */
  async findByAccountId(accountId: number): Promise<Character[]> {
    return this.db
      .select()
      .from(characters)
      .where(eq(characters.accountId, accountId));
  }

  /**
   * Find a character by ID
   * @param characterId The character ID to search for
   * @returns The character if found, undefined otherwise
   */
  async findById(characterId: bigint): Promise<Character | undefined> {
    const result = await this.db
      .select()
      .from(characters)
      .where(eq(characters.characterId, characterId))
      .limit(1);

    return result[0];
  }

  /**
   * Find a character by ID with all related data
   * @param characterId The character ID to search for
   * @returns The character with relations if found, undefined otherwise
   */
  async findByIdWithRelations(
    characterId: bigint
  ): Promise<CharacterWithRelations | undefined> {
    const character = await this.findById(characterId);
    if (character === undefined) {
      return undefined;
    }

    const [appearance, skills, experience] = await Promise.all([
      this.getAppearance(characterId),
      this.getSkills(characterId),
      this.getExperience(characterId),
    ]);

    return {
      ...character,
      appearance,
      skills,
      experience,
    };
  }

  /**
   * Find a character by name
   * @param name The character name to search for
   * @returns The character if found, undefined otherwise
   */
  async findByName(name: string): Promise<Character | undefined> {
    const result = await this.db
      .select()
      .from(characters)
      .where(eq(characters.name, name))
      .limit(1);

    return result[0];
  }

  /**
   * Create a new character
   * @param data Character creation data
   * @returns The created character
   */
  async create(data: CreateCharacterData): Promise<Character> {
    const newCharacter: NewCharacter = {
      characterId: data.characterId,
      accountId: data.accountId,
      name: data.name,
      templateName: data.templateName,
      sceneId: data.sceneId,
      x: data.x ?? 0,
      y: data.y ?? 0,
      z: data.z ?? 0,
      orientationX: data.orientationX ?? 0,
      orientationY: data.orientationY ?? 0,
      orientationZ: data.orientationZ ?? 0,
      orientationW: data.orientationW ?? 1,
      createdAt: new Date(),
    };

    await this.db.insert(characters).values(newCharacter);

    // Create appearance record if provided
    if (data.appearance !== undefined) {
      const appearanceData: NewCharacterAppearance = {
        characterId: data.characterId,
        customizationData: data.appearance.customizationData ?? null,
        scale: data.appearance.scale ?? 1.0,
      };
      await this.db.insert(characterAppearance).values(appearanceData);
    }

    const created = await this.findById(data.characterId);
    if (created === undefined) {
      throw new Error('Failed to retrieve created character');
    }

    return created;
  }

  /**
   * Update a character's data
   * @param characterId The character ID to update
   * @param data The data to update
   * @returns True if the character was updated, false if not found
   */
  async update(characterId: bigint, data: UpdateCharacterData): Promise<boolean> {
    const updateData: Partial<Character> = {
      ...data,
      lastSaved: new Date(),
    };

    const result = await this.db
      .update(characters)
      .set(updateData)
      .where(eq(characters.characterId, characterId));

    return result[0].affectedRows > 0;
  }

  /**
   * Delete a character and all related data
   * @param characterId The character ID to delete
   * @returns True if the character was deleted, false if not found
   */
  async delete(characterId: bigint): Promise<boolean> {
    // Foreign key cascade will handle related tables
    const result = await this.db
      .delete(characters)
      .where(eq(characters.characterId, characterId));

    return result[0].affectedRows > 0;
  }

  /**
   * Get character appearance data
   * @param characterId The character ID
   * @returns The appearance data if found, undefined otherwise
   */
  async getAppearance(characterId: bigint): Promise<CharacterAppearance | undefined> {
    const result = await this.db
      .select()
      .from(characterAppearance)
      .where(eq(characterAppearance.characterId, characterId))
      .limit(1);

    return result[0];
  }

  /**
   * Update or create character appearance
   * @param characterId The character ID
   * @param data The appearance data
   * @returns True if successful
   */
  async setAppearance(
    characterId: bigint,
    data: { customizationData?: Buffer; scale?: number }
  ): Promise<boolean> {
    const existing = await this.getAppearance(characterId);

    if (existing !== undefined) {
      const result = await this.db
        .update(characterAppearance)
        .set(data)
        .where(eq(characterAppearance.characterId, characterId));
      return result[0].affectedRows > 0;
    } else {
      const appearanceData: NewCharacterAppearance = {
        characterId,
        customizationData: data.customizationData ?? null,
        scale: data.scale ?? 1.0,
      };
      await this.db.insert(characterAppearance).values(appearanceData);
      return true;
    }
  }

  /**
   * Get all skills for a character
   * @param characterId The character ID
   * @returns Array of character skills
   */
  async getSkills(characterId: bigint): Promise<CharacterSkill[]> {
    return this.db
      .select()
      .from(characterSkills)
      .where(eq(characterSkills.characterId, characterId));
  }

  /**
   * Add a skill to a character
   * @param characterId The character ID
   * @param skillName The skill name to add
   * @returns The created skill record
   */
  async addSkill(characterId: bigint, skillName: string): Promise<CharacterSkill> {
    const newSkill: NewCharacterSkill = {
      characterId,
      skillName,
      acquiredAt: new Date(),
    };

    await this.db.insert(characterSkills).values(newSkill);

    const result = await this.db
      .select()
      .from(characterSkills)
      .where(
        and(
          eq(characterSkills.characterId, characterId),
          eq(characterSkills.skillName, skillName)
        )
      )
      .limit(1);

    const skill = result[0];
    if (skill === undefined) {
      throw new Error('Failed to retrieve created skill');
    }

    return skill;
  }

  /**
   * Remove a skill from a character
   * @param characterId The character ID
   * @param skillName The skill name to remove
   * @returns True if the skill was removed, false if not found
   */
  async removeSkill(characterId: bigint, skillName: string): Promise<boolean> {
    const result = await this.db
      .delete(characterSkills)
      .where(
        and(
          eq(characterSkills.characterId, characterId),
          eq(characterSkills.skillName, skillName)
        )
      );

    return result[0].affectedRows > 0;
  }

  /**
   * Get all experience records for a character
   * @param characterId The character ID
   * @returns Array of character experience records
   */
  async getExperience(characterId: bigint): Promise<CharacterExperience[]> {
    return this.db
      .select()
      .from(characterExperience)
      .where(eq(characterExperience.characterId, characterId));
  }

  /**
   * Get experience amount for a specific type
   * @param characterId The character ID
   * @param experienceType The experience type
   * @returns The experience amount, or 0 if not found
   */
  async getExperienceByType(
    characterId: bigint,
    experienceType: string
  ): Promise<number> {
    const result = await this.db
      .select()
      .from(characterExperience)
      .where(
        and(
          eq(characterExperience.characterId, characterId),
          eq(characterExperience.experienceType, experienceType)
        )
      )
      .limit(1);

    return result[0]?.amount ?? 0;
  }

  /**
   * Set experience amount for a specific type
   * @param characterId The character ID
   * @param experienceType The experience type
   * @param amount The experience amount
   * @returns True if successful
   */
  async setExperience(
    characterId: bigint,
    experienceType: string,
    amount: number
  ): Promise<boolean> {
    const existing = await this.db
      .select()
      .from(characterExperience)
      .where(
        and(
          eq(characterExperience.characterId, characterId),
          eq(characterExperience.experienceType, experienceType)
        )
      )
      .limit(1);

    if (existing[0] !== undefined) {
      const result = await this.db
        .update(characterExperience)
        .set({ amount })
        .where(
          and(
            eq(characterExperience.characterId, characterId),
            eq(characterExperience.experienceType, experienceType)
          )
        );
      return result[0].affectedRows > 0;
    } else {
      const newExp: NewCharacterExperience = {
        characterId,
        experienceType,
        amount,
      };
      await this.db.insert(characterExperience).values(newExp);
      return true;
    }
  }

  /**
   * Add experience to a specific type
   * @param characterId The character ID
   * @param experienceType The experience type
   * @param amount The amount to add
   * @returns The new total experience amount
   */
  async addExperience(
    characterId: bigint,
    experienceType: string,
    amount: number
  ): Promise<number> {
    const current = await this.getExperienceByType(characterId, experienceType);
    const newAmount = current + amount;
    await this.setExperience(characterId, experienceType, newAmount);
    return newAmount;
  }

  /**
   * Load a character with all inventory, equipment, and datapad items
   * @param characterId The character ID to load
   * @returns Character with all related objects, or undefined if not found
   */
  async loadCharacterWithInventory(
    characterId: bigint
  ): Promise<CharacterWithInventory | undefined> {
    // First load the basic character data
    const character = await this.findByIdWithRelations(characterId);
    if (character === undefined) {
      return undefined;
    }

    // Load all objects contained by this character
    const containedObjects = await this.objectRepository.loadByContainer(characterId);

    // Categorize objects by slot arrangement
    const equipment: SceneObject[] = [];
    const inventory: SceneObject[] = [];
    const datapad: SceneObject[] = [];

    for (const obj of containedObjects) {
      // Check if this is a container or an equipped item
      const slotArrangement = obj.slotArrangement;

      if (slotArrangement === ContainerSlot.Inventory) {
        // This is the inventory container - load its contents
        const inventoryContents = await this.objectRepository.loadByContainer(
          obj.objectId
        );
        inventory.push(...inventoryContents);
      } else if (slotArrangement === ContainerSlot.Datapad) {
        // This is the datapad container - load its contents
        const datapadContents = await this.objectRepository.loadByContainer(
          obj.objectId
        );
        datapad.push(...datapadContents);
      } else if (slotArrangement >= 0) {
        // This is an equipped item (in an equipment slot)
        equipment.push(obj);
      }
    }

    return {
      ...character,
      equipment,
      inventory,
      datapad,
    };
  }

  /**
   * Save character state including position, skills, and experience
   * Called on logout or zone change
   * @param characterId The character ID
   * @param position Optional position update
   * @param orientation Optional orientation update
   */
  async saveCharacterState(
    characterId: bigint,
    position?: { x: number; y: number; z: number },
    orientation?: { x: number; y: number; z: number; w: number }
  ): Promise<void> {
    const updateData: Partial<Character> = {
      lastSaved: new Date(),
    };

    if (position) {
      updateData.x = position.x;
      updateData.y = position.y;
      updateData.z = position.z;
    }

    if (orientation) {
      updateData.orientationX = orientation.x;
      updateData.orientationY = orientation.y;
      updateData.orientationZ = orientation.z;
      updateData.orientationW = orientation.w;
    }

    await this.db
      .update(characters)
      .set(updateData)
      .where(eq(characters.characterId, characterId));
  }

  /**
   * Save character along with all inventory objects
   * @param characterId The character ID
   * @param inventoryObjects All objects to save
   */
  async saveCharacterWithInventory(
    characterId: bigint,
    inventoryObjects: SceneObject[]
  ): Promise<void> {
    await this.db.transaction(async () => {
      // Save character state
      await this.saveCharacterState(characterId);

      // Save all inventory objects
      if (inventoryObjects.length > 0) {
        await this.objectRepository.saveAll(inventoryObjects);
      }
    });
  }

  /**
   * Get all objects owned by a character (across all containers)
   * @param characterId The character ID
   * @returns All objects contained by the character
   */
  async getCharacterObjects(characterId: bigint): Promise<SceneObject[]> {
    return this.objectRepository.loadByContainer(characterId);
  }

  /**
   * Get the object repository instance
   * @returns ObjectRepository
   */
  getObjectRepository(): ObjectRepository {
    return this.objectRepository;
  }
}

/**
 * Create a new CharacterRepository instance
 * @param db Optional database instance (uses getDb() if not provided)
 * @param objectRepository Optional object repository instance
 * @returns CharacterRepository instance
 */
export function createCharacterRepository(
  db?: Database,
  objectRepository?: ObjectRepository
): CharacterRepository {
  return new CharacterRepository(db, objectRepository);
}
