/**
 * @swg/data-importer
 * Convert SWG TAB files to JSON with TypeScript type generation
 * Parse IFF binary files and extract object templates
 */

// Main converter
export { TabConverter } from './tab-converter.js';
export type {
  ConversionResult,
  TabConverterOptions,
} from './tab-converter.js';

// Parser utilities
export {
  parseTabContent,
  parseHeader,
  parseTypes,
  parseRow,
  convertValue,
  isComment,
  isEmpty,
  TabParseError,
} from './tab-parser.js';
export type {
  TabColumn,
  TabColumnType,
  ParsedTabFile,
} from './tab-parser.js';

// Type generation
export {
  generateInterface,
  generateTypesFile,
  generateTableType,
  mapTypeToTypeScript,
  getTypeDescription,
  toInterfaceName,
  toPropertyName,
  needsQuotes,
} from './type-generator.js';
export type {
  TableSchema,
  TypeGeneratorOptions,
} from './type-generator.js';

// IFF module - binary format parser and template extractor
export * from './iff/index.js';
