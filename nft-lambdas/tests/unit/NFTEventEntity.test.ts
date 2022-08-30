import { PutCommandOutput, UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { NFTEventEntityDAO } from '../../dynamodb';

describe('NFT Transfer Events Entity', function () {
    let nftEventsDB: NFTEventEntityDAO;
    const PK = 'testing';
    const INITIAL_RECORD = {
        transactionHash: PK,
        blockNumber: Math.floor(Math.random() * 100),
        from: 'mary',
        to: 'paul',
        tokenId: 'love',
    };

    beforeAll(async function () {
        nftEventsDB = new NFTEventEntityDAO();
        await nftEventsDB.connect();
        await nftEventsDB.save(INITIAL_RECORD);
    });

    describe('GET', function () {
        it(`Should return undefined when GET an inexistent event`, async () => {
            const getResult = await nftEventsDB.get('inexistent');
            expect(getResult).toBeUndefined();
        });
        it(`Should return NFT Event with a specific transactionHash`, async () => {
            const getResult = (await nftEventsDB.get(PK)) as Record<string, NativeAttributeValue>;
            expect(getResult.transactionHash).toEqual(PK);
            expect(getResult.blockNumber).toEqual(INITIAL_RECORD.blockNumber);
            expect(getResult.from).toEqual(INITIAL_RECORD.from);
            expect(getResult.to).toEqual(INITIAL_RECORD.to);
            expect(getResult.tokenId).toEqual(INITIAL_RECORD.tokenId);
        });
    });

    describe('GETALL', function () {
        it(`Should return all NFT Events from database`, async () => {
            const results = (await nftEventsDB.getAll()) as Record<string, NativeAttributeValue>[];
            expect(results).toHaveLength(1);
            expect(results[0].transactionHash).toEqual(PK);
            expect(results[0].blockNumber).toEqual(INITIAL_RECORD.blockNumber);
            expect(results[0].from).toEqual(INITIAL_RECORD.from);
            expect(results[0].to).toEqual(INITIAL_RECORD.to);
            expect(results[0].tokenId).toEqual(INITIAL_RECORD.tokenId);
        });
    });

    describe('PUT', function () {
        it(`Should put event when it does not exist`, async () => {
            const PK_LOCAL = 'testingPUT';
            const BLOCK_LOCAL = Math.floor(Math.random() * 100);
            const saveResult = (await nftEventsDB.save({
                transactionHash: PK_LOCAL,
                blockNumber: BLOCK_LOCAL,
                from: 'luciano',
                to: 'calleri',
                tokenId: 'gol',
            })) as PutCommandOutput;

            expect(saveResult.$metadata.httpStatusCode).toEqual(200);

            const getResult = (await nftEventsDB.get(PK_LOCAL)) as Record<string, NativeAttributeValue>;
            expect(getResult.transactionHash).toEqual(PK_LOCAL);
        });
    });

    describe('UPDATE', function () {
        it(`Should update event when already exists`, async () => {
            const BLOCK_LOCAL = Math.floor(Math.random() * 100);
            const result = (await nftEventsDB.save({
                transactionHash: PK,
                blockNumber: BLOCK_LOCAL,
                to: 'calleri',
                tokenId: INITIAL_RECORD.tokenId,
            })) as UpdateCommandOutput;

            expect(result.$metadata.httpStatusCode).toEqual(200);
            const attributes = result.Attributes as Record<string, NativeAttributeValue>;
            expect(attributes.blockNumber).toEqual(BLOCK_LOCAL);
            expect(attributes.to).toEqual('calleri');
            expect(attributes.tokenId).toEqual(INITIAL_RECORD.tokenId);
            // só retorna os dados que foram enviados para atualização (mesmo que com o mesmo valor anterior)
            expect(attributes.from).toBeUndefined();

            const getResult = (await nftEventsDB.get(PK)) as Record<string, NativeAttributeValue>;
            expect(getResult.transactionHash).toEqual(PK);
            expect(getResult.blockNumber).toEqual(BLOCK_LOCAL);
            expect(getResult.to).toEqual('calleri');
            expect(getResult.from).toEqual(INITIAL_RECORD.from);
            expect(getResult.tokenId).toEqual(INITIAL_RECORD.tokenId);
        });
    });
});
