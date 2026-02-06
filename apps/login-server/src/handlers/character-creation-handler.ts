/**
 * Character Creation Handler
 * Handles the full character creation flow including validation
 */

import type { CharacterRepository, CreateCharacterData } from '@swg/database';
import type { SessionStore } from '@swg/redis';
import {
  CharacterNameError,
  type CharacterNameErrorType,
  NameValidation,
  ReservedPrefixes,
  ReservedNames,
  getCharacterNameErrorString,
  getCharacterNameErrorStringIdText,
} from '@swg/protocol/swg/messages/character-name.js';
import {
  type ClientCreateCharacter,
  type CreateCharacterSuccess,
  type CreateCharacterFailure,
  type ClientVerifyAndLockNameRequest,
  type ClientVerifyAndLockNameResponse,
  type ClientRandomNameRequest,
  type ClientRandomNameResponse,
  type StringId,
  createCreateCharacterSuccess,
  createCreateCharacterFailure,
  createClientVerifyAndLockNameResponse,
  createClientRandomNameResponse,
  serializeCreateCharacterSuccess,
  serializeCreateCharacterFailure,
  serializeClientVerifyAndLockNameResponse,
  serializeClientRandomNameResponse,
} from '@swg/protocol/swg/messages/character-creation.js';

import {
  Species,
  getSpeciesByTemplate,
  getSpeciesByTemplateCrc,
  isValidSpeciesTemplate,
  type SpeciesDefinition,
  type GenderType,
} from '../data/species.js';
import {
  getStartingLocationById,
  isValidStartingLocation,
  getDefaultStartingLocation,
  getTutorialLocation,
  type StartingLocation,
} from '../data/starting-locations.js';
import { checkProfanity } from '../data/profanity-filter.js';
import type { ClientSession } from './login-handler.js';

/**
 * Maximum characters per account
 */
const MAX_CHARACTERS_PER_ACCOUNT = 8;

/**
 * Valid starting professions (pre-NGE)
 */
const VALID_PROFESSIONS = [
  'crafting_artisan',
  'combat_brawler',
  'outdoors_scout',
  'combat_marksman',
  'social_entertainer',
  'science_medic',
] as const;

export type ValidProfession = (typeof VALID_PROFESSIONS)[number];

/**
 * Name validation result
 */
export interface NameValidationResult {
  valid: boolean;
  error: CharacterNameErrorType;
  message: string;
}

/**
 * Species validation result
 */
export interface SpeciesValidationResult {
  valid: boolean;
  species?: SpeciesDefinition;
  gender?: GenderType;
  error?: string;
}

/**
 * Profession validation result
 */
export interface ProfessionValidationResult {
  valid: boolean;
  profession?: ValidProfession;
  error?: string;
}

/**
 * Location validation result
 */
export interface LocationValidationResult {
  valid: boolean;
  location?: StartingLocation;
  error?: string;
}

/**
 * Customization validation result
 */
export interface CustomizationValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Full character creation result
 */
export interface CharacterCreationResult {
  success: boolean;
  response: Uint8Array;
  characterId?: bigint;
  error?: CharacterNameErrorType;
  errorMessage?: string;
}

/**
 * Random name syllables for name generation
 */
const NAME_SYLLABLES: Record<string, { first: string[]; middle: string[]; last: string[] }> = {
  human: {
    first: ['Al', 'Ar', 'Ben', 'Cal', 'Dan', 'El', 'Fen', 'Gal', 'Han', 'Jar', 'Kel', 'Lan', 'Mar', 'Nik', 'Or', 'Pan', 'Ral', 'San', 'Tal', 'Val'],
    middle: ['an', 'en', 'in', 'on', 'ar', 'er', 'ir', 'or', 'as', 'es', 'is', 'os', 'ak', 'ek', 'ik', 'ok'],
    last: ['a', 'e', 'i', 'o', 'us', 'on', 'an', 'en', 'ar', 'er', 'ax', 'ex', 'ix', 'ox'],
  },
  rodian: {
    first: ['Gr', 'Kr', 'Tr', 'Dr', 'Br', 'Fr', 'Pr', 'Str', 'Thr', 'Shr'],
    middle: ['ee', 'oo', 'aa', 'uu', 'ii', 'ae', 'eo', 'io', 'ua', 'ai'],
    last: ['do', 'ko', 'to', 'so', 'no', 'mo', 'lo', 'ro', 'vo', 'zo'],
  },
  trandoshan: {
    first: ['Bos', 'Cra', 'Dra', 'Fes', 'Gra', 'Kra', 'Ssa', 'Tra', 'Vos', 'Zss'],
    middle: ['aa', 'ee', 'ii', 'oo', 'ss', 'rr', 'kk', 'll'],
    last: ['sk', 'nk', 'ss', 'kk', 'rk', 'lk', 'sh', 'th'],
  },
  wookiee: {
    first: ['Chew', 'Gorr', 'Lump', 'Rarr', 'Tach', 'Warr', 'Zurr', 'Grun', 'Brac', 'Frey'],
    middle: ['bac', 'pac', 'wac', 'rac', 'lac', 'tac', 'nac', 'mac'],
    last: ['ca', 'wa', 'ra', 'la', 'ta', 'na', 'ma', 'pa'],
  },
  twilek: {
    first: ["Aar", "Bib", "Dia", "For", "Lyn", "Mir", "Nal", "Orn", "Tann", "Vette"],
    middle: ["aa", "oo", "ee", "ii", "uu", "ay", "ey", "iy"],
    last: ["la", "ra", "na", "da", "ka", "ta", "sa", "ma"],
  },
  default: {
    first: ['Ax', 'Bex', 'Cax', 'Dex', 'Fax', 'Gex', 'Hax', 'Jex', 'Kax', 'Lex'],
    middle: ['an', 'en', 'in', 'on', 'un', 'ar', 'er', 'ir', 'or', 'ur'],
    last: ['a', 'e', 'i', 'o', 'u', 'ax', 'ex', 'ix', 'ox', 'ux'],
  },
};

/**
 * Character Creation Handler
 */
export class CharacterCreationHandler {
  private readonly characterRepository: CharacterRepository;
  private readonly sessionStore: SessionStore;
  private readonly serverId: number;

  constructor(
    characterRepository: CharacterRepository,
    sessionStore: SessionStore,
    serverId: number = 1
  ) {
    this.characterRepository = characterRepository;
    this.sessionStore = sessionStore;
    this.serverId = serverId;
  }

  /**
   * Validate a character name
   */
  public async validateCharacterName(
    name: string,
    species?: SpeciesDefinition
  ): Promise<NameValidationResult> {
    // Check for empty name
    if (!name || name.trim().length === 0) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_EMPTY,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_EMPTY),
      };
    }

    const trimmedName = name.trim();

    // Check for numbers
    if (NameValidation.HAS_NUMBERS_PATTERN.test(trimmedName)) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_NUMBER,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_NUMBER),
      };
    }

    // Split into first and last name
    const nameParts = trimmedName.split(/\s+/);
    const firstName = nameParts[0]!;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Validate first name length
    if (firstName.length < NameValidation.MIN_FIRST_NAME_LENGTH) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_TOO_SHORT,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_TOO_SHORT),
      };
    }

    if (firstName.length > NameValidation.MAX_FIRST_NAME_LENGTH) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_TOO_LONG,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_TOO_LONG),
      };
    }

    // Validate last name if present
    if (lastName) {
      if (lastName.length < NameValidation.MIN_LAST_NAME_LENGTH) {
        return {
          valid: false,
          error: CharacterNameError.DECLINED_TOO_SHORT,
          message: 'Last name is too short.',
        };
      }

      if (lastName.length > NameValidation.MAX_LAST_NAME_LENGTH) {
        return {
          valid: false,
          error: CharacterNameError.DECLINED_TOO_LONG,
          message: 'Last name is too long.',
        };
      }
    }

    // Check total length
    if (trimmedName.length > NameValidation.MAX_TOTAL_LENGTH) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_TOO_LONG,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_TOO_LONG),
      };
    }

    // Check for valid characters
    if (!NameValidation.VALID_NAME_PATTERN.test(firstName)) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_SYNTAX,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_SYNTAX),
      };
    }

    if (lastName && !NameValidation.VALID_NAME_PATTERN.test(lastName)) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_SYNTAX,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_SYNTAX),
      };
    }

    // Check for consecutive spaces
    if (NameValidation.CONSECUTIVE_SPACES_PATTERN.test(trimmedName)) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_SYNTAX,
        message: 'Name cannot contain consecutive spaces.',
      };
    }

    // Check for consecutive identical characters
    if (this.hasExcessiveRepeatingChars(firstName) || this.hasExcessiveRepeatingChars(lastName)) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_SYNTAX,
        message: 'Name contains too many repeating characters.',
      };
    }

    // Check species-specific surname rules
    if (species) {
      if (species.requireSurname && !lastName) {
        return {
          valid: false,
          error: CharacterNameError.DECLINED_MUST_INCLUDE_SURNAME,
          message: getCharacterNameErrorString(CharacterNameError.DECLINED_MUST_INCLUDE_SURNAME),
        };
      }

      if (!species.allowSurname && lastName) {
        return {
          valid: false,
          error: CharacterNameError.DECLINED_CANNOT_INCLUDE_SURNAME,
          message: getCharacterNameErrorString(CharacterNameError.DECLINED_CANNOT_INCLUDE_SURNAME),
        };
      }
    }

    // Check profanity
    const profanityResult = checkProfanity(trimmedName);
    if (profanityResult.containsProfanity) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_PROFANE,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_PROFANE),
      };
    }

    // Check reserved prefixes
    const lowerName = trimmedName.toLowerCase();
    for (const prefix of ReservedPrefixes) {
      if (lowerName.startsWith(prefix)) {
        return {
          valid: false,
          error: CharacterNameError.DECLINED_RESERVED,
          message: getCharacterNameErrorString(CharacterNameError.DECLINED_RESERVED),
        };
      }
    }

    // Check reserved names (fictional characters)
    for (const reserved of ReservedNames) {
      if (lowerName === reserved || lowerName.includes(reserved)) {
        return {
          valid: false,
          error: CharacterNameError.DECLINED_FICTION,
          message: getCharacterNameErrorString(CharacterNameError.DECLINED_FICTION),
        };
      }
    }

    // Check uniqueness (case-insensitive)
    const existingCharacter = await this.characterRepository.findByName(trimmedName);
    if (existingCharacter) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_IN_USE,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_IN_USE),
      };
    }

    return {
      valid: true,
      error: CharacterNameError.ACCEPTED,
      message: '',
    };
  }

  /**
   * Check for excessive repeating characters
   */
  private hasExcessiveRepeatingChars(str: string): boolean {
    if (!str) return false;

    let count = 1;
    for (let i = 1; i < str.length; i++) {
      if (str[i]!.toLowerCase() === str[i - 1]!.toLowerCase()) {
        count++;
        if (count > NameValidation.MAX_CONSECUTIVE_IDENTICAL) {
          return true;
        }
      } else {
        count = 1;
      }
    }
    return false;
  }

  /**
   * Create a StringId from a CharacterNameErrorType
   */
  private errorToStringId(error: CharacterNameErrorType): StringId {
    return {
      table: 'ui',
      textIndex: 0,
      text: getCharacterNameErrorStringIdText(error),
    };
  }

  /**
   * Validate species template by name string
   */
  public validateSpeciesByName(templateName: string): SpeciesValidationResult {
    const speciesInfo = getSpeciesByTemplate(templateName);
    if (!speciesInfo) {
      return {
        valid: false,
        error: `Invalid species template: ${templateName}`,
      };
    }

    // Determine gender from template name
    const gender = templateName.includes('female') ? 'female' as GenderType : 'male' as GenderType;

    return {
      valid: true,
      species: speciesInfo,
      gender,
    };
  }

  /**
   * Validate species template by CRC
   */
  public validateSpecies(templateCrc: number): SpeciesValidationResult {
    if (!isValidSpeciesTemplate(templateCrc)) {
      return {
        valid: false,
        error: `Invalid species template CRC: 0x${templateCrc.toString(16)}`,
      };
    }

    const speciesInfo = getSpeciesByTemplateCrc(templateCrc);
    if (!speciesInfo) {
      return {
        valid: false,
        error: 'Species template not found',
      };
    }

    return {
      valid: true,
      species: speciesInfo.species,
      gender: speciesInfo.gender,
    };
  }

  /**
   * Validate starting profession
   */
  public validateProfession(profession: string): ProfessionValidationResult {
    const normalizedProfession = profession.toLowerCase().trim();

    if (!VALID_PROFESSIONS.includes(normalizedProfession as ValidProfession)) {
      return {
        valid: false,
        error: `Invalid profession: ${profession}`,
      };
    }

    return {
      valid: true,
      profession: normalizedProfession as ValidProfession,
    };
  }

  /**
   * Validate starting location
   */
  public validateStartingLocation(
    locationId: string,
    startTutorial: boolean
  ): LocationValidationResult {
    // If starting tutorial, use tutorial location
    if (startTutorial) {
      return {
        valid: true,
        location: getTutorialLocation(),
      };
    }

    // Check if location is valid
    if (!isValidStartingLocation(locationId)) {
      // Default to tutorial if invalid
      return {
        valid: true,
        location: getDefaultStartingLocation(),
      };
    }

    const location = getStartingLocationById(locationId);
    if (!location) {
      return {
        valid: true,
        location: getDefaultStartingLocation(),
      };
    }

    return {
      valid: true,
      location,
    };
  }

  /**
   * Validate appearance customization data
   */
  public validateCustomization(
    appearanceData: string,
    species: SpeciesDefinition
  ): CustomizationValidationResult {
    // Basic validation - check that appearance data is present and reasonable size
    if (!appearanceData || appearanceData.length === 0) {
      // Empty appearance data is allowed (will use defaults)
      return { valid: true };
    }

    // Maximum expected size for appearance data
    const MAX_APPEARANCE_SIZE = 4096;
    if (appearanceData.length > MAX_APPEARANCE_SIZE) {
      return {
        valid: false,
        error: 'Appearance data too large',
      };
    }

    return { valid: true };
  }

  /**
   * Generate a unique character ID
   */
  private generateCharacterId(): bigint {
    // Generate a unique ID using timestamp and random component
    const timestamp = BigInt(Date.now());
    const random = BigInt(Math.floor(Math.random() * 0xfffff));
    const serverId = BigInt(this.serverId);

    // Format: [12 bits server][20 bits random][32 bits timestamp]
    return (serverId << 52n) | (random << 32n) | (timestamp & 0xffffffffn);
  }

  /**
   * Create a new character
   * Full creation flow with validation
   */
  public async createCharacter(
    session: ClientSession,
    message: ClientCreateCharacter
  ): Promise<CharacterCreationResult> {
    const charName = message.characterName;

    // Check if session is authenticated
    if (!session.authenticated || !session.accountId) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_NOT_AUTHORIZED))
        ),
        error: CharacterNameError.DECLINED_NOT_AUTHORIZED,
        errorMessage: 'Not authenticated',
      };
    }

    const accountId = session.accountId;

    // Check character count
    try {
      const existingCharacters = await this.characterRepository.findByAccountId(accountId);
      if (existingCharacters.length >= MAX_CHARACTERS_PER_ACCOUNT) {
        return {
          success: false,
          response: serializeCreateCharacterFailure(
            createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_TOO_MANY_CHARACTERS))
          ),
          error: CharacterNameError.DECLINED_TOO_MANY_CHARACTERS,
          errorMessage: `Maximum ${MAX_CHARACTERS_PER_ACCOUNT} characters per account`,
        };
      }
    } catch (error) {
      console.error('[CharacterCreation] Error checking character count:', error);
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_INTERNAL_ERROR))
        ),
        error: CharacterNameError.DECLINED_INTERNAL_ERROR,
        errorMessage: 'Internal error',
      };
    }

    // Validate species by template name string
    const speciesResult = this.validateSpeciesByName(message.templateName);
    if (!speciesResult.valid || !speciesResult.species) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_CANT_CREATE_AVATAR))
        ),
        error: CharacterNameError.DECLINED_CANT_CREATE_AVATAR,
        ...(speciesResult.error !== undefined && { errorMessage: speciesResult.error }),
      };
    }

    // Validate name
    const nameResult = await this.validateCharacterName(
      charName,
      speciesResult.species
    );
    if (!nameResult.valid) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(nameResult.error))
        ),
        error: nameResult.error,
        errorMessage: nameResult.message,
      };
    }

    // Validate profession
    const professionResult = this.validateProfession(message.profession);
    if (!professionResult.valid) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_CANT_CREATE_AVATAR))
        ),
        error: CharacterNameError.DECLINED_CANT_CREATE_AVATAR,
        ...(professionResult.error !== undefined && { errorMessage: professionResult.error }),
      };
    }

    // Validate starting location
    const locationResult = this.validateStartingLocation(
      message.startingLocation,
      message.useNewbieTutorial
    );
    if (!locationResult.valid || !locationResult.location) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_CANT_CREATE_AVATAR))
        ),
        error: CharacterNameError.DECLINED_CANT_CREATE_AVATAR,
        ...(locationResult.error !== undefined && { errorMessage: locationResult.error }),
      };
    }

    // Validate appearance (now a string, convert to buffer for storage)
    const appearanceBuffer = Buffer.from(message.appearanceData, 'ascii');
    if (appearanceBuffer.length > 4096) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_CANT_CREATE_AVATAR))
        ),
        error: CharacterNameError.DECLINED_CANT_CREATE_AVATAR,
        errorMessage: 'Appearance data too large',
      };
    }

    // Generate character ID
    const characterId = this.generateCharacterId();
    const location = locationResult.location;

    // Determine the shared template name for the character
    // The client sends the non-shared template (e.g., "object/creature/player/human_male.iff")
    // We store the shared version for EnumerateCharacterIdResponse
    const sharedTemplateName = message.templateName.replace('/player/', '/player/shared_');

    // Create character in database
    try {
      const characterData: CreateCharacterData = {
        characterId,
        accountId,
        name: charName.trim(),
        templateName: sharedTemplateName,
        sceneId: location.sceneId,
        x: location.position.x,
        y: location.position.y,
        z: location.position.z,
        orientationX: location.orientation.x,
        orientationY: location.orientation.y,
        orientationZ: location.orientation.z,
        orientationW: location.orientation.w,
        appearance: {
          customizationData: appearanceBuffer,
          scale: message.scaleFactor || 1.0,
        },
      };

      await this.characterRepository.create(characterData);

      // Add starting skill for profession
      await this.addStartingSkills(characterId, professionResult.profession!);

      console.log(
        `[CharacterCreation] Created character "${charName}" (ID: ${characterId}) for account ${accountId}`
      );

      return {
        success: true,
        response: serializeCreateCharacterSuccess(createCreateCharacterSuccess(characterId)),
        characterId,
      };
    } catch (error) {
      console.error('[CharacterCreation] Error creating character:', error);
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_INTERNAL_ERROR))
        ),
        error: CharacterNameError.DECLINED_INTERNAL_ERROR,
        errorMessage: 'Failed to create character',
      };
    }
  }

  /**
   * Add starting skills based on profession
   */
  private async addStartingSkills(
    characterId: bigint,
    profession: ValidProfession
  ): Promise<void> {
    const professionSkills: Record<ValidProfession, string[]> = {
      crafting_artisan: ['crafting_artisan_novice'],
      combat_brawler: ['combat_brawler_novice'],
      outdoors_scout: ['outdoors_scout_novice'],
      combat_marksman: ['combat_marksman_novice'],
      social_entertainer: ['social_entertainer_novice'],
      science_medic: ['science_medic_novice'],
    };

    const skills = professionSkills[profession] || [];

    for (const skill of skills) {
      try {
        await this.characterRepository.addSkill(characterId, skill);
      } catch (error) {
        console.error(`[CharacterCreation] Error adding skill ${skill}:`, error);
      }
    }
  }

  /**
   * Handle name verification request
   */
  public async handleVerifyName(
    session: ClientSession,
    message: ClientVerifyAndLockNameRequest
  ): Promise<Uint8Array> {
    // Validate species first (now using template name string)
    const speciesResult = this.validateSpeciesByName(message.templateName);

    // Validate name
    const nameResult = await this.validateCharacterName(
      message.characterName,
      speciesResult.species
    );

    const response = createClientVerifyAndLockNameResponse(
      message.characterName,
      this.errorToStringId(nameResult.error)
    );

    return serializeClientVerifyAndLockNameResponse(response);
  }

  /**
   * Handle random name request
   */
  public handleRandomName(message: ClientRandomNameRequest): Uint8Array {
    // Extract species from template name
    const speciesId = this.extractSpeciesFromTemplate(message.templateName);
    const syllables = NAME_SYLLABLES[speciesId] ?? NAME_SYLLABLES['default']!;

    // Generate a random name
    const firstName = this.generateRandomNamePart(syllables);

    const response = createClientRandomNameResponse(
      message.templateName,
      firstName,
      this.errorToStringId(CharacterNameError.ACCEPTED)
    );

    return serializeClientRandomNameResponse(response);
  }

  /**
   * Extract species ID from template name
   */
  private extractSpeciesFromTemplate(template: string): string {
    const lower = template.toLowerCase();

    if (lower.includes('human')) return 'human';
    if (lower.includes('rodian')) return 'rodian';
    if (lower.includes('trandoshan')) return 'trandoshan';
    if (lower.includes('wookiee')) return 'wookiee';
    if (lower.includes('twilek')) return 'twilek';
    if (lower.includes('bothan')) return 'bothan';
    if (lower.includes('moncal')) return 'moncal';
    if (lower.includes('zabrak')) return 'zabrak';
    if (lower.includes('ithorian')) return 'ithorian';
    if (lower.includes('sullustan')) return 'sullustan';

    return 'default';
  }

  /**
   * Generate a random name part from syllables
   */
  private generateRandomNamePart(syllables: {
    first: string[];
    middle: string[];
    last: string[];
  }): string {
    const randomFrom = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)]!;

    // 2-3 syllables
    const syllableCount = Math.random() < 0.5 ? 2 : 3;

    let name = randomFrom(syllables.first);

    if (syllableCount >= 2) {
      name += randomFrom(syllables.middle);
    }

    if (syllableCount >= 3) {
      name += randomFrom(syllables.middle);
    }

    name += randomFrom(syllables.last);

    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  /**
   * Get the server ID
   */
  public getServerId(): number {
    return this.serverId;
  }
}

/**
 * Create a new CharacterCreationHandler instance
 */
export function createCharacterCreationHandler(
  characterRepository: CharacterRepository,
  sessionStore: SessionStore,
  serverId?: number
): CharacterCreationHandler {
  return new CharacterCreationHandler(characterRepository, sessionStore, serverId);
}
