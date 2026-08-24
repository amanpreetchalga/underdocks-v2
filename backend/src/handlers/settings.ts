import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient, TABLE_NAME } from '../lib/ddb';
import { z } from 'zod';

const SETTINGS_ID = 'SYSTEM_SETTINGS';

const settingsSchema = z.object({
  categories: z.array(z.object({
    value: z.string(),
    label: z.string()
  }))
});

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (event.requestContext.http.method === 'GET') {
      const { Item } = await ddbDocClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: SETTINGS_ID },
      }));

      // Return default categories if settings don't exist yet
      if (!Item) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            categories: [
              { value: 'fish', label: '🐟 Fish & Seafood' },
              { value: 'drinks', label: '🥤 Drinks' },
              { value: 'sauces', label: '🥣 Sauces' },
              { value: 'breads', label: '🥖 Breads' },
              { value: 'selling_unit', label: '🍽️ Recipes' },
            ]
          }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(Item.data || { categories: [] }),
      };
    }

    if (event.requestContext.http.method === 'PATCH' || event.requestContext.http.method === 'POST') {
      if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Request body is required' }) };
      }

      const parsedBody = JSON.parse(event.body);
      const validationResult = settingsSchema.safeParse(parsedBody);

      if (!validationResult.success) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ message: 'Validation failed', errors: validationResult.error.errors }),
        };
      }

      await ddbDocClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          id: SETTINGS_ID,
          data: validationResult.data,
          updatedAt: new Date().toISOString()
        }
      }));

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(validationResult.data),
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (error) {
    console.error('Error handling settings:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
