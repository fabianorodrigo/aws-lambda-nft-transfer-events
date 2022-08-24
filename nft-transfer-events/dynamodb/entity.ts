import {
    AttributeValue,
    CreateTableCommand,
    CreateTableCommandInput,
    DynamoDBClient,
    GetItemInput,
    ListTablesCommand,
    PutItemCommandOutput,
    UpdateItemCommandOutput,
} from '@aws-sdk/client-dynamodb';
// The DynamoDB Document client simplifies working with items by abstracting the notion of attribute values.
// This abstraction annotates native JavaScript types supplied as input parameters, and converts annotated
// response data to native JavaScript types.
import {
    DynamoDBDocumentClient,
    GetCommand,
    GetCommandInput,
    PutCommand,
    ScanCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DEBUG } from '../utils';
import { translateConfig } from './dynamoDbDocumentClientOptions';

export abstract class Entity {
    private tableName: string;
    private primaryKeyName!: string;
    private dynamoURLEndpoint!: string;
    private dbClient!: DynamoDBClient;
    protected dbDocClient!: DynamoDBDocumentClient;
    private createTableCommandInput: CreateTableCommandInput;

    constructor(createTableCommandInput: CreateTableCommandInput, dynamoURLEndpoint?: string) {
        if (!createTableCommandInput.TableName) throw new Error(`TableName is required`);
        this.tableName = createTableCommandInput.TableName;
        // for now, just support single primary key
        if (
            createTableCommandInput &&
            createTableCommandInput.KeySchema &&
            createTableCommandInput.KeySchema?.length > 0
        ) {
            this.primaryKeyName = createTableCommandInput.KeySchema[0].AttributeName ?? 'id';
        }
        this.createTableCommandInput = createTableCommandInput;
        if (dynamoURLEndpoint) this.dynamoURLEndpoint = dynamoURLEndpoint;
    }

    /**
     * Establishes connection with DynamoDB and create table if it doesn't exist
     *
     * @returns TRUE if table was created, FALSE if it already exists
     */
    async connect(): Promise<boolean> {
        // If process.env.DYNAMODB_ENDPOINT exists, then use it to connect to DynamoDB.
        this.dbClient = new DynamoDBClient(this.dynamoURLEndpoint ? { endpoint: this.dynamoURLEndpoint } : {});
        this.dbDocClient = DynamoDBDocumentClient.from(this.dbClient, translateConfig);

        //create table if does not exist
        return await this.createTable();
    }

    get TableName() {
        return this.tableName;
    }
    get CreateTableCommandInput() {
        return this.createTableCommandInput;
    }
    get DbClient() {
        return this.dbClient;
    }

    /**
     * Build an object that represents a Key with its type and value {S: value }
     * @param id Value of primary key
     * @returns Object representing a DynamoDB Table Key
     */
    getKeyAttributeValue(id: string): Record<string, string> {
        const key: Record<string, string> = {};
        key[this.primaryKeyName] = id;
        return key;
    }

    /**
     * Build an object that represents a Key with its type and value {S: value }
     * @param entity entity from which is extracted the data to build the key
     * @returns Object representing a DynamoDB Table Key
     */
    getKeyAttributeValueFromEntity(entity: Record<string, AttributeValue>): Record<string, string> {
        return this.getKeyAttributeValue(entity[this.primaryKeyName] as unknown as string);
    }

    /**
     * Fetch an record by its primary key
     *
     * @param id Value of primary key
     * @param projectionExpression List of attributes to be fetched separated by comma
     * @param {*} expressionAttributeNames Alias to attributes (used when the
     *  attributes are reserved works such as name, value, from, to ...)

     * @returns Object with the data fetched
     */
    async get(
        id: string,
        projectionExpression?: string,
        expressionAttributeNames?: Record<string, string>,
    ): Promise<Record<string, AttributeValue> | undefined> {
        if (!this.dbDocClient) throw new Error(`dbDocClient is required`);
        if (!id) throw new Error(`${this.primaryKeyName} is required`);
        try {
            const param: GetCommandInput = {
                TableName: this.TableName,
                Key: this.getKeyAttributeValue(id),
                ProjectionExpression: projectionExpression ?? this.primaryKeyName,
            };
            if (expressionAttributeNames) {
                param.ExpressionAttributeNames = expressionAttributeNames;
            }

            DEBUG('###DEBUG PRE GET', param);
            const result = await this.dbDocClient.send(new GetCommand(param));
            DEBUG('###DEBUG POS GET', result);
            return result.Item;
        } catch (e: unknown) {
            console.error((<Error>e).message, (<Error>e).stack);
        }
        return undefined;
    }

    /**
     * Fetch all rows from the DynamoDB table.
     *
     * @dev https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-dynamodb
     *
     * @param {*} projectionExecution attributes to retrieve
     * @param {*} expressionAttributeNames Alias to attributes (used when the
     *  attributes are reserved works such as name, value, from, to ...)
     */
    async getAll(projectionExecution?: string, expressionAttributeNames?: { [alias: string]: string }): Promise<any> {
        if (!this.dbDocClient) throw new Error(`DBDocClient is required`);
        try {
            const result = await this.dbDocClient.send(
                new ScanCommand({
                    TableName: this.tableName,
                    // como 'from' e 'to' são palavras reservadas no DynamoDB, eles precisam ser
                    // receber um outro nome com prefixo '#' no ProjectionExpression e, no ExpressionAttributeNames,
                    // faz-se o mapeamento com o nome original da coluna ('from' e 'to')
                    ProjectionExpression: projectionExecution,
                    ExpressionAttributeNames: expressionAttributeNames,
                }),
            );
            console.log(`Success`, result);
            return result.Items;
        } catch (e: unknown) {
            console.error((<Error>e).message, (<Error>e).stack);
        }
    }

    async save(entity: Record<string, AttributeValue>): Promise<PutItemCommandOutput | UpdateItemCommandOutput | null> {
        if (!this.dbDocClient) throw new Error(`dbDocClient is required`);
        if (!entity) throw new Error(`Entity ${this.TableName} is required`);
        try {
            const item: Record<string, AttributeValue> = {};
            const attributes = Object.keys(entity);
            for (let i = 0; i < attributes.length; i++) {
                item[attributes[i]] = entity[attributes[i]];
            }
            const getResult = await this.get(entity[this.primaryKeyName] as unknown as string);
            //if not found: PUT
            if (!getResult) {
                DEBUG('###DEBUG PRE PUT', item);
                const putResult = await this.dbClient.send(
                    new PutCommand({
                        TableName: this.TableName,
                        Item: item,
                    }),
                );
                DEBUG('###DEBUG POS PUT', putResult);
                return putResult;
            } else {
                DEBUG('###DEBUG PRE UPDATE', item);
                const updtResult = await this.dbDocClient.send(
                    new UpdateCommand({
                        TableName: this.TableName,
                        Key: this.getKeyAttributeValueFromEntity(entity),
                        UpdateExpression: this.getUpdateExpression(item),
                        // ExpressionAttributeNames: {
                        //     '#value': 'value',
                        // },
                        ExpressionAttributeValues: this.getExpressionAttributeValues(item),
                        ReturnValues: 'ALL_NEW',
                    }),
                );
                DEBUG('###DEBUG POS UPDATE', updtResult);
                return updtResult;
            }
        } catch (e: unknown) {
            console.error((<Error>e).message, (<Error>e).stack);
            return null;
        }
    }

    private getExpressionAttributeValues(item: Record<string, AttributeValue>): Record<string, AttributeValue> {
        const expV: Record<string, AttributeValue> = {};
        const attributes = Object.keys(item);
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i] != this.primaryKeyName) {
                expV[`:${attributes[i]}`] = item[attributes[i]];
            }
        }
        return expV;
    }

    private getUpdateExpression(item: Record<string, AttributeValue>): string {
        let exp = 'set ';
        let count = 0;
        const attributes = Object.keys(item);
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i] != this.primaryKeyName) {
                if (count > 0) {
                    exp += ', ';
                }
                exp += `${attributes[i]} = ${attributes[i]}`;
                count++;
            }
        }
        return exp;
    }

    /**
     * Creates Table in the DynamoDB if it doesn't exist
     *
     * @returns TRUE if table was created, FALSE if it already exists
     */
    private async createTable() {
        if (!this.TableName) {
            throw new Error(`Dynamo Entity with its TableName is required`);
        }
        const listResult = await this.dbClient.send(new ListTablesCommand({}));
        if (listResult.TableNames && !listResult.TableNames.includes(this.TableName)) {
            if (!this.CreateTableCommandInput) {
                throw new Error(`Dynamo Entity with its CreateTableCommandInput is required`);
            }
            await this.dbClient.send(new CreateTableCommand(this.CreateTableCommandInput));
            return true;
        }
        return false;
    }
}
