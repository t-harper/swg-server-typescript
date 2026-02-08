/**
 * @swg/data-importer IFF module
 * IFF (Interchange File Format) parser and template extractor for SWG game data
 */

// IFF Parser
export { IffParser, IffParseError } from './iff-parser.js';
export { IffDataReader } from '@swg/datatable';
export type { IffChunk } from './iff-parser.js';

// Template Types
export {
  ArmorRating,
  DamageType,
  WeaponType,
  AttackType,
  Locomotion,
  Gender,
  Race,
  ContainerType,
  GameObjectType,
  ObjVarType,
  isSharedObjectTemplate,
  isSharedTangibleObjectTemplate,
  isSharedCreatureObjectTemplate,
  isSharedWeaponObjectTemplate,
  isServerObjectTemplate,
} from './template-types.js';
export type {
  StringId,
  Vector3,
  RangeInt,
  RangeFloat,
  ObjectTemplate,
  SharedObjectTemplate,
  SharedTangibleObjectTemplate,
  SharedCreatureObjectTemplate,
  SharedWeaponObjectTemplate,
  SharedStaticObjectTemplate,
  SharedBuildingObjectTemplate,
  SharedInstallationObjectTemplate,
  SharedResourceContainerObjectTemplate,
  SharedWaypointObjectTemplate,
  SharedIntangibleObjectTemplate,
  SharedMissionObjectTemplate,
  ServerObjectTemplate,
  ServerCreatureObjectTemplate,
  ServerTangibleObjectTemplate,
  ServerWeaponObjectTemplate,
  SkillModEntry,
  ObjVar,
  CreatureAttributes,
  AnyTemplate,
} from './template-types.js';

// Template Extractor
export { TemplateExtractor, TemplateExtractError } from './template-extractor.js';
export type { ExtractionResult } from './template-extractor.js';

// CRC Table
export {
  calculateCrc32,
  calculateCrc32Bytes,
  generateCrcTable,
  generateCrcEntries,
  crcTableToJson,
  crcTableFromJson,
  crcTableToTypeScript,
  lookupByCrc,
  lookupByPath,
  mergeCrcTables,
} from './crc-table.js';
export type { CrcEntry, CrcTable, CrcTableOptions } from './crc-table.js';

// DataTable Parser
export { parseDataTable, parseTypeSpec, getBasicType } from '@swg/datatable';
export type {
  DataTableResult,
  DataTableColumn,
  DataTableColumnType,
  DataTableBasicType,
} from '@swg/datatable';

// DataTable Converter
export { DataTableConverter } from './datatable-converter.js';
export type { ConversionStats } from './datatable-converter.js';

// CLI
export { runIffCli } from './cli.js';
