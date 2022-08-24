import { Entity } from './entity';

/**
 * Executes DAO operations for NFT events.
 */
export class NFTEventEntityDAO extends Entity {
    constructor() {
        super(
            {
                TableName: 'NFTEvents',
                KeySchema: [{ AttributeName: 'transactionHash', KeyType: 'HASH' }],
                AttributeDefinitions: [{ AttributeName: 'transactionHash', AttributeType: 'S' }],
                ProvisionedThroughput: {
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            },
            // If process.env.DYNAMODB_ENDPOINT exists, then use it to connect to DynamoDB.
            process.env.DYNAMODB_ENDPOINT,
        );
    }
}
