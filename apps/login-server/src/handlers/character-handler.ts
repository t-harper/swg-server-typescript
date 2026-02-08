/**
 * Character Handler
 * Handles character enumeration and related operations
 */

import { CharacterRepository, type Character } from '@swg/database';
import { SessionStore, type SessionData } from '@swg/redis';
import {
  type CharacterData,
  type EnumerateCharacterIdResponse,
  createEnumerateCharacterIdResponse,
  serializeEnumerateCharacterIdResponse,
} from '@swg/protocol/swg/messages/login-messages.js';
import type { ClientSession } from './login-handler.js';

import { TemplateCrc, calculateTemplateCrc } from '@swg/objects';

/**
 * Character type constants
 */
export const CharacterType = {
  // C++ enum values: CT_normal=1, CT_jedi=2, CT_spectral=3
  Normal: 1,
  Jedi: 2,
  Spectral: 3,
} as const;

export type CharacterTypeValue = (typeof CharacterType)[keyof typeof CharacterType];

/**
 * Result of character enumeration
 */
export interface CharacterEnumerationResult {
  success: boolean;
  response: Uint8Array;
  characterCount: number;
}

/**
 * CharacterHandler class
 * Manages character listing and retrieval
 */
export class CharacterHandler {
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
   * Handle an EnumerateCharacterId request
   * Returns the list of characters for the authenticated user
   * @param session - The authenticated client session
   * @returns CharacterEnumerationResult with response data
   */
  public async handleEnumerateCharacterId(
    session: ClientSession
  ): Promise<CharacterEnumerationResult> {
    // Ensure the session is authenticated
    if (!session.authenticated || !session.accountId) {
      console.log(
        `[CharacterHandler] Character enumeration requested without authentication`
      );
      return this.createEmptyResponse();
    }

    const accountId = session.accountId;
    console.log(
      `[CharacterHandler] Enumerating characters for account: ${accountId}`
    );

    try {
      // Get characters from database
      const characters = await this.characterRepository.findByAccountId(accountId);

      // Convert to CharacterData format
      const characterDataList = await this.convertToCharacterData(characters);

      console.log(
        `[CharacterHandler] Found ${characterDataList.length} characters for account ${accountId}`
      );

      // Create response
      const response = createEnumerateCharacterIdResponse(characterDataList);
      const serialized = serializeEnumerateCharacterIdResponse(response);

      return {
        success: true,
        response: serialized,
        characterCount: characterDataList.length,
      };
    } catch (error) {
      console.error(
        `[CharacterHandler] Error enumerating characters for account ${accountId}:`,
        error
      );
      return this.createEmptyResponse();
    }
  }

  /**
   * Handle character enumeration using a session token
   * @param sessionToken - The session token for authentication
   * @returns CharacterEnumerationResult with response data
   */
  public async handleEnumerateCharacterIdByToken(
    sessionToken: string
  ): Promise<CharacterEnumerationResult> {
    // Verify session
    const sessionData = await this.sessionStore.getSession(sessionToken);
    if (!sessionData) {
      console.log(
        `[CharacterHandler] Character enumeration with invalid session token`
      );
      return this.createEmptyResponse();
    }

    // Refresh session
    await this.sessionStore.refreshSession(sessionToken);

    // Create a mock client session for the handler
    const mockSession: ClientSession = {
      connectionId: 0,
      address: sessionData.connectionServer?.address ?? '',
      port: sessionData.connectionServer?.port ?? 0,
      crcSeed: 0,
      authenticated: true,
      accountId: sessionData.accountId,
      stationId: BigInt(sessionData.stationId),
      sessionToken,
    };

    return this.handleEnumerateCharacterId(mockSession);
  }

  /**
   * Convert database Character entities to CharacterData format
   */
  private async convertToCharacterData(
    characters: Character[]
  ): Promise<CharacterData[]> {
    const characterDataList: CharacterData[] = [];

    for (const char of characters) {
      // Determine character type (could be stored in DB or determined by skills)
      const characterType = await this.determineCharacterType(char);

      // Compute object template CRC from stored template name
      const objectTemplateCrc = this.getCharacterTemplate(char);

      characterDataList.push({
        characterName: char.name,
        objectTemplateCrc,
        characterId: char.characterId,
        clusterId: this.serverId,
        characterType,
      });
    }

    return characterDataList;
  }

  /**
   * Determine the character type based on character data
   * In a full implementation, this would check skills/abilities
   */
  private async determineCharacterType(
    character: Character
  ): Promise<CharacterTypeValue> {
    // For now, return Normal type
    // A full implementation would check the character's skills
    // to determine if they are a Jedi, etc.
    try {
      const fullChar = await this.characterRepository.findByIdWithRelations(
        character.characterId
      );

      if (fullChar?.skills) {
        // Check for Jedi skills
        const hasJediSkill = fullChar.skills.some(
          (skill) =>
            skill.skillName.startsWith('jedi_') ||
            skill.skillName.includes('force_')
        );
        if (hasJediSkill) {
          return CharacterType.Jedi;
        }
      }
    } catch {
      // Ignore errors, default to Normal
    }

    return CharacterType.Normal;
  }

  /**
   * Get the object template CRC for a character
   * Computes CRC from the stored template_name in the database
   */
  private getCharacterTemplate(character: Character): number {
    if (character.templateName) {
      return calculateTemplateCrc(character.templateName);
    }
    return TemplateCrc.HUMAN_MALE;
  }

  /**
   * Create an empty character enumeration response
   */
  private createEmptyResponse(): CharacterEnumerationResult {
    const response = createEnumerateCharacterIdResponse([]);
    return {
      success: false,
      response: serializeEnumerateCharacterIdResponse(response),
      characterCount: 0,
    };
  }

  /**
   * Get the number of characters for an account
   */
  public async getCharacterCount(accountId: number): Promise<number> {
    const characters = await this.characterRepository.findByAccountId(accountId);
    return characters.length;
  }

  /**
   * Check if a character belongs to an account
   */
  public async isCharacterOwnedByAccount(
    characterId: bigint,
    accountId: number
  ): Promise<boolean> {
    const character = await this.characterRepository.findById(characterId);
    return character?.accountId === accountId;
  }

  /**
   * Get the server ID
   */
  public getServerId(): number {
    return this.serverId;
  }
}

/**
 * Create a new CharacterHandler instance
 */
export function createCharacterHandler(
  characterRepository: CharacterRepository,
  sessionStore: SessionStore,
  serverId?: number
): CharacterHandler {
  return new CharacterHandler(characterRepository, sessionStore, serverId);
}
