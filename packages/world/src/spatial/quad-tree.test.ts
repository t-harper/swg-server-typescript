/**
 * Tests for QuadTree spatial indexing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QuadTree, type Spatial } from './quad-tree.js';
import { createBoundingBox } from './bounding-box.js';

interface TestObject extends Spatial {
  id: bigint;
  x: number;
  y: number;
  name?: string;
}

describe('QuadTree', () => {
  let tree: QuadTree<TestObject>;

  // SWG standard zone bounds: -8192 to 8192
  const zoneBounds = createBoundingBox(-8192, -8192, 8192, 8192);

  beforeEach(() => {
    tree = new QuadTree<TestObject>(zoneBounds);
  });

  describe('constructor', () => {
    it('should create empty tree with given bounds', () => {
      expect(tree.size).toBe(0);
      expect(tree.bounds).toEqual(zoneBounds);
    });

    it('should accept custom maxObjects and maxDepth', () => {
      const customTree = new QuadTree<TestObject>(zoneBounds, 5, 6);
      expect(customTree.size).toBe(0);
    });
  });

  describe('insert', () => {
    it('should insert a single object', () => {
      tree.insert({ id: 1n, x: 0, y: 0 });
      expect(tree.size).toBe(1);
      expect(tree.has(1n)).toBe(true);
    });

    it('should insert multiple objects', () => {
      for (let i = 0; i < 100; i++) {
        tree.insert({
          id: BigInt(i),
          x: Math.random() * 16384 - 8192,
          y: Math.random() * 16384 - 8192,
        });
      }
      expect(tree.size).toBe(100);
    });

    it('should throw for object outside bounds', () => {
      expect(() => {
        tree.insert({ id: 1n, x: 10000, y: 0 });
      }).toThrow('outside tree bounds');
    });

    it('should update existing object on re-insert', () => {
      tree.insert({ id: 1n, x: 0, y: 0 });
      tree.insert({ id: 1n, x: 100, y: 100 });
      expect(tree.size).toBe(1);

      const obj = tree.get(1n);
      expect(obj?.x).toBe(100);
      expect(obj?.y).toBe(100);
    });

    it('should split nodes when exceeding maxObjects', () => {
      // Insert more than default maxObjects (10) in same area
      for (let i = 0; i < 20; i++) {
        tree.insert({ id: BigInt(i), x: i, y: i });
      }

      const stats = tree.getStats();
      expect(stats.totalNodes).toBeGreaterThan(1);
    });
  });

  describe('remove', () => {
    it('should remove an existing object', () => {
      tree.insert({ id: 1n, x: 0, y: 0 });
      expect(tree.remove(1n)).toBe(true);
      expect(tree.size).toBe(0);
      expect(tree.has(1n)).toBe(false);
    });

    it('should return false for non-existent object', () => {
      expect(tree.remove(999n)).toBe(false);
    });
  });

  describe('update', () => {
    it('should update object position within same node', () => {
      tree.insert({ id: 1n, x: 0, y: 0 });
      tree.update(1n, 10, 10);

      const obj = tree.get(1n);
      expect(obj?.x).toBe(10);
      expect(obj?.y).toBe(10);
    });

    it('should move object to different node when position changes significantly', () => {
      tree.insert({ id: 1n, x: -5000, y: -5000 });
      tree.update(1n, 5000, 5000);

      const obj = tree.get(1n);
      expect(obj?.x).toBe(5000);
      expect(obj?.y).toBe(5000);
    });

    it('should throw for non-existent object', () => {
      expect(() => {
        tree.update(999n, 0, 0);
      }).toThrow('not found');
    });

    it('should throw for position outside bounds', () => {
      tree.insert({ id: 1n, x: 0, y: 0 });
      expect(() => {
        tree.update(1n, 20000, 0);
      }).toThrow('outside tree bounds');
    });
  });

  describe('queryRange', () => {
    beforeEach(() => {
      // Create a grid of objects
      for (let x = -4000; x <= 4000; x += 1000) {
        for (let y = -4000; y <= 4000; y += 1000) {
          tree.insert({
            id: BigInt((x + 4000) * 10 + (y + 4000)),
            x,
            y,
          });
        }
      }
    });

    it('should find objects within range', () => {
      const results = tree.queryRange(
        createBoundingBox(-1500, -1500, 1500, 1500)
      );

      // Should find objects at: -1000, 0, 1000 for both x and y = 9 objects
      expect(results.length).toBe(9);
    });

    it('should return empty array for empty range', () => {
      const results = tree.queryRange(
        createBoundingBox(-8000, -8000, -7000, -7000)
      );
      expect(results.length).toBe(0);
    });

    it('should include objects on boundary', () => {
      const results = tree.queryRange(createBoundingBox(0, 0, 0, 0));
      expect(results.length).toBe(1);
    });
  });

  describe('queryRadius', () => {
    beforeEach(() => {
      // Create objects in known positions
      tree.insert({ id: 1n, x: 0, y: 0 });
      tree.insert({ id: 2n, x: 50, y: 0 });
      tree.insert({ id: 3n, x: 100, y: 0 });
      tree.insert({ id: 4n, x: 0, y: 50 });
      tree.insert({ id: 5n, x: 1000, y: 1000 });
    });

    it('should find objects within radius', () => {
      const results = tree.queryRadius(0, 0, 60);

      // Should find: (0,0), (50,0), (0,50) but not (100,0) or (1000,1000)
      expect(results.length).toBe(3);
      expect(results.map((r) => r.id).sort()).toEqual([1n, 2n, 4n].sort());
    });

    it('should return empty for no matches', () => {
      const results = tree.queryRadius(5000, 5000, 10);
      expect(results.length).toBe(0);
    });

    it('should handle large radius', () => {
      const results = tree.queryRadius(0, 0, 2000);
      expect(results.length).toBe(5);
    });
  });

  describe('queryNearest', () => {
    beforeEach(() => {
      tree.insert({ id: 1n, x: 0, y: 0 });
      tree.insert({ id: 2n, x: 100, y: 0 });
      tree.insert({ id: 3n, x: 200, y: 0 });
      tree.insert({ id: 4n, x: 300, y: 0 });
      tree.insert({ id: 5n, x: 400, y: 0 });
    });

    it('should return N nearest objects sorted by distance', () => {
      const results = tree.queryNearest(0, 0, 3);

      expect(results.length).toBe(3);
      expect(results[0].id).toBe(1n); // distance 0
      expect(results[1].id).toBe(2n); // distance 100
      expect(results[2].id).toBe(3n); // distance 200
    });

    it('should return all objects if count > size', () => {
      const results = tree.queryNearest(0, 0, 10);
      expect(results.length).toBe(5);
    });

    it('should return empty array for count 0', () => {
      const results = tree.queryNearest(0, 0, 0);
      expect(results.length).toBe(0);
    });
  });

  describe('get/has', () => {
    it('should get existing object', () => {
      tree.insert({ id: 1n, x: 100, y: 200, name: 'test' });
      const obj = tree.get(1n);

      expect(obj).toBeDefined();
      expect(obj?.id).toBe(1n);
      expect(obj?.x).toBe(100);
      expect(obj?.name).toBe('test');
    });

    it('should return undefined for non-existent object', () => {
      expect(tree.get(999n)).toBeUndefined();
    });

    it('should correctly report has', () => {
      tree.insert({ id: 1n, x: 0, y: 0 });
      expect(tree.has(1n)).toBe(true);
      expect(tree.has(2n)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all objects', () => {
      for (let i = 0; i < 50; i++) {
        tree.insert({ id: BigInt(i), x: i * 100, y: i * 100 });
      }
      expect(tree.size).toBe(50);

      tree.clear();
      expect(tree.size).toBe(0);
      expect(tree.has(0n)).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all objects', () => {
      for (let i = 0; i < 20; i++) {
        tree.insert({ id: BigInt(i), x: i * 100, y: i * 100 });
      }

      const all = tree.getAll();
      expect(all.length).toBe(20);
    });
  });

  describe('performance', () => {
    it('should handle 10,000+ objects efficiently', () => {
      const count = 10000;
      const startInsert = performance.now();

      for (let i = 0; i < count; i++) {
        tree.insert({
          id: BigInt(i),
          x: Math.random() * 16384 - 8192,
          y: Math.random() * 16384 - 8192,
        });
      }

      const insertTime = performance.now() - startInsert;
      expect(tree.size).toBe(count);

      // Query should be fast (O(log n))
      const startQuery = performance.now();
      for (let i = 0; i < 100; i++) {
        tree.queryRadius(
          Math.random() * 16384 - 8192,
          Math.random() * 16384 - 8192,
          500
        );
      }
      const queryTime = performance.now() - startQuery;

      // These are rough bounds - should complete in reasonable time
      expect(insertTime).toBeLessThan(5000); // 5 seconds max
      expect(queryTime).toBeLessThan(1000); // 1 second for 100 queries

      console.log(
        `Performance: Insert ${count} objects: ${insertTime.toFixed(2)}ms, ` +
          `100 queries: ${queryTime.toFixed(2)}ms`
      );
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      for (let i = 0; i < 100; i++) {
        tree.insert({
          id: BigInt(i),
          x: Math.random() * 16384 - 8192,
          y: Math.random() * 16384 - 8192,
        });
      }

      const stats = tree.getStats();
      expect(stats.totalObjects).toBe(100);
      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.maxDepth).toBeLessThanOrEqual(8);
    });
  });
});
