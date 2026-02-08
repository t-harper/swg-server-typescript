/**
 * Buildout Loader — loads static world objects (buildings, terminals,
 * decorations) from the buildout datatables.
 *
 * Hierarchy:
 *   buildout_scenes.iff   →  list of scene names
 *   areas_<scene>.iff     →  list of grid areas per scene
 *   <scene>/<area>.iff    →  buildout objects for that grid cell
 */

import { readdirSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import type { DataTableManager } from './datatable-manager.js';

export interface BuildoutArea {
  name: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  isolated: boolean;
  allowMap: boolean;
  internal: boolean;
  eventRequired: string;
}

export interface BuildoutObject {
  objId: number;
  containerId: number;
  type: number;
  sharedTemplateCrc: number;
  cellIndex: number;
  position: { x: number; y: number; z: number };
  orientation: { w: number; x: number; y: number; z: number };
  radius: number;
  portalLayoutCrc: number;
}

export class BuildoutLoader {
  constructor(private dtManager: DataTableManager) {}

  /**
   * Return the list of all scene names from buildout_scenes.iff.
   */
  getSceneNames(): string[] {
    const table = this.dtManager.getTable('datatables/buildout/buildout_scenes.iff');
    if (!table) return [];
    return table.rows.map((r) => r['sceneName'] as string).filter(Boolean);
  }

  /**
   * Return the area definitions for a scene.
   */
  getAreasForScene(sceneId: string): BuildoutArea[] {
    const table = this.dtManager.getTable(`datatables/buildout/areas_${sceneId}.iff`);
    if (!table) return [];

    return table.rows.map((r) => ({
      name: r['area'] as string,
      x1: r['x1'] as number,
      z1: r['z1'] as number,
      x2: r['x2'] as number,
      z2: r['z2'] as number,
      isolated: (r['isolated'] as number) !== 0,
      allowMap: (r['allowMap'] as number) !== 0,
      internal: (r['internal'] as number) !== 0,
      eventRequired: (r['eventRequired'] as string) ?? '',
    }));
  }

  /**
   * Load all buildout objects for a scene by reading every grid `.iff` file
   * in the scene's subdirectory.
   *
   * Event-gated areas (halloween, lifeday, etc.) are skipped.
   */
  loadBuildoutObjects(sceneId: string): BuildoutObject[] {
    // Get areas so we can filter out event-gated ones
    const areas = this.getAreasForScene(sceneId);
    const eventGatedNames = new Set(
      areas.filter((a) => a.eventRequired.length > 0).map((a) => a.name),
    );

    // Discover grid files by reading the directory
    const dirPath = resolve(this.dtManager.getDataRoot(), 'datatables/buildout', sceneId);
    let filenames: string[];
    try {
      filenames = readdirSync(dirPath).filter(
        (f) => extname(f).toLowerCase() === '.iff',
      );
    } catch {
      // Directory doesn't exist for this scene
      return [];
    }

    const objects: BuildoutObject[] = [];

    for (const filename of filenames) {
      const areaName = basename(filename, '.iff');

      // Skip event-gated areas
      if (eventGatedNames.has(areaName)) continue;

      const tablePath = `datatables/buildout/${sceneId}/${filename}`;
      const table = this.dtManager.getTable(tablePath);
      if (!table) continue;

      for (const row of table.rows) {
        objects.push({
          objId: row['objid'] as number,
          containerId: row['container'] as number,
          type: row['type'] as number,
          sharedTemplateCrc: row['shared_template_crc'] as number,
          cellIndex: row['cell_index'] as number,
          position: {
            x: row['px'] as number,
            y: row['py'] as number,
            z: row['pz'] as number,
          },
          orientation: {
            w: row['qw'] as number,
            x: row['qx'] as number,
            y: row['qy'] as number,
            z: row['qz'] as number,
          },
          radius: row['radius'] as number,
          portalLayoutCrc: row['portal_layout_crc'] as number,
        });
      }
    }

    return objects;
  }
}
