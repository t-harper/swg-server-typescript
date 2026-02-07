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
});
