/**
 * Profanity Filter
 * Name filtering for character creation
 */

/**
 * Basic profanity word list
 * This is a minimal set for demonstration - production would use a more comprehensive list
 */
const PROFANITY_LIST: readonly string[] = [
  // Common profanity (abbreviated for demonstration)
  'ass',
  'asshole',
  'bastard',
  'bitch',
  'bollocks',
  'crap',
  'damn',
  'dick',
  'douche',
  'fag',
  'fuck',
  'fucker',
  'fucking',
  'hell',
  'jackass',
  'piss',
  'prick',
  'shit',
  'slut',
  'twat',
  'whore',
  // Racial/ethnic slurs (abbreviated)
  'chink',
  'gook',
  'kike',
  'nigga',
  'nigger',
  'spic',
  'wetback',
  // Sexual terms
  'blowjob',
  'cock',
  'cunt',
  'dildo',
  'penis',
  'pussy',
  'vagina',
  // Common misspellings (leet-speak variants are auto-generated, don't add
  // symbol-heavy entries here — normalizeString strips non-alphanumeric chars
  // turning e.g. "a$$" into "a" which matches every name containing 'a')
  'fck',
  'fuk',
  'phuck',
  // Other inappropriate terms
  'nazi',
  'hitler',
  'kkk',
  'aryan',
] as const;

/**
 * Leet speak substitutions for checking obfuscated words
 */
const LEET_SUBSTITUTIONS: Record<string, string[]> = {
  a: ['4', '@', '^'],
  b: ['8', '6'],
  e: ['3'],
  g: ['9', '6'],
  i: ['1', '!', '|'],
  l: ['1', '|'],
  o: ['0'],
  s: ['5', '$'],
  t: ['7', '+'],
  z: ['2'],
};

/**
 * Normalize a string for comparison
 * Removes accents, converts to lowercase, removes non-alphanumeric
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric
}

/**
 * Generate leet speak variants of a word
 */
function generateLeetVariants(word: string): string[] {
  const variants: string[] = [word];

  // For each character that has leet substitutions
  for (let i = 0; i < word.length; i++) {
    const char = word[i]!.toLowerCase();
    const subs = LEET_SUBSTITUTIONS[char];

    if (subs) {
      const newVariants: string[] = [];
      for (const variant of variants) {
        for (const sub of subs) {
          newVariants.push(variant.substring(0, i) + sub + variant.substring(i + 1));
        }
      }
      variants.push(...newVariants);
    }
  }

  return variants;
}

/**
 * Build a set of all profane words including leet variants
 */
function buildProfanitySet(): Set<string> {
  const set = new Set<string>();

  for (const word of PROFANITY_LIST) {
    const normalized = normalizeString(word);
    set.add(normalized);

    // Add leet variants
    const variants = generateLeetVariants(normalized);
    for (const variant of variants) {
      set.add(normalizeString(variant));
    }
  }

  return set;
}

// Pre-build the profanity set for performance
const PROFANITY_SET = buildProfanitySet();

/**
 * Result of profanity check
 */
export interface ProfanityCheckResult {
  /** Whether the input contains profanity */
  containsProfanity: boolean;
  /** The matched word (if any) */
  matchedWord?: string;
  /** Position in the original string */
  matchPosition?: number;
}

/**
 * Check if a string contains profanity
 * @param input The string to check
 * @returns ProfanityCheckResult
 */
export function checkProfanity(input: string): ProfanityCheckResult {
  const normalized = normalizeString(input);

  // Direct match check
  if (PROFANITY_SET.has(normalized)) {
    return {
      containsProfanity: true,
      matchedWord: input,
      matchPosition: 0,
    };
  }

  // Check for substrings (profane words within the name)
  for (const profaneWord of PROFANITY_LIST) {
    const normalizedProfane = normalizeString(profaneWord);

    // Skip words that normalize to fewer than 3 chars — too short for reliable substring matching
    if (normalizedProfane.length < 3) continue;

    if (normalized.includes(normalizedProfane)) {
      const position = normalized.indexOf(normalizedProfane);
      return {
        containsProfanity: true,
        matchedWord: profaneWord,
        matchPosition: position,
      };
    }
  }

  // Check with spaces removed (for split words like "fu ck")
  const noSpaces = input.replace(/\s+/g, '');
  const normalizedNoSpaces = normalizeString(noSpaces);

  for (const profaneWord of PROFANITY_LIST) {
    const normalizedProfane = normalizeString(profaneWord);

    if (normalizedProfane.length < 3) continue;

    if (normalizedNoSpaces.includes(normalizedProfane)) {
      return {
        containsProfanity: true,
        matchedWord: profaneWord,
        matchPosition: normalizedNoSpaces.indexOf(normalizedProfane),
      };
    }
  }

  return { containsProfanity: false };
}

/**
 * Check if a character name is appropriate
 * Combines profanity check with other name-specific filters
 * @param name The character name to check
 * @returns true if the name passes all filters
 */
export function isNameAppropriate(name: string): boolean {
  const result = checkProfanity(name);
  return !result.containsProfanity;
}

/**
 * Filter result for names
 */
export interface NameFilterResult {
  /** Whether the name passed all filters */
  passed: boolean;
  /** Reason if failed */
  reason?: 'profanity' | 'inappropriate';
  /** Details about the failure */
  details?: string;
}

/**
 * Full name filtering with detailed results
 * @param name The name to filter
 * @returns NameFilterResult
 */
export function filterName(name: string): NameFilterResult {
  const profanityResult = checkProfanity(name);

  if (profanityResult.containsProfanity) {
    return {
      passed: false,
      reason: 'profanity',
      details: `Name contains inappropriate language`,
    };
  }

  return { passed: true };
}

/**
 * Add a word to the profanity filter
 * This is useful for server admins to add custom filtered words
 * @param word The word to add
 */
export function addProfaneWord(word: string): void {
  const normalized = normalizeString(word);
  PROFANITY_SET.add(normalized);

  // Add leet variants
  const variants = generateLeetVariants(normalized);
  for (const variant of variants) {
    PROFANITY_SET.add(normalizeString(variant));
  }
}

/**
 * Check if a specific word is in the profanity list
 * @param word The word to check
 * @returns true if the word is in the list
 */
export function isProfaneWord(word: string): boolean {
  return PROFANITY_SET.has(normalizeString(word));
}

/**
 * Get the count of words in the profanity filter
 * @returns Number of filtered words (including variants)
 */
export function getProfanityFilterSize(): number {
  return PROFANITY_SET.size;
}
