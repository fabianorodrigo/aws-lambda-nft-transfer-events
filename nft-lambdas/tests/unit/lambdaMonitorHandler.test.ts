import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { NFTEventEntityDAO, ParameterEntityDAO, PARAMETERS } from '../../dynamodb';
import { lambdaMonitorHandler } from '../../monitor';

type DetailType = 'Scheduled Event';
// Sample payload with CloudWatch scheduled event message format
const payload = {
    id: 'cdc73f9d-aea9-11e3-9d5a-835b769c0d9c',
    'detail-type': 'Scheduled Event' as DetailType,
    source: 'aws.events',
    account: '',
    version: '',
    time: '1970-01-01T00:00:00Z',
    region: 'us-west-2',
    resources: ['arn:aws:events:us-west-2:123456789012:rule/ExampleRule'],
    detail: {},
};

describe('NFT Transfer Events Monitor Lambda handler', function () {
    let parametersDB: ParameterEntityDAO;
    let nftEventsDB: NFTEventEntityDAO;
    let lastBlockCheckedfinal: Record<string, NativeAttributeValue>;

    beforeAll(async function () {
        parametersDB = new ParameterEntityDAO();
        await parametersDB.connect();
        nftEventsDB = new NFTEventEntityDAO();
        await nftEventsDB.connect();
    });

    afterAll(async function () {
        //delete all events inserted by this tests
        const events = (await nftEventsDB.getAll()) as Record<string, NativeAttributeValue>[];
        for (let i = 0; i < events.length; i++) {
            await nftEventsDB.delete(events[i]);
        }
        //delete parameters
        const parameters = (await parametersDB.getAll()) as Record<string, NativeAttributeValue>[];
        for (let i = 0; i < parameters.length; i++) {
            await parametersDB.delete(parameters[i]);
        }
    });

    it('Should  insert events into DynamoDB at the first time', async () => {
        // expect params does not exist;
        expect(await parametersDB.get(PARAMETERS.LAST_BLOCK_CHECKED)).toBeUndefined();
        // At first invocation, the DynamoDB table is empty.
        let allEvents = (await nftEventsDB.getAll()) as Record<string, NativeAttributeValue>[];
        expect(allEvents.length).toBe(0);

        await lambdaMonitorHandler(payload);

        // Now, it should have some events and the parameter LAST_BLOCK_CHECKED is not null
        allEvents = (await nftEventsDB.getAll()) as Record<string, NativeAttributeValue>[];
        expect(allEvents.length).toBe(2);
        // expect params does not exist;
        lastBlockCheckedfinal = (await parametersDB.get(PARAMETERS.LAST_BLOCK_CHECKED)) as Record<
            string,
            NativeAttributeValue
        >;
        expect(lastBlockCheckedfinal).not.toBeUndefined();
    });

    it('Should not insert events into DynamoDB when there is no new events', async () => {
        // expect params is equal to the to the block number of the last event
        const lbc = await parametersDB.get(PARAMETERS.LAST_BLOCK_CHECKED);
        expect(lbc).toEqual(lastBlockCheckedfinal);

        await lambdaMonitorHandler(payload);

        // expect params keeps being the block number of the last event
        const lbc2 = await parametersDB.get(PARAMETERS.LAST_BLOCK_CHECKED);
        expect(lbc2).toEqual(lastBlockCheckedfinal);
    });
});
