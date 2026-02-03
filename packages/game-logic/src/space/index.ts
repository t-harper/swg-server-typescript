/**
 * @swg/game-logic - Space Module
 * Jump to Lightspeed (JTL) space gameplay systems
 *
 * This module provides:
 * - Hyperspace travel types and enums
 * - Navigation computer for route calculation
 * - Hyperspace manager for jump operations
 * - Network messages for hyperspace system
 */

// Hyperspace Types
export {
  HyperspaceState,
  EmergencyExitReason,
  NavComputerStatus,
  HyperspaceResultCode,
  type HyperspaceJump,
  type JumpRequest,
  type InterdictionField,
  type HyperspaceStatus,
  type HyperspaceConfig,
  DEFAULT_HYPERSPACE_CONFIG,
  createHyperspaceJump,
  createInterdictionField,
  createDefaultHyperspaceStatus,
  canInitiateHyperspace,
  isInHyperspace,
  isInterruptibleState,
  getHyperspaceStateName,
  getHyperspaceResultMessage,
  getEmergencyExitMessage,
} from './hyperspace-types.js';

// Navigation Computer
export {
  NavComputer,
  type NavPoint,
  type PlayerNavData,
  type CalculatedRoute,
  type NavComputerConfig,
  DEFAULT_NAV_COMPUTER_CONFIG,
  createNavComputer,
  createPlayerNavData,
  unlockNavPoint,
  hasNavPoint,
  getStarterNavPoints,
} from './nav-computer.js';

// Hyperspace Manager
export {
  HyperspaceManager,
  type HyperspaceShipData,
  type ZoneManagerInterface,
  type JumpRequestResult,
  type JumpCompletionResult,
  createHyperspaceManager,
} from './hyperspace-manager.js';

// Hyperspace Messages
export {
  HyperspaceMessageOpcode,
  type HyperspaceMessageOpcodeType,
  type RequestJumpMessage,
  type RequestJumpResponseMessage,
  type HyperspaceChargeStartMessage,
  type HyperspaceChargeCompleteMessage,
  type HyperspaceJumpMessage,
  type HyperspaceArrivalMessage,
  type AbortJumpMessage,
  type HyperspaceAbortMessage,
  type InterdictionWarningMessage,
  type EmergencyExitMessage,
  type SetNavDestinationMessage,
  type SetNavDestinationResponseMessage,
  type NavComputerUpdateMessage,
  type RouteData,
  type RequestRoutesMessage,
  type RoutesResponseMessage,
  type ProgressUpdateMessage,
  type RequestStatusMessage,
  type StatusResponseMessage,
  type HyperspaceClientMessage,
  type HyperspaceServerMessage,
  type HyperspaceMessage,
  isHyperspaceMessageOpcode,
  createRequestJumpResponse,
  createChargeStartMessage,
  createChargeCompleteMessage,
  createJumpMessage,
  createArrivalMessage,
  createAbortMessage,
  createInterdictionWarningMessage,
  createEmergencyExitMessage,
  createNavComputerUpdateMessage,
  createRoutesResponseMessage,
  createProgressUpdateMessage,
  createStatusResponseMessage,
  getHyperspaceResultDescription,
  getEmergencyExitDescription,
} from './hyperspace-messages.js';
