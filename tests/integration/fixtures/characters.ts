/**
 * Test Character Fixtures
 * Provides test character data and utilities for integration testing
 */

import type { DatabaseFixture } from '../setup/test-database.js';

/**
 * SWG Species constants
 */
export const Species = {
  Human: 0,
  Rodian: 1,
  Trandoshan: 2,
  MonCalamari: 3,
  Wookiee: 4,
  Bothan: 5,
  Twilek: 6,
  Zabrak: 7,
  Ithorian: 8,
  Sullustan: 9,
} as const;

export type SpeciesType = (typeof Species)[keyof typeof Species];

/**
 * Starting profession templates
 */
export const ProfessionTemplate = {
  Brawler: 'object/creature/player/shared_brawler.iff',
  Marksman: 'object/creature/player/shared_marksman.iff',
  Scout: 'object/creature/player/shared_scout.iff',
  Artisan: 'object/creature/player/shared_artisan.iff',
  Entertainer: 'object/creature/player/shared_entertainer.iff',
  Medic: 'object/creature/player/shared_medic.iff',
} as const;

export type ProfessionTemplateType =
  (typeof ProfessionTemplate)[keyof typeof ProfessionTemplate];

/**
 * Template CRC values for character creation
 */
export const TemplateCrc = {
  HumanMale: 0x9c9c4f5e,
  HumanFemale: 0xe23d18a7,
  RodianMale: 0xb7e6f3b0,
  RodianFemale: 0xa8c7e4d2,
  WookieeMale: 0x73e37f90,
  WookieeFemale: 0x45b2e8a1,
  TwilekMale: 0x1a2b3c4d,
  TwilekFemale: 0x5e6f7a8b,
} as const;

/**
 * Test character data structure
 */
export interface TestCharacter {
  characterId: bigint;
  accountId: number;
  name: string;
  sceneId: string;
  x: number;
  y: number;
  z: number;
  orientationX: number;
  orientationY: number;
  orientationZ: number;
  orientationW: number;
  templateCrc: number;
  profession: string;
}

/**
 * Character appearance data
 */
export interface TestCharacterAppearance {
  characterId: bigint;
  customizationData: Buffer | null;
  scale: number;
}

/**
 * Pre-defined test characters for consistent testing
 */
export const TEST_CHARACTERS: TestCharacter[] = [
  {
    characterId: 8800000000000001n,
    accountId: 1,
    name: 'TestHero',
    sceneId: 'tatooine',
    x: 3528.0,
    y: 5.0,
    z: -4804.0,
    orientationX: 0,
    orientationY: 0,
    orientationZ: 0,
    orientationW: 1,
    templateCrc: TemplateCrc.HumanMale,
    profession: ProfessionTemplate.Brawler,
  },
  {
    characterId: 8800000000000002n,
    accountId: 1,
    name: 'TestMarksman',
    sceneId: 'naboo',
    x: -4856.0,
    y: 6.0,
    z: 4162.0,
    orientationX: 0,
    orientationY: 0.707,
    orientationZ: 0,
    orientationW: 0.707,
    templateCrc: TemplateCrc.HumanFemale,
    profession: ProfessionTemplate.Marksman,
  },
  {
    characterId: 8800000000000003n,
    accountId: 2,
    name: 'AnotherPlayer',
    sceneId: 'corellia',
    x: -137.0,
    y: 28.0,
    z: -4723.0,
    orientationX: 0,
    orientationY: 0,
    orientationZ: 0,
    orientationW: 1,
    templateCrc: TemplateCrc.RodianMale,
    profession: ProfessionTemplate.Scout,
  },
  {
    characterId: 8800000000000004n,
    accountId: 2,
    name: 'Entertainer Joe',
    sceneId: 'tatooine',
    x: 3500.0,
    y: 5.0,
    z: -4700.0,
    orientationX: 0,
    orientationY: 0,
    orientationZ: 0,
    orientationW: 1,
    templateCrc: TemplateCrc.TwilekMale,
    profession: ProfessionTemplate.Entertainer,
  },
];

/**
 * Test character appearances
 */
export const TEST_CHARACTER_APPEARANCES: TestCharacterAppearance[] = [
  {
    characterId: 8800000000000001n,
    customizationData: null,
    scale: 1.0,
  },
  {
    characterId: 8800000000000002n,
    customizationData: null,
    scale: 0.95,
  },
  {
    characterId: 8800000000000003n,
    customizationData: null,
    scale: 1.05,
  },
  {
    characterId: 8800000000000004n,
    customizationData: null,
    scale: 1.0,
  },
];

/**
 * Get a test character by ID
 */
export function getTestCharacter(characterId: bigint): TestCharacter | undefined {
  return TEST_CHARACTERS.find((c) => c.characterId === characterId);
}

/**
 * Get test characters for an account
 */
export function getTestCharactersForAccount(accountId: number): TestCharacter[] {
  return TEST_CHARACTERS.filter((c) => c.accountId === accountId);
}

/**
 * Get test characters by scene
 */
export function getTestCharactersByScene(sceneId: string): TestCharacter[] {
  return TEST_CHARACTERS.filter((c) => c.sceneId === sceneId);
}

/**
 * Create a test character with custom properties
 */
export function createTestCharacter(
  overrides: Partial<TestCharacter> & {
    characterId: bigint;
    accountId: number;
    name: string;
  }
): TestCharacter {
  return {
    characterId: overrides.characterId,
    accountId: overrides.accountId,
    name: overrides.name,
    sceneId: overrides.sceneId ?? 'tutorial',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    z: overrides.z ?? 0,
    orientationX: overrides.orientationX ?? 0,
    orientationY: overrides.orientationY ?? 0,
    orientationZ: overrides.orientationZ ?? 0,
    orientationW: overrides.orientationW ?? 1,
    templateCrc: overrides.templateCrc ?? TemplateCrc.HumanMale,
    profession: overrides.profession ?? ProfessionTemplate.Brawler,
  };
}

/**
 * Create multiple test characters for an account
 */
export function createTestCharactersForAccount(
  accountId: number,
  count: number,
  startId: bigint = 8800000000010000n
): TestCharacter[] {
  const characters: TestCharacter[] = [];
  const professions = Object.values(ProfessionTemplate);

  for (let i = 0; i < count; i++) {
    const id = startId + BigInt(i);
    characters.push(
      createTestCharacter({
        characterId: id,
        accountId,
        name: `GenChar_${accountId}_${i}`,
        profession: professions[i % professions.length] ?? ProfessionTemplate.Brawler,
      })
    );
  }
  return characters;
}

/**
 * Convert test characters to database fixture format
 */
export function charactersToFixture(characters: TestCharacter[]): DatabaseFixture {
  return {
    table: 'characters',
    data: characters.map((char) => ({
      character_id: char.characterId.toString(),
      account_id: char.accountId,
      name: char.name,
      scene_id: char.sceneId,
      x: char.x,
      y: char.y,
      z: char.z,
      orientation_x: char.orientationX,
      orientation_y: char.orientationY,
      orientation_z: char.orientationZ,
      orientation_w: char.orientationW,
      created_at: new Date(),
    })),
  };
}

/**
 * Convert test character appearances to database fixture format
 */
export function appearancesToFixture(
  appearances: TestCharacterAppearance[]
): DatabaseFixture {
  return {
    table: 'character_appearance',
    data: appearances.map((app) => ({
      character_id: app.characterId.toString(),
      customization_data: app.customizationData,
      scale: app.scale,
    })),
  };
}

/**
 * Default characters fixture for standard tests
 */
export function getDefaultCharactersFixture(): DatabaseFixture {
  return charactersToFixture(TEST_CHARACTERS);
}

/**
 * Default appearances fixture for standard tests
 */
export function getDefaultAppearancesFixture(): DatabaseFixture {
  return appearancesToFixture(TEST_CHARACTER_APPEARANCES);
}

/**
 * Get all character fixtures (characters + appearances)
 */
export function getAllCharacterFixtures(): DatabaseFixture[] {
  return [getDefaultCharactersFixture(), getDefaultAppearancesFixture()];
}

/**
 * Character creation request data for testing
 */
export interface TestCharacterCreationRequest {
  name: string;
  profession: ProfessionTemplateType;
  species: SpeciesType;
  startingLocation: string;
  expectedResult: 'success' | 'name_taken' | 'invalid_name' | 'too_many_characters';
}

/**
 * Test cases for character creation
 */
export const CHARACTER_CREATION_TEST_CASES: TestCharacterCreationRequest[] = [
  {
    name: 'NewCharacter',
    profession: ProfessionTemplate.Brawler,
    species: Species.Human,
    startingLocation: 'mos_eisley',
    expectedResult: 'success',
  },
  {
    name: 'TestHero', // Already exists
    profession: ProfessionTemplate.Marksman,
    species: Species.Human,
    startingLocation: 'theed',
    expectedResult: 'name_taken',
  },
  {
    name: 'ab', // Too short
    profession: ProfessionTemplate.Scout,
    species: Species.Rodian,
    startingLocation: 'coronet',
    expectedResult: 'invalid_name',
  },
  {
    name: 'Bad Name!@#', // Invalid characters
    profession: ProfessionTemplate.Artisan,
    species: Species.Bothan,
    startingLocation: 'mos_espa',
    expectedResult: 'invalid_name',
  },
];

/**
 * Starting location coordinates
 */
export const StartingLocations: Record<
  string,
  { sceneId: string; x: number; y: number; z: number }
> = {
  mos_eisley: { sceneId: 'tatooine', x: 3528.0, y: 5.0, z: -4804.0 },
  mos_espa: { sceneId: 'tatooine', x: -2902.0, y: 5.0, z: 2130.0 },
  theed: { sceneId: 'naboo', x: -4856.0, y: 6.0, z: 4162.0 },
  coronet: { sceneId: 'corellia', x: -137.0, y: 28.0, z: -4723.0 },
  bestine: { sceneId: 'tatooine', x: -1290.0, y: 12.0, z: -3590.0 },
  tutorial: { sceneId: 'tutorial', x: 0, y: 0, z: 0 },
};

/**
 * Get starting location coordinates
 */
export function getStartingLocation(
  locationName: string
): { sceneId: string; x: number; y: number; z: number } | undefined {
  return StartingLocations[locationName];
}
