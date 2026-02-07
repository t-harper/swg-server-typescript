import { describe, expect, it } from 'vitest';

import { SwgMessageRegistry } from '../message-registry.js';
import {
  decodeCppWirePacketByName,
  decodeCppWirePacketByOpcode,
  encodeCppWirePacketByName,
  type CppAuctionDataHeader,
  type CppAuctionItemDataDetails,
  type CppAvatarList,
  type CppGroupMemberParam,
  type CppNebulaLightningData,
  type CppPopulationList,
  type CppProsePackage,
  type CppServerInfo,
  type CppStringId,
  type CppLoginEnumClusterData,
  type CppLoginClusterStatusData,
  type CppLoginClusterStatusExData,
  type CppMapLocation,
  type CppSurveyDataItem,
  type CppResourceListDataItem,
  type CppSearchCondition,
  type CppAuctionLocation,
  type CppMarketAuction,
  type CppMarketAuctionAttribute,
  type CppMarketAuctionBid,
  type CppPalettizedItemDataHeader,
  type CppAuctionQueryResponseData,
  type CppBatchBaselinesMessageData,
  type CppCharacterListMessageData,
  type CppChardata,
  type CppChunk,
  type CppStructureListMessageData,
  type CppChatLogEntry,
  type CppCustomerServiceCategory,
  type CppCustomerServiceComment,
  type CppCustomerServiceTicket,
  type CppCustomerServiceSearchResult,
  type CppMetricsPair,
  type CppAIPathInfoNodeInfo,
  type CppResourceTypeData,
  type CppPlanetNodeStatusMessageData,
  type CppPlanetObjectStatusMessageData,
} from './cpp-wire-codec.js';
import { type ChatRoomData } from '../messages/chat/chat-core.js';

describe('cpp wire codec', () => {
  it('round-trips a simple fixed packet', () => {
    const encoded = encodeCppWirePacketByName('AcceptAuctionResponseMessage', {
      m_itemId: 1234567890123456789n,
      m_result: 7,
    });

    const decoded = decodeCppWirePacketByName('AcceptAuctionResponseMessage', encoded);

    expect(decoded.name).toBe('AcceptAuctionResponseMessage');
    expect(decoded.fields.m_itemId).toBe(1234567890123456789n);
    expect(decoded.fields.m_result).toBe(7);
  });

  it('round-trips chat room data with C++ field order', () => {
    const roomData: ChatRoomData = {
      id: 5,
      roomType: 0,
      moderated: 1,
      path: 'SWG.Test.Room',
      owner: {
        gameCode: 'SWG',
        cluster: 'local',
        name: 'Owner',
      },
      creator: {
        gameCode: 'SWG',
        cluster: 'local',
        name: 'Creator',
      },
      title: 'Test Room',
      moderators: [
        {
          gameCode: 'SWG',
          cluster: 'local',
          name: 'Mod1',
        },
      ],
      invitees: [
        {
          gameCode: 'SWG',
          cluster: 'local',
          name: 'Invitee1',
        },
      ],
    };

    const encoded = encodeCppWirePacketByName('ChatOnCreateRoom', {
      resultCode: 0,
      roomData,
      sequence: 77,
    });

    const decoded = decodeCppWirePacketByName('ChatOnCreateRoom', encoded);
    expect(decoded.fields.resultCode).toBe(0);
    expect(decoded.fields.sequence).toBe(77);
    expect(decoded.fields.roomData).toEqual(roomData);
  });

  it('round-trips AutoVariableKeyShare as fixed 16-byte key', () => {
    const key = new Uint8Array(16);
    for (let i = 0; i < key.length; i += 1) {
      key[i] = i;
    }

    const encoded = encodeCppWirePacketByName('ConnectionKeyPush', {
      key,
    });

    const decoded = decodeCppWirePacketByName('ConnectionKeyPush', encoded);
    expect(decoded.fields.key).toEqual(key);
  });

  it('round-trips C++ custom datatypes added for packet parity', () => {
    const prosePackage: CppProsePackage = {
      stringId: { table: 'ui', textIndex: 12, text: 'consent_prompt' },
      actor: { id: 100n, stringId: { table: '', textIndex: 0, text: '' }, str: '' },
      target: { id: 200n, stringId: { table: 'npc', textIndex: 1, text: 'target_name' }, str: '' },
      other: { id: 0n, stringId: { table: '', textIndex: 0, text: '' }, str: 'details' },
      digitInteger: 42,
      digitFloat: 3.25,
      complexGrammar: true,
    };

    const consentEncoded = encodeCppWirePacketByName('ConsentRequestMessage', {
      m_question: prosePackage,
      m_id: 99,
    });
    const consentDecoded = decodeCppWirePacketByName('ConsentRequestMessage', consentEncoded);
    expect(consentDecoded.fields.m_question).toEqual(prosePackage);
    expect(consentDecoded.fields.m_id).toBe(99);

    const groupLeader: CppGroupMemberParam = {
      m_memberId: 300n,
      m_memberName: 'Leader',
      m_memberDifficulty: 50,
      m_memberProfession: 7,
      m_memberIsPC: true,
      m_memberShipId: 0n,
      m_memberShipIsPOB: false,
      m_memberOwnsPOB: false,
    };
    const groupMember: CppGroupMemberParam = {
      m_memberId: 301n,
      m_memberName: 'Member',
      m_memberDifficulty: 20,
      m_memberProfession: 3,
      m_memberIsPC: true,
      m_memberShipId: 777n,
      m_memberShipIsPOB: true,
      m_memberOwnsPOB: false,
    };
    const groupEncoded = encodeCppWirePacketByName('CreateGroupMessage', {
      m_leader: groupLeader,
      m_members: [groupMember],
    });
    const groupDecoded = decodeCppWirePacketByName('CreateGroupMessage', groupEncoded);
    expect(groupDecoded.fields.m_leader).toEqual(groupLeader);
    expect(groupDecoded.fields.m_members).toEqual([groupMember]);

    const lightning: CppNebulaLightningData = {
      lightningId: 12,
      nebulaId: -8,
      syncStampStart: 1000,
      syncStampEnd: 2000,
      endpoint0: { x: 1, y: 2, z: 3 },
      endpoint1: { x: 4, y: 5, z: 6 },
    };
    const lightningEncoded = encodeCppWirePacketByName('CreateNebulaLightningMessage', {
      m_nebulaLightningData: lightning,
    });
    const lightningDecoded = decodeCppWirePacketByName('CreateNebulaLightningMessage', lightningEncoded);
    expect(lightningDecoded.fields.m_nebulaLightningData).toEqual(lightning);

    const serverInfo: CppServerInfo = {
      ipAddress: '127.0.0.1',
      serverId: 7,
      systemPid: 1234,
      sceneId: 'tatooine',
    };
    const statusEncoded = encodeCppWirePacketByName('GameServerStatus', {
      m_online: true,
      m_serverInfo: serverInfo,
    });
    const statusDecoded = decodeCppWirePacketByName('GameServerStatus', statusEncoded);
    expect(statusDecoded.fields.m_serverInfo).toEqual(serverInfo);

    const details: CppAuctionItemDataDetails = {
      itemId: 444n,
      userDescription: 'artifact',
      propertyList: [
        ['condition', '1000/1000'],
        ['crafter', 'Tester'],
      ],
      templateName: 'object/tangible/test.iff',
      appearanceString: 'appearance/test',
    };
    const detailsEncoded = encodeCppWirePacketByName('GetAuctionDetailsResponse', {
      m_details: details,
    });
    const detailsDecoded = decodeCppWirePacketByName('GetAuctionDetailsResponse', detailsEncoded);
    expect(detailsDecoded.fields.m_details).toEqual(details);

    const auctionHeader: CppAuctionDataHeader = {
      type: 1,
      auctionId: 500n,
      itemId: 600n,
      itemNameLength: 4,
      itemName: 'test',
      minBid: 10,
      highBid: 20,
      timer: 30,
      buyNowPrice: 40,
      location: 'Mos Eisley',
      ownerId: 700n,
      highBidderId: 800n,
      maxProxyBid: 25,
      myBid: 15,
      itemType: 1337,
      resourceContainerClassCrc: 0,
      flags: 0,
      entranceCharge: 0,
    };
    const auctionEncoded = encodeCppWirePacketByName('OnQueryAuctionHeadersMessage', {
      m_responseId: 1,
      m_trackId: 2,
      m_playerId: 3n,
      m_queryType: 4,
      m_numAuctions: 1,
      m_auctionData: [auctionHeader],
      m_resultCode: 0,
      m_queryOffset: 0,
      m_hasMorePages: false,
    });
    const auctionDecoded = decodeCppWirePacketByName('OnQueryAuctionHeadersMessage', auctionEncoded);
    expect(auctionDecoded.fields.m_auctionData).toEqual([auctionHeader]);

    const populationList: CppPopulationList = [
      { scene: 'tatooine', x: 100, z: 200, population: 9 },
      { scene: 'naboo', x: -50, z: 10, population: 2 },
    ];
    const populationEncoded = encodeCppWirePacketByName('PopulationListMessage', {
      m_list: populationList,
    });
    const populationDecoded = decodeCppWirePacketByName('PopulationListMessage', populationEncoded);
    expect(populationDecoded.fields.m_list).toEqual([
      { scene: 'naboo', x: -50, z: 10, population: 2 },
      { scene: 'tatooine', x: 100, z: 200, population: 9 },
    ]);

    const avatarList: CppAvatarList = [
      {
        m_name: 'Avatar One',
        m_objectTemplateId: 111,
        m_networkId: 901n,
        m_clusterId: 2,
        m_characterType: 0,
      },
      {
        m_name: 'Avatar Two',
        m_objectTemplateId: 222,
        m_networkId: 902n,
        m_clusterId: 2,
        m_characterType: 1,
      },
    ];
    const avatarEncoded = encodeCppWirePacketByName('TransferReplyCharacterList', {
      m_avatarList: avatarList,
      m_stationId: 123,
      m_track: 456,
    });
    const avatarDecoded = decodeCppWirePacketByName('TransferReplyCharacterList', avatarEncoded);
    expect(avatarDecoded.fields.m_avatarList).toEqual(avatarList);

    const valueDictEncoded = encodeCppWirePacketByName('ClusterWideDataGetElementResponseMessage', {
      m_managerName: 'manager',
      m_elementNameRegex: '.*',
      m_requestId: 9,
      m_lockKey: 10,
      m_elementNameList: ['a'],
      m_elementDictionaryList: [
        [
          ['str', { type: 'string', value: 'hello' }],
          ['int', { type: 'signed int', value: 7 }],
          ['float', { type: 'float', value: 1.5 }],
          ['bool', { type: 'bool', value: true }],
          ['oid', { type: 'object id', value: 99n }],
        ],
      ],
    });
    const valueDictDecoded = decodeCppWirePacketByName(
      'ClusterWideDataGetElementResponseMessage',
      valueDictEncoded
    );
    expect(valueDictDecoded.fields.m_elementDictionaryList).toEqual([
      new Map([
        ['bool', { type: 'bool', value: true }],
        ['float', { type: 'float', value: 1.5 }],
        ['int', { type: 'signed int', value: 7 }],
        ['oid', { type: 'object id', value: 99n }],
        ['str', { type: 'string', value: 'hello' }],
      ]),
    ]);

    const valueTypeBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const genericValueTypeEncoded = encodeCppWirePacketByName('GenericValueTypeMessage', {
      value: valueTypeBytes,
    });
    const genericValueTypeDecoded = decodeCppWirePacketByName('GenericValueTypeMessage', genericValueTypeEncoded);
    expect(genericValueTypeDecoded.fields.value).toEqual(valueTypeBytes);
  });

  it('supports decode-by-opcode for non-ambiguous packets', () => {
    const encoded = encodeCppWirePacketByName('AcceptAuctionResponseMessage', {
      m_itemId: 42n,
      m_result: -1,
    });

    const decoded = decodeCppWirePacketByOpcode(encoded);
    expect(decoded.name).toBe('AcceptAuctionResponseMessage');
    expect(decoded.fields.m_itemId).toBe(42n);
    expect(decoded.fields.m_result).toBe(-1);
  });

  it('forces disambiguation when one opcode maps to multiple packet names', () => {
    const errorMessage: CppStringId = {
      table: 'ui',
      textIndex: 0,
      text: 'name_declined',
    };

    const encoded = encodeCppWirePacketByName('ClientCreateCharacterFailed', {
      m_name: 'Tester',
      m_errorMessage: errorMessage,
    });

    expect(() => decodeCppWirePacketByOpcode(encoded)).toThrow(/ambiguous/i);

    const registry = new SwgMessageRegistry();
    const decoded = registry.decodeByOpcode(encoded, 'ClientCreateCharacterFailed');
    expect(decoded.name).toBe('ClientCreateCharacterFailed');
    expect(decoded.fields.m_name).toBe('Tester');
    expect(decoded.fields.m_errorMessage).toEqual(errorMessage);
  });

  it('round-trips LoginEnumCluster::ClusterData', () => {
    const clusterData: CppLoginEnumClusterData[] = [
      { m_clusterId: 1, m_clusterName: 'TestGalaxy', m_timeZone: -8 },
      { m_clusterId: 2, m_clusterName: 'Bria', m_timeZone: 0 },
    ];
    const encoded = encodeCppWirePacketByName('LoginEnumCluster', {
      m_data: clusterData,
      m_maxCharactersPerAccount: 10,
    });
    const decoded = decodeCppWirePacketByName('LoginEnumCluster', encoded);
    expect(decoded.fields.m_data).toEqual(clusterData);
    expect(decoded.fields.m_maxCharactersPerAccount).toBe(10);
  });

  it('round-trips LoginClusterStatus::ClusterData', () => {
    const clusterData: CppLoginClusterStatusData[] = [{
      m_clusterId: 1,
      m_connectionServerAddress: '127.0.0.1',
      m_connectionServerPort: 44455,
      m_connectionServerPingPort: 44462,
      m_populationOnline: 150,
      m_populationOnlineStatus: 2,
      m_maxCharactersPerAccount: 10,
      m_timeZone: -5,
      m_status: 2,
      m_dontRecommend: false,
      m_onlinePlayerLimit: 3000,
      m_onlineFreeTrialLimit: 500,
    }];
    const encoded = encodeCppWirePacketByName('LoginClusterStatus', {
      m_data: clusterData,
    });
    const decoded = decodeCppWirePacketByName('LoginClusterStatus', encoded);
    expect(decoded.fields.m_data).toEqual(clusterData);
  });

  it('round-trips LoginClusterStatusEx::ClusterData', () => {
    const clusterData: CppLoginClusterStatusExData[] = [{
      m_clusterId: 3,
      m_branch: 'live',
      m_networkVersion: '2005.1.2',
      m_version: 42,
      m_reserved1: 0,
      m_reserved2: 0,
      m_reserved3: 0,
      m_reserved4: 0,
    }];
    const encoded = encodeCppWirePacketByName('LoginClusterStatusEx', {
      m_data: clusterData,
    });
    const decoded = decodeCppWirePacketByName('LoginClusterStatusEx', encoded);
    expect(decoded.fields.m_data).toEqual(clusterData);
  });

  it('round-trips MapLocation', () => {
    const loc: CppMapLocation = {
      locationId: 9001n,
      locationName: 'Mos Eisley Starport',
      x: 3528.5,
      y: -4804.25,
      category: 7,
      subCategory: 3,
      flags: 1,
    };
    const encoded = encodeCppWirePacketByName('GetMapLocationsResponseMessage', {
      m_planetName: 'tatooine',
      m_mapLocationsStatic: [loc],
      m_mapLocationsDynamic: [],
      m_mapLocationsPersist: [],
      m_versionStatic: 1,
      m_versionDynamic: 0,
      m_versionPersist: 0,
    });
    const decoded = decodeCppWirePacketByName('GetMapLocationsResponseMessage', encoded);
    expect(decoded.fields.m_mapLocationsStatic).toEqual([loc]);
    expect(decoded.fields.m_planetName).toBe('tatooine');
  });

  it('round-trips SurveyMessage::DataItem', () => {
    const items: CppSurveyDataItem[] = [
      { x: 100.5, y: 0, z: -200.25, efficiency: 0.75 },
      { x: 200, y: 10.5, z: 300, efficiency: 0.5 },
    ];
    const encoded = encodeCppWirePacketByName('SurveyMessage', {
      m_data: items,
    });
    const decoded = decodeCppWirePacketByName('SurveyMessage', encoded);
    expect(decoded.fields.m_data).toEqual(items);
  });

  it('round-trips ResourceListForSurveyMessage::DataItem', () => {
    const items: CppResourceListDataItem[] = [
      { resourceName: 'Tatooinian Iron', resourceId: 5001n, parentClassName: 'iron_tatooinian' },
    ];
    const encoded = encodeCppWirePacketByName('ResourceListForSurveyMessage', {
      m_data: items,
      m_surveyType: 'mineral',
      m_surveyToolId: 1234n,
    });
    const decoded = decodeCppWirePacketByName('ResourceListForSurveyMessage', encoded);
    expect(decoded.fields.m_data).toEqual(items);
    expect(decoded.fields.m_surveyType).toBe('mineral');
  });

  it('round-trips SearchCondition with int comparison', () => {
    const cond: CppSearchCondition = {
      attributeNameCrc: 0xdeadbeef,
      requiredAttribute: true,
      comparison: 0,
      intMin: 10,
      intMax: 500,
    };
    const encoded = encodeCppWirePacketByName('AuctionQueryHeadersMessage', {
      m_locationSearchType: 0,
      m_requestId: 1,
      m_searchType: 0,
      m_itemType: 0,
      m_itemTypeExactMatch: false,
      m_itemTemplateId: 0,
      m_textFilterAll: '',
      m_textFilterAny: '',
      m_priceFilterMin: 0,
      m_priceFilterMax: 0,
      m_priceFilterIncludesFee: false,
      m_advancedSearch: [cond],
      m_advancedSearchMatchAllAny: 0,
      m_container: 0n,
      m_myVendorsOnly: false,
      m_queryOffset: 0,
    });
    const decoded = decodeCppWirePacketByName('AuctionQueryHeadersMessage', encoded);
    const decodedCond = (decoded.fields.m_advancedSearch as CppSearchCondition[])[0];
    expect(decodedCond).toBeDefined();
    expect(decodedCond!.attributeNameCrc).toBe(0xdeadbeef);
    expect(decodedCond!.comparison).toBe(0);
    expect(decodedCond!.intMin).toBe(10);
    expect(decodedCond!.intMax).toBe(500);
  });

  it('round-trips SearchCondition with float comparison', () => {
    const cond: CppSearchCondition = {
      attributeNameCrc: 42,
      requiredAttribute: false,
      comparison: 1,
      floatMin: 1.5,
      floatMax: 99.75,
    };
    const encoded = encodeCppWirePacketByName('AuctionQueryHeadersMessage', {
      m_locationSearchType: 0,
      m_requestId: 2,
      m_searchType: 0,
      m_itemType: 0,
      m_itemTypeExactMatch: false,
      m_itemTemplateId: 0,
      m_textFilterAll: '',
      m_textFilterAny: '',
      m_priceFilterMin: 0,
      m_priceFilterMax: 0,
      m_priceFilterIncludesFee: false,
      m_advancedSearch: [cond],
      m_advancedSearchMatchAllAny: 0,
      m_container: 0n,
      m_myVendorsOnly: false,
      m_queryOffset: 0,
    });
    const decoded = decodeCppWirePacketByName('AuctionQueryHeadersMessage', encoded);
    const decodedCond = (decoded.fields.m_advancedSearch as CppSearchCondition[])[0];
    expect(decodedCond).toBeDefined();
    expect(decodedCond!.comparison).toBe(1);
    expect(decodedCond!.floatMin).toBe(1.5);
    expect(decodedCond!.floatMax).toBe(99.75);
  });

  it('round-trips SearchCondition with string comparison', () => {
    const cond: CppSearchCondition = {
      attributeNameCrc: 77,
      requiredAttribute: true,
      comparison: 2,
      stringValue: 'test_value',
    };
    const encoded = encodeCppWirePacketByName('AuctionQueryHeadersMessage', {
      m_locationSearchType: 0,
      m_requestId: 3,
      m_searchType: 0,
      m_itemType: 0,
      m_itemTypeExactMatch: false,
      m_itemTemplateId: 0,
      m_textFilterAll: '',
      m_textFilterAny: '',
      m_priceFilterMin: 0,
      m_priceFilterMax: 0,
      m_priceFilterIncludesFee: false,
      m_advancedSearch: [cond],
      m_advancedSearchMatchAllAny: 0,
      m_container: 0n,
      m_myVendorsOnly: false,
      m_queryOffset: 0,
    });
    const decoded = decodeCppWirePacketByName('AuctionQueryHeadersMessage', encoded);
    const decodedCond = (decoded.fields.m_advancedSearch as CppSearchCondition[])[0];
    expect(decodedCond).toBeDefined();
    expect(decodedCond!.comparison).toBe(2);
    expect(decodedCond!.stringValue).toBe('test_value');
  });

  it('round-trips AuctionLocation', () => {
    const loc: CppAuctionLocation = {
      locationId: 100n,
      locationNameLength: 10,
      locationName: 'Mos Eisley',
      ownerId: 200n,
      salesTax: 5,
      salesTaxBankId: 300n,
      emptyDate: 0,
      lastAccessDate: 1000000,
      inactiveDate: 0,
      status: 1,
      searchEnabled: true,
      entranceCharge: 0,
    };
    const encoded = encodeCppWirePacketByName('GetAuctionLocationsMessage', {
      m_auctionLocations: [loc],
    });
    const decoded = decodeCppWirePacketByName('GetAuctionLocationsMessage', encoded);
    expect(decoded.fields.m_auctionLocations).toEqual([loc]);
  });

  it('round-trips MarketAuction', () => {
    const auction: CppMarketAuction = {
      itemId: 1n,
      ownerId: 2n,
      creatorId: 3n,
      locationId: 4n,
      minBid: 100,
      buyNowPrice: 500,
      auctionTimer: 3600,
      oobLength: 5,
      oob: 'hello',
      userDescriptionLength: 4,
      userDescription: 'test',
      category: 8,
      itemTemplateId: 99,
      itemNameLength: 6,
      itemName: 'Widget',
      itemTimer: 7200,
      active: 1,
      itemSize: 10,
    };
    const encoded = encodeCppWirePacketByName('GetMarketAuctionsMessage', {
      m_auctions: [auction],
    });
    const decoded = decodeCppWirePacketByName('GetMarketAuctionsMessage', encoded);
    expect(decoded.fields.m_auctions).toEqual([auction]);
  });

  it('round-trips MarketAuctionAttribute', () => {
    const attr: CppMarketAuctionAttribute = {
      itemId: 555n,
      attributeName: 'condition',
      attributeValue: '1000/1000',
    };
    const encoded = encodeCppWirePacketByName('GetMarketAuctionAttributesMessage', {
      m_attributes: [attr],
    });
    const decoded = decodeCppWirePacketByName('GetMarketAuctionAttributesMessage', encoded);
    expect(decoded.fields.m_attributes).toEqual([attr]);
  });

  it('round-trips MarketAuctionBid', () => {
    const bid: CppMarketAuctionBid = {
      itemId: 100n,
      bidderId: 200n,
      bid: 5000,
      maxProxyBid: 10000,
    };
    const encoded = encodeCppWirePacketByName('GetMarketAuctionBidsMessage', {
      m_marketAuctionBids: [bid],
    });
    const decoded = decodeCppWirePacketByName('GetMarketAuctionBidsMessage', encoded);
    expect(decoded.fields.m_marketAuctionBids).toEqual([bid]);
  });

  it('round-trips Auction::PalettizedItemDataHeader', () => {
    const header: CppPalettizedItemDataHeader = {
      itemId: 1000n,
      itemNameKey: 5,
      highBid: 250,
      timer: 3600,
      buyNowPrice: 1000,
      locationKey: 12,
      ownerId: 2000n,
      ownerNameKey: 3,
      highBidderId: 3000n,
      highBidderNameKey: 7,
      maxProxyBid: 500,
      myBid: 300,
      itemType: 42,
      resourceContainerClassCrc: 0,
      flags: 0,
      entranceCharge: 0,
    };
    const encoded = encodeCppWirePacketByName('AuctionQueryHeadersResponseMessage', {
      m_requestId: 1,
      m_typeFlag: 2,
      m_stringPalette: ['owner1'],
      m_wideStringPalette: ['item1'],
      m_palettizedAuctionData: [header],
      m_queryOffset: 0,
      m_hasMorePages: false,
    });
    const decoded = decodeCppWirePacketByName('AuctionQueryHeadersResponseMessage', encoded);
    expect(decoded.fields.m_palettizedAuctionData).toEqual([header]);
  });

  it('round-trips AuctionData (AuctionQueryResponseMessage)', () => {
    const auctionData: CppAuctionQueryResponseData = {
      auctionId: 10n,
      location: 'Coronet',
      ownerId: 20n,
      minBid: 100,
      timer: 7200,
      itemId: 30n,
      soldFlag: 0,
      highBidderId: 40n,
      itemType: 5,
      resourceContainerClassCrc: 0,
      itemQuantity: 1,
      itemTimer: 3600,
      highBid: 150,
      highBidMaxProxy: 200,
    };
    const encoded = encodeCppWirePacketByName('AuctionQueryResponseMessage', {
      m_requestId: 1,
      m_typeFlag: 0,
      m_auctionData: [auctionData],
    });
    const decoded = decodeCppWirePacketByName('AuctionQueryResponseMessage', encoded);
    expect(decoded.fields.m_auctionData).toEqual([auctionData]);
  });

  it('round-trips AttributePair', () => {
    const encoded = encodeCppWirePacketByName('AttributeListMessage', {
      m_networkId: 999n,
      m_staticItemName: 'item_template',
      m_data: [['condition', '500/1000'], ['crafter', 'Test Crafter']],
      m_revision: 3,
    });
    const decoded = decodeCppWirePacketByName('AttributeListMessage', encoded);
    expect(decoded.fields.m_data).toEqual([['condition', '500/1000'], ['crafter', 'Test Crafter']]);
  });

  it('round-trips BatchBaselinesMessageData via std::vector', () => {
    const data: CppBatchBaselinesMessageData[] = [{
      networkId: 100n,
      objectType: 0x4352454f,
      packageId: 3,
      package: new Uint8Array([1, 2, 3, 4]),
    }];
    const encoded = encodeCppWirePacketByName('BatchBaselinesMessage', {
      m_data: data,
    });
    const decoded = decodeCppWirePacketByName('BatchBaselinesMessage', encoded);
    expect(decoded.fields.m_data).toEqual(data);
  });

  it('round-trips CharacterListMessageData', () => {
    const data: CppCharacterListMessageData[] = [{
      name: 'Obi Wan',
      objectTemplate: 'object/creature/player/human_male.iff',
      characterId: 500n,
      containerId: 0n,
      location: 'tatooine',
      coordinates: { x: 3500, y: 5, z: -4800 },
    }];
    const encoded = encodeCppWirePacketByName('CharacterListMessage', {
      m_data: data,
      m_accountNumber: 12345,
    });
    const decoded = decodeCppWirePacketByName('CharacterListMessage', encoded);
    expect(decoded.fields.m_data).toEqual(data);
    expect(decoded.fields.m_accountNumber).toBe(12345);
  });

  it('round-trips Chardata', () => {
    const data: CppChardata[] = [{
      name: 'TestChar',
      objectTemplateId: 42,
      networkId: 999n,
      clusterId: 1,
      characterType: 0,
    }];
    const encoded = encodeCppWirePacketByName('EnumerateCharacterId', {
      m_data: data,
    });
    const decoded = decodeCppWirePacketByName('EnumerateCharacterId', encoded);
    expect(decoded.fields.m_data).toEqual(data);
  });

  it('round-trips Chunk', () => {
    const chunks: CppChunk[] = [
      { process: 1, nodeX: 10, nodeZ: -20 },
      { process: 2, nodeX: -5, nodeZ: 15 },
    ];
    const encoded = encodeCppWirePacketByName('RequestChunkMessage', {
      m_chunks: chunks,
      m_sceneId: 'tatooine',
    });
    const decoded = decodeCppWirePacketByName('RequestChunkMessage', encoded);
    expect(decoded.fields.m_chunks).toEqual(chunks);
    expect(decoded.fields.m_sceneId).toBe('tatooine');
  });

  it('round-trips StructureListMessageData', () => {
    const data: CppStructureListMessageData[] = [{
      objectTemplate: 'object/building/test.iff',
      structureId: 777n,
      location: 'tatooine',
      coordinates: { x: 100, y: 0, z: 200 },
      deleted: 0,
    }];
    const encoded = encodeCppWirePacketByName('StructureListMessage', {
      m_data: data,
      m_toolId: 1,
      m_loginServerId: 2,
      m_characterId: 3,
    });
    const decoded = decodeCppWirePacketByName('StructureListMessage', encoded);
    expect(decoded.fields.m_data).toEqual(data);
  });

  it('round-trips ChatLogEntry', () => {
    const entries: CppChatLogEntry[] = [{
      from: 'Player1',
      to: 'Player2',
      channel: 'SWG.local.chat',
      message: 'Hello there!',
      time: 1609459200,
    }];
    const encoded = encodeCppWirePacketByName('ChatOnRequestLog', {
      logEntries: entries,
      sequence: 42,
    });
    const decoded = decodeCppWirePacketByName('ChatOnRequestLog', encoded);
    expect(decoded.fields.logEntries).toEqual(entries);
    expect(decoded.fields.sequence).toBe(42);
  });

  it('round-trips CustomerServiceCategory (recursive)', () => {
    const category: CppCustomerServiceCategory = {
      categoryName: 'Bug Reports',
      categoryId: 1,
      subCategories: [
        {
          categoryName: 'Gameplay',
          categoryId: 10,
          subCategories: [],
          isBugType: true,
          isServiceType: false,
        },
        {
          categoryName: 'UI Issues',
          categoryId: 11,
          subCategories: [{
            categoryName: 'Chat',
            categoryId: 110,
            subCategories: [],
            isBugType: true,
            isServiceType: false,
          }],
          isBugType: true,
          isServiceType: false,
        },
      ],
      isBugType: true,
      isServiceType: false,
    };
    const encoded = encodeCppWirePacketByName('RequestCategoriesResponseMessage', {
      m_result: 0,
      m_categories: [category],
    });
    const decoded = decodeCppWirePacketByName('RequestCategoriesResponseMessage', encoded);
    expect(decoded.fields.m_categories).toEqual([category]);
  });

  it('round-trips CustomerServiceComment', () => {
    const comments: CppCustomerServiceComment[] = [{
      ticketId: 100,
      commentId: 1,
      fromCsr: true,
      comment: 'We are looking into this issue.',
      commentorName: 'GM_Support',
    }];
    const encoded = encodeCppWirePacketByName('GetCommentsResponseMessage', {
      m_result: 0,
      m_comments: comments,
    });
    const decoded = decodeCppWirePacketByName('GetCommentsResponseMessage', encoded);
    expect(decoded.fields.m_comments).toEqual(comments);
  });

  it('round-trips CustomerServiceTicket', () => {
    const tickets: CppCustomerServiceTicket[] = [{
      categoryId: 1,
      subCategoryId: 10,
      characterName: 'BugReporter',
      details: 'My character is stuck.',
      language: 'en',
      ticketId: 42,
      modifiedDate: 1609459200n,
      read: false,
      closed: false,
    }];
    const encoded = encodeCppWirePacketByName('GetTicketsResponseMessage', {
      m_result: 0,
      m_totalNumTickets: 1,
      m_tickets: tickets,
    });
    const decoded = decodeCppWirePacketByName('GetTicketsResponseMessage', encoded);
    expect(decoded.fields.m_tickets).toEqual(tickets);
  });

  it('round-trips CustomerServiceSearchResult', () => {
    const results: CppCustomerServiceSearchResult[] = [
      { title: 'How to reset password', id: 'KB-001', matchPercent: 95 },
      { title: 'Character transfer guide', id: 'KB-042', matchPercent: 60 },
    ];
    const encoded = encodeCppWirePacketByName('SearchKnowledgeBaseResponseMessage', {
      m_result: 0,
      m_searchResults: results,
    });
    const decoded = decodeCppWirePacketByName('SearchKnowledgeBaseResponseMessage', encoded);
    expect(decoded.fields.m_searchResults).toEqual(results);
  });

  it('round-trips MetricsPair', () => {
    const metrics: CppMetricsPair[] = [
      { label: 'cpu_usage', value: 45, description: 'CPU usage percentage', persistData: true, summary: true },
      { label: 'mem_mb', value: 2048, description: 'Memory usage in MB', persistData: false, summary: false },
    ];
    const encoded = encodeCppWirePacketByName('MetricsDataMessage', {
      m_data: metrics,
    });
    const decoded = decodeCppWirePacketByName('MetricsDataMessage', encoded);
    expect(decoded.fields.m_data).toEqual(metrics);
  });

  it('round-trips AIPathInfo_NodeInfo', () => {
    const nodes: CppAIPathInfoNodeInfo[] = [
      { node: 42, state: 3 },
      { node: -1, state: 0 },
    ];
    const encoded = encodeCppWirePacketByName('AIPathInfo', {
      m_objectId: 100n,
      m_nodes: nodes,
    });
    const decoded = decodeCppWirePacketByName('AIPathInfo', encoded);
    expect(decoded.fields.m_nodes).toEqual(nodes);
    expect(decoded.fields.m_objectId).toBe(100n);
  });

  it('round-trips ResourceTypeData', () => {
    const data: CppResourceTypeData[] = [{
      networkId: 5000n,
      name: 'Tatooinian Iron',
      depletedTimestamp: 0,
      parentClass: 'iron_tatooinian',
      attributes: [['res_quality', 800], ['res_conductivity', 500]],
      fractalSeeds: [[1n, 42], [2n, 99]],
    }];
    const encoded = encodeCppWirePacketByName('AddResourceTypeMessage', {
      m_data: data,
    });
    const decoded = decodeCppWirePacketByName('AddResourceTypeMessage', encoded);
    expect(decoded.fields.m_data).toEqual(data);
  });

  it('round-trips PlanetNodeStatusMessageData', () => {
    const data: CppPlanetNodeStatusMessageData[] = [{
      x: 10,
      z: -20,
      loaded: true,
      servers: [1, 2, 3],
      subscriptionCounts: [50, 30, 20],
    }];
    const encoded = encodeCppWirePacketByName('PlanetNodeStatusMessage', {
      m_data: data,
    });
    const decoded = decodeCppWirePacketByName('PlanetNodeStatusMessage', encoded);
    expect(decoded.fields.m_data).toEqual(data);
  });

  it('round-trips PlanetObjectStatusMessageData', () => {
    const data: CppPlanetObjectStatusMessageData[] = [{
      objectId: 42n,
      x: 3500,
      z: -4800,
      authoritativeServer: 1,
      interestRadius: 200,
      deleteObject: 0,
      objectTypeTag: 0x4352454f,
      level: 50,
      hibernating: false,
      templateCrc: 0xdeadbeef,
      aiActivity: 0,
      creationType: 1,
    }];
    const encoded = encodeCppWirePacketByName('PlanetObjectStatusMessage', {
      m_data: data,
    });
    const decoded = decodeCppWirePacketByName('PlanetObjectStatusMessage', encoded);
    expect(decoded.fields.m_data).toEqual(data);
  });

  it('round-trips empty arrays for new custom types', () => {
    const encoded = encodeCppWirePacketByName('MetricsDataMessage', {
      m_data: [],
    });
    const decoded = decodeCppWirePacketByName('MetricsDataMessage', encoded);
    expect(decoded.fields.m_data).toEqual([]);

    const encoded2 = encodeCppWirePacketByName('SurveyMessage', {
      m_data: [],
    });
    const decoded2 = decodeCppWirePacketByName('SurveyMessage', encoded2);
    expect(decoded2.fields.m_data).toEqual([]);
  });

  it('disambiguates DataItem between SurveyMessage and ResourceListForSurveyMessage', () => {
    const surveyItem: CppSurveyDataItem = { x: 1, y: 2, z: 3, efficiency: 0.5 };
    const surveyEncoded = encodeCppWirePacketByName('SurveyMessage', {
      m_data: [surveyItem],
    });

    const resourceItem: CppResourceListDataItem = {
      resourceName: 'Iron',
      resourceId: 99n,
      parentClassName: 'iron',
    };
    const resourceEncoded = encodeCppWirePacketByName('ResourceListForSurveyMessage', {
      m_data: [resourceItem],
      m_surveyType: 'mineral',
      m_surveyToolId: 1n,
    });

    const surveyDecoded = decodeCppWirePacketByName('SurveyMessage', surveyEncoded);
    expect(surveyDecoded.fields.m_data).toEqual([surveyItem]);

    const resourceDecoded = decodeCppWirePacketByName('ResourceListForSurveyMessage', resourceEncoded);
    expect(resourceDecoded.fields.m_data).toEqual([resourceItem]);

    // Verify they produce different wire bytes (different encodings)
    expect(surveyEncoded).not.toEqual(resourceEncoded);
  });
});
