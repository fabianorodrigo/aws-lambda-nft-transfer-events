import { NFTEventEntityDAO } from '../../dynamodb';

describe('NFT Transfer Events Entity', function () {
    let nftEventsDB;
    const PK = 'testing';
    const INITIAL_RECORD = {
        transactionHash: PK,
        blockNumber: 1952,
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
        it(`Should return all attributes through 'projectionExpression'`, async () => {
            const getResult = await nftEventsDB.get(PK, 'transactionHash,blockNumber,tokenId');
            expect(getResult.transactionHash).toEqual(PK);
            expect(getResult.blockNumber).toEqual(INITIAL_RECORD.blockNumber);
            expect(getResult.tokenId).toEqual(INITIAL_RECORD.tokenId);
        });
        it(`Should return get attributes named with reserved keywords through 'expressionAttributeNames'`, async () => {
            const getResult = await nftEventsDB.get(PK, 'blockNumber, #from, #to, tokenId', {
                '#from': 'from',
                '#to': 'to',
            });
            expect(getResult.blockNumber).toEqual(INITIAL_RECORD.blockNumber);
            expect(getResult.from).toEqual(INITIAL_RECORD.from);
            expect(getResult.to).toEqual(INITIAL_RECORD.to);
            expect(getResult.tokenId).toEqual(INITIAL_RECORD.tokenId);
        });
        it(`Should return all attributes when call the simplified GET method from NFTEventEntityDAO`, async () => {
            const getResult = await nftEventsDB.get(PK);
            expect(getResult.transactionHash).toEqual(PK);
            expect(getResult.blockNumber).toEqual(INITIAL_RECORD.blockNumber);
            expect(getResult.from).toEqual(INITIAL_RECORD.from);
            expect(getResult.to).toEqual(INITIAL_RECORD.to);
            expect(getResult.tokenId).toEqual(INITIAL_RECORD.tokenId);
        });
    });

    describe('PUT', function () {
        it(`Should put event when it does not exist`, async () => {
            const PK_LOCAL = 'testingPUT';
            const saveResult = await nftEventsDB.save({
                transactionHash: PK_LOCAL,
                blockNumber: 1979,
                from: 'luciano',
                to: 'calleri',
                tokenId: 'gol',
            });

            expect(saveResult.$metadata.httpStatusCode).toEqual(200);

            const getResult = await nftEventsDB.get(PK_LOCAL);
            expect(getResult.transactionHash).toEqual(PK_LOCAL);
        });
    });

    describe('UPDATE', function () {
        it(`Should update event when already exists`, async () => {
            const result = await nftEventsDB.save({
                transactionHash: PK,
                blockNumber: 1979,
                to: 'calleri',
                tokenId: INITIAL_RECORD.tokenId,
            });

            expect(result.$metadata.httpStatusCode).toEqual(200);
            expect(result.Attributes.blockNumber).toEqual(1979);
            expect(result.Attributes.to).toEqual('calleri');
            expect(result.Attributes.tokenId).toEqual(INITIAL_RECORD.tokenId);
            // só retorna os dados que foram enviados para atualização (mesmo que com o mesmo valor anterior)
            expect(result.Attributes.from).toBeUndefined();

            const getResult = await nftEventsDB.get(PK);
            expect(getResult.transactionHash).toEqual(PK);
            expect(getResult.blockNumber).toEqual(1979);
            expect(getResult.to).toEqual('calleri');
            expect(getResult.from).toEqual(INITIAL_RECORD.from);
            expect(getResult.tokenId).toEqual(INITIAL_RECORD.tokenId);
        });
    });
});
