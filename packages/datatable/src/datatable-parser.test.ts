import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDataTable, parseTypeSpec, getBasicType } from './datatable-parser.js';

const DATA_ROOT = resolve(__dirname, '../../../data/serverdata/datatables');

// ── Typespec Parsing ───────────────────────────────────────────────────────────

describe('parseTypeSpec', () => {
  it('parses simple string type', () => {
    const t = parseTypeSpec('s');
    expect(t.basicType).toBe('string');
    expect(t.typeChar).toBe('s');
    expect(t.defaultValue).toBeUndefined();
    expect(t.enumMap).toBeUndefined();
  });

  it('parses int with default', () => {
    const t = parseTypeSpec('i[42]');
    expect(t.basicType).toBe('int');
    expect(t.typeChar).toBe('i');
    expect(t.defaultValue).toBe(42);
  });

  it('parses float with default', () => {
    const t = parseTypeSpec('f[0]');
    expect(t.basicType).toBe('float');
    expect(t.typeChar).toBe('f');
    expect(t.defaultValue).toBe(0);
  });

  it('parses boolean with default', () => {
    const t = parseTypeSpec('b[1]');
    expect(t.basicType).toBe('int');
    expect(t.typeChar).toBe('b');
    expect(t.defaultValue).toBe(1);
  });

  it('parses enum with map', () => {
    const t = parseTypeSpec('e(red=0,green=1,blue=2)');
    expect(t.basicType).toBe('int');
    expect(t.typeChar).toBe('e');
    expect(t.enumMap).toBeDefined();
    expect(t.enumMap!.get('red')).toBe(0);
    expect(t.enumMap!.get('green')).toBe(1);
    expect(t.enumMap!.get('blue')).toBe(2);
    expect(t.enumReverse!.get(0)).toBe('red');
    expect(t.enumReverse!.get(1)).toBe('green');
    expect(t.enumReverse!.get(2)).toBe('blue');
  });

  it('parses enum with default label', () => {
    const t = parseTypeSpec('e(red=0,green=1)[red]');
    expect(t.basicType).toBe('int');
    expect(t.enumMap!.get('red')).toBe(0);
    expect(t.enumMap!.get('green')).toBe(1);
    expect(t.defaultValue).toBe('red');
  });

  it('parses bitvector type', () => {
    const t = parseTypeSpec('v(flag1=1,flag2=2)');
    expect(t.basicType).toBe('int');
    expect(t.typeChar).toBe('v');
    expect(t.enumMap!.get('flag1')).toBe(1);
    expect(t.enumMap!.get('flag2')).toBe(2);
  });

  it('parses path string type', () => {
    const t = parseTypeSpec('p');
    expect(t.basicType).toBe('string');
    expect(t.typeChar).toBe('p');
  });

  it('parses comment type', () => {
    const t = parseTypeSpec('c');
    expect(t.basicType).toBe('comment');
    expect(t.typeChar).toBe('c');
  });

  it('parses hex int type', () => {
    const t = parseTypeSpec('h');
    expect(t.basicType).toBe('int');
    expect(t.typeChar).toBe('h');
  });

  it('parses zero/unused int type', () => {
    const t = parseTypeSpec('z');
    expect(t.basicType).toBe('int');
    expect(t.typeChar).toBe('z');
  });
});

describe('getBasicType', () => {
  it('maps int types correctly', () => {
    for (const c of ['i', 'h', 'b', 'e', 'v', 'z']) {
      expect(getBasicType(c)).toBe('int');
    }
  });

  it('maps float type correctly', () => {
    expect(getBasicType('f')).toBe('float');
  });

  it('maps string types correctly', () => {
    expect(getBasicType('s')).toBe('string');
    expect(getBasicType('p')).toBe('string');
  });

  it('maps comment type correctly', () => {
    expect(getBasicType('c')).toBe('comment');
  });
});

// ── Real File Parsing ──────────────────────────────────────────────────────────

describe('parseDataTable - starting_locations.iff', () => {
  it('parses columns and rows correctly', async () => {
    const buf = await readFile(resolve(DATA_ROOT, 'creation/starting_locations.iff'));
    const result = parseDataTable(new Uint8Array(buf), 'starting_locations.iff');

    expect(result.version).toBe('0001');
    expect(result.columnCount).toBe(10);
    expect(result.rowCount).toBe(3);

    // Check column names
    const colNames = result.columns.map((c) => c.name);
    expect(colNames).toEqual([
      'location', 'planet', 'x', 'y', 'z',
      'cell', 'image', 'description', 'radius', 'heading',
    ]);

    // Check column types
    expect(result.columns[0]!.type.basicType).toBe('string');
    expect(result.columns[2]!.type.basicType).toBe('float');
    expect(result.columns[8]!.type.basicType).toBe('float');

    // Check first row values
    const row0 = result.rows[0]!;
    expect(row0['location']).toBe('bestine');
    expect(row0['planet']).toBe('tatooine');
    expect(row0['x']).toBe(-1290);
    expect(row0['y']).toBe(12);
    expect(row0['z']).toBe(-3590);
    expect(row0['cell']).toBe('');
  });
});

describe('parseDataTable - planet_info.iff', () => {
  it('parses typespecs with defaults (f[0], f[1])', async () => {
    const buf = await readFile(resolve(DATA_ROOT, 'creation/planet_info.iff'));
    const result = parseDataTable(new Uint8Array(buf), 'planet_info.iff');

    expect(result.version).toBe('0001');
    expect(result.columnCount).toBe(6);
    expect(result.rowCount).toBe(5);

    // TYPE chunk has odd size (21 bytes) - verifies no padding issue
    expect(result.columns[2]!.type.typeSpec).toBe('f[0]');
    expect(result.columns[2]!.type.defaultValue).toBe(0);
    expect(result.columns[3]!.type.typeSpec).toBe('f[1]');
    expect(result.columns[3]!.type.defaultValue).toBe(1);

    // First row
    expect(result.rows[0]!['name']).toBe('tatooine');
    expect(result.rows[0]!['pitchDegrees']).toBe(0);
  });
});

describe('parseDataTable - buildout_scenes.iff', () => {
  it('parses boolean type (b[0]) and 22 rows', async () => {
    const buf = await readFile(resolve(DATA_ROOT, 'buildout/buildout_scenes.iff'));
    const result = parseDataTable(new Uint8Array(buf), 'buildout_scenes.iff');

    expect(result.version).toBe('0001');
    expect(result.columnCount).toBe(2);
    expect(result.rowCount).toBe(22);

    // Check bool column type
    expect(result.columns[1]!.type.typeChar).toBe('b');
    expect(result.columns[1]!.type.basicType).toBe('int');
    expect(result.columns[1]!.type.defaultValue).toBe(0);

    // kashyyyk_rryatt_trail has adjust_map_coordinates = 1 (true)
    const rryatt = result.rows.find((r) => r['sceneName'] === 'kashyyyk_rryatt_trail');
    expect(rryatt).toBeDefined();
    expect(rryatt!['adjust_map_coordinates']).toBe(1);

    // tatooine has adjust_map_coordinates = 0 (false)
    const tatooine = result.rows.find((r) => r['sceneName'] === 'tatooine');
    expect(tatooine).toBeDefined();
    expect(tatooine!['adjust_map_coordinates']).toBe(0);
  });
});

describe('parseDataTable - species_account_features_restrictions.iff', () => {
  it('parses small file correctly', async () => {
    const buf = await readFile(
      resolve(DATA_ROOT, 'creation/species_account_features_restrictions.iff')
    );
    const result = parseDataTable(new Uint8Array(buf), 'species_account_features_restrictions.iff');

    expect(result.version).toBe('0001');
    expect(result.columnCount).toBe(2);
    expect(result.rowCount).toBe(5);

    // Check column names and types
    expect(result.columns[0]!.name).toBe('objectTemplate');
    expect(result.columns[0]!.type.basicType).toBe('string');
    expect(result.columns[1]!.name).toBe('requiredGameFeatures');
    expect(result.columns[1]!.type.basicType).toBe('int');

    // First row
    expect(result.rows[0]!['objectTemplate']).toBe(
      'object/creature/player/ithorian_female.iff'
    );
    expect(result.rows[0]!['requiredGameFeatures']).toBe(16);
  });
});

describe('parseDataTable - error handling', () => {
  it('throws on non-IFF data', () => {
    const buf = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(() => parseDataTable(buf)).toThrow();
  });

  it('throws on non-DTII form type', () => {
    // Build a minimal FORM header with wrong form type
    const buf = new Uint8Array(12);
    const view = new DataView(buf.buffer);
    // "FORM"
    buf[0] = 0x46; buf[1] = 0x4f; buf[2] = 0x52; buf[3] = 0x4d;
    // size = 4
    view.setUint32(4, 4, false);
    // "SHOT" (not DTII)
    buf[8] = 0x53; buf[9] = 0x48; buf[10] = 0x4f; buf[11] = 0x54;

    expect(() => parseDataTable(buf)).toThrow('Expected DTII form type');
  });
});
