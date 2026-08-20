import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient, TABLE_NAME } from '../lib/ddb';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const data = await ddbDocClient.send(new ScanCommand({ TableName: TABLE_NAME }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
      },
      body: JSON.stringify(data.Items || []),
    };
  } catch (error) {
    console.error('Error fetching items:', error);
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
