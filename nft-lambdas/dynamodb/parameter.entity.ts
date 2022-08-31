import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { EntityDAO } from './entity';

/**
 * Executes DAO operations for Application's Parameters.
 */
export class ParameterEntityDAO extends EntityDAO {
    constructor() {
        super(
            {
                TableName: 'Parameters',
                KeySchema: [{ AttributeName: 'name', KeyType: 'HASH' }],
                AttributeDefinitions: [{ AttributeName: 'name', AttributeType: 'S' }],
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
     * Fetch an Parameter by its name
     *
     * @param name Parameter name
     *
     * @returns Parameter's name and value
     */
    async get(name: string): Promise<Record<string, NativeAttributeValue> | undefined> {
        return super.get(name, '#name, #value', {
            '#name': 'name',
            '#value': 'value',
        });
    }

    /**
     * Fetch all Parameters
     *
     *
     * @returns Parameters' name and value
     */
    async getAll(): Promise<Record<string, NativeAttributeValue>[] | undefined> {
        return super.getAll('#name, #value', {
            '#name': 'name',
            '#value': 'value',
        });
    }
}

export const PARAMETERS: { [key: string]: string } = {
    LAST_BLOCK_CHECKED: 'lastBlockChecked',
};
