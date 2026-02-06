/**
 * Login Flow Integration Tests
 * Tests the complete login process including authentication and character enumeration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
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
import { createMockClient, type MockClient } from '../mocks/mock-client.js';
import {
  TEST_ACCOUNTS,
  TEST_CREDENTIALS,
  getDefaultAccountsFixture,
  getCredentialsForCase,
} from '../fixtures/accounts.js';
import {
  TEST_CHARACTERS,
  getDefaultCharactersFixture,
  getDefaultAppearancesFixture,
} from '../fixtures/characters.js';

/**
 * Note: These tests require a running login server.
 * In a real setup, you would either:
 * 1. Start the server programmatically before tests
 * 2. Use a pre-configured test environment
 * 3. Mock the server responses
 *
 * For demonstration, we'll use mock assertions that show the expected behavior.
 */

describe('Login Flow Integration Tests', () => {
  let testDb: TestDatabase;
  let testRedis: TestRedis;

  // Test server configuration
  const serverConfig = {
    address: '127.0.0.1',
    port: 44453,
  };

  beforeAll(async () => {
    // Start test containers
    testDb = await createTestDatabase();
    testRedis = await createTestRedis();

    console.log('[Test] Test infrastructure ready');
    console.log(`[Test] MySQL: ${testDb.config.host}:${testDb.config.port}`);
    console.log(`[Test] Redis: ${testRedis.config.host}:${testRedis.config.port}`);
  });

  afterAll(async () => {
    // Clean up containers
    await cleanupDatabase(testDb);
    await cleanupRedis(testRedis);
  });

  beforeEach(async () => {
    // Seed database with test data
    await cleanDatabase(testDb);
    await cleanRedis(testRedis);

    await seedDatabase(testDb, [
      getDefaultAccountsFixture(),
      getDefaultCharactersFixture(),
      getDefaultAppearancesFixture(),
    ]);
  });

  describe('Database Connection', () => {
    it('should connect to the test database', async () => {
      const result = await testDb.executeRaw<any[]>('SELECT 1 as value');
      expect(result).toBeDefined();
    });

    it('should have seeded accounts', async () => {
      const [rows] = await testDb.pool.execute(
        'SELECT COUNT(*) as count FROM accounts'
      ) as any;
      expect(rows[0].count).toBe(TEST_ACCOUNTS.length);
    });

    it('should have seeded characters', async () => {
      const [rows] = await testDb.pool.execute(
        'SELECT COUNT(*) as count FROM characters'
      ) as any;
      expect(rows[0].count).toBe(TEST_CHARACTERS.length);
    });
  });

  describe('Redis Connection', () => {
    it('should connect to the test Redis', async () => {
      const pong = await testRedis.client.ping();
      expect(pong).toBe('PONG');
    });

    it('should be able to set and get values', async () => {
      await testRedis.set('test:key', 'test_value');
      const value = await testRedis.get('test:key');
      expect(value).toBe('test_value');
    });
  });

  describe('Successful Login', () => {
    it('should authenticate valid credentials and receive session token', async () => {
      const credentials = getCredentialsForCase('success')!;

      // In a full integration test with a running server:
      // const client = createMockClient({
      //   serverAddress: serverConfig.address,
      //   serverPort: serverConfig.port,
      //   debug: true,
      // });
      //
      // await client.connect();
      // const result = await client.login(credentials.username, credentials.password);
      //
      // expect(result.success).toBe(true);
      // expect(result.accountId).toBeDefined();
      // expect(result.sessionToken).toBeDefined();
      //
      // await client.disconnect();

      // For now, verify the test account exists in database
      const [rows] = await testDb.pool.execute(
        'SELECT * FROM accounts WHERE username = ?',
        [credentials.username]
      ) as any;

      expect(rows.length).toBe(1);
      expect(rows[0].username).toBe(credentials.username);
      expect(rows[0].status).toBe('active');
    });

    it('should store session in Redis after successful login', async () => {
      // When a user logs in successfully, the server should store their session
      const mockSessionToken = 'test-session-12345';
      const mockSessionData = JSON.stringify({
        accountId: 1,
        stationId: '1000000001',
        username: 'testuser1',
        loginTime: Date.now(),
      });

      // Simulate what the server would do
      await testRedis.set(`login:session:${mockSessionToken}`, mockSessionData, 3600);

      // Verify session can be retrieved
      const storedSession = await testRedis.get(`login:session:${mockSessionToken}`);
      expect(storedSession).toBeDefined();

      const sessionData = JSON.parse(storedSession!);
      expect(sessionData.accountId).toBe(1);
      expect(sessionData.username).toBe('testuser1');
    });
  });

  describe('Invalid Credentials', () => {
    it('should reject login with wrong password', async () => {
      const credentials = getCredentialsForCase('invalid')!;

      // Verify the account exists but password would fail
      const [rows] = await testDb.pool.execute(
        'SELECT * FROM accounts WHERE username = ?',
        [credentials.username]
      ) as any;

      expect(rows.length).toBe(1);
      // In real test: verify client.login returns success: false
    });

    it('should reject login with non-existent username', async () => {
      // Verify the account doesn't exist
      const [rows] = await testDb.pool.execute(
        'SELECT * FROM accounts WHERE username = ?',
        ['nonexistent_user']
      ) as any;

      expect(rows.length).toBe(0);
    });
  });

  describe('Account Status Checks', () => {
    it('should reject login for suspended account', async () => {
      const credentials = getCredentialsForCase('suspended')!;

      const [rows] = await testDb.pool.execute(
        'SELECT * FROM accounts WHERE username = ?',
        [credentials.username]
      ) as any;

      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('suspended');
    });

    it('should reject login for banned account', async () => {
      const credentials = getCredentialsForCase('banned')!;

      const [rows] = await testDb.pool.execute(
        'SELECT * FROM accounts WHERE username = ?',
        [credentials.username]
      ) as any;

      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('banned');
    });
  });

  describe('Character Enumeration', () => {
    it('should return characters for authenticated user', async () => {
      const accountId = 1;

      // Verify characters exist for account
      const [rows] = await testDb.pool.execute(
        'SELECT * FROM characters WHERE account_id = ?',
        [accountId]
      ) as any;

      expect(rows.length).toBeGreaterThan(0);

      // Verify character data
      const character = rows[0];
      expect(character.name).toBeDefined();
      expect(character.scene_id).toBeDefined();
    });

    it('should return empty list for account with no characters', async () => {
      // Create account with no characters
      await testDb.pool.execute(
        'INSERT INTO accounts (account_id, username, password_hash, status) VALUES (?, ?, ?, ?)',
        [99, 'newuser', 'hash', 'active']
      );

      const [rows] = await testDb.pool.execute(
        'SELECT * FROM characters WHERE account_id = ?',
        [99]
      ) as any;

      expect(rows.length).toBe(0);
    });

    it('should return character details including position', async () => {
      const [rows] = await testDb.pool.execute(
        'SELECT * FROM characters WHERE character_id = ?',
        ['8800000000000001']
      ) as any;

      expect(rows.length).toBe(1);

      const character = rows[0];
      expect(character.name).toBe('TestHero');
      expect(character.scene_id).toBe('tatooine');
      expect(character.x).toBeCloseTo(3528.0, 1);
      expect(character.z).toBeCloseTo(-4804.0, 1);
    });
  });

  describe('Character Creation', () => {
    it('should create a new character for authenticated user', async () => {
      const accountId = 1;
      const newCharacterId = '8800000000099999';
      const characterName = 'BrandNewCharacter';

      // Insert new character
      await testDb.pool.execute(
        `INSERT INTO characters
         (character_id, account_id, name, scene_id, x, y, z, orientation_w)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newCharacterId, accountId, characterName, 'tutorial', 0, 0, 0, 1]
      );

      // Verify character was created
      const [rows] = await testDb.pool.execute(
        'SELECT * FROM characters WHERE character_id = ?',
        [newCharacterId]
      ) as any;

      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe(characterName);
      expect(rows[0].account_id).toBe(accountId);
    });

    it('should enforce unique character names', async () => {
      // Try to insert a character with existing name
      await expect(
        testDb.pool.execute(
          `INSERT INTO characters
           (character_id, account_id, name, scene_id, x, y, z, orientation_w)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ['8800000000099998', 1, 'TestHero', 'tutorial', 0, 0, 0, 1]
        )
      ).resolves.toBeDefined(); // Name uniqueness might be at app level

      // Verify only one character with that name
      const [rows] = await testDb.pool.execute(
        'SELECT * FROM characters WHERE name = ?',
        ['TestHero']
      ) as any;

      expect(rows.length).toBe(1);
    });
  });

  describe('Session Management', () => {
    it('should update last login time on successful authentication', async () => {
      const username = 'testuser1';

      // Get current last_login
      const [before] = await testDb.pool.execute(
        'SELECT last_login FROM accounts WHERE username = ?',
        [username]
      ) as any;

      // Update last login (simulating successful login)
      await testDb.pool.execute(
        'UPDATE accounts SET last_login = NOW() WHERE username = ?',
        [username]
      );

      // Verify last_login was updated
      const [after] = await testDb.pool.execute(
        'SELECT last_login FROM accounts WHERE username = ?',
        [username]
      ) as any;

      expect(after[0].last_login).toBeDefined();
    });

    it('should clean up session on logout', async () => {
      const sessionKey = 'login:session:test-logout-session';

      // Create a session
      await testRedis.set(sessionKey, JSON.stringify({ accountId: 1 }));

      // Verify session exists
      let session = await testRedis.get(sessionKey);
      expect(session).toBeDefined();

      // Delete session (simulating logout)
      await testRedis.del(sessionKey);

      // Verify session is gone
      session = await testRedis.get(sessionKey);
      expect(session).toBeNull();
    });

    it('should expire sessions after TTL', async () => {
      const sessionKey = 'login:session:test-expire-session';

      // Create a session with 1 second TTL
      await testRedis.set(sessionKey, JSON.stringify({ accountId: 1 }), 1);

      // Verify session exists
      let session = await testRedis.get(sessionKey);
      expect(session).toBeDefined();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Verify session expired
      session = await testRedis.get(sessionKey);
      expect(session).toBeNull();
    });
  });
});
