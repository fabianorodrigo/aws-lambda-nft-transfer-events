import {
    CreateTableCommand,
    CreateTableCommandInput,
    DynamoDBClient,
    ListTablesCommand,
    PutItemCommandOutput,
    UpdateItemCommandOutput,
} from '@aws-sdk/client-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
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
    UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { ApplicationError, DEBUG } from '../utils';
import { translateConfig } from './dynamoDbDocumentClientOptions';

export abstract class EntityDAO {
    protected tableName: string;
    private primaryKeyName!: string;
    private dynamoURLEndpoint!: string;
    private dbClient!: DynamoDBClient;
    protected dbDocClient: DynamoDBDocumentClient | undefined;
    protected createTableCommandInput: CreateTableCommandInput | undefined;

    constructor(createTableCommandInput: CreateTableCommandInput, dynamoURLEndpoint?: string) {
        if (!createTableCommandInput.TableName) throw new ApplicationError(`TableName is required`);
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
    getKeyAttributeValueFromEntity(entity: Record<string, NativeAttributeValue>): Record<string, string> {
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
    ): Promise<Record<string, NativeAttributeValue> | undefined> {
        if (!this.dbDocClient) throw new ApplicationError(`dbDocClient is required`);
        if (!id) throw new ApplicationError(`${this.primaryKeyName} is required`);
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
            DEBUG('###DEBUG EXCEPTION GET', (<Error>e).message);
            throw new ApplicationError(`It was not possible to get ${this.TableName} with ID '${id}'`, <Error>e);
        }
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
    async getAll(
        projectionExecution?: string,
        expressionAttributeNames?: { [alias: string]: string },
    ): Promise<Record<string, NativeAttributeValue>[] | undefined> {
        if (!this.dbDocClient) throw new ApplicationError(`dbDocClient is required`);
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
            return result.Items;
        } catch (e: unknown) {
            DEBUG('###DEBUG EXCEPTION GETALL', (<Error>e).message);
            throw new ApplicationError(`It was not possible to get ${this.TableName} registries`, <Error>e);
        }
    }

    async save(
        entity: Record<string, NativeAttributeValue>,
    ): Promise<PutItemCommandOutput | UpdateItemCommandOutput | null> {
        if (!this.dbDocClient) throw new ApplicationError(`dbDocClient is required`);
        if (!entity) throw new ApplicationError(`Entity ${this.TableName} is required`);
        try {
            const item: Record<string, NativeAttributeValue> = {};
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
                const param: UpdateCommandInput = {
                    TableName: this.TableName,
                    Key: this.getKeyAttributeValueFromEntity(entity),
                    UpdateExpression: this.getUpdateExpression(item),
                    ExpressionAttributeNames: this.geExpressionAttributeNames(item),
                    ExpressionAttributeValues: this.getExpressionAttributeValues(item),
                    ReturnValues: 'UPDATED_NEW',
                };
                DEBUG('###DEBUG PRE UPDATE', param);
                const updtResult = await this.dbDocClient.send(new UpdateCommand(param));
                DEBUG('###DEBUG POS UPDATE', updtResult);
                return updtResult;
            }
        } catch (e: unknown) {
            DEBUG('###DEBUG EXCEPTION SAVE', (<Error>e).message);
            throw new ApplicationError(
                `It was not possible to save the entity with ID '${entity[this.primaryKeyName]}' to ${this.TableName}`,
                <Error>e,
            );
        }
    }

    private getExpressionAttributeValues(
        item: Record<string, NativeAttributeValue>,
    ): Record<string, NativeAttributeValue> {
        const expV: Record<string, NativeAttributeValue> = {};
        const attributes = Object.keys(item);
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i] != this.primaryKeyName) {
                expV[`:${attributes[i]}`] = item[attributes[i]];
            }
        }
        return expV;
    }

    /**
     * Based on the {item}, creates an expression in the format:
     * set #attribute1Name = :attribute1Name, #attribute2Name = :attribute2Name
     *
     * @param item Map with keys and values
     * @returns updte expression
     */
    private getUpdateExpression(item: Record<string, NativeAttributeValue>): string {
        let exp = 'set ';
        let count = 0;
        const attributes = Object.keys(item);
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i] != this.primaryKeyName) {
                if (count > 0) {
                    exp += ', ';
                }
                exp += `#${attributes[i]} = :${attributes[i]}`;
                count++;
            }
        }
        return exp;
    }

    /**
     * Based on the {item}, creates an expression in the format:
     * {#attribute1Name: attribute1Name, #attribute2Name : attribute2Name }
     *
     * @param item Map with keys and values
     * @returns Map between attributes alias and real attribute names
     */
    private geExpressionAttributeNames(item: Record<string, NativeAttributeValue>): Record<string, string> {
        const result: Record<string, string> = {};
        const attributes = Object.keys(item);
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i] != this.primaryKeyName) {
                result[`#${attributes[i]}`] = attributes[i];
            }
        }
        return result;
    }

    /**
     * Creates Table in the DynamoDB if it doesn't exist
     *
     * @returns TRUE if table was created, FALSE if it already exists
     */
    private async createTable() {
        if (!this.TableName) {
            throw new ApplicationError(`Dynamo Entity with its TableName is required`);
        }
        const listResult = await this.dbClient.send(new ListTablesCommand({}));
        if (listResult.TableNames && !listResult.TableNames.includes(this.TableName)) {
            if (!this.CreateTableCommandInput) {
                throw new ApplicationError(`Dynamo Entity with its CreateTableCommandInput is required`);
            }
            await this.dbClient.send(new CreateTableCommand(this.CreateTableCommandInput));
            return true;
        }
        return false;
    }
}
