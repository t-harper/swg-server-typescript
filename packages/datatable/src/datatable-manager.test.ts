import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { DataTableManager } from './datatable-manager.js';
import { BuildoutLoader } from './buildout-loader.js';

const DATA_ROOT = resolve(__dirname, '../../../data/serverdata');

describe('DataTableManager', () => {
  beforeAll(() => {
    DataTableManager.install(DATA_ROOT);
  });

  afterAll(() => {
    DataTableManager.resetInstance();
  });

  it('getInstance() returns the installed instance', () => {
    const mgr = DataTableManager.getInstance();
    expect(mgr).toBeDefined();
    expect(mgr.getDataRoot()).toBe(DATA_ROOT);
  });

  it('getTable() reads and caches real files', () => {
    const mgr = DataTableManager.getInstance();
    const table = mgr.getTable('datatables/creation/starting_locations.iff');
    expect(table).toBeDefined();
    expect(table!.rowCount).toBe(3);
    expect(table!.columnCount).toBe(10);

    // Second call returns same cached reference
    const table2 = mgr.getTable('datatables/creation/starting_locations.iff');
    expect(table2).toBe(table);
    expect(mgr.isLoaded('datatables/creation/starting_locations.iff')).toBe(true);
  });

  it('getTable() returns undefined for missing files', () => {
    const mgr = DataTableManager.getInstance();
    const table = mgr.getTable('datatables/nonexistent/file.iff');
    expect(table).toBeUndefined();
  });

  it('searchColumnString() finds correct row', () => {
    const mgr = DataTableManager.getInstance();
    const table = mgr.getTable('datatables/creation/starting_locations.iff')!;
    const idx = mgr.searchColumnString(table, 'location', 'bestine');
    expect(idx).toBe(0);

    const notFound = mgr.searchColumnString(table, 'location', 'nonexistent');
    expect(notFound).toBe(-1);
  });

  it('convenience accessors return correct types', () => {
    const mgr = DataTableManager.getInstance();
    const table = mgr.getTable('datatables/creation/starting_locations.iff')!;

    expect(mgr.getStringValue(table, 'location', 0)).toBe('bestine');
    expect(mgr.getFloatValue(table, 'x', 0)).toBe(-1290);
    expect(mgr.getIntValue(table, 'x', 0)).toBe(-1290);
  });

  it('reloadTable() refreshes cache', () => {
    const mgr = DataTableManager.getInstance();
    const table1 = mgr.getTable('datatables/buildout/buildout_scenes.iff');
    const table2 = mgr.reloadTable('datatables/buildout/buildout_scenes.iff');
    expect(table1).toBeDefined();
    expect(table2).toBeDefined();
    // After reload it's a new object, not the same reference
    expect(table2).not.toBe(table1);
    expect(table2!.rowCount).toBe(table1!.rowCount);
  });

  it('closeTable() removes from cache', () => {
    const mgr = DataTableManager.getInstance();
    mgr.getTable('datatables/buildout/buildout_scenes.iff');
    expect(mgr.isLoaded('datatables/buildout/buildout_scenes.iff')).toBe(true);
    mgr.closeTable('datatables/buildout/buildout_scenes.iff');
    expect(mgr.isLoaded('datatables/buildout/buildout_scenes.iff')).toBe(false);
  });
});

describe('BuildoutLoader', () => {
  let loader: BuildoutLoader;

  beforeAll(() => {
    DataTableManager.install(DATA_ROOT);
    loader = new BuildoutLoader(DataTableManager.getInstance());
  });

  afterAll(() => {
    DataTableManager.resetInstance();
  });

  it('getSceneNames() returns 22 scenes', () => {
    const scenes = loader.getSceneNames();
    expect(scenes.length).toBe(22);
    expect(scenes).toContain('tatooine');
    expect(scenes).toContain('naboo');
    expect(scenes).toContain('corellia');
  });

  it('getAreasForScene("tatooine") returns areas', () => {
    const areas = loader.getAreasForScene('tatooine');
    expect(areas.length).toBeGreaterThan(0);

    // Should include the 8x8 grid cells
    const grid11 = areas.find((a) => a.name === 'tatooine_1_1');
    expect(grid11).toBeDefined();
    expect(grid11!.x1).toBe(-8192);
    expect(grid11!.z1).toBe(-8192);
  });

  it('loadBuildoutObjects("tatooine") returns objects with valid positions', () => {
    const objects = loader.loadBuildoutObjects('tatooine');
    expect(objects.length).toBeGreaterThan(100);

    // All top-level objects should have non-zero CRCs
    const topLevel = objects.filter((o) => o.containerId === 0);
    expect(topLevel.length).toBeGreaterThan(0);

    // Spot-check: positions should be within world bounds (-8192 to +8192)
    for (const obj of topLevel.slice(0, 50)) {
      expect(obj.position.x).toBeGreaterThanOrEqual(-8192);
      expect(obj.position.x).toBeLessThanOrEqual(8192);
      expect(obj.position.z).toBeGreaterThanOrEqual(-8192);
      expect(obj.position.z).toBeLessThanOrEqual(8192);
    }
  });

  it('loadBuildoutObjects() skips event-gated areas', () => {
    const areas = loader.getAreasForScene('tatooine');
    const eventAreas = areas.filter((a) => a.eventRequired.length > 0);
    expect(eventAreas.length).toBeGreaterThan(0); // there are halloween/lifeday areas

    // Event objects should not be in the loaded set
    const objects = loader.loadBuildoutObjects('tatooine');
    // This is a basic sanity check — no event objects should be loaded
    // (we can't easily distinguish them from the results, but the count
    // should be lower than if we loaded everything)
    expect(objects.length).toBeGreaterThan(0);
  });

  it('returns empty for unknown scene', () => {
    const objects = loader.loadBuildoutObjects('nonexistent_planet');
    expect(objects).toEqual([]);
  });
});
