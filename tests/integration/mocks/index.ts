/**
 * Mock Utilities
 * Re-exports all mock utilities for convenience
 */

export {
  MockClient,
  createMockClient,
  createMockClients,
  connectAll,
  disconnectAll,
  type MockClientConfig,
  type ConnectionState,
  type CapturedPacket,
  type LoginResult,
  type CharacterListResult,
  type ZoneEntryResult,
} from './mock-client.js';
