import { AttributeValue } from '@aws-sdk/client-dynamodb';
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

    /**
     * Fetch an NFT Transfer Event by transactionHash of the transaction where it was caught
     *
     * @param id transaction Hash of the Transaction which emitted the Transfer event
     *
     * @returns NFT Transfer Event
     */
    async get(id: string): Promise<Record<string, AttributeValue> | undefined> {
        return super.get(id, 'transactionHash, blockNumber, #from, #to, tokenId', {
            '#from': 'from',
            '#to': 'to',
        });
    }
}
