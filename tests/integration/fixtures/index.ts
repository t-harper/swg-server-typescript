/**
 * Test Fixtures
 * Re-exports all fixtures for convenience
 */

export {
  TEST_ACCOUNTS,
  TEST_CREDENTIALS,
  hashPassword,
  getTestAccount,
  getTestAccountById,
  getActiveTestAccounts,
  createTestAccount,
  createTestAccounts,
  accountsToFixture,
  getDefaultAccountsFixture,
  getMinimalAccountsFixture,
  getCredentialsForCase,
  type TestAccount,
  type TestCredentials,
} from './accounts.js';

export {
  Species,
  ProfessionTemplate,
  TemplateCrc,
  TEST_CHARACTERS,
  TEST_CHARACTER_APPEARANCES,
  StartingLocations,
  CHARACTER_CREATION_TEST_CASES,
  getTestCharacter,
  getTestCharactersForAccount,
  getTestCharactersByScene,
  createTestCharacter,
  createTestCharactersForAccount,
  charactersToFixture,
  appearancesToFixture,
  getDefaultCharactersFixture,
  getDefaultAppearancesFixture,
  getAllCharacterFixtures,
  getStartingLocation,
  type SpeciesType,
  type ProfessionTemplateType,
  type TestCharacter,
  type TestCharacterAppearance,
  type TestCharacterCreationRequest,
} from './characters.js';
