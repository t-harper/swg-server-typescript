/**
 * Tests for BoundingBox utilities
 */

import { describe, it, expect } from 'vitest';
import {
  createBoundingBox,
  fromCenterRadius,
  merge,
  intersects,
  contains,
  containsPoint,
  expand,
  getWidth,
  getHeight,
  getCenter,
  getArea,
  intersectsCircle,
  subdivide,
} from './bounding-box.js';

describe('BoundingBox', () => {
  describe('createBoundingBox', () => {
    it('should create a bounding box with given coordinates', () => {
      const box = createBoundingBox(0, 0, 100, 100);
      expect(box.minX).toBe(0);
      expect(box.minY).toBe(0);
      expect(box.maxX).toBe(100);
      expect(box.maxY).toBe(100);
    });

    it('should handle negative coordinates', () => {
      const box = createBoundingBox(-50, -50, 50, 50);
      expect(box.minX).toBe(-50);
      expect(box.minY).toBe(-50);
      expect(box.maxX).toBe(50);
      expect(box.maxY).toBe(50);
    });
  });

  describe('fromCenterRadius', () => {
    it('should create a box from center and radius', () => {
      const box = fromCenterRadius(0, 0, 50);
      expect(box.minX).toBe(-50);
      expect(box.minY).toBe(-50);
      expect(box.maxX).toBe(50);
      expect(box.maxY).toBe(50);
    });

    it('should work with non-origin center', () => {
      const box = fromCenterRadius(100, 200, 25);
      expect(box.minX).toBe(75);
      expect(box.minY).toBe(175);
      expect(box.maxX).toBe(125);
      expect(box.maxY).toBe(225);
    });
  });

  describe('merge', () => {
    it('should merge two non-overlapping boxes', () => {
      const a = createBoundingBox(0, 0, 50, 50);
      const b = createBoundingBox(100, 100, 150, 150);
      const merged = merge(a, b);

      expect(merged.minX).toBe(0);
      expect(merged.minY).toBe(0);
      expect(merged.maxX).toBe(150);
      expect(merged.maxY).toBe(150);
    });

    it('should merge overlapping boxes', () => {
      const a = createBoundingBox(0, 0, 100, 100);
      const b = createBoundingBox(50, 50, 150, 150);
      const merged = merge(a, b);

      expect(merged.minX).toBe(0);
      expect(merged.minY).toBe(0);
      expect(merged.maxX).toBe(150);
      expect(merged.maxY).toBe(150);
    });
  });

  describe('intersects', () => {
    it('should detect overlapping boxes', () => {
      const a = createBoundingBox(0, 0, 100, 100);
      const b = createBoundingBox(50, 50, 150, 150);
      expect(intersects(a, b)).toBe(true);
    });

    it('should detect non-overlapping boxes', () => {
      const a = createBoundingBox(0, 0, 50, 50);
      const b = createBoundingBox(100, 100, 150, 150);
      expect(intersects(a, b)).toBe(false);
    });

    it('should detect edge-touching as intersecting', () => {
      const a = createBoundingBox(0, 0, 50, 50);
      const b = createBoundingBox(50, 0, 100, 50);
      expect(intersects(a, b)).toBe(true);
    });

    it('should detect fully contained boxes', () => {
      const a = createBoundingBox(0, 0, 100, 100);
      const b = createBoundingBox(25, 25, 75, 75);
      expect(intersects(a, b)).toBe(true);
    });
  });

  describe('contains', () => {
    it('should detect when a contains b completely', () => {
      const a = createBoundingBox(0, 0, 100, 100);
      const b = createBoundingBox(25, 25, 75, 75);
      expect(contains(a, b)).toBe(true);
    });

    it('should return false when boxes only overlap', () => {
      const a = createBoundingBox(0, 0, 100, 100);
      const b = createBoundingBox(50, 50, 150, 150);
      expect(contains(a, b)).toBe(false);
    });

    it('should return false when b contains a', () => {
      const a = createBoundingBox(25, 25, 75, 75);
      const b = createBoundingBox(0, 0, 100, 100);
      expect(contains(a, b)).toBe(false);
    });
  });

  describe('containsPoint', () => {
    it('should return true for point inside box', () => {
      const box = createBoundingBox(0, 0, 100, 100);
      expect(containsPoint(box, 50, 50)).toBe(true);
    });

    it('should return true for point on edge', () => {
      const box = createBoundingBox(0, 0, 100, 100);
      expect(containsPoint(box, 0, 50)).toBe(true);
      expect(containsPoint(box, 100, 50)).toBe(true);
    });

    it('should return false for point outside box', () => {
      const box = createBoundingBox(0, 0, 100, 100);
      expect(containsPoint(box, 150, 50)).toBe(false);
      expect(containsPoint(box, -50, 50)).toBe(false);
    });
  });

  describe('expand', () => {
    it('should expand box in all directions', () => {
      const box = createBoundingBox(10, 10, 90, 90);
      const expanded = expand(box, 10);

      expect(expanded.minX).toBe(0);
      expect(expanded.minY).toBe(0);
      expect(expanded.maxX).toBe(100);
      expect(expanded.maxY).toBe(100);
    });
  });

  describe('getWidth/getHeight', () => {
    it('should return correct dimensions', () => {
      const box = createBoundingBox(0, 0, 100, 200);
      expect(getWidth(box)).toBe(100);
      expect(getHeight(box)).toBe(200);
    });
  });

  describe('getCenter', () => {
    it('should return correct center point', () => {
      const box = createBoundingBox(0, 0, 100, 100);
      const center = getCenter(box);
      expect(center.x).toBe(50);
      expect(center.y).toBe(50);
    });

    it('should handle negative coordinates', () => {
      const box = createBoundingBox(-100, -100, 100, 100);
      const center = getCenter(box);
      expect(center.x).toBe(0);
      expect(center.y).toBe(0);
    });
  });

  describe('getArea', () => {
    it('should return correct area', () => {
      const box = createBoundingBox(0, 0, 100, 200);
      expect(getArea(box)).toBe(20000);
    });
  });

  describe('intersectsCircle', () => {
    it('should detect circle overlapping box', () => {
      const box = createBoundingBox(0, 0, 100, 100);
      expect(intersectsCircle(box, 50, 50, 10)).toBe(true); // Inside
      expect(intersectsCircle(box, 110, 50, 20)).toBe(true); // Touching edge
      expect(intersectsCircle(box, 120, 50, 10)).toBe(false); // Outside
    });

    it('should detect circle at corner', () => {
      const box = createBoundingBox(0, 0, 100, 100);
      // Circle at corner
      expect(intersectsCircle(box, 110, 110, 20)).toBe(true);
      expect(intersectsCircle(box, 120, 120, 10)).toBe(false);
    });
  });

  describe('subdivide', () => {
    it('should split box into 4 quadrants', () => {
      const box = createBoundingBox(0, 0, 100, 100);
      const [nw, ne, sw, se] = subdivide(box);

      // NW (top-left)
      expect(nw.minX).toBe(0);
      expect(nw.minY).toBe(50);
      expect(nw.maxX).toBe(50);
      expect(nw.maxY).toBe(100);

      // NE (top-right)
      expect(ne.minX).toBe(50);
      expect(ne.minY).toBe(50);
      expect(ne.maxX).toBe(100);
      expect(ne.maxY).toBe(100);

      // SW (bottom-left)
      expect(sw.minX).toBe(0);
      expect(sw.minY).toBe(0);
      expect(sw.maxX).toBe(50);
      expect(sw.maxY).toBe(50);

      // SE (bottom-right)
      expect(se.minX).toBe(50);
      expect(se.minY).toBe(0);
      expect(se.maxX).toBe(100);
      expect(se.maxY).toBe(50);
    });
  });
});
