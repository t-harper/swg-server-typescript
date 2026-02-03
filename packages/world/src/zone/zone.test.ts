/**
 * Tests for Zone class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Zone, type SceneObject } from './zone.js';
import { ZONE_CONFIGS } from './zone-config.js';

describe('Zone', () => {
  let zone: Zone;

  beforeEach(() => {
    zone = new Zone(ZONE_CONFIGS.tatooine);
  });

  describe('constructor', () => {
    it('should create zone from config', () => {
      expect(zone.sceneId).toBe('tatooine');
      expect(zone.displayName).toBe('Tatooine');
      expect(zone.active).toBe(false);
      expect(zone.objectCount).toBe(0);
    });

    it('should have correct properties', () => {
      expect(zone.properties.pvpEnabled).toBe(true);
      expect(zone.properties.weatherEnabled).toBe(false); // Desert planet
    });
  });

  describe('activate/deactivate', () => {
    it('should toggle active state', () => {
      expect(zone.active).toBe(false);

      zone.activate();
      expect(zone.active).toBe(true);

      zone.deactivate();
      expect(zone.active).toBe(false);
    });
  });

  describe('addObject', () => {
    it('should add an object', () => {
      const obj: SceneObject = {
        id: 1n,
        x: 100,
        y: 200,
        z: 0,
        active: true,
      };

      zone.addObject(obj);
      expect(zone.objectCount).toBe(1);
      expect(zone.hasObject(1n)).toBe(true);
    });

    it('should throw on duplicate ID', () => {
      const obj: SceneObject = { id: 1n, x: 0, y: 0, z: 0, active: true };
      zone.addObject(obj);

      expect(() => {
        zone.addObject({ id: 1n, x: 100, y: 100, z: 0, active: true });
      }).toThrow('already exists');
    });

    it('should throw for out of bounds position', () => {
      expect(() => {
        zone.addObject({ id: 1n, x: 50000, y: 0, z: 0, active: true });
      }).toThrow('outside tree bounds');
    });
  });

  describe('removeObject', () => {
    it('should remove an existing object', () => {
      zone.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });
      expect(zone.removeObject(1n)).toBe(true);
      expect(zone.objectCount).toBe(0);
    });

    it('should return false for non-existent object', () => {
      expect(zone.removeObject(999n)).toBe(false);
    });
  });

  describe('getObject', () => {
    it('should return existing object', () => {
      const obj: SceneObject = { id: 1n, x: 100, y: 200, z: 50, active: true };
      zone.addObject(obj);

      const found = zone.getObject(1n);
      expect(found).toBeDefined();
      expect(found?.x).toBe(100);
      expect(found?.y).toBe(200);
      expect(found?.z).toBe(50);
    });

    it('should return undefined for non-existent object', () => {
      expect(zone.getObject(999n)).toBeUndefined();
    });
  });

  describe('updatePosition', () => {
    beforeEach(() => {
      zone.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });
    });

    it('should update object position', () => {
      zone.updatePosition(1n, 100, 200);

      const obj = zone.getObject(1n);
      expect(obj?.x).toBe(100);
      expect(obj?.y).toBe(200);
    });

    it('should update Z coordinate if provided', () => {
      zone.updatePosition(1n, 100, 200, 50);

      const obj = zone.getObject(1n);
      expect(obj?.z).toBe(50);
    });

    it('should throw for non-existent object', () => {
      expect(() => {
        zone.updatePosition(999n, 0, 0);
      }).toThrow('not found');
    });
  });

  describe('getObjectsInRange', () => {
    beforeEach(() => {
      // Add objects at known positions
      for (let x = -1000; x <= 1000; x += 500) {
        for (let y = -1000; y <= 1000; y += 500) {
          zone.addObject({
            id: BigInt((x + 1000) * 10 + (y + 1000)),
            x,
            y,
            z: 0,
            active: true,
          });
        }
      }
    });

    it('should find objects in range', () => {
      const results = zone.getObjectsInRange({
        minX: -600,
        minY: -600,
        maxX: 600,
        maxY: 600,
      });

      // Should find objects at -500, 0, 500 for both axes = 9 objects
      expect(results.length).toBe(9);
    });
  });

  describe('getObjectsNear', () => {
    beforeEach(() => {
      zone.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });
      zone.addObject({ id: 2n, x: 50, y: 0, z: 0, active: true });
      zone.addObject({ id: 3n, x: 100, y: 0, z: 0, active: true });
      zone.addObject({ id: 4n, x: 1000, y: 0, z: 0, active: true });
    });

    it('should find objects within radius', () => {
      const results = zone.getObjectsNear(0, 0, 60);
      expect(results.length).toBe(2);
    });
  });

  describe('getObjectsNearObject', () => {
    beforeEach(() => {
      zone.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });
      zone.addObject({ id: 2n, x: 50, y: 0, z: 0, active: true });
      zone.addObject({ id: 3n, x: 100, y: 0, z: 0, active: true });
    });

    it('should exclude source object by default', () => {
      const results = zone.getObjectsNearObject(1n, 60);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(2n);
    });

    it('should include source object when requested', () => {
      const results = zone.getObjectsNearObject(1n, 60, true);
      expect(results.length).toBe(2);
    });

    it('should return empty for non-existent object', () => {
      const results = zone.getObjectsNearObject(999n, 60);
      expect(results.length).toBe(0);
    });
  });

  describe('getNearestObjects', () => {
    beforeEach(() => {
      zone.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });
      zone.addObject({ id: 2n, x: 100, y: 0, z: 0, active: true });
      zone.addObject({ id: 3n, x: 200, y: 0, z: 0, active: true });
    });

    it('should return nearest objects sorted by distance', () => {
      const results = zone.getNearestObjects(0, 0, 2);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe(1n);
      expect(results[1].id).toBe(2n);
    });
  });

  describe('getAllObjects/getActiveObjects', () => {
    beforeEach(() => {
      zone.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });
      zone.addObject({ id: 2n, x: 100, y: 0, z: 0, active: false });
      zone.addObject({ id: 3n, x: 200, y: 0, z: 0, active: true });
    });

    it('should return all objects', () => {
      expect(zone.getAllObjects().length).toBe(3);
    });

    it('should return only active objects', () => {
      const active = zone.getActiveObjects();
      expect(active.length).toBe(2);
      expect(active.every((o) => o.active)).toBe(true);
    });
  });

  describe('broadcast', () => {
    it('should call handlers for matching message type', () => {
      const handler = vi.fn();
      zone.onMessage('chat', handler);

      zone.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });
      zone.broadcast({
        type: 'chat',
        payload: { text: 'Hello' },
        range: -1,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'chat' }),
        expect.any(Array)
      );
    });

    it('should only include objects in range for ranged broadcast', () => {
      const handler = vi.fn();
      zone.onMessage('emote', handler);

      zone.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });
      zone.addObject({ id: 2n, x: 100, y: 0, z: 0, active: true });
      zone.addObject({ id: 3n, x: 1000, y: 0, z: 0, active: true });

      zone.broadcast({
        type: 'emote',
        payload: { emote: 'wave' },
        range: 150,
        origin: { x: 0, y: 0 },
      });

      expect(handler).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({ id: 1n }),
          expect.objectContaining({ id: 2n }),
        ])
      );

      // Should not include object at 1000
      const objects = handler.mock.calls[0][1] as SceneObject[];
      expect(objects.find((o) => o.id === 3n)).toBeUndefined();
    });

    it('should allow unregistering handlers', () => {
      const handler = vi.fn();
      zone.onMessage('test', handler);
      zone.offMessage('test', handler);

      zone.broadcast({ type: 'test', payload: {}, range: -1 });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('broadcastFromObject', () => {
    it('should use object position as origin', () => {
      const handler = vi.fn();
      zone.onMessage('speak', handler);

      zone.addObject({ id: 1n, x: 500, y: 500, z: 0, active: true });
      zone.addObject({ id: 2n, x: 520, y: 500, z: 0, active: true });
      zone.addObject({ id: 3n, x: 1000, y: 1000, z: 0, active: true });

      zone.broadcastFromObject(1n, 'speak', { text: 'Hello' }, 50);

      const objects = handler.mock.calls[0][1] as SceneObject[];
      expect(objects.length).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all objects', () => {
      for (let i = 0; i < 10; i++) {
        zone.addObject({ id: BigInt(i), x: i * 100, y: 0, z: 0, active: true });
      }
      expect(zone.objectCount).toBe(10);

      zone.clear();
      expect(zone.objectCount).toBe(0);
    });
  });

  describe('isValidPosition/clampPosition', () => {
    it('should validate positions within bounds', () => {
      expect(zone.isValidPosition(0, 0)).toBe(true);
      expect(zone.isValidPosition(-8000, -8000)).toBe(true);
      expect(zone.isValidPosition(8000, 8000)).toBe(true);
    });

    it('should reject positions outside bounds', () => {
      expect(zone.isValidPosition(10000, 0)).toBe(false);
      expect(zone.isValidPosition(0, -10000)).toBe(false);
    });

    it('should clamp positions to bounds', () => {
      const clamped = zone.clampPosition(10000, -10000);
      expect(clamped.x).toBe(8192);
      expect(clamped.y).toBe(-8192);
    });
  });

  describe('getStats', () => {
    it('should return zone statistics', () => {
      zone.addObject({ id: 1n, x: 0, y: 0, z: 0, active: true });
      zone.activate();

      const stats = zone.getStats();
      expect(stats.sceneId).toBe('tatooine');
      expect(stats.objectCount).toBe(1);
      expect(stats.active).toBe(true);
      expect(stats.spatialStats).toBeDefined();
    });
  });
});
