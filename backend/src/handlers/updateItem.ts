import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { ddbDocClient, TABLE_NAME } from '../lib/ddb';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.enum(['kg', 'piece', 'liter']).optional(),
  altUnit: z.string().optional(),
  altUnitFactor: z.number().min(0.0001).optional().nullable(),
});

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing item ID' }) };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE' },
        body: JSON.stringify({ message: 'Missing request body' }),
      };
    }

    const parsedBody = JSON.parse(event.body);
    const validationResult = updateSchema.safeParse(parsedBody);

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

    const data = validationResult.data;
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    let hasUpdates = false;

    if (data.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = data.name;
      hasUpdates = true;
    }
    
    if (data.unit !== undefined) {
      updateExpressions.push('#unit = :unit');
      expressionAttributeNames['#unit'] = 'unit';
      expressionAttributeValues[':unit'] = data.unit;
      hasUpdates = true;
    }

    if (data.altUnit !== undefined) {
      updateExpressions.push('#altUnit = :altUnit');
      expressionAttributeNames['#altUnit'] = 'altUnit';
      // empty string clears it
      expressionAttributeValues[':altUnit'] = data.altUnit === '' ? null : data.altUnit;
      hasUpdates = true;
    }

    if (data.altUnitFactor !== undefined) {
      updateExpressions.push('#altUnitFactor = :altUnitFactor');
      expressionAttributeNames['#altUnitFactor'] = 'altUnitFactor';
      expressionAttributeValues[':altUnitFactor'] = data.altUnitFactor;
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
        },
        body: JSON.stringify({ message: 'No fields to update' }),
      };
    }

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ConditionExpression: 'attribute_exists(id)',
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const response = await ddbDocClient.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
      },
      body: JSON.stringify(response.Attributes),
    };
  } catch (error) {
    console.error('Error updating item:', error);
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
