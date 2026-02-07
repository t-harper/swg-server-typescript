# NETWORK

This document is generated from local source code and config files only:
- TypeScript repo: `swg-source-js`
- Reference C++ repo: `../swg-source-docker`
- Generated at: `2026-02-07T11:24:21.031Z`

## Packet Parity Summary

- Total C++ `GameNetworkMessage` packets discovered: **526**
- Implemented packet interfaces in `swg-source-js`: **526**
- Missing packet interfaces in `swg-source-js`: **0**
- Coverage: **100.00%**
- Packets with exact serialized length model: **201**
- Packets with minimum-only serialized length model: **325**
- Packets with unknown serialized length model: **0**

## Transport Layer (SOE UDP) from `UdpLibrary`

Source files: `../swg-source-docker/swg-main/src/external/3rd/library/udplibrary/UdpLibrary.hpp`, `../swg-source-docker/swg-main/src/external/3rd/library/udplibrary/UdpLibrary.cpp`

### UdpPacketType Enum

| Value | Name |
| --- | --- |
| 0 | `cUdpPacketZeroEscape` |
| 1 | `cUdpPacketConnect` |
| 2 | `cUdpPacketConfirm` |
| 3 | `cUdpPacketMulti` |
| 4 | `cUdpPacketBig` |
| 5 | `cUdpPacketTerminate` |
| 6 | `cUdpPacketKeepAlive` |
| 7 | `cUdpPacketClockSync` |
| 8 | `cUdpPacketClockReflect` |
| 9 | `cUdpPacketReliable1` |
| 10 | `cUdpPacketReliable2` |
| 11 | `cUdpPacketReliable3` |
| 12 | `cUdpPacketReliable4` |
| 13 | `cUdpPacketFragment1` |
| 14 | `cUdpPacketFragment2` |
| 15 | `cUdpPacketFragment3` |
| 16 | `cUdpPacketFragment4` |
| 17 | `cUdpPacketAck1` |
| 18 | `cUdpPacketAck2` |
| 19 | `cUdpPacketAck3` |
| 20 | `cUdpPacketAck4` |
| 21 | `cUdpPacketAckAll1` |
| 22 | `cUdpPacketAckAll2` |
| 23 | `cUdpPacketAckAll3` |
| 24 | `cUdpPacketAckAll4` |
| 25 | `cUdpPacketGroup` |
| 26 | `cUdpPacketOrdered` |
| 27 | `cUdpPacketOrdered2` |
| 28 | `cUdpPacketPortAlive` |
| 29 | `cUdpPacketUnreachableConnection` |
| 30 | `cUdpPacketRequestRemap` |

### DisconnectReason Enum

| Value | Name |
| --- | --- |
| 0 | `cDisconnectReasonNone` |
| 1 | `cDisconnectReasonIcmpError` |
| 2 | `cDisconnectReasonTimeout` |
| 3 | `cDisconnectReasonOtherSideTerminated` |
| 4 | `cDisconnectReasonManagerDeleted` |
| 5 | `cDisconnectReasonConnectFail` |
| 6 | `cDisconnectReasonApplication` |
| 7 | `cDisconnectReasonUnreachableConnection` |
| 8 | `cDisconnectReasonUnacknowledgedTimeout` |
| 9 | `cDisconnectReasonNewConnectionAttempt` |
| 10 | `cDisconnectReasonConnectionRefused` |
| 11 | `cDisconnectReasonMutualConnectError` |
| 12 | `cDisconnectReasonConnectingToSelf` |
| 13 | `cDisconnectReasonReliableOverflow` |
| 14 | `cDisconnectReasonDosAttack` |
| 15 | `cDisconnectReasonCount` |

### Internal UDP Packet Structs (wire field order)

#### UdpPacketConnect
- `zeroByte`: `uchar`
- `packetType`: `uchar`
- `protocolVersion`: `int`
- `connectCode`: `int`
- `maxRawPacketSize`: `int`

#### UdpPacketConfirm
- `zeroByte`: `uchar`
- `packetType`: `uchar`
- `connectCode`: `int`
- `config`: `Configuration`
- `maxRawPacketSize`: `int`

#### UdpPacketTerminate
- `zeroByte`: `uchar`
- `packetType`: `uchar`
- `connectCode`: `int`

#### UdpPacketKeepAlive
- `zeroByte`: `uchar`
- `packetType`: `uchar`

#### UdpPacketGroup
- `zeroByte`: `uchar`
- `packetType`: `uchar`

#### UdpPacketClockSync
- `zeroByte`: `uchar`
- `packetType`: `uchar`
- `timeStamp`: `ushort`
- `masterPingTime`: `int`
- `averagePingTime`: `int`
- `lowPingTime`: `int`
- `highPingTime`: `int`
- `lastPingTime`: `int`
- `ourSent`: `udp_int64`
- `ourReceived`: `udp_int64`

#### UdpPacketClockReflect
- `zeroByte`: `uchar`
- `packetType`: `uchar`
- `timeStamp`: `ushort`
- `serverSyncStampLong`: `uint`
- `yourSent`: `udp_int64`
- `yourReceived`: `udp_int64`
- `ourSent`: `udp_int64`
- `ourReceived`: `udp_int64`

#### UdpPacketReliable
- `zeroByte`: `uchar`
- `packetType`: `uchar`
- `reliableStamp`: `ushort`

#### UdpPacketReliableFragmentStart
- `reliable`: `UdpPacketReliable`
- `length`: `int`

#### UdpPacketAck
- `zeroByte`: `uchar`
- `packetType`: `uchar`
- `reliableStamp`: `ushort`

#### UdpPacketOrdered
- `zeroByte`: `uchar`
- `packetType`: `uchar`
- `orderStamp`: `ushort`

### UdpManager::Params Default Values

| Key | Default |
| --- | --- |
| `handler` | `nullptr` |
| `outgoingBufferSize` | `64 * 1024` |
| `incomingBufferSize` | `64 * 1024` |
| `packetHistoryMax` | `100` |
| `maxDataHoldTime` | `50` |
| `maxDataHoldSize` | `-1` |
| `maxRawPacketSize` | `512` |
| `hashTableSize` | `100` |
| `avoidPriorityQueue` | `false` |
| `clockSyncDelay` | `0` |
| `crcBytes` | `0` |
| `encryptMethod[0]` | `UdpManager::cEncryptMethodNone` |
| `encryptMethod[1]` | `UdpManager::cEncryptMethodNone` |
| `keepAliveDelay` | `0` |
| `portAliveDelay` | `0` |
| `noDataTimeout` | `0` |
| `maxConnections` | `10` |
| `maxConnectionsPerIP` | `0` |
| `port` | `0` |
| `portRange` | `0` |
| `pooledPacketMax` | `1000` |
| `pooledPacketSize` | `-1` |
| `pooledPacketInitial` | `0` |
| `replyUnreachableConnection` | `true` |
| `allowPortRemapping` | `true` |
| `allowAddressRemapping` | `false` |
| `icmpErrorRetryPeriod` | `5000` |
| `oldestUnacknowledgedTimeout` | `90000` |
| `processIcmpErrors` | `true` |
| `processIcmpErrorsDuringNegotiating` | `false` |
| `connectAttemptDelay` | `1000` |
| `reliableOverflowBytes` | `0` |
| `userSuppliedEncryptExpansionBytes` | `0` |
| `userSuppliedEncryptExpansionBytes2` | `0` |
| `simulateIncomingByteRate` | `0` |
| `simulateIncomingLossPercent` | `0` |
| `simulateOutgoingByteRate` | `0` |
| `simulateOutgoingLossPercent` | `0` |
| `simulateDestinationOverloadLevel` | `0` |
| `simulateOutgoingOverloadLevel` | `0` |
| `reliable[0].maxInstandingPackets` | `400` |
| `reliable[0].maxOutstandingBytes` | `200 * 1024` |
| `reliable[0].maxOutstandingPackets` | `400` |
| `reliable[0].outOfOrder` | `false` |
| `reliable[0].processOnSend` | `false` |
| `reliable[0].coalesce` | `true` |
| `reliable[0].ackDeduping` | `true` |
| `reliable[0].fragmentSize` | `0` |
| `reliable[0].resendDelayAdjust` | `300` |
| `reliable[0].resendDelayPercent` | `125` |
| `reliable[0].resendDelayCap` | `5000` |
| `reliable[0].congestionWindowMinimum` | `0` |
| `reliable[0].trickleRate` | `0` |
| `reliable[0].trickleSize` | `0` |
| `reliable[j]` | `reliable[0]` |

## Server Application Config Defaults (`Config*.cpp`)

### ../swg-source-docker/swg-main/src/engine/server/application/CentralServer/src/shared/ConfigCentralServer.cpp

| Type | Key | Default |
| --- | --- | --- |
| `INT` | `chatServicePort` | `61232` |
| `INT` | `connectionServicePort` | `0` |
| `INT` | `customerServicePort` | `0` |
| `INT` | `gameServicePort` | `44451` |
| `STRING` | `loginServerAddress` | `"127.0.0.1"` |
| `INT` | `loginServerPort` | `44452` |
| `STRING` | `clusterName` | `"devcluster"` |
| `INT` | `taskManagerPort` | `60001` |
| `INT` | `planetServicePort` | `44455` |
| `INT` | `connectionServerRestartDelayTimeSeconds` | `60` |
| `INT` | `chatServerRestartDelayTimeSeconds` | `60` |
| `STRING` | `chatServiceBindInterface` | `""` |
| `STRING` | `connectionServiceBindInterface` | `""` |
| `STRING` | `customerServiceBindInterface` | `""` |
| `STRING` | `gameServiceBindInterface` | `""` |
| `STRING` | `loginServiceBindInterface` | `""` |
| `STRING` | `planetServiceBindInterface` | `""` |
| `INT` | `firstPlanetWatcherPort` | `60002` |
| `INT` | `loginServicePort` | `44452` |
| `INT` | `consoleServicePort` | `61000` |
| `STRING` | `consoleServiceBindInterface` | `""` |
| `INT` | `characterCreationTimeout` | `5*60` |
| `STRING` | `chatServerHost` | `"local"` |
| `STRING` | `dbServerHost` | `"local"` |
| `INT` | `serverPingTimeout` | `0` |
| `STRING` | `transferServerAddress` | `"127.0.0.1"` |
| `INT` | `transferServerPort` | `0` |
| `STRING` | `stationPlayersCollectorAddress` | `"127.0.0.1"` |
| `INT` | `stationPlayersCollectorPort` | `0` |
| `BOOL` | `allowZeroConnectionServerPort` | `true` |
| `INT` | `clusterWideDataLockTimeout` | `300` |
| `STRING` | `commodityServerServiceBindInterface` | `""` |
| `INT` | `commodityServerServicePort` | `44456` |
| `INT` | `gameServerConnectionPendingAllocatedSizeLimit` | `0` |
| `INT` | `ctsDenyLoginThresholdSeconds` | `2*60*60` |
| `INT` | `auctionPort` | `5901` |
| `BOOL` | `disconnectDuplicateConnectionsOnOtherGalaxies` | `false` |
| `STRING` | `metricsDataURL` | `""` |
| `STRING` | `metricsSecretKey` | `""` |

### ../swg-source-docker/swg-main/src/engine/server/application/ChatServer/src/shared/ConfigChatServer.cpp

| Type | Key | Default |
| --- | --- | --- |
| `INT` | `backupGatewayServerPort` | `15150` |
| `STRING` | `clusterName` | `"devcluster"` |
| `STRING` | `centralServerAddress` | `"localhost"` |
| `INT` | `centralServerPort` | `61232` |
| `INT` | `gatewayServerPort` | `5001` |
| `INT` | `roomInactivityTimeout` | `60 * 60 * 24 * 3` |
| `INT` | `roomUnpopulatedTimeout` | `60 * 5` |
| `STRING` | `gameServiceBindInterface` | `""` |
| `STRING` | `planetServiceBindInterface` | `""` |
| `INT` | `loginFlowControlRate` | `50` |
| `STRING` | `registrarHost` | `"localhost"` |
| `INT` | `registrarPort` | `5000` |
| `INT` | `chatStatisticsReportIntervalSeconds` | `60` |
| `INT` | `chatSpamLimiterNumCharacters` | `400` |
| `BOOL` | `chatSpamLimiterEnabledForFreeTrial` | `true` |
| `INT` | `chatSpamNotifyPlayerWhenLimitedIntervalSeconds` | `30` |
| `BOOL` | `voiceChatLoggingEnabled` | `false` |
| `INT` | `voiceChatRoomListRefresh` | `600000` |

### ../swg-source-docker/swg-main/src/engine/server/application/CommoditiesServer/src/shared/ConfigCommodityServer.cpp

| Type | Key | Default |
| --- | --- | --- |
| `INT` | `cmServerServiceBindPort` | `4069` |
| `STRING` | `cmServerServiceBindInterface` | `"localhost"` |
| `INT` | `databaseServerPort` | `44457` |
| `STRING` | `databaseServerAddress` | `"localhost"` |
| `STRING` | `dsn` | `"swodb"` |
| `STRING` | `databaseUID` | `"dmellencamp"` |
| `STRING` | `databasePWD` | `"compts6m"` |
| `STRING` | `databaseSchema` | `"dmellencamp"` |
| `STRING` | `databaseProtocol` | `"OCI"` |
| `INT` | `databaseThreads` | `1` |
| `INT` | `databaseCharacterNameSizeLimit` | `64` |
| `INT` | `databaseItemNameSizeLimit` | `256` |
| `INT` | `databaseUserDescriptionSizeLimit` | `1024` |
| `INT` | `databaseOOBDataSizeLimit` | `4000` |
| `INT` | `centralServerPort` | `44456` |
| `STRING` | `centralServerAddress` | `"localhost"` |

### ../swg-source-docker/swg-main/src/engine/server/application/ConnectionServer/src/shared/ConfigConnectionServer.cpp

| Type | Key | Default |
| --- | --- | --- |
| `STRING` | `sessionURL` | `""` |
| `STRING` | `centralServerAddress` | `"localhost"` |
| `INT` | `centralServerPort` | `0` |
| `STRING` | `clientServiceBindInterface` | `""` |
| `INT` | `clientServicePortPrivate` | `44464` |
| `INT` | `clientServicePortPublic` | `44463` |
| `INT` | `clientOverflowLimit` | `1024 * 1024` |
| `INT` | `gameServicePort` | `0` |
| `INT` | `pingPort` | `0` |
| `STRING` | `clusterName` | `"devcluster"` |
| `INT` | `spamLimitPacketsPerSec` | `50` |
| `BOOL` | `disableWorldSnapshot` | `true` |
| `STRING` | `gameServiceBindInterface` | `""` |
| `STRING` | `chatServiceBindInterface` | `""` |
| `STRING` | `customerServiceBindInterface` | `""` |
| `BOOL` | `compressClientNetworkTraffic` | `true` |
| `INT` | `crashRecoveryTimeout` | `15*1000` |
| `INT` | `clientMaxOutstandingPackets` | `1000` |
| `INT` | `clientMaxRawPacketSize` | `500` |
| `INT` | `clientMaxConnections` | `200` |
| `INT` | `clientFragmentSize` | `500` |
| `INT` | `lagReportThreshold` | `10000` |
| `STRING` | `sessionServers` | `""` |
| `INT` | `sessionType` | `SESSION_TYPE_STARWARS` |
| `BOOL` | `disableSessionLogout` | `false` |
| `BOOL` | `sessionRecordPlayTime` | `true` |
| `FLOAT` | `timeBetweenSessionUpdates` | `60.0f * 5.0f` |
| `INT` | `connectionServerNumber` | `0` |
| `STRING` | `altPublicBindAddress` | `""` |
| `BOOL` | `useOldSuidGenerator` | `false` |

### ../swg-source-docker/swg-main/src/engine/server/application/CustomerServiceServer/src/shared/ConfigCustomerServiceServer.cpp

| Type | Key | Default |
| --- | --- | --- |
| `STRING` | `clusterName` | `"devcluster"` |
| `STRING` | `centralServerAddress` | `"localhost"` |
| `INT` | `centralServerPort` | `61242` |
| `STRING` | `csServerAddress` | `"localhost"` |
| `INT` | `csServerPort` | `3016` |
| `INT` | `maxPacketsPerSecond` | `50` |
| `INT` | `requestTimeoutSeconds` | `300` |
| `INT` | `gameServicePort` | `50010` |
| `STRING` | `gameServiceBindInterface` | `""` |
| `INT` | `chatServicePort` | `50011` |
| `STRING` | `chatServiceBindInterface` | `""` |

### ../swg-source-docker/swg-main/src/engine/server/application/LogServer/src/shared/ConfigLogServer.cpp

| Type | Key | Default |
| --- | --- | --- |
| `INT` | `logServicePort` | `44467` |
| `STRING` | `logServiceBindInterface` | `""` |
| `STRING` | `loggingServerApiAddress` | `"localhost"` |
| `STRING` | `loggingServerApiLoginName` | `"MISCONFIGURED_LOG_SERVER_LOGIN_NAME"` |
| `STRING` | `clusterName` | `"MISCONFIGURED_LOG_SERVER"` |
| `INT` | `logServiceMaxConnections` | `150` |

### ../swg-source-docker/swg-main/src/engine/server/application/LoginPing/src/shared/ConfigLoginPing.cpp

| Type | Key | Default |
| --- | --- | --- |
| `STRING` | `loginServerAddress` | `"localhost"` |
| `INT` | `loginServerPingServicePort` | `44460` |

### ../swg-source-docker/swg-main/src/engine/server/application/LoginServer/src/shared/ConfigLoginServer.cpp

| Type | Key | Default |
| --- | --- | --- |
| `INT` | `centralServicePort` | `44452` |
| `INT` | `clientServicePort` | `44453` |
| `INT` | `clientOverflowLimit` | `1024 * 8` |
| `INT` | `taskServicePort` | `44459` |
| `INT` | `pingServicePort` | `44460` |
| `INT` | `httpServicePort` | `44490` |
| `STRING` | `DSN` | `"loginserver"` |
| `STRING` | `databaseUID` | `"loginserver"` |
| `STRING` | `databasePWD` | `"loginserver"` |
| `STRING` | `databaseProtocol` | `"OCI"` |
| `INT` | `maxPlayersPerCluster` | `2500` |
| `INT` | `maxCharactersPerCluster` | `10000` |
| `BOOL` | `doSessionLogin` | `false` |
| `STRING` | `sessionServers` | `"localhost:3004"` |
| `INT` | `sessionType` | `SESSION_TYPE_STARWARS` |
| `INT` | `databaseThreads` | `1` |
| `BOOL` | `compressClientNetworkTraffic` | `true` |
| `INT` | `metricsListenerPort` | `0` |
| `INT` | `clusterGroup` | `1` |
| `INT` | `csToolPort` | `0` |
| `BOOL` | `requireSecureLoginForCsTool` | `true` |
| `BOOL` | `useOldSuidGenerator` | `false` |

### ../swg-source-docker/swg-main/src/engine/server/application/MetricsServer/src/shared/ConfigMetricsServer.cpp

| Type | Key | Default |
| --- | --- | --- |
| `STRING` | `clusterName` | `"DevCluster"` |
| `INT` | `metricsListenerPort` | `2200` |
| `INT` | `metricsServicePort` | `44480` |
| `INT` | `taskManagerPort` | `60001` |
| `STRING` | `metricsServiceBindInterface` | `""` |

### ../swg-source-docker/swg-main/src/engine/server/application/PlanetServer/src/shared/ConfigPlanetServer.cpp

| Type | Key | Default |
| --- | --- | --- |
| `STRING` | `centralServerAddress` | `"localhost"` |
| `INT` | `centralServerPort` | `44455` |
| `INT` | `gameServicePort` | `0` |
| `INT` | `taskManagerPort` | `60001` |
| `INT` | `watcherServicePort` | `60002` |
| `INT` | `maxWatcherConnections` | `1` |
| `INT` | `watcherOverflowLimit` | `1024 * 1024 * 8` |
| `INT` | `maxWatcherUpdatesPerMessage` | `500` |
| `STRING` | `gameServiceBindInterface` | `""` |
| `STRING` | `watcherServiceBindInterface` | `""` |
| `INT` | `gameServerDebuggingPortBase` | `0` |

### ../swg-source-docker/swg-main/src/engine/server/application/ServerConsole/src/shared/ConfigServerConsole.cpp

| Type | Key | Default |
| --- | --- | --- |
| `STRING` | `serverAddress` | `"127.0.0.1"` |
| `INT` | `serverPort` | `61000` |

### ../swg-source-docker/swg-main/src/engine/server/application/StationPlayersCollector/src/shared/ConfigStationPlayersCollector.cpp

| Type | Key | Default |
| --- | --- | --- |
| `INT` | `centralServerServiceBindPort` | `50010` |
| `STRING` | `centralServerServiceBindInterface` | `"localhost"` |
| `STRING` | `dsn` | `"swodb"` |
| `STRING` | `databaseUID` | `"character_data"` |
| `STRING` | `databasePWD` | `"changeme"` |
| `STRING` | `databaseSchema` | `"character_data"` |
| `STRING` | `databaseProtocol` | `"OCI"` |
| `INT` | `databaseThreads` | `3` |

### ../swg-source-docker/swg-main/src/engine/server/application/TaskManager/src/shared/ConfigTaskManager.cpp

| Type | Key | Default |
| --- | --- | --- |
| `STRING` | `clusterName` | `"devcluster"` |
| `BOOL` | `verifyClusterName` | `false` |
| `INT` | `gameServerTimeout` | `600` |
| `STRING` | `gameServiceBindInterface` | `""` |
| `INT` | `gameServicePort` | `60001` |
| `INT` | `consoleConnectionPort` | `60000` |
| `STRING` | `consoleServiceBindInterface` | `""` |
| `STRING` | `loginServerAddress` | `"localhost"` |
| `INT` | `loginServerTaskServicePort` | `44459` |
| `FLOAT` | `loadConnectionServer` | `0.5f` |
| `INT` | `restartDelayMetricsServer` | `60` |
| `STRING` | `taskManagerServiceBindInterface` | `""` |
| `INT` | `taskManagerServicePort` | `50001` |
| `INT` | `maximumClockDriftToleranceSeconds` | `10` |
| `INT` | `clockDriftFatalIntervalSeconds` | `1*60*60` |

### ../swg-source-docker/swg-main/src/engine/server/application/TransferServer/src/shared/ConfigTransferServer.cpp

| Type | Key | Default |
| --- | --- | --- |
| `INT` | `centralServerServiceBindPort` | `50005` |
| `STRING` | `centralServerServiceBindInterface` | `""` |
| `STRING` | `apiServerHostAddress` | `""` |
| `BOOL` | `transferChatAvatar` | `false` |

## Runtime CFG Assignments (`*.cfg` + `docker-compose.yml`)

| File | Section | Key | Value | Line |
| --- | --- | --- | --- | --- |
| `../swg-source-docker/docker-compose.yml` | `global` | `- ORACLE_PWD` | `swg` | 15 |
| `../swg-source-docker/docker-compose.yml` | `global` | `- DB_HOST` | `swg-oracle-db` | 41 |
| `../swg-source-docker/docker-compose.yml` | `global` | `- DB_PORT` | `1521` | 42 |
| `../swg-source-docker/docker-compose.yml` | `global` | `- DB_SERVICE` | `FREEPDB1` | 43 |
| `../swg-source-docker/docker-compose.yml` | `global` | `- CLUSTER_NAME` | `${CLUSTER_NAME:-swg}` | 46 |
| `../swg-source-docker/docker-compose.yml` | `global` | `- DB_HOST` | `localhost` | 72 |
| `../swg-source-docker/docker-compose.yml` | `global` | `- DB_PORT` | `1521` | 73 |
| `../swg-source-docker/docker-compose.yml` | `global` | `- DB_SERVICE` | `FREEPDB1` | 74 |
| `../swg-source-docker/docker-compose.yml` | `global` | `- CLUSTER_NAME` | `${CLUSTER_NAME:-swg}` | 77 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `dbProcess` | `useTemplates` | `1` | 31 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `LoginPing` | `passthroughMode` | `false` | 34 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `61232` | 37 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `61242` | 38 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `44451` | 39 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `44452` | 40 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `60001` | 41 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `44455` | 42 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `60002` | 43 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `61000` | 44 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `44464` | 45 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `44463` | 46 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `44467` | 47 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `44455` | 48 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `60002` | 49 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `44480` | 50 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `50001` | 51 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `60000` | 52 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `44459` | 53 |
| `../swg-source-docker/swg-main/exe/shared/servercommon.cfg` | `SharedNetwork` | `reservedPort` | `61222` | 54 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `pooledPacketMax` | `32000` | 9 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `incomingBufferSize` | `4194304` | 10 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `outgoingBufferSize` | `4194304` | 11 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `maxRawPacketSize` | `500` | 12 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `maxOutstandingBytes` | `4194304` | 13 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `fragmentSize` | `500` | 14 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `pooledPacketSize` | `256` | 15 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `packetHistoryMax` | `512` | 16 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `oldestUnacknowledgedTimeout` | `120000` | 17 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `byteCountWarnThreshold` | `1000000` | 18 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `reportMessages` | `0` | 19 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `logBackloggedPacketThreshold` | `0` | 20 |
| `../swg-source-docker/swg-main/exe/linux/serverNetwork.cfg` | `SharedNetwork` | `enableFlushAndConfirmAllData` | `0` | 21 |
| `../swg-source-docker/swg-main/exe/linux/default.cfg` | `TaskManager` | `loginServerAddress` | `HOSTIP` | 4 |
| `../swg-source-docker/swg-main/exe/linux/default.cfg` | `TaskManager` | `clusterName` | `CLUSTERNAME` | 5 |
| `../swg-source-docker/swg-main/exe/linux/default.cfg` | `dbProcess` | `DSN` | `//127.0.0.1/swg` | 8 |
| `../swg-source-docker/swg-main/exe/linux/default.cfg` | `dbProcess` | `databaseUID` | `DBUSERNAME` | 9 |
| `../swg-source-docker/swg-main/exe/linux/default.cfg` | `LoginServer` | `DSN` | `//127.0.0.1/swg` | 12 |
| `../swg-source-docker/swg-main/exe/linux/default.cfg` | `LoginServer` | `databaseUID` | `DBUSERNAME` | 13 |
| `../swg-source-docker/swg-main/exe/linux/default.cfg` | `LoginServer` | `developmentMode` | `true` | 14 |
| `../swg-source-docker/swg-main/exe/linux/default.cfg` | `CentralServer` | `developmentMode` | `true` | 17 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `chatServiceBindInterface` | `eth0` | 4 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `customerServiceBindInterface` | `eth0` | 5 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `clusterName` | `CLUSTERNAME` | 6 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `webUpdateIntervalSeconds` | `600` | 8 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `newbieTutorialEnabled` | `1` | 11 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `corellia` | 14 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `dantooine` | 15 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `dathomir` | 16 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `endor` | 17 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `lok` | 18 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `kashyyyk_dead_forest` | 19 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `kashyyyk_hunting` | 20 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `kashyyyk_main` | 21 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `kashyyyk_north_dungeons` | 22 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `kashyyyk_pob_dungeons` | 23 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `kashyyyk_rryatt_trail` | 24 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `kashyyyk_south_dungeons` | 25 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `mustafar` | 26 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `naboo` | 27 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `rori` | 28 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `talus` | 29 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `tatooine` | 30 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `yavin4` | 31 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_corellia` | 33 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_dantooine` | 34 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_dathomir` | 35 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_endor` | 36 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_lok` | 37 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_kashyyyk` | 38 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_naboo` | 39 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_nova_orion` | 40 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_tatooine` | 41 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_yavin4` | 42 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_heavy1` | 44 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_light1` | 45 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `tutorial` | 46 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `dungeon1` | 47 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `adventure1` | 48 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `adventure2` | 49 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_npe_falcon` | 50 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_npe_falcon_2` | 51 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_npe_falcon_3` | 52 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `CentralServer` | `startPlanet` | `space_ord_mantell` | 53 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ServerMetrics` | `metricsServerPort` | `0` | 56 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ChatServer` | `centralServerAddress` | `HOSTIP` | 59 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ChatServer` | `clusterName` | `CLUSTERNAME` | 60 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ChatServer` | `gatewayServerIP` | `127.0.0.1` | 61 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ChatServer` | `gatewayServerPort` | `5001` | 62 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ChatServer` | `registrarHost` | `127.0.0.1` | 63 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ChatServer` | `registrarPort` | `5000` | 64 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `dbProcess` | `centralServerAddress` | `HOSTIP` | 76 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `dbProcess` | `sharedLoginMode` | `0` | 77 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `dbProcess` | `loaderThreads` | `1` | 78 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `dbProcess` | `persisterThreads` | `1` | 79 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `PlanetServer` | `loadWholePlanet` | `1` | 82 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `PlanetServer` | `numTutorialServers` | `1` | 85 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ConnectionServer` | `adminAccountDataTable` | `datatables/admin/stella_admin.iff` | 88 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ConnectionServer` | `pingPort` | `44462` | 89 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ConnectionServer` | `customerServiceBindInterface` | `eth0` | 90 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ConnectionServer` | `chatServiceBindInterface` | `eth0` | 91 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ConnectionServer` | `disableWorldSnapshot` | `0` | 92 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ConnectionServer` | `validateClientVersion` | `0` | 93 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ConnectionServer` | `validateStationKey` | `0` | 94 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `ConnectionServer` | `clientOverflowLimit` | `5242880` | 95 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `LoginServer` | `validateClientVersion` | `1` | 99 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `LoginServer` | `validateStationKey` | `0` | 100 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `SharedNetwork` | `oldestUnacknowledgedTimeout` | `0` | 122 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `SharedNetwork` | `noDataTimeout` | `1000000` | 123 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `SharedFoundation` | `debugReportLongFrames` | `0` | 132 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `SharedFoundation` | `debugReportLongFrameTimes` | `0` | 133 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `GameServer` | `centralServerAddress` | `HOSTIP` | 201 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `GameServer` | `maxGoldNetworkId` | `10000000` | 208 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `GameServer` | `scriptWatcherWarnTime` | `5000` | 210 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `GameServer` | `scriptWatcherInterruptTime` | `0` | 211 |
| `../swg-source-docker/swg-main/exe/linux/localOptions.cfg` | `GameServer` | `reservedObjectIds` | `1000000` | 217 |
| `../swg-source-docker/swg-main/exe/linux/nodes.cfg` | `TaskManager` | `node0` | `HOSTIP` | 2 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `PlanetServer` | `preloadDataTableName` | `datatables/planet_server/preload_list_heavy.iff` | 2 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=4 sceneID=tatooine groundScene"` | 14 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=naboo groundScene"` | 16 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=tatooine groundScene"` | 18 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_npe_falcon_2 groundScene"` | 19 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=dantooine groundScene"` | 21 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=dathomir groundScene"` | 22 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_corellia watcherServicePort"` | 24 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:ChatServer:ChatServer"` | 25 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=9 sceneID=tatooine groundScene"` | 29 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=4 sceneID=corellia groundScene"` | 30 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=endor groundScene"` | 32 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=lok groundScene"` | 33 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=yavin4 groundScene"` | 35 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=rori groundScene"` | 36 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_endor watcherServicePort"` | 38 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_yavin4 watcherServicePort"` | 39 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=tutorial groundScene"` | 42 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=rori groundScene"` | 43 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=endor groundScene"` | 45 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=6 sceneID=naboo groundScene"` | 46 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=7 sceneID=tatooine groundScene"` | 48 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=dantooine groundScene"` | 49 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=naboo watcherServicePort"` | 51 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=corellia watcherServicePort"` | 52 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=dathomir groundScene"` | 55 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_ord_mantell groundScene"` | 56 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=adventure2 groundScene"` | 57 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=talus groundScene"` | 59 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=lok groundScene"` | 60 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=dungeon1 groundScene"` | 62 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_corellia watcherServicePort"` | 64 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_lok watcherServicePort"` | 65 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=adventure1 groundScene"` | 68 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=talus groundScene"` | 69 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=dantooine groundScene"` | 71 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=4 sceneID=naboo groundScene"` | 72 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=4 sceneID=talus groundScene"` | 74 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=6 sceneID=tatooine groundScene"` | 75 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_npe_falcon_2 watcherServicePort"` | 77 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_ord_mantell watcherServicePort"` | 78 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_corellia groundScene"` | 81 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_lok groundScene"` | 82 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=lok groundScene"` | 83 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=kashyyyk_dead_forest groundScene"` | 84 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=dathomir groundScene"` | 86 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_npe_falcon_3 groundScene"` | 87 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=kashyyyk_main watcherServicePort"` | 89 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=kashyyyk_dead_forest watcherServicePort"` | 90 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_endor groundScene"` | 93 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=4 sceneID=dathomir groundScene"` | 94 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=kashyyyk_pob_dungeons groundScene"` | 95 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=yavin4 groundScene"` | 97 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=5 sceneID=dantooine groundScene"` | 99 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=dungeon1 groundScene"` | 100 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=kashyyyk_rryatt_trail watcherServicePort"` | 102 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=kashyyyk_pob_dungeons watcherServicePort"` | 103 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_tatooine groundScene"` | 106 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_naboo groundScene"` | 107 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=rori groundScene"` | 108 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_tatooine watcherServicePort"` | 110 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_naboo watcherServicePort"` | 111 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=kashyyyk_south_dungeons watcherServicePort"` | 112 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_dantooine groundScene"` | 115 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_light1 groundScene"` | 116 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=kashyyyk_rryatt_trail groundScene"` | 117 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=4 sceneID=endor groundScene"` | 118 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_dantooine watcherServicePort"` | 120 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_light1 watcherServicePort"` | 121 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=adventure2 watcherServicePort"` | 122 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=tatooine groundScene"` | 125 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_kashyyyk groundScene"` | 126 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_dathomir groundScene"` | 127 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=yavin4 groundScene"` | 128 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_heavy1 watcherServicePort"` | 130 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_kashyyyk watcherServicePort"` | 131 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=4 sceneID=dungeon1 groundScene"` | 134 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=talus groundScene"` | 135 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_yavin4 groundScene"` | 136 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=adventure1 watcherServicePort"` | 138 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=rori watcherServicePort"` | 139 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_heavy1 groundScene"` | 142 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=11 sceneID=tatooine groundScene"` | 143 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=4 sceneID=dantooine groundScene"` | 144 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_npe_falcon_3 watcherServicePort"` | 146 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=yavin4 watcherServicePort"` | 147 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=mustafar groundScene"` | 150 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_nova_orion groundScene"` | 151 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=8 sceneID=tatooine groundScene"` | 152 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_npe_falcon watcherServicePort"` | 154 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_nova_orion watcherServicePort"` | 155 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=kashyyyk_north_dungeons groundScene"` | 158 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=mustafar groundScene"` | 159 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=tutorial watcherServicePort"` | 161 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=mustafar groundScene"` | 164 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=tatooine groundScene"` | 165 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=mustafar watcherServicePort"` | 167 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=dungeon1 groundScene"` | 170 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=naboo groundScene"` | 171 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=talus watcherServicePort"` | 173 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=7 sceneID=dantooine groundScene"` | 176 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=kashyyyk_main groundScene"` | 177 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=dantooine watcherServicePort"` | 179 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=endor groundScene"` | 182 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=6 sceneID=dantooine groundScene"` | 184 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=dathomir watcherServicePort"` | 187 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=1 sceneID=corellia groundScene"` | 190 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=space_npe_falcon groundScene"` | 191 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=dungeon1 watcherServicePort"` | 193 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=5 sceneID=naboo groundScene"` | 196 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=tutorial groundScene"` | 197 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=space_dathomir watcherServicePort"` | 199 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=3 sceneID=corellia groundScene"` | 202 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=kashyyyk_south_dungeons groundScene"` | 203 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=kashyyyk_north_dungeons watcherServicePort"` | 205 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=5 sceneID=corellia groundScene"` | 208 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=corellia groundScene"` | 209 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=kashyyyk_hunting watcherServicePort"` | 211 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:sceneID=kashyyyk_hunting groundScene"` | 214 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=2 sceneID=naboo groundScene"` | 215 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=endor watcherServicePort"` | 217 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=5 sceneID=tatooine groundScene"` | 220 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:SwgGameServer:preloadNumber=10 sceneID=tatooine groundScene"` | 221 |
| `../swg-source-docker/swg-main/exe/linux/multiserver.cfg` | `TaskManager` | `preferredNode` | `"node0:PlanetServer:sceneID=lok watcherServicePort"` | 223 |

## Implemented Packet List (TypeScript present)

### AbortShutdown
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x1b877422`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### AbortTradeMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0x9ca80f98`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### AcceptAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AcceptAuctionMessage.h`
- Derived CRC/opcode hint: `0xb95c8a82`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### AcceptAuctionResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AcceptAuctionResponseMessage.h`
- Derived CRC/opcode hint: `0xc58a446e`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_result`: `int` via `AutoVariable` -> `number` (addVariable)

### AcceptHighBidMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/AcceptHighBidMessage.h`
- Derived CRC/opcode hint: `0x85dfb334`
- Serialized length model: exact `24` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### AcceptTransactionMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0xb131ca17`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### AccountFeatureIdRequest
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/AccountFeatureIdRequest.h`
- Derived CRC/opcode hint: `0xb1a7e294`
- Serialized length model: exact `29` bytes
- Fields (order):
  - `m_requester`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_gameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetStationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_gameCode`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_requestReason`: `int8` via `AutoVariable` -> `number` (addVariable)

### AccountFeatureIdResponse
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/AccountFeatureIdResponse.h`
- Derived CRC/opcode hint: `0x2ce96bfa`
- Serialized length model: minimum `46` bytes + variable payload
- Fields (order):
  - `m_requester`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_gameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetStationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_gameCode`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_requestReason`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_resultCode`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_resultCameFromSession`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_featureIds`: `std::map<uint32, int>` via `AutoVariable` -> `Map<number, number>` (addVariable)
  - `m_sessionFeatureIdsData`: `std::map<uint32, std::string>` via `AutoVariable` -> `Map<number, string>` (addVariable)
  - `m_sessionResultString`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sessionResultText`: `std::string` via `AutoVariable` -> `string` (addVariable)

### AddAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/AddAuctionMessage.h`
- Derived CRC/opcode hint: `0x4172a001`
- Serialized length model: minimum `92` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_ownerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_minimumBid`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionTimer`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemNameLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_itemType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemTemplateId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_expireTimer`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_locationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_flags`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_userDescriptionLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_userDescription`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_attributes`: `std::pair<std::string, Unicode::String>` via `AutoArray` -> `[string, string][]` (addVariable)
  - `m_itemSize`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorLimit`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorItemLimit`: `int` via `AutoVariable` -> `number` (addVariable)

### AddBidMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/AddBidMessage.h`
- Derived CRC/opcode hint: `0x5b3cf104`
- Serialized length model: minimum `34` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_bid`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_maxProxyBid`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_playerName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### AddCharacterMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/AddCharacterMessage.h`
- Derived CRC/opcode hint: `0xf11dd1e8`
- Serialized length model: minimum `21` bytes + variable payload
- Fields (order):
  - `m_accountNumber`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_special`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### AddImmediateAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/AddImmediateAuctionMessage.h`
- Derived CRC/opcode hint: `0x7d9df69a`
- Serialized length model: minimum `92` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_ownerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_price`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionTimer`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemNameLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_itemType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemTemplateId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_expireTimer`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_locationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_flags`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_userDescriptionLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_userDescription`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_attributes`: `std::pair<std::string, Unicode::String>` via `AutoArray` -> `[string, string][]` (addVariable)
  - `m_itemSize`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorLimit`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorItemLimit`: `int` via `AutoVariable` -> `number` (addVariable)

### AddItemFailedMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0x4417af8b`
- CRC source wire name: `RemoveItemMessage`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_object`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### AddItemMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0x1e8d1356`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_object`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### AddMapLocationMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AddMapLocationMessage.h`
- Derived CRC/opcode hint: `0xab2174b6`
- Serialized length model: minimum `24` bytes + variable payload
- Fields (order):
  - `m_planetName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_locationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_locationName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_locationX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_locationY`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_category`: `uint8` via `AutoVariable` -> `number` (addVariable)
  - `m_subCategory`: `uint8` via `AutoVariable` -> `number` (addVariable)

### AddMapLocationResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AddMapLocationResponseMessage.h`
- Derived CRC/opcode hint: `0xe883aa40`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_locationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### AddOIDBlockMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/AddObjectIdBlockMessage.h`
- Derived CRC/opcode hint: `0x1f05606a`
- Serialized length model: exact `21` bytes
- Fields (order):
  - `m_serverId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_start`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_end`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_logRequest`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### AddResourceTypeMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/AddResourceTypeMessage.h`
- Derived CRC/opcode hint: `0x3b4532ce`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_data`: `AddResourceTypeMessageNamespace::ResourceTypeData` via `AutoArray` -> `unknown[]` (addVariable)

### AdjustAccountFeatureIdRequest
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/AdjustAccountFeatureIdRequest.h`
- Derived CRC/opcode hint: `0x286ea14e`
- Serialized length model: minimum `48` bytes + variable payload
- Fields (order):
  - `m_requestingPlayer`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_gameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_targetPlayer`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetPlayerDescription`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_targetStationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_targetItem`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetItemDescription`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_gameCode`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_featureId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_adjustment`: `int` via `AutoVariable` -> `number` (addVariable)

### AdjustAccountFeatureIdResponse
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/AdjustAccountFeatureIdResponse.h`
- Derived CRC/opcode hint: `0xe27e7a6b`
- Serialized length model: minimum `61` bytes + variable payload
- Fields (order):
  - `m_requestingPlayer`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_gameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_targetPlayer`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetPlayerDescription`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_targetStationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_targetItem`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetItemDescription`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_gameCode`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_featureId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_oldValue`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_newValue`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_resultCode`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_resultCameFromSession`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_sessionResultString`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sessionResultText`: `std::string` via `AutoVariable` -> `string` (addVariable)

### AINodeInfo
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AIDebuggingMessages.h`
- Derived CRC/opcode hint: `0x24163840`
- Serialized length model: minimum `36` bytes + variable payload
- Fields (order):
  - `m_nodeId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_locationX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_locationY`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_locationZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_parent`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_children`: `int` via `AutoArray` -> `number[]` (addVariable)
  - `m_siblings`: `int` via `AutoArray` -> `number[]` (addVariable)
  - `m_type`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_level`: `int` via `AutoVariable` -> `number` (addVariable)

### AIPathInfo
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AIDebuggingMessages.h`
- Derived CRC/opcode hint: `0xca1daab6`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_nodes`: `AIPathInfo_NodeInfo` via `AutoArray` -> `unknown[]` (addVariable)

### AppendCommentMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/AppendCommentMessage.h`
- Derived CRC/opcode hint: `0x0ac49644`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_ticketId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_characterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_comment`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### AppendCommentResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/AppendCommentResponseMessage.h`
- Derived CRC/opcode hint: `0xa04a3eca`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_result`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `m_ticketId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### AttributeListMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AttributeListMessage.h`
- Derived CRC/opcode hint: `0xf3f12f2a`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_staticItemName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_data`: `AttributePair` via `AutoArray` -> `unknown[]` (addVariable)
  - `m_revision`: `int` via `AutoVariable` -> `number` (addVariable)

### AuctionQueryHeadersMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AuctionQueryHeadersMessage.h`
- Derived CRC/opcode hint: `0x679e0d00`
- Serialized length model: minimum `54` bytes + variable payload
- Fields (order):
  - `m_locationSearchType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_requestId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_searchType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemTypeExactMatch`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_itemTemplateId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_textFilterAll`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_textFilterAny`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_priceFilterMin`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_priceFilterMax`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_priceFilterIncludesFee`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_advancedSearch`: `SearchCondition` via `AutoList` -> `unknown[]` (addVariable)
  - `m_advancedSearchMatchAllAny`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_container`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_myVendorsOnly`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_queryOffset`: `uint16` via `AutoVariable` -> `number` (addVariable)

### AuctionQueryHeadersResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AuctionQueryHeadersResponseMessage.h`
- Derived CRC/opcode hint: `0xfa500e52`
- Serialized length model: minimum `23` bytes + variable payload
- Fields (order):
  - `m_requestId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_typeFlag`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_stringPalette`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_wideStringPalette`: `Unicode::String` via `AutoArray` -> `string[]` (addVariable)
  - `m_palettizedAuctionData`: `Auction::PalettizedItemDataHeader` via `AutoArray` -> `unknown[]` (addVariable)
  - `m_queryOffset`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `m_hasMorePages`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### AuctionQueryMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AuctionQueryMessage.h`
- Derived CRC/opcode hint: `0xa0211783`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_requestId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemType`: `int` via `AutoVariable` -> `number` (addVariable)

### AuctionQueryResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AuctionQueryResponseMessage.h`
- Derived CRC/opcode hint: `0xac1c746e`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_requestId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_typeFlag`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionData`: `AuctionData` via `AutoArray` -> `unknown[]` (addVariable)

### AuthTransferClientMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/AuthTransferClientMessage.h`
- Derived CRC/opcode hint: `0x04940ffc`
- Serialized length model: minimum `85` bytes + variable payload
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_connectionServerIp`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_connectionServerPort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `m_skipLoadScreen`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_account`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_ipAddr`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_secure`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_observedObjects`: `NetworkId` via `AutoArray` -> `bigint[]` (addVariable)
  - `m_gameFeatures`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_subscriptionFeatures`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_accountFeatureIds`: `std::map<uint32, int>` via `AutoVariable` -> `Map<number, number>` (addVariable)
  - `m_entitlementTotalTime`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_entitlementEntitledTime`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_entitlementTotalTimeSinceLastLogin`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_entitlementEntitledTimeSinceLastLogin`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_buddyPoints`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_sourceServerPid`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_consumedRewardEvents`: `std::pair<NetworkId, std::string>` via `AutoArray` -> `bigint[]` (addVariable)
  - `m_claimedRewardItems`: `std::pair<NetworkId, std::string>` via `AutoArray` -> `bigint[]` (addVariable)
  - `m_usingAdminLogin`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_combatSpamFilter`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_combatSpamRangeSquaredFilter`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_furnitureRotationDegree`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_hasUnoccupiedJediSlot`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_isJediSlotCharacter`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### BaselinesMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/BaselinesMessage.h`
- Derived CRC/opcode hint: `0x68a75f0c`
- Serialized length model: minimum `17` bytes + variable payload
- Fields (order):
  - `target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `typeId`: `Tag` via `AutoVariable` -> `number` (addVariable)
  - `packageId`: `unsigned char` via `AutoVariable` -> `number` (addVariable)
  - `package`: `Archive::ByteStream` via `AutoVariable` -> `Uint8Array` (addVariable)

### BatchBaselinesMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/BatchBaselinesMessage.h`
- Derived CRC/opcode hint: `0x74792d5e`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_data`: `std::vector<BatchBaselinesMessageData>` via `AutoVariable` -> `unknown[]` (addVariable)

### BeginTradeMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0x325932d8`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_player`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### BeginVerificationMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0xe7491df5`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### BidAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/BidAuctionMessage.h`
- Derived CRC/opcode hint: `0x91125453`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_bid`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_maxProxyBid`: `int` via `AutoVariable` -> `number` (addVariable)

### BidAuctionResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/BidAuctionResponseMessage.h`
- Derived CRC/opcode hint: `0x8fcbef4a`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_result`: `int` via `AutoVariable` -> `number` (addVariable)

### BiographyMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/BiographyMessage.h`
- Derived CRC/opcode hint: `0x612e6fa4`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_owner`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_bio`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### BountyHunterTargetListMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/BountyHunterTargetListMessage.h`
- Derived CRC/opcode hint: `0x7d0218ae`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_targetList`: `std::vector< std::pair< NetworkId, NetworkId > >` via `AutoVariable` -> `bigint` (addVariable)

### BountyHunterTargetMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/BountyHunterTargetMessage.h`
- Derived CRC/opcode hint: `0x4c00e2b1`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### CancelAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/CancelAuctionMessage.h`
- Derived CRC/opcode hint: `0x509e0f24`
- Serialized length model: exact `24` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### CancelLiveAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CancelLiveAuctionMessage.h`
- Derived CRC/opcode hint: `0x3687a4d2`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### CancelLiveAuctionResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CancelLiveAuctionResponseMessage.h`
- Derived CRC/opcode hint: `0x7da2246c`
- Serialized length model: exact `13` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_result`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorRefusal`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### CancelTicketMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/CancelTicketMessage.h`
- Derived CRC/opcode hint: `0x638ef431`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_ticketId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_comment`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### CancelTicketResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/CancelTicketResponseMessage.h`
- Derived CRC/opcode hint: `0xd6fbf318`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_result`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `m_ticketId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### CentralCreateCharacter
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x65828ed9`
- Serialized length model: minimum `58` bytes + variable payload
- Fields (order):
  - `m_appearanceData`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_cellId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_coordinates`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_planetName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_hairTemplateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_hairAppearanceData`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_templateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_profession`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_scaleFactor`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_biography`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_useNewbieTutorial`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_skillTemplate`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_workingSkill`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_jedi`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_gameFeatures`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CentralGameServerConnect
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x130a0a68`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `clientServiceAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `gameServiceAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `volumeName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `clientServicePort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `gameServicePort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `buildVersionNumber`: `std::string` via `AutoVariable` -> `string` (addVariable)

### CentralGameServerDbProcessServerProcessId
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x5a129245`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `serverProcessId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `gameTime`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CentralGameServerProxyObject
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x0a3f7d31`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `gameServerAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `gameServerPort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `gameServerProcessId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `templateName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### CentralGameServerSetProcessId
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x045deee0`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `processId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `clockSubtractInterval`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `clusterName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### CentralGameServiceAddress
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralTaskManager/CentralTaskMessages.h`
- Derived CRC/opcode hint: `0x9b6f0ecf`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `clientServiceAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `clientServicePort`: `uint16` via `AutoVariable` -> `number` (addVariable)

### CentralPingMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralPingMessage.h`
- Derived CRC/opcode hint: `0xf9d4e7fa`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### CentralPlanetServerConnect
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralPlanetServer/CentralPlanetServerConnect.h`
- Derived CRC/opcode hint: `0x9740a160`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_sceneId`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_connectionAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_gameServerPort`: `uint16` via `AutoVariable` -> `number` (addVariable)

### ChangeUniverseProcessMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/ChangeUniverseProcessMessage.h`
- Derived CRC/opcode hint: `0x703560b3`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_id`: `int` via `AutoVariable` -> `number` (addVariable)

### CharacterListMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CharacterListMessage.h`
- Derived CRC/opcode hint: `0x2ab42c64`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_data`: `CharacterListMessageData` via `AutoArray` -> `unknown[]` (addVariable)
  - `m_accountNumber`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CharacterNamesMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/CharacterNamesMessage.h`
- Derived CRC/opcode hint: `0x4a986bb2`
- Serialized length model: minimum `24` bytes + variable payload
- Fields (order):
  - `m_ids`: `NetworkId` via `AutoArray` -> `bigint[]` (addVariable)
  - `m_stationIds`: `int` via `AutoArray` -> `number[]` (addVariable)
  - `m_names`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_fullNames`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_createTimes`: `int` via `AutoArray` -> `number[]` (addVariable)
  - `m_loginTimes`: `int` via `AutoArray` -> `number[]` (addVariable)

### CharacterSheetResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CharacterSheetResponseMessage.h`
- Derived CRC/opcode hint: `0x9b3a17c4`
- Serialized length model: minimum `60` bytes + variable payload
- Fields (order):
  - `m_bornDate`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_played`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_bindLocation`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_bindPlanet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_bankLocation`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_bankPlanet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_residenceLocation`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_residencePlanet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_citizensOf`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_spouseName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_lotsUsed`: `int` via `AutoVariable` -> `number` (addVariable)

### CharacterTransferStatusMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CharacterTransferStatusMessage.h`
- Derived CRC/opcode hint: `0x2b2c4fa0`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_gameServerId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_toCharacterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_statusMessage`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatAddFriend
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatAddFriend.h`
- Derived CRC/opcode hint: `0x6c002d13`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `characterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatAddModeratorToRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatAddModeratorToRoom.h`
- Derived CRC/opcode hint: `0x90bde76f`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `sequenceId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatBanAvatarFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatBanAvatarFromRoom.h`
- Derived CRC/opcode hint: `0xd9fa0194`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatChangeFriendStatus
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatChangeFriendStatus.h`
- Derived CRC/opcode hint: `0xf22eb811`
- Serialized length model: minimum `17` bytes + variable payload
- Fields (order):
  - `characterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `friendName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `add`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ChatChangeIgnoreStatus
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatChangeIgnoreStatus.h`
- Derived CRC/opcode hint: `0xd6f40538`
- Serialized length model: minimum `17` bytes + variable payload
- Fields (order):
  - `characterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `friendName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `ignore`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ChatConnectAvatar
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/ChatConnectAvatar.h`
- Derived CRC/opcode hint: `0x7b37ac9b`
- Serialized length model: minimum `16` bytes + variable payload
- Fields (order):
  - `characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `characterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `isSecure`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `isSubscribed`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ChatCreateRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatCreateRoom.h`
- Derived CRC/opcode hint: `0x35366bed`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `isPublic`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `isModerated`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `ownerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `roomTitle`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatDeleteAllPersistentMessages
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatDeleteAllPersistentMessages.h`
- Derived CRC/opcode hint: `0x8b1e8e72`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_sourceNetworkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetNetworkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### ChatDeletePersistentMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatDeletePersistentMessage.h`
- Derived CRC/opcode hint: `0x8f251641`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `messageId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatDestroyRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatDestroyRoom.h`
- Derived CRC/opcode hint: `0x094b2a77`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `roomId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatDestroyRoomByName
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatDestroyRoomByName.h`
- Derived CRC/opcode hint: `0x6a3301bc`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `roomPath`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatDisconnectAvatar
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/ChatDisconnectAvatar.h`
- Derived CRC/opcode hint: `0x214836ea`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### ChatEnterRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatEnterRoom.h`
- Derived CRC/opcode hint: `0x1002e2b6`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatEnterRoomById
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatEnterRoomById.h`
- Derived CRC/opcode hint: `0xbc6bddf2`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatFriendsListUpdate
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatFriendsListUpdate.h`
- Derived CRC/opcode hint: `0x6cd2fcd8`
- Serialized length model: minimum `7` bytes + variable payload
- Fields (order):
  - `characterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `isOnline`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ChatGetFriendsList
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatGetFriendsList.h`
- Derived CRC/opcode hint: `0x351c5dfe`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `characterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)

### ChatGetIgnoreList
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatGetIgnoreList.h`
- Derived CRC/opcode hint: `0x54da3095`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `characterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)

### ChatInstantMessageToCharacter
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatInstantMessageToCharacter.h`
- Derived CRC/opcode hint: `0x84bb21f7`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `characterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `message`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `outOfBand`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatInstantMessageToClient
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatInstantMessageToClient.h`
- Derived CRC/opcode hint: `0x3c565ced`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `fromName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `message`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `outOfBand`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### ChatInviteAvatarToRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatInviteAvatarToRoom.h`
- Derived CRC/opcode hint: `0x7273ecd3`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatInviteGroupMembersToRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatInviteGroupMembersToRoom.h`
- Derived CRC/opcode hint: `0x2c0430f0`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `invitorNetworkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `groupLeaderId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `invitedMembers`: `NetworkId` via `AutoArray` -> `bigint[]` (addVariable)

### ChatInviteGroupToRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatInviteGroupToRoom.h`
- Derived CRC/opcode hint: `0x01b5c536`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatKickAvatarFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatKickAvatarFromRoom.h`
- Derived CRC/opcode hint: `0xe0bce25b`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `m_roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatMessageFromGame
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatMessageFromGame.h`
- Derived CRC/opcode hint: `0x21ca3bb2`
- Serialized length model: minimum `19` bytes + variable payload
- Fields (order):
  - `from`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `message`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `messageType`: `unsigned char` via `AutoVariable` -> `number` (addVariable)
  - `oob`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `room`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `subject`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `to`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatOnAddFriend
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnAddFriend.h`
- Derived CRC/opcode hint: `0x2b2a0d94`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnAddModeratorToRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnAddModeratorToRoom.h`
- Derived CRC/opcode hint: `0x36a03858`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `granterId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `resultCode`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `sequenceId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnBanAvatarFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnBanAvatarFromRoom.h`
- Derived CRC/opcode hint: `0x5a38538d`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `banner`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `bannee`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnChangeFriendStatus
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnChangeFriendStatus.h`
- Derived CRC/opcode hint: `0x54336726`
- Serialized length model: minimum `23` bytes + variable payload
- Fields (order):
  - `character`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `friendName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `add`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `resultCode`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnChangeIgnoreStatus
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnChangeIgnoreStatus.h`
- Derived CRC/opcode hint: `0x70e9da0f`
- Serialized length model: minimum `23` bytes + variable payload
- Fields (order):
  - `character`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `ignoreName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `ignore`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `resultCode`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnConnectAvatar
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnConnectAvatar.h`
- Derived CRC/opcode hint: `0xd72fe9be`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### ChatOnCreateRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnCreateRoom.h`
- Derived CRC/opcode hint: `0x35d7cc9f`
- Serialized length model: minimum `43` bytes + variable payload
- Fields (order):
  - `resultCode`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomData`: `ChatRoomData` via `AutoVariable` -> `ChatRoomData` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnDeleteAllPersistentMessages
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnDeleteAllPersistentMessages.h`
- Derived CRC/opcode hint: `0x4f23965a`
- Serialized length model: minimum `3` bytes + variable payload
- Fields (order):
  - `m_targetName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_success`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ChatOnDestroyRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnDestroyRoom.h`
- Derived CRC/opcode hint: `0xe8ec5877`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `destroyer`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `resultCode`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnEnteredRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnEnteredRoom.h`
- Derived CRC/opcode hint: `0xe69bdc0a`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `characterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnGetFriendsList
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnGetFriendsList.h`
- Derived CRC/opcode hint: `0xe97ab594`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `character`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `friends`: `ChatAvatarId` via `AutoArray` -> `ChatAvatarId[]` (addVariable)

### ChatOnGetIgnoreList
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnGetIgnoreList.h`
- Derived CRC/opcode hint: `0xf8c275b0`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `character`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `ignores`: `ChatAvatarId` via `AutoArray` -> `ChatAvatarId[]` (addVariable)

### ChatOnInviteGroupToRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnInviteGroupToRoom.h`
- Derived CRC/opcode hint: `0x8277972f`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `invitor`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `invitee`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnInviteToRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnInviteToRoom.h`
- Derived CRC/opcode hint: `0x493fe74a`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `invitor`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `invitee`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnKickAvatarFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnKickAvatarFromRoom.h`
- Derived CRC/opcode hint: `0x46a13d6c`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `removerId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `resultCode`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatOnLeaveRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnLeaveRoom.h`
- Derived CRC/opcode hint: `0x60b5098b`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `characterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `resultCode`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnReceiveRoomInvitation
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnReceiveRoomInvitation.h`
- Derived CRC/opcode hint: `0xc17eb06d`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `invitorAvatar`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatOnRemoveModeratorFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnRemoveModeratorFromRoom.h`
- Derived CRC/opcode hint: `0x1342fc47`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `removerId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `resultCode`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `sequenceId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnRequestLog
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnRequestLog.h`
- Derived CRC/opcode hint: `0xed546792`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `logEntries`: `ChatLogEntry` via `AutoArray` -> `unknown[]` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnSendInstantMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnSendInstantMessage.h`
- Derived CRC/opcode hint: `0x88dbb381`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnSendPersistentMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnSendPersistentMessage.h`
- Derived CRC/opcode hint: `0x94e7a7ae`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnSendRoomInvitation
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnSendRoomInvitation.h`
- Derived CRC/opcode hint: `0x25b3aee6`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnSendRoomMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnSendRoomMessage.h`
- Derived CRC/opcode hint: `0xe7b61633`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnUnbanAvatarFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnUnbanAvatarFromRoom.h`
- Derived CRC/opcode hint: `0xbaf9b815`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `banner`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `bannee`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatOnUninviteFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatOnUninviteFromRoom.h`
- Derived CRC/opcode hint: `0xbe33c7e8`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `invitor`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `invitee`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `result`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatPersistentMessageToClient
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatPersistentMessageToClient.h`
- Derived CRC/opcode hint: `0x08485e17`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `data`: `Data` via `AutoVariable` -> `Uint8Array` (addVariable)

### ChatPersistentMessageToServer
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatPersistentMessageToServer.h`
- Derived CRC/opcode hint: `0x25a29fa6`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `message`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `outOfBand`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `subject`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `toCharacterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)

### ChatPutAvatarInRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatPutAvatarInRoom.h`
- Derived CRC/opcode hint: `0xae9d52ae`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_avatarName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_forceCreate`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_createPrivate`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ChatQueryRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatQueryRoom.h`
- Derived CRC/opcode hint: `0x9cf2b192`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatQueryRoomResults
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatQueryRoomResults.h`
- Derived CRC/opcode hint: `0xc4de864e`
- Serialized length model: minimum `55` bytes + variable payload
- Fields (order):
  - `avatars`: `ChatAvatarId` via `AutoArray` -> `ChatAvatarId[]` (addVariable)
  - `invitees`: `ChatAvatarId` via `AutoArray` -> `ChatAvatarId[]` (addVariable)
  - `moderators`: `ChatAvatarId` via `AutoArray` -> `ChatAvatarId[]` (addVariable)
  - `banned`: `ChatAvatarId` via `AutoArray` -> `ChatAvatarId[]` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `roomData`: `ChatRoomData` via `AutoVariable` -> `ChatRoomData` (addVariable)

### ChatRemoveAvatarFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatRemoveAvatarFromRoom.h`
- Derived CRC/opcode hint: `0x493e3ffa`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ChatRemoveFriend
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatRemoveFriend.h`
- Derived CRC/opcode hint: `0xc7d647a2`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `characterName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)

### ChatRemoveModeratorFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatRemoveModeratorFromRoom.h`
- Derived CRC/opcode hint: `0x8a3f8e04`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `sequenceId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatRequestLog
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatRequestLog.h`
- Derived CRC/opcode hint: `0xedb5c0e0`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_player`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatRequestPersistentMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatRequestPersistentMessage.h`
- Derived CRC/opcode hint: `0x07e3559f`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `messageId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatRequestRoomList
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatRequestRoomList.h`
- Derived CRC/opcode hint: `0x4c3d2cfa`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### ChatRoomList
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatRoomList.h`
- Derived CRC/opcode hint: `0x70deb197`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `roomData`: `ChatRoomData` via `AutoArray` -> `ChatRoomData[]` (addVariable)

### ChatRoomMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatRoomMessage.h`
- Derived CRC/opcode hint: `0xcd4ce444`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `fromName`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `fromRoom`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `message`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `outOfBand`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### ChatSendToRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatSendToRoom.h`
- Derived CRC/opcode hint: `0x20e4dbe3`
- Serialized length model: minimum `16` bytes + variable payload
- Fields (order):
  - `message`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `outOfBand`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `roomId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatServerOnline
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/ChatServerOnline.h`
- Derived CRC/opcode hint: `0xd0600e63`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `address`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `port`: `unsigned short` via `AutoVariable` -> `number` (addVariable)

### ChatServerStatus
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatServerStatus.h`
- Derived CRC/opcode hint: `0x7102b15f`
- Serialized length model: exact `1` byte
- Fields (order):
  - `status`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ChatSystemMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatSystemMessage.h`
- Derived CRC/opcode hint: `0x6d2a6413`
- Serialized length model: minimum `9` bytes + variable payload
- Fields (order):
  - `flags`: `unsigned char` via `AutoVariable` -> `number` (addVariable)
  - `message`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `outOfBand`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### ChatUnbanAvatarFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatUnbanAvatarFromRoom.h`
- Derived CRC/opcode hint: `0x4c8f94a9`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `avatarId`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChatUninviteFromRoom
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/chat/ChatUninviteFromRoom.h`
- Derived CRC/opcode hint: `0xfc8d01f1`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `avatar`: `ChatAvatarId` via `AutoVariable` -> `ChatAvatarId` (addVariable)
  - `roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `sequence`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ChunkCompleteMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/ChunkCompleteMessage.h`
- Derived CRC/opcode hint: `0xd4edc601`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_chunks`: `std::pair<int, int>` via `AutoArray` -> `[number, number][]` (addVariable)

### ChunkObjectListMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/ChunkObjectListMessage.h`
- Derived CRC/opcode hint: `0xf6df9f36`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_ids`: `NetworkId` via `AutoArray` -> `bigint[]` (addVariable)

### ClaimRewardsMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/ClaimRewardsMessage.h`
- Derived CRC/opcode hint: `0xb139f85c`
- Serialized length model: minimum `36` bytes + variable payload
- Fields (order):
  - `m_gameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_player`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_rewardEvent`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_consumeEvent`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_accountUniqueItems`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_additionalItems`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_accountFeatureId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_consumeAccountFeatureId`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_accountFeatureIdOldValue`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_accountFeatureIdNewValue`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ClaimRewardsReplyMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/ClaimRewardsReplyMessage.h`
- Derived CRC/opcode hint: `0xf7b0daec`
- Serialized length model: minimum `40` bytes + variable payload
- Fields (order):
  - `m_gameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_player`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_rewardEvent`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_accountUniqueItems`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_additionalItems`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_accountFeatureId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_consumeAccountFeatureId`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_previousAccountFeatureIdCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_currentAccountFeatureIdCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_result`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### CleanupInvalidItemRetrievalMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/CleanupInvalidItemRetrievalMessage.h`
- Derived CRC/opcode hint: `0x2beeb2e9`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### ClientCreateCharacter
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0xb97f3074`
- Serialized length model: minimum `30` bytes + variable payload
- Fields (order):
  - `m_appearanceData`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_templateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_startingLocation`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_hairTemplateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_hairAppearanceData`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_profession`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_jedi`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_scaleFactor`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_biography`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_useNewbieTutorial`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_skillTemplate`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_workingSkill`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ClientCreateCharacterFailed
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0xdf333c6e`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_errorMessage`: `StringId` via `AutoVariable` -> `{ table: string; textIndex: number; text: string }` (addVariable)

### ClientCreateCharacterSuccess
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0xdf333c6e`
- CRC source wire name: `ClientCreateCharacterFailed`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### ClientIdMsg
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0xd5899226`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_gameBitsToClear`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `token`: `unsigned char` via `AutoArray` -> `number[]` (addVariable)
  - `version`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ClientMfdStatusUpdateMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientMfdStatusUpdateMessage.h`
- Derived CRC/opcode hint: `0x2d2d6ee1`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `m_sceneName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_worldCoordinates`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)

### ClientNotificationBoxMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/ClientNotificationBoxMessage.h`
- Derived CRC/opcode hint: `0x90cf7e03`
- Serialized length model: minimum `31` bytes + variable payload
- Fields (order):
  - `m_sequenceId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_player`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_contents`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_useNotificationIcon`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_iconStyle`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_timeout`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_channel`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_sound`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ClientOpenContainerMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientOpenContainerMessage.h`
- Derived CRC/opcode hint: `0xdca57409`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_slot`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ClientPermissionsMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientPermissionsMessage.h`
- Derived CRC/opcode hint: `0xe00730e5`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_canLogin`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_canCreateRegularCharacter`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_canCreateJediCharacter`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_canSkipTutorial`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ClientRandomNameRequest
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0xd6d1b6d1`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_creatureTemplate`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ClientRandomNameResponse
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0xe85fb868`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_creatureTemplate`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_errorMessage`: `StringId` via `AutoVariable` -> `{ table: string; textIndex: number; text: string }` (addVariable)

### ClientVerifyAndLockNameRequest
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0x9eb04b9f`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_templateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### ClientVerifyAndLockNameResponse
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0x9b2c6ba7`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_errorMessage`: `StringId` via `AutoVariable` -> `{ table: string; textIndex: number; text: string }` (addVariable)

### CloseHolocronMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CloseHolocronMessage.h`
- Derived CRC/opcode hint: `0xc0938a9d`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### ClusterWideDataGetElementMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/ClusterWideDataGetElementMessage.h`
- Derived CRC/opcode hint: `0x074406f8`
- Serialized length model: minimum `9` bytes + variable payload
- Fields (order):
  - `m_managerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_elementNameRegex`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_lockElements`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_requestId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ClusterWideDataGetElementResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/ClusterWideDataGetElementResponseMessage.h`
- Derived CRC/opcode hint: `0x9745c2ba`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `m_managerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_elementNameRegex`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_requestId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_lockKey`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_elementNameList`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_elementDictionaryList`: `ValueDictionary` via `AutoArray` -> `Map<string, { type: "bool" | "float" | "object id" | "signed int" | "string"; value: boolean | number | bigint | string }>[]` (addVariable)

### ClusterWideDataReleaseLockMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/ClusterWideDataReleaseLockMessage.h`
- Derived CRC/opcode hint: `0x27ebe6b0`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_managerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_lockKey`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ClusterWideDataRemoveElementMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/ClusterWideDataRemoveElementMessage.h`
- Derived CRC/opcode hint: `0x0f887a9a`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_managerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_elementNameRegex`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_lockKey`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ClusterWideDataUpdateDictionaryMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/ClusterWideDataUpdateDictionaryMessage.h`
- Derived CRC/opcode hint: `0xa3edb019`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_managerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_elementNameRegex`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_dictionary`: `ValueDictionary` via `AutoVariable` -> `Map<string, { type: "bool" | "float" | "object id" | "signed int" | "string"; value: boolean | number | bigint | string }>` (addVariable)
  - `m_replaceDictionary`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_autoRemove`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_lockKey`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CMCreateAuctionBidMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/CMCreateAuctionBidMessage.h`
- Derived CRC/opcode hint: `0xd016ea8d`
- Serialized length model: exact `24` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_bidderId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_bid`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_maxProxyBid`: `int` via `AutoVariable` -> `number` (addVariable)

### CMCreateAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/CMCreateAuctionMessage.h`
- Derived CRC/opcode hint: `0x5d13287d`
- Serialized length model: minimum `84` bytes + variable payload
- Fields (order):
  - `m_creatorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_minimumBid`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionTimer`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_buyNowPrice`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_userDescriptionLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_userDescription`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_attributes`: `std::pair<std::string, Unicode::String>` via `AutoArray` -> `[string, string][]` (addVariable)
  - `m_locationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemTemplateId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_expireTimer`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemNameLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_flags`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemSize`: `int` via `AutoVariable` -> `number` (addVariable)

### CMCreateLocationMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/CMCreateLocationMessage.h`
- Derived CRC/opcode hint: `0x204fd8c8`
- Serialized length model: minimum `51` bytes + variable payload
- Fields (order):
  - `m_locationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_locationString`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_salesTax`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_bankId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_emptyDate`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_lastAccessDate`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_inactiveDate`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_status`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_searchEnabled`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_entranceCharge`: `int` via `AutoVariable` -> `number` (addVariable)

### CMDeleteAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/CMDeleteAuctionMessage.h`
- Derived CRC/opcode hint: `0x80f56d35`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### CMDeleteLocationMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/CMDeleteLocationMessage.h`
- Derived CRC/opcode hint: `0xe65c5df2`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_locationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### CmdSceneReady
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CommandChannelMessages.h`
- Derived CRC/opcode hint: `0x43fd1c22`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### CmdStartScene
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CommandChannelMessages.h`
- Derived CRC/opcode hint: `0x3ae6dfae`
- Serialized length model: minimum `41` bytes + variable payload
- Fields (order):
  - `disableWorldSnapshot`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `sceneName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `startPosition`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `startYaw`: `float` via `AutoVariable` -> `number` (addVariable)
  - `templateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `timeSeconds`: `int64` via `AutoVariable` -> `bigint` (addVariable)
  - `serverEpoch`: `int32` via `AutoVariable` -> `number` (addVariable)

### CMUpdateAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/CMUpdateAuctionMessage.h`
- Derived CRC/opcode hint: `0x3d2715f7`
- Serialized length model: exact `20` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_flags`: `int` via `AutoVariable` -> `number` (addVariable)

### CMUpdateLocationMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/CMUpdateLocationMessage.h`
- Derived CRC/opcode hint: `0xb8d7945f`
- Serialized length model: minimum `51` bytes + variable payload
- Fields (order):
  - `m_locationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_locationString`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_salesTax`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_bankId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_emptyDate`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_lastAccessDate`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_inactiveDate`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_status`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_searchEnabled`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_entranceCharge`: `int` via `AutoVariable` -> `number` (addVariable)

### CombatActionCompleteMessage
- Status: ✅ Implemented
- C++ headers: `game/shared/library/swgSharedNetworkMessages/src/shared/combat/CombatActionCompleteMessage.h`
- Derived CRC/opcode hint: `0xef145a2b`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_sequenceId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CommoditiesLoadDoneMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/CommoditiesLoadDoneMessage.h`
- Derived CRC/opcode hint: `0x07a76171`
- CRC source wire name: `CommoditiesLoadDone`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_auctionLocationsCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_marketAuctionsCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_marketAuctionAttributesCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_marketAuctionBidsCount`: `int` via `AutoVariable` -> `number` (addVariable)

### ConGenericMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ConsoleChannelMessages.h`
- Derived CRC/opcode hint: `0x08c5fc76`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `msg`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `msgId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ConnectionCreateCharacter
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/CentralConnectionServerMessages.h`
- Derived CRC/opcode hint: `0xdd45ad94`
- Serialized length model: minimum `40` bytes + variable payload
- Fields (order):
  - `m_appearanceData`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_templateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_startingLocation`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_hairTemplateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_hairAppearanceData`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_profession`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_jedi`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_scaleFactor`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_biography`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_useNewbieTutorial`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_skillTemplate`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_workingSkill`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_noRateLimit`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_isForCharacterTransfer`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_gameFeatures`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ConnectionCreateCharacterFailed
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/CentralConnectionServerMessages.h`
- Derived CRC/opcode hint: `0xf1f8f8fc`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_errorMessage`: `StringId` via `AutoVariable` -> `{ table: string; textIndex: number; text: string }` (addVariable)
  - `m_optionalDetailedErrorMessage`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ConnectionCreateCharacterSuccess
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/CentralConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x72dcf126`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### ConnectionKeyPush
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/CentralConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x2058a4e0`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `key`: `KeyShare::Key` via `AutoVariableKeyShare` -> `Uint8Array` (addVariable)

### ConnectionRandomNameRequest
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/CentralConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x94487654`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (declarationOnly)
  - `m_creatureTemplate`: `std::string` via `AutoVariable` -> `string` (declarationOnly)

### ConnectionRandomNameResponse
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/CentralConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x4c9b7671`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (declarationOnly)
  - `m_creatureTemplate`: `std::string` via `AutoVariable` -> `string` (declarationOnly)
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (declarationOnly)

### ConnectionServerAddress
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x0b723e12`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `gameServiceAddress`: `std::string` via `AutoVariable` -> `string` (declarationOnly)
  - `gameServicePort`: `uint16` via `AutoVariable` -> `number` (declarationOnly)

### ConnectionServerDown
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/ConnectionServerDown.h`
- Derived CRC/opcode hint: `0xc51b4b25`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_id`: `int` via `AutoVariable` -> `number` (addVariable)

### ConnectionServerId
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/CentralConnectionServerMessages.h`
- Derived CRC/opcode hint: `0xf6409bb5`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_id`: `int` via `AutoVariable` -> `number` (addVariable)

### ConnectPlayerMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/ConnectPlayerMessage.h`
- Derived CRC/opcode hint: `0x2e365218`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ConnectPlayerResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/ConnectPlayerResponseMessage.h`
- Derived CRC/opcode hint: `0x6137556f`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_result`: `int32` via `AutoVariable` -> `number` (addVariable)

### ConnEnumerateCharacterId
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/CentralConnectionServerMessages.h`
- Derived CRC/opcode hint: `0xc71333e9`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `accountNumber`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `objectTemplate`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ConsentRequestMessage
- Status: ✅ Implemented
- C++ headers: `game/shared/library/swgSharedNetworkMessages/src/shared/consent/ConsentRequestMessage.h`
- Derived CRC/opcode hint: `0x99dcb094`
- Serialized length model: minimum `81` bytes + variable payload
- Fields (order):
  - `m_question`: `ProsePackage` via `AutoVariable` -> `{ stringId: { table: string; textIndex: number; text: string }; actor: { id: bigint; stringId: { table: string; textIndex: number; text: string }; str: string }; target: { id: bigint; stringId: { table: string; textIndex: number; text: string }; str: string }; other: { id: bigint; stringId: { table: string; textIndex: number; text: string }; str: string }; digitInteger: number; digitFloat: number; complexGrammar: boolean }` (addVariable)
  - `m_id`: `int` via `AutoVariable` -> `number` (addVariable)

### ConsentResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ConsentResponseMessage.h`
- Derived CRC/opcode hint: `0x6fc16ae8`
- Serialized length model: exact `13` bytes
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_id`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_response`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ControlAssumed
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameConnectionServer/GameConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x152bbdaa`
- Serialized length model: minimum `37` bytes + variable payload
- Fields (order):
  - `m_oid`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_sceneName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_skipLoadScreen`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_startPosition`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_startYaw`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_templateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_timeSeconds`: `int64` via `AutoVariable` -> `bigint` (addVariable)

### CreateAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CreateAuctionMessage.h`
- Derived CRC/opcode hint: `0xad47021d`
- Serialized length model: minimum `33` bytes + variable payload
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemLocalizedName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_minimumBid`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_userDescription`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_premium`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### CreateAuctionResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CreateAuctionResponseMessage.h`
- Derived CRC/opcode hint: `0x0e61cc92`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_result`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemRestrictedRejectionMessage`: `std::string` via `AutoVariable` -> `string` (addVariable)

### CreateClientPathMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CreateClientPathMessage.h`
- Derived CRC/opcode hint: `0x71957628`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_pointList`: `Vector` via `AutoArray` -> `{ x: number; y: number; z: number }[]` (addVariable)

### CreateClientProjectileLocationToObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0x3643d394`
- Serialized length model: minimum `45` bytes + variable payload
- Fields (order):
  - `m_weaponObjectTemplateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_startLocation`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_targetId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetHardpoint`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_startCell`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_speed`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_expiration`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_trail`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_trailArgb`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CreateClientProjectileMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0xa37e7199`
- Serialized length model: minimum `47` bytes + variable payload
- Fields (order):
  - `m_weaponObjectTemplateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_startX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_startY`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_startZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_startCell`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_endX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_endY`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_endZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_speed`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_expiration`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_trail`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_trailArgb`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CreateClientProjectileObjectToLocationMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0xcfdf929d`
- Serialized length model: minimum `45` bytes + variable payload
- Fields (order):
  - `m_weaponObjectTemplateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_sourceHardpoint`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_startCell`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetLocation`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_speed`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_expiration`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_trail`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_trailArgb`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CreateClientProjectileObjectToObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0xaf90d564`
- Serialized length model: minimum `43` bytes + variable payload
- Fields (order):
  - `m_weaponObjectTemplateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_sourceHardpoint`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_targetId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetHardpoint`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_startCell`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_speed`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_expiration`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_trail`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_trailArgb`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CreateDynamicRegionCircleMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/CreateDynamicRegionCircleMessage.h`
- Derived CRC/opcode hint: `0x8aca52c9`
- Serialized length model: minimum `52` bytes + variable payload
- Fields (order):
  - `m_centerX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_centerZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_radius`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_planet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_pvp`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_buildable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_municipal`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_geography`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_minDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_maxDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_spawnable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_mission`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_visible`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_notify`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### CreateDynamicRegionRectangleMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/CreateDynamicRegionRectangleMessage.h`
- Derived CRC/opcode hint: `0xb8564783`
- Serialized length model: minimum `56` bytes + variable payload
- Fields (order):
  - `m_minX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_minZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_maxX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_maxZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_planet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_pvp`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_buildable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_municipal`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_geography`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_minDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_maxDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_spawnable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_mission`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_visible`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_notify`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### CreateDynamicSpawnRegionCircleMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/CreateDynamicSpawnRegionCircleMessage.h`
- Derived CRC/opcode hint: `0x5236e904`
- Serialized length model: minimum `62` bytes + variable payload
- Fields (order):
  - `m_centerX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_centerY`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_centerZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_radius`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_planet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_pvp`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_buildable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_municipal`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_geography`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_minDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_maxDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_spawnable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_mission`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_visible`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_notify`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_spawnTable`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_duration`: `int` via `AutoVariable` -> `number` (addVariable)

### CreateGroupMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/CreateGroupMessage.h`
- Derived CRC/opcode hint: `0x4e652ea3`
- Serialized length model: minimum `30` bytes + variable payload
- Fields (order):
  - `m_leader`: `GroupMemberParam` via `AutoVariable` -> `{ m_memberId: bigint; m_memberName: string; m_memberDifficulty: number; m_memberProfession: number; m_memberIsPC: boolean; m_memberShipId: bigint; m_memberShipIsPOB: boolean; m_memberOwnsPOB: boolean }` (addVariable)
  - `m_members`: `std::vector<GroupMemberParam>` via `AutoVariable` -> `{ m_memberId: bigint; m_memberName: string; m_memberDifficulty: number; m_memberProfession: number; m_memberIsPC: boolean; m_memberShipId: bigint; m_memberShipIsPOB: boolean; m_memberOwnsPOB: boolean }[]` (addVariable)

### CreateImmediateAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CreateImmediateAuctionMessage.h`
- Derived CRC/opcode hint: `0x1e9ce308`
- Serialized length model: minimum `34` bytes + variable payload
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemLocalizedName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_price`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_userDescription`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_premium`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_vendorTransfer`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### CreateMissileMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CreateMissileMessage.h`
- Derived CRC/opcode hint: `0x721cf08b`
- Serialized length model: exact `60` bytes
- Fields (order):
  - `m_missileId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_source`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_sourceLocation`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_targetLocation`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_impactTime`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_missileTypeId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_weaponId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_targetComponent`: `int` via `AutoVariable` -> `number` (addVariable)

### CreateNebulaLightningMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CreateNebulaLightningMessage.h`
- Derived CRC/opcode hint: `0x65f27987`
- Serialized length model: exact `38` bytes
- Fields (order):
  - `m_nebulaLightningData`: `NebulaLightningData` via `AutoVariable` -> `{ lightningId: number; nebulaId: number; syncStampStart: number; syncStampEnd: number; endpoint0: { x: number; y: number; z: number }; endpoint1: { x: number; y: number; z: number } }` (addVariable)

### CreateNewObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CreateNewObjectMessage.h`
- Derived CRC/opcode hint: `0x4ce9b7a0`
- Serialized length model: minimum `26` bytes + variable payload
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_scene`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_pos`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)

### CreateObjectByCrcMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/CreateObjectMessage.h`
- Derived CRC/opcode hint: `0xdde01fab`
- Serialized length model: exact `25` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_crc`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_objType`: `Tag` via `AutoVariable` -> `number` (addVariable)
  - `m_createAuthoritative`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_container`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### CreateProjectileMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/CreateProjectileMessage.h`
- Derived CRC/opcode hint: `0xb88af9a5`
- Serialized length model: exact `21` bytes
- Fields (order):
  - `m_shipId`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `m_weaponIndex`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_projectileIndex`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_targetedComponent`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_startPosition_p`: `PackedPosition` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_direction_p`: `PackedPosition` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_syncStampLong`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CreateSyncUiMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/CreateSyncUiMessage.h`
- Derived CRC/opcode hint: `0x1bf4a460`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_clients`: `NetworkId` via `AutoDeltaVector` -> `bigint[]` (addVariable)

### CreateTicketMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/CreateTicketMessage.h`
- Derived CRC/opcode hint: `0x40e64dac`
- Serialized length model: minimum `29` bytes + variable payload
- Fields (order):
  - `m_characterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_category`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_subCategory`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_details`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_hiddenDetails`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_harassingPlayerName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_language`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_isBug`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### CreateTicketResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/CreateTicketResponseMessage.h`
- Derived CRC/opcode hint: `0x550a407a`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_result`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `m_ticketId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### CreateVendorMarketMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/CreateVendorMarketMessage.h`
- Derived CRC/opcode hint: `0x1e687b02`
- Serialized length model: minimum `26` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_playerVendorLimit`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_entranceCharge`: `int` via `AutoVariable` -> `number` (addVariable)

### CSGetCharactersRequestMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CSDBNetMessages.h`
- Derived CRC/opcode hint: `0xf8b5ab70`
- Serialized length model: exact `20` bytes
- Fields (order):
  - `m_accountId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_targetAccount`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_accessLevel`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_loginServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CSGetDeletedItemsRequestMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CSDBNetMessages.h`
- Derived CRC/opcode hint: `0x5c56e37a`
- Serialized length model: exact `20` bytes
- Fields (order):
  - `m_accountId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_targetAccount`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_accessLevel`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_loginServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### CSToolRequest
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/CSToolRequest.h`
- Derived CRC/opcode hint: `0xfd4baef3`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `m_accountId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_command`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_commandName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_accessLevel`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_userName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### CSToolResponse
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/CSToolResponse.h`
- Derived CRC/opcode hint: `0xc12fe7e9`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_accountId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_result`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### DatabaseCreateCharacterSuccess
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x5ff5569c`
- Serialized length model: minimum `21` bytes + variable payload
- Fields (order):
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_templateId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_jedi`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### DatabaseSaveStart
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x1e32bdff`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### DBCSRequestMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CSDBNetMessages.h`
- Derived CRC/opcode hint: `0xb328f51f`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `m_accountId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_accessLevel`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_loginServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_command`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_commandLine`: `std::string` via `AutoVariable` -> `string` (addVariable)

### DebugTransformMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AIDebuggingMessages.h`
- Derived CRC/opcode hint: `0xd0cdaa62`
- Serialized length model: exact `36` bytes
- Fields (order):
  - `m_transform`: `Transform` via `AutoVariable` -> `{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_cellId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### DeleteAuctionLocationMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/DeleteAuctionLocationMessage.h`
- Derived CRC/opcode hint: `0x8eb26b80`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_locationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_whoRequested`: `std::string` via `AutoVariable` -> `string` (addVariable)

### DeleteCharacterMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/DeleteCharacterMessage.h`
- Derived CRC/opcode hint: `0xe87ad031`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_clusterId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### DeleteCharacterReplyMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/DeleteCharacterReplyMessage.h`
- Derived CRC/opcode hint: `0x8268989b`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)

### DeltasMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/DeltasMessage.h`
- Derived CRC/opcode hint: `0x12862153`
- Serialized length model: minimum `17` bytes + variable payload
- Fields (order):
  - `target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `typeId`: `Tag` via `AutoVariable` -> `number` (addVariable)
  - `packageId`: `unsigned char` via `AutoVariable` -> `number` (addVariable)
  - `package`: `Archive::ByteStream` via `AutoVariable` -> `Uint8Array` (addVariable)

### DenyTradeMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0x6ec28670`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### DestroyClientPathMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/DestroyClientPathMessage.h`
- Derived CRC/opcode hint: `0xa75e85eb`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### DestroyShipComponentMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/DestroyShipComponentMessage.h`
- Derived CRC/opcode hint: `0x3871d784`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_shipId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_chassisSlot`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_severity`: `float` via `AutoVariable` -> `number` (addVariable)

### DestroyShipMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/DestroyShipMessage.h`
- Derived CRC/opcode hint: `0x5c680884`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_shipId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_severity`: `float` via `AutoVariable` -> `number` (addVariable)

### DestroyVendorMarketMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/DestroyVendorMarketMessage.h`
- Derived CRC/opcode hint: `0xad27b09b`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_ownerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)

### DisconnectPlayerMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/DisconnectPlayerMessage.h`
- Derived CRC/opcode hint: `0x9e56eba2`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### DisconnectPlayerResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/DisconnectPlayerResponseMessage.h`
- Derived CRC/opcode hint: `0x514320f6`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_result`: `int32` via `AutoVariable` -> `number` (addVariable)

### DownloadCharacterMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/DownloadCharacterMessage.h`
- Derived CRC/opcode hint: `0xb9bc02b5`
- Serialized length model: exact `17` bytes
- Fields (order):
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_gameServerId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_toCharacterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_isAdmin`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### DropClient
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameConnectionServer/GameConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x48dda6a2`
- Serialized length model: exact `9` bytes
- Fields (order):
  - `m_oid`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_immediate`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### EditAppearanceMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/EditAppearanceMessage.h`
- Derived CRC/opcode hint: `0x023320d5`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### EditStatsMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/EditStatsMessage.h`
- Derived CRC/opcode hint: `0x305e8c28`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### EnableNewJediTrackingMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/EnableNewJediTrackingMessage.h`
- Derived CRC/opcode hint: `0xd24bcc5b`
- Serialized length model: exact `1` byte
- Fields (order):
  - `m_enableTracking`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### EndBaselinesMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/EndBaselinesMessage.h`
- Derived CRC/opcode hint: `0x6546d701`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### EnterStructurePlacementModeMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/EnterStructurePlacementModeMessage.h`
- Derived CRC/opcode hint: `0xe8a54dc1`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_deedNetworkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_structureSharedObjectTemplateName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### EnterTicketPurchaseModeMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/EnterTicketPurchaseModeMessage.h`
- Derived CRC/opcode hint: `0x904dae1a`
- Serialized length model: minimum `5` bytes + variable payload
- Fields (order):
  - `m_planetName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_travelPointName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_instantTravel`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### EnumerateCharacterId
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0x65ea4574`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_data`: `Chardata` via `AutoArray` -> `unknown[]` (addVariable)

### EnumerateServers
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/EnumerateServers.h`
- Derived CRC/opcode hint: `0xc86cdc30`
- Serialized length model: minimum `9` bytes + variable payload
- Fields (order):
  - `add`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `address`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `port`: `unsigned short` via `AutoVariable` -> `number` (addVariable)
  - `serverType`: `int` via `AutoVariable` -> `number` (addVariable)

### ErrorMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/ErrorMessage.h`
- Derived CRC/opcode hint: `0xb5abf91a`
- Serialized length model: minimum `5` bytes + variable payload
- Fields (order):
  - `errorName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `description`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `fatal`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ExchangeListCreditsMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/ExchangeListCreditsMessage.h`
- Derived CRC/opcode hint: `0x9160dc18`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_actorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_credits`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_processId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ExcommunicateGameServerMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/ExcommunicateGameServerMessage.h`
- Derived CRC/opcode hint: `0x302914e5`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_serverId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_processId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_hostName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ExecuteConsoleCommand
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ConsoleChannelMessages.h`
- Derived CRC/opcode hint: `0xb1cfce1c`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_command`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ExpertiseRequestMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ExpertiseRequestMessage.h`
- Derived CRC/opcode hint: `0xc19085d5`
- Serialized length model: minimum `5` bytes + variable payload
- Fields (order):
  - `m_addExpertisesList`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_clearAllExpertisesFirst`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### FactionalSystemMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gamePlanetServer/FactionalSystemMessage.h`
- Derived CRC/opcode hint: `0x77331b83`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `m_prosePackage`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_location`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_radius`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_notifyImperial`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_notifyRebel`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### FactionRequestMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/FactionRequestMessage.h`
- Derived CRC/opcode hint: `0xc1b03b81`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### FactionResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/FactionResponseMessage.h`
- Derived CRC/opcode hint: `0x5dd53957`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `m_factionRebelValue`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_factionImperialValue`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_factionCriminalValue`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_npcFactionNameList`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_npcFactionValueList`: `float` via `AutoArray` -> `number[]` (addVariable)

### FailedToLoadObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/FailedToLoadObjectMessage.h`
- Derived CRC/opcode hint: `0xea984c3e`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)

### FeatureIdTransactionRequest
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/FeatureIdTransactionRequest.h`
- Derived CRC/opcode hint: `0x52327235`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_gameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_player`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### FeatureIdTransactionResponse
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/FeatureIdTransactionResponse.h`
- Derived CRC/opcode hint: `0x7193ca5a`
- Serialized length model: minimum `16` bytes + variable payload
- Fields (order):
  - `m_gameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_player`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_transactions`: `std::map<std::string, int>` via `AutoVariable` -> `Map<string, number>` (addVariable)

### FeatureIdTransactionSyncUpdate
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/FeatureIdTransactionSyncUpdate.h`
- Derived CRC/opcode hint: `0x30cd6d44`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_player`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemId`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_adjustment`: `int` via `AutoVariable` -> `number` (addVariable)

### FirstPlanetGameServerIdMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gamePlanetServer/FirstPlanetGameServerIdMessage.h`
- Derived CRC/opcode hint: `0xc113129f`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_gameServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### FlagObjectForDeleteMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/FlagObjectForDeleteMessage.h`
- Derived CRC/opcode hint: `0x463c408b`
- Serialized length model: exact `15` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_reason`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_immediate`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_demandLoadedContainer`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_cascadeReason`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ForceUnloadObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/ForceUnloadObjectMessage.h`
- Derived CRC/opcode hint: `0x311d30d2`
- Serialized length model: exact `9` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_permaDelete`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### FrameEndMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/FrameEndMessage.h`
- Derived CRC/opcode hint: `0xcc7e8772`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_processId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_frameTime`: `unsigned long` via `AutoVariable` -> `number` (addVariable)
  - `m_profilerData`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GalaxyLoopTimesResponse
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/GalaxyLoopTimesResponse.h`
- Derived CRC/opcode hint: `0x4e428088`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `currentFrameMilliseconds`: `unsigned long` via `AutoVariable` -> `number` (addVariable)
  - `lastFrameMilliseconds`: `unsigned long` via `AutoVariable` -> `number` (addVariable)

### GameClientMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameConnectionServer/GameConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x82f667db`
- Serialized length model: minimum `9` bytes + variable payload
- Fields (order):
  - `distributionList`: `NetworkId` via `AutoArray` -> `bigint[]` (addVariable)
  - `reliable`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `byteStream`: `Archive::ByteStream` via `AutoVariable` -> `Uint8Array` (addVariable)

### GameCreateCharacterFailed
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x68864b0b`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_errorMessage`: `StringId` via `AutoVariable` -> `{ table: string; textIndex: number; text: string }` (addVariable)
  - `m_optionalDetailedErrorMessage`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GameGameServerConnect
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/GameGameServerMessages.h`
- Derived CRC/opcode hint: `0x26b6443d`
- Serialized length model: exact `13` bytes
- Fields (order):
  - `m_isDbProcess`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_processId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_spawnCookie`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_preloadNumber`: `int` via `AutoVariable` -> `number` (addVariable)

### GameServerConnectAck
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/GameServerConnectAck.h`
- Derived CRC/opcode hint: `0x6f2ebf37`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### GameServerCSRequestMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/GameServerCSRequestMessage.h`
- Derived CRC/opcode hint: `0x1a75d634`
- CRC source wire name: `GameServerCSRequest`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `m_accountId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_command`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_accessLevel`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_loginServerID`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_userName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_commandName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GameServerCSResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/GameServerCSResponseMessage.h`
- Derived CRC/opcode hint: `0x24b95695`
- CRC source wire name: `GameServerCSResponse`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_accountId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_response`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_loginServerID`: `uint32` via `AutoVariable` -> `number` (addVariable)

### GameServerForceChangeAuthorityMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gamePlanetServer/GameServerForceChangeAuthorityMessage.h`
- Derived CRC/opcode hint: `0x566154f8`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_fromProcess`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_toProcess`: `uint32` via `AutoVariable` -> `number` (addVariable)

### GameServerForLoginMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralPlanetServer/GameServerForLoginMessage.h`
- Derived CRC/opcode hint: `0x4907263d`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_server`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### GameServerReadyMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/GameServerReadyMessage.h`
- Derived CRC/opcode hint: `0x34f352e9`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_mapWidth`: `int` via `AutoVariable` -> `number` (addVariable)

### GameServerStatus
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/planetWatch/GameServerStatus.h`
- Derived CRC/opcode hint: `0x9367176d`
- Serialized length model: minimum `13` bytes + variable payload
- Fields (order):
  - `m_online`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_serverInfo`: `ServerInfo` via `AutoVariable` -> `{ ipAddress: string; serverId: number; systemPid: number; sceneId: string }` (addVariable)

### GameServerUniverseLoadedMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/GameServerUniverseLoadedMessage.h`
- Derived CRC/opcode hint: `0x19741b91`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_processId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_sourceOfUniverseDataProcessId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### GameSetClusterName
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameTaskManager/GameTaskManagerMessages.h`
- Derived CRC/opcode hint: `0xc7d6abfd`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `clusterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `gameServerName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GameSetDbProcess
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameTaskManager/GameTaskManagerMessages.h`
- Derived CRC/opcode hint: `0xaabe6a82`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### GenericValueTypeMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/GenericValueTypeMessage.h`
- Derived CRC/opcode hint: `0x20b4b3c7`
- Serialized length model: minimum `0` bytes + variable payload
- Fields (order):
  - `value`: `ValueType` via `AutoVariable` -> `Uint8Array` (addVariable)

### GetArticleMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/GetArticleMessage.h`
- Derived CRC/opcode hint: `0x5e7b4846`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_id`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_language`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GetArticleResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/GetArticleResponseMessage.h`
- Derived CRC/opcode hint: `0x934baee0`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_result`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `m_article`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### GetAuctionDetails
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/GetAuctionDetails.h`
- Derived CRC/opcode hint: `0xd36efae4`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### GetAuctionDetailsResponse
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/GetAuctionDetailsResponse.h`
- Derived CRC/opcode hint: `0xfe0e644b`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `m_details`: `Auction::ItemDataDetails` via `AutoVariable` -> `{ itemId: bigint; userDescription: string; propertyList: [string, string][]; templateName: string; appearanceString: string }` (addVariable)

### GetAuctionLocationsMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/GetAuctionLocationsMessage.h`
- Derived CRC/opcode hint: `0x98ef63ca`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_auctionLocations`: `AuctionLocation` via `AutoList` -> `unknown[]` (addVariable)

### GetCharacterIdReplyMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CSDBNetMessages.h`
- Derived CRC/opcode hint: `0x7811f6c8`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `m_accountId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_loginServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GetCharactersForAccountCSReplyMsg
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CSDBNetMessages.h`
- Derived CRC/opcode hint: `0x04ae2493`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `m_accountId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_targetAccount`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_accessLevel`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_loginServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_responseString`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GetCommentsMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/GetCommentsMessage.h`
- Derived CRC/opcode hint: `0x270a9ec5`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_ticketId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### GetCommentsResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/GetCommentsResponseMessage.h`
- Derived CRC/opcode hint: `0xeadb08ca`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_result`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `m_comments`: `CustomerServiceComment` via `AutoArray` -> `unknown[]` (addVariable)

### GetDeletedItemsReplyMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CSDBNetMessages.h`
- Derived CRC/opcode hint: `0x29bee8b5`
- Serialized length model: minimum `26` bytes + variable payload
- Fields (order):
  - `m_accountId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_accessLevel`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_loginServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_responseString`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GetItemDetailsMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/GetItemDetailsMessage.h`
- Derived CRC/opcode hint: `0x3ea0cd21`
- Serialized length model: exact `24` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### GetItemMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/GetItemMessage.h`
- Derived CRC/opcode hint: `0x1db6ce02`
- Serialized length model: minimum `26` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GetMapLocationsMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/GetMapLocationsMessage.h`
- Derived CRC/opcode hint: `0x1a7ab839`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_planetName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_cacheVersionStatic`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_cacheVersionDynamic`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_cacheVersionPersist`: `int` via `AutoVariable` -> `number` (addVariable)

### GetMapLocationsResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/GetMapLocationsResponseMessage.h`
- Derived CRC/opcode hint: `0x9f80464c`
- Serialized length model: minimum `26` bytes + variable payload
- Fields (order):
  - `m_planetName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_mapLocationsStatic`: `MapLocation` via `AutoArray` -> `unknown[]` (addVariable)
  - `m_mapLocationsDynamic`: `MapLocation` via `AutoArray` -> `unknown[]` (addVariable)
  - `m_mapLocationsPersist`: `MapLocation` via `AutoArray` -> `unknown[]` (addVariable)
  - `m_versionStatic`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_versionDynamic`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_versionPersist`: `int` via `AutoVariable` -> `number` (addVariable)

### GetMarketAuctionAttributesMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/GetMarketAuctionAttributesMessage.h`
- Derived CRC/opcode hint: `0x089d3d5b`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_attributes`: `MarketAuctionAttribute` via `AutoList` -> `unknown[]` (addVariable)

### GetMarketAuctionBidsMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/GetMarketAuctionBidsMessage.h`
- Derived CRC/opcode hint: `0x8648e93e`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_marketAuctionBids`: `MarketAuctionBid` via `AutoList` -> `unknown[]` (addVariable)

### GetMarketAuctionsMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/GetMarketAuctionsMessage.h`
- Derived CRC/opcode hint: `0x454fe683`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_auctions`: `MarketAuction` via `AutoList` -> `unknown[]` (addVariable)

### GetMoneyFromOfflineObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/GetMoneyFromOfflineObjectMessage.h`
- Derived CRC/opcode hint: `0x95525c33`
- Serialized length model: minimum `29` bytes + variable payload
- Fields (order):
  - `m_sourceObject`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_amount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_replyTo`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_successCallback`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_failCallback`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_packedDictionary`: `std::vector<int8>` via `AutoVariable` -> `number[]` (addVariable)
  - `m_success`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### GetPlayerVendorCountMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/GetPlayerVendorCountMessage.h`
- Derived CRC/opcode hint: `0xd8717daa`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### GetTicketsMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/GetTicketsMessage.h`
- Derived CRC/opcode hint: `0xc9a5f98d`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_start`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_count`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### GetTicketsResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/GetTicketsResponseMessage.h`
- Derived CRC/opcode hint: `0xbb567f98`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_result`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `m_totalNumTickets`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_tickets`: `CustomerServiceTicket` via `AutoArray` -> `unknown[]` (addVariable)

### GetVendorOwnerMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/GetVendorOwnerMessage.h`
- Derived CRC/opcode hint: `0x76aaf946`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GetVendorValueMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/GetVendorValueMessage.h`
- Derived CRC/opcode hint: `0xb9b230e9`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GiveMoneyMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0xd1527ee8`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_amount`: `int` via `AutoVariable` -> `number` (addVariable)

### GrantCommand
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/GrantCommand.h`
- Derived CRC/opcode hint: `0xe67e3875`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `commandName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GrantSkill
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/GrantSkill.h`
- Derived CRC/opcode hint: `0x2c6da47f`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `category`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `commandsProvided`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `description`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `name`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `discipline`: `std::string` via `AutoVariable` -> `string` (addVariable)

### GuildRequestMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/GuildRequestMessage.h`
- Derived CRC/opcode hint: `0x81eb4ef7`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_targetId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### GuildResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/GuildResponseMessage.h`
- Derived CRC/opcode hint: `0x32263f20`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_targetId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_guildName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_memberTitle`: `std::string` via `AutoVariable` -> `string` (addVariable)

### HeartBeat
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/HeartBeat.h`
- Derived CRC/opcode hint: `0xa16cf9af`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### HyperspaceMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/HyperspaceMessage.h`
- Derived CRC/opcode hint: `0xcbf88482`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### IsVendorOwnerMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/IsVendorOwnerMessage.h`
- Derived CRC/opcode hint: `0x21b55a3b`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### IsVendorOwnerResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/IsVendorOwnerResponseMessage.h`
- Derived CRC/opcode hint: `0xce04173e`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `m_ownerResult`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_result`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_marketName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_maxPageSize`: `uint16` via `AutoVariable` -> `number` (addVariable)

### ItemMovedMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/ItemMovedMessage.h`
- Derived CRC/opcode hint: `0x7113f28f`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_locationNameLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_locationName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### KickPlayer
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameConnectionServer/GameConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x3b88e235`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_oid`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_reason`: `std::string` via `AutoVariable` -> `string` (addVariable)

### LoadCommoditiesMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/commoditiesSwgDatabase/LoadCommoditiesMessage.h`
- Derived CRC/opcode hint: `0xcb3a0cf5`
- CRC source wire name: `LoadCommodities`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_payload`: `int` via `AutoVariable` -> `number` (addVariable)

### LoadContainedObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/LoadContainedObjectMessage.h`
- Derived CRC/opcode hint: `0xe62088b1`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### LoadContentsMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/LoadContentsMessage.h`
- Derived CRC/opcode hint: `0x3bdee90a`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### LoadObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/LoadObjectMessage.h`
- Derived CRC/opcode hint: `0x3ca48c8e`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)

### LoadStructureMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/LoadStructureMessage.h`
- Derived CRC/opcode hint: `0xd7feaaa4`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_structureId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_whoRequested`: `std::string` via `AutoVariable` -> `string` (addVariable)

### LoadUniverseMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/LoadUniverseMessage.h`
- Derived CRC/opcode hint: `0x53b5ad41`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)

### LocateObjectResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/LocateObjectResponseMessage.h`
- Derived CRC/opcode hint: `0xedb4ec31`
- Serialized length model: minimum `53` bytes + variable payload
- Fields (order):
  - `m_targetId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_responseId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_responsePid`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_position_w`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_scene`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sharedTemplateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_targetPid`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_containers`: `std::vector<NetworkId>` via `AutoVariable` -> `bigint` (addVariable)
  - `m_isAthoritative`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_residenceOf`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### LocatePlayerResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/LocatePlayerResponseMessage.h`
- Derived CRC/opcode hint: `0x02e04c69`
- Serialized length model: minimum `38` bytes + variable payload
- Fields (order):
  - `m_targetId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_responseId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_responsePid`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_scene`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_position_w`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_targetPid`: `uint32` via `AutoVariable` -> `number` (addVariable)

### LocateStructureMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/LocateStructureMessage.h`
- Derived CRC/opcode hint: `0x50334cb5`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `m_structureId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_x`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_z`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_sceneId`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_whoRequested`: `std::string` via `AutoVariable` -> `string` (addVariable)

### LocationRequest
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gamePlanetServer/LocationRequest.h`
- Derived CRC/opcode hint: `0xcead7afa`
- Serialized length model: minimum `32` bytes + variable payload
- Fields (order):
  - `m_processId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_locationId`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_searchX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_searchZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_searchRadius`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_locationReservationRadius`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_checkWater`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_checkSlope`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### LocationResponse
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gamePlanetServer/LocationResponse.h`
- Derived CRC/opcode hint: `0xfe8aa5a0`
- Serialized length model: minimum `23` bytes + variable payload
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_valid`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_locationId`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_x`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_z`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_radius`: `float` via `AutoVariable` -> `number` (addVariable)

### LoggedInMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/CentralConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x96a4782c`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_accountNumber`: `uint32` via `AutoVariable` -> `number` (addVariable)

### LoginClientId
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientLoginServer/ClientLoginMessages.h`
- Derived CRC/opcode hint: `0x41131f96`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `id`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `key`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `version`: `std::string` via `AutoVariable` -> `string` (addVariable)

### LoginClientToken
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientLoginServer/ClientLoginMessages.h`
- Derived CRC/opcode hint: `0xaab296c6`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `token`: `unsigned char` via `AutoArray` -> `number[]` (addVariable)
  - `stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_username`: `std::string` via `AutoVariable` -> `string` (addVariable)

### LoginClusterName
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/LoginClusterName.h`
- Derived CRC/opcode hint: `0x04ddce9d`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_clusterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_timeZone`: `int` via `AutoVariable` -> `number` (addVariable)

### LoginClusterName2
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/LoginClusterName2.h`
- Derived CRC/opcode hint: `0xa28dfd69`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_clusterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_timeZone`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_branch`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_changelist`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_networkVersion`: `std::string` via `AutoVariable` -> `string` (addVariable)

### LoginClusterStatus
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientLoginServer/LoginClusterStatus.h`
- Derived CRC/opcode hint: `0x3436aeb6`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_data`: `ClusterData` via `AutoArray` -> `unknown[]` (addVariable)

### LoginClusterStatusEx
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientLoginServer/LoginClusterStatusEx.h`
- Derived CRC/opcode hint: `0xfa5b4b5a`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_data`: `ClusterData` via `AutoArray` -> `unknown[]` (addVariable)

### LoginConnectionServerAddress
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/LoginConnectionServerAddress.h`
- Derived CRC/opcode hint: `0x31fa1b9a`
- Serialized length model: minimum `16` bytes + variable payload
- Fields (order):
  - `clientServiceAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `clientServicePortPrivate`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `clientServicePortPublic`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `id`: `int` via `AutoVariable` -> `number` (addVariable)
  - `numClients`: `int` via `AutoVariable` -> `number` (addVariable)
  - `pingPort`: `uint16` via `AutoVariable` -> `number` (addVariable)

### LoginCreateCharacterAckMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/LoginCreateCharacterAckMessage.h`
- Derived CRC/opcode hint: `0x498f4c04`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_characterNetworkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### LoginCreateCharacterMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/LoginCreateCharacterMessage.h`
- Derived CRC/opcode hint: `0x67f36fbf`
- Serialized length model: minimum `21` bytes + variable payload
- Fields (order):
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_characterObjectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_templateId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_jedi`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### LoginEnumCluster
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientLoginServer/LoginEnumCluster.h`
- Derived CRC/opcode hint: `0xc11c63b9`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_data`: `ClusterData` via `AutoArray` -> `unknown[]` (addVariable)
  - `m_maxCharactersPerAccount`: `int` via `AutoVariable` -> `number` (addVariable)

### LoginIncorrectClientId
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientLoginServer/ClientLoginMessages.h`
- Derived CRC/opcode hint: `0x20e7e510`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `serverId`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `serverApplicationVersion`: `std::string` via `AutoVariable` -> `string` (addVariable)

### LoginKeyPush
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/LoginKeyPush.h`
- Derived CRC/opcode hint: `0xfcdd24d1`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `key`: `KeyShare::Key` via `AutoVariableKeyShare` -> `Uint8Array` (addVariable)

### LoginRestoreCharacterMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/LoginRestoreCharacterMessage.h`
- Derived CRC/opcode hint: `0xa641137c`
- Serialized length model: minimum `23` bytes + variable payload
- Fields (order):
  - `m_whoRequested`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_account`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_templateId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_jedi`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### LoginUpgradeAccountMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/LoginUpgradeAccountMessage.h`
- Derived CRC/opcode hint: `0xdae77ab7`
- Serialized length model: minimum `29` bytes + variable payload
- Fields (order):
  - `m_upgradeType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_character`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_replyToObject`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_replyMessage`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_packedMessageData`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_isAck`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### LogMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/LogMessage.h`
- Derived CRC/opcode hint: `0xaf5f77a2`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `m_timestamp`: `uint64` via `AutoVariable` -> `bigint` (addVariable)
  - `m_procId`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_channel`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_text`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_unicodeAttach`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### LogoutMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/LogoutMessage.h`
- Derived CRC/opcode hint: `0x42fd19dd`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### MessageRegionListCircleResponse
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/MessageRegionListCircleResponse.h`
- Derived CRC/opcode hint: `0x637a6506`
- Serialized length model: minimum `50` bytes + variable payload
- Fields (order):
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_planet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_worldX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_worldZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_pvp`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_buildable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_spawnable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_mission`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_municipal`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_geographical`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_minDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_maxDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_radius`: `float` via `AutoVariable` -> `number` (addVariable)

### MessageRegionListRectResponse
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/MessageRegionListRectResponse.h`
- Derived CRC/opcode hint: `0xade558c4`
- Serialized length model: minimum `58` bytes + variable payload
- Fields (order):
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_planet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_worldX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_worldZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_pvp`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_buildable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_spawnable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_mission`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_municipal`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_geographical`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_minDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_maxDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_radius`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_ur_worldX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_ur_worldZ`: `float` via `AutoVariable` -> `number` (addVariable)

### MessageRegionListRequest
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/MessageRegionListRequest.h`
- Derived CRC/opcode hint: `0x821a4c5d`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### MessageRegionListResponse
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/MessageRegionListResponse.h`
- Derived CRC/opcode hint: `0x4836e9b3`
- Serialized length model: minimum `56` bytes + variable payload
- Fields (order):
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_label`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_gameServerId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_worldX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_worldZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_pvp`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_buildable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_spawnable`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_mission`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_municipal`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_geographical`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_minDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_maxDifficulty`: `int` via `AutoVariable` -> `number` (addVariable)

### MessageToAckMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/MessageToAckMessage.h`
- Derived CRC/opcode hint: `0xc695d40c`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_messageId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### MessageToMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/MessageToMessage.h`
- Derived CRC/opcode hint: `0xd9cd0336`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_data`: `MessageToPayload` via `AutoVariable` -> `Uint8Array` (addVariable)
  - `m_sourceServerPid`: `uint32` via `AutoVariable` -> `number` (addVariable)

### MetricsDataMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/metricsMessages/MetricsDataMessage.h`
- Derived CRC/opcode hint: `0x1d4c62a0`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_data`: `MetricsPair` via `AutoArray` -> `unknown[]` (addVariable)

### MetricsInitiationMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/metricsMessages/MetricsInitiationMessage.h`
- Derived CRC/opcode hint: `0x2d36a6c6`
- Serialized length model: minimum `9` bytes + variable payload
- Fields (order):
  - `m_isDynamic`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_primaryName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_secondaryName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_index`: `int` via `AutoVariable` -> `number` (addVariable)

### NewbieTutorialEnableHudElement
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/NewbieTutorialEnableHudElement.h`
- Derived CRC/opcode hint: `0xca375124`
- Serialized length model: minimum `7` bytes + variable payload
- Fields (order):
  - `m_name`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_enable`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_blinkTime`: `float` via `AutoVariable` -> `number` (addVariable)

### NewbieTutorialEnableInterfaceElement
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/NewbieTutorialEnableInterfaceElement.h`
- Derived CRC/opcode hint: `0x33d2981a`
- Serialized length model: minimum `3` bytes + variable payload
- Fields (order):
  - `m_name`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_enable`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### NewbieTutorialHighlightUIElement
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/NewbieTutorialHighlightUIElement.h`
- Derived CRC/opcode hint: `0x98519af4`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_time`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_widgetPath`: `std::string` via `AutoVariable` -> `string` (addVariable)

### NewbieTutorialRequest
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/NewbieTutorialRequest.h`
- Derived CRC/opcode hint: `0x90dd61af`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_request`: `std::string` via `AutoVariable` -> `string` (addVariable)

### NewbieTutorialResponse
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/NewbieTutorialResponse.h`
- Derived CRC/opcode hint: `0xca88fbad`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_response`: `std::string` via `AutoVariable` -> `string` (addVariable)

### NewbieTutorialSetToolbarElement
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/NewbieTutorialSetToolbarElement.h`
- Derived CRC/opcode hint: `0x9f432719`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_slot`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_commandName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_object`: `int64` via `AutoVariable` -> `bigint` (addVariable)

### NewCentralConnectionServer
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/CentralConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x0194bb7d`
- Serialized length model: minimum `24` bytes + variable payload
- Fields (order):
  - `chatServicePort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `customerServicePort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `clientServicePortPrivate`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `clientServicePortPublic`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `gameServicePort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `m_pingPort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `m_connectionServerNumber`: `int` via `AutoVariable` -> `number` (addVariable)
  - `serviceAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `clientServiceAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `chatServiceAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `customerServiceAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)

### NewClient
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameConnectionServer/NewClient.h`
- Derived CRC/opcode hint: `0x0c4eb3a9`
- Serialized length model: minimum `61` bytes + variable payload
- Fields (order):
  - `m_account`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_ipAddr`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_oid`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_secure`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_skipLoadScreen`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_observedObjects`: `NetworkId` via `AutoArray` -> `bigint[]` (addVariable)
  - `m_gameFeatures`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_subscriptionFeatures`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_entitlementTotalTime`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_entitlementEntitledTime`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_entitlementTotalTimeSinceLastLogin`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_entitlementEntitledTimeSinceLastLogin`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_buddyPoints`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_consumedRewardEvents`: `std::pair<NetworkId, std::string>` via `AutoArray` -> `bigint[]` (addVariable)
  - `m_claimedRewardItems`: `std::pair<NetworkId, std::string>` via `AutoArray` -> `bigint[]` (addVariable)
  - `m_usingAdminLogin`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_canSkipTutorial`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_sendToStarport`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### NewGameServer
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameConnectionServer/GameConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x8b46825c`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_sceneName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_serverId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### NewTicketActivityMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/NewTicketActivityMessage.h`
- Derived CRC/opcode hint: `0x274f4e78`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### NewTicketActivityResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/NewTicketActivityResponseMessage.h`
- Derived CRC/opcode hint: `0x6ea42d80`
- Serialized length model: exact `5` bytes
- Fields (order):
  - `m_newActivity`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_ticketCount`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### ObjControllerMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ObjectChannelMessages.h`
- Derived CRC/opcode hint: `0x80ce5e46`
- Serialized length model: exact `20` bytes
- Fields (order):
  - `flags`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `message`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `value`: `real` via `AutoVariable` -> `number` (addVariable)

### ObjectMenuSelectMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ObjectMenuSelectMessage.h`
- Derived CRC/opcode hint: `0x93539cf7`
- Serialized length model: exact `10` bytes
- Fields (order):
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_selectedItemId`: `uint16` via `AutoVariable` -> `number` (addVariable)

### OnAcceptHighBidMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnAcceptHighBidMessage.h`
- Derived CRC/opcode hint: `0xa3bb5afb`
- Serialized length model: exact `28` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)

### OnAddAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnAddAuctionMessage.h`
- Derived CRC/opcode hint: `0x5084b943`
- Serialized length model: minimum `40` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_ownerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)

### OnAddBidMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnAddBidMessage.h`
- Derived CRC/opcode hint: `0x53581b50`
- Serialized length model: minimum `78` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_bidderId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_previousBidderId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_bidAmount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_previousBidAmount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_maxProxyBid`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemNameLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_salesTaxAmount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_salesTaxBankId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### OnAuctionExpiredMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnAuctionExpiredMessage.h`
- Derived CRC/opcode hint: `0x5299f57c`
- Serialized length model: minimum `53` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_sold`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_buyerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_bidAmount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_maxProxyBid`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_immediate`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_itemNameLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_sendSellerMail`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### OnCancelAuctionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnCancelAuctionMessage.h`
- Derived CRC/opcode hint: `0x76fae6eb`
- Serialized length model: minimum `42` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_highBidderId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_highBidAmount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)

### OnCleanupInvalidItemRetrievalMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnCleanupInvalidItemRetrievalMessage.h`
- Derived CRC/opcode hint: `0x0c918398`
- Serialized length model: exact `36` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_creatorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_reimburseAmt`: `int` via `AutoVariable` -> `number` (addVariable)

### OnCreateVendorMarketMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnCreateVendorMarketMessage.h`
- Derived CRC/opcode hint: `0x38d41f76`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)

### OnGetItemDetailsMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnGetItemDetailsMessage.h`
- Derived CRC/opcode hint: `0xd8ecf973`
- Serialized length model: minimum `48` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_userDescriptionLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_userDescription`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_oobLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_oobData`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_attributes`: `std::pair<std::string, Unicode::String>` via `AutoArray` -> `[string, string][]` (addVariable)
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)

### OnGetItemMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnGetItemMessage.h`
- Derived CRC/opcode hint: `0x5f5477ba`
- Serialized length model: minimum `30` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)

### OnGetPlayerVendorCountMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnGetPlayerVendorCountMessage.h`
- Derived CRC/opcode hint: `0xf142e230`
- Serialized length model: minimum `24` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_vendorCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorList`: `std::vector<NetworkId>` via `AutoVariable` -> `bigint` (addVariable)

### OnGetVendorOwnerMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnGetVendorOwnerMessage.h`
- Derived CRC/opcode hint: `0x90e6cd14`
- Serialized length model: minimum `30` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_requesterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)

### OnGetVendorValueMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnGetVendorValueMessage.h`
- Derived CRC/opcode hint: `0x5ffe04bb`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_value`: `int` via `AutoVariable` -> `number` (addVariable)

### OnItemExpiredMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnItemExpiredMessage.h`
- Derived CRC/opcode hint: `0xc9bb63b5`
- Serialized length model: minimum `42` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemNameLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_locationName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_locationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### OnPermanentAuctionPurchasedMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnPermanentAuctionPurchasedMessage.h`
- Derived CRC/opcode hint: `0xa5610dc1`
- Serialized length model: minimum `50` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_buyerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_price`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_itemNameLength`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_attributes`: `std::pair<std::string, Unicode::String>` via `AutoArray` -> `[string, string][]` (addVariable)

### OnQueryAuctionHeadersMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnQueryAuctionHeadersMessage.h`
- Derived CRC/opcode hint: `0x3a3f0de2`
- Serialized length model: minimum `37` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_queryType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_numAuctions`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_auctionData`: `ADV` via `AutoVariable` -> `{ type: number; auctionId: bigint; itemId: bigint; itemNameLength: number; itemName: string; minBid: number; highBid: number; timer: number; buyNowPrice: number; location: string; ownerId: bigint; highBidderId: bigint; maxProxyBid: number; myBid: number; itemType: number; resourceContainerClassCrc: number; flags: number; entranceCharge: number }[]` (addVariable)
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_queryOffset`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_hasMorePages`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### OnQueryVendorItemCountReplyMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnQueryVendorItemCountReplyMessage.h`
- Derived CRC/opcode hint: `0x457382d4`
- Serialized length model: exact `17` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_vendorItemCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_searchEnabled`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### OnUpdateVendorSearchOptionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnUpdateVendorSearchOptionMessage.h`
- Derived CRC/opcode hint: `0xd7d0ec98`
- Serialized length model: exact `9` bytes
- Fields (order):
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_enabled`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### OnVendorRefuseItemMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/OnVendorRefuseItemMessage.h`
- Derived CRC/opcode hint: `0xbe5b6131`
- Serialized length model: exact `36` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_vendorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemOwnerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_resultCode`: `int` via `AutoVariable` -> `number` (addVariable)

### OpenHolocronToPageMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/OpenHolocronToPageMessage.h`
- Derived CRC/opcode hint: `0x7cb65021`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_page`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ParametersMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ParametersMessage.h`
- Derived CRC/opcode hint: `0x487652da`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_weatherUpdateInterval`: `int` via `AutoVariable` -> `number` (addVariable)

### PermissionListCreateMessage
- Status: ✅ Implemented
- C++ headers: `game/shared/library/swgSharedNetworkMessages/src/shared/permissionList/PermissionListCreateMessage.h`
- Derived CRC/opcode hint: `0x52f364b8`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_currentMembers`: `Unicode::String` via `AutoArray` -> `string[]` (addVariable)
  - `m_nearbyPeople`: `Unicode::String` via `AutoArray` -> `string[]` (addVariable)
  - `m_listName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### PermissionListModifyMessage
- Status: ✅ Implemented
- C++ headers: `game/shared/library/swgSharedNetworkMessages/src/shared/permissionList/PermissionListModifyMessage.h`
- Derived CRC/opcode hint: `0x2e83b86d`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_person`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_listName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_action`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### PersistedPlayerMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/PersistedPlayerMessage.h`
- Derived CRC/opcode hint: `0x6c8820b1`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### PlanetLoadCharacterMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gamePlanetServer/PlanetLoadCharacterMessage.h`
- Derived CRC/opcode hint: `0x49ac6028`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_gameServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### PlanetNodeStatusMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/planetWatch/PlanetNodeStatusMessage.h`
- Derived CRC/opcode hint: `0x5e2e0cd6`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_data`: `PlanetNodeStatusMessageData` via `AutoArray` -> `unknown[]` (addVariable)

### PlanetObjectIdMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/PlanetObjectIdMessage.h`
- Derived CRC/opcode hint: `0xa7f3a82f`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_sceneId`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_planetObject`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### PlanetObjectStatusMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/planetWatch/PlanetObjectStatusMessage.h`
- Derived CRC/opcode hint: `0x62689eb0`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_data`: `PlanetObjectStatusMessageData` via `AutoArray` -> `unknown[]` (addVariable)

### PlanetRemoveObject
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gamePlanetServer/PlanetRemoveObject.h`
- Derived CRC/opcode hint: `0xcd248a61`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### PlanetTravelPointListRequest
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/PlanetTravelPointListRequest.h`
- Derived CRC/opcode hint: `0x96405d4d`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_planetName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sequenceId`: `int` via `AutoVariable` -> `number` (addVariable)

### PlanetTravelPointListResponse
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/PlanetTravelPointListResponse.h`
- Derived CRC/opcode hint: `0x4d32541f`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `m_planetName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_travelPointNameList`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `m_travelPointPointList`: `Vector` via `AutoArray` -> `{ x: number; y: number; z: number }[]` (addVariable)
  - `m_travelPointCostList`: `int` via `AutoArray` -> `number[]` (addVariable)
  - `m_travelPointInterplanetaryList`: `bool` via `AutoArray` -> `boolean[]` (addVariable)
  - `m_sequenceId`: `int` via `AutoVariable` -> `number` (addVariable)

### PlayClientEffectLocMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0x02949e74`
- Serialized length model: minimum `30` bytes + variable payload
- Fields (order):
  - `m_effectName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_planet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_locationX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_locationY`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_locationZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_cell`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_terrainDelta`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_label`: `std::string` via `AutoVariable` -> `string` (addVariable)

### PlayClientEffectObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0x8855434a`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_effectName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_hardpoint`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_label`: `std::string` via `AutoVariable` -> `string` (addVariable)

### PlayClientEffectObjectTransformMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0x4f5e09b6`
- Serialized length model: minimum `40` bytes + variable payload
- Fields (order):
  - `m_effectName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_transform`: `Transform` via `AutoVariable` -> `{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_label`: `std::string` via `AutoVariable` -> `string` (addVariable)

### PlayClientEventLocMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0x0a4e222c`
- Serialized length model: minimum `30` bytes + variable payload
- Fields (order):
  - `m_eventSourceName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_eventDestName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_planet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_locationX`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_locationY`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_locationZ`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_cell`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_terrainDelta`: `float` via `AutoVariable` -> `number` (addVariable)

### PlayClientEventObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0xaf83c3f2`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_eventName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_hardpoint`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### PlayClientEventObjectTransformMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0x90302f79`
- Serialized length model: minimum `38` bytes + variable payload
- Fields (order):
  - `m_eventName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_transform`: `Transform` via `AutoVariable` -> `{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### PlayCutSceneMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/PlayCutSceneMessage.h`
- Derived CRC/opcode hint: `0xf34397f6`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_cutSceneName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### PlayedTimeAccumMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/PlayedTimeAccumMessage.h`
- Derived CRC/opcode hint: `0xb68dd9bb`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playedTimeAccum`: `float` via `AutoVariable` -> `number` (addVariable)

### PlayerMoneyRequest
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/PlayerMoneyRequest.h`
- Derived CRC/opcode hint: `0x9d105aa1`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### PlayerMoneyResponse
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/PlayerMoneyResponse.h`
- Derived CRC/opcode hint: `0x367e737e`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_balanceCash`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_balanceBank`: `int` via `AutoVariable` -> `number` (addVariable)

### PlayMusicMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/PlayMusicMessage.h`
- Derived CRC/opcode hint: `0x04270d8a`
- Serialized length model: minimum `15` bytes + variable payload
- Fields (order):
  - `m_musicName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceObjId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playType`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_loop`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### PopulateMissionBrowserMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/PopulateMissionBrowserMessage.h`
- Derived CRC/opcode hint: `0x88d9885c`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_missions`: `NetworkId` via `AutoArray` -> `bigint[]` (addVariable)

### PopulationListMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/PopulationListMessage.h`
- Derived CRC/opcode hint: `0x2286ec30`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_list`: `PopulationList` via `AutoVariable` -> `{ scene: string; x: number; z: number; population: number }[]` (addVariable)

### PreloadFinishedMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/PreloadFinishedMessage.h`
- Derived CRC/opcode hint: `0x58351f00`
- Serialized length model: exact `1` byte
- Fields (order):
  - `m_finished`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### PreloadRequestCompleteMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/PreloadRequestCompleteMessage.h`
- Derived CRC/opcode hint: `0xe7001b62`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_gameServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_preloadAreaId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ProfilerOperationMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/ProfilerOperationMessage.h`
- Derived CRC/opcode hint: `0xdf0837f4`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_processId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_operation`: `std::string` via `AutoVariable` -> `string` (addVariable)

### QueryAuctionHeadersMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/QueryAuctionHeadersMessage.h`
- Derived CRC/opcode hint: `0x04fe82b0`
- Serialized length model: minimum `77` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_vendorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_queryType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_itemTypeExactMatch`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_itemTemplateId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_textFilterAll`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_textFilterAny`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_priceFilterMin`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_priceFilterMax`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_priceFilterIncludesFee`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_advancedSearch`: `AuctionQueryHeadersMessage::SearchCondition` via `AutoList` -> `unknown[]` (addVariable)
  - `m_advancedSearchMatchAllAny`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_searchStringPlanet`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_searchStringRegion`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_searchAuctionLocationId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_searchMyVendorsOnly`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_overrideVendorSearchFlag`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_queryOffset`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### QueryVendorItemCountMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/QueryVendorItemCountMessage.h`
- Derived CRC/opcode hint: `0x6eac2a3e`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### RandomNameRequest
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/RandomName.h`
- Derived CRC/opcode hint: `0x73c472da`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_creatureTemplate`: `std::string` via `AutoVariable` -> `string` (addVariable)

### RandomNameResponse
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/RandomName.h`
- Derived CRC/opcode hint: `0x1b718e0d`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_creatureTemplate`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_errorMessage`: `StringId` via `AutoVariable` -> `{ table: string; textIndex: number; text: string }` (addVariable)

### RefreshCharacterList
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0xb6f405c7`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### ReleaseAuthoritativeMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/ReleaseAuthoritativeMessage.h`
- Derived CRC/opcode hint: `0x446fc7a7`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ReleaseNameMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x0b395e83`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### ReloadAdminTableMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/ReloadAdminTableMessage.h`
- Derived CRC/opcode hint: `0x3c50149a`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### ReloadCommandTableMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/ReloadCommandTableMessage.h`
- Derived CRC/opcode hint: `0x813441ea`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### ReloadDatatableMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/ReloadDatatableMessage.h`
- Derived CRC/opcode hint: `0x9ae44f4b`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_table`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ReloadScriptMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/ReloadScriptMessage.h`
- Derived CRC/opcode hint: `0xb01e6f79`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_script`: `std::string` via `AutoVariable` -> `string` (addVariable)

### ReloadTemplateMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/ReloadTemplateMessage.h`
- Derived CRC/opcode hint: `0xe8954d93`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_template`: `std::string` via `AutoVariable` -> `string` (addVariable)

### RemoveItemMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0x4417af8b`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_object`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### RenameCharacterMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/RenameCharacterMessage.h`
- Derived CRC/opcode hint: `0x21d03ecf`
- Serialized length model: minimum `24` bytes + variable payload
- Fields (order):
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_newName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_newNormalizedName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_requestedBy`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### RenameCharacterMessageEx
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/RenameCharacterMessage.h`
- Derived CRC/opcode hint: `0x32615bf7`
- Serialized length model: minimum `30` bytes + variable payload
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_newName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_oldName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_requestedBy`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_renameCharacterMessageSource`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_lastNameChangeOnly`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### RequestBiographyMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/RequestBiographyMessage.h`
- Derived CRC/opcode hint: `0x275ce034`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_owner`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### RequestCategoriesMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/RequestCategoriesMessage.h`
- Derived CRC/opcode hint: `0xf898e25f`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_language`: `std::string` via `AutoVariable` -> `string` (addVariable)

### RequestCategoriesResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/RequestCategoriesResponseMessage.h`
- Derived CRC/opcode hint: `0x61148fd4`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_result`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `m_categories`: `CustomerServiceCategory` via `AutoArray` -> `unknown[]` (addVariable)

### RequestChunkMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/RequestChunkMessage.h`
- Derived CRC/opcode hint: `0xd17e56e2`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_chunks`: `Chunk` via `AutoArray` -> `unknown[]` (addVariable)
  - `m_sceneId`: `std::string` via `AutoVariable` -> `string` (addVariable)

### RequestGalaxyLoopTimes
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/RequestGalaxyLoopTimes.h`
- Derived CRC/opcode hint: `0x7d842d68`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### RequestGameServerForLoginMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralPlanetServer/RequestGameServerForLoginMessage.h`
- Derived CRC/opcode hint: `0x539f07e8`
- Serialized length model: minimum `35` bytes + variable payload
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_scene`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_coordinates`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_forCtsSourceCharacter`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### RequestObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/RequestObjectMessage.h`
- Derived CRC/opcode hint: `0xe8a27aa1`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)

### RequestOIDsMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/RequestObjectIdsMessage.h`
- Derived CRC/opcode hint: `0x1f5d9e6d`
- Serialized length model: exact `9` bytes
- Fields (order):
  - `m_serverId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_howMany`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_logRequest`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### RequestPlanetObjectIdMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/RequestPlanetObjectIdMessage.h`
- Derived CRC/opcode hint: `0x16661790`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_sceneId`: `std::string` via `AutoVariable` -> `string` (addVariable)

### RequestSceneTransfer
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/SceneTransferMessages.h`
- Derived CRC/opcode hint: `0xf609e9a3`
- Serialized length model: minimum `50` bytes + variable payload
- Fields (order):
  - `m_oid`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_sceneName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceGameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_position_p`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_position_w`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_containerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_scriptCallback`: `std::string` via `AutoVariable` -> `string` (addVariable)

### RequestUnloadObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/RequestUnloadObjectMessage.h`
- Derived CRC/opcode hint: `0x59189a1f`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)

### RequestUnstick
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AIDebuggingMessages.h`
- Derived CRC/opcode hint: `0x54ac0603`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_client`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### RequestWatchObjectPath
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AIDebuggingMessages.h`
- Derived CRC/opcode hint: `0xd0cdaa62`
- CRC source wire name: `DebugTransformMessage`
- Serialized length model: exact `17` bytes
- Fields (order):
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_client`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_enable`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### RequestWatchPathMap
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/AIDebuggingMessages.h`
- Derived CRC/opcode hint: `0xd8cfe8a8`
- Serialized length model: exact `9` bytes
- Fields (order):
  - `m_client`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_enable`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ResourceHarvesterActivatePageMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ResourceHarvesterActivatePageMessage.h`
- Derived CRC/opcode hint: `0xde9821e6`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_harvesterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### ResourceListForSurveyMessage
- Status: ✅ Implemented
- C++ headers: `game/shared/library/swgSharedNetworkMessages/src/shared/survey/ResourceListForSurveyMessage.h`
- Derived CRC/opcode hint: `0x8a64b1d5`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_data`: `DataItem` via `AutoArray` -> `unknown[]` (addVariable)
  - `m_surveyType`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_surveyToolId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### RestartServerMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/RestartServerMessage.h`
- Derived CRC/opcode hint: `0xec40bb5c`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_scene`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_x`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_z`: `int` via `AutoVariable` -> `number` (addVariable)

### RetrieveAuctionItemMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/RetrieveAuctionItemMessage.h`
- Derived CRC/opcode hint: `0x12b0d449`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### RetrieveAuctionItemResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/RetrieveAuctionItemResponseMessage.h`
- Derived CRC/opcode hint: `0x9499ef8c`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_result`: `int` via `AutoVariable` -> `number` (addVariable)

### RetrievedItemLoadMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/RetrievedItemLoadMessage.h`
- Derived CRC/opcode hint: `0x28410810`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_ownerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_itemId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### RevokeCommand
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/RevokeCommand.h`
- Derived CRC/opcode hint: `0x22c9a55e`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `commandName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### RevokeSkill
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/RevokeSkill.h`
- Derived CRC/opcode hint: `0xeffbee72`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `skillName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### SceneCreateObjectByCrc
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SceneChannelMessages.h`
- Derived CRC/opcode hint: `0xfe89ddea`
- Serialized length model: exact `41` bytes
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_transform`: `Transform` via `AutoVariable` -> `{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_templateCrc`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_hyperspace`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### SceneCreateObjectByName
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SceneChannelMessages.h`
- Derived CRC/opcode hint: `0x1f73d501`
- Serialized length model: minimum `39` bytes + variable payload
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_transform`: `Transform` via `AutoVariable` -> `{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_templateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_hyperspace`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### SceneDestroyObject
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SceneChannelMessages.h`
- Derived CRC/opcode hint: `0x4d45d504`
- Serialized length model: exact `9` bytes
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_hyperspace`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### SceneEndBaselines
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SceneChannelMessages.h`
- Derived CRC/opcode hint: `0x2c436037`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### SceneTransferMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/SceneTransferMessages.h`
- Derived CRC/opcode hint: `0xf68d0454`
- Serialized length model: minimum `54` bytes + variable payload
- Fields (order):
  - `m_oid`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_sceneName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceGameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_position_p`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_position_w`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_containerName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_scriptCallback`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_destinationGameServer`: `uint32` via `AutoVariable` -> `number` (addVariable)

### SearchKnowledgeBaseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/SearchKnowledgeBaseMessage.h`
- Derived CRC/opcode hint: `0x962e8b9b`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_searchString`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_language`: `std::string` via `AutoVariable` -> `string` (addVariable)

### SearchKnowledgeBaseResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/SearchKnowledgeBaseResponseMessage.h`
- Derived CRC/opcode hint: `0x7cbc8f67`
- Serialized length model: minimum `8` bytes + variable payload
- Fields (order):
  - `m_result`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `m_searchResults`: `CustomerServiceSearchResult` via `AutoArray` -> `unknown[]` (addVariable)

### SelectCharacter
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientCentralMessages.h`
- Derived CRC/opcode hint: `0xb5098d76`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### ServerDeleteCharacterMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/ServerDeleteCharacterMessage.h`
- Derived CRC/opcode hint: `0x3c2b2151`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_loginServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ServerIdleMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameTaskManager/GameTaskManagerMessages.h`
- Derived CRC/opcode hint: `0x2394ec69`
- Serialized length model: exact `1` byte
- Fields (order):
  - `m_isIdle`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ServerTimeMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ServerTimeMessage.h`
- Derived CRC/opcode hint: `0x2ebc3bd9`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `timeSeconds`: `int64` via `AutoVariable` -> `bigint` (addVariable)

### ServerWeatherMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ServerWeatherMessage.h`
- Derived CRC/opcode hint: `0x486356ea`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_index`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_windVelocity_w`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)

### SetAuthoritativeMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/SetAuthoritativeMessage.h`
- Derived CRC/opcode hint: `0xf35341dd`
- Serialized length model: exact `51` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_sceneChange`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_handlingCrash`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_goalCell`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_goalTransform`: `Transform` via `AutoVariable` -> `{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_goalIsValid`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### SetConnectionServerPublic
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/SetConnectionServerPublic.h`
- Derived CRC/opcode hint: `0x134c6ea0`
- Serialized length model: exact `1` byte
- Fields (order):
  - `m_isPublic`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### SetEntranceChargeMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/SetEntranceChargeMessage.h`
- Derived CRC/opcode hint: `0x2970990c`
- Serialized length model: exact `20` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_entranceCharge`: `int` via `AutoVariable` -> `number` (addVariable)

### SetGameTimeMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/SetGameTimeMessage.h`
- Derived CRC/opcode hint: `0x7feb61fd`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_gameTime`: `int` via `AutoVariable` -> `number` (addVariable)

### SetObjectPositionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/SetObjectPositionMessage.h`
- Derived CRC/opcode hint: `0xf6dc76b0`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_added`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_authoritative`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_scene`: `std::string` via `AutoVariable` -> `string` (addVariable)

### SetPlanetServerMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/SetPlanetServerMessage.h`
- Derived CRC/opcode hint: `0xce0f25c5`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_address`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_port`: `uint16` via `AutoVariable` -> `number` (addVariable)

### SetSalesTaxMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/SetSalesTaxMessage.h`
- Derived CRC/opcode hint: `0x456d250e`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_salesTax`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_bankId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)

### SetTransformMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/common/SetTransformMessage.h`
- Derived CRC/opcode hint: `0x808914ec`
- Serialized length model: exact `44` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_transform`: `Transform` via `AutoVariable` -> `{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_cellId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### SetUniverseAuthoritativeMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/SetUniverseAuthoritativeMessage.h`
- Derived CRC/opcode hint: `0x634b6158`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_process`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ShipUpdateTransformCollisionMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ShipUpdateTransformCollisionMessage.h`
- Derived CRC/opcode hint: `0x763648d0`
- Serialized length model: exact `52` bytes
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_transform`: `Transform` via `AutoVariable` -> `{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_velocity`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_syncStampLong`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ShipUpdateTransformMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ShipUpdateTransformMessage.h`
- Derived CRC/opcode hint: `0x76026fb9`
- Serialized length model: exact `23` bytes
- Fields (order):
  - `m_shipId`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `m_transform`: `PackedTransform` via `AutoVariable` -> `{ rotation: { w: number; x: number; y: number; z: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_velocity`: `PackedVelocity` via `AutoVariable` -> `{ vx: number; vy: number; vz: number }` (addVariable)
  - `m_yawRate`: `PackedRotationRate` via `AutoVariable` -> `number` (addVariable)
  - `m_pitchRate`: `PackedRotationRate` via `AutoVariable` -> `number` (addVariable)
  - `m_rollRate`: `PackedRotationRate` via `AutoVariable` -> `number` (addVariable)
  - `m_syncStampLong`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ShutdownCluster
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0xfdba3a4b`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_timeToShutdown`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_maxTime`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_systemMessage`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### SlowDownEffectMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SlowDownEffectMessage.h`
- Derived CRC/opcode hint: `0x29b9a8d4`
- Serialized length model: exact `32` bytes
- Fields (order):
  - `m_source`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_coneLength`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_coneAngle`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_slopeAngle`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_expireTime`: `unsigned long` via `AutoVariable` -> `number` (addVariable)

### SpawnGameServer
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralTaskManager/CentralTaskMessages.h`
- Derived CRC/opcode hint: `0x7f6649a2`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `clusterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `volumeName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### SPCharacterProfileMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameStationPlayersCollector/SPCharacterProfileMessage.h`
- Derived CRC/opcode hint: `0x7a3e1b23`
- Serialized length model: minimum `62` bytes + variable payload
- Fields (order):
  - `m_clusterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_characterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_objectName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_x`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_y`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_z`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_sceneId`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_cash_balance`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_bank_balance`: `float` via `AutoVariable` -> `number` (addVariable)
  - `m_objectTemplateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_stationId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_containedby`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_createTime`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_playedTime`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_numLots`: `int` via `AutoVariable` -> `number` (addVariable)

### StatMigrationTargetsMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/StatMigrationTargetsMessage.h`
- Derived CRC/opcode hint: `0xefac38c4`
- Serialized length model: exact `28` bytes
- Fields (order):
  - `m_health`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_constitution`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_action`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_stamina`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_mind`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_willpower`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_pointsLeft`: `int` via `AutoVariable` -> `number` (addVariable)

### StomachRequestMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/StomachRequestMessage.h`
- Derived CRC/opcode hint: `0xb75dd5d7`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### StopClientEffectObjectByLabelMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ClientEffectMessages.h`
- Derived CRC/opcode hint: `0xad6f6b26`
- Serialized length model: minimum `11` bytes + variable payload
- Fields (order):
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_label`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_softTerminate`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### StructureListMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/StructureListMessage.h`
- Derived CRC/opcode hint: `0xc16c1699`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `m_data`: `StructureListMessageData` via `AutoArray` -> `unknown[]` (addVariable)
  - `m_toolId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_loginServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### StructuresForPurgeMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/StructuresForPurgeMessage.h`
- Derived CRC/opcode hint: `0x9e837e1a`
- Serialized length model: minimum `13` bytes + variable payload
- Fields (order):
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_structures`: `std::pair<NetworkId, NetworkId>` via `AutoArray` -> `bigint[]` (addVariable)
  - `m_vendors`: `std::pair<NetworkId, std::pair<NetworkId, Unicode::String> >` via `AutoArray` -> `bigint[]` (addVariable)
  - `m_warnOnly`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### SuiCreatePageMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SuiCreatePageMessage.h`
- Derived CRC/opcode hint: `0xd44b7259`
- Serialized length model: minimum `34` bytes + variable payload
- Fields (order):
  - `m_pageData`: `SuiPageData` via `AutoDeltaVariable` -> `SuiPageData` (addVariable)

### SuiEventNotification
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SuiEventNotification.h`
- Derived CRC/opcode hint: `0x092d3564`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_pageId`: `int` via `AutoDeltaVariable` -> `number` (addVariable)
  - `m_subscribedEventIndex`: `int` via `AutoDeltaVariable` -> `number` (addVariable)
  - `m_subscribedProperties`: `Unicode::String` via `AutoDeltaVector` -> `string[]` (addVariable)

### SUIMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/ServerUserInterfaceMessages.h`
- Derived CRC/opcode hint: `0x09d8905f`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_clientPageId`: `int` via `AutoVariable` -> `number` (addVariable)

### SuiUpdatePageMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SuiUpdatePageMessage.h`
- Derived CRC/opcode hint: `0x5f3342f6`
- Serialized length model: minimum `34` bytes + variable payload
- Fields (order):
  - `m_pageData`: `SuiPageData` via `AutoDeltaVariable` -> `SuiPageData` (addVariable)

### SurveyMessage
- Status: ✅ Implemented
- C++ headers: `game/shared/library/swgSharedNetworkMessages/src/shared/survey/SurveyMessage.h`
- Derived CRC/opcode hint: `0x877f79ac`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_data`: `DataItem` via `AutoArray` -> `unknown[]` (addVariable)

### SynchronizeScriptVarDeltasMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/SynchronizeScriptVarDeltasMessage.h`
- Derived CRC/opcode hint: `0x9ca86247`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_data`: `std::vector<int8>` via `AutoVariable` -> `number[]` (addVariable)

### SynchronizeScriptVarsMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/SynchronizeScriptVarsMessage.h`
- Derived CRC/opcode hint: `0x1d28083d`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_data`: `std::vector<int8>` via `AutoVariable` -> `number[]` (addVariable)

### SystemAssignedProcessId
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverUtility/src/shared/SystemAssignedProcessId.h`
- Derived CRC/opcode hint: `0x58c07f21`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_id`: `unsigned long` via `AutoVariable` -> `number` (addVariable)

### TaskConnectionIdMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/TaskConnectionIdMessage.h`
- Derived CRC/opcode hint: `0xa80b40ac`
- Serialized length model: minimum `9` bytes + variable payload
- Fields (order):
  - `serverType`: `unsigned char` via `AutoVariable` -> `number` (addVariable)
  - `commandLine`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `clusterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `currentEpochTime`: `long` via `AutoVariable` -> `number` (addVariable)

### TaskConsoleCommand
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/core/TaskConsoleCommand.h`
- Derived CRC/opcode hint: `0x1ca9759e`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_command`: `std::string` via `AutoVariable` -> `string` (addVariable)

### TaskEnumCluster
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/TaskEnumCluster.h`
- Derived CRC/opcode hint: `0x8f4efa4f`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `clusterNames`: `std::string` via `AutoArray` -> `string[]` (addVariable)

### TaskEnumProcesses
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/TaskEnumProcesses.h`
- Derived CRC/opcode hint: `0xc6a76016`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `hostAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `commandLines`: `std::string` via `AutoArray` -> `string[]` (addVariable)
  - `loadedOnStartup`: `bool` via `AutoArray` -> `boolean[]` (addVariable)
  - `pids`: `uint32` via `AutoArray` -> `number[]` (addVariable)

### TaskKillProcess
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/TaskKillProcess.h`
- Derived CRC/opcode hint: `0xb949e0c6`
- Serialized length model: minimum `7` bytes + variable payload
- Fields (order):
  - `m_hostName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_pid`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_forceCore`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### TaskProcessDiedMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralTaskManager/TaskProcessDiedMessage.h`
- Derived CRC/opcode hint: `0xdb3525b4`
- Serialized length model: minimum `6` bytes + variable payload
- Fields (order):
  - `m_processId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_processName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### TaskShutdownGameServer
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameTaskManager/GameTaskManagerMessages.h`
- Derived CRC/opcode hint: `0xd1926a07`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### TaskSpawnProcess
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/TaskSpawnProcess.h`
- Derived CRC/opcode hint: `0x5759d090`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `options`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `processName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `targetHostAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `transactionId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `spawnDelay`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### TaskSpawnProcessAck
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/TaskSpawnProcessAck.h`
- Derived CRC/opcode hint: `0x4dff97ea`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_transactionId`: `int` via `AutoVariable` -> `number` (addVariable)

### TaskUtilization
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/TaskUtilization.h`
- Derived CRC/opcode hint: `0x28b95196`
- Serialized length model: exact `5` bytes
- Fields (order):
  - `utilType`: `unsigned char` via `AutoVariable` -> `number` (addVariable)
  - `utilAmount`: `float` via `AutoVariable` -> `number` (addVariable)

### TeleportMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/TeleportMessage.h`
- Derived CRC/opcode hint: `0x0d694486`
- Serialized length model: minimum `42` bytes + variable payload
- Fields (order):
  - `m_actorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_sceneId`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_position_w`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_position_p`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)

### TeleportToMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/TeleportToMessage.h`
- Derived CRC/opcode hint: `0x49f2b5aa`
- Serialized length model: exact `20` bytes
- Fields (order):
  - `m_actorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_targetId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_processId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ToggleAvatarLoginStatus
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/ToggleAvatarLoginStatus.h`
- Derived CRC/opcode hint: `0x8b164ae1`
- Serialized length model: minimum `15` bytes + variable payload
- Fields (order):
  - `m_clusterName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_enabled`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### TradeCompleteMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0xc542038b`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### TransferControlMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameConnectionServer/GameConnectionServerMessages.h`
- Derived CRC/opcode hint: `0x919a236d`
- Serialized length model: minimum `17` bytes + variable payload
- Fields (order):
  - `m_oid`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_gameServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_skipLoadScreen`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_observedObjects`: `NetworkId` via `AutoArray` -> `bigint[]` (addVariable)

### TransferReplyCharacterList
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/transferServer/TransferReplyCharacterList.h`
- Derived CRC/opcode hint: `0x16ca2acd`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_avatarList`: `AvatarList` via `AutoVariable` -> `{ m_name: string; m_objectTemplateId: number; m_networkId: bigint; m_clusterId: number; m_characterType: number }[]` (addVariable)
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_track`: `unsigned int` via `AutoVariable` -> `number` (addVariable)

### TransferReplyMoveValidation
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/transferServer/TransferReplyMoveValidation.h`
- Derived CRC/opcode hint: `0x1f977c9d`
- Serialized length model: minimum `36` bytes + variable payload
- Fields (order):
  - `m_customerLocalizedLanguage`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_destinationCharacter`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_destinationGalaxy`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_destinationStationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_sourceCharacter`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceCharacterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_sourceCharacterTemplateId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_sourceGalaxy`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceStationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_track`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_result`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_transferRequestSource`: `int8` via `AutoVariable` -> `number` (addVariable)

### TransferRequestMoveValidation
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/transferServer/TransferRequestMoveValidation.h`
- Derived CRC/opcode hint: `0x9ece4f53`
- Serialized length model: minimum `35` bytes + variable payload
- Fields (order):
  - `m_customerLocalizedLanguage`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_destinationCharacter`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_destinationGalaxy`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_destinationStationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_sourceCharacter`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceCharacterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_sourceCharacterTemplateId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_sourceGalaxy`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceStationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_track`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_transferRequestSource`: `int8` via `AutoVariable` -> `number` (addVariable)

### UnAcceptTransactionMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0xe81e4382`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### UnloadedPlayerMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/UnloadedPlayerMessage.h`
- Derived CRC/opcode hint: `0x58cd04e6`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### UnloadObjectMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/UnloadObjectMessage.h`
- Derived CRC/opcode hint: `0x3be552e8`
- Serialized length model: exact `8` bytes
- Fields (order):
  - `m_id`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### UnloadProxyMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gamePlanetServer/UnloadProxyMessage.h`
- Derived CRC/opcode hint: `0x0901cb45`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_proxyGameServerId`: `uint32` via `AutoVariable` -> `number` (addVariable)

### UpdateCellPermissionMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/UpdateCellPermissionMessage.h`
- Derived CRC/opcode hint: `0xf612499c`
- Serialized length model: exact `9` bytes
- Fields (order):
  - `m_allowed`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### UpdateConnectionServerStatus
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/UpdateConnectionServerStatus.h`
- Derived CRC/opcode hint: `0xe87735a6`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_publicPort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `m_privatePort`: `uint16` via `AutoVariable` -> `number` (addVariable)

### UpdateContainmentMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/UpdateContainmentMessage.h`
- Derived CRC/opcode hint: `0x56cbde9e`
- Serialized length model: exact `20` bytes
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_slotArrangement`: `int` via `AutoVariable` -> `number` (addVariable)

### UpdateLoginConnectionServerStatus
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/UpdateLoginConnectionServerStatus.h`
- Derived CRC/opcode hint: `0x1b5e3f1c`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_id`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_publicPort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `m_privatePort`: `uint16` via `AutoVariable` -> `number` (addVariable)
  - `m_playerCount`: `int` via `AutoVariable` -> `number` (addVariable)

### UpdateMissileMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/UpdateMissileMessage.h`
- Derived CRC/opcode hint: `0x1228cd01`
- Serialized length model: exact `20` bytes
- Fields (order):
  - `m_missileId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_shipId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_countermeasureType`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_updateType`: `int` via `AutoVariable` -> `number` (addVariable)

### UpdateObjectOnPlanetMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gamePlanetServer/UpdateObjectOnPlanetMessage.h`
- Derived CRC/opcode hint: `0x65a2418e`
- Serialized length model: exact `59` bytes
- Fields (order):
  - `m_objectId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_topmostContainer`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_x`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_y`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_z`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_interestRadius`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_locationReservationRadius`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_objectTypeTag`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_watched`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_requiresSimulation`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_level`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_hibernating`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_templateCrc`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_aiActivity`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_creationType`: `int` via `AutoVariable` -> `number` (addVariable)

### UpdateObjectPositionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameGameServer/UpdateObjectPositionMessage.h`
- Derived CRC/opcode hint: `0xf99b631a`
- Serialized length model: exact `86` bytes
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_transform`: `Transform` via `AutoVariable` -> `{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_worldspaceTransform`: `Transform` via `AutoVariable` -> `{ rotation: { x: number; y: number; z: number; w: number }; position: { x: number; y: number; z: number } }` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_slotArrangement`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_loadWith`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_playerControlled`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_creatureObject`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### UpdatePlayerCountMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/UpdatePlayerCountMessage.h`
- Derived CRC/opcode hint: `0xf213b208`
- Serialized length model: exact `21` bytes
- Fields (order):
  - `m_loadedRecently`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_playerCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_freeTrialCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_emptySceneCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_tutorialSceneCount`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_falconSceneCount`: `int` via `AutoVariable` -> `number` (addVariable)

### UpdatePostureMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/UpdatePostureMessage.h`
- Derived CRC/opcode hint: `0x0bde6b41`
- Serialized length model: exact `9` bytes
- Fields (order):
  - `m_posture`: `uint8` via `AutoVariable` -> `number` (addVariable)
  - `m_target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### UpdatePvpStatusMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/UpdatePvpStatusMessage.h`
- Derived CRC/opcode hint: `0x08a1c126`
- Serialized length model: exact `16` bytes
- Fields (order):
  - `m_flags`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_factionId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_target`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### UpdateTransformMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/UpdateTransformMessage.h`
- Derived CRC/opcode hint: `0x1b24f808`
- Serialized length model: exact `22` bytes
- Fields (order):
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_positionX`: `int16` via `AutoVariable` -> `number` (addVariable)
  - `m_positionY`: `int16` via `AutoVariable` -> `number` (addVariable)
  - `m_positionZ`: `int16` via `AutoVariable` -> `number` (addVariable)
  - `m_sequenceNumber`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `m_speed`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_yaw`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_lookAtYaw`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_useLookAtYaw`: `int8` via `AutoVariable` -> `number` (addVariable)

### UpdateTransformWithParentMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/UpdateTransformWithParentMessage.h`
- Derived CRC/opcode hint: `0xc867ab5a`
- Serialized length model: exact `30` bytes
- Fields (order):
  - `m_cellId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_networkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_positionX`: `int16` via `AutoVariable` -> `number` (addVariable)
  - `m_positionY`: `int16` via `AutoVariable` -> `number` (addVariable)
  - `m_positionZ`: `int16` via `AutoVariable` -> `number` (addVariable)
  - `m_sequenceNumber`: `int32` via `AutoVariable` -> `number` (addVariable)
  - `m_speed`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_yaw`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_lookAtYaw`: `int8` via `AutoVariable` -> `number` (addVariable)
  - `m_useLookAtYaw`: `int8` via `AutoVariable` -> `number` (addVariable)

### UpdateVendorSearchOptionMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/UpdateVendorSearchOptionMessage.h`
- Derived CRC/opcode hint: `0x19859626`
- Serialized length model: exact `25` bytes
- Fields (order):
  - `m_responseId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_trackId`: `int` via `AutoVariable` -> `number` (addVariable)
  - `m_vendorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_enabled`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_playerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### UpdateVendorStatusMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/UpdateVendorStatusMessage.h`
- Derived CRC/opcode hint: `0x88ce562f`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_vendorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_location`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_status`: `int` via `AutoVariable` -> `number` (addVariable)

### UploadCharacterMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/UploadCharacterMessage.h`
- Derived CRC/opcode hint: `0x4526695f`
- Serialized length model: minimum `19` bytes + variable payload
- Fields (order):
  - `m_stationId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_packedCharacterData`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_fromGameServerId`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_fromCharacterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_isAdmin`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### ValidateAccountMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/ValidateAccountMessage.h`
- Derived CRC/opcode hint: `0xfc0486bf`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_track`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_subscriptionBits`: `uint32` via `AutoVariable` -> `number` (addVariable)

### ValidateAccountReplyMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/loginCentralServer/ValidateAccountReplyMessage.h`
- Derived CRC/opcode hint: `0x56c5340b`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `m_stationId`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_canLogin`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_canCreateRegular`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_canCreateJedi`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_canSkipTutorial`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_track`: `unsigned int` via `AutoVariable` -> `number` (addVariable)
  - `m_consumedRewardEvents`: `std::pair<NetworkId, std::string>` via `AutoArray` -> `bigint[]` (addVariable)
  - `m_claimedRewardItems`: `std::pair<NetworkId, std::string>` via `AutoArray` -> `bigint[]` (addVariable)

### ValidateCharacterForLoginMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/ValidateCharacterForLoginMessage.h`
- Derived CRC/opcode hint: `0x5632d8d6`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_suid`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### ValidateCharacterForLoginReplyMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralConnectionServer/ValidateCharacterForLoginReplyMessage.h`
- Derived CRC/opcode hint: `0x0ed64af4`
- CRC source wire names: `ValidateCharacterForLoginReplyMessage`, `ValidateCharacterForLoginMessage`
- Serialized length model: minimum `39` bytes + variable payload
- Fields (order):
  - `m_approved`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_suid`: `StationId` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_containerId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_scene`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_coordinates`: `Vector` via `AutoVariable` -> `{ x: number; y: number; z: number }` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### VendorStatusChangeMessage
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/gameCommoditiesServer/VendorStatusChangeMessage.h`
- Derived CRC/opcode hint: `0x7ddf97fb`
- Serialized length model: exact `12` bytes
- Fields (order):
  - `m_vendorId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_status`: `int` via `AutoVariable` -> `number` (addVariable)

### VerifyAndLockNameRequest
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/VerifyAndLockName.h`
- Derived CRC/opcode hint: `0x7e71dc9d`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_templateName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_gameFeatures`: `uint32` via `AutoVariable` -> `number` (addVariable)

### VerifyAndLockNameResponse
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/VerifyAndLockName.h`
- Derived CRC/opcode hint: `0x9f124fde`
- Serialized length model: minimum `16` bytes + variable payload
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_errorMessage`: `StringId` via `AutoVariable` -> `{ table: string; textIndex: number; text: string }` (addVariable)

### VerifyNameRequest
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x414190c2`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `m_creatureTemplate`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_characterName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### VerifyNameResponse
- Status: ✅ Implemented
- C++ headers: `engine/server/library/serverNetworkMessages/src/shared/centralGameServer/CentralGameServerMessages.h`
- Derived CRC/opcode hint: `0x4323c0f3`
- Serialized length model: minimum `26` bytes + variable payload
- Fields (order):
  - `m_stationId`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_characterId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_creatureTemplate`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_name`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_errorMessage`: `StringId` via `AutoVariable` -> `{ table: string; textIndex: number; text: string }` (addVariable)

### VerifyPlayerNameMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/VerifyPlayerNameMessage.h`
- Derived CRC/opcode hint: `0xbb8cad45`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_playerName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)
  - `m_sourceNetworkId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)

### VerifyPlayerNameResponseMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/customerService/VerifyPlayerNameResponseMessage.h`
- Derived CRC/opcode hint: `0xf4c498fd`
- Serialized length model: minimum `5` bytes + variable payload
- Fields (order):
  - `m_valid`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_playerName`: `Unicode::String` via `AutoVariable` -> `string` (addVariable)

### VerifyTradeMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/SecureTradeMessages.h`
- Derived CRC/opcode hint: `0x9ae247ee`
- Serialized length model: exact `0` bytes
- Fields: *(none parsed; packet may still carry behavior/state in implementation)*

### VoiceChatAddClientToChannel
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0x42f4feed`
- Serialized length model: minimum `13` bytes + variable payload
- Fields (order):
  - `m_clientId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_clientName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_channelName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_forceShortlist`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### VoiceChatChannelCommand
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0xaaa69e80`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_srcUserName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_destUserName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_channelName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_command`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_banTimeout`: `uint32` via `AutoVariable` -> `number` (addVariable)

### VoiceChatChannelInfo
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatChannelInfo.h`
- Derived CRC/opcode hint: `0x4bf970fe`
- Serialized length model: minimum `14` bytes + variable payload
- Fields (order):
  - `m_flags`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_channelName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_displayName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_channelUri`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_channelPassword`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_announceText`: `std::string` via `AutoVariable` -> `string` (addVariable)

### VoiceChatDeleteChannel
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0x0054f75a`
- Serialized length model: minimum `2` bytes + variable payload
- Fields (order):
  - `m_roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### VoiceChatGetChannel
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0xf59b53eb`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_password`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_limit`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_isPublic`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_persistant`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### VoiceChatInvite
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0xedfd5217`
- Serialized length model: minimum `22` bytes + variable payload
- Fields (order):
  - `m_requester`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_channelName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_inviteeId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_inviteeName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_channelUri`: `std::string` via `AutoVariable` -> `string` (addVariable)

### VoiceChatKick
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0x7f4cc972`
- Serialized length model: minimum `20` bytes + variable payload
- Fields (order):
  - `m_requester`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_channelName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_kickeeId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_kickeeName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### VoiceChatOnChannelCommand
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0xbaadf242`
- Serialized length model: minimum `18` bytes + variable payload
- Fields (order):
  - `m_srcUserName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_destUserName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_channelName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_command`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_banTimeout`: `uint32` via `AutoVariable` -> `number` (addVariable)
  - `m_result`: `uint32` via `AutoVariable` -> `number` (addVariable)

### VoiceChatOnGetAccount
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatOnGetAccount.h`
- Derived CRC/opcode hint: `0x326e6b43`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_result`: `unsigned` via `AutoVariable` -> `number` (addVariable)
  - `m_loginName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_password`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_connectionServerAddress`: `std::string` via `AutoVariable` -> `string` (addVariable)

### VoiceChatOnGetChannel
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0x9513e10c`
- Serialized length model: minimum `9` bytes + variable payload
- Fields (order):
  - `m_roomName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_uri`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_password`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_isPublic`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_persistant`: `bool` via `AutoVariable` -> `boolean` (addVariable)
  - `m_success`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### VoiceChatRemoveClientFromChannel
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0xbbe51f8c`
- Serialized length model: minimum `12` bytes + variable payload
- Fields (order):
  - `m_clientId`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_clientName`: `std::string` via `AutoVariable` -> `string` (addVariable)
  - `m_channelName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### VoiceChatRequestChannelInfo
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0x65f92dcf`
- Serialized length model: minimum `10` bytes + variable payload
- Fields (order):
  - `m_requester`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_channelName`: `std::string` via `AutoVariable` -> `string` (addVariable)

### VoiceChatRequestPersonalChannel
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0x585e6b30`
- Serialized length model: exact `9` bytes
- Fields (order):
  - `m_owner`: `NetworkId` via `AutoVariable` -> `bigint` (addVariable)
  - `m_pleaseCreateIt`: `bool` via `AutoVariable` -> `boolean` (addVariable)

### VoiceChatStatus
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/voicechat/VoiceChatMiscMessages.h`
- Derived CRC/opcode hint: `0x9e601905`
- Serialized length model: exact `4` bytes
- Fields (order):
  - `m_status`: `uint32` via `AutoVariable` -> `number` (addVariable)

### WhoListMessage
- Status: ✅ Implemented
- C++ headers: `engine/shared/library/sharedNetworkMessages/src/shared/clientGameServer/WhoListMessage.h`
- Derived CRC/opcode hint: `0x9ba0d09f`
- Serialized length model: minimum `4` bytes + variable payload
- Fields (order):
  - `m_data`: `Unicode::String` via `AutoArray` -> `string[]` (addVariable)

## Missing Packet List (TypeScript absent)

## Notes

- `Derived CRC/opcode hint` values come from explicit `GameNetworkMessage("...")` constructor strings when present; otherwise they fall back to packet class names.
- `Serialized length model` is calculated from `Archive` serializer semantics: exact bytes for fixed-width fields, minimum bytes for variable-length fields, and unknown when custom serializers are not safely inferable.
- The original SWG server target is 32-bit (ILP32); this model treats `long`/`unsigned long` and container size counters as 32-bit.
- `AutoVariableKeyShare` and other custom archive wrappers are intentionally marked unknown length unless explicit byte layout can be proven from source.
- For true wire-level validation, verify with captured client traffic and the concrete serializer implementation in each packet handler.
- `Implemented` in this file means a TypeScript packet interface exists by name; it does not guarantee production-complete behavior in handlers.

