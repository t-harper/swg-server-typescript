/**
 * @file quest-loader.ts
 * Handles loading, indexing, and retrieving quest definitions
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Quest,
  QuestData,
  QuestObjective,
  QuestObjectiveData,
  QuestReward,
  QuestRewardData,
  QuestPrerequisite,
  QuestPrerequisiteData,
  QuestResultCode,
  QuestType,
  ObjectiveType,
  QuestRewardType,
  QuestPrerequisiteType,
  ThemeParkQuest,
  ThemeParkChain,
  ThemeParkChainData,
  isValidQuestType,
  isValidObjectiveType,
  isValidRewardType,
  isValidPrerequisiteType,
} from './quest-types.js';

/**
 * Result of a quest loading operation
 */
export interface QuestLoadResult {
  code: QuestResultCode;
  quest?: Quest | undefined;
  errors?: string[] | undefined;
}

/**
 * Result of bulk quest loading
 */
export interface BulkLoadResult {
  loaded: number;
  failed: number;
  errors: Map<string, string[]>;
}

/**
 * Error thrown when quest loading fails
 */
export class QuestLoadError extends Error {
  constructor(
    message: string,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = 'QuestLoadError';
  }
}

/**
 * Error thrown when quest validation fails
 */
export class QuestValidationError extends Error {
  constructor(
    message: string,
    public readonly questId: string
  ) {
    super(`Quest '${questId}': ${message}`);
    this.name = 'QuestValidationError';
  }
}

/**
 * Parse objective data from datatable format
 */
function parseObjective(data: QuestObjectiveData): QuestObjective {
  if (!isValidObjectiveType(data.type)) {
    throw new Error(`Invalid objective type: ${data.type}`);
  }

  return {
    id: data.id,
    type: data.type as ObjectiveType,
    target: data.target,
    count: data.count,
    location: data.location,
    optional: data.optional ?? false,
    description: data.description,
    sequenceOrder: data.sequenceOrder,
    timeLimit: data.timeLimit,
  };
}

/**
 * Parse reward data from datatable format
 */
function parseReward(data: QuestRewardData): QuestReward {
  if (!isValidRewardType(data.type)) {
    throw new Error(`Invalid reward type: ${data.type}`);
  }

  return {
    type: data.type as QuestRewardType,
    value: data.value,
    itemTemplate: data.itemTemplate,
    itemQuantity: data.itemQuantity,
    xpType: data.xpType,
    factionType: data.factionType,
    skillName: data.skillName,
  };
}

/**
 * Parse prerequisite data from datatable format
 */
function parsePrerequisite(data: QuestPrerequisiteData): QuestPrerequisite {
  if (!isValidPrerequisiteType(data.type)) {
    throw new Error(`Invalid prerequisite type: ${data.type}`);
  }

  return {
    type: data.type as QuestPrerequisiteType,
    value: data.value,
    minAmount: data.minAmount,
  };
}

/**
 * Convert raw quest data to Quest interface
 */
function convertToQuest(data: QuestData): Quest | ThemeParkQuest {
  if (!isValidQuestType(data.type)) {
    throw new Error(`Invalid quest type: ${data.type}`);
  }

  const baseQuest: Quest = {
    id: data.id,
    name: data.name,
    description: data.description,
    type: data.type as QuestType,
    level: data.level,
    repeatable: data.repeatable,
    shareable: data.shareable,
    objectives: data.objectives.map(parseObjective),
    rewards: data.rewards.map(parseReward),
    prerequisites: (data.prerequisites ?? []).map(parsePrerequisite),
    questGiver: data.questGiver,
    timeLimit: data.timeLimit,
    category: data.category,
    journalText: data.journalText,
    hidden: data.hidden,
    minGroupSize: data.minGroupSize,
    maxGroupSize: data.maxGroupSize,
  };

  // If it's a theme park quest, add chain information
  if (data.questChain !== undefined && data.position !== undefined) {
    return {
      ...baseQuest,
      questChain: data.questChain,
      position: data.position,
      nextQuests: data.nextQuests ?? [],
      branch: data.branch,
      isBranchPoint: data.isBranchPoint,
      isFinale: data.isFinale,
    } as ThemeParkQuest;
  }

  return baseQuest;
}

/**
 * Convert raw chain data to ThemeParkChain interface
 */
function convertToChain(data: ThemeParkChainData): ThemeParkChain {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    startQuestId: data.startQuestId,
    startNpc: data.startNpc,
    startLocation: data.startLocation,
    questIds: data.questIds,
    faction: data.faction,
    minLevel: data.minLevel,
    chainRewards: data.chainRewards?.map(parseReward),
  };
}

/**
 * Validate quest data
 */
function validateQuestData(data: QuestData): string[] {
  const errors: string[] = [];

  if (!data.id || typeof data.id !== 'string') {
    errors.push('Missing or invalid quest ID');
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Missing or invalid quest name');
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push('Missing or invalid quest description');
  }

  if (!isValidQuestType(data.type)) {
    errors.push(`Invalid quest type: ${data.type}`);
  }

  if (typeof data.level !== 'number' || data.level < 0) {
    errors.push('Invalid quest level');
  }

  if (!Array.isArray(data.objectives) || data.objectives.length === 0) {
    errors.push('Quest must have at least one objective');
  } else {
    data.objectives.forEach((obj, index) => {
      if (!obj.id) {
        errors.push(`Objective ${index}: Missing ID`);
      }
      if (!isValidObjectiveType(obj.type)) {
        errors.push(`Objective ${index}: Invalid type '${obj.type}'`);
      }
      if (!obj.target) {
        errors.push(`Objective ${index}: Missing target`);
      }
      if (typeof obj.count !== 'number' || obj.count < 1) {
        errors.push(`Objective ${index}: Invalid count`);
      }
    });
  }

  if (!Array.isArray(data.rewards)) {
    errors.push('Rewards must be an array');
  } else {
    data.rewards.forEach((reward, index) => {
      if (!isValidRewardType(reward.type)) {
        errors.push(`Reward ${index}: Invalid type '${reward.type}'`);
      }
      if (typeof reward.value !== 'number') {
        errors.push(`Reward ${index}: Invalid value`);
      }
    });
  }

  return errors;
}

/**
 * Manages loading and retrieval of quest definitions.
 * Quests are indexed by ID, type, level, and chain for fast lookups.
 */
export class QuestLoader {
  /** All loaded quests indexed by ID */
  private questsById: Map<string, Quest> = new Map();

  /** Quests grouped by type */
  private questsByType: Map<QuestType, Quest[]> = new Map();

  /** Quests grouped by level range */
  private questsByLevel: Map<number, Quest[]> = new Map();

  /** Theme park quests grouped by chain */
  private questsByChain: Map<string, ThemeParkQuest[]> = new Map();

  /** Theme park chains indexed by ID */
  private chainsById: Map<string, ThemeParkChain> = new Map();

  /** Quest dependency graph (quest ID -> quests that require it) */
  private dependencyGraph: Map<string, Set<string>> = new Map();

  /** Reverse dependency graph (quest ID -> quests it requires) */
  private reverseDependencyGraph: Map<string, Set<string>> = new Map();

  /** Whether quests have been loaded */
  private loaded: boolean = false;

  constructor() {
    // Initialize type map with empty arrays
    for (const questType of Object.values(QuestType)) {
      this.questsByType.set(questType, []);
    }
  }

  /**
   * Loads all quests from a directory structure.
   * Expects JSON files organized in subdirectories.
   *
   * @param dataPath - Root path containing quest JSON files
   * @returns Result of the bulk load operation
   */
  async loadQuests(dataPath: string): Promise<BulkLoadResult> {
    const result: BulkLoadResult = {
      loaded: 0,
      failed: 0,
      errors: new Map(),
    };

    // Clear existing data
    this.clear();

    try {
      await this.loadDirectory(dataPath, result);
      this.buildDependencyGraphs();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.set(dataPath, [`Failed to load directory: ${errorMessage}`]);
    }

    this.loaded = true;
    return result;
  }

  /**
   * Recursively loads quests from a directory
   */
  private async loadDirectory(dirPath: string, result: BulkLoadResult): Promise<void> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.loadDirectory(fullPath, result);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        await this.loadQuestFile(fullPath, result);
      }
    }
  }

  /**
   * Loads a single quest JSON file
   */
  private async loadQuestFile(filePath: string, result: BulkLoadResult): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Handle quest files
      if (data.quests && Array.isArray(data.quests)) {
        for (const questData of data.quests) {
          const loadResult = this.addQuest(questData);
          if (loadResult.code === QuestResultCode.SUCCESS) {
            result.loaded++;
          } else {
            result.failed++;
            result.errors.set(
              questData.id || filePath,
              loadResult.errors || ['Unknown error']
            );
          }
        }
      }

      // Handle theme park chain files
      if (data.chains && Array.isArray(data.chains)) {
        for (const chainData of data.chains) {
          try {
            this.addChain(chainData);
          } catch (error) {
            result.errors.set(
              chainData.id || filePath,
              [error instanceof Error ? error.message : String(error)]
            );
          }
        }
      }

      // Handle single quest format
      if (data.id && data.type && data.objectives) {
        const loadResult = this.addQuest(data);
        if (loadResult.code === QuestResultCode.SUCCESS) {
          result.loaded++;
        } else {
          result.failed++;
          result.errors.set(data.id || filePath, loadResult.errors || ['Unknown error']);
        }
      }
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.set(filePath, [`Parse error: ${errorMessage}`]);
    }
  }

  /**
   * Adds a single quest to the loader.
   * Validates the quest and indexes it.
   */
  addQuest(questData: QuestData): QuestLoadResult {
    // Validate required fields
    const validationErrors = validateQuestData(questData);
    if (validationErrors.length > 0) {
      return {
        code: QuestResultCode.INVALID_DATA,
        errors: validationErrors,
      };
    }

    // Check for duplicate ID
    if (this.questsById.has(questData.id)) {
      return {
        code: QuestResultCode.DUPLICATE_ID,
        errors: [`Duplicate quest ID: ${questData.id}`],
      };
    }

    try {
      const quest = convertToQuest(questData);

      // Index the quest
      this.questsById.set(quest.id, quest);

      // Add to type index
      const typeList = this.questsByType.get(quest.type);
      if (typeList) {
        typeList.push(quest);
      }

      // Add to level index (bucket by 10s)
      const levelBucket = Math.floor(quest.level / 10) * 10;
      const levelList = this.questsByLevel.get(levelBucket);
      if (levelList) {
        levelList.push(quest);
      } else {
        this.questsByLevel.set(levelBucket, [quest]);
      }

      // Add to chain index if it's a theme park quest
      if ('questChain' in quest) {
        const themeParkQuest = quest as ThemeParkQuest;
        const chainList = this.questsByChain.get(themeParkQuest.questChain);
        if (chainList) {
          chainList.push(themeParkQuest);
          // Sort by position
          chainList.sort((a, b) => a.position - b.position);
        } else {
          this.questsByChain.set(themeParkQuest.questChain, [themeParkQuest]);
        }
      }

      return {
        code: QuestResultCode.SUCCESS,
        quest,
      };
    } catch (error) {
      return {
        code: QuestResultCode.INVALID_DATA,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Adds a theme park chain definition
   */
  addChain(chainData: ThemeParkChainData): void {
    if (!chainData.id) {
      throw new Error('Missing chain ID');
    }
    if (this.chainsById.has(chainData.id)) {
      throw new Error(`Duplicate chain ID: ${chainData.id}`);
    }

    const chain = convertToChain(chainData);
    this.chainsById.set(chain.id, chain);
  }

  /**
   * Builds dependency graphs for quest prerequisites
   */
  private buildDependencyGraphs(): void {
    this.dependencyGraph.clear();
    this.reverseDependencyGraph.clear();

    for (const [questId, quest] of this.questsById) {
      // Initialize sets
      if (!this.dependencyGraph.has(questId)) {
        this.dependencyGraph.set(questId, new Set());
      }
      if (!this.reverseDependencyGraph.has(questId)) {
        this.reverseDependencyGraph.set(questId, new Set());
      }

      // Process quest prerequisites
      for (const prereq of quest.prerequisites) {
        if (prereq.type === QuestPrerequisiteType.QUEST) {
          const requiredQuestId = String(prereq.value);

          // Add to dependency graph (required quest -> this quest depends on it)
          if (!this.dependencyGraph.has(requiredQuestId)) {
            this.dependencyGraph.set(requiredQuestId, new Set());
          }
          this.dependencyGraph.get(requiredQuestId)!.add(questId);

          // Add to reverse graph (this quest -> requires that quest)
          this.reverseDependencyGraph.get(questId)!.add(requiredQuestId);
        }
      }

      // Process theme park chain dependencies
      if ('nextQuests' in quest) {
        const themeParkQuest = quest as ThemeParkQuest;
        for (const nextQuestId of themeParkQuest.nextQuests) {
          // This quest unlocks the next quest
          if (!this.dependencyGraph.has(questId)) {
            this.dependencyGraph.set(questId, new Set());
          }
          this.dependencyGraph.get(questId)!.add(nextQuestId);

          // Next quest requires this one
          if (!this.reverseDependencyGraph.has(nextQuestId)) {
            this.reverseDependencyGraph.set(nextQuestId, new Set());
          }
          this.reverseDependencyGraph.get(nextQuestId)!.add(questId);
        }
      }
    }
  }

  /**
   * Validates that all quest prerequisites can be satisfied
   */
  validatePrerequisites(): string[] {
    const errors: string[] = [];

    for (const [questId, quest] of this.questsById) {
      for (const prereq of quest.prerequisites) {
        if (prereq.type === QuestPrerequisiteType.QUEST) {
          const requiredQuestId = String(prereq.value);
          if (!this.questsById.has(requiredQuestId)) {
            errors.push(`Quest '${questId}' requires non-existent quest '${requiredQuestId}'`);
          }
        }
      }
    }

    // Validate theme park chains
    for (const [chainId, chain] of this.chainsById) {
      if (!this.questsById.has(chain.startQuestId)) {
        errors.push(`Chain '${chainId}' has non-existent start quest '${chain.startQuestId}'`);
      }

      for (const questId of chain.questIds) {
        if (!this.questsById.has(questId)) {
          errors.push(`Chain '${chainId}' references non-existent quest '${questId}'`);
        }
      }
    }

    // Validate theme park quest nextQuests references
    for (const [questId, quest] of this.questsById) {
      if ('nextQuests' in quest) {
        const themeParkQuest = quest as ThemeParkQuest;
        for (const nextQuestId of themeParkQuest.nextQuests) {
          if (!this.questsById.has(nextQuestId)) {
            errors.push(`Quest '${questId}' references non-existent next quest '${nextQuestId}'`);
          }
        }
      }
    }

    return errors;
  }

  /**
   * Detects circular dependencies in quest prerequisites
   */
  detectCircularDependencies(): string[] {
    const errors: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (questId: string, path: string[]): boolean => {
      if (recursionStack.has(questId)) {
        errors.push(`Circular dependency detected: ${[...path, questId].join(' -> ')}`);
        return true;
      }
      if (visited.has(questId)) {
        return false;
      }

      visited.add(questId);
      recursionStack.add(questId);

      const dependencies = this.reverseDependencyGraph.get(questId);
      if (dependencies) {
        for (const depId of dependencies) {
          if (hasCycle(depId, [...path, questId])) {
            return true;
          }
        }
      }

      recursionStack.delete(questId);
      return false;
    };

    for (const questId of this.questsById.keys()) {
      if (!visited.has(questId)) {
        hasCycle(questId, []);
      }
    }

    return errors;
  }

  /**
   * Gets a quest by its ID
   */
  getQuest(questId: string): Quest | undefined {
    return this.questsById.get(questId);
  }

  /**
   * Gets all quests of a specific type
   */
  getQuestsByType(type: QuestType): Quest[] {
    return this.questsByType.get(type) || [];
  }

  /**
   * Gets all quests in a level range
   */
  getQuestsByLevelRange(minLevel: number, maxLevel: number): Quest[] {
    const results: Quest[] = [];
    for (const [_, quests] of this.questsByLevel) {
      for (const quest of quests) {
        if (quest.level >= minLevel && quest.level <= maxLevel) {
          results.push(quest);
        }
      }
    }
    return results.sort((a, b) => a.level - b.level);
  }

  /**
   * Gets all quests in a theme park chain
   */
  getQuestChain(chainName: string): ThemeParkQuest[] {
    return this.questsByChain.get(chainName) || [];
  }

  /**
   * Gets a theme park chain definition
   */
  getChain(chainId: string): ThemeParkChain | undefined {
    return this.chainsById.get(chainId);
  }

  /**
   * Gets all theme park chains
   */
  getAllChains(): ThemeParkChain[] {
    return Array.from(this.chainsById.values());
  }

  /**
   * Gets quests that depend on the specified quest being completed
   */
  getDependentQuests(questId: string): string[] {
    const deps = this.dependencyGraph.get(questId);
    return deps ? Array.from(deps) : [];
  }

  /**
   * Gets quests that must be completed before the specified quest
   */
  getRequiredQuests(questId: string): string[] {
    const deps = this.reverseDependencyGraph.get(questId);
    return deps ? Array.from(deps) : [];
  }

  /**
   * Gets all quests that can be offered by a specific NPC
   */
  getQuestsForNpc(npcTemplate: string): Quest[] {
    return Array.from(this.questsById.values()).filter(
      (quest) => quest.questGiver === npcTemplate
    );
  }

  /**
   * Gets all repeatable quests
   */
  getRepeatableQuests(): Quest[] {
    return Array.from(this.questsById.values()).filter((quest) => quest.repeatable);
  }

  /**
   * Gets all shareable quests
   */
  getShareableQuests(): Quest[] {
    return Array.from(this.questsById.values()).filter((quest) => quest.shareable);
  }

  /**
   * Gets all loaded quests
   */
  getAllQuests(): Quest[] {
    return Array.from(this.questsById.values());
  }

  /**
   * Gets the total number of loaded quests
   */
  getQuestCount(): number {
    return this.questsById.size;
  }

  /**
   * Checks if a quest exists
   */
  hasQuest(questId: string): boolean {
    return this.questsById.has(questId);
  }

  /**
   * Checks if quests have been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Clears all loaded quests
   */
  clear(): void {
    this.questsById.clear();
    this.questsByLevel.clear();
    this.questsByChain.clear();
    this.chainsById.clear();
    this.dependencyGraph.clear();
    this.reverseDependencyGraph.clear();

    // Reset type arrays
    for (const questType of Object.values(QuestType)) {
      this.questsByType.set(questType, []);
    }

    this.loaded = false;
  }

  /**
   * Searches quests by name (case-insensitive partial match)
   */
  searchByName(searchTerm: string): Quest[] {
    const term = searchTerm.toLowerCase();
    return Array.from(this.questsById.values()).filter((quest) =>
      quest.name.toLowerCase().includes(term)
    );
  }

  /**
   * Exports all quests as a JSON object
   */
  exportToJson(): Record<string, Quest> {
    const result: Record<string, Quest> = {};
    for (const [id, quest] of this.questsById) {
      result[id] = quest;
    }
    return result;
  }
}

/**
 * Singleton instance of the quest loader
 */
let defaultLoader: QuestLoader | null = null;

/**
 * Gets or creates the default quest loader instance
 */
export function getQuestLoader(): QuestLoader {
  if (!defaultLoader) {
    defaultLoader = new QuestLoader();
  }
  return defaultLoader;
}

/**
 * Creates a new quest loader instance
 */
export function createQuestLoader(): QuestLoader {
  return new QuestLoader();
}

/**
 * Convenience function to load quests using the default loader
 */
export async function loadQuests(dataPath: string): Promise<BulkLoadResult> {
  return getQuestLoader().loadQuests(dataPath);
}

/**
 * Convenience function to get a quest by ID
 */
export function getQuest(questId: string): Quest | undefined {
  return getQuestLoader().getQuest(questId);
}

/**
 * Convenience function to get quests by type
 */
export function getQuestsByType(type: QuestType): Quest[] {
  return getQuestLoader().getQuestsByType(type);
}

/**
 * Convenience function to get a quest chain
 */
export function getQuestChain(chainName: string): ThemeParkQuest[] {
  return getQuestLoader().getQuestChain(chainName);
}
