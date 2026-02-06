/**
 * @file schematic-loader.ts
 * Handles loading, indexing, and retrieving draft schematics
 */

import * as fs from 'fs';
import * as path from 'path';
import { DraftSchematic, validateDraftSchematic } from './draft-schematic.js';
import { SchematicCategory, SchematicResultCode, CraftingToolType, CraftingXpType } from './schematic-types.js';

/**
 * Result of a schematic loading operation
 */
export interface SchematicLoadResult {
  code: SchematicResultCode;
  schematic?: DraftSchematic | undefined;
  errors?: string[] | undefined;
}

/**
 * Result of bulk schematic loading
 */
export interface BulkLoadResult {
  loaded: number;
  failed: number;
  errors: Map<string, string[]>;
}

/**
 * CRC32 lookup table for fast CRC calculation
 */
const CRC32_TABLE: number[] = [];

// Initialize CRC32 table
(function initCrc32Table() {
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    CRC32_TABLE[i] = crc >>> 0;
  }
})();

/**
 * Calculates CRC32 hash for a string.
 * Used for generating schematic CRCs for network transmission.
 */
export function calculateSchematicCrc(schematicId: string): number {
  let crc = 0xffffffff;
  const str = schematicId.toLowerCase();

  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i);
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff]!;
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Manages loading and retrieval of draft schematics.
 * Schematics are indexed by ID, CRC, category, and skill for fast lookups.
 */
export class SchematicLoader {
  /** All loaded schematics indexed by ID */
  private schematicsById: Map<string, DraftSchematic> = new Map();

  /** Schematics indexed by CRC for network lookups */
  private schematicsByCrc: Map<number, DraftSchematic> = new Map();

  /** Schematics grouped by category */
  private schematicsByCategory: Map<SchematicCategory, DraftSchematic[]> = new Map();

  /** Schematics indexed by required skill */
  private schematicsBySkill: Map<string, DraftSchematic[]> = new Map();

  /** Whether schematics have been loaded */
  private loaded: boolean = false;

  constructor() {
    // Initialize category map with empty arrays
    for (const category of Object.values(SchematicCategory)) {
      this.schematicsByCategory.set(category, []);
    }
  }

  /**
   * Loads all schematics from a directory structure.
   * Expects JSON files organized in subdirectories by category.
   *
   * @param dataPath - Root path containing schematic JSON files
   * @returns Result of the bulk load operation
   */
  async loadSchematics(dataPath: string): Promise<BulkLoadResult> {
    const result: BulkLoadResult = {
      loaded: 0,
      failed: 0,
      errors: new Map(),
    };

    // Clear existing data
    this.clear();

    try {
      await this.loadDirectory(dataPath, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.set(dataPath, [`Failed to load directory: ${errorMessage}`]);
    }

    this.loaded = true;
    return result;
  }

  /**
   * Recursively loads schematics from a directory
   */
  private async loadDirectory(dirPath: string, result: BulkLoadResult): Promise<void> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.loadDirectory(fullPath, result);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        await this.loadSchematicFile(fullPath, result);
      }
    }
  }

  /**
   * Loads a single schematic JSON file
   */
  private async loadSchematicFile(filePath: string, result: BulkLoadResult): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Handle both single schematics and arrays
      const schematics = Array.isArray(data) ? data : [data];

      for (const schematicData of schematics) {
        const loadResult = this.addSchematic(schematicData);

        if (loadResult.code === SchematicResultCode.Success) {
          result.loaded++;
        } else {
          result.failed++;
          result.errors.set(
            schematicData.schematicId || filePath,
            loadResult.errors || ['Unknown error']
          );
        }
      }
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.set(filePath, [`Parse error: ${errorMessage}`]);
    }
  }

  /**
   * Adds a single schematic to the loader.
   * Validates the schematic and generates CRC if needed.
   */
  addSchematic(schematicData: Partial<DraftSchematic>): SchematicLoadResult {
    // Validate required fields exist
    if (!schematicData.schematicId) {
      return {
        code: SchematicResultCode.InvalidData,
        errors: ['Missing schematicId'],
      };
    }

    // Check for duplicate ID
    if (this.schematicsById.has(schematicData.schematicId)) {
      return {
        code: SchematicResultCode.InvalidData,
        errors: [`Duplicate schematic ID: ${schematicData.schematicId}`],
      };
    }

    // Calculate CRC if not provided
    const crc = schematicData.schematicCrc || calculateSchematicCrc(schematicData.schematicId);

    // Check for CRC collision
    if (this.schematicsByCrc.has(crc)) {
      const existing = this.schematicsByCrc.get(crc)!;
      return {
        code: SchematicResultCode.DuplicateCrc,
        errors: [`CRC collision between "${schematicData.schematicId}" and "${existing.schematicId}"`],
      };
    }

    // Create full schematic with defaults
    const schematic: DraftSchematic = {
      schematicId: schematicData.schematicId,
      schematicCrc: crc,
      schematicName: schematicData.schematicName || schematicData.schematicId,
      category: schematicData.category || SchematicCategory.Misc,
      subcategory: schematicData.subcategory,
      complexity: schematicData.complexity || 5,
      complexityTier: schematicData.complexityTier || 2,
      craftingTool: schematicData.craftingTool || CraftingToolType.GenericCraftingTool,
      slots: schematicData.slots || [],
      xpType: schematicData.xpType || CraftingXpType.Artisan,
      xpAmount: schematicData.xpAmount || 0,
      outputTemplate: schematicData.outputTemplate || '',
      outputQuantity: schematicData.outputQuantity || 1,
      skillRequired: schematicData.skillRequired || '',
      additionalSkillsRequired: schematicData.additionalSkillsRequired,
      itemAttributes: schematicData.itemAttributes || [],
      assembly: schematicData.assembly || {
        baseSuccessRate: 0.5,
        skillModifier: 0.001,
        criticalSuccessThreshold: 0.95,
        criticalFailureThreshold: 0.05,
      },
      experimentation: schematicData.experimentation,
      description: schematicData.description,
      learnable: schematicData.learnable ?? true,
      factoryCapable: schematicData.factoryCapable ?? true,
      manufacturingVolume: schematicData.manufacturingVolume || 1,
      dataVersion: schematicData.dataVersion || 1,
    };

    // Validate the complete schematic
    const errors = validateDraftSchematic(schematic);
    if (errors.length > 0) {
      return {
        code: SchematicResultCode.InvalidData,
        errors,
      };
    }

    // Index the schematic
    this.schematicsById.set(schematic.schematicId, schematic);
    this.schematicsByCrc.set(schematic.schematicCrc, schematic);

    // Add to category index
    const categoryList = this.schematicsByCategory.get(schematic.category);
    if (categoryList) {
      categoryList.push(schematic);
    }

    // Add to skill index
    const skillList = this.schematicsBySkill.get(schematic.skillRequired);
    if (skillList) {
      skillList.push(schematic);
    } else {
      this.schematicsBySkill.set(schematic.skillRequired, [schematic]);
    }

    // Also index by additional skills
    if (schematic.additionalSkillsRequired) {
      for (const skill of schematic.additionalSkillsRequired) {
        const list = this.schematicsBySkill.get(skill);
        if (list) {
          list.push(schematic);
        } else {
          this.schematicsBySkill.set(skill, [schematic]);
        }
      }
    }

    return {
      code: SchematicResultCode.Success,
      schematic,
    };
  }

  /**
   * Gets a schematic by its string ID
   */
  getSchematic(schematicId: string): DraftSchematic | undefined {
    return this.schematicsById.get(schematicId);
  }

  /**
   * Gets a schematic by its CRC (for network message handling)
   */
  getSchematicByCrc(crc: number): DraftSchematic | undefined {
    return this.schematicsByCrc.get(crc);
  }

  /**
   * Gets all schematics in a category
   */
  getSchematicsByCategory(category: SchematicCategory): DraftSchematic[] {
    return this.schematicsByCategory.get(category) || [];
  }

  /**
   * Gets all schematics granted by a specific skill
   */
  getSchematicsBySkill(skillName: string): DraftSchematic[] {
    return this.schematicsBySkill.get(skillName) || [];
  }

  /**
   * Gets all loaded schematics
   */
  getAllSchematics(): DraftSchematic[] {
    return Array.from(this.schematicsById.values());
  }

  /**
   * Gets the total number of loaded schematics
   */
  getSchematicCount(): number {
    return this.schematicsById.size;
  }

  /**
   * Checks if a schematic exists
   */
  hasSchematic(schematicId: string): boolean {
    return this.schematicsById.has(schematicId);
  }

  /**
   * Checks if schematics have been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Clears all loaded schematics
   */
  clear(): void {
    this.schematicsById.clear();
    this.schematicsByCrc.clear();
    this.schematicsBySkill.clear();

    // Reset category arrays
    for (const category of Object.values(SchematicCategory)) {
      this.schematicsByCategory.set(category, []);
    }

    this.loaded = false;
  }

  /**
   * Searches schematics by name (case-insensitive partial match)
   */
  searchByName(searchTerm: string): DraftSchematic[] {
    const term = searchTerm.toLowerCase();
    return Array.from(this.schematicsById.values()).filter((s) =>
      s.schematicName.toLowerCase().includes(term)
    );
  }

  /**
   * Gets schematics that can be learned (for schematic vendors/trainers)
   */
  getLearnableSchematics(): DraftSchematic[] {
    return Array.from(this.schematicsById.values()).filter((s) => s.learnable);
  }

  /**
   * Gets schematics that support factory manufacturing
   */
  getFactorySchematics(): DraftSchematic[] {
    return Array.from(this.schematicsById.values()).filter((s) => s.factoryCapable);
  }

  /**
   * Gets schematics by complexity range
   */
  getSchematicsByComplexity(minComplexity: number, maxComplexity: number): DraftSchematic[] {
    return Array.from(this.schematicsById.values()).filter(
      (s) => s.complexity >= minComplexity && s.complexity <= maxComplexity
    );
  }

  /**
   * Gets schematics that require a specific crafting tool
   */
  getSchematicsByTool(toolType: string): DraftSchematic[] {
    return Array.from(this.schematicsById.values()).filter((s) => s.craftingTool === toolType);
  }

  /**
   * Exports all schematics as a JSON object
   */
  exportToJson(): Record<string, DraftSchematic> {
    const result: Record<string, DraftSchematic> = {};
    for (const [id, schematic] of this.schematicsById) {
      result[id] = schematic;
    }
    return result;
  }
}

/**
 * Singleton instance of the schematic loader
 */
let defaultLoader: SchematicLoader | null = null;

/**
 * Gets or creates the default schematic loader instance
 */
export function getSchematicLoader(): SchematicLoader {
  if (!defaultLoader) {
    defaultLoader = new SchematicLoader();
  }
  return defaultLoader;
}

/**
 * Convenience function to load schematics using the default loader
 */
export async function loadSchematics(dataPath: string): Promise<BulkLoadResult> {
  return getSchematicLoader().loadSchematics(dataPath);
}

/**
 * Convenience function to get a schematic by ID
 */
export function getSchematic(schematicId: string): DraftSchematic | undefined {
  return getSchematicLoader().getSchematic(schematicId);
}

/**
 * Convenience function to get a schematic by CRC
 */
export function getSchematicByCrc(crc: number): DraftSchematic | undefined {
  return getSchematicLoader().getSchematicByCrc(crc);
}

/**
 * Convenience function to get schematics by category
 */
export function getSchematicsByCategory(category: SchematicCategory): DraftSchematic[] {
  return getSchematicLoader().getSchematicsByCategory(category);
}

/**
 * Convenience function to get schematics by skill
 */
export function getSchematicsBySkill(skillName: string): DraftSchematic[] {
  return getSchematicLoader().getSchematicsBySkill(skillName);
}
