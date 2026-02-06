/**
 * Survey Network Messages
 * Message types for survey system communication between client and server
 *
 * Survey System Message Flow:
 * 1. Client sends SurveyMessage to request survey of a resource
 * 2. Server responds with ResourceListMessage (available resources) or SurveyResultMessage
 * 3. Client sends SurveyMessage to survey specific resource
 * 4. Server responds with SurveyResultMessage (concentration data)
 * 5. Client may send SampleRequestMessage to extract resources
 * 6. Server responds with SampleResultMessage
 */

import type { ObjectId } from '@swg/shared-types';
import type { SurveyResult, SampleResult, SurveyableResource } from './survey-types.js';

/**
 * Survey message operation types
 */
export enum SurveyOperation {
  /** Request list of surveyable resources */
  RequestResourceList = 0,
  /** Perform survey of specific resource */
  SurveyResource = 1,
  /** Request sample at current location */
  RequestSample = 2,
  /** Cancel active survey */
  CancelSurvey = 3,
  /** Create waypoint at survey location */
  CreateWaypoint = 4,
}

/**
 * Base interface for survey messages
 */
interface BaseSurveyMessage {
  /** Message operation type */
  operation: SurveyOperation;
  /** Survey tool object ID */
  toolId: ObjectId;
  /** Player object ID */
  playerId: ObjectId;
  /** Timestamp of the message */
  timestamp: number;
}

/**
 * Client request to perform a survey or list resources
 * Sent when player uses a survey tool
 */
export interface SurveyMessage extends BaseSurveyMessage {
  /** Resource ID to survey (0n for resource list request) */
  resourceId: bigint;
  /** Player's current X coordinate */
  playerX: number;
  /** Player's current Z coordinate */
  playerZ: number;
  /** Planet/scene ID */
  planetId: string;
}

/**
 * Create a survey request message
 */
export function createSurveyMessage(
  playerId: ObjectId,
  toolId: ObjectId,
  resourceId: bigint,
  playerX: number,
  playerZ: number,
  planetId: string,
  operation: SurveyOperation = SurveyOperation.SurveyResource
): SurveyMessage {
  return {
    operation,
    toolId,
    playerId,
    timestamp: Date.now(),
    resourceId,
    playerX,
    playerZ,
    planetId,
  };
}

/**
 * Server response with survey results
 * Contains concentration data for surveyed resource
 */
export interface SurveyResultMessage {
  /** Operation type (always SurveyOperation.SurveyResource for results) */
  operation: SurveyOperation.SurveyResource;
  /** Survey tool used */
  toolId: ObjectId;
  /** Player who performed survey */
  playerId: ObjectId;
  /** Whether the survey was successful */
  success: boolean;
  /** Error message if survey failed */
  errorMessage?: string;
  /** Array of survey results (concentration readings) */
  results: SurveyResult[];
  /** Effective range of the survey */
  effectiveRange: number;
  /** Effective accuracy of the readings */
  effectiveAccuracy: number;
  /** Resource being surveyed */
  resourceId: bigint;
  /** Resource name */
  resourceName: string;
  /** Timestamp of survey */
  timestamp: number;
}

/**
 * Create a survey result message
 */
export function createSurveyResultMessage(
  playerId: ObjectId,
  toolId: ObjectId,
  resourceId: bigint,
  resourceName: string,
  results: SurveyResult[],
  effectiveRange: number,
  effectiveAccuracy: number,
  success: boolean = true,
  errorMessage?: string
): SurveyResultMessage {
  return {
    operation: SurveyOperation.SurveyResource,
    toolId,
    playerId,
    success,
    errorMessage,
    results,
    effectiveRange,
    effectiveAccuracy,
    resourceId,
    resourceName,
    timestamp: Date.now(),
  } as SurveyResultMessage;
}

/**
 * Server response with list of available resources
 * Sent when player first uses survey tool or requests resource list
 */
export interface ResourceListMessage {
  /** Operation type */
  operation: SurveyOperation.RequestResourceList;
  /** Survey tool used */
  toolId: ObjectId;
  /** Player who requested list */
  playerId: ObjectId;
  /** Whether the request was successful */
  success: boolean;
  /** Error message if request failed */
  errorMessage?: string;
  /** List of surveyable resources in the area */
  resources: SurveyableResource[];
  /** Planet/scene ID */
  planetId: string;
  /** Resource type group name (e.g., "Minerals", "Chemicals") */
  resourceGroup: string;
  /** Timestamp of response */
  timestamp: number;
}

/**
 * Create a resource list message
 */
export function createResourceListMessage(
  playerId: ObjectId,
  toolId: ObjectId,
  resources: SurveyableResource[],
  planetId: string,
  resourceGroup: string,
  success: boolean = true,
  errorMessage?: string
): ResourceListMessage {
  return {
    operation: SurveyOperation.RequestResourceList,
    toolId,
    playerId,
    success,
    errorMessage,
    resources,
    planetId,
    resourceGroup,
    timestamp: Date.now(),
  } as ResourceListMessage;
}

/**
 * Client request to sample resources at current location
 */
export interface SampleRequestMessage extends BaseSurveyMessage {
  /** Resource ID to sample */
  resourceId: bigint;
  /** Player's current X coordinate */
  playerX: number;
  /** Player's current Z coordinate */
  playerZ: number;
  /** Planet/scene ID */
  planetId: string;
}

/**
 * Create a sample request message
 */
export function createSampleRequestMessage(
  playerId: ObjectId,
  toolId: ObjectId,
  resourceId: bigint,
  playerX: number,
  playerZ: number,
  planetId: string
): SampleRequestMessage {
  return {
    operation: SurveyOperation.RequestSample,
    toolId,
    playerId,
    timestamp: Date.now(),
    resourceId,
    playerX,
    playerZ,
    planetId,
  };
}

/**
 * Server response with sample extraction results
 */
export interface SampleResultMessage {
  /** Operation type */
  operation: SurveyOperation.RequestSample;
  /** Survey tool used */
  toolId: ObjectId;
  /** Player who performed sampling */
  playerId: ObjectId;
  /** Sample result data */
  result: SampleResult;
  /** Effective sample size used */
  effectiveSampleSize: number;
  /** Timestamp of response */
  timestamp: number;
}

/**
 * Create a sample result message
 */
export function createSampleResultMessage(
  playerId: ObjectId,
  toolId: ObjectId,
  result: SampleResult,
  effectiveSampleSize: number
): SampleResultMessage {
  return {
    operation: SurveyOperation.RequestSample,
    toolId,
    playerId,
    result,
    effectiveSampleSize,
    timestamp: Date.now(),
  };
}

/**
 * Client request to create waypoint at survey location
 */
export interface CreateWaypointMessage extends BaseSurveyMessage {
  /** Resource ID for waypoint */
  resourceId: bigint;
  /** Resource name for waypoint label */
  resourceName: string;
  /** X coordinate for waypoint */
  waypointX: number;
  /** Z coordinate for waypoint */
  waypointZ: number;
  /** Concentration at waypoint location */
  concentration: number;
  /** Planet/scene ID */
  planetId: string;
}

/**
 * Create a waypoint request message
 */
export function createWaypointMessage(
  playerId: ObjectId,
  toolId: ObjectId,
  resourceId: bigint,
  resourceName: string,
  waypointX: number,
  waypointZ: number,
  concentration: number,
  planetId: string
): CreateWaypointMessage {
  return {
    operation: SurveyOperation.CreateWaypoint,
    toolId,
    playerId,
    timestamp: Date.now(),
    resourceId,
    resourceName,
    waypointX,
    waypointZ,
    concentration,
    planetId,
  };
}

/**
 * Server confirmation of waypoint creation
 */
export interface WaypointCreatedMessage {
  /** Operation type */
  operation: SurveyOperation.CreateWaypoint;
  /** Player who created waypoint */
  playerId: ObjectId;
  /** Waypoint object ID */
  waypointId: ObjectId;
  /** Waypoint name/label */
  waypointName: string;
  /** Whether creation was successful */
  success: boolean;
  /** Error message if failed */
  errorMessage?: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Create a waypoint created confirmation message
 */
export function createWaypointCreatedMessage(
  playerId: ObjectId,
  waypointId: ObjectId,
  waypointName: string,
  success: boolean = true,
  errorMessage?: string
): WaypointCreatedMessage {
  return {
    operation: SurveyOperation.CreateWaypoint,
    playerId,
    waypointId,
    waypointName,
    success,
    errorMessage,
    timestamp: Date.now(),
  } as WaypointCreatedMessage;
}

/**
 * Survey cancel message
 */
export interface SurveyCancelMessage extends BaseSurveyMessage {
  /** Reason for cancellation (optional) */
  reason?: string;
}

/**
 * Create a survey cancel message
 */
export function createSurveyCancelMessage(
  playerId: ObjectId,
  toolId: ObjectId,
  reason?: string
): SurveyCancelMessage {
  return {
    operation: SurveyOperation.CancelSurvey,
    toolId,
    playerId,
    timestamp: Date.now(),
    reason,
  } as SurveyCancelMessage;
}

/**
 * Union type of all survey-related messages
 */
export type AnySurveyMessage =
  | SurveyMessage
  | SurveyResultMessage
  | ResourceListMessage
  | SampleRequestMessage
  | SampleResultMessage
  | CreateWaypointMessage
  | WaypointCreatedMessage
  | SurveyCancelMessage;

/**
 * Check if a message is a survey request
 */
export function isSurveyRequest(message: AnySurveyMessage): message is SurveyMessage {
  return message.operation === SurveyOperation.SurveyResource && 'resourceId' in message;
}

/**
 * Check if a message is a resource list request
 */
export function isResourceListRequest(message: AnySurveyMessage): message is SurveyMessage {
  return message.operation === SurveyOperation.RequestResourceList;
}

/**
 * Check if a message is a sample request
 */
export function isSampleRequest(message: AnySurveyMessage): message is SampleRequestMessage {
  return message.operation === SurveyOperation.RequestSample;
}

/**
 * Check if a message is a survey result
 */
export function isSurveyResult(message: AnySurveyMessage): message is SurveyResultMessage {
  return message.operation === SurveyOperation.SurveyResource && 'results' in message;
}

/**
 * Message CRC values for network serialization
 */
export const SurveyMessageCrc = {
  SURVEY_MESSAGE: 0x12345678, // Placeholder CRC
  SURVEY_RESULT_MESSAGE: 0x12345679,
  RESOURCE_LIST_MESSAGE: 0x1234567a,
  SAMPLE_REQUEST_MESSAGE: 0x1234567b,
  SAMPLE_RESULT_MESSAGE: 0x1234567c,
  CREATE_WAYPOINT_MESSAGE: 0x1234567d,
  WAYPOINT_CREATED_MESSAGE: 0x1234567e,
  SURVEY_CANCEL_MESSAGE: 0x1234567f,
} as const;
