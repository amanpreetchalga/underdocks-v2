import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { ddbDocClient, TABLE_NAME } from '../lib/ddb';

const bodySchema = z.object({
  actual: z.number().min(0),
});

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

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE' },
        body: JSON.stringify({ message: 'Missing request body' }),
      };
    }

    const parsedBody = JSON.parse(event.body);
    const validationResult = bodySchema.safeParse(parsedBody);

    if (!validationResult.success) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE' },
        body: JSON.stringify({ message: 'Validation failed', errors: validationResult.error.errors }),
      };
    }

    const { actual } = validationResult.data;

    // Fetch the current item to get the expected stock
    const getResult = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
      })
    );

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE' },
        body: JSON.stringify({ message: 'Item not found' }),
      };
    }

    const expected = getResult.Item.currentStock || 0;
    const variance = actual - expected;
    const now = new Date().toISOString();

    const updateResult = await ddbDocClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: 'SET currentStock = :actual, lastCheckExpected = :expected, lastCheckActual = :actual, lastCheckVariance = :variance, lastCheckDate = :now, updatedAt = :now',
        ExpressionAttributeValues: {
          ':actual': actual,
          ':expected': expected,
          ':variance': variance,
          ':now': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
      },
      body: JSON.stringify(updateResult.Attributes),
    };
  } catch (error) {
    console.error('Error checking inventory:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE' },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
