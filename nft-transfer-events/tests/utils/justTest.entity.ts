import { EntityDAO } from '../../dynamodb/entity';

/**
 * Executes DAO operations for NFT events.
 */
export class JustTestEntityDAO extends EntityDAO {
    constructor() {
        super(
            {
                TableName: 'TestEntity',
                KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
                AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
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
