/**
 * Command Registry
 * Central registry for all GM/admin commands with permission checking
 * and command lookup functionality
 */

import type { ObjectId } from '@swg/shared-types';
import {
  type CommandDefinition,
  type CommandContext,
  type CommandResult,
  type CommandHandler,
  AdminLevel,
  CommandCategory,
  hasAdminLevel,
  errorResult,
  getAdminLevelName,
  getCategoryName,
} from './command-types.js';
import { CommandParser, createCommandParser, type CommandParserOptions } from './command-parser.js';
import { CommandLogger, createCommandLogger, type CommandLoggerOptions } from './command-logger.js';

/**
 * Options for the command registry
 */
export interface CommandRegistryOptions {
  /** Parser options */
  parserOptions?: CommandParserOptions;
  /** Logger options */
  loggerOptions?: CommandLoggerOptions;
  /** Enable command logging (default: true) */
  enableLogging?: boolean;
}

/**
 * Player information for admin level lookup
 */
export interface PlayerInfo {
  objectId: ObjectId;
  name: string;
  adminLevel: AdminLevel;
  targetId?: ObjectId;
  zoneId?: string;
}

/**
 * Admin level lookup function type
 */
export type AdminLevelLookupFn = (playerId: ObjectId) => Promise<AdminLevel>;

/**
 * Command Registry
 * Manages registration, lookup, and execution of GM commands
 */
export class CommandRegistry {
  private readonly commands: Map<string, CommandDefinition>;
  private readonly aliases: Map<string, string>;
  private readonly parser: CommandParser;
  private readonly logger: CommandLogger;
  private readonly enableLogging: boolean;
  private adminLevelLookup?: AdminLevelLookupFn;

  constructor(options: CommandRegistryOptions = {}) {
    this.commands = new Map();
    this.aliases = new Map();
    this.parser = createCommandParser(options.parserOptions);
    this.logger = createCommandLogger(options.loggerOptions);
    this.enableLogging = options.enableLogging ?? true;
  }

  /**
   * Set the admin level lookup function
   */
  setAdminLevelLookup(lookup: AdminLevelLookupFn): void {
    this.adminLevelLookup = lookup;
  }

  /**
   * Register a command with the registry
   */
  registerCommand(definition: CommandDefinition): void {
    // Normalize command name to lowercase
    const name = definition.name.toLowerCase();

    // Check for duplicate primary names
    if (this.commands.has(name)) {
      console.warn(`[CommandRegistry] Overwriting existing command: ${name}`);
    }

    // Store the command
    this.commands.set(name, {
      ...definition,
      name,
      aliases: definition.aliases.map((a) => a.toLowerCase()),
    });

    // Register aliases
    for (const alias of definition.aliases) {
      const normalizedAlias = alias.toLowerCase();
      if (this.aliases.has(normalizedAlias)) {
        console.warn(
          `[CommandRegistry] Alias '${normalizedAlias}' already registered, overwriting`
        );
      }
      this.aliases.set(normalizedAlias, name);
    }

    console.log(
      `[CommandRegistry] Registered command: /${name}` +
        (definition.aliases.length > 0
          ? ` (aliases: ${definition.aliases.join(', ')})`
          : '')
    );
  }

  /**
   * Unregister a command
   */
  unregisterCommand(name: string): boolean {
    const normalizedName = name.toLowerCase();
    const command = this.commands.get(normalizedName);

    if (!command) {
      return false;
    }

    // Remove aliases
    for (const alias of command.aliases) {
      this.aliases.delete(alias);
    }

    // Remove command
    this.commands.delete(normalizedName);
    return true;
  }

  /**
   * Look up a command by name or alias
   */
  getCommand(nameOrAlias: string): CommandDefinition | undefined {
    const normalized = nameOrAlias.toLowerCase();

    // Check direct command name first
    const direct = this.commands.get(normalized);
    if (direct) {
      return direct;
    }

    // Check aliases
    const primaryName = this.aliases.get(normalized);
    if (primaryName) {
      return this.commands.get(primaryName);
    }

    return undefined;
  }

  /**
   * Check if a player has permission to use a command
   */
  hasPermission(command: CommandDefinition, adminLevel: AdminLevel): boolean {
    return hasAdminLevel(adminLevel, command.minLevel);
  }

  /**
   * Execute a command string
   */
  async executeCommand(
    input: string,
    player: PlayerInfo
  ): Promise<CommandResult> {
    // Parse the command
    const parsed = this.parser.parseCommand(input);

    if (!parsed.valid) {
      return errorResult(parsed.error ?? 'Failed to parse command');
    }

    // Look up the command
    const command = this.getCommand(parsed.name);

    if (!command) {
      return errorResult(`Unknown command: /${parsed.name}`);
    }

    // Check permissions
    if (!this.hasPermission(command, player.adminLevel)) {
      const result = errorResult(
        `Insufficient privileges. Required: ${getAdminLevelName(command.minLevel)}`
      );

      // Log failed permission check
      if (this.enableLogging) {
        await this.logger.logCommand({
          executorId: player.objectId,
          executorName: player.name,
          adminLevel: player.adminLevel,
          command: command.name,
          args: parsed.args,
          targetId: player.targetId,
          success: false,
          resultMessage: result.message,
          zoneId: player.zoneId,
        });
      }

      return result;
    }

    // Build context
    const context = this.parser.buildContext(
      parsed,
      player.objectId,
      player.name,
      player.adminLevel,
      player.targetId,
      player.zoneId,
      input
    );

    // Execute the command
    let result: CommandResult;
    try {
      result = await command.handler(context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CommandRegistry] Command error in /${command.name}:`, error);
      result = errorResult(`Command failed: ${message}`);
    }

    // Log the command execution
    if (this.enableLogging) {
      await this.logger.logCommand({
        executorId: player.objectId,
        executorName: player.name,
        adminLevel: player.adminLevel,
        command: command.name,
        args: parsed.args,
        targetId: player.targetId,
        success: result.success,
        resultMessage: result.message,
        zoneId: player.zoneId,
      });
    }

    return result;
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: CommandCategory): CommandDefinition[] {
    return Array.from(this.commands.values()).filter(
      (cmd) => cmd.category === category
    );
  }

  /**
   * Get commands available to a specific admin level
   */
  getAvailableCommands(adminLevel: AdminLevel): CommandDefinition[] {
    return Array.from(this.commands.values()).filter((cmd) =>
      hasAdminLevel(adminLevel, cmd.minLevel)
    );
  }

  /**
   * Generate help text for a specific command
   */
  generateCommandHelp(command: CommandDefinition): string {
    const lines: string[] = [];

    lines.push(`/${command.name}`);
    if (command.aliases.length > 0) {
      lines.push(`  Aliases: ${command.aliases.map((a) => `/${a}`).join(', ')}`);
    }
    lines.push(`  Category: ${getCategoryName(command.category)}`);
    lines.push(`  Required Level: ${getAdminLevelName(command.minLevel)}`);
    lines.push(`  Usage: ${command.usage}`);
    lines.push(`  Description: ${command.description}`);

    return lines.join('\n');
  }

  /**
   * Generate help text for all commands available to a player
   */
  generateHelpText(adminLevel: AdminLevel, category?: CommandCategory): string {
    const available = category
      ? this.getCommandsByCategory(category).filter((cmd) =>
          hasAdminLevel(adminLevel, cmd.minLevel)
        )
      : this.getAvailableCommands(adminLevel);

    if (available.length === 0) {
      return 'No commands available.';
    }

    // Group by category
    const byCategory = new Map<CommandCategory, CommandDefinition[]>();
    for (const cmd of available) {
      const existing = byCategory.get(cmd.category) ?? [];
      existing.push(cmd);
      byCategory.set(cmd.category, existing);
    }

    const lines: string[] = [];
    lines.push('=== Available Commands ===');

    for (const [cat, commands] of byCategory) {
      lines.push(`\n[${getCategoryName(cat)}]`);
      for (const cmd of commands.sort((a, b) => a.name.localeCompare(b.name))) {
        lines.push(`  /${cmd.name} - ${cmd.description}`);
      }
    }

    lines.push('\nUse /help <command> for detailed information.');

    return lines.join('\n');
  }

  /**
   * Get the command parser
   */
  getParser(): CommandParser {
    return this.parser;
  }

  /**
   * Get the command logger
   */
  getLogger(): CommandLogger {
    return this.logger;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalCommands: number;
    totalAliases: number;
    commandsByCategory: Map<CommandCategory, number>;
    commandsByLevel: Map<AdminLevel, number>;
  } {
    const commandsByCategory = new Map<CommandCategory, number>();
    const commandsByLevel = new Map<AdminLevel, number>();

    for (const cmd of this.commands.values()) {
      // Count by category
      const catCount = commandsByCategory.get(cmd.category) ?? 0;
      commandsByCategory.set(cmd.category, catCount + 1);

      // Count by minimum level
      const levelCount = commandsByLevel.get(cmd.minLevel) ?? 0;
      commandsByLevel.set(cmd.minLevel, levelCount + 1);
    }

    return {
      totalCommands: this.commands.size,
      totalAliases: this.aliases.size,
      commandsByCategory,
      commandsByLevel,
    };
  }
}

/**
 * Create a new CommandRegistry instance
 */
export function createCommandRegistry(
  options?: CommandRegistryOptions
): CommandRegistry {
  return new CommandRegistry(options);
}

/**
 * Singleton instance for global access
 */
let globalRegistry: CommandRegistry | undefined;

/**
 * Get the global command registry instance
 */
export function getCommandRegistry(): CommandRegistry {
  if (!globalRegistry) {
    globalRegistry = createCommandRegistry();
  }
  return globalRegistry;
}

/**
 * Set the global command registry instance
 */
export function setCommandRegistry(registry: CommandRegistry): void {
  globalRegistry = registry;
}
