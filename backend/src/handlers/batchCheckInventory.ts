import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { ddbDocClient, TABLE_NAME } from '../lib/ddb';

const bodySchema = z.array(z.object({
  id: z.string(),
  actual: z.number().min(0),
}));

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
    const validationResult = bodySchema.safeParse(parsedBody);

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

    const updates = validationResult.data;

    // Process all updates in parallel
    await Promise.all(
      updates.map(async (update) => {
        // Fetch the current item to get the expected stock
        const getResult = await ddbDocClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: { id: update.id },
          })
        );

        if (!getResult.Item) {
          throw new Error(`Item not found: ${update.id}`);
        }

        const expectedStock = getResult.Item.currentStock;
        const variance = update.actual - expectedStock;

        return ddbDocClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: update.id },
            UpdateExpression: 'SET currentStock = :actual, lastCheckVariance = :variance, lastCheckDate = :date, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':actual': update.actual,
              ':variance': variance,
              ':date': new Date().toISOString(),
              ':updatedAt': new Date().toISOString(),
            },
          })
        );
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
      },
      body: JSON.stringify({ message: `Successfully updated ${updates.length} items.` }),
    };
  } catch (error: any) {
    console.error('Error in batchCheckInventory:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
      },
      body: JSON.stringify({ message: error.message || 'Internal server error' }),
    };
  }
};
