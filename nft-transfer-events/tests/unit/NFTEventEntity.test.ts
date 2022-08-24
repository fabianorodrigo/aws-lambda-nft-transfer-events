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

    describe.only('GET', function () {
        it(`Should return undefined when GET an inexistent event`, async () => {
            const PK = 'inexistent';
            const getResult = await nftEventsDB.get(PK);
            expect(getResult).toBeUndefined();
        });
        it(`Should return only primary key when GET without 'projectionExpression'`, async () => {
            const getResult = await nftEventsDB.get(PK);
            expect(getResult.transactionHash).toEqual(PK);
            expect(getResult.blockNumber).toBeUndefined();
            expect(getResult.from).toBeUndefined();
            expect(getResult.to).toBeUndefined();
            expect(getResult.tokenId).toBeUndefined();
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
            console.log('>>>>>>>>>>>>>>>>>', getResult);
            expect(getResult.transactionHash).toEqual(PK_LOCAL);
        });
    });

    // describe('UPDATE', function () {
    //     it(`Should update event when already exists`, async () => {
    //         const result = await nftEventsDB.save({
    //             transactionHash: 'testingUPD',
    //             blockNumber: 1979,
    //             from: 'luciano',
    //             to: 'calleri',
    //             tokenId: 'gol de bicicleta',
    //         });

    //         expect(result.$metadata.httpStatusCode).toEqual(200);
    //     });
    // });
});
