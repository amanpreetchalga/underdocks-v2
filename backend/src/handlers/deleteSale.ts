import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "UnderdocksSalesV2";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const saleId = event.pathParameters?.id;
    if (!saleId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing sale ID' }) };
    }

    await ddbDocClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id: saleId },
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Sale deleted successfully' }),
    };
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message || 'Internal Server Error' }),
    };
  }
};
