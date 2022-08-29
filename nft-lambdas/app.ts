import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { NFTEventEntityDAO } from './dynamodb';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let response: APIGatewayProxyResult;

    try {
        const nftEventsDB = new NFTEventEntityDAO();
        await nftEventsDB.connect();
        // como 'from' e 'to' são palavras reservadas no DynamoDB, eles precisam ser
        // receber um outro nome com prefixo '#' no ProjectionExpression e, no ExpressionAttributeNames,
        // faz-se o mapeamento com o nome original da coluna ('from' e 'to')
        const transferEvents: never[] = []; /* await nftEventsDB.getAll('blockNumber,#from,#to,tokenId', {
            '#from': 'from',
            '#to': 'to',
        })*/

        response = {
            statusCode: 200,
            body: JSON.stringify(transferEvents),
        };
    } catch (err) {
        console.log(err);
        response = {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened: ' + (<Error>err).message,
            }),
        };
    }

    return response;
};
