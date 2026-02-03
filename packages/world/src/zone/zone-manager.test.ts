/**
 * Tests for ZoneManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ZoneManager } from './zone-manager.js';
import { Zone } from './zone.js';

describe('ZoneManager', () => {
  let manager: ZoneManager;

  beforeEach(() => {
    ZoneManager.resetInstance();
    manager = ZoneManager.getInstance();
  });

  afterEach(() => {
    ZoneManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ZoneManager.getInstance();
      const instance2 = ZoneManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadZone', () => {
    it('should load a zone by sceneId', async () => {
      const zone = await manager.loadZone('tatooine');

      expect(zone).toBeInstanceOf(Zone);
      expect(zone.sceneId).toBe('tatooine');
      expect(zone.active).toBe(true);
    });

    it('should return existing zone if already loaded', async () => {
      const zone1 = await manager.loadZone('tatooine');
      const zone2 = await manager.loadZone('tatooine');

      expect(zone1).toBe(zone2);
    });

    it('should throw for unknown zone', async () => {
      await expect(manager.loadZone('unknown_planet')).rejects.toThrow(
        'configuration not found'
      );
    });

    it('should deduplicate concurrent loads', async () => {
      // Start multiple loads concurrently
      const [zone1, zone2, zone3] = await Promise.all([
        manager.loadZone('tatooine'),
        manager.loadZone('tatooine'),
        manager.loadZone('tatooine'),
      ]);

      expect(zone1).toBe(zone2);
      expect(zone2).toBe(zone3);
    });
  });

  describe('unloadZone', () => {
    it('should unload a loaded zone', async () => {
      await manager.loadZone('tatooine');
      expect(manager.isZoneLoaded('tatooine')).toBe(true);

      manager.unloadZone('tatooine');
      expect(manager.isZoneLoaded('tatooine')).toBe(false);
    });

    it('should handle unloading non-existent zone gracefully', () => {
      expect(() => manager.unloadZone('unknown')).not.toThrow();
    });
  });

  describe('getZone', () => {
    it('should return loaded zone', async () => {
      await manager.loadZone('naboo');
      const zone = manager.getZone('naboo');

      expect(zone).toBeDefined();
      expect(zone?.sceneId).toBe('naboo');
    });

    it('should return undefined for unloaded zone', () => {
      expect(manager.getZone('naboo')).toBeUndefined();
    });
  });

  describe('getZoneOrThrow', () => {
    it('should return loaded zone', async () => {
      await manager.loadZone('corellia');
      const zone = manager.getZoneOrThrow('corellia');

      expect(zone.sceneId).toBe('corellia');
    });

    it('should throw for unloaded zone', () => {
      expect(() => manager.getZoneOrThrow('corellia')).toThrow('not loaded');
    });
  });

  describe('getAllZones', () => {
    it('should return all loaded zones', async () => {
      await manager.loadZone('tatooine');
      await manager.loadZone('naboo');
      await manager.loadZone('corellia');

      const zones = manager.getAllZones();
      expect(zones.length).toBe(3);
      expect(zones.map((z) => z.sceneId).sort()).toEqual([
        'corellia',
        'naboo',
        'tatooine',
      ]);
    });
  });

  describe('transferObject', () => {
    beforeEach(async () => {
      await manager.loadZone('tatooine');
      await manager.loadZone('naboo');

      const tatooine = manager.getZoneOrThrow('tatooine');
      tatooine.addObject({ id: 1n, x: 100, y: 200, z: 0, active: true });
    });

    it('should transfer object between zones', async () => {
      const result = await manager.transferObject(
        1n,
        'tatooine',
        'naboo',
        { x: 500, y: 600, z: 10 }
      );

      expect(result.success).toBe(true);
      expect(result.sourceZone).toBe('tatooine');
      expect(result.targetZone).toBe('naboo');

      // Object should be in naboo now
      const naboo = manager.getZoneOrThrow('naboo');
      expect(naboo.hasObject(1n)).toBe(true);

      const obj = naboo.getObject(1n);
      expect(obj?.x).toBe(500);
      expect(obj?.y).toBe(600);
      expect(obj?.z).toBe(10);

      // Object should not be in tatooine
      const tatooine = manager.getZoneOrThrow('tatooine');
      expect(tatooine.hasObject(1n)).toBe(false);
    });

    it('should fail for non-existent source zone', async () => {
      const result = await manager.transferObject(
        1n,
        'unknown',
        'naboo',
        { x: 0, y: 0, z: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source zone not loaded');
    });

    it('should fail for non-existent object', async () => {
      const result = await manager.transferObject(
        999n,
        'tatooine',
        'naboo',
        { x: 0, y: 0, z: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail for out of bounds target position', async () => {
      const result = await manager.transferObject(
        1n,
        'tatooine',
        'naboo',
        { x: 50000, y: 0, z: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('out of bounds');
    });
  });

  describe('findObjectZone', () => {
    it('should find zone containing object', async () => {
      await manager.loadZone('tatooine');
      const tatooine = manager.getZoneOrThrow('tatooine');
      tatooine.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });

      const zone = manager.findObjectZone(1n);
      expect(zone).toBe(tatooine);
    });

    it('should return undefined for unknown object', () => {
      expect(manager.findObjectZone(999n)).toBeUndefined();
    });
  });

  describe('zone events', () => {
    it('should call onZoneLoad handlers', async () => {
      const handler = vi.fn();
      manager.onZoneLoad(handler);

      await manager.loadZone('tatooine');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ sceneId: 'tatooine' })
      );
    });

    it('should call onZoneUnload handlers', async () => {
      const handler = vi.fn();
      manager.onZoneUnload(handler);

      await manager.loadZone('tatooine');
      manager.unloadZone('tatooine');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ sceneId: 'tatooine' })
      );
    });

    it('should allow removing handlers', async () => {
      const handler = vi.fn();
      manager.onZoneLoad(handler);
      manager.offZoneLoad(handler);

      await manager.loadZone('tatooine');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('loadZones', () => {
    it('should load multiple zones in parallel', async () => {
      const zones = await manager.loadZones(['tatooine', 'naboo', 'corellia']);

      expect(zones.length).toBe(3);
      expect(zones.map((z) => z.sceneId).sort()).toEqual([
        'corellia',
        'naboo',
        'tatooine',
      ]);
    });
  });

  describe('getZoneStatus', () => {
    it('should return status for all zones', async () => {
      await manager.loadZone('tatooine');

      const status = manager.getZoneStatus();
      expect(status.length).toBeGreaterThan(0);

      const tatooineStatus = status.find((s) => s.sceneId === 'tatooine');
      expect(tatooineStatus?.loaded).toBe(true);

      const nabooStatus = status.find((s) => s.sceneId === 'naboo');
      expect(nabooStatus?.loaded).toBe(false);
    });
  });

  describe('getAggregateStats', () => {
    it('should return aggregate statistics', async () => {
      await manager.loadZone('tatooine');
      const tatooine = manager.getZoneOrThrow('tatooine');
      tatooine.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });
      tatooine.addObject({ id: 2n, x: 100, y: 0, z: 0, active: true });

      await manager.loadZone('naboo');
      const naboo = manager.getZoneOrThrow('naboo');
      naboo.addObject({ id: 3n, x: 0, y: 0, z: 0, active: true });

      const stats = manager.getAggregateStats();
      expect(stats.totalZones).toBe(2);
      expect(stats.totalObjects).toBe(3);
      expect(stats.zoneStats.length).toBe(2);
    });
  });

  describe('unloadAllZones', () => {
    it('should unload all zones', async () => {
      await manager.loadZones(['tatooine', 'naboo', 'corellia']);
      expect(manager.getAllZones().length).toBe(3);

      manager.unloadAllZones();
      expect(manager.getAllZones().length).toBe(0);
    });
  });
});
