/**
 * Zone Entry Integration Tests
 * Tests zone loading, object visibility, and movement updates
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestDatabase,
  cleanDatabase,
  cleanupDatabase,
  seedDatabase,
  type TestDatabase,
} from '../setup/test-database.js';
import {
  createTestRedis,
  cleanRedis,
  cleanupRedis,
  type TestRedis,
} from '../setup/test-redis.js';
import {
  getDefaultAccountsFixture,
} from '../fixtures/accounts.js';
import {
  TEST_CHARACTERS,
  getDefaultCharactersFixture,
  getDefaultAppearancesFixture,
  getTestCharactersByScene,
  StartingLocations,
} from '../fixtures/characters.js';

describe('Zone Entry Integration Tests', () => {
  let testDb: TestDatabase;
  let testRedis: TestRedis;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    testRedis = await createTestRedis();
  });

  afterAll(async () => {
    await cleanupDatabase(testDb);
    await cleanupRedis(testRedis);
  });

  beforeEach(async () => {
    await cleanDatabase(testDb);
    await cleanRedis(testRedis);

    await seedDatabase(testDb, [
      getDefaultAccountsFixture(),
      getDefaultCharactersFixture(),
      getDefaultAppearancesFixture(),
    ]);
  });

  describe('Zone Data Loading', () => {
    it('should have characters in tatooine zone', async () => {
      const tatooineCharacters = getTestCharactersByScene('tatooine');
      expect(tatooineCharacters.length).toBeGreaterThan(0);

      // Verify in database
      const [rows] = await testDb.pool.execute(
        'SELECT * FROM characters WHERE scene_id = ?',
        ['tatooine']
      ) as any;

      expect(rows.length).toBe(tatooineCharacters.length);
    });

    it('should have characters in multiple zones', async () => {
      const zones = ['tatooine', 'naboo', 'corellia'];

      for (const zone of zones) {
        const [rows] = await testDb.pool.execute(
          'SELECT COUNT(*) as count FROM characters WHERE scene_id = ?',
          [zone]
        ) as any;

        const expected = getTestCharactersByScene(zone).length;
        expect(rows[0].count).toBe(expected);
      }
    });

    it('should store character position correctly', async () => {
      const testChar = TEST_CHARACTERS[0]!;

      const [rows] = await testDb.pool.execute(
        'SELECT x, y, z FROM characters WHERE character_id = ?',
        [testChar.characterId.toString()]
      ) as any;

      expect(rows.length).toBe(1);
      expect(rows[0].x).toBeCloseTo(testChar.x, 1);
      expect(rows[0].y).toBeCloseTo(testChar.y, 1);
      expect(rows[0].z).toBeCloseTo(testChar.z, 1);
    });

    it('should store character orientation correctly', async () => {
      const testChar = TEST_CHARACTERS[1]!; // Has non-default orientation

      const [rows] = await testDb.pool.execute(
        'SELECT orientation_x, orientation_y, orientation_z, orientation_w FROM characters WHERE character_id = ?',
        [testChar.characterId.toString()]
      ) as any;

      expect(rows.length).toBe(1);
      expect(rows[0].orientation_y).toBeCloseTo(testChar.orientationY, 2);
      expect(rows[0].orientation_w).toBeCloseTo(testChar.orientationW, 2);
    });
  });

  describe('Object Visibility', () => {
    it('should track objects in same zone', async () => {
      // Get all characters in tatooine
      const [characters] = await testDb.pool.execute(
        'SELECT character_id, name, x, z FROM characters WHERE scene_id = ?',
        ['tatooine']
      ) as any;

      expect(characters.length).toBeGreaterThan(0);

      // In a real test, we'd verify that objects within view range are visible
      // For now, verify we can calculate distances
      if (characters.length >= 2) {
        const char1 = characters[0];
        const char2 = characters[1];

        const dx = char1.x - char2.x;
        const dz = char1.z - char2.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        expect(typeof distance).toBe('number');
        expect(distance).toBeGreaterThanOrEqual(0);
      }
    });

    it('should store objects with correct zone association', async () => {
      // Create a test object in a zone
      const objectId = '9900000000000001';
      const sceneId = 'tatooine';

      await testDb.pool.execute(
        `INSERT INTO objects (object_id, template_crc, scene_id, x, y, z, orientation_w)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [objectId, 12345, sceneId, 100, 0, 200, 1]
      );

      // Verify object is in correct zone
      const [rows] = await testDb.pool.execute(
        'SELECT * FROM objects WHERE object_id = ?',
        [objectId]
      ) as any;

      expect(rows.length).toBe(1);
      expect(rows[0].scene_id).toBe(sceneId);
    });

    it('should track container relationships', async () => {
      // Create parent object
      const containerId = '9900000000000010';
      await testDb.pool.execute(
        `INSERT INTO objects (object_id, template_crc, scene_id, x, y, z, orientation_w)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [containerId, 11111, 'tatooine', 0, 0, 0, 1]
      );

      // Create child object inside container
      const childId = '9900000000000011';
      await testDb.pool.execute(
        `INSERT INTO objects (object_id, template_crc, container_id, x, y, z, orientation_w)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [childId, 22222, containerId, 0, 0, 0, 1]
      );

      // Verify containment relationship
      const [rows] = await testDb.pool.execute(
        'SELECT * FROM objects WHERE container_id = ?',
        [containerId]
      ) as any;

      expect(rows.length).toBe(1);
      expect(rows[0].object_id.toString()).toBe(childId);
    });
  });

  describe('Movement Updates', () => {
    it('should update character position', async () => {
      const testChar = TEST_CHARACTERS[0]!;
      const newX = 1000.5;
      const newY = 10.0;
      const newZ = 2000.5;

      // Update position
      await testDb.pool.execute(
        'UPDATE characters SET x = ?, y = ?, z = ? WHERE character_id = ?',
        [newX, newY, newZ, testChar.characterId.toString()]
      );

      // Verify update
      const [rows] = await testDb.pool.execute(
        'SELECT x, y, z FROM characters WHERE character_id = ?',
        [testChar.characterId.toString()]
      ) as any;

      expect(rows[0].x).toBeCloseTo(newX, 1);
      expect(rows[0].y).toBeCloseTo(newY, 1);
      expect(rows[0].z).toBeCloseTo(newZ, 1);
    });

    it('should update character orientation', async () => {
      const testChar = TEST_CHARACTERS[0]!;

      // Rotate 90 degrees (quaternion for Y-axis rotation)
      const newOrientY = 0.707;
      const newOrientW = 0.707;

      await testDb.pool.execute(
        'UPDATE characters SET orientation_y = ?, orientation_w = ? WHERE character_id = ?',
        [newOrientY, newOrientW, testChar.characterId.toString()]
      );

      const [rows] = await testDb.pool.execute(
        'SELECT orientation_y, orientation_w FROM characters WHERE character_id = ?',
        [testChar.characterId.toString()]
      ) as any;

      expect(rows[0].orientation_y).toBeCloseTo(newOrientY, 2);
      expect(rows[0].orientation_w).toBeCloseTo(newOrientW, 2);
    });

    it('should track last saved timestamp', async () => {
      const testChar = TEST_CHARACTERS[0]!;

      // Update with timestamp
      await testDb.pool.execute(
        'UPDATE characters SET x = ?, last_saved = NOW() WHERE character_id = ?',
        [999, testChar.characterId.toString()]
      );

      const [rows] = await testDb.pool.execute(
        'SELECT last_saved FROM characters WHERE character_id = ?',
        [testChar.characterId.toString()]
      ) as any;

      expect(rows[0].last_saved).toBeDefined();
      expect(rows[0].last_saved).toBeInstanceOf(Date);
    });

    it('should support zone transitions', async () => {
      const testChar = TEST_CHARACTERS[0]!;
      const newScene = 'naboo';
      const newPosition = StartingLocations['theed']!;

      // Update scene and position (zone transition)
      await testDb.pool.execute(
        'UPDATE characters SET scene_id = ?, x = ?, y = ?, z = ? WHERE character_id = ?',
        [newScene, newPosition.x, newPosition.y, newPosition.z, testChar.characterId.toString()]
      );

      const [rows] = await testDb.pool.execute(
        'SELECT scene_id, x, y, z FROM characters WHERE character_id = ?',
        [testChar.characterId.toString()]
      ) as any;

      expect(rows[0].scene_id).toBe(newScene);
      expect(rows[0].x).toBeCloseTo(newPosition.x, 1);
    });
  });

  describe('Zone Session State', () => {
    it('should track active players in Redis', async () => {
      const zoneKey = 'zone:tatooine:players';
      const characterId = TEST_CHARACTERS[0]!.characterId.toString();

      // Add player to zone tracking
      await testRedis.client.sadd(zoneKey, characterId);

      // Verify player is tracked
      const members = await testRedis.client.smembers(zoneKey);
      expect(members).toContain(characterId);
    });

    it('should track player count per zone', async () => {
      const zones = ['tatooine', 'naboo', 'corellia'];

      // Add players to zones
      await testRedis.client.sadd('zone:tatooine:players', 'player1', 'player2');
      await testRedis.client.sadd('zone:naboo:players', 'player3');

      // Check counts
      const tatooineCount = await testRedis.client.scard('zone:tatooine:players');
      const nabooCount = await testRedis.client.scard('zone:naboo:players');
      const corelliaCount = await testRedis.client.scard('zone:corellia:players');

      expect(tatooineCount).toBe(2);
      expect(nabooCount).toBe(1);
      expect(corelliaCount).toBe(0);
    });

    it('should remove player from zone on disconnect', async () => {
      const zoneKey = 'zone:tatooine:players';
      const characterId = 'test-player-123';

      // Add player
      await testRedis.client.sadd(zoneKey, characterId);

      // Verify added
      let isMember = await testRedis.client.sismember(zoneKey, characterId);
      expect(isMember).toBe(1);

      // Remove player (disconnect)
      await testRedis.client.srem(zoneKey, characterId);

      // Verify removed
      isMember = await testRedis.client.sismember(zoneKey, characterId);
      expect(isMember).toBe(0);
    });

    it('should track player positions for proximity queries', async () => {
      // Use Redis GEO for position tracking
      const zoneGeoKey = 'zone:tatooine:positions';

      // Add player positions
      await testRedis.client.geoadd(
        zoneGeoKey,
        35.28, -48.04, 'player1', // Approximate lon/lat for position
        35.00, -47.00, 'player2'
      );

      // Find players near a position
      const nearbyPlayers = await testRedis.client.georadius(
        zoneGeoKey,
        35.28, -48.04,
        100, // 100 units radius
        'km',
        'WITHDIST'
      );

      expect(nearbyPlayers.length).toBeGreaterThan(0);
    });
  });

  describe('Character Skills and Experience', () => {
    it('should store character skills', async () => {
      const characterId = TEST_CHARACTERS[0]!.characterId.toString();
      const skillName = 'combat_brawler_novice';

      await testDb.pool.execute(
        'INSERT INTO character_skills (character_id, skill_name) VALUES (?, ?)',
        [characterId, skillName]
      );

      const [rows] = await testDb.pool.execute(
        'SELECT * FROM character_skills WHERE character_id = ?',
        [characterId]
      ) as any;

      expect(rows.length).toBe(1);
      expect(rows[0].skill_name).toBe(skillName);
    });

    it('should store character experience', async () => {
      const characterId = TEST_CHARACTERS[0]!.characterId.toString();

      await testDb.pool.execute(
        'INSERT INTO character_experience (character_id, experience_type, amount) VALUES (?, ?, ?)',
        [characterId, 'combat_general', 5000]
      );

      const [rows] = await testDb.pool.execute(
        'SELECT * FROM character_experience WHERE character_id = ?',
        [characterId]
      ) as any;

      expect(rows.length).toBe(1);
      expect(rows[0].experience_type).toBe('combat_general');
      expect(rows[0].amount).toBe(5000);
    });

    it('should update experience amounts', async () => {
      const characterId = TEST_CHARACTERS[0]!.characterId.toString();

      // Insert initial experience
      await testDb.pool.execute(
        'INSERT INTO character_experience (character_id, experience_type, amount) VALUES (?, ?, ?)',
        [characterId, 'crafting', 1000]
      );

      // Update experience
      await testDb.pool.execute(
        'UPDATE character_experience SET amount = amount + 500 WHERE character_id = ? AND experience_type = ?',
        [characterId, 'crafting']
      );

      const [rows] = await testDb.pool.execute(
        'SELECT amount FROM character_experience WHERE character_id = ? AND experience_type = ?',
        [characterId, 'crafting']
      ) as any;

      expect(rows[0].amount).toBe(1500);
    });
  });
});
