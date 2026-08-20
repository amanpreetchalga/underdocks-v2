import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { ddbDocClient, TABLE_NAME } from '../lib/ddb';

import { randomUUID } from 'crypto';

const itemSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['fish', 'drinks', 'sauces', 'breads']),
  unit: z.enum(['kg', 'piece', 'liter']),
  currentStock: z.number().min(0),
  minThreshold: z.number().min(0),
});

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE' },
        body: JSON.stringify({ message: 'Missing request body' }),
      };
    }

    const parsedBody = JSON.parse(event.body);
    const validationResult = itemSchema.safeParse(parsedBody);

    if (!validationResult.success) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
        },
        body: JSON.stringify({ message: 'Validation failed', errors: validationResult.error.errors }),
      };
    }

    const item = {
      id: randomUUID().split('-')[0].toUpperCase(),
      ...validationResult.data,
      updatedAt: new Date().toISOString(),
    };

    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
      },
      body: JSON.stringify(item),
    };
  } catch (error) {
    console.error('Error creating item:', error);
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
