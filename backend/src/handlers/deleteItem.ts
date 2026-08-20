import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient, TABLE_NAME } from '../lib/ddb';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE' },
        body: JSON.stringify({ message: 'Missing item id' }),
      };
    }

    await ddbDocClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
      },
      body: JSON.stringify({ message: 'Item deleted' }),
    };
  } catch (error) {
    console.error('Error deleting item:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
