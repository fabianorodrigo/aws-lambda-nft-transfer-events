import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { JustTestEntityDAO } from './../utils/justTest.entity';

describe('Entity', function () {
    describe('CONNECT', () => {
        it(`Should fail if try create table without have been specified a CreateTableCommandInput`, async () => {
            const entityTestDB = new JustTestEntityDAO();
            entityTestDB.setCreateTableCommandInputToUndefined();
            await expect(entityTestDB.connect()).rejects.toThrow(
                `Dynamo Entity with its CreateTableCommandInput is required`,
            );
        });
        it(`Should fail if try create table without have been specified a Tablename`, async () => {
            const entityTestDB = new JustTestEntityDAO();
            entityTestDB.setTableNameToEmpty();
            await expect(entityTestDB.connect()).rejects.toThrow(`Dynamo Entity with its TableName is required`);
        });

        it(`Should create table when it does not exist`, async () => {
            const entityTestDB = new JustTestEntityDAO();
            const tableCreted = await entityTestDB.connect();

            expect(tableCreted).toEqual(true);
        });

        it(`Should NOT create table when it exists`, async () => {
            const entityTestDB = new JustTestEntityDAO();
            const tableCreted = await entityTestDB.connect();

            expect(tableCreted).toEqual(false);
        });
    });
    describe('GET', () => {
        it(`Should return all attributes through 'projectionExpression'`, async () => {
            const PK = `Should return all attributes through 'projectionExpression'`;
            const DATA = {
                id: PK,
                blockNumber: 1952,
                from: 'mary',
                to: 'paul',
                tokenId: 'love',
            };

            const entityTestDB = new JustTestEntityDAO();
            await entityTestDB.connect();
            await entityTestDB.save(DATA);
            const getResult = (await entityTestDB.get(PK, 'id,blockNumber,tokenId')) as Record<
                string,
                NativeAttributeValue
            >;
            expect(getResult.id).toEqual(PK);
            expect(getResult.blockNumber).toEqual(DATA.blockNumber);
            expect(getResult.tokenId).toEqual(DATA.tokenId);
        });
        it(`Should return get attributes named with reserved keywords through 'expressionAttributeNames'`, async () => {
            const PK = `Should return get attributes named with reserved keywords through 'expressionAttributeNames'`;
            const DATA = {
                id: PK,
                blockNumber: 1955,
                from: 'demerva',
                to: 'gineval',
                tokenId: 'love2',
            };
            const entityTestDB = new JustTestEntityDAO();
            await entityTestDB.connect();
            await entityTestDB.save(DATA);
            const getResult = (await entityTestDB.get(PK, 'blockNumber, #from, #to, tokenId', {
                '#from': 'from',
                '#to': 'to',
            })) as Record<string, NativeAttributeValue>;
            expect(getResult.blockNumber).toEqual(DATA.blockNumber);
            expect(getResult.from).toEqual(DATA.from);
            expect(getResult.to).toEqual(DATA.to);
            expect(getResult.tokenId).toEqual(DATA.tokenId);
        });
        it(`Should fail when use attribute named with reserved keywords when call without 'expressionAttributeNames'`, async () => {
            const PK = `Should fail when use attribute named with reserved keywords when call without 'expressionAttributeNames'`;
            const DATA = {
                id: PK,
                blockNumber: 1979,
                from: 'fabiano',
                to: 'fabi',
                tokenId: 'love3',
            };
            const entityTestDB = new JustTestEntityDAO();
            await entityTestDB.connect();
            await entityTestDB.save(DATA);
            await expect(entityTestDB.get(PK, 'blockNumber, #from, #to, tokenId')).rejects.toThrow(
                `It was not possible to get TestEntity with ID '${PK}'`,
            );
        });
        it(`Should fail when dbDocClient is not defined`, async () => {
            const PK = `Should fail when dbDocClient is not defined`;
            const entityTestDB = new JustTestEntityDAO();
            await entityTestDB.connect();
            entityTestDB.setDbDocClientToUndefined();
            await expect(entityTestDB.get(PK)).rejects.toThrow(`dbDocClient is required`);
        });
    });
    describe('GETALL', () => {
        it(`Should fail when dbDocClient is not defined`, async () => {
            const entityTestDB = new JustTestEntityDAO();
            await entityTestDB.connect();
            entityTestDB.setDbDocClientToUndefined();
            await expect(entityTestDB.getAll()).rejects.toThrow(`dbDocClient is required`);
        });
        it(`Should fail when use attribute named with reserved keywords when call without 'expressionAttributeNames'`, async () => {
            const PK = `Should fail when use attribute named with reserved keywords when call without 'expressionAttributeNames'`;
            const DATA = {
                id: PK,
                blockNumber: 1985,
                from: 'kassius',
                to: 'katisoca',
                tokenId: 'love4',
            };
            const entityTestDB = new JustTestEntityDAO();
            await entityTestDB.connect();
            await entityTestDB.save(DATA);
            await expect(entityTestDB.getAll('blockNumber, #from, #to, tokenId')).rejects.toThrow(
                `It was not possible to get TestEntity registries`,
            );
        });
    });
});
