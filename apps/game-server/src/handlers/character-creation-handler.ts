/**
 * Character Creation Handler (Connection Server)
 * Handles the full character creation flow including validation.
 * Adapted from login-server version to work with connection-server session types.
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
  type CharacterCreationStringId,
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

/**
 * Minimal session interface needed for character creation.
 * Compatible with both login-server and connection-server session types.
 */
export interface CharacterCreationSession {
  authenticated: boolean;
  accountId?: number | undefined;
}

const MAX_CHARACTERS_PER_ACCOUNT = 8;

const VALID_PROFESSIONS = [
  'crafting_artisan',
  'combat_brawler',
  'outdoors_scout',
  'combat_marksman',
  'social_entertainer',
  'science_medic',
] as const;

type ValidProfession = (typeof VALID_PROFESSIONS)[number];

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
    first: ['Aar', 'Bib', 'Dia', 'For', 'Lyn', 'Mir', 'Nal', 'Orn', 'Tann', 'Vette'],
    middle: ['aa', 'oo', 'ee', 'ii', 'uu', 'ay', 'ey', 'iy'],
    last: ['la', 'ra', 'na', 'da', 'ka', 'ta', 'sa', 'ma'],
  },
  default: {
    first: ['Ax', 'Bex', 'Cax', 'Dex', 'Fax', 'Gex', 'Hax', 'Jex', 'Kax', 'Lex'],
    middle: ['an', 'en', 'in', 'on', 'un', 'ar', 'er', 'ir', 'or', 'ur'],
    last: ['a', 'e', 'i', 'o', 'u', 'ax', 'ex', 'ix', 'ox', 'ux'],
  },
};

export class CharacterCreationHandler {
  private readonly characterRepository: CharacterRepository;
  private readonly sessionStore: SessionStore;
  private readonly serverId: number;

  constructor(
    characterRepository: CharacterRepository,
    sessionStore: SessionStore,
    serverId: number = 1,
  ) {
    this.characterRepository = characterRepository;
    this.sessionStore = sessionStore;
    this.serverId = serverId;
  }

  private errorToStringId(error: CharacterNameErrorType): CharacterCreationStringId {
    return {
      table: 'ui',
      textIndex: 0,
      text: getCharacterNameErrorStringIdText(error),
    };
  }

  public async validateCharacterName(
    name: string,
    species?: SpeciesDefinition,
  ): Promise<{ valid: boolean; error: CharacterNameErrorType; message: string }> {
    if (!name || name.trim().length === 0) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_EMPTY,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_EMPTY),
      };
    }

    const trimmedName = name.trim();

    if (NameValidation.HAS_NUMBERS_PATTERN.test(trimmedName)) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_NUMBER,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_NUMBER),
      };
    }

    const nameParts = trimmedName.split(/\s+/);
    const firstName = nameParts[0]!;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

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

    if (lastName) {
      if (lastName.length < NameValidation.MIN_LAST_NAME_LENGTH) {
        return { valid: false, error: CharacterNameError.DECLINED_TOO_SHORT, message: 'Last name is too short.' };
      }
      if (lastName.length > NameValidation.MAX_LAST_NAME_LENGTH) {
        return { valid: false, error: CharacterNameError.DECLINED_TOO_LONG, message: 'Last name is too long.' };
      }
    }

    if (trimmedName.length > NameValidation.MAX_TOTAL_LENGTH) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_TOO_LONG,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_TOO_LONG),
      };
    }

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

    if (NameValidation.CONSECUTIVE_SPACES_PATTERN.test(trimmedName)) {
      return { valid: false, error: CharacterNameError.DECLINED_SYNTAX, message: 'Name cannot contain consecutive spaces.' };
    }

    if (this.hasExcessiveRepeatingChars(firstName) || this.hasExcessiveRepeatingChars(lastName)) {
      return { valid: false, error: CharacterNameError.DECLINED_SYNTAX, message: 'Name contains too many repeating characters.' };
    }

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

    const profanityResult = checkProfanity(trimmedName);
    if (profanityResult.containsProfanity) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_PROFANE,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_PROFANE),
      };
    }

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

    for (const reserved of ReservedNames) {
      if (lowerName === reserved || lowerName.includes(reserved)) {
        return {
          valid: false,
          error: CharacterNameError.DECLINED_FICTION,
          message: getCharacterNameErrorString(CharacterNameError.DECLINED_FICTION),
        };
      }
    }

    const existingCharacter = await this.characterRepository.findByName(trimmedName);
    if (existingCharacter) {
      return {
        valid: false,
        error: CharacterNameError.DECLINED_IN_USE,
        message: getCharacterNameErrorString(CharacterNameError.DECLINED_IN_USE),
      };
    }

    return { valid: true, error: CharacterNameError.ACCEPTED, message: '' };
  }

  private hasExcessiveRepeatingChars(str: string): boolean {
    if (!str) return false;
    let count = 1;
    for (let i = 1; i < str.length; i++) {
      if (str[i]!.toLowerCase() === str[i - 1]!.toLowerCase()) {
        count++;
        if (count > NameValidation.MAX_CONSECUTIVE_IDENTICAL) return true;
      } else {
        count = 1;
      }
    }
    return false;
  }

  private generateCharacterId(): bigint {
    const timestamp = BigInt(Date.now());
    const random = BigInt(Math.floor(Math.random() * 0xfffff));
    const serverId = BigInt(this.serverId);
    return (serverId << 52n) | (random << 32n) | (timestamp & 0xffffffffn);
  }

  public async createCharacter(
    session: CharacterCreationSession,
    message: ClientCreateCharacter,
  ): Promise<CharacterCreationResult> {
    const charName = message.characterName;

    if (!session.authenticated || !session.accountId) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_NOT_AUTHORIZED)),
        ),
        error: CharacterNameError.DECLINED_NOT_AUTHORIZED,
        errorMessage: 'Not authenticated',
      };
    }

    const accountId = session.accountId;

    try {
      const existingCharacters = await this.characterRepository.findByAccountId(accountId);
      if (existingCharacters.length >= MAX_CHARACTERS_PER_ACCOUNT) {
        return {
          success: false,
          response: serializeCreateCharacterFailure(
            createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_TOO_MANY_CHARACTERS)),
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
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_INTERNAL_ERROR)),
        ),
        error: CharacterNameError.DECLINED_INTERNAL_ERROR,
        errorMessage: 'Internal error',
      };
    }

    const speciesResult = this.validateSpeciesByName(message.templateName);
    if (!speciesResult.valid || !speciesResult.species) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_CANT_CREATE_AVATAR)),
        ),
        error: CharacterNameError.DECLINED_CANT_CREATE_AVATAR,
        ...(speciesResult.error !== undefined && { errorMessage: speciesResult.error }),
      };
    }

    const nameResult = await this.validateCharacterName(charName, speciesResult.species);
    if (!nameResult.valid) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(nameResult.error)),
        ),
        error: nameResult.error,
        errorMessage: nameResult.message,
      };
    }

    const professionResult = this.validateProfession(message.profession);
    if (!professionResult.valid) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_CANT_CREATE_AVATAR)),
        ),
        error: CharacterNameError.DECLINED_CANT_CREATE_AVATAR,
        ...(professionResult.error !== undefined && { errorMessage: professionResult.error }),
      };
    }

    const locationResult = this.validateStartingLocation(message.startingLocation, message.useNewbieTutorial);
    if (!locationResult.valid || !locationResult.location) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_CANT_CREATE_AVATAR)),
        ),
        error: CharacterNameError.DECLINED_CANT_CREATE_AVATAR,
        ...(locationResult.error !== undefined && { errorMessage: locationResult.error }),
      };
    }

    const appearanceBuffer = Buffer.from(message.appearanceData, 'ascii');
    if (appearanceBuffer.length > 4096) {
      return {
        success: false,
        response: serializeCreateCharacterFailure(
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_CANT_CREATE_AVATAR)),
        ),
        error: CharacterNameError.DECLINED_CANT_CREATE_AVATAR,
        errorMessage: 'Appearance data too large',
      };
    }

    const characterId = this.generateCharacterId();
    const location = locationResult.location;
    const sharedTemplateName = message.templateName.replace('/player/', '/player/shared_');

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
      await this.addStartingSkills(characterId, professionResult.profession!);

      console.log(
        `[CharacterCreation] Created character "${charName}" (ID: ${characterId}) for account ${accountId}`,
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
          createCreateCharacterFailure(charName, this.errorToStringId(CharacterNameError.DECLINED_INTERNAL_ERROR)),
        ),
        error: CharacterNameError.DECLINED_INTERNAL_ERROR,
        errorMessage: 'Failed to create character',
      };
    }
  }

  private async addStartingSkills(characterId: bigint, profession: ValidProfession): Promise<void> {
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

  public async handleVerifyName(
    session: CharacterCreationSession,
    message: ClientVerifyAndLockNameRequest,
  ): Promise<Uint8Array> {
    const speciesResult = this.validateSpeciesByName(message.templateName);
    const nameResult = await this.validateCharacterName(message.characterName, speciesResult.species);

    const response = createClientVerifyAndLockNameResponse(
      message.characterName,
      this.errorToStringId(nameResult.error),
    );

    return serializeClientVerifyAndLockNameResponse(response);
  }

  public handleRandomName(message: ClientRandomNameRequest): Uint8Array {
    const speciesId = this.extractSpeciesFromTemplate(message.templateName);
    const syllables = NAME_SYLLABLES[speciesId] ?? NAME_SYLLABLES['default']!;
    const firstName = this.generateRandomNamePart(syllables);

    const response = createClientRandomNameResponse(
      message.templateName,
      firstName,
      this.errorToStringId(CharacterNameError.ACCEPTED),
    );

    return serializeClientRandomNameResponse(response);
  }

  private validateSpeciesByName(templateName: string): { valid: boolean; species?: SpeciesDefinition; error?: string } {
    const speciesInfo = getSpeciesByTemplate(templateName);
    if (!speciesInfo) {
      return { valid: false, error: `Invalid species template: ${templateName}` };
    }
    return { valid: true, species: speciesInfo };
  }

  private validateProfession(profession: string): { valid: boolean; profession?: ValidProfession; error?: string } {
    const normalizedProfession = profession.toLowerCase().trim();
    if (!VALID_PROFESSIONS.includes(normalizedProfession as ValidProfession)) {
      return { valid: false, error: `Invalid profession: ${profession}` };
    }
    return { valid: true, profession: normalizedProfession as ValidProfession };
  }

  private validateStartingLocation(
    locationId: string,
    startTutorial: boolean,
  ): { valid: boolean; location?: StartingLocation; error?: string } {
    if (startTutorial) {
      return { valid: true, location: getTutorialLocation() };
    }
    if (!isValidStartingLocation(locationId)) {
      return { valid: true, location: getDefaultStartingLocation() };
    }
    const location = getStartingLocationById(locationId);
    if (!location) {
      return { valid: true, location: getDefaultStartingLocation() };
    }
    return { valid: true, location };
  }

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

  private generateRandomNamePart(syllables: { first: string[]; middle: string[]; last: string[] }): string {
    const randomFrom = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)]!;
    const syllableCount = Math.random() < 0.5 ? 2 : 3;

    let name = randomFrom(syllables.first);
    if (syllableCount >= 2) name += randomFrom(syllables.middle);
    if (syllableCount >= 3) name += randomFrom(syllables.middle);
    name += randomFrom(syllables.last);

    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
}

export function createCharacterCreationHandler(
  characterRepository: CharacterRepository,
  sessionStore: SessionStore,
  serverId?: number,
): CharacterCreationHandler {
  return new CharacterCreationHandler(characterRepository, sessionStore, serverId);
}
