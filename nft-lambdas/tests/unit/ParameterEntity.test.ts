import { PutCommandOutput, UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { ParameterEntityDAO } from '../../dynamodb';

describe('Parameters Entity', function () {
    let parametersDB: ParameterEntityDAO;
    const PK = 'param_test';
    const INITIAL_RECORD = {
        name: PK,
        value: Math.floor(Math.random() * 100),
    };

    beforeAll(async function () {
        parametersDB = new ParameterEntityDAO();
        await parametersDB.connect();
        await parametersDB.save(INITIAL_RECORD);
    });

    describe('GET', function () {
        it(`Should return undefined when GET an inexistent parameter`, async () => {
            const getResult = await parametersDB.get('inexistent');
            expect(getResult).toBeUndefined();
        });
        it(`Should return Parameterwith a specific name`, async () => {
            const getResult = (await parametersDB.get(PK)) as Record<string, NativeAttributeValue>;
            expect(getResult.name).toEqual(PK);
            expect(getResult.value).toEqual(INITIAL_RECORD.value);
        });
    });

    describe('GETALL', function () {
        it(`Should return all Parameters from database`, async () => {
            const results = (await parametersDB.getAll()) as Record<string, NativeAttributeValue>[];
            expect(results).toHaveLength(1);
            expect(results[0].name).toEqual(PK);
            expect(results[0].value).toEqual(INITIAL_RECORD.value);
        });
    });

    describe('PUT', function () {
        it(`Should put event when it does not exist`, async () => {
            const PK_LOCAL = 'testingPUT';
            const VALUE_LOCAL = Math.floor(Math.random() * 100);
            const saveResult = (await parametersDB.save({
                name: PK_LOCAL,
                value: VALUE_LOCAL,
            })) as PutCommandOutput;

            expect(saveResult.$metadata.httpStatusCode).toEqual(200);

            const getResult = (await parametersDB.get(PK_LOCAL)) as Record<string, NativeAttributeValue>;
            expect(getResult.name).toEqual(PK_LOCAL);
        });
    });

    describe('UPDATE', function () {
        it(`Should update event when already exists`, async () => {
            const VALUE_LOCAL = Math.floor(Math.random() * 100);
            const result = (await parametersDB.save({
                name: PK,
                value: VALUE_LOCAL,
            })) as UpdateCommandOutput;

            expect(result.$metadata.httpStatusCode).toEqual(200);
            const attributes = result.Attributes as Record<string, NativeAttributeValue>;
            expect(attributes.value).toEqual(VALUE_LOCAL);
            // só retorna os dados que foram enviados para atualização (mesmo que com o mesmo valor anterior)
            expect(attributes.from).toBeUndefined();

            const getResult = (await parametersDB.get(PK)) as Record<string, NativeAttributeValue>;
            expect(getResult.name).toEqual(PK);
            expect(getResult.value).toEqual(VALUE_LOCAL);
        });
    });
});
