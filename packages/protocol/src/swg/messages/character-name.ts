/**
 * Character Name Validation
 * Error codes and constants for character name validation
 */

/**
 * Character name error codes
 * These match the SWG client's expected error codes
 */
export const CharacterNameError = {
  /** Name is acceptable */
  ACCEPTED: 0x00,
  /** Name was declined but no specific reason given */
  DECLINED: 0x01,
  /** Name contains a reserved word (e.g., "developer", "admin") */
  DECLINED_RESERVED: 0x02,
  /** Name contains profane or inappropriate language */
  DECLINED_PROFANE: 0x03,
  /** Name is empty or contains only whitespace */
  DECLINED_EMPTY: 0x04,
  /** Name contains an inappropriate fictional reference */
  DECLINED_FICTION: 0x05,
  /** Name contains inappropriate racial slurs */
  DECLINED_RACIALLY_INSENSITIVE: 0x06,
  /** Name already exists (taken by another character) */
  DECLINED_IN_USE: 0x07,
  /** Name contains invalid characters */
  DECLINED_SYNTAX: 0x08,
  /** Retry request (used when name validation is asynchronous) */
  DECLINED_RETRY: 0x09,
  /** Name matches a developer or staff member name */
  DECLINED_DEVELOPER: 0x0a,
  /** Name doesn't follow the rules for first names */
  DECLINED_NOT_CREATURE: 0x0b,
  /** Name cannot be modified (for NPC references) */
  DECLINED_CANNOT_MODIFY: 0x0c,
  /** Not authorized to create a character on this cluster */
  DECLINED_NOT_AUTHORIZED: 0x0d,
  /** Name contains inappropriate Star Wars character name */
  DECLINED_CANT_CREATE_AVATAR: 0x0e,
  /** Internal server error during validation */
  DECLINED_INTERNAL_ERROR: 0x0f,
  /** No name was provided */
  DECLINED_NO_NAME: 0x10,
  /** Name is too short */
  DECLINED_TOO_SHORT: 0x11,
  /** Name is too long */
  DECLINED_TOO_LONG: 0x12,
  /** First name contains only numbers or special characters */
  DECLINED_NO_NAME_GENERATOR: 0x13,
  /** Name already reserved for transfer */
  DECLINED_TRANSFER: 0x14,
  /** Account is already full of characters */
  DECLINED_TOO_MANY_CHARACTERS: 0x15,
  /** Internal error (no cluster found) */
  DECLINED_CENTRAL_SERVER_DOWN: 0x16,
  /** Name contains numbers */
  DECLINED_NUMBER: 0x17,
  /** Must include a last name */
  DECLINED_MUST_INCLUDE_SURNAME: 0x18,
  /** Cannot include a last name (for species that don't allow it) */
  DECLINED_CANNOT_INCLUDE_SURNAME: 0x19,
} as const;

export type CharacterNameErrorType =
  (typeof CharacterNameError)[keyof typeof CharacterNameError];

/**
 * Name validation constants
 */
export const NameValidation = {
  /** Minimum length for first name */
  MIN_FIRST_NAME_LENGTH: 3,
  /** Maximum length for first name */
  MAX_FIRST_NAME_LENGTH: 20,
  /** Minimum length for last name (if present) */
  MIN_LAST_NAME_LENGTH: 3,
  /** Maximum length for last name */
  MAX_LAST_NAME_LENGTH: 20,
  /** Maximum total name length (first + space + last) */
  MAX_TOTAL_LENGTH: 40,
  /** Valid characters for names (letters, spaces, apostrophes, hyphens) */
  VALID_NAME_PATTERN: /^[a-zA-Z][a-zA-Z '\-]*[a-zA-Z]$/,
  /** Pattern to check for numbers */
  HAS_NUMBERS_PATTERN: /[0-9]/,
  /** Pattern to check for consecutive spaces */
  CONSECUTIVE_SPACES_PATTERN: /\s{2,}/,
  /** Pattern to check for valid first character */
  STARTS_WITH_LETTER_PATTERN: /^[a-zA-Z]/,
  /** Maximum consecutive identical characters */
  MAX_CONSECUTIVE_IDENTICAL: 2,
} as const;

/**
 * Reserved name prefixes that are not allowed
 * These are used to prevent confusion with official game entities
 */
export const ReservedPrefixes = [
  'gm',
  'admin',
  'mod',
  'moderator',
  'dev',
  'developer',
  'soe',
  'sony',
  'lucas',
  'lucasart',
  'lucasfilm',
  'swg',
  'support',
  'help',
  'system',
  'server',
  'official',
  'staff',
  'team',
  'customer',
  'service',
  'csr',
] as const;

/**
 * Reserved complete names that are not allowed
 */
export const ReservedNames = [
  // Star Wars main characters
  'luke',
  'skywalker',
  'leia',
  'organa',
  'hansolo',
  'han solo',
  'chewie',
  'chewbacca',
  'vader',
  'darth vader',
  'anakin',
  'obi-wan',
  'obiwan',
  'kenobi',
  'yoda',
  'palpatine',
  'emperor',
  'sidious',
  'maul',
  'dooku',
  'grievous',
  'windu',
  'macewindu',
  'boba fett',
  'bobafett',
  'jango',
  'jango fett',
  'jabba',
  'jabba the hutt',
  'lando',
  'calrissian',
  'wedge',
  'antilles',
  'tarkin',
  'ackbar',
  'admiral ackbar',
  'padme',
  'amidala',
  'qui-gon',
  'quigon',
  'jinn',
  'revan',
  'malak',
  'bastila',
  'thrawn',
  'starkiller',
  'ashoka',
  'ahsoka',
  'rex',
  'captain rex',
  'cody',
  'commander cody',
  // Species that might be confused
  'jedi master',
  'jedimaster',
  'sith lord',
  'sithlord',
  // SWG-specific protected names
  'nightsister',
  'dathomir witch',
] as const;

/**
 * Get the StringId text key for a character name error
 * Maps error codes to the C++ NameErrors.cpp text keys used in StringId
 * @param error The error code
 * @returns StringId text value (e.g., "name_approved", "name_declined_in_use")
 */
export function getCharacterNameErrorStringIdText(error: CharacterNameErrorType): string {
  switch (error) {
    case CharacterNameError.ACCEPTED:
      return 'name_approved';
    case CharacterNameError.DECLINED:
      return 'name_declined_syntax';
    case CharacterNameError.DECLINED_RESERVED:
      return 'name_declined_reserved';
    case CharacterNameError.DECLINED_PROFANE:
      return 'name_declined_profane';
    case CharacterNameError.DECLINED_EMPTY:
      return 'name_declined_empty';
    case CharacterNameError.DECLINED_FICTION:
      return 'name_declined_fictionally_inappropriate';
    case CharacterNameError.DECLINED_RACIALLY_INSENSITIVE:
      return 'name_declined_racially_insensitive';
    case CharacterNameError.DECLINED_IN_USE:
      return 'name_declined_in_use';
    case CharacterNameError.DECLINED_SYNTAX:
      return 'name_declined_syntax';
    case CharacterNameError.DECLINED_RETRY:
      return 'name_declined_retry';
    case CharacterNameError.DECLINED_DEVELOPER:
      return 'name_declined_developer';
    case CharacterNameError.DECLINED_NOT_CREATURE:
      return 'name_declined_syntax';
    case CharacterNameError.DECLINED_CANNOT_MODIFY:
      return 'name_declined_syntax';
    case CharacterNameError.DECLINED_NOT_AUTHORIZED:
      return 'name_declined_not_authorized_for_species';
    case CharacterNameError.DECLINED_CANT_CREATE_AVATAR:
      return 'name_declined_cant_create_avatar';
    case CharacterNameError.DECLINED_INTERNAL_ERROR:
      return 'name_declined_internal_error';
    case CharacterNameError.DECLINED_NO_NAME:
      return 'name_declined_empty';
    case CharacterNameError.DECLINED_TOO_SHORT:
      return 'name_declined_too_short';
    case CharacterNameError.DECLINED_TOO_LONG:
      return 'name_declined_too_long';
    case CharacterNameError.DECLINED_NO_NAME_GENERATOR:
      return 'name_declined_no_name_generator';
    case CharacterNameError.DECLINED_TRANSFER:
      return 'name_declined_syntax';
    case CharacterNameError.DECLINED_TOO_MANY_CHARACTERS:
      return 'name_declined_too_many_characters';
    case CharacterNameError.DECLINED_CENTRAL_SERVER_DOWN:
      return 'name_declined_internal_error';
    case CharacterNameError.DECLINED_NUMBER:
      return 'name_declined_number';
    case CharacterNameError.DECLINED_MUST_INCLUDE_SURNAME:
      return 'name_declined_must_include_surname';
    case CharacterNameError.DECLINED_CANNOT_INCLUDE_SURNAME:
      return 'name_declined_cannot_include_surname';
    default:
      return 'name_declined_syntax';
  }
}

/**
 * Get the error string for a character name error
 * @param error The error code
 * @returns Human-readable error string
 */
export function getCharacterNameErrorString(error: CharacterNameErrorType): string {
  switch (error) {
    case CharacterNameError.ACCEPTED:
      return '';
    case CharacterNameError.DECLINED:
      return 'The name was declined.';
    case CharacterNameError.DECLINED_RESERVED:
      return 'This name is reserved and cannot be used.';
    case CharacterNameError.DECLINED_PROFANE:
      return 'This name contains inappropriate language.';
    case CharacterNameError.DECLINED_EMPTY:
      return 'A name is required.';
    case CharacterNameError.DECLINED_FICTION:
      return 'This name references a fictional character and cannot be used.';
    case CharacterNameError.DECLINED_RACIALLY_INSENSITIVE:
      return 'This name contains inappropriate content.';
    case CharacterNameError.DECLINED_IN_USE:
      return 'This name is already in use.';
    case CharacterNameError.DECLINED_SYNTAX:
      return 'This name contains invalid characters.';
    case CharacterNameError.DECLINED_RETRY:
      return 'Please try again.';
    case CharacterNameError.DECLINED_DEVELOPER:
      return 'This name is reserved for developers.';
    case CharacterNameError.DECLINED_NOT_CREATURE:
      return 'This name is not valid for a creature.';
    case CharacterNameError.DECLINED_CANNOT_MODIFY:
      return 'This name cannot be modified.';
    case CharacterNameError.DECLINED_NOT_AUTHORIZED:
      return 'You are not authorized to create a character.';
    case CharacterNameError.DECLINED_CANT_CREATE_AVATAR:
      return 'Unable to create character with this name.';
    case CharacterNameError.DECLINED_INTERNAL_ERROR:
      return 'An internal error occurred. Please try again.';
    case CharacterNameError.DECLINED_NO_NAME:
      return 'A name is required.';
    case CharacterNameError.DECLINED_TOO_SHORT:
      return 'The name is too short.';
    case CharacterNameError.DECLINED_TOO_LONG:
      return 'The name is too long.';
    case CharacterNameError.DECLINED_NO_NAME_GENERATOR:
      return 'Unable to generate a name.';
    case CharacterNameError.DECLINED_TRANSFER:
      return 'This name is reserved for a character transfer.';
    case CharacterNameError.DECLINED_TOO_MANY_CHARACTERS:
      return 'You have too many characters on this account.';
    case CharacterNameError.DECLINED_CENTRAL_SERVER_DOWN:
      return 'The character creation service is unavailable.';
    case CharacterNameError.DECLINED_NUMBER:
      return 'Names cannot contain numbers.';
    case CharacterNameError.DECLINED_MUST_INCLUDE_SURNAME:
      return 'You must include a last name.';
    case CharacterNameError.DECLINED_CANNOT_INCLUDE_SURNAME:
      return 'Your species cannot have a last name.';
    default:
      return 'The name was declined.';
  }
}
